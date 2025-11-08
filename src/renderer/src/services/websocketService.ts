import { io, Socket } from 'socket.io-client';
import Logger from '../utils/logger.js';
import { useServerAddressStore } from '../stores/useServerAddress.js';
import { useAuthStore } from '../stores/useAuthStore.js';

const logger = Logger('websocketService');

export interface GameSessionData {
  id?: number;
  clientId: string;
  gameId: number;
  startTime: string;
  endTime?: string;
  isActive: number;
  durationSeconds?: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private isConnected = false;
  private currentSession: GameSessionData | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private _isReconnecting = false;
  private shouldReconnect = true;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.socket?.connected) {
      logger.log('WebSocket already connected');
      return;
    }

    try {
      const serverAddressStore = useServerAddressStore();
      const serverAddress = await serverAddressStore.getServerAddress();

      if (!serverAddress) {
        logger.error('No server address available for WebSocket connection');
        return;
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = serverAddress
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://')
        .replace(/\/$/, '');

      logger.log('Connecting to WebSocket server:', wsUrl);

      this.socket = io(wsUrl, {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false,
      });

      this.socket.on('connect', () => {
        logger.log('WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset counter on successful connection
        this._isReconnecting = false;
        this.shouldReconnect = true; // Enable reconnection for future disconnects
        this.joinGameSessionsRoom();
      });

      this.socket.on('disconnect', (reason) => {
        logger.log('WebSocket disconnected:', reason);
        this.isConnected = false;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        logger.error('WebSocket connection error:', error);
        this.isConnected = false;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      // Listen for game session events from server
      this.socket.on('session_started', (data) => {
        logger.log('Received session_started event:', data);
        // Update current session with server-assigned ID
        if (this.currentSession && data.clientId === this.currentSession.clientId) {
          this.currentSession.id = data.id;
        }
      });

      this.socket.on('session_ended', (data) => {
        logger.log('Received session_ended event:', data);
      });

      this.socket.on('session_updated', (data) => {
        logger.log('Received session_updated event:', data);
      });

      this.socket.on('active_sessions_updated', (data) => {
        logger.log('Received active_sessions_updated event:', data);
      });

      this.socket.on('session_error', (data) => {
        logger.error('Received session_error event:', data);
      });
    } catch (error) {
      logger.error('Error setting up WebSocket connection:', error);
    }
  }

  private joinGameSessionsRoom(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join', 'game-sessions');
      logger.log('Joined game-sessions room');
    }
  }

  private scheduleReconnect(): void {
    if (this._isReconnecting || !this.shouldReconnect) {
      return;
    }

    // If we've reached max attempts, wait longer then reset and try again
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.log('Max reconnection attempts reached, waiting 60 seconds before resetting...');
      this.reconnectTimeoutId = setTimeout(() => {
        logger.log('Resetting reconnection attempts and trying again');
        this.reconnectAttempts = 0;
        this.scheduleReconnect();
      }, 60000); // Wait 60 seconds then reset attempts
      return;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this._isReconnecting = true;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30 seconds
    this.reconnectAttempts++;

    logger.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeoutId = setTimeout(async () => {
      if (!this.shouldReconnect) {
        this._isReconnecting = false;
        return;
      }

      logger.log(
        `Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      try {
        await this.connect();
        if (this.isConnected) {
          logger.log('Reconnection successful');
          this.reconnectAttempts = 0; // Reset counter on successful connection
          this._isReconnecting = false;
        } else {
          this._isReconnecting = false;
          this.scheduleReconnect(); // Schedule next attempt
        }
      } catch (error) {
        logger.error('Reconnection failed:', error);
        this._isReconnecting = false;
        this.scheduleReconnect(); // Schedule next attempt
      }
    }, delay);
  }

  disconnect(): void {
    this.shouldReconnect = false; // Stop automatic reconnection
    this._isReconnecting = false;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.reconnectAttempts = 0;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentSession = null;
      logger.log('WebSocket disconnected');
    }
  }

  async startGameSession(gameId: number): Promise<boolean> {
    if (!this.isConnected || !this.socket) {
      logger.warn('WebSocket not connected, cannot start game session');
      return false;
    }

    try {
      const authStore = useAuthStore();
      await authStore.fetchClientId();

      // End any existing session first
      if (this.currentSession) {
        logger.log('Ending existing session before starting new one');
        await this.endGameSession();
      }

      const sessionData: GameSessionData = {
        clientId: authStore.getClientId,
        gameId: gameId,
        startTime: new Date().toISOString(),
        isActive: 1,
      };

      this.currentSession = sessionData;

      // Emit to backend that a session has started
      this.socket.emit('game_session_started', sessionData);
      logger.log('Game session started:', sessionData);

      return true;
    } catch (error) {
      logger.error('Error starting game session:', error);
      return false;
    }
  }

  async endGameSession(): Promise<boolean> {
    if (!this.currentSession) {
      logger.warn('No current session to end');
      return false;
    }

    if (!this.isConnected || !this.socket) {
      logger.warn('WebSocket not connected, clearing local session only');
      this.currentSession = null;
      return false;
    }

    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(this.currentSession.startTime);
      const endTimeDate = new Date(endTime);
      const durationSeconds = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000);

      const sessionData: GameSessionData = {
        ...this.currentSession,
        endTime: endTime,
        isActive: 0,
        durationSeconds: durationSeconds,
      };

      // Emit to backend that a session has ended
      this.socket.emit('game_session_ended', sessionData);
      logger.log('Game session ended:', sessionData);

      this.currentSession = null;
      return true;
    } catch (error) {
      logger.error('Error ending game session:', error);
      this.currentSession = null;
      return false;
    }
  }

  getCurrentSession(): GameSessionData | null {
    return this.currentSession;
  }

  isSessionActive(): boolean {
    return this.currentSession !== null;
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isReconnecting(): boolean {
    return this._isReconnecting;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  enableReconnection(): void {
    this.shouldReconnect = true;
  }

  disableReconnection(): void {
    this.shouldReconnect = false;
  }
}

// Export singleton instance
export const websocketService = WebSocketService.getInstance();
