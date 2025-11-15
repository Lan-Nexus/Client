<script setup lang="ts">
import Progress from './components/Progress.vue';
import TopNav from './components/TopNav.vue';
import { useServerAddressStore } from './stores/useServerAddress.js';
import { useAuthStore } from './stores/useAuthStore.js';
import ServerDiscoveryView from './views/ServerDiscoveryView.vue';
import { onMounted, onUnmounted, ref } from 'vue';
import Alert from './components/Alert.vue';
import { useProgressStore } from './stores/useProgress';
import { useRunningStore } from './stores/useRunning';
import { useGameStore } from './stores/useGameStore';
import { useAvatarStore } from './stores/useAvatarStore';

const store = useProgressStore();
store.listenForIpcEvents();

const serverAddressStore = useServerAddressStore();

const authStore = useAuthStore();

const runningStore = useRunningStore();
runningStore.init();

const gameStore = useGameStore();
gameStore.autoRefreshGames();

// Global update state
const updateDownloaded = ref(false);
const showUpdateModal = ref(false);

// Check if there's a pending update from previous session
if (localStorage.getItem('updateDownloaded') === 'true') {
  updateDownloaded.value = true;
}

// Restart functions
function restartNow() {
  showUpdateModal.value = false;
  localStorage.removeItem('updateDownloaded');
  if (window.updaterAPI) window.updaterAPI.quitAndInstall();
}

function restartLater() {
  showUpdateModal.value = false;
  localStorage.setItem('updateDownloaded', 'true');
  updateDownloaded.value = true;
}

onMounted(async () => {
  document.addEventListener('keyup', keyHandler);

  // Set up global update event listeners
  if (window.updaterAPI) {
    window.updaterAPI.onUpdateDownloaded((info) => {
      console.log('Update downloaded globally:', info);
      updateDownloaded.value = true;
      showUpdateModal.value = true;
      localStorage.setItem('updateDownloaded', 'true');
    });
  }

  // Server discovery happens in ServerDiscoveryView
  // Once serverAddress is set, initialize the app
  const checkServerAndInitialize = async () => {
    if (serverAddressStore.serverAddress) {
      console.log('✅ Server address obtained:', serverAddressStore.serverAddress);

      // Now that we have the server address, initialize WebSocket and intervals
      console.log('🔌 Initializing WebSocket with server address:', serverAddressStore.serverAddress);
      await gameStore.initializeWebSocket();
      gameStore.setupIntervals();
      console.log('✅ WebSocket and intervals initialized successfully');

      // Initialize user after server address is available
      await authStore.initializeUser();
      const avatarStore = useAvatarStore();
      await avatarStore.getAvatarFromApi(authStore.getClientId);
      console.log('✅ User and avatar initialized');
    }
  };

  // Watch for serverAddress changes
  const unwatchServer = serverAddressStore.$subscribe((_mutation, state) => {
    if (state.serverAddress) {
      checkServerAndInitialize();
      unwatchServer(); // Unsubscribe after first initialization
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('keyup', keyHandler);
});

const newIpAddress = ref(localStorage.getItem('serverAddress') || '');
const modalRef = ref<HTMLDialogElement | null>(null);

function keyHandler(event: KeyboardEvent) {
  if (event.key === 'Escape' && event.shiftKey == true) {
    // Handle the escape key press
    modalRef.value?.showModal();
  }
}

async function addServerAddress() {
  if (newIpAddress.value) {
    if (!newIpAddress.value.startsWith('http://')) {
      newIpAddress.value = 'http://' + newIpAddress.value;
    }

    console.log('🔄 Setting new server address:', newIpAddress.value);
    await serverAddressStore.selectServer(newIpAddress.value);
    localStorage.setItem('serverAddress', newIpAddress.value);

    // Disconnect and reconnect websocket with new server address
    console.log('🔌 Reconnecting WebSocket to new server address...');
    await gameStore.reconnectWebSocket();

    // Reload games from new server
    console.log('🎮 Reloading games from new server...');
    await gameStore.loadGames();

    modalRef.value?.close();
    console.log('✅ Successfully connected to new server');
  }
}
</script>
<template>
  <!-- Show unified server discovery screen until server is selected -->
  <template v-if="serverAddressStore.serverAddress == void 0">
    <ServerDiscoveryView />
  </template>
  <!-- Show main app once server is connected -->
  <template v-else>
    <div class="flex flex-col h-full w-full overflow-hidden">
      <TopNav />
      <Alert />
      <main id="frame" class="flex h-full w-full mt-18 mb-96 bg-base-100">
        <router-view />
      </main>
      <div></div>
      <Progress />
    </div>
  </template>
  <dialog id="my_modal_1" class="modal" ref="modalRef">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Server Address</h3>
      <input
        type="text"
        v-model="newIpAddress"
        class="input input-bordered w-full max-w-xs mt-4 mb-4"
        placeholder="Enter server address"
      />
      <button @click="addServerAddress" class="btn btn-primary">Use Server Address</button>
      <div class="modal-action">
        <form method="dialog">
          <!-- if there is a button in form, it will close the modal -->
          <button class="btn">Close</button>
        </form>
      </div>
    </div>
  </dialog>

  <!-- Global Update Downloaded Modal -->
  <div v-if="showUpdateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="card w-96 bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-4 flex items-center gap-2">
          <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Update Downloaded
        </h2>
        <p class="text-base-content/80 mb-6">
          A new version has been downloaded and is ready to install. Would you like to restart now?
        </p>
        <div class="card-actions justify-end gap-2">
          <button @click="restartLater" class="btn btn-outline">
            Later
          </button>
          <button @click="restartNow" class="btn btn-primary">
            Restart Now
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
/* Works on Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}
</style>
