<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useServerAddressStore } from '../stores/useServerAddress.js';
import { websocketService } from '../services/websocketService.js';
import Logger from '../utils/logger.js';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

const logger = Logger('ActivePlayersPanel');

const isDev = process.env.NODE_ENV === 'development';

interface AvatarOptions {
  eyes: string;
  eyebrows: string;
  mouth: string;
  glasses?: string;
  earrings?: string;
  hair: string;
  hairColor: string;
  skinColor: string;
  backgroundColor?: string[];
  backgroundType?: string[];
}

interface UploadedAvatar {
  type: 'upload';
  url: string;
}

interface User {
  id: number;
  name: string;
  clientId: string;
  role: string;
  avatar: AvatarOptions | UploadedAvatar | null;
}

interface PlayerSession {
  id?: number;
  clientId: string;
  gameId: number;
  startTime: string;
  endTime?: string;
  isActive: number;
  user?: User | null;
}

const { gameId } = defineProps<{ gameId: number }>();

const authStore = useAuthStore();
const serverAddressStore = useServerAddressStore();
const activePlayers = ref<Map<string, PlayerSession>>(new Map());

// Computed property to get other players in this game
const otherPlayersInGame = computed(() => {
  const players = Array.from(activePlayers.value.values());
  return players.filter(
    (player) =>
      player.gameId === gameId && player.clientId !== authStore.getClientId && player.isActive === 1
  );
});

// Manual function to request active sessions
function requestActiveSessions() {
  const socket = websocketService.getSocket();
  if (socket && websocketService.getConnectionStatus()) {
    logger.log('Manually requesting active sessions...');
    socket.emit('request_active_sessions');
  } else {
    logger.warn('Cannot request sessions - WebSocket not connected');
  }
}

// Handle websocket session events
function setupWebSocketListeners() {
  try {
    const socket = websocketService.getSocket();
    if (!socket) {
      logger.warn('WebSocket not available');
      return;
    }

    // Listen for session started events
    socket.on(
      'session_started',
      (sessionData: {
        id?: number;
        clientId: string;
        gameId: number;
        startTime?: string;
        user?: User | null;
      }) => {
        logger.log('Session started:', sessionData);
        logger.log('Session user data:', sessionData.user);
        logger.log('Current game ID:', gameId);
        logger.log('Session game ID:', sessionData.gameId);

        if (sessionData.gameId && sessionData.clientId) {
          const playerSession: PlayerSession = {
            id: sessionData.id,
            clientId: sessionData.clientId,
            gameId: sessionData.gameId,
            startTime: sessionData.startTime || new Date().toISOString(),
            isActive: 1,
            user: sessionData.user,
          };
          activePlayers.value.set(sessionData.clientId, playerSession);
          logger.log('Added player to list:', playerSession);
          logger.log('Total players now:', activePlayers.value.size);
        }
      }
    );

    // Listen for session ended events
    socket.on('session_ended', (sessionData: { clientId: string; user?: User | null }) => {
      logger.log('Session ended:', sessionData);
      if (sessionData.clientId) {
        const existingPlayer = activePlayers.value.get(sessionData.clientId);
        if (existingPlayer) {
          existingPlayer.isActive = 0;
          // Remove after a short delay to show the transition
          setTimeout(() => {
            activePlayers.value.delete(sessionData.clientId);
          }, 1000);
        }
      }
    });

    // Listen for active sessions updates
    socket.on(
      'active_sessions_updated',
      (data: {
        sessions: {
          id?: number;
          clientId: string;
          gameId: number;
          startTime: string;
          isActive: number;
          user?: User | null;
        }[];
      }) => {
        logger.log('Active sessions updated:', data);
        logger.log('Number of sessions received:', data.sessions?.length || 0);

        if (data.sessions && Array.isArray(data.sessions)) {
          // Clear current players and rebuild from server data
          activePlayers.value.clear();

          // Process each session
          data.sessions.forEach((session) => {
            logger.log('Processing session:', session);
            logger.log('Session user:', session.user);

            if (session.isActive === 1 && session.clientId) {
              const playerSession: PlayerSession = {
                id: session.id,
                clientId: session.clientId,
                gameId: session.gameId,
                startTime: session.startTime,
                isActive: 1,
                user: session.user,
              };
              activePlayers.value.set(session.clientId, playerSession);
              logger.log('Added session to map:', playerSession);
            }
          });

          logger.log('Total players after update:', activePlayers.value.size);
          logger.log('Players for this game:', otherPlayersInGame.value.length);
        }
      }
    );

    // Listen for client sessions stopped
    socket.on('client_sessions_stopped', (data: { clientId: string }) => {
      logger.log('Client sessions stopped:', data);
      if (data.clientId) {
        activePlayers.value.delete(data.clientId);
      }
    });
  } catch (err) {
    logger.error('Error setting up websocket listeners:', err);
  }
}

