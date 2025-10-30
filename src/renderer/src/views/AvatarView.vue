<template>
  <div class="bg-base-200 min-h-screen overflow-auto w-full">
    <!-- Alert Component -->
    <Alert />

    <!-- Header -->
    <div class="bg-base-100 shadow-sm border-b border-base-300">
      <div class="max-w-7xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-base-content">Avatar Creator</h1>
            <p class="text-base-content/70 mt-1">Customize your avatar and express your personality</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="randomizeAll"
              class="btn btn-secondary btn-sm"
              :disabled="isLoading"
              title="Generate random avatar"
            >
              <FontAwesomeIcon :icon="faDice" class="mr-2" />
              Surprise Me
            </button>
            <button
              @click="saveAvatar"
              class="btn btn-primary"
              :disabled="isSaving || !username.trim()"
            >
              <span v-if="isSaving" class="loading loading-spinner loading-sm mr-2"></span>
              <FontAwesomeIcon v-else :icon="faSave" class="mr-2" />
              {{ isSaving ? 'Saving...' : 'Save Avatar' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">

        <!-- Left Column: Avatar Preview & Identity -->
        <div class="xl:col-span-1">
          <div class="sticky top-8 space-y-6">

            <!-- Avatar Preview Card -->
            <div class="card bg-base-100 shadow-lg">
              <div class="card-body items-center text-center">
                <h2 class="card-title text-lg mb-4">Your Avatar</h2>

                <!-- Large Avatar Preview -->
                <div class="relative mb-6">
                  <div class="avatar">
                    <div class="w-48 h-48 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 shadow-2xl">
                      <img :src="currentAvatarUrl" alt="Your Avatar" class="rounded-full" />
                    </div>
                  </div>
                  <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-base-100/80 rounded-full">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                </div>

                <!-- Username Input -->
                <div class="w-full">
                  <label class="label">
                    <span class="label-text font-medium">Display Name</span>
                  </label>
                  <input
                    v-model="username"
                    type="text"
                    placeholder="Enter your display name"
                    class="input input-bordered w-full text-center"
                    :class="{ 'input-error': usernameError }"
                    maxlength="50"
                    @blur="validateUsernameInput"
                    @input="clearUsernameError"
                  />
                  <div v-if="usernameError" class="label">
                    <span class="label-text-alt text-error">{{ usernameError }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="stats shadow bg-base-100 w-full">
              <div class="stat">
                <div class="stat-title">Customization</div>
                <div class="stat-value text-sm">{{ customizationPercentage }}%</div>
                <div class="stat-desc">From default</div>
              </div>
              <div class="stat">
                <div class="stat-title">Style</div>
                <div class="stat-value text-sm">{{ currentStyle }}</div>
                <div class="stat-desc">Character type</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Customization Options -->
        <div class="xl:col-span-2">
          <div class="card bg-base-100 shadow-lg">
            <div class="card-body">

              <!-- Tabs -->
              <div class="tabs tabs-boxed mb-6">
                <button
                  class="tab"
                  :class="{ 'tab-active': activeTab === 'presets' }"
                  @click="activeTab = 'presets'"
                >
                  <FontAwesomeIcon :icon="faUsers" class="mr-2" />
                  Character Presets
                </button>
                <button
                  class="tab"
                  :class="{ 'tab-active': activeTab === 'customize' }"
                  @click="activeTab = 'customize'"
                >
                  <FontAwesomeIcon :icon="faCog" class="mr-2" />
                  Customize
                </button>
              </div>

              <!-- Presets Tab -->
              <div v-show="activeTab === 'presets'" class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold mb-3">Choose a Starting Point</h3>
                  <p class="text-base-content/70 mb-6">Select a character preset and then customize to your liking</p>

                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div
                      v-for="preset in presetCharacters"
                      :key="preset.name"
                      class="preset-card cursor-pointer group"
                      @click="loadPreset(preset)"
                      :title="`Load ${preset.name} preset`"
                    >
                      <div class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg">
                        <div class="card-body p-3 items-center">
                          <div class="avatar mb-2">
                            <div class="w-16 h-16 rounded-full ring ring-base-300 group-hover:ring-primary transition-all duration-200">
                              <img :src="getPresetUrl(preset)" :alt="preset.name" class="rounded-full" />
                            </div>
                          </div>
                          <h4 class="text-sm font-medium text-center">{{ preset.name }}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Customize Tab -->
              <div v-show="activeTab === 'customize'" class="space-y-8">

                <!-- Face Section -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon :icon="faEye" class="text-primary" />
                    <h3 class="text-lg font-semibold">Facial Features</h3>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Eyes -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Eyes Style</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="eye in eyePreviews"
                          :key="eye.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.eyes = eye.value; updateAvatar()"
                          :title="eye.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.eyes === eye.value, 'border-transparent': avatarOptions.eyes !== eye.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="eye.previewUrl" :alt="eye.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Eyebrows -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Eyebrows</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="eyebrow in eyebrowPreviews"
                          :key="eyebrow.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.eyebrows = eyebrow.value; updateAvatar()"
                          :title="eyebrow.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.eyebrows === eyebrow.value, 'border-transparent': avatarOptions.eyebrows !== eyebrow.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="eyebrow.previewUrl" :alt="eyebrow.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Mouth -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Mouth Expression</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="mouth in mouthPreviews"
                          :key="mouth.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.mouth = mouth.value; updateAvatar()"
                          :title="mouth.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.mouth === mouth.value, 'border-transparent': avatarOptions.mouth !== mouth.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="mouth.previewUrl" :alt="mouth.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Skin Color -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Skin Tone</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="skin in skinColorPreviews"
                          :key="skin.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.skinColor = skin.value; updateAvatar()"
                          :title="skin.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.skinColor === skin.value, 'border-transparent': avatarOptions.skinColor !== skin.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="skin.previewUrl" :alt="skin.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Hair Section -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon :icon="faCut" class="text-primary" />
                    <h3 class="text-lg font-semibold">Hair & Style</h3>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Hairstyle -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Hairstyle</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="hair in hairPreviews"
                          :key="hair.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.hair = hair.value; updateAvatar()"
                          :title="hair.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.hair === hair.value, 'border-transparent': avatarOptions.hair !== hair.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="hair.previewUrl" :alt="hair.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Hair Color -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Hair Color</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="hairColor in hairColorPreviews"
                          :key="hairColor.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.hairColor = hairColor.value; updateAvatar()"
                          :title="hairColor.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.hairColor === hairColor.value, 'border-transparent': avatarOptions.hairColor !== hairColor.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="hairColor.previewUrl" :alt="hairColor.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Accessories Section -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon :icon="faGem" class="text-primary" />
                    <h3 class="text-lg font-semibold">Accessories</h3>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Glasses -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Glasses</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="glasses in glassesPreviews"
                          :key="glasses.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.glasses = glasses.value; updateAvatar()"
                          :title="glasses.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.glasses === glasses.value, 'border-transparent': avatarOptions.glasses !== glasses.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="glasses.previewUrl" :alt="glasses.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Earrings -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Earrings</span>
                      </label>
                      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-2">
                        <div
                          v-for="earring in earringPreviews"
                          :key="earring.value"
                          class="cursor-pointer group"
                          @click="avatarOptions.earrings = earring.value; updateAvatar()"
                          :title="earring.label"
                        >
                          <div
                            class="card bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2"
                            :class="{ 'border-primary ring-2 ring-primary ring-opacity-50': avatarOptions.earrings === earring.value, 'border-transparent': avatarOptions.earrings !== earring.value }"
                          >
                            <div class="card-body p-1 items-center">
                              <div class="avatar">
                                <div class="w-16 h-16 rounded-full">
                                  <img :src="earring.previewUrl" :alt="earring.label" class="rounded-full" />
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Quick Actions -->
                <div class="divider">Quick Actions</div>
                <div class="flex flex-wrap gap-3">
                  <button @click="randomizeFace" class="btn btn-outline btn-sm">
                    <FontAwesomeIcon :icon="faEye" class="mr-2" />
                    Random Face
                  </button>
                  <button @click="randomizeHair" class="btn btn-outline btn-sm">
                    <FontAwesomeIcon :icon="faCut" class="mr-2" />
                    Random Hair
                  </button>
                  <button @click="randomizeAccessories" class="btn btn-outline btn-sm">
                    <FontAwesomeIcon :icon="faGem" class="mr-2" />
                    Random Accessories
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-32"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faDice,
  faSave,
  faCog,
  faUsers,
  faEye,
  faCut,
  faGem
} from '@fortawesome/free-solid-svg-icons'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import { useAvatarStore } from '../stores/useAvatarStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useServerAddressStore } from '../stores/useServerAddress'
import { useAlerts } from '../stores/useAlerts'
import { updateUser, createUser } from '../utils/api'
import Alert from '../components/Alert.vue'

// Interfaces
interface SavedAvatar {
  username: string
  options: AvatarOptions
  timestamp: number
}

interface AvatarOptions {
  eyes: string
  eyebrows: string
  mouth: string
  glasses: string
  earrings: string
  hair: string
  skinColor: string
  hairColor: string
  backgroundColor?: string[]
  backgroundType?: string[]
}

interface PresetCharacter {
  name: string
  options: AvatarOptions
}

interface SelectOption {
  value: string | number
  label: string
}

// Stores and router
const router = useRouter()
const avatarStore = useAvatarStore()
const authStore = useAuthStore()
const serverAddressStore = useServerAddressStore()
const alerts = useAlerts()

// Reactive state
const activeTab = ref('presets')
const username = ref('')
const avatarOptions = ref<AvatarOptions>({
  eyes: 'variant01',
  eyebrows: 'variant01',
  mouth: 'variant01',
  glasses: 'none',
  earrings: 'none',
  hair: 'long01',
  skinColor: 'fdbcb4',
  hairColor: '724133',
  backgroundColor: ['transparent'],
  backgroundType: ['solid']
})

const savedAvatar = ref<SavedAvatar | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const usernameError = ref('')

// Default avatar for comparison
const defaultAvatarOptions: AvatarOptions = {
  eyes: 'variant01',
  eyebrows: 'variant01',
  mouth: 'variant01',
  glasses: 'none',
  earrings: 'none',
  hair: 'long01',
  skinColor: 'fdbcb4',
  hairColor: '724133',
  backgroundColor: ['transparent'],
  backgroundType: ['solid']
}

// Improved option labels
const eyesOptions: SelectOption[] = [
  { value: 'variant01', label: 'Natural' },
  { value: 'variant02', label: 'Bright' },
  { value: 'variant03', label: 'Gentle' },
  { value: 'variant04', label: 'Focused' },
  { value: 'variant05', label: 'Dreamy' },
  { value: 'variant06', label: 'Alert' },
  { value: 'variant07', label: 'Mysterious' },
  { value: 'variant08', label: 'Friendly' },
  { value: 'variant09', label: 'Intense' },
  { value: 'variant10', label: 'Playful' },
  { value: 'variant11', label: 'Wise' },
  { value: 'variant12', label: 'Curious' },
  { value: 'variant13', label: 'Determined' },
  { value: 'variant14', label: 'Calm' },
  { value: 'variant15', label: 'Energetic' },
  { value: 'variant16', label: 'Thoughtful' },
  { value: 'variant17', label: 'Bold' },
  { value: 'variant18', label: 'Serene' },
  { value: 'variant19', label: 'Adventurous' },
  { value: 'variant20', label: 'Confident' }
]

const eyebrowsOptions: SelectOption[] = [
  { value: 'variant01', label: 'Natural' },
  { value: 'variant02', label: 'Arched' },
  { value: 'variant03', label: 'Straight' },
  { value: 'variant04', label: 'Thick' },
  { value: 'variant05', label: 'Thin' },
  { value: 'variant06', label: 'Angular' },
  { value: 'variant07', label: 'Soft' },
  { value: 'variant08', label: 'Raised' },
  { value: 'variant09', label: 'Furrowed' },
  { value: 'variant10', label: 'Expressive' },
  { value: 'variant11', label: 'Subtle' },
  { value: 'variant12', label: 'Defined' },
  { value: 'variant13', label: 'Relaxed' },
  { value: 'variant14', label: 'Dramatic' },
  { value: 'variant15', label: 'Balanced' }
]

const mouthOptions: SelectOption[] = [
  { value: 'variant01', label: 'Neutral' },
  { value: 'variant02', label: 'Smile' },
  { value: 'variant03', label: 'Grin' },
  { value: 'variant04', label: 'Smirk' },
  { value: 'variant05', label: 'Open' },
  { value: 'variant06', label: 'Slight Smile' },
  { value: 'variant07', label: 'Closed' },
  { value: 'variant08', label: 'Thoughtful' },
  { value: 'variant09', label: 'Playful' },
  { value: 'variant10', label: 'Serious' },
  { value: 'variant11', label: 'Happy' },
  { value: 'variant12', label: 'Calm' },
  { value: 'variant13', label: 'Surprised' },
  { value: 'variant14', label: 'Confident' },
  { value: 'variant15', label: 'Friendly' },
  { value: 'variant16', label: 'Mysterious' },
  { value: 'variant17', label: 'Cheerful' },
  { value: 'variant18', label: 'Determined' },
  { value: 'variant19', label: 'Wise' },
  { value: 'variant20', label: 'Bold' }
]

const hairOptions: SelectOption[] = [
  { value: 'long01', label: 'Long Wavy' },
  { value: 'long02', label: 'Long Straight' },
  { value: 'long03', label: 'Long Curly' },
  { value: 'long04', label: 'Long Layered' },
  { value: 'long05', label: 'Long Flowing' },
  { value: 'long06', label: 'Long Side Part' },
  { value: 'long07', label: 'Long Braided' },
  { value: 'long08', label: 'Long Textured' },
  { value: 'long09', label: 'Long Elegant' },
  { value: 'long10', label: 'Long Wild' },
  { value: 'long11', label: 'Long Sleek' },
  { value: 'long12', label: 'Long Voluminous' },
  { value: 'long13', label: 'Long Casual' },
  { value: 'long14', label: 'Long Formal' },
  { value: 'long15', label: 'Long Bohemian' },
  { value: 'long16', label: 'Long Classic' },
  { value: 'long17', label: 'Long Modern' },
  { value: 'long18', label: 'Long Mystical' },
  { value: 'long19', label: 'Long Romantic' },
  { value: 'long20', label: 'Long Dramatic' },
  { value: 'long21', label: 'Long Artistic' },
  { value: 'long22', label: 'Long Natural' },
  { value: 'long23', label: 'Long Styled' },
  { value: 'long24', label: 'Long Fierce' },
  { value: 'long25', label: 'Long Graceful' },
  { value: 'long26', label: 'Long Unique' },
  { value: 'short01', label: 'Short Pixie' },
  { value: 'short02', label: 'Short Bob' },
  { value: 'short03', label: 'Short Crop' },
  { value: 'short04', label: 'Short Spiky' },
  { value: 'short05', label: 'Short Messy' },
  { value: 'short06', label: 'Short Neat' },
  { value: 'short07', label: 'Short Edgy' },
  { value: 'short08', label: 'Short Classic' },
  { value: 'short09', label: 'Short Modern' },
  { value: 'short10', label: 'Short Trendy' },
  { value: 'short11', label: 'Short Textured' },
  { value: 'short12', label: 'Short Layered' },
  { value: 'short13', label: 'Short Sleek' },
  { value: 'short14', label: 'Short Casual' },
  { value: 'short15', label: 'Short Professional' },
  { value: 'short16', label: 'Short Artistic' },
  { value: 'short17', label: 'Short Bold' },
  { value: 'short18', label: 'Short Chic' },
  { value: 'short19', label: 'Short Stylish' }
]

const skinColorOptions: SelectOption[] = [
  { value: 'fdbcb4', label: 'Fair' },
  { value: 'edb98a', label: 'Light' },
  { value: 'd08b5b', label: 'Medium' },
  { value: 'ae5d29', label: 'Olive' },
  { value: '8d5524', label: 'Tan' },
  { value: '6f4518', label: 'Rich' },
  { value: '4e2906', label: 'Deep' },
  { value: '2d1b05', label: 'Dark' },
  { value: 'ffb3ba', label: 'Rosy Pink' },
  { value: 'ff9999', label: 'Coral Pink' },
  { value: 'ff6b6b', label: 'Warm Pink' },
  { value: 'a8e6cf', label: 'Mint Green' },
  { value: '88d8c0', label: 'Seafoam' },
  { value: '4ecdc4', label: 'Turquoise' },
  { value: '45b7d1', label: 'Sky Blue' },
  { value: '96ceb4', label: 'Sage Green' },
  { value: 'b4a7d6', label: 'Lavender' },
  { value: '9b87d1', label: 'Purple' },
  { value: 'd4a574', label: 'Golden' },
  { value: 'f9ca24', label: 'Sunshine' },
  { value: 'f0932b', label: 'Amber' },
  { value: 'eb4d4b', label: 'Crimson' },
  { value: '6c5ce7', label: 'Royal Purple' },
  { value: '74b9ff', label: 'Electric Blue' },
  { value: '00b894', label: 'Emerald' },
  { value: 'fd79a8', label: 'Bubblegum' },
  { value: 'fdcb6e', label: 'Peach' },
  { value: 'e17055', label: 'Terra Cotta' },
  { value: '81ecec', label: 'Cyan' },
  { value: 'a29bfe', label: 'Periwinkle' }
]

const hairColorOptions: SelectOption[] = [
  { value: '0e0e0e', label: 'Jet Black' },
  { value: '724133', label: 'Dark Brown' },
  { value: 'a55728', label: 'Chestnut' },
  { value: 'd6b370', label: 'Light Brown' },
  { value: 'e6c200', label: 'Golden Blonde' },
  { value: 'f59797', label: 'Strawberry' },
  { value: 'ff5722', label: 'Auburn' },
  { value: 'd32f2f', label: 'Copper Red' },
  { value: 'ad1457', label: 'Deep Red' },
  { value: '757575', label: 'Steel Gray' },
  { value: 'e0e0e0', label: 'Silver' },
  { value: 'ffffff', label: 'Platinum' }
]

const earringsOptions: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'variant01', label: 'Simple Studs' },
  { value: 'variant02', label: 'Small Hoops' },
  { value: 'variant03', label: 'Dangling' },
  { value: 'variant04', label: 'Elegant Drops' },
  { value: 'variant05', label: 'Statement' },
  { value: 'variant06', label: 'Classic Pearls' }
]

