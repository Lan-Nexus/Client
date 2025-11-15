/* eslint-disable @typescript-eslint/explicit-function-return-type */
import dgram from 'dgram';
import os from 'os';
import Logger from '../main/logger.js';

const logger = Logger('getServerIP');

const message = Buffer.from('lanLauncher://get_ip');
const knownPort = 50000;

let sockets = [];
let interval = null;

export default async function getServerIP(stopSocket) {
  if (stopSocket) {
    logger.log('clearing interval');

    sockets.forEach(socketInfo => {
      if (socketInfo.socket) {
        logger.log('closing socket on interface:', socketInfo.iface);
        socketInfo.socket.close();
      }
    });
    sockets = [];

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    return null; // Return null instead of undefined
  }
  logger.log('Starting server discovery...');

  // Collect servers from both localhost and network
  const allServers = [];

  // Try localhost first (for local development)
  try {
    logger.log('Checking localhost servers...');
    const localhostResult = await tryLocalhostServers();
    if (localhostResult) {
      logger.log('Found local server:', localhostResult);
      allServers.push(localhostResult);
    }
  } catch (error) {
    logger.log('No localhost server found');
  }

  // Try network discovery
  try {
    const networkServers = await sendMessage();
    if (networkServers && networkServers.length > 0) {
      // Add network servers that aren't already in the list
      for (const server of networkServers) {
        if (!allServers.some(s => s.url === server.url)) {
          allServers.push(server);
        }
      }
    }
  } catch (error) {
    logger.log('Network discovery failed:', error);
  }

  if (allServers.length > 0) {
    logger.log(`Total servers found: ${allServers.length}`);
    return allServers;
  } else {
    throw new Error('No servers found');
  }
}

// Try common localhost ports for local development
async function tryLocalhostServers() {
  const portsToTry = [8080, 3000, 80, 5000];

  for (const port of portsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500); // 500ms timeout per port

      const response = await fetch(`http://localhost:${port}/api/settings/server-name`, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const serverName = data.serverName || 'LAN Nexus Server';
        logger.log(`Found localhost server on port ${port}, name: ${serverName}`);

        return {
          url: `http://localhost:${port}`,
          serverName: serverName
        };
      }
    } catch (error) {
      // Port not responding, try next
      continue;
    }
  }

  return null;
}

function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const validInterfaces = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    // Skip loopback and virtual interfaces
    if (name.toLowerCase().includes('loopback')) continue;
    if (name.toLowerCase().includes('wsl')) continue;
    if (name.toLowerCase().includes('hyper-v')) continue;
    if (name.toLowerCase().includes('vethernet')) continue;
    if (name.toLowerCase().includes('vmware')) continue;
    if (name.toLowerCase().includes('virtualbox')) continue;

    for (const addr of addrs) {
      // Only use IPv4, non-internal interfaces
      if (addr.family === 'IPv4' && !addr.internal) {
        validInterfaces.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          broadcast: calculateBroadcast(addr.address, addr.netmask)
        });
      }
    }
  }

  logger.log('Found network interfaces:', validInterfaces.map(i => `${i.name} (${i.address})`).join(', '));
  return validInterfaces;
}

function calculateBroadcast(address, netmask) {
  const addrParts = address.split('.').map(Number);
  const maskParts = netmask.split('.').map(Number);
  
  const broadcast = addrParts.map((part, i) => {
    return part | (~maskParts[i] & 255);
  });
  
  return broadcast.join('.');
}

