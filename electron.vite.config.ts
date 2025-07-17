import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@runUtils': resolve('runUtils'),
        '@main': resolve('src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@runUtils': resolve('runUtils'),
        '@main': resolve('src/main'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@runUtils': resolve('runUtils'),
        '@main': resolve('src/main'),
      },
    },
    plugins: [vue(), tailwindcss(), vueDevTools()],
  },
});
