import { defineStore } from 'pinia';
import Logger from '../utils/logger.js';
import functions from '../functions.js';

const logger = Logger('server');

interface ServerState {
  address: string;
  serverName: string;
  version: string;
  missCount: number;
}

export const useServerAddressStore = defineStore('serverAddress', {
  state: () => ({
    serverAddress: undefined as string | undefined,
    discoveredServers: [] as Array<{ address: string; serverName: string; version: string }>,
    isDiscovering: false,
    serverStates: new Map<string, ServerState>() as Map<string, ServerState>,
  }),
  actions: {
    async configureUpdatesWithServer(address: string) {
      // Configure update server when we have a game server
      try {
        logger.log('Configuring updates with server:', address);
        await window.updaterAPI.configureUpdates(address);
        logger.log('✅ Updates configured successfully');
      } catch (error) {
        logger.error('Failed to configure updates, will use GitHub:', error);
        // Fall back to GitHub if configuration fails
        try {
          await window.updaterAPI.configureUpdates(null);
        } catch (githubError) {
          logger.error('Failed to configure GitHub updates:', githubError);
        }
      }
    },

    async selectServer(address: string) {
      // User explicitly selected this server - safe to connect
      await functions.getServerIP(true); // Stop any ongoing discovery
      this.serverAddress = address;
      logger.log('✅ User selected server:', address);

      // Also configure updates with this server
      await this.configureUpdatesWithServer(address);
    },

    async discoverServers() {
      // Discover servers but DON'T auto-connect (security: prevent RCE)
      this.isDiscovering = true;

      try {
        const results = await functions.getServerIP();

        if (results && results.length > 0) {
          // Track which servers were found in this scan
          const foundAddresses = new Set();

          // Process each found server
          for (const { url: address, serverName, version } of results) {
            foundAddresses.add(address);

            if (!this.serverStates.has(address)) {
              logger.log('New server discovered:', address, 'name:', serverName, 'version:', version);
              this.serverStates.set(address, { address, serverName, version, missCount: 0 });
            } else {
              // Server still responding - reset miss count and update name/version
              const state = this.serverStates.get(address)!;
              if (state.missCount > 0) {
                logger.log('Server reconnected:', address, 'name:', serverName, 'version:', version);
              }
              state.missCount = 0;
              state.serverName = serverName; // Update name in case it changed
              state.version = version; // Update version in case it changed
            }
          }

          // Increment miss count for servers not found in this scan
          for (const [serverAddr, state] of this.serverStates.entries()) {
            if (!foundAddresses.has(serverAddr)) {
              state.missCount++;
              logger.log(`Server ${serverAddr} missed (${state.missCount}/5)`);

              // Remove after 5 consecutive misses
              if (state.missCount >= 5) {
                logger.log('Server removed after 5 misses:', serverAddr);
                this.serverStates.delete(serverAddr);
              }
            }
          }
        } else {
          // No servers found - increment miss count for all
          for (const [serverAddr, state] of this.serverStates.entries()) {
            state.missCount++;
            logger.log(`Server ${serverAddr} missed (${state.missCount}/5)`);

            if (state.missCount >= 5) {
              logger.log('Server removed after 5 misses:', serverAddr);
              this.serverStates.delete(serverAddr);
            }
          }
        }

        // Update discovered servers list with names and versions
        this.discoveredServers = Array.from(this.serverStates.values()).map(state => ({
          address: state.address,
          serverName: state.serverName,
          version: state.version
        }));

      } catch (error) {
        logger.log('Discovery scan failed:', error);

        // Increment miss count for all servers on failed scan
        for (const [serverAddr, state] of this.serverStates.entries()) {
          state.missCount++;
          logger.log(`Server ${serverAddr} missed due to scan failure (${state.missCount}/5)`);

          if (state.missCount >= 5) {
            logger.log('Server removed after 5 misses:', serverAddr);
            this.serverStates.delete(serverAddr);
          }
        }

        this.discoveredServers = Array.from(this.serverStates.values()).map(state => ({
          address: state.address,
          serverName: state.serverName,
          version: state.version
        }));
      } finally {
        this.isDiscovering = false;
      }
    },
  },
});