const glassesOptions: SelectOption[] = [
  { value: 'none', label: 'No Glasses' },
  { value: 'variant01', label: 'Reading Glasses' },
  { value: 'variant02', label: 'Round Frame' },
  { value: 'variant03', label: 'Square Frame' },
  { value: 'variant04', label: 'Cat Eye' },
  { value: 'variant05', label: 'Aviator Style' }
]

// Preset characters
const presetCharacters: PresetCharacter[] = [
  {
    name: 'Aragorn',
    options: {
      eyes: 'variant04',
      eyebrows: 'variant08',
      mouth: 'variant10',
      glasses: 'none',
      earrings: 'none',
      hair: 'long05',
      skinColor: 'ae5d29',
      hairColor: '724133'
    }
  },
  {
    name: 'Legolas',
    options: {
      eyes: 'variant02',
      eyebrows: 'variant03',
      mouth: 'variant01',
      glasses: 'none',
      earrings: 'variant01',
      hair: 'long12',
      skinColor: 'fdbcb4',
      hairColor: 'e6c200'
    }
  },
  {
    name: 'Gandalf',
    options: {
      eyes: 'variant15',
      eyebrows: 'variant12',
      mouth: 'variant08',
      glasses: 'variant01',
      earrings: 'none',
      hair: 'long18',
      skinColor: 'edb98a',
      hairColor: 'e0e0e0'
    }
  },
  {
    name: 'Gimli',
    options: {
      eyes: 'variant10',
      eyebrows: 'variant15',
      mouth: 'variant05',
      glasses: 'none',
      earrings: 'variant02',
      hair: 'short08',
      skinColor: '8d5524',
      hairColor: 'd32f2f'
    }
  },
  {
    name: 'Elara',
    options: {
      eyes: 'variant07',
      eyebrows: 'variant05',
      mouth: 'variant03',
      glasses: 'none',
      earrings: 'variant03',
      hair: 'long08',
      skinColor: 'fdbcb4',
      hairColor: 'ad1457'
    }
  },
  {
    name: 'Thorin',
    options: {
      eyes: 'variant12',
      eyebrows: 'variant14',
      mouth: 'variant07',
      glasses: 'none',
      earrings: 'variant04',
      hair: 'short12',
      skinColor: 'd08b5b',
      hairColor: '0e0e0e'
    }
  },
  {
    name: 'Merlin',
    options: {
      eyes: 'variant18',
      eyebrows: 'variant11',
      mouth: 'variant12',
      glasses: 'variant02',
      earrings: 'none',
      hair: 'long20',
      skinColor: 'edb98a',
      hairColor: 'ffffff'
    }
  },
  {
    name: 'Sable',
    options: {
      eyes: 'variant06',
      eyebrows: 'variant09',
      mouth: 'variant15',
      glasses: 'variant03',
      earrings: 'variant05',
      hair: 'short16',
      skinColor: '6f4518',
      hairColor: '757575'
    }
  },
  {
    name: 'Zara',
    options: {
      eyes: 'variant14',
      eyebrows: 'variant07',
      mouth: 'variant18',
      glasses: 'none',
      earrings: 'variant06',
      hair: 'long24',
      skinColor: '4e2906',
      hairColor: 'f59797'
    }
  },
  {
    name: 'Kai',
    options: {
      eyes: 'variant20',
      eyebrows: 'variant13',
      mouth: 'variant20',
      glasses: 'variant05',
      earrings: 'none',
      hair: 'short19',
      skinColor: '2d1b05',
      hairColor: 'e6c200'
    }
  },
  {
    name: 'Luna',
    options: {
      eyes: 'variant16',
      eyebrows: 'variant06',
      mouth: 'variant14',
      glasses: 'variant04',
      earrings: 'variant02',
      hair: 'long15',
      skinColor: 'ae5d29',
      hairColor: 'ff5722'
    }
  },
  {
    name: 'Draven',
    options: {
      eyes: 'variant11',
      eyebrows: 'variant10',
      mouth: 'variant16',
      glasses: 'none',
      earrings: 'variant01',
      hair: 'short05',
      skinColor: '8d5524',
      hairColor: '0e0e0e'
    }
  }
]

