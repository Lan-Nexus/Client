import { defineStore } from 'pinia';
import Logger from '@renderer/utils/logger.js';
import { useServerAddressStore } from './useServerAddress.js';
import axios from 'axios';

const logger = Logger('useCalendarStore');

export type ScheduledGame = {
    id: number;
    gameId: number;
    gameName: string;
    gameIcon?: string;
    startTime: string; // ISO date string
    endTime: string; // ISO date string
    status: 'upcoming' | 'current' | 'completed';
    description?: string;
    participants?: string[];
};

export const useCalendarStore = defineStore('calendar', {
    state: () => ({
        scheduledGames: [] as ScheduledGame[],
        loading: false,
        currentGame: null as ScheduledGame | null,
    }),
    getters: {
        upcomingGames: (state) => {
            const now = new Date();
            return state.scheduledGames
                .filter((game) => new Date(game.startTime) > now)
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        },
        completedGames: (state) => {
            const now = new Date();
            return state.scheduledGames
                .filter((game) => new Date(game.endTime) < now)
                .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
        },
        currentlyPlaying: (state) => {
            const now = new Date();
            return state.scheduledGames.find((game) => {
                const start = new Date(game.startTime);
                const end = new Date(game.endTime);
                return start <= now && now <= end;
            });
        },
        gamesByDate: (state) => {
            const grouped = {} as Record<string, ScheduledGame[]>;
            state.scheduledGames.forEach((game) => {
                const date = new Date(game.startTime).toISOString().split('T')[0];
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(game);
            });
            return grouped;
        },
    },
    actions: {
        async loadScheduledGames() {
            this.loading = true;
            try {
                const serverAddressStore = useServerAddressStore();
                // TODO: Replace with actual API call when backend is ready
                // const serverAddressStore = useServerAddressStore();
                // const response = await axios.get(`${serverAddressStore.serverAddress}/api/calendar`);
                // this.scheduledGames = response.data;

                const response = await axios.get(`${serverAddressStore.serverAddress}/api/events`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                this.scheduledGames = response.data;
                this.updateCurrentGame();
                logger.log('Scheduled games loaded successfully');
            } catch (error) {
                logger.error('Failed to load scheduled games:', error);
            } finally {
                this.loading = false;
            }
        },

        updateCurrentGame() {
            this.currentGame = this.currentlyPlaying || null;
        },

        // Light refresh method that only updates time-based status without API calls
        refreshTimeBasedStatus() {
            this.updateCurrentGame();
            // This will trigger reactivity in computed getters like upcomingGames, completedGames, etc.
        },

        async getMockData(): Promise<ScheduledGame[]> {
            // Mock data for demonstration
            const now = new Date();
            const today = new Date(now);
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            return [
                {
                    id: 1,
                    gameId: 1,
                    gameName: 'Counter-Strike 2',
                    startTime: new Date(today.setHours(20, 0, 0, 0)).toISOString(),
                    endTime: new Date(today.setHours(22, 0, 0, 0)).toISOString(),
                    status: 'upcoming',
                    description: 'Weekly tournament finals',
                },
                {
                    id: 2,
                    gameId: 2,
                    gameName: 'Valorant',
                    startTime: new Date(tomorrow.setHours(19, 0, 0, 0)).toISOString(),
                    endTime: new Date(tomorrow.setHours(21, 0, 0, 0)).toISOString(),
                    status: 'upcoming',
                    description: 'Community night',
                },
                {
                    id: 3,
                    gameId: 3,
                    gameName: 'League of Legends',
                    startTime: new Date(yesterday.setHours(18, 0, 0, 0)).toISOString(),
                    endTime: new Date(yesterday.setHours(20, 30, 0, 0)).toISOString(),
                    status: 'completed',
                    description: 'Ranked team match',
                },
                {
                    id: 4,
                    gameId: 1,
                    gameName: 'Counter-Strike 2',
                    startTime: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                    endTime: new Date(now.getTime() + 90 * 60 * 1000).toISOString(), // 90 minutes from now
                    status: 'current',
                    description: 'Live match in progress',
                },
            ];
        },

        async addScheduledGame(game: Omit<ScheduledGame, 'id'>) {
            try {
                // TODO: Replace with actual API call
                const newGame: ScheduledGame = {
                    ...game,
                    id: Math.max(0, ...this.scheduledGames.map(g => g.id)) + 1,
                };
                this.scheduledGames.push(newGame);
                logger.log('Game scheduled successfully');
            } catch (error) {
                logger.error('Failed to schedule game:', error);
                throw error;
            }
        },

        async removeScheduledGame(gameId: number) {
            try {
                // TODO: Replace with actual API call
                this.scheduledGames = this.scheduledGames.filter(game => game.id !== gameId);
                logger.log('Scheduled game removed successfully');
            } catch (error) {
                logger.error('Failed to remove scheduled game:', error);
                throw error;
            }
        },
    },
});