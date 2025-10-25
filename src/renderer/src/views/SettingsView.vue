<template>
  <div class="w-full h-full bg-base-100 p-6 pb-40 overflow-y-auto">
    <div class="w-full space-y-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-base-content mb-2">Settings</h1>
        <p class="text-base-content/70">Manage your application preferences and view system information</p>
      </div>

      <!-- User Information Section -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5.121 17.804A9 9 0 1118.879 6.196 9 9 0 015.121 17.804zM12 12a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            User Information
          </h2>

          <div class="grid lg:grid-cols-2 gap-4">
            <!-- Editable User Name -->
            <div class="bg-base-300 rounded-lg p-4">
              <div class="text-sm text-base-content/70 mb-1">User Name</div>
              <input
                v-model="authStore.username"
                @blur="updateUsername"
                type="text"
                class="input input-bordered w-full"
                placeholder="Enter your name"
              />
            </div>

            <!-- Read-only Client ID -->
            <div class="bg-base-300 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div class="text-sm text-base-content/70 mb-1">Client ID</div>
                <div class="badge badge-secondary badge-lg text-secondary-content">
                  {{ truncatedClientId }}
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline ml-2"
                @click="copyClientId"
                :title="'Copy full Client ID'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 16h8M8 12h8m-8-4h8m-12 8h.01M8 8h.01M8 4h.01M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- App Information Section -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Application Information
          </h2>

          <div class="grid lg:grid-cols-2 gap-4">
            <div class="bg-base-300 rounded-lg p-4">
              <div class="text-sm text-base-content/70 mb-1">App Version</div>
              <div class="badge badge-secondary badge-lg text-secondary-content">
                {{ appVersion || 'Loading...' }}
              </div>
            </div>

            <div class="bg-base-300 rounded-lg p-4">
              <div class="text-sm text-base-content/70 mb-2">Update Status</div>
              <div class="flex items-center gap-3 mb-3">
                <div class="badge badge-lg" :class="updateStatusBadgeClass">{{ updateStatus }}</div>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="!isCheckingForUpdates"
                  @click="checkForUpdates"
                  class="btn btn-sm btn-outline btn-primary"
                  :disabled="isCheckingForUpdates"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Check for Updates
                </button>
                <button
                  v-if="updateDownloaded"
                  @click="installUpdate"
                  class="btn btn-sm btn-success"
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Restart & Install
                </button>
              </div>

              <div v-if="downloadProgress > 0 && downloadProgress < 100" class="mt-3">
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-base-content/70">Downloading update...</span>
                  <span class="font-medium">{{ downloadProgress }}%</span>
                </div>
                <progress class="progress progress-primary w-full" :value="downloadProgress" max="100"></progress>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Information Section -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
            </svg>
            Network Information
          </h2>

          <div class="grid lg:grid-cols-2 gap-4">
            <div class="bg-base-300 rounded-lg p-4">
              <div class="text-sm text-base-content/70 mb-1">Server Address</div>
              <div class="badge badge-primary badge-lg text-primary-content">
                {{ serverAddressStore.serverAddress || 'Loading...' }}
              </div>
            </div>

            <div class="bg-base-300 rounded-lg p-4">
              <div class="text-sm text-base-content/70 mb-1">Client IP Address</div>
              <div class="badge badge-info badge-lg text-info-content">
                {{ clientIp || 'Loading...' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logger Section -->
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Logger Output
          </h2>

          <div class="bg-base-300 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm text-base-content/70">Real-time application logs</span>
              <div class="badge badge-ghost badge-sm">{{ logHistory.length }} entries</div>
            </div>

            <div class="bg-black rounded-lg p-4 font-mono text-sm overflow-auto" style="max-height: 400px;" ref="logContainer">
              <template v-if="logHistory.length">
                <div v-for="(entry, idx) in logHistory" :key="idx" class="flex gap-2 mb-1 text-green-400">
                  <span class="text-blue-400 shrink-0">[{{ new Date(entry.timestamp).toLocaleTimeString() }}]</span>
                  <span class="text-yellow-400 shrink-0 min-w-[80px]">{{ entry.type }}</span>
                  <span class="text-purple-400 shrink-0">({{ entry.logType }})</span>
                  <span class="break-all" :style="{ color: entry.color.includes('color:') ? entry.color.replace('color: ', '') : '#10b981' }">
                    {{ entry.args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') }}
                  </span>
                </div>
              </template>
              <template v-else>
                <div class="text-gray-500 italic text-center py-8">No logs yet.</div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useServerAddressStore } from '@renderer/stores/useServerAddress'
import { useAuthStore } from '@renderer/stores/useAuthStore'
import { history } from '@renderer/utils/logger'
import { getIpAddress } from '@renderer/utils/api'

const serverAddressStore = useServerAddressStore()
const authStore = useAuthStore()

const clientIp = ref('')
const logHistory = ref([])
const logContainer = ref(null)
let pollInterval = null

// Auto-updater state
const appVersion = ref('')
const isCheckingForUpdates = ref(false)
const updateAvailable = ref(false)
const updateDownloaded = ref(false)
const downloadProgress = ref(0)
const updateInfo = ref(null)
const lastUpdateCheck = ref(null)

// Computed properties
const updateStatus = computed(() => {
  if (isCheckingForUpdates.value) return 'Checking for updates...'
  if (updateDownloaded.value) return 'Update ready to install'
  if (updateAvailable.value) return 'Update available'
  if (downloadProgress.value > 0 && downloadProgress.value < 100) return 'Downloading update...'
  return 'Up to date'
})

const updateStatusBadgeClass = computed(() => {
  if (isCheckingForUpdates.value) return 'badge-warning'
  if (updateDownloaded.value) return 'badge-success'
  if (updateAvailable.value) return 'badge-info'
  if (downloadProgress.value > 0 && downloadProgress.value < 100) return 'badge-warning'
  return 'badge-success'
})
const truncatedClientId = computed(() => {
  if (!authStore.clientId) return 'Loading...'
  return authStore.clientId.length > 10
    ? authStore.clientId.slice(0, 40) + '...'
    : authStore.clientId
})

function copyClientId() {
  if (!authStore.clientId) return
  navigator.clipboard.writeText(authStore.clientId)
    .then(() => {
      alert('Client ID copied to clipboard!')
    })
    .catch(() => {
      alert('Failed to copy Client ID.')
    })
}
// Functions
async function checkForUpdates() {
  if (!window.updaterAPI) return
  isCheckingForUpdates.value = true
  try {
    await window.updaterAPI.checkForUpdates()
    lastUpdateCheck.value = new Date()
  } catch (error) {
    console.error(error)
  } finally {
    setTimeout(() => { isCheckingForUpdates.value = false }, 2000)
  }
}

function installUpdate() {
  if (window.updaterAPI) window.updaterAPI.quitAndInstall()
}

// Update username on blur
function updateUsername() {
  authStore.setUsername(authStore.username)
}

onMounted(async () => {
  // Fetch client ID
  await authStore.fetchClientId()

  // Fetch IP
  const ip = await getIpAddress(serverAddressStore.serverAddress)
  clientIp.value = ip || 'Unable to fetch IP address'

  // Get app version
  if (window.updaterAPI) {
    try { appVersion.value = await window.updaterAPI.getVersion() }
    catch { appVersion.value = 'Unknown' }

    window.updaterAPI.onUpdateAvailable((info) => { updateAvailable.value = true; updateInfo.value = info; isCheckingForUpdates.value = false })
    window.updaterAPI.onUpdateNotAvailable(() => { updateAvailable.value = false; isCheckingForUpdates.value = false })
    window.updaterAPI.onUpdateDownloaded((info) => { updateDownloaded.value = true; downloadProgress.value = 100 })
    window.updaterAPI.onDownloadProgress((progress) => { downloadProgress.value = Math.round(progress.percent) })
    window.updaterAPI.onError(() => { isCheckingForUpdates.value = false })
  } else { appVersion.value = 'Development' }

  // Poll logger
  pollInterval = setInterval(async () => {
    logHistory.value = history.length > 100 ? history.slice(-100) : history
    await nextTick()
  }, 500)
})

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>