// Computed properties
const currentAvatarUrl = computed(() => {
  return generateAvatar(avatarOptions.value)
})

// Generate preview images for each hair option
const hairPreviews = computed(() => {
  return hairOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      hair: option.value
    })
  }))
})

// Generate preview images for each eye option
const eyePreviews = computed(() => {
  return eyesOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      eyes: option.value
    })
  }))
})

// Generate preview images for each eyebrow option
const eyebrowPreviews = computed(() => {
  return eyebrowsOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      eyebrows: option.value
    })
  }))
})

// Generate preview images for each mouth option
const mouthPreviews = computed(() => {
  return mouthOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      mouth: option.value
    })
  }))
})

// Generate preview images for each glasses option
const glassesPreviews = computed(() => {
  return glassesOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      glasses: option.value
    })
  }))
})

// Generate preview images for each earring option
const earringPreviews = computed(() => {
  return earringsOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      earrings: option.value
    })
  }))
})

// Generate preview images for each skin color option
const skinColorPreviews = computed(() => {
  return skinColorOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      skinColor: option.value
    })
  }))
})

// Generate preview images for each hair color option
const hairColorPreviews = computed(() => {
  return hairColorOptions.map(option => ({
    ...option,
    previewUrl: generateAvatar({
      ...avatarOptions.value,
      hairColor: option.value
    })
  }))
})

