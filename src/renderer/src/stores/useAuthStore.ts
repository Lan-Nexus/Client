import { defineStore } from 'pinia';
import functions from '../functions.js';
import { createUser, updateUser, generateFakeName } from '../utils/api.js';
import { useServerAddressStore } from './useServerAddress.js';
import Logger from '../utils/logger.js';

const logger = Logger('auth');

function getLocalStorage(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || defaultValue;
  }
  return defaultValue;
}

function setLocalStorage(key: string, value: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

async function getOrCreateClientId() {
  return await functions.getMachineId();
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: getLocalStorage('username'),
    seatNumber: getLocalStorage('seatNumber'),
    clientId: '', // initialize empty, will populate asynchronously
    userCreated: false
  }),
  getters: {
    getUsername: (state) => state.username,
    getSeatNumber: (state) => state.seatNumber,
    getClientId: (state) => state.clientId
  },
  actions: {
    setUsername(username: string) {
      this.username = username;
      setLocalStorage('username', username);
    },
    setSeatNumber(seatNumber: string) {
      this.seatNumber = seatNumber;
      setLocalStorage('seatNumber', seatNumber);
    },
    async fetchClientId() {
      this.clientId = await getOrCreateClientId();
    },
    async initializeUser() {
      try {
        // Ensure we have a client ID
        if (!this.clientId) {
          await this.fetchClientId();
        }

        // Get server address
        const serverAddressStore = useServerAddressStore();
        const serverAddress = await serverAddressStore.getServerAddress();

        if (!serverAddress) {
          logger.log('No server address available, skipping user creation');
          return;
        }

        // Check if we already have a username, if not generate one
        if (!this.username) {
          const fakeName = generateFakeName();
          this.setUsername(fakeName);
          logger.log('Generated fake name:', fakeName);
        }

        // Create user on the server
        if (!this.userCreated) {
          await this.createUserOnServer();
        }
      } catch (error) {
        logger.log('Error initializing user:', error);
      }
    },
    async createUserOnServer() {
      try {
        const serverAddressStore = useServerAddressStore();
        const serverAddress = await serverAddressStore.getServerAddress();

        if (!serverAddress || !this.clientId || !this.username) {
          logger.log('Missing required data for user creation');
          return;
        }

        const response = await createUser(serverAddress, this.username, this.clientId);
        logger.log('User created on server:', response);
        this.userCreated = true;
      } catch (error) {
        logger.log('Error creating user on server:', error);
        // Don't throw the error, just log it
      }
    },
    async updateUserOnServer() {
      try {
        const serverAddressStore = useServerAddressStore();
        const serverAddress = await serverAddressStore.getServerAddress();

        if (!serverAddress || !this.clientId || !this.username) {
          logger.log('Missing required data for user update');
          return;
        }

        const response = await updateUser(serverAddress, this.clientId, this.username);
        logger.log('User updated on server:', response);
        return response;
      } catch (error) {
        logger.log('Error updating user on server:', error);
        throw error;
      }
    }
  }
});
