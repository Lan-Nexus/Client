import { defineStore } from 'pinia';
import axios from 'axios';
import functions from '../functions.js';
import { useAuthStore } from './useAuthStore.js';
import { useProgressStore } from './useProgress.js';
import Logger from '@renderer/utils/logger.js';
import { useServerAddressStore } from './useServerAddress.js';
import { useAlerts } from './useAlerts.js';
import { reserveGameKey, releaseGameKey, loadGames as apiLoadGames } from '../utils/api.js';
import { websocketService } from '../services/websocketService.js';

const logger = Logger('useGameStore');

import type { gameState } from '@renderer/types.js';
export const useGameStore = defineStore('game', {
  state: () => ({
    games: [] as gameState[],
    selectedGameId: -1,
    gameRunning: void 0 as gameState | undefined,
    loading: false,
    gameHasStarted: false,
    websocketConnected: false,
    websocketReconnecting: false,
    websocketReconnectAttempts: 0,
  }),
  getters: {
    selectedGame: (state) => {
      const game = state.games.find((game) => game.id === state.selectedGameId);
      if (game) {
        return game;
      }
      return void 0;
    },
  },
  actions: {
    selectGame(id) {
      this.selectedGameId = id;
    },

    _findSelectedGame() {
      return this.games.find((game) => game.id === this.selectedGameId);
    },

    async initializeWebSocket() {
      try {
        // Listen to websocket status changes
        websocketService.onStatusChange(() => {
          this.updateWebSocketStatus();
        });

        await websocketService.connect();
        this.updateWebSocketStatus();
        logger.log('WebSocket initialized:', this.websocketConnected);
      } catch (error) {
        logger.error('Failed to initialize WebSocket:', error);
      }
    },

    updateWebSocketStatus() {
      this.websocketConnected = websocketService.getConnectionStatus();
      this.websocketReconnecting = websocketService.isReconnecting();
      this.websocketReconnectAttempts = websocketService.getReconnectAttempts();
    },

    async checkWebSocketConnection() {
      const currentStatus = websocketService.getConnectionStatus();
      if (this.websocketConnected !== currentStatus) {
        this.websocketConnected = currentStatus;
        logger.log('WebSocket connection status changed:', currentStatus);

        if (!currentStatus) {
          logger.log('WebSocket disconnected, attempting to reconnect...');
          try {
            await websocketService.connect();
            this.websocketConnected = websocketService.getConnectionStatus();
            logger.log('WebSocket reconnection result:', this.websocketConnected);
          } catch (error) {
            logger.error('Failed to reconnect WebSocket:', error);
          }
        }
      }
    },

    // Manual test methods for websocket functionality
    async testWebSocketConnection(): Promise<boolean> {
      try {
        if (!this.websocketConnected) {
          await this.initializeWebSocket();
        }
        return websocketService.getConnectionStatus();
      } catch (error) {
        logger.error('Failed to test websocket connection:', error);
        return false;
      }
    },

    async testStartSession(gameId?: number): Promise<boolean> {
      const testGameId = gameId || this.selectedGameId || 1;
      logger.log('Testing session start for game ID:', testGameId);
      return await websocketService.startGameSession(testGameId);
    },

    async testEndSession(): Promise<boolean> {
      logger.log('Testing session end');
      return await websocketService.endGameSession();
    },

    getCurrentSessionInfo() {
      return {
        session: websocketService.getCurrentSession(),
        isActive: websocketService.isSessionActive(),
        connectionStatus: websocketService.getConnectionStatus(),
        websocketConnected: this.websocketConnected,
      };
    },

    setupIntervals() {
      // Watch for game stopped every second
      setInterval(() => {
        this.watchIfGameStopped();
      }, 1000);

      // Monitor websocket connection every 30 seconds
      setInterval(() => {
        this.checkWebSocketConnection();
      }, 30000);
    },

    async checkForAlreadyRunningGames() {
      logger.log('Checking for already running games...');

      try {
        const programs = await functions.getRunningPrograms();

        for (const game of this.games) {
          // Only check archive and shortcut games
          if (game.type !== 'archive' && game.type !== 'shortcut') {
            continue;
          }

          // Extract executable name for comparison
          let executableToCheck = game.executable;
          if (game.type === 'shortcut' && executableToCheck.includes('\\')) {
            const parts = executableToCheck.split('\\');
            executableToCheck = parts[parts.length - 1];
          }

          const isRunning = programs.includes(executableToCheck);

          if (isRunning) {
            logger.log(`Found already running game: ${game.name} (${executableToCheck})`);

            // Start websocket session for this game
            const sessionStarted = await websocketService.startGameSession(game.id);
            if (sessionStarted) {
              logger.log(`Started session for already-running game: ${game.name}`);
              // Set it as the running game if we don't have one yet
              if (!this.gameRunning) {
                this.gameRunning = game;
                this.gameHasStarted = true;
              }
            } else {
              logger.warn(`Failed to start session for already-running game: ${game.name}`);
            }
          }
        }

        logger.log('Finished checking for already running games');
      } catch (error) {
        logger.error('Failed to check for already running games:', error);
      }
    },

    autoRefreshGames() {
      const refreshRate = 600 * 1000;
      logger.log(`Auto-refreshing games every ${refreshRate / 1000} seconds`);
      setInterval(() => {
        logger.log('Refreshing games...');
        this.loadGames();
      }, refreshRate);
    },

    reload() {
      this.loadGames();
    },

    async watchIfGameStopped() {
      try {
        const programs = await functions.getRunningPrograms();

        // If we have a game running, monitor it
        if (this.gameRunning) {
          logger.log(
            `watchIfGameStopped - gameRunning: ${this.gameRunning.name}, type: ${this.gameRunning.type}`
          );

          // Only monitor archive and shortcut games
          if (this.gameRunning.type !== 'archive' && this.gameRunning.type !== 'shortcut') {
            logger.log(`Skipping monitoring for game type: ${this.gameRunning.type}`);
            return;
          }

          // For shortcut games, extract just the filename from the full path
          let executableToCheck = this.gameRunning.executable;
          if (this.gameRunning.type === 'shortcut' && executableToCheck.includes('\\')) {
            // Extract filename from full path (e.g., C:\Program Files\Game\game.exe -> game.exe)
            const parts = executableToCheck.split('\\');
            executableToCheck = parts[parts.length - 1];
            logger.log(`Monitoring shortcut game process: ${executableToCheck}`);
          }

          const isRunning = programs.includes(executableToCheck);

          // Debug logging
          if (this.gameRunning.type === 'shortcut') {
            logger.log(
              `Shortcut game check - Looking for: ${executableToCheck}, Found: ${isRunning}, gameHasStarted: ${this.gameHasStarted}`
            );
          }

          if (!this.gameHasStarted) {
            // Wait for the game to actually start before monitoring for stop
            if (isRunning) {
              this.gameHasStarted = true;
              logger.log('Game has started, now monitoring for game stop');
            }
            return;
          }

          if (isRunning) {
            // Game is still running, nothing to do
            return;
          }

          // Game has stopped after starting
          logger.log('Game stopped detected, ending session');
          logger.log(`WebSocket session active: ${websocketService.isSessionActive()}`);

          // End the websocket session before releasing the key
          if (websocketService.isSessionActive()) {
            logger.log('Attempting to end websocket session...');
            const sessionEnded = await websocketService.endGameSession();
            if (!sessionEnded) {
              logger.warn('Failed to properly end websocket session');
            } else {
              logger.log('WebSocket session ended successfully');
            }
          } else {
            logger.warn('No active websocket session to end');
          }

          // Release game key if needed (only for archive games)
          if (this.gameRunning.needsKey && this.gameRunning.gamekey?.id != null) {
            await this.releaseGameKey(this.gameRunning.id);
          }

          this.gameRunning = void 0;
          this.gameHasStarted = false;
          logger.log('Game session ended');
        } else {
          // No game running - check all shortcut games for external launches
          for (const game of this.games) {
            if (game.type !== 'shortcut') {
              continue;
            }

            // Extract executable name for comparison
            let executableToCheck = game.executable;
            if (executableToCheck.includes('\\')) {
              const parts = executableToCheck.split('\\');
              executableToCheck = parts[parts.length - 1];
            }

            const isRunning = programs.includes(executableToCheck);

            if (isRunning) {
              logger.log(
                `Detected external launch of shortcut game: ${game.name} (${executableToCheck})`
              );

              // Start websocket session for this game
              const sessionStarted = await websocketService.startGameSession(game.id);
              if (sessionStarted) {
                logger.log(`Started session for externally-launched game: ${game.name}`);
                this.gameRunning = game;
                this.gameHasStarted = true;
                // Only track one game at a time
                break;
              } else {
                logger.warn(`Failed to start session for externally-launched game: ${game.name}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Failed to check if game has stopped:', error);
      }
    },

    async releaseGameKey(gameId: number) {
      const serverAddressStore = useServerAddressStore();
      const alerts = useAlerts();
      try {
        if (this.selectedGame?.gamekey?.id != void 0) {
          await releaseGameKey(
            serverAddressStore.serverAddress!,
            gameId,
            this.selectedGame.gamekey.id
          );
          logger.log('Game key released successfully');
        }
      } catch (error) {
        logger.error('Failed to release game key:', error);
        let description = 'Failed to release game key.';
        if (axios.isAxiosError(error) && error.response?.data?.error?.error) {
          description += '<br>' + error.response.data.error.error;
        }
        alerts.showError({ title: 'Key Release Failed', description });
      }
    },

    async reserveGameKey(gameId: number) {
      const serverAddressStore = useServerAddressStore();
      const authStore = useAuthStore();
      await authStore.fetchClientId();
      const alerts = useAlerts();
      try {
        const data = await reserveGameKey(
          serverAddressStore.serverAddress!,
          gameId,
          authStore.getClientId
        );
        logger.log('Game key reserved:', data);
        return data;
      } catch (error) {
        logger.error('Failed to reserve game key:', error);
        let description = 'Failed to reserve game key.';
        if (axios.isAxiosError(error) && error.response?.data?.error?.error) {
          description += '<br>' + error.response.data.error.error;
        }
        alerts.showError({ title: 'Key Reservation Failed', description });
        this.loading = false;
        throw error;
      }
    },

    async installArchive() {
      this.loading = true;
      const serverAddressStore = useServerAddressStore();
      const alerts = useAlerts();
      const game = this._findSelectedGame();
      if (!game || !game.archives) {
        logger.error('Game not found or no archive available for installation.');
        alerts.showError({
          title: 'Install Failed',
          description: 'Game not found or no archive available for installation.',
        });
        this.loading = false;
        return;
      }

      const safeName = game.gameID.replaceAll(' ', '-');
      const archiveFile = safeName + '.zip';
      const progressStore = useProgressStore();
      progressStore.active = true;
      try {
        const url = serverAddressStore.serverAddress + game.archives;
        await functions.download(url, archiveFile);
        await functions.unzip(archiveFile, safeName);
        await functions.run(safeName, game.install, {
          GAME_KEY: game.gamekey?.key ?? '',
          GAME_ID: String(game.gameID),
          GAME_NAME: game.name,
          GAME_EXECUTABLE: game.executable || '',
        });
        await functions.clearTemp();
        game.isInstalled = true;
        alerts.showSuccess({
          title: 'Install Success',
          description: 'Game installed successfully!',
        });
      } catch (error) {
        logger.error(error);
        this.uninstallArchive(true);
        await functions.clearTemp();
        alerts.showError({
          title: 'Install Failed',
          description:
            'Failed to install game.<br>' + (error instanceof Error ? error.message : ''),
        });
      } finally {
        progressStore.active = false;
        this.loading = false;
      }
    },

    async uninstallArchive(hideAlerts = false) {
      this.loading = true;

      const alerts = useAlerts();

      const progressStore = useProgressStore();
      progressStore.active = false;
      const game = this._findSelectedGame();
      if (!game) {
        alerts.showError({
          title: 'Uninstall Failed',
          description: 'Game not found for uninstall.',
        });
        return;
      }
      const safeName = game.gameID.replaceAll(' ', '-');
      try {
        await functions.run(safeName, game.uninstall);
        await functions.removeGame(safeName);
        game.isInstalled = false;
        if (!hideAlerts) {
          alerts.showSuccess({
            title: 'Uninstall Success',
            description: 'Game uninstalled successfully!',
          });
        }
      } catch (error) {
        logger.error(error);
        if (!hideAlerts) {
          alerts.showError({ title: 'Uninstall Failed', description: 'Failed to uninstall game.' });
        }
      } finally {
        progressStore.active = false;
        this.loading = false;
      }
    },

    async loadGames() {
      this.loading = true;
      const serverAddressStore = useServerAddressStore();
      const authStore = useAuthStore();
      const alerts = useAlerts();
      await authStore.fetchClientId();

      try {
        const gamesData = await apiLoadGames(
          serverAddressStore.serverAddress!,
          authStore.getClientId
        );
        this.games = await this._addInstallStatusToGames(gamesData);

        // Check for already running games after loading
        await this.checkForAlreadyRunningGames();
      } catch (error) {
        logger.error('Failed to load games:', error);
        alerts.showError({ title: 'Load Failed', description: 'Failed to load games.' });
      } finally {
        this.loading = false;
      }
    },

    async _addInstallStatusToGames(gamesData: gameState[]): Promise<gameState[]> {
      const gamesWithStatus: gameState[] = [];
      for (const game of gamesData) {
        gamesWithStatus.push(await this._addInstallStatusToGame(game));
      }
      return gamesWithStatus;
    },

    async _addInstallStatusToGame(game: gameState): Promise<gameState> {
      let isInstalled = false;
      if (game.type === 'archive') {
        const safeName = game.gameID.replaceAll(' ', '-');
        isInstalled = await functions.isGameInstalled(safeName);
        logger.log(`Game ${game.name} is installed: ${isInstalled}`);
      } else if (game.type === 'steam') {
        // For Steam games, assume they're ready to play if Steam is available
        // This could be enhanced to check if Steam is actually installed
        isInstalled = true;
        logger.log(`Steam game ${game.name} assumed ready: ${isInstalled}`);
      } else {
        // Default: Other game types (shortcut, etc.) are always ready to play
        isInstalled = true;
        logger.log(`${game.type} game ${game.name} is ready to launch`);
      }
      return { ...game, isInstalled };
    },

    async openFileLocation() {
      const game = this._findSelectedGame();
      if (!game) {
        logger.error('No game selected to open file location.');
        return;
      }
      const safeName = game.gameID.replaceAll(' ', '-');
      try {
        await functions.openFileLocation(safeName);
      } catch (error) {
        logger.error('Failed to open file location:', error);
      }
    },

    async play() {
      const selectedGame = this.selectedGame;
      if (!selectedGame) return;

      logger.log(`play() called for: ${selectedGame.name}, type: ${selectedGame.type}`);

      // Steam games have special handling (protocol launch)
      if (selectedGame.type === 'steam') {
        await this.playSteam();
        return;
      }

      // Archive games need installation check and key reservation
      if (selectedGame.type === 'archive') {
        const game = this._findSelectedGame();
        if (game && game.needsKey) {
          game.gamekey = await this.reserveGameKey(game.id);
        }
        this.gameRunning = selectedGame;
        this.gameHasStarted = false;
        // Start websocket session
        const sessionStarted = await websocketService.startGameSession(selectedGame.id);
        if (!sessionStarted) {
          logger.warn('Failed to start websocket session, but continuing with game launch');
        }
        await this.playArchive();
        return;
      }

      // Default behavior for all other game types (shortcut, and any future types)
      // This will run the play script with GAME_EXECUTABLE replacement
      await this.playDefault();
    },

    async playSteam() {
      const selectedGame = this.selectedGame;
      if (selectedGame && selectedGame.type === 'steam') {
        // Start websocket session for Steam games too
        const sessionStarted = await websocketService.startGameSession(selectedGame.id);
        if (!sessionStarted) {
          logger.warn(
            'Failed to start websocket session for Steam game, but continuing with launch'
          );
        }
        this.gameRunning = selectedGame;
        this.gameHasStarted = false;
        document.location.href = `steam://run/${selectedGame.gameID}`;
      }
    },

    async playArchive() {
      const game = this._findSelectedGame();
      if (!game || game.type !== 'archive') {
        return;
      }
      const safeName = game.gameID.replaceAll(' ', '-');
      // const progressStore = useProgressStore();
      logger.log(`Preparing to play game: ${game.name}`);
      await functions.run(safeName, game.play, {
        GAME_KEY: game.gamekey?.key ?? '',
        GAME_ID: String(game.gameID),
        GAME_NAME: game.name,
        GAME_EXECUTABLE: game.executable || '',
      });
      logger.log(`Playing game: ${game.name}`);
    },

    async playDefault() {
      const game = this._findSelectedGame();
      if (!game) {
        logger.error('No game found to launch');
        return;
      }

      logger.log(`Preparing to launch game: ${game.name} (type: ${game.type})`);
      logger.log(`Game executable: ${game.executable}`);
      logger.log(`Play script: ${game.play}`);

      this.gameRunning = game;
      this.gameHasStarted = false;

      // Start websocket session
      logger.log(`Starting websocket session for game ID: ${game.id}`);
      const sessionStarted = await websocketService.startGameSession(game.id);
      logger.log(
        `WebSocket session start result: ${sessionStarted}, isActive: ${websocketService.isSessionActive()}`
      );
      if (!sessionStarted) {
        logger.warn('Failed to start websocket session, but continuing with game launch');
      }

      // For shortcut games, use runDirect API directly instead of the run() context
      if (game.type === 'shortcut') {
        try {
          logger.log(`Launching shortcut directly: ${game.executable}`);
          await functions.runDirect(game.executable);
          logger.log(`Launched shortcut game: ${game.name}`);
        } catch (error) {
          logger.error(`Failed to launch shortcut: ${error}`);
          throw error;
        }
        return;
      }

      // For other game types, use the normal run() with game directory context
      const safeName = game.gameID.replaceAll(' ', '-');

      // Check if play script exists
      if (!game.play || game.play.trim() === '') {
        logger.error(`No play script defined for game: ${game.name}`);
        logger.warn('Attempting to run with default script: await run(GAME_EXECUTABLE);');
        await functions.run(safeName, 'await run(GAME_EXECUTABLE);', {
          GAME_KEY: game.gamekey?.key ?? '',
          GAME_ID: String(game.gameID),
          GAME_NAME: game.name,
          GAME_EXECUTABLE: game.executable || '',
        });
      } else {
        // Run the play script with variable replacements
        await functions.run(safeName, game.play, {
          GAME_KEY: game.gamekey?.key ?? '',
          GAME_ID: String(game.gameID),
          GAME_NAME: game.name,
          GAME_EXECUTABLE: game.executable || '',
        });
      }
      logger.log(`Launched game: ${game.name}`);
    },
  },
});
