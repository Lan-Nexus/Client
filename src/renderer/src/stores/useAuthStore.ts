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
      try {
        console.log('Fetching client ID...');
        this.clientId = await getOrCreateClientId();
        console.log('Client ID fetched successfully:', this.clientId);
      } catch (error) {
        console.error('Error fetching client ID:', error);
        throw error;
      }
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

        // Get current avatar if available
        const avatarData = this.getCurrentAvatarOptions();
        logger.log('Sending avatar options to server:', avatarData);

        const response = await createUser(serverAddress, this.username, this.clientId, avatarData.options);
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
          logger.log('Missing required data for user update:', {
            serverAddress: !!serverAddress,
            clientId: !!this.clientId,
            username: !!this.username
          });
          return;
        }

        // Get current avatar if available
        const avatarData = this.getCurrentAvatarOptions();
        logger.log('Sending avatar options to server:', avatarData);

        logger.log('Updating user on server with data:', {
          serverAddress,
          clientId: this.clientId,
          username: this.username,
          hasAvatar: !!avatarData
        });

        const response = await updateUser(serverAddress, this.clientId, this.username, avatarData.options);
        logger.log('User updated on server:', response);
        return response;
      } catch (error) {
        logger.log('Error updating user on server:', error);
        throw error;
      }
    },
    getCurrentAvatarOptions(): any | null {
      try {
        const saved = localStorage.getItem('lan-nexus-current-avatar');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Return only the options part for the server
          return parsed.options;
        }
        return null;
      } catch (error) {
        logger.log('Error getting current avatar options:', error);
        return null;
      }
    }
  }
});