function sendMessage() {
  return new Promise((resolve, reject) => {
    const interfaces = getNetworkInterfaces();

    if (interfaces.length === 0) {
      logger.log('No network interfaces found, will try localhost');
    }

    const foundServers = new Map(); // Track unique servers by URL
    let discoveryTimeout = null;
    let resolved = false; // Track whether promise has been resolved

    // Add localhost as a fallback interface for local testing
    const allInterfaces = [...interfaces];
    if (interfaces.length === 0 || process.env.NODE_ENV === 'development') {
      allInterfaces.push({
        name: 'localhost',
        address: '127.0.0.1',
        netmask: '255.0.0.0',
        broadcast: '127.255.255.255'
      });
      logger.log('Added localhost interface for local server discovery');
    }

    // Create a socket for each interface (including localhost fallback)
    allInterfaces.forEach((iface, index) => {
      const socket = dgram.createSocket('udp4');
      const port = 50001 + index; // Use different ports for each socket to avoid conflicts

      sockets.push({ socket, iface: iface.name, port });

      socket.on('listening', function () {
        socket.setBroadcast(true);
        logger.log(`Socket listening on ${iface.name} (${iface.address}:${port}), broadcasting to ${iface.broadcast}`);

        try {
          // Send to both the calculated broadcast address and 255.255.255.255
          logger.log(`Sending broadcast to ${iface.broadcast}:${knownPort} and 255.255.255.255:${knownPort}`);
          socket.send(message, 0, message.length, knownPort, iface.broadcast);
          socket.send(message, 0, message.length, knownPort, '255.255.255.255');
          logger.log(`Broadcast sent successfully from ${iface.name}`);
        } catch (error) {
          logger.error(`Error sending initial broadcast on ${iface.name}:`, error);
        }
      });

      socket.on('message', function (msg, remote) {
        try {
          const data = JSON.parse(msg.toString());
          const serverUrl = data.protocol + '://' + remote.address + ':' + data.port;
          const serverName = data.serverName || 'LAN Nexus Server';

          // Add to found servers if not already present
          if (!foundServers.has(serverUrl)) {
            logger.log('Found server:', remote.address + ':' + data.port,
                       'name:', serverName, 'via', iface.name);
            foundServers.set(serverUrl, { url: serverUrl, serverName: serverName });

            // Start discovery timeout after first server found
            if (!discoveryTimeout && foundServers.size === 1) {
              logger.log('First server found, will collect responses for 2 more seconds...');
              discoveryTimeout = setTimeout(() => {
                finishDiscovery();
              }, 2000); // Collect for 2 seconds after first response
            }
          }
        } catch (error) {
          logger.error('Error parsing server response:', error);
        }
      });

      socket.on('error', function (error) {
        logger.error(`Socket error on ${iface.name}:`, error);
      });

      try {
        // Bind to specific interface address
        socket.bind(port, iface.address);
      } catch (error) {
        logger.error(`Error binding socket on ${iface.name}:`, error);
      }
    });

    // Set up retry interval
    interval = setInterval(() => {
      if (resolved) return;

      logger.log('Retrying broadcast on all interfaces...');
      sockets.forEach(({ socket, iface }) => {
        if (socket) {
          try {
            const ifaceInfo = allInterfaces.find(i => i.name === iface);
            if (ifaceInfo) {
              socket.send(message, 0, message.length, knownPort, ifaceInfo.broadcast);
              socket.send(message, 0, message.length, knownPort, '255.255.255.255');
            }
          } catch (error) {
            logger.error(`Error sending retry broadcast on ${iface}:`, error);
          }
        }
      });
    }, 1000);

    // Function to finish discovery and return results
    function finishDiscovery() {
      if (resolved) return; // Already resolved, nothing to do
      resolved = true;

      logger.log(`Discovery complete. Found ${foundServers.size} server(s)`);

      // Clean up all sockets
      sockets.forEach(s => {
        if (s.socket) s.socket.close();
      });
      sockets = [];

      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      if (discoveryTimeout) {
        clearTimeout(discoveryTimeout);
        discoveryTimeout = null;
      }

      // Return all found servers as array
      const servers = Array.from(foundServers.values());
      if (servers.length > 0) {
        resolve(servers);
      } else {
        reject(new Error('No servers found'));
      }
    }

    // Overall timeout (5 seconds if no servers found)
    setTimeout(() => {
      if (foundServers.size === 0) {
        logger.log('Server discovery timeout after 5 seconds, no servers found');
        finishDiscovery();
      }
      // If servers were found, the discoveryTimeout will handle completion
    }, 5000);
  });
}
