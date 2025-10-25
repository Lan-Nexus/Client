import { defineStore } from 'pinia';
import functions from '../functions.js';

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
    clientId: '' // initialize empty, will populate asynchronously
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
    }
  }
});