const customizationPercentage = computed(() => {
  let changes = 0
  let total = 0

  for (const key in defaultAvatarOptions) {
    total++
    if (avatarOptions.value[key] !== defaultAvatarOptions[key]) {
      changes++
    }
  }

  return Math.round((changes / total) * 100)
})

const currentStyle = computed(() => {
  const hair = avatarOptions.value.hair
  if (hair.includes('long')) return 'Elegant'
  if (hair.includes('short')) return 'Modern'
  return 'Classic'
})

// Methods
function generateAvatar(options: AvatarOptions, hideElements?: string[]): string {
  try {
    if (!options || typeof options !== 'object') {
      throw new Error('Invalid avatar options provided')
    }
    const avatarConfig: any = {
      size: 128,
      eyes: [options.eyes || 'variant01'],
      eyebrows: [options.eyebrows || 'variant01'],
      mouth: [options.mouth || 'variant01'],
      hair: [options.hair || 'long01'],
      skinColor: [options.skinColor || 'fdbcb4'],
      hairColor: [options.hairColor || '724133'],
      backgroundColor: options.backgroundColor || ['transparent'],
      backgroundType: options.backgroundType || ['solid']
    }

    // Hide elements by setting their probability to 0
    if (hideElements) {
      if (hideElements.includes('eyes')) avatarConfig.eyesProbability = 0
      if (hideElements.includes('eyebrows')) avatarConfig.eyebrowsProbability = 0
      if (hideElements.includes('mouth')) avatarConfig.mouthProbability = 0
      if (hideElements.includes('hair')) {
        avatarConfig.hairProbability = 0
        avatarConfig.hairColor = ['transparent']
      }
      if (hideElements.includes('skinColor')) {
        avatarConfig.skinColor = ['transparent']
      }
    }

    if (options.earrings && options.earrings !== 'none') {
      avatarConfig.earrings = [options.earrings]
      avatarConfig.earringsProbability = 100
    } else if (hideElements?.includes('earrings')) {
      avatarConfig.earringsProbability = 0
    }

    if (options.glasses && options.glasses !== 'none') {
      avatarConfig.glasses = [options.glasses]
      avatarConfig.glassesProbability = 100
    } else if (hideElements?.includes('glasses')) {
      avatarConfig.glassesProbability = 0
    }

    const avatar = createAvatar(adventurer, avatarConfig)
    const dataUri = avatar.toDataUri()

    if (!dataUri) {
      throw new Error('Failed to generate avatar data URI')
    }

    return dataUri
  } catch (error) {
    console.error('Error generating avatar:', error)
    alerts.showError({
      title: 'Avatar Generation Error',
      description: 'Failed to generate avatar preview. Please try refreshing the page.'
    })

    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjY0IiB5PSI2NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiI+Pz88L3RleHQ+Cjwvc3ZnPgo='
  }
}

