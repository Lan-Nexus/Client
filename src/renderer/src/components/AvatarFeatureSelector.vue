<template>
  <div class="form-control">
    <label class="label mb-2">
      <span class="label-text font-medium">{{ label }}</span>
    </label>
    <div class="grid grid-cols-3 sm:grid-cols-8 md:grid-cols-4 lg:grid-cols-5 gap-3">
      <div
        v-for="option in optionPreviews"
        :key="option.value"
        :title="option.label"
        class="cursor-pointer group"
        @click="handleOptionSelect(option.value)"
      >
        <div
          class="card w-15 bg-base-200 hover:bg-base-300 transition-all duration-200 group-hover:scale-105 border-2 rounded-full"
          :class="[
            {
              'border-primary ring-4 ring-primary ring-opacity-50':
                selectedValue === String(option.value),
              'border-transparent': selectedValue !== String(option.value),
            },
          ]"
        >
          <div class="card-body p-0 items-center p-0">
            <div class="avatar">
              <div class="rounded-full w-15 h-15">
                <img :src="option.previewUrl" :alt="option.label" class="rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AvatarOptions, SelectOption } from '../types/AvatarOptions';

// Define interfaces

interface OptionPreview extends SelectOption {
  previewUrl: string;
}

// Define props
interface Props {
  label: string;
  options: SelectOption[];
  selectedValue: string;
  avatarOptions: AvatarOptions;
  featureKey: string;
  generateAvatar: (options: AvatarOptions, hideElements?: string[]) => string;
}

const props = withDefaults(defineProps<Props>(), {});

// Define emits
const emit = defineEmits<{
  'update:selectedValue': [value: string];
  'update-avatar': [];
}>();

// Computed properties
const optionPreviews = computed<OptionPreview[]>(() => {
  return props.options.map((option) => ({
    ...option,
    previewUrl: props.generateAvatar({
      ...props.avatarOptions,
      [props.featureKey]: String(option.value),
    }),
  }));
});

// Methods
function handleOptionSelect(value: string): void {
  emit('update:selectedValue', value);
  emit('update-avatar');
}
</script>

<style scoped>
.card {
  transition: all 0.3s ease;
}

.avatar {
  transition: all 0.3s ease;
}

.form-control {
  margin-bottom: 0.5rem;
}
</style>
