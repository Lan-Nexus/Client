import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useServerAddressStore } from './useServerAddress.js';
import Logger from '../utils/logger.js';

const logger = Logger('branding');

// Debug logging
console.log('🎨 Branding store module loaded');

export const useBrandingStore = defineStore('branding', () => {
  const lanName = ref<string>('LAN Nexus');
  const logoUrl = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const lastFetch = ref<number | null>(null);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  /**
   * Fetch branding from server
   */
  async function fetchBranding(): Promise<void> {
    // Check if we have a recent cache
    if (lastFetch.value && Date.now() - lastFetch.value < CACHE_DURATION) {
      const cacheAge = Math.round((Date.now() - lastFetch.value) / 1000);
      logger.log(
        `⏱️ Using cached branding data (age: ${cacheAge}s / ${CACHE_DURATION / 1000}s max)`
      );
      console.log('🎨 CACHE: Using cached branding', {
        lanName: lanName.value,
        logoUrl: logoUrl.value,
        cacheAge,
      });
      return;
    }

    const serverAddressStore = useServerAddressStore();
    const serverAddress = serverAddressStore.serverAddress;

    if (!serverAddress) {
      logger.warn('No server address available, using default branding');
      return;
    }

    isLoading.value = true;

    try {
      logger.log('🔄 Fetching branding from:', `${serverAddress}/api/settings/branding`);
      const response = await fetch(`${serverAddress}/api/settings/branding`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.log('📦 Branding data received:', data);

      lanName.value = data.lan_name || 'LAN Nexus';
      // Add cache-busting timestamp to prevent browser image caching
      logoUrl.value = data.logo_url ? `${serverAddress}${data.logo_url}?t=${Date.now()}` : null;
      lastFetch.value = Date.now();

      logger.log('✅ Branding applied:', { lanName: lanName.value, logoUrl: logoUrl.value });
      console.log('🎨 BRANDING UPDATE:', { lanName: lanName.value, logoUrl: logoUrl.value });
    } catch (error) {
      logger.error('❌ Failed to fetch branding:', error);
      console.error('🎨 BRANDING ERROR:', error);
      // Keep existing values or defaults on error
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Force refresh branding from server (bypasses cache)
   */
  async function refreshBranding(): Promise<void> {
    lastFetch.value = null;
    logger.log('🔄 Force refreshing branding (cache bypassed)');
    await fetchBranding();
  }

  /**
   * Reset to default branding
   */
  function resetBranding(): void {
    lanName.value = 'LAN Nexus';
    logoUrl.value = null;
    lastFetch.value = null;
  }

  return {
    lanName,
    logoUrl,
    isLoading,
    fetchBranding,
    refreshBranding,
    resetBranding,
  };
});
