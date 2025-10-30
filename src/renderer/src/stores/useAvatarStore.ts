import axios from 'axios';
import { defineStore } from 'pinia';
import { useServerAddressStore } from './useServerAddress.js';

interface AvatarOptions {
  eyes: string;
  eyebrows: string;
  mouth: string;
  glasses: string;
  earrings: string;
  hair: string;
  skinColor: string;
  hairColor: string;
  backgroundColor?: string[];
  backgroundType?: string[];
}

interface UserAvatar {
  username: string;
  options: AvatarOptions;
  timestamp: number;
}

export const useAvatarStore = defineStore('avatar', {
  state: () => ({
    currentAvatar: null as UserAvatar | null,
  }),

  getters: {
    hasAvatar: (state) => state.currentAvatar !== null,
    getAvatarOptions: (state) => state.currentAvatar?.options || null,
    getUsername: (state) => state.currentAvatar?.username || '',
  },

  actions: {
    // Set the current avatar (used by avatar creator)
    setAvatar(username: string, options: AvatarOptions) {
      const avatar: UserAvatar = {
        username,
        options,
        timestamp: Date.now()
      };

      this.currentAvatar = avatar;
      this.saveToLocalStorage();
    },

    // Get avatar data for server API (returns JSON string of options)
    get(): string | null {
      if (!this.currentAvatar) {
        return null;
      }

      return JSON.stringify({
        username: this.currentAvatar.username,
        options: this.currentAvatar.options
      });
    },

    // Load avatar from localStorage
    loadFromLocalStorage() {
      try {
        const saved = localStorage.getItem('lan-nexus-current-avatar');
        if (saved) {
          this.currentAvatar = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Error loading avatar from localStorage:', error);
        this.currentAvatar = null;
      }
    },

    async getAvatarFromApi(clientId:string) {
      try{
        const serverAddressStore = useServerAddressStore();
        const response = await axios.get(`${serverAddressStore.serverAddress}/api/users/by-client-id/${clientId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.currentAvatar = {
          options: response.data.data.avatar,
          username: response.data.data.name,
          timestamp: Date.now()
        }

        this.saveToLocalStorage();
      return;
      }catch(error){
        console.error('Error fetching avatar timestamp:', error);
        return null;
      }
    },

    // Save avatar to localStorage
    saveToLocalStorage() {
      try {
        if (this.currentAvatar) {
          localStorage.setItem('lan-nexus-current-avatar', JSON.stringify(this.currentAvatar));
        } else {
          localStorage.removeItem('lan-nexus-current-avatar');
        }
      } catch (error) {
        console.error('Error saving avatar to localStorage:', error);
      }
    },

    // Clear avatar
    clear() {
      this.currentAvatar = null;
      localStorage.removeItem('lan-nexus-current-avatar');
    },

    // Initialize avatar store
    async initialize() {
      this.loadFromLocalStorage();
    }
  }
});
