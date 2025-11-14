import { defineStore } from 'pinia';
import Logger from '../utils/logger.js';
import functions from '../functions.js';

const logger = Logger('server');

export const useServerAddressStore = defineStore('serverAddress', {
  state: () => ({
    serverAddress: undefined as string | undefined,
  }),
  actions: {
    async setServerAddress(address: string) {
      await functions.getServerIP(true);
      this.serverAddress = address;
      logger.log('Server address manually set to:', address);
    },
    async getServerAddress() {
      if (this.serverAddress) {
        logger.log('Using cached server address:', this.serverAddress);
        return this.serverAddress;
      }

      logger.log('Starting server IP discovery...');
      try {
        const address = await functions.getServerIP();
        logger.log('Server IP discovered:', address);
        this.serverAddress = address;
        logger.log('Server address state updated to:', this.serverAddress);
        return this.serverAddress;
      } catch (error) {
        logger.error('Failed to get server address:', error);
        throw error;
      }
    },
  },
});
