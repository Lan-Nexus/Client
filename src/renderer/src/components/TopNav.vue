<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCog, faArrowsRotate, faGamepad, faCalendarDays, faUser } from '@fortawesome/free-solid-svg-icons';
import { computed, onMounted } from 'vue';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import { useAvatarStore } from '../stores/useAvatarStore';

import { useGameStore } from '../stores/useGameStore.js';

const gameStore = useGameStore();

// Stores
const avatarStore = useAvatarStore();

// Generate avatar from options
function generateAvatarFromOptions(options: any): string {
  try {
    const avatarConfig: any = {
      size: 48,
      backgroundColor: options.backgroundColor || ['transparent'],
      backgroundType: options.backgroundType || ['solid'],
      eyes: [options.eyes],
      eyebrows: [options.eyebrows],
      mouth: [options.mouth],
      hairType: [options.hair],
      skinColor: [options.skinColor],
      hairColor: [options.hairColor],
      
    }

    // Add optional features
    if (options.earrings && options.earrings !== 'none') {
      avatarConfig.earrings = [options.earrings]
      avatarConfig.earringsProbability = 100
    }

    if (options.glasses && options.glasses !== 'none') {
      avatarConfig.glasses = [options.glasses]
      avatarConfig.glassesProbability = 100
    }

    const avatar = createAvatar(adventurer, avatarConfig)
    return avatar.toDataUri()
  } catch (error) {
    console.error('Error generating avatar:', error)
    return ''
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

onMounted(async () => {
  // Initialize avatar store
  await avatarStore.initialize();
});
</script>
<template>
  <div
    class="flex justify-between items-center shadow-lg absolute w-full pe-4 gap-4"
  >
    <div class="flex items-center pl-6">
      <img src="../assets/logo.svg" alt="Lan Exus Logo" class="h-16" />
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

    <button class="btn btn-ghost text-neutral-content">
      <font-awesome-icon :icon="faArrowsRotate" class="text-2xl" @click="gameStore.reload" />
    </button>
    <div>
      <button
        class="btn btn-ghost text-neutral-content"
        @click="$router.push('/avatar')"
      >
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
