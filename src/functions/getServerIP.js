/* eslint-disable @typescript-eslint/explicit-function-return-type */
import dgram from 'dgram';
import Logger from '../main/logger.js';
import { clear } from 'console';

const logger = Logger('getServerIP');

const message = Buffer.from('lanLauncher://get_ip');
const knownPort = 50000;

let socket = null;
let interval = null;

export default async function getServerIP(stopSocket) {
  if (stopSocket) {
    logger.log('clearing interval');

    if (socket) {
      logger.log('closing socket');
      socket.close();
      socket = null;
    }
    clearInterval(interval);

    return;
  }
  return sendMessage();
}

function sendMessage() {
  return new Promise((resolve, reject) => {
    if (socket) {
      socket.send(message, 0, message.length, knownPort, '255.255.255.255');
      return;
    }
    logger.log('Searching for server IP...');
    socket = dgram.createSocket('udp4');

    interval = setInterval(() => {
      if (socket) {
        logger.log('unable to find server IP, retrying...');
        try {
          socket.send(message, 0, message.length, knownPort, '255.255.255.255');
        } catch (error) {
          logger.error('Error sending broadcast message:', error);
        }
      }
    }, 1000);

    socket.on('listening', function () {
      socket.setBroadcast(true);
      logger.log('sending message to find server IP...');
      try {
        socket.send(message, 0, message.length, knownPort, '255.255.255.255');
      } catch (error) {
        logger.error('Error sending initial broadcast:', error);
      }
    });

    socket.on('message', function (message, remote) {
      try {
        const data = JSON.parse(message.toString());
        const serverUrl = data.protocol + '://' + remote.address + ':' + data.port;
        logger.log('found server IP:', remote.address + ':' + data.port);

        // Clean up before resolving
        if (socket) {
          socket.close();
          socket = null;
        }
        if (interval) {
          clearInterval(interval);
          interval = null;
        }

        resolve(serverUrl);
      } catch (error) {
        logger.error('Error parsing server response:', error);
      }
    });

    socket.on('error', function (error) {
      logger.error('Socket error:', error);
      // Don't reject, just log and keep trying
      // Network might come back later
    });

    const port = 50001;

    try {
      logger.log('binding to port:', port);
      socket.bind(port);
    } catch (error) {
      logger.error('Error binding socket:', error);
      socket = null;
      // Retry after a delay if bind fails
      setTimeout(() => {
        sendMessage().then(resolve).catch(reject);
      }, 1000);
    }
  });
}
