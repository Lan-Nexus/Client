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
    currentSteamAppId: null as string | null,
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

    /**
     * Get all executable names that should be monitored for a game.
     * Returns an array of executable names (just filenames, not full paths).
     */
    _getExecutablesToMonitor(game: gameState): string[] {
      const executables: string[] = [];

      // Add executables from the executables array if present
      if (game.executables && game.executables.length > 0) {
        for (const exe of game.executables) {
          // Extract filename from path if needed (handle both / and \ path separators)
          let filename = exe;
          if (exe.includes('\\') || exe.includes('/')) {
            const parts = exe.split(/[\\/]/);
            filename = parts[parts.length - 1];
          }
          executables.push(filename);
        }
      }

      // Also add the main executable field for backward compatibility
      if (game.executable) {
        let filename = game.executable;
        if (game.executable.includes('\\') || game.executable.includes('/')) {
          const parts = game.executable.split(/[\\/]/);
          filename = parts[parts.length - 1];
        }
        // Only add if not already in the list
        if (!executables.includes(filename)) {
          executables.push(filename);
        }
      }

      logger.log(`Executables to monitor for ${game.name}: [${executables.join(', ')}]`);
      return executables;
    },

    /**
     * Check if any of the game's processes are running.
     */
    _isGameRunning(game: gameState, runningPrograms: string[]): boolean {
      const executablesToCheck = this._getExecutablesToMonitor(game);
      return executablesToCheck.some((exe) => runningPrograms.includes(exe));
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

    async reconnectWebSocket() {
      try {
        logger.log('Disconnecting existing WebSocket connection...');
        websocketService.disconnect();

        logger.log('Connecting to new server address...');
        await websocketService.connect();
        this.updateWebSocketStatus();

        logger.log('WebSocket reconnected:', this.websocketConnected);
        return this.websocketConnected;
      } catch (error) {
        logger.error('Failed to reconnect WebSocket:', error);
        return false;
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

      // Verify session sync with server every 60 seconds
      setInterval(() => {
        this.verifySessionSync();
      }, 60000);
    },

    async verifySessionSync() {
      if (!this.websocketConnected) {
        logger.log('Skipping session sync check - websocket not connected');
        return;
      }

      try {
        const serverStatus = await websocketService.checkMySessionWithServer();
        if (!serverStatus) {
          logger.warn('Failed to get session status from server');
          return;
        }

        const localSession = websocketService.getCurrentSession();
        const hasLocalSession = localSession !== null;
        const hasServerSession = serverStatus.hasSession;

        logger.log(
          `Session sync check - Local: ${hasLocalSession ? `game ${localSession?.gameId}` : 'none'}, Server: ${hasServerSession ? `game ${serverStatus.session?.gameId}` : 'none'}`
        );

        // Case 1: We think we're playing but server doesn't
        if (hasLocalSession && !hasServerSession) {
          logger.warn('Session desync detected: Local has session but server does not');

          // Check if the game process is still actually running
          const programs = await functions.getRunningPrograms();
          if (this.gameRunning) {
            const isRunning = this._isGameRunning(this.gameRunning, programs);

            if (isRunning) {
              // Game is still running, re-sync with server
              logger.log('Game is still running, restarting session on server');
              await websocketService.startGameSession(this.gameRunning.id);
            } else {
              // Game is not running, clear local state
              logger.log('Game is not running, clearing local session');
              this.gameRunning = void 0;
              this.gameHasStarted = false;
            }
          }
        }

        // Case 2: Server thinks we're playing but we don't
        if (!hasLocalSession && hasServerSession && serverStatus.session) {
          logger.warn(
            `Session desync detected: Server thinks we're playing game ${serverStatus.session.gameId} but we don't have a local session`
          );

          // Check if we're actually running any game
          const programs = await functions.getRunningPrograms();
          let foundRunningGame = false;

          for (const game of this.games) {
            if (game.id === serverStatus.session.gameId) {
              const isRunning = this._isGameRunning(game, programs);
              if (isRunning) {
                logger.log(`Found game ${game.name} is actually running, syncing local state`);
                this.gameRunning = game;
                this.gameHasStarted = true;
                foundRunningGame = true;
                break;
              }
            }
          }

          if (!foundRunningGame) {
            // We're not running the game, tell server to end the session
            logger.log('Game is not running locally, ending server session');
            await websocketService.endGameSession();
          }
        }

        // Case 3: Both think we're playing but different games
        if (
          hasLocalSession &&
          hasServerSession &&
          localSession?.gameId !== serverStatus.session?.gameId
        ) {
          logger.warn(
            `Session desync detected: Local thinks game ${localSession?.gameId}, server thinks game ${serverStatus.session?.gameId}`
          );

          // Trust the local state if the game is actually running
          const programs = await functions.getRunningPrograms();
          if (this.gameRunning) {
            const isRunning = this._isGameRunning(this.gameRunning, programs);
            if (isRunning) {
              logger.log('Local game is running, correcting server state');
              await websocketService.endGameSession();
              await websocketService.startGameSession(this.gameRunning.id);
            } else {
              logger.log('Local game is not running, clearing and accepting server state');
              this.gameRunning = void 0;
              this.gameHasStarted = false;
            }
          }
        }
      } catch (error) {
        logger.error('Error during session sync verification:', error);
      }
    },

    async checkForAlreadyRunningGames() {
      logger.log('Checking for already running games...');

      try {
        const programs = await functions.getRunningPrograms();

        // Check for Steam games first
        const steamAppId = await functions.getRunningSteamAppId();
        if (steamAppId && !this.gameRunning) {
          logger.log(`Found running Steam game with AppID: ${steamAppId}`);

          // Always send steamAppId to server for lookup (don't match locally)
          logger.log(`Sending Steam AppID ${steamAppId} to server for lookup`);
          const sessionStarted = await websocketService.startGameSession(0, steamAppId, false);
          if (sessionStarted) {
            logger.log(`Started session for Steam game with AppID: ${steamAppId}`);
            this.gameHasStarted = true;
            this.currentSteamAppId = steamAppId;
          }
        }

        // Check for other game types (archive, shortcut, steam with executables)
        for (const game of this.games) {
          // Check archive, shortcut, and steam games
          if (game.type !== 'archive' && game.type !== 'shortcut' && game.type !== 'steam') {
            continue;
          }

          const isRunning = this._isGameRunning(game, programs);

          if (isRunning) {
            const executables = this._getExecutablesToMonitor(game);
            logger.log(
              `Found already running game: ${game.name} (monitoring: ${executables.join(', ')})`
            );

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

        // Check for Steam games
        const steamAppId = await functions.getRunningSteamAppId();

        // Handle Steam game detection
        if (steamAppId && steamAppId !== this.currentSteamAppId) {
          // New Steam game detected
          logger.log(`Steam game detected with AppID: ${steamAppId}`);
          this.currentSteamAppId = steamAppId;

          // End previous session if exists
          if (this.gameRunning) {
            logger.log('Ending previous game session for Steam game switch');
            await websocketService.endGameSession();
            if (this.gameRunning.needsKey && this.gameRunning.gamekey?.id != null) {
              await this.releaseGameKey(this.gameRunning.id);
            }
          }

          // Always send steamAppId to server for lookup (don't match locally)
          logger.log(`Sending Steam AppID ${steamAppId} to server for lookup`);
          const sessionStarted = await websocketService.startGameSession(0, steamAppId, false);
          if (sessionStarted) {
            logger.log(`Started session for Steam game with AppID: ${steamAppId}`);
            this.gameRunning = void 0;
            this.gameHasStarted = true;
          }
        } else if (!steamAppId && this.currentSteamAppId) {
          // Steam game stopped
          logger.log(`Steam game stopped (was AppID: ${this.currentSteamAppId})`);
          this.currentSteamAppId = null;

          // If we're tracking a Steam game (or unknown game), end the session
          if (this.gameHasStarted) {
            logger.log('Steam game session ending');

            if (websocketService.isSessionActive()) {
              const sessionEnded = await websocketService.endGameSession();
              if (!sessionEnded) {
                logger.warn('Failed to properly end Steam game websocket session');
              } else {
                logger.log('Steam game WebSocket session ended successfully');
              }
            }

            this.gameRunning = void 0;
            this.gameHasStarted = false;
            logger.log('Steam game session ended');
          }
        }

        // If we have a game running, monitor it
        if (this.gameRunning) {
          logger.log(
            `watchIfGameStopped - gameRunning: ${this.gameRunning.name}, type: ${this.gameRunning.type}`
          );

          // Monitor archive, shortcut, and steam games
          if (
            this.gameRunning.type !== 'archive' &&
            this.gameRunning.type !== 'shortcut' &&
            this.gameRunning.type !== 'steam'
          ) {
            logger.log(`Skipping monitoring for game type: ${this.gameRunning.type}`);
            return;
          }

          const executablesToCheck = this._getExecutablesToMonitor(this.gameRunning);
          const isRunning = this._isGameRunning(this.gameRunning, programs);

          // Debug logging
          logger.log(
            `Monitoring game processes: [${executablesToCheck.join(', ')}], Found: ${isRunning}, gameHasStarted: ${this.gameHasStarted}`
          );

          if (!this.gameHasStarted) {
            // Wait for the game to actually start before monitoring for stop
            if (isRunning) {
              this.gameHasStarted = true;
              logger.log('Game process detected, starting session');
              // Start the websocket session now that we confirmed the process is running
              const sessionStarted = await websocketService.startGameSession(this.gameRunning.id);
              if (sessionStarted) {
                logger.log('WebSocket session started successfully after process detection');
              } else {
                logger.warn('Failed to start websocket session after process detection');
              }
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
          // No game running - check shortcut and steam games for external launches
          for (const game of this.games) {
            if (game.type !== 'shortcut' && game.type !== 'steam') {
              continue;
            }

            const isRunning = this._isGameRunning(game, programs);

            if (isRunning) {
              const executables = this._getExecutablesToMonitor(game);
              logger.log(
                `Detected external launch of ${game.type} game: ${game.name} (monitoring: ${executables.join(', ')})`
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
        // Don't start session yet - wait for process detection
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
        this.gameRunning = selectedGame;
        this.gameHasStarted = false;
        // Don't start session yet - wait for process detection
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

      // Don't start session yet - wait for process detection

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
