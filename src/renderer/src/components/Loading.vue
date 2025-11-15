<script setup>
import { defineProps, computed, onMounted } from 'vue';
import { useBrandingStore } from '../stores/useBrandingStore';
import defaultLogo from '../assets/logo.svg';

const props = defineProps({
  title: {
    type: String,
    default: 'Loading...',
  },
});

const brandingStore = useBrandingStore();

// Computed logo URL
const logoToDisplay = computed(() => {
  // Explicitly access the value to ensure reactivity
  const logo = brandingStore.logoUrl;
  console.log('🖼️ Loading logoToDisplay computed:', { logo, hasLogo: !!logo });
  return logo || defaultLogo;
});

const handleLogoError = (e) => {
  console.error('🖼️ Loading logo failed to load:', logoToDisplay.value, e);
  e.target.src = defaultLogo;
};

const handleLogoLoad = () => {
  console.log('🖼️ Loading logo loaded successfully:', logoToDisplay.value);
};

onMounted(async () => {
  console.log('📥 Loading component mounted, fetching branding...');
  // Fetch branding from server
  await brandingStore.fetchBranding();
  console.log('📥 Loading branding fetched:', {
    lanName: brandingStore.lanName,
    logoUrl: brandingStore.logoUrl,
  });
});
</script>

<template>
  <div class="flex h-full w-full">
    <div class="m-auto flex flex-col items-center justify-center">
      <img
        :src="logoToDisplay"
        :alt="brandingStore.lanName + ' Logo'"
        class="h-32 pb-4"
        @error="handleLogoError"
        @load="handleLogoLoad"
      />
      <div class="loading loading-spinner text-primary loading-xl"></div>
      <div class="h-2"></div>
      <div>
        <p class="text-2xl">{{ props.title }}</p>
      </div>
    </div>
  </div>
</template>
