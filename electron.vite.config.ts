import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'electron/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts'),
          island: resolve(__dirname, 'electron/preload/island.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          island: resolve(__dirname, 'island.html'),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@apps': resolve(__dirname, 'src/apps'),
        '@features': resolve(__dirname, 'src/features'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@modules': resolve(__dirname, 'src/modules'),
        '@config': resolve(__dirname, 'config'),
      },
    },
  },
})
