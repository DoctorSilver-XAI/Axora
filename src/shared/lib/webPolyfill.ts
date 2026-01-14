/**
 * Polyfill pour window.axora en mode Web
 *
 * Fournit des fallbacks gracieux pour les APIs Electron non disponibles
 * dans un navigateur standard.
 */

import type { AxoraAPI } from '@shared/types/electron.d'

const noop = () => {}
const asyncNoop = async () => {}

/**
 * Vérifie si on est en mode web (pas d'Electron)
 */
export const isWebMode = (): boolean => {
  return typeof window !== 'undefined' && !window.axora
}

/**
 * API window.axora simulée pour le mode web
 */
export const webAxoraPolyfill: AxoraAPI = {
  window: {
    openHub: noop,
    closeHub: noop,
    toggleHub: noop,
    minimize: noop,
    maximize: noop,
    close: noop,
    setIgnoreMouse: noop,
  },

  phivision: {
    trigger: async () => {
      console.warn('[Web Mode] PhiVision capture non disponible. Utilisez l\'upload manuel.')
      return { success: false }
    },
    capture: async () => {
      console.warn('[Web Mode] Capture d\'écran non disponible en mode web.')
      return { success: false, imageData: null }
    },
    analyze: async (imageData: string) => {
      // L'analyse peut fonctionner si on a une image uploadée manuellement
      console.info('[Web Mode] Analyse via API Mistral...')
      return { success: true, result: null }
    },
    getPending: async () => null,
    close: noop,
    onTrigger: () => noop,
    onResult: () => noop,
    onStatusChange: () => noop,
    onAnalysisResult: () => noop,
  },

  ai: {
    sendMessage: async () => {
      console.warn('[Web Mode] Utilisez les services AI directement (AIService).')
      return { success: false }
    },
    getProviders: async () => ['mistral', 'openai'],
    setProvider: asyncNoop,
    cancel: noop,
    onStreamChunk: () => noop,
    onStreamEnd: () => noop,
  },

  auth: {
    login: async () => {
      console.warn('[Web Mode] Utilisez AuthContext directement.')
      return null
    },
    logout: asyncNoop,
    register: async () => null,
    getSession: async () => null,
    onSessionChange: () => noop,
  },

  localConversations: {
    getAll: async () => {
      console.warn('[Web Mode] Conversations locales non disponibles. Utilisez le mode cloud.')
      return []
    },
    getById: async () => null,
    create: async () => {
      throw new Error('[Web Mode] Conversations locales non disponibles.')
    },
    updateTitle: asyncNoop,
    delete: asyncNoop,
    archive: asyncNoop,
    togglePin: asyncNoop,
    addMessage: async () => {
      throw new Error('[Web Mode] Conversations locales non disponibles.')
    },
  },

  ppp: {
    print: () => {
      // En mode web, on peut utiliser window.print()
      window.print()
    },
    captureScreen: async () => {
      console.warn('[Web Mode] Capture d\'écran non disponible.')
      return ''
    },
  },

  platform: 'linux' as NodeJS.Platform, // Valeur par défaut neutre
}

/**
 * Initialise le polyfill si on est en mode web
 * À appeler au démarrage de l'application
 */
export function initWebPolyfill(): void {
  if (isWebMode()) {
    console.info('🌐 Mode Web activé - Certaines fonctionnalités Electron sont désactivées')
    ;(window as Window & { axora: AxoraAPI }).axora = webAxoraPolyfill
  }
}
