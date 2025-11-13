<script lang="ts" setup>
import { onMounted, onUnmounted, useTemplateRef, computed } from 'vue';
import { useGameStore } from '../stores/useGameStore.js';
import { useRunningStore } from '../stores/useRunning.js';
import { faCog } from '@fortawesome/free-solid-svg-icons';

const actionBarPanel = useTemplateRef<HTMLElement>('actionBarPanel');
const gameStore = useGameStore();
const runningStore = useRunningStore();
const height = 72;

const isInstalled = computed(() => {
  return gameStore.selectedGame?.isInstalled ?? false;
});

const isloading = computed(() => {
  return gameStore.loading ?? false;
});

const isIngame = computed(() => {
  const game = gameStore.selectedGame;
  if (!game) return false;

  // Collect all executables to check
  const executablesToCheck: string[] = [];

  // Add executables from the executables array if present
  if (game.executables && game.executables.length > 0) {
    executablesToCheck.push(...game.executables);
  }

  // Also add the main executable field for backward compatibility
  if (game.executable) {
    executablesToCheck.push(game.executable);
  }

  if (executablesToCheck.length === 0) return false;

  // Check if any of the executables are running
  return runningStore.isAnyRunning(executablesToCheck);
});

onMounted(() => {
  if (actionBarPanel.value) {
    actionBarPanel.value.closest('.parallax')?.addEventListener('scroll', updateShadow);
  }
});

onUnmounted(() => {
  if (actionBarPanel.value) {
    actionBarPanel.value.closest('.parallax')?.removeEventListener('scroll', updateShadow);
  }
});

function updateShadow() {
  if (actionBarPanel.value) {
    const t = actionBarPanel.value.getBoundingClientRect();
    if (t.y == height) {
      actionBarPanel.value.classList.add('shadow-md');
    } else {
      actionBarPanel.value.classList.remove('shadow-md');
    }
  }
}
</script>

<template>
  <div
    ref="actionBarPanel"
    class="flex flex-row gap-4 border-2 border-base-200 p-4 justify-between items-center sticky top-0 z-10"
  >
    <div v-if="gameStore.selectedGame?.type === 'archive'" class="flex gap-2 items-center w-full">
      <div class="flex gap-2 flex-1">
        <template v-if="!isInstalled">
          <button
            class="btn btn-primary w-24"
            @click="gameStore.installArchive"
            :disabled="isloading || isIngame"
          >
            Install
          </button>
        </template>
        <template v-else>
          <button class="btn btn-warning" @click="gameStore.play" :disabled="isloading || isIngame">
            Play
          </button>
        </template>
      </div>
      <template v-if="isInstalled">
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost btn-xs p-1"
            ><FontAwesomeIcon :icon="faCog" class="text-lg"
          /></label>
          <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
            <li>
              <a @click="gameStore.openFileLocation">Open File location</a>
            </li>
            <li>
              <a @click="gameStore.uninstallArchive()">Uninstall</a>
            </li>
          </ul>
        </div>
      </template>
    </div>
    <div v-else>
      <button class="btn btn-warning" @click="gameStore.play">
        <template v-if="gameStore.selectedGame?.type === 'shortcut'"> Launch </template>
        <template v-else> Launch in {{ gameStore.selectedGame?.type }} </template>
      </button>
    </div>
  </div>
</template>
