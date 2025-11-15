<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useServerAddressStore } from '../stores/useServerAddress';

const serverAddressStore = useServerAddressStore();
const manualIpAddress = ref('');
const discoveryInterval = ref<number | null>(null);
const isScanning = ref(false);
const hasScannedOnce = ref(false);

onMounted(() => {
  // Start continuous discovery
  startContinuousDiscovery();
});

onUnmounted(() => {
  // Clean up interval when component unmounts
  stopContinuousDiscovery();
});

async function startContinuousDiscovery() {
  // Initial scan
  await scanForServers();
  hasScannedOnce.value = true;

  // Continue scanning every 3 seconds
  discoveryInterval.value = window.setInterval(async () => {
    await scanForServers();
  }, 3000);
}

function stopContinuousDiscovery() {
  if (discoveryInterval.value) {
    clearInterval(discoveryInterval.value);
    discoveryInterval.value = null;
  }
}

async function scanForServers() {
  if (isScanning.value) return; // Don't start new scan if one is in progress

  isScanning.value = true;
  try {
    await serverAddressStore.discoverServers();
  } finally {
    isScanning.value = false;
  }
}

async function selectDiscoveredServer(address: string) {
  // User explicitly clicked - safe to connect
  console.log('🔄 User selected server:', address);

  // Stop continuous discovery
  stopContinuousDiscovery();

  await serverAddressStore.selectServer(address);
}

async function connectToManualServer() {
  if (!manualIpAddress.value) return;

  let address = manualIpAddress.value;
  if (!address.startsWith('http://') && !address.startsWith('https://')) {
    address = 'http://' + address;
  }

  console.log('🔄 User manually connecting to server:', address);

  // Stop continuous discovery
  stopContinuousDiscovery();

  await serverAddressStore.selectServer(address);
}

const displayServers = computed(() => {
  return serverAddressStore.discoveredServers.map(server => {
    try {
      const url = new URL(server.address);
      return {
        address: server.address,
        serverName: server.serverName,
        ipDisplay: `${url.hostname}${url.port ? ':' + url.port : ''}`
      };
    } catch {
      return {
        address: server.address,
        serverName: server.serverName,
        ipDisplay: server.address
      };
    }
  });
});
</script>

<template>
  <div class="flex items-center justify-center h-screen w-screen bg-base-200">
    <div class="card w-full max-w-2xl bg-base-100 shadow-xl">
      <!-- Always show server selection screen with scanning indicator -->
      <div class="card-body">
          <div class="flex items-center justify-between mb-2">
            <h2 class="card-title text-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Connect to Server
            </h2>
            <!-- Scanning indicator -->
            <div class="flex items-center gap-2 text-sm text-base-content/50">
              <span class="loading loading-spinner loading-xs"></span>
              <span>Scanning...</span>
            </div>
          </div>

          <!-- Discovered Servers -->
          <template v-if="displayServers.length > 0">
            <p class="text-base-content/70 mb-4">
              Found {{ displayServers.length }} {{ displayServers.length === 1 ? 'server' : 'servers' }}. Select one to connect:
            </p>

            <div class="space-y-2 mb-6">
              <button
                v-for="server in displayServers"
                :key="server.address"
                @click="selectDiscoveredServer(server.address)"
                class="btn btn-lg btn-outline w-full justify-start gap-4 hover:btn-primary transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <div class="flex flex-col items-start">
                  <span class="font-semibold">{{ server.serverName }}</span>
                  <span class="text-sm opacity-70">{{ server.ipDisplay }}</span>
                </div>
                <div class="ml-auto badge badge-success badge-sm">LAN</div>
              </button>
            </div>

            <div class="divider">OR</div>
          </template>

          <!-- No Servers Found Message (only show after first scan completes) -->
          <template v-else-if="hasScannedOnce">
            <div class="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>No servers found on the network.</span>
            </div>
          </template>

          <!-- Manual Entry -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Connect Manually</span>
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                v-model="manualIpAddress"
                @keyup.enter="connectToManualServer"
                class="input input-bordered flex-1"
                placeholder="192.168.1.100:3000"
              />
              <button
                @click="connectToManualServer"
                :disabled="!manualIpAddress"
                class="btn btn-primary"
              >
                Connect
              </button>
            </div>
            <label class="label">
              <span class="label-text-alt">Example: 192.168.1.100:3000</span>
            </label>
          </div>

          <!-- Security Warning -->
          <div class="alert alert-info mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="text-sm">
              <strong>Security:</strong> Only connect to servers you trust. Updates will be downloaded from the selected server.
            </div>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input:focus {
  outline: none;
}
</style>