function getPresetUrl(preset: PresetCharacter): string {
  return generateAvatar(preset.options)
}

function updateAvatar(): void {
  try {
    const validation = validateAvatarOptions(avatarOptions.value)
    if (!validation.isValid) {
      console.warn('Avatar validation warning:', validation.error)
      alerts.showWarning({
        title: 'Avatar Warning',
        description: validation.error || 'Some avatar options may be invalid.'
      })
    }
  } catch (error) {
    console.error('Error updating avatar:', error)
    alerts.showError({
      title: 'Update Error',
      description: 'Failed to update avatar preview. Please try again.'
    })
  }
}

function randomizeAll(): void {
  try {
    const getRandomOption = (options: SelectOption[]) => {
      if (!options || options.length === 0) {
        throw new Error('No options available for randomization')
      }
      return options[Math.floor(Math.random() * options.length)].value
    }

    avatarOptions.value = {
      eyes: getRandomOption(eyesOptions) as string,
      eyebrows: getRandomOption(eyebrowsOptions) as string,
      mouth: getRandomOption(mouthOptions) as string,
      glasses: getRandomOption(glassesOptions) as string,
      earrings: getRandomOption(earringsOptions) as string,
      hair: getRandomOption(hairOptions) as string,
      skinColor: getRandomOption(skinColorOptions) as string,
      hairColor: getRandomOption(hairColorOptions) as string,
      backgroundColor: ['ffffff'],
      backgroundType: ['solid']
    }

    alerts.showSuccess({
      title: 'Avatar Randomized',
      description: 'Your avatar has been randomized successfully!'
    })
  } catch (error) {
    console.error('Error randomizing avatar:', error)
    alerts.showError({
      title: 'Randomization Failed',
      description: 'Failed to randomize avatar options. Please try again.'
    })
  }
}

