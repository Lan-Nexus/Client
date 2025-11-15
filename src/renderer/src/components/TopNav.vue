<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faCog,
  faArrowsRotate,
  faGamepad,
  faCalendarDays,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { computed, onMounted } from 'vue';
import { BackgroundType, createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { useAvatarStore } from '../stores/useAvatarStore';
import { useBrandingStore } from '../stores/useBrandingStore';

import { useGameStore } from '../stores/useGameStore.js';
import defaultLogo from '../assets/logo.svg';

const gameStore = useGameStore();
const brandingStore = useBrandingStore();

// Stores
const avatarStore = useAvatarStore();

// Generate avatar from options
function generateAvatarFromOptions(options): string {
  try {
    const avatarConfig: {
      size: number;
      backgroundColor: string[];
      backgroundType: BackgroundType[];
      eyes: adventurer.Options['eyes'];
      eyebrows: adventurer.Options['eyebrows'];
      mouth: adventurer.Options['mouth'];
      hair: adventurer.Options['hair'];
      skinColor: adventurer.Options['skinColor'];
      hairColor: adventurer.Options['hairColor'];
      earrings?: adventurer.Options['earrings'];
      earringsProbability?: number;
      glasses?: adventurer.Options['glasses'];
      glassesProbability?: number;
    } = {
      size: 48,
      backgroundColor: options.backgroundColor || ['transparent'],
      backgroundType: options.backgroundType || ['solid'],
      eyes: [options.eyes],
      eyebrows: [options.eyebrows],
      mouth: [options.mouth],
      hair: [options.hair],
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
    console.error('Error generating avatar:', error);
    return '';
  }
}

// Computed avatar URL
const currentAvatarUrl = computed(() => {
  const avatarOptions = avatarStore.getAvatarOptions;
  if (avatarOptions) {
    return generateAvatarFromOptions(avatarOptions);
  }
  return '';
});

// Computed logo URL
const logoToDisplay = computed(() => {
  // Explicitly access the value to ensure reactivity
  const logo = brandingStore.logoUrl;
  console.log('🖼️ TopNav logoToDisplay computed:', { logo, hasLogo: !!logo });
  return logo || defaultLogo;
});

const handleLogoError = (e: Event) => {
  console.error('🖼️ Logo failed to load:', logoToDisplay.value, e);
  (e.target as HTMLImageElement).src = defaultLogo;
};

const handleLogoLoad = () => {
  console.log('🖼️ Logo loaded successfully:', logoToDisplay.value);
};

onMounted(async () => {
  console.log('🔝 TopNav mounted, fetching branding...');
  // Initialize avatar store
  await avatarStore.initialize();
  // Fetch branding from server
  await brandingStore.fetchBranding();
  console.log('🔝 TopNav branding fetched:', {
    lanName: brandingStore.lanName,
    logoUrl: brandingStore.logoUrl,
  });
});
</script>
<template>
  <div class="flex justify-between items-center shadow-lg absolute w-full pe-4 gap-4">
    <div class="flex items-center pl-6">
      <img
        :src="logoToDisplay"
        :alt="brandingStore.lanName + ' Logo'"
        class="h-16"
        @error="handleLogoError"
        @load="handleLogoLoad"
      />
    </div>
    <div class="flex-grow"></div>
    <!-- <button
      class="btn"
      :class="{ 'btn-primary': $route.fullPath === '/' }"
      @click="$router.push('/')"
    >
      <font-awesome-icon :icon="faHome" class="text-2xl" />
    </button> -->

    <button
      class="btn"
      :class="{ 'btn-secondary': $route.fullPath === '/' }"
      @click="$router.push('/')"
    >
      <FontAwesomeIcon :icon="faGamepad" class="text-2xl" />
    </button>

    <button
      class="btn"
      :class="{ 'btn-secondary': $route.fullPath === '/calendar' }"
      @click="$router.push('/calendar')"
    >
      <FontAwesomeIcon :icon="faCalendarDays" class="text-2xl" />
    </button>

    <button
      class="btn"
      :class="{ 'btn-secondary': $route.fullPath === '/avatar' }"
      @click="$router.push('/avatar')"
    >
      <FontAwesomeIcon :icon="faUser" class="text-2xl" />
    </button>

    <button
      class="btn"
      :class="{ 'btn-secondary': $route.fullPath === '/settings' }"
      @click="$router.push('/settings')"
    >
      <FontAwesomeIcon :icon="faCog" class="text-2xl" />
    </button>
    <div class="flex-grow"></div>

    <!-- WebSocket Connection Status -->
    <div class="flex items-center gap-2 mr-4">
      <div
        :class="
          gameStore.websocketConnected
            ? 'bg-green-500'
            : gameStore.websocketReconnecting
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
        "
        class="w-2 h-2 rounded-full"
      ></div>
      <span class="text-xs text-neutral-content/80">
        {{
          gameStore.websocketConnected
            ? 'Connected'
            : gameStore.websocketReconnecting
              ? `Reconnecting (${gameStore.websocketReconnectAttempts}/10)`
              : 'Disconnected'
        }}
      </span>
    </div>

    <button class="btn btn-ghost text-neutral-content">
      <font-awesome-icon :icon="faArrowsRotate" class="text-2xl" @click="gameStore.reload" />
    </button>
    <div>
      <button class="btn btn-ghost text-neutral-content w-15 h-15" @click="$router.push('/avatar')">
        <div v-if="avatarStore.hasAvatar && currentAvatarUrl" class="avatar">
          <div class="w-12 h-12 rounded-full">
            <img :src="currentAvatarUrl" alt="Your Avatar" class="rounded-full" />
          </div>
        </div>
        <div v-else class="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
          <span class="text-xs">?</span>
        </div>
      </button>
    </div>
  </div>
</template>
