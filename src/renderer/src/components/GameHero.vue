<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useCalendarStore } from '../stores/useCalendarStore.js';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faPlay, faClock, faUsers } from '@fortawesome/free-solid-svg-icons';

const calendarStore = useCalendarStore();

let updateInterval: NodeJS.Timeout;

onMounted(() => {
  calendarStore.loadScheduledGames();
  // Update current game status every minute
  updateInterval = setInterval(() => {
    calendarStore.updateCurrentGame();
  }, 60000);
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

const currentGame = computed(() => calendarStore.currentGame);
const nextGame = computed(() => calendarStore.upcomingGames[0]);

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString([], { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
};

const getTimeRemaining = (dateString: string) => {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  
  if (diff <= 0) return 'Now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
</script>

<template>
  <div class="hero-container mb-6">
    <!-- Current Game Hero -->
    <div v-if="currentGame" class="hero min-h-[300px] bg-gradient-to-r from-primary to-secondary rounded-lg mb-4 relative overflow-hidden">
      <div class="hero-overlay bg-opacity-60"></div>
      <div class="hero-content text-neutral-content text-center relative z-10">
        <div class="max-w-md">
          <div class="flex items-center justify-center mb-4">
            <FontAwesomeIcon :icon="faPlay" class="text-4xl mr-3 text-accent animate-pulse" />
            <span class="text-sm uppercase tracking-wide font-semibold">Live Now</span>
          </div>
          <h1 class="mb-5 text-5xl font-bold">{{ currentGame.gameName }}</h1>
          <p class="mb-5 text-lg">{{ currentGame.description }}</p>
          <div class="flex justify-center items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <FontAwesomeIcon :icon="faClock" />
              <span>{{ formatTime(currentGame.startTime) }} - {{ formatTime(currentGame.endTime) }}</span>
            </div>
            <div v-if="currentGame.participants" class="flex items-center gap-2">
              <FontAwesomeIcon :icon="faUsers" />
              <span>{{ currentGame.participants.length }} players</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent transform rotate-12 scale-150"></div>
      </div>
    </div>

    <!-- Next Game Preview -->
    <div v-else-if="nextGame" class="hero min-h-[200px] bg-base-200 rounded-lg relative overflow-hidden border-2 border-primary">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <div class="flex items-center justify-center mb-4">
            <FontAwesomeIcon :icon="faClock" class="text-2xl mr-3 text-primary" />
            <span class="text-sm uppercase tracking-wide font-semibold text-primary">Up Next</span>
          </div>
          <h1 class="mb-3 text-3xl font-bold">{{ nextGame.gameName }}</h1>
          <p class="mb-4">{{ nextGame.description }}</p>
          <div class="flex justify-center items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ formatDate(nextGame.startTime) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span>{{ formatTime(nextGame.startTime) }}</span>
            </div>
            <div class="flex items-center gap-2 text-primary font-semibold">
              <span>Starts in {{ getTimeRemaining(nextGame.startTime) }}</span>
            </div>
          </div>
          <div v-if="nextGame.participants" class="mt-3 flex items-center justify-center gap-2 text-sm">
            <FontAwesomeIcon :icon="faUsers" />
            <span>{{ nextGame.participants.length }} players registered</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No Games Scheduled -->
    <div v-else class="hero min-h-[150px] bg-base-200 rounded-lg">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="mb-5 text-2xl font-bold text-base-content">No Games Scheduled</h1>
          <p class="text-base-content/70">Check back later for upcoming gaming sessions!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-container {
  transition: all 0.3s ease;
}

.hero {
  position: relative;
  background-image: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%),
                    radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3), transparent 50%);
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(var(--p), 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(var(--p), 0.6);
  }
}

.hero:has(.animate-pulse) {
  animation: pulse-glow 2s ease-in-out infinite;
}
</style>