function randomizeFace(): void {
  const getRandomOption = (options: SelectOption[]) =>
    options[Math.floor(Math.random() * options.length)].value

  avatarOptions.value.eyes = getRandomOption(eyesOptions) as string
  avatarOptions.value.eyebrows = getRandomOption(eyebrowsOptions) as string
  avatarOptions.value.mouth = getRandomOption(mouthOptions) as string
  avatarOptions.value.skinColor = getRandomOption(skinColorOptions) as string

  updateAvatar()
}

function randomizeHair(): void {
  const getRandomOption = (options: SelectOption[]) =>
    options[Math.floor(Math.random() * options.length)].value

  avatarOptions.value.hair = getRandomOption(hairOptions) as string
  avatarOptions.value.hairColor = getRandomOption(hairColorOptions) as string

  updateAvatar()
}

function randomizeAccessories(): void {
  const getRandomOption = (options: SelectOption[]) =>
    options[Math.floor(Math.random() * options.length)].value

  avatarOptions.value.glasses = getRandomOption(glassesOptions) as string
  avatarOptions.value.earrings = getRandomOption(earringsOptions) as string

  updateAvatar()
}

function loadPreset(preset: PresetCharacter): void {
  try {
    if (!preset || !preset.options) {
      throw new Error('Invalid preset character data')
    }

    avatarOptions.value = { ...preset.options }
    activeTab.value = 'customize'

    alerts.showSuccess({
      title: 'Preset Loaded',
      description: `${preset.name} preset has been applied successfully!`
    })
  } catch (error) {
    console.error('Error loading preset:', error)
    alerts.showError({
      title: 'Preset Load Failed',
      description: 'Failed to load the selected character preset. Please try again.'
    })
  }
}

