import { defineStore } from 'pinia';
import Logger from '../utils/logger.js';
import functions from '../functions.js';

const logger = Logger('server');

interface ServerState {
  address: string;
  missCount: number;
}

export const useServerAddressStore = defineStore('serverAddress', {
  state: () => ({
    serverAddress: undefined as string | undefined,
    discoveredServers: [] as string[],
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
        const address = await functions.getServerIP();

        if (address) {
          // Server found - add or reset miss count
          if (!this.serverStates.has(address)) {
            logger.log('New server discovered:', address);
            this.serverStates.set(address, { address, missCount: 0 });
          } else {
            // Server still responding - reset miss count
            const state = this.serverStates.get(address)!;
            if (state.missCount > 0) {
              logger.log('Server reconnected:', address);
            }
            state.missCount = 0;
          }
        }

        // Increment miss count for servers not found in this scan
        const foundAddress = address;
        for (const [serverAddr, state] of this.serverStates.entries()) {
          if (serverAddr !== foundAddress) {
            state.missCount++;
            logger.log(`Server ${serverAddr} missed (${state.missCount}/5)`);

            // Remove after 5 consecutive misses
            if (state.missCount >= 5) {
              logger.log('Server removed after 5 misses:', serverAddr);
              this.serverStates.delete(serverAddr);
            }
          }
        }

        // Update discovered servers list (only show servers that are still tracked)
        this.discoveredServers = Array.from(this.serverStates.keys());

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

        this.discoveredServers = Array.from(this.serverStates.keys());
      } finally {
        this.isDiscovering = false;
      }
    },
  },
});
