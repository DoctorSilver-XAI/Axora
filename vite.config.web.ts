import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Configuration Vite pour le mode WEB (sans Electron)
 *
 * Usage:
 *   npm run dev:web   → Serveur de dev sur http://localhost:5173
 *   npm run build:web → Build statique dans dist-web/
 *
 * Limitations en mode web:
 *   - Pas de capture d'écran automatique (PhiVision → upload manuel)
 *   - Pas de conversations locales SQLite (cloud uniquement)
 *   - Pas de Dynamic Island
 *   - Pas de raccourcis globaux
 */
export default defineConfig({
  plugins: [react()],

  root: '.',

  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'web.html'),
      },
    },
  },

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

  server: {
    port: 5173,
    open: true,
  },

  define: {
    // Flag pour détecter le mode web dans le code
    'import.meta.env.VITE_WEB_MODE': JSON.stringify('true'),
  },
})