// Get user initials for avatar fallback
function getUserInitials(player: PlayerSession) {
  const playerName = player.user?.name || 'Anonymous';
  if (!playerName) return '?';
  return playerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Get time since session started
function getTimeSinceStart(startTime: string) {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just started';
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

// Generate avatar from options using DiceBear
function generateAvatarFromOptions(options: AvatarOptions): string {
  try {
    const avatarConfig: Record<string, string | string[] | number> = {
      size: 40,
      backgroundColor: options.backgroundColor || ['transparent'],
      backgroundType: options.backgroundType || ['solid'],
      eyes: [options.eyes],
      eyebrows: [options.eyebrows],
      mouth: [options.mouth],
      hairType: [options.hair],
      skinColor: [options.skinColor],
      hairColor: [options.hairColor],
    };

    // Add optional features
    if (options.earrings && options.earrings !== 'none') {
      avatarConfig.earrings = [options.earrings];
      avatarConfig.earringsProbability = 100;
    }

    if (options.glasses && options.glasses !== 'none') {
      avatarConfig.glasses = [options.glasses];
      avatarConfig.glassesProbability = 100;
    }

    const avatar = createAvatar(adventurer, avatarConfig);
    return avatar.toDataUri();
  } catch (error) {
    logger.warn('Error generating avatar:', error);
    return '';
  }
}

// Get avatar URL from user data
function getAvatarUrl(user: User | null | undefined) {
  if (!user || !user.avatar) return null;

  try {
    logger.log('Processing avatar for user:', user.name, 'Avatar data:', user.avatar);

    // Handle the avatar data - it comes directly as an object from WebSocket
    const avatarData = user.avatar;
    logger.log('Avatar data:', avatarData);

    // Check if it's an uploaded image
    if (
      avatarData &&
      typeof avatarData === 'object' &&
      'type' in avatarData &&
      avatarData.type === 'upload' &&
      'url' in avatarData
    ) {
      logger.log('Found uploaded avatar for:', user.name);
      return serverAddressStore.serverAddress + avatarData.url;
    }

    // Check if it's avatar options (generated avatar) - look for avatar option properties
    if (avatarData && typeof avatarData === 'object' && 'eyes' in avatarData && avatarData.eyes) {
      logger.log('Found avatar options for:', user.name, 'Generating avatar...');
      const generatedAvatar = generateAvatarFromOptions(avatarData as AvatarOptions);
      logger.log('Generated avatar data URI length:', generatedAvatar.length);
      return generatedAvatar;
    }

    logger.log('No valid avatar format found for:', user.name);
  } catch (error) {
    logger.warn('Failed to process avatar data for user:', user.name, error);
  }
  return null;
}

// Generate a consistent color for each player based on their clientId
function getPlayerColor(clientId: string) {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const hash = clientId.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
}

// Test function to verify avatar generation
function testAvatarGeneration() {
  const testOptions: AvatarOptions = {
    eyes: 'variant01',
    eyebrows: 'variant06',
    mouth: 'variant02',
    glasses: 'variant01',
    earrings: 'variant05',
    hair: 'long03',
    hairColor: 'ffffff',
    skinColor: 'ff6b6b',
    backgroundColor: ['transparent'],
    backgroundType: ['solid'],
  };

  const result = generateAvatarFromOptions(testOptions);
  logger.log('Test avatar generation result length:', result.length);
  logger.log('Test avatar starts with data:image:', result.startsWith('data:image/'));
  return result;
}

onMounted(async () => {
  try {
    await authStore.fetchClientId();
    logger.log('Client ID:', authStore.getClientId);
  } catch (err) {
    logger.error('Failed to fetch client ID:', err);
  }

  setupWebSocketListeners();

  // Test avatar generation in development
  if (isDev) {
    logger.log('Testing avatar generation...');
    testAvatarGeneration();
  }

  // Request current active sessions when component mounts
  const socket = websocketService.getSocket();
  if (socket && websocketService.getConnectionStatus()) {
    logger.log('Requesting active sessions...');
    socket.emit('request_active_sessions');
  }

  // In development, just log that we're ready to receive real WebSocket events
  if (isDev) {
    logger.log('ActivePlayersPanel ready - waiting for real WebSocket events...');
    logger.log('My client ID:', authStore.getClientId);
    logger.log('Watching game ID:', gameId);
    logger.log('WebSocket connected:', websocketService.getConnectionStatus());
  }
});

onUnmounted(() => {
  // Clean up websocket listeners
  const socket = websocketService.getSocket();
  if (socket) {
    socket.off('session_started');
    socket.off('session_ended');
    socket.off('active_sessions_updated');
    socket.off('client_sessions_stopped');
  }
});
</script>

<template>
  <div class="bg-base-200 rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
          />
        </svg>
        Other Players
      </h3>
      <div class="badge badge-primary">{{ otherPlayersInGame.length }}</div>
    </div>

    <div v-if="otherPlayersInGame.length === 0" class="text-center py-8 text-base-content/60">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-12 w-12 mx-auto mb-2 opacity-50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.196-2.121L16.5 16.5l.5-.5A3 3 0 0115 13h-2m-3.5-1.5l.5-.5a3 3 0 11-4.243-4.243l.5.5L7 6a3 3 0 015.196 2.121L17 20z"
        />
      </svg>
      <p class="text-sm">No other players are currently playing this game</p>
      <p class="text-xs mt-1 opacity-75">Players will appear here when they start playing</p>
    </div>

    <div v-else class="space-y-3">
      <TransitionGroup name="player" tag="div">
        <div
          v-for="player in otherPlayersInGame"
          :key="player.clientId"
          class="flex items-center gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-all duration-200"
        >
          <!-- Avatar -->
          <div class="avatar">
            <div class="w-10 h-10 rounded-full">
              <img
                v-if="getAvatarUrl(player.user)"
                :src="getAvatarUrl(player.user)!"
                :alt="player.user?.name || 'Player'"
                class="w-full h-full object-cover rounded-full"
              />
              <div
                v-else
                :class="getPlayerColor(player.clientId)"
                class="w-full h-full text-white flex items-center justify-center text-sm font-medium"
              >
                {{ getUserInitials(player) }}
              </div>
            </div>
          </div>

          <!-- Player Info -->
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">
              {{ player.user?.name || 'Anonymous Player' }}
            </div>
            <div class="text-xs text-base-content/60">
              Playing for {{ getTimeSinceStart(player.startTime) }}
            </div>
          </div>

          <!-- Status indicator -->
          <div class="flex items-center gap-1">
            <div
              :class="player.isActive === 1 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'"
              class="w-2 h-2 rounded-full"
            ></div>
            <span class="text-xs text-base-content/60">
              {{ player.isActive === 1 ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Manual refresh button (development only) -->
    <div v-if="isDev" class="mt-4 text-center">
      <button
        class="btn btn-ghost btn-sm"
        :disabled="!websocketService.getConnectionStatus()"
        @click="requestActiveSessions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh Players (Debug)
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Player list transitions */
.player-enter-active,
.player-leave-active {
  transition: all 0.3s ease;
}

.player-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.player-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.player-move {
  transition: transform 0.3s ease;
}

/* Custom scrollbar */
.space-y-3 {
  max-height: 300px;
  overflow-y: auto;
}

.space-y-3::-webkit-scrollbar {
  width: 4px;
}

.space-y-3::-webkit-scrollbar-track {
  background: transparent;
}

.space-y-3::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.space-y-3::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