// Utility functions for validation
function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Username is required' }
  }

  const trimmed = username.trim()
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters long' }
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Username must be less than 50 characters' }
  }

  const validUsernameRegex = /^[a-zA-Z0-9_\-\s]+$/
  if (!validUsernameRegex.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' }
  }

  return { isValid: true }
}

function validateUsernameInput(): void {
  const validation = validateUsername(username.value)
  if (!validation.isValid) {
    usernameError.value = validation.error || ''
  } else {
    usernameError.value = ''
  }
}

function clearUsernameError(): void {
  usernameError.value = ''
}

function validateAvatarOptions(options: AvatarOptions): { isValid: boolean; error?: string } {
  if (!options || typeof options !== 'object') {
    return { isValid: false, error: 'Invalid avatar options' }
  }

  const requiredFields = ['eyes', 'eyebrows', 'mouth', 'hair', 'skinColor', 'hairColor']
  for (const field of requiredFields) {
    if (!options[field]) {
      return { isValid: false, error: `Missing required avatar option: ${field}` }
    }
  }

  return { isValid: true }
}

async function saveAvatar(): Promise<void> {
  if (isSaving.value) return

  try {
    isSaving.value = true
    const finalUsername = username.value || authStore.getUsername
    console.log('Starting avatar save process for username:', finalUsername)

    const usernameValidation = validateUsername(finalUsername)
    if (!usernameValidation.isValid) {
      alerts.showError({
        title: 'Invalid Username',
        description: usernameValidation.error || 'Please enter a valid username before saving your avatar.'
      })
      return
    }

    const avatarValidation = validateAvatarOptions(avatarOptions.value)
    if (!avatarValidation.isValid) {
      alerts.showError({
        title: 'Invalid Avatar',
        description: avatarValidation.error || 'Your avatar configuration is invalid. Please try regenerating it.'
      })
      return
    }

    if (username.value && username.value !== authStore.getUsername) {
      try {
        authStore.setUsername(username.value)
      } catch (error) {
        console.error('Error updating username in auth store:', error)
        alerts.showError({
          title: 'Username Update Failed',
          description: 'Failed to update username. Please try again.'
        })
        return
      }
    }

    const avatarJson = {
      username: finalUsername,
      options: { ...avatarOptions.value },
      timestamp: Date.now()
    }

    const avatarData = {
      username: finalUsername,
      options: { ...avatarOptions.value },
      timestamp: Date.now()
    }

    console.log('Avatar data to save:', avatarData)

    try {
      localStorage.setItem('lan-nexus-current-avatar', JSON.stringify(avatarData))
      console.log('Avatar saved to localStorage')
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError)
      alerts.showError({
        title: 'Local Save Failed',
        description: 'Failed to save avatar locally. Your browser storage may be full.'
      })
      return
    }

    savedAvatar.value = avatarData

    try {
      avatarStore.setAvatar(finalUsername, avatarOptions.value)
      console.log('Avatar saved to store')
    } catch (storeError) {
      console.error('Error saving to avatar store:', storeError)
      alerts.showError({
        title: 'Store Save Failed',
        description: 'Failed to save avatar to application store.'
      })
      return
    }

    try {
      if (!authStore.getClientId) {
        console.log('Fetching clientId...')
        await authStore.fetchClientId()
      }
    } catch (clientIdError) {
      console.error('Error fetching client ID:', clientIdError)
      alerts.showWarning({
        title: 'Server Connection Issue',
        description: 'Avatar saved locally but could not connect to server. Your avatar will sync when connection is restored.'
      })
      return
    }

    let serverAddress
    try {
      serverAddress = await serverAddressStore.getServerAddress()
    } catch (serverAddressError) {
      console.error('Error getting server address:', serverAddressError)
      alerts.showWarning({
        title: 'Server Address Error',
        description: 'Avatar saved locally but could not get server address. Check your network settings.'
      })
      return
    }

    console.log('Server info:', {
      serverAddress,
      clientId: authStore.getClientId,
      hasServerAddress: !!serverAddress,
      hasClientId: !!authStore.getClientId
    })

    if (serverAddress && authStore.getClientId) {
      console.log('Attempting to save avatar to server...')
      try {
        await updateUser(serverAddress, authStore.getClientId, finalUsername, avatarJson.options)
        alerts.showSuccess({
          title: 'Avatar Saved Successfully',
          description: 'Your avatar has been saved both locally and to the server.'
        })

        // Navigate to game page after successful save
        router.push('/')
      } catch (serverError) {
        console.error('Server save failed:', serverError)

        const error = serverError as any
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
          alerts.showWarning({
            title: 'Network Error',
            description: 'Avatar saved locally but could not sync to server. Check your network connection.'
          })
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          alerts.showWarning({
            title: 'Connection Timeout',
            description: 'Avatar saved locally but server request timed out. Will retry automatically.'
          })
        } else if (error.response) {
          const status = error.response.status
          const data = error.response.data

          if (status === 400) {
            alerts.showError({
              title: 'Invalid Data',
              description: `Avatar data was rejected by server: ${data?.message || 'Invalid request format'}`
            })
          } else if (status === 401) {
            alerts.showError({
              title: 'Authentication Failed',
              description: 'Your session has expired. Please log in again.'
            })
          } else if (status === 403) {
            alerts.showError({
              title: 'Permission Denied',
              description: 'You do not have permission to update this avatar.'
            })
          } else if (status === 404) {
            // User not found - try to create the user
            console.log('User not found, attempting to create user...')
            try {
              await createUser(serverAddress, finalUsername, authStore.getClientId, avatarJson.options)
              alerts.showSuccess({
                title: 'User Created & Avatar Saved',
                description: 'New user account created and avatar saved successfully.'
              })
              // Navigate to game page after successful creation
              router.push('/')
            } catch (createError) {
              console.error('Failed to create user:', createError)
              alerts.showError({
                title: 'User Creation Failed',
                description: 'Could not create user account on server. Avatar saved locally.'
              })
            }
          } else if (status === 409) {
            alerts.showError({
              title: 'Conflict',
              description: 'Avatar update conflict. Another device may have updated this profile.'
            })
          } else if (status === 422) {
            alerts.showError({
              title: 'Validation Error',
              description: `Avatar validation failed: ${data?.message || 'Invalid avatar data'}`
            })
          } else if (status >= 500) {
            alerts.showWarning({
              title: 'Server Error',
              description: 'The server is experiencing issues. Avatar saved locally and will sync later.'
            })
          } else {
            alerts.showError({
              title: 'Server Error',
              description: `Server returned error ${status}: ${data?.message || 'Unknown server error'}`
            })
          }
        } else if (error.request) {
          alerts.showWarning({
            title: 'No Response',
            description: 'Avatar saved locally but no response from server. Check your connection.'
          })
        } else {
          alerts.showError({
            title: 'Unexpected Error',
            description: `Failed to save avatar to server: ${error.message || 'Unknown error occurred'}`
          })
        }
      }
    } else {
      console.warn('Could not save to server - missing data:', {
        serverAddress: !!serverAddress,
        clientId: !!authStore.getClientId
      })

      alerts.showWarning({
        title: 'Server Save Skipped',
        description: 'Avatar saved locally but server information is missing.'
      })

      // Navigate to game page even if server save failed but local save succeeded
      router.push('/')
    }

  } catch (error) {
    console.error('Error saving avatar:', error)
    const err = error as any
    alerts.showError({
      title: 'Unexpected Error',
      description: `An unexpected error occurred while saving your avatar: ${err.message || 'Unknown error'}`
    })
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  try {
    isLoading.value = true
    await avatarStore.initialize()

    try {
      username.value = authStore.getUsername || ''
    } catch (usernameError) {
      console.error('Error loading username from auth store:', usernameError)
      alerts.showWarning({
        title: 'Username Load Warning',
        description: 'Could not load saved username. You may need to enter it manually.'
      })
    }

    try {
      const savedOptions = avatarStore.getAvatarOptions
      if (savedOptions) {
        avatarOptions.value = { ...savedOptions }
        savedAvatar.value = {
          username: avatarStore.getUsername,
          options: savedOptions,
          timestamp: Date.now()
        }
      }
    } catch (avatarLoadError) {
      console.error('Error loading saved avatar options:', avatarLoadError)
      alerts.showWarning({
        title: 'Avatar Load Warning',
        description: 'Could not load your saved avatar. Starting with default options.'
      })
    }
  } catch (initError) {
    console.error('Error during component initialization:', initError)
    alerts.showError({
      title: 'Initialization Error',
      description: 'There was an error loading the avatar editor. Please refresh the page.'
    })
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.preset-card {
  transition: all 0.2s ease;
}

.preset-card:hover {
  transform: translateY(-2px);
}

.card {
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.btn {
  transition: all 0.2s ease;
}

.avatar {
  transition: all 0.3s ease;
}

.tabs {
  margin-bottom: 1.5rem;
}

.tab {
  transition: all 0.2s ease;
}

.form-control {
  margin-bottom: 0.5rem;
}

.stats {
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
}

@media (max-width: 1280px) {
  .xl\:col-span-1 {
    position: static;
  }

  .sticky {
    position: static;
  }
}
</style>
