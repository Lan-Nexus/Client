<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useCalendarStore } from '../stores/useCalendarStore.js';
import GameHero from '../components/GameHero.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCalendarDay, faClock, faUsers, faGamepad } from '@fortawesome/free-solid-svg-icons';

const calendarStore = useCalendarStore();
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const viewMode = ref<'calendar' | 'list'>('calendar');
const currentTime = ref(new Date());

let updateInterval: NodeJS.Timeout;
let dataRefreshInterval: NodeJS.Timeout;

onMounted(() => {
  calendarStore.loadScheduledGames();
  
  // Update time-based statuses every minute (lightweight)
  updateInterval = setInterval(() => {
    currentTime.value = new Date(); // Update reactive time reference
    calendarStore.refreshTimeBasedStatus();
    
    // Update selected date to today if it's currently selected and we've crossed midnight
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate.value === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
      selectedDate.value = today;
    }
  }, 60000); // Every minute
  
  // Refresh data from server every 5 minutes
  dataRefreshInterval = setInterval(() => {
    calendarStore.loadScheduledGames();
  }, 300000); // Every 5 minutes
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval);
  }
});

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString([], { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getStatusBadge = (game: any) => {
  const now = currentTime.value;
  const start = new Date(game.startTime);
  const end = new Date(game.endTime);
  
  if (start <= now && now <= end) {
    return { class: 'badge-accent', text: 'Live' };
  } else if (start > now) {
    return { class: 'badge-primary', text: 'Upcoming' };
  } else {
    return { class: 'badge-secondary', text: 'Completed' };
  }
};

// Calendar grid logic
const currentMonth = computed(() => {
  const date = new Date(selectedDate.value);
  return date.getMonth();
});

const currentYear = computed(() => {
  const date = new Date(selectedDate.value);
  return date.getFullYear();
});

interface CalendarDay {
  date: Date;
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  games: any[];
}

const calendarDays = computed((): CalendarDay[] => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days: CalendarDay[] = [];
  const currentDate = new Date(startDate);
  const todayStr = currentTime.value.toISOString().split('T')[0]; // Use reactive current time
  
  for (let i = 0; i < 42; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const gamesForDay = calendarStore.gamesByDate[dateStr] || [];
    const isCurrentMonth = currentDate.getMonth() === month;
    const isToday = dateStr === todayStr; // Use reactive today string
    const isSelected = dateStr === selectedDate.value;
    
    days.push({
      date: new Date(currentDate),
      dateStr,
      day: currentDate.getDate() -1,
      isCurrentMonth,
      isToday,
      isSelected,
      games: gamesForDay,
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
});

const selectedDateGames = computed(() => {
  return calendarStore.gamesByDate[selectedDate.value] || [];
});

const navigateMonth = (direction: number) => {
  const date = new Date(selectedDate.value);
  date.setMonth(date.getMonth() + direction);
  selectedDate.value = date.toISOString().split('T')[0];
};

const selectDate = (dateStr: string) => {
  selectedDate.value = dateStr;
};

const getMonthName = (month: number) => {
  return new Date(0, month).toLocaleDateString([], { month: 'long' });
};
</script>

<template>
  <div class="calendar-view w-full  min-h-screen p-4 md:p-6 overflow-y-auto">
    <div class="max-w-7xl mx-auto w-full pb-10">
      <!-- Hero Section -->
      <GameHero />
      
      <!-- Calendar Header -->
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold">Game Calendar</h1>
        <div class="flex gap-2">
          <div class="join">
            <button 
              class="btn join-item btn-sm sm:btn-md"
              :class="{ 'btn-primary': viewMode === 'calendar' }"
              @click="viewMode = 'calendar'"
            >
              <FontAwesomeIcon :icon="faCalendarDay" class="mr-2" />
              Calendar
            </button>
            <button 
              class="btn join-item btn-sm sm:btn-md"
              :class="{ 'btn-primary': viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <FontAwesomeIcon :icon="faGamepad" class="mr-2" />
              List
            </button>
          </div>
        </div>
      </div>

      <div v-if="viewMode === 'calendar'" class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <!-- Calendar Grid -->
        <div class="lg:col-span-2 w-full">
          <div class="bg-base-100 rounded-lg shadow-lg p-6 w-full">
          <!-- Month Navigation -->
          <div class="flex justify-between items-center mb-4">
            <button class="btn btn-ghost btn-sm" @click="navigateMonth(-1)">
              ←
            </button>
            <h2 class="text-xl font-semibold flex-1 text-center">
              {{ getMonthName(currentMonth) }} {{ currentYear }}
            </h2>
            <button class="btn btn-ghost btn-sm" @click="navigateMonth(1)">
              →
            </button>
          </div>

          <!-- Calendar Grid -->
          <div class="calendar-grid grid grid-cols-7 gap-0 w-full border border-base-300 rounded-lg overflow-hidden">
            <!-- Day Headers -->
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" 
                 :key="day" 
                 class="text-center text-sm font-semibold p-2 text-base-content/70 bg-base-200 border-r border-base-300 last:border-r-0">
              {{ day }}
            </div>
            
            <!-- Calendar Days -->
            <div v-for="day in calendarDays" 
                 :key="day.dateStr"
                 class="calendar-day relative h-16 sm:h-20 border-r border-b border-base-300 cursor-pointer transition-all calendar-hover w-full min-w-0 last:border-r-0"
                 :class="{
                   'bg-base-200': !day.isCurrentMonth,
                   'bg-primary text-primary-content': day.isToday,
                   'bg-accent text-accent-content': day.isSelected && !day.isToday,
                   'opacity-50': !day.isCurrentMonth
                 }"
                 @click="selectDate(day.dateStr)">
              <div class="p-1 w-full h-full overflow-hidden">
                <div class="text-xs sm:text-sm font-semibold">{{ day.day }}</div>
                <div class="space-y-1 mt-1">
                  <div v-for="game in day.games.slice(0, 2)" 
                       :key="game.id"
                       class="text-xs bg-primary text-primary-content rounded px-1 py-0.5 truncate">
                    {{ game.gameName }}
                  </div>
                  <div v-if="day.games.length > 2" 
                       class="text-xs text-center text-base-content/70">
                    +{{ day.games.length - 2 }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Date Details -->
      <div class="lg:col-span-1 w-full">
        <div class="bg-base-100 rounded-lg shadow-lg p-6 w-full min-h-[400px]">
          <h3 class="text-lg font-semibold mb-4">
            {{ formatDate(selectedDate) }}
          </h3>
          
          <div v-if="selectedDateGames.length === 0" class="text-center text-base-content/70 py-8">
            <FontAwesomeIcon :icon="faCalendarDay" class="text-4xl mb-4" />
            <p>No games scheduled for this date</p>
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="game in selectedDateGames" 
                 :key="game.id"
                 class="card bg-base-200 p-4">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold">{{ game.gameName }}</h4>
                <span class="badge" :class="getStatusBadge(game).class">
                  {{ getStatusBadge(game).text }}
                </span>
              </div>
              
              <p class="text-sm text-base-content/70 mb-3">{{ game.description }}</p>
              
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <FontAwesomeIcon :icon="faClock" />
                  <span>{{ formatTime(game.startTime) }} - {{ formatTime(game.endTime) }}</span>
                </div>
                
                <div v-if="game.participants" class="flex items-center gap-2">
                  <FontAwesomeIcon :icon="faUsers" />
                  <span>{{ game.participants.length }} players</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="space-y-6 w-full">
      <!-- Upcoming Games -->
      <div class="bg-base-100 rounded-lg shadow-lg p-6 w-full">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <FontAwesomeIcon :icon="faClock" class="text-primary" />
          Upcoming Games
        </h2>
        
        <div v-if="calendarStore.upcomingGames.length === 0" class="text-center text-base-content/70 py-8 min-h-[200px] flex flex-col items-center justify-center">
          <FontAwesomeIcon :icon="faGamepad" class="text-4xl mb-4" />
          <p>No upcoming games scheduled</p>
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="game in calendarStore.upcomingGames" 
               :key="game.id"
               class="card bg-base-200 p-4 flex flex-row items-center justify-between w-full">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h4 class="font-semibold text-lg">{{ game.gameName }}</h4>
                <span class="badge badge-primary">Upcoming</span>
              </div>
              <p class="text-base-content/70 mb-2">{{ game.description }}</p>
              <div class="flex items-center gap-4 text-sm">
                <span class="font-medium">{{ formatDate(game.startTime) }}</span>
                <span>{{ formatTime(game.startTime) }} - {{ formatTime(game.endTime) }}</span>
                <span v-if="game.participants" class="flex items-center gap-1">
                  <FontAwesomeIcon :icon="faUsers" />
                  {{ game.participants.length }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Games -->
      <div class="bg-base-100 rounded-lg shadow-lg p-6 w-full">
        <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <FontAwesomeIcon :icon="faGamepad" class="text-secondary" />
          Recent Games
        </h2>
        
        <div v-if="calendarStore.completedGames.length === 0" class="text-center text-base-content/70 py-8 min-h-[200px] flex flex-col items-center justify-center">
          <p>No recent games found</p>
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="game in calendarStore.completedGames.slice(0, 5)" 
               :key="game.id"
               class="card bg-base-200 p-4 flex flex-row items-center justify-between opacity-75 w-full">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h4 class="font-semibold">{{ game.gameName }}</h4>
                <span class="badge badge-secondary">Completed</span>
              </div>
              <p class="text-base-content/70 mb-2">{{ game.description }}</p>
              <div class="flex items-center gap-4 text-sm">
                <span>{{ formatDate(game.startTime) }}</span>
                <span>{{ formatTime(game.startTime) }} - {{ formatTime(game.endTime) }}</span>
                <span v-if="game.participants" class="flex items-center gap-1">
                  <FontAwesomeIcon :icon="faUsers" />
                  {{ game.participants.length }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  height: auto;
  min-height: 100vh;
  /* Remove fixed height to allow natural scrolling */
}

.grid {
  width: 100%;
  min-width: 0;
  display: grid;
}

.grid > * {
  min-width: 0;
}

/* Calendar specific styling */
.calendar-grid {
  width: 100%;
  table-layout: fixed;
}

.calendar-day {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  box-sizing: border-box;
}

/* Ensure calendar days maintain consistent width */
.grid-cols-7 {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
}

.grid-cols-7 > * {
  width: 100%;
  min-width: 0;
  flex: 1;
}

/* Mobile responsiveness for calendar days */
@media (max-width: 768px) {
  .calendar-grid {
    width: 100%;
    max-width: 100%;
  }
  
  .grid-cols-7 {
    grid-template-columns: repeat(7, 1fr);
    width: 100%;
  }
  
  .calendar-day {
    height: 60px; /* Smaller height on mobile */
    font-size: 0.875rem;
    width: 100%;
    min-width: 0;
  }
  
  .calendar-view {
    padding: 1rem;
  }
  
  /* Stack calendar grid on mobile */
  .grid.grid-cols-1.lg\\:grid-cols-3 {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  /* Adjust card padding on mobile */
  .card {
    padding: 0.75rem;
  }
  
  /* Smaller text on mobile */
  .text-lg {
    font-size: 1rem;
  }
  
  .text-xl {
    font-size: 1.125rem;
  }
  
  .text-3xl {
    font-size: 1.5rem;
  }
}

/* Prevent text overflow from affecting layout */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card {
  transition: all 0.2s ease;
  width: 100%;
  min-width: 0;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* Calendar hover effect with transparent overlay */
.calendar-hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  transition: background 0.2s ease;
  pointer-events: none;
  z-index: 1;
}

.calendar-hover:hover::before {
  background: rgba(0, 0, 0, 0.5);
}

.calendar-hover > * {
  position: relative;
  z-index: 2;
}

/* Prevent flex items from shrinking below content size */
.flex-1 {
  min-width: 0;
}

/* Ensure consistent container sizing */
.bg-base-100 {
  width: 100%;
  box-sizing: border-box;
}

/* Fixed width for the entire container */
.max-w-7xl {
  width: 100%;
  max-width: 80rem;
}

/* Improve scrollable areas */
.space-y-6,
.space-y-4,
.space-y-3 {
  overflow: visible;
}

/* Ensure buttons are touch-friendly on mobile */
@media (max-width: 768px) {
  .btn {
    min-height: 44px; /* Improved touch target */
  }
  
  .btn-sm {
    min-height: 36px;
  }
}
</style>