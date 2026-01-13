export interface AxoraAPI {
  window: {
    openHub: () => void
    closeHub: () => void
    toggleHub: () => void
    minimize: () => void
    maximize: () => void
    close: () => void
    setIgnoreMouse: (ignore: boolean) => void
  }

  phivision: {
    trigger: () => Promise<{ success: boolean }>
    capture: () => Promise<{ success: boolean; imageData: string | null }>
    analyze: (imageData: string) => Promise<{ success: boolean; result: unknown }>
    close: () => void
    onResult: (callback: (result: unknown) => void) => () => void
    onStatusChange: (callback: (status: string) => void) => () => void
  }

  ai: {
    sendMessage: (message: string, conversationId?: string) => Promise<{ success: boolean }>
    getProviders: () => Promise<string[]>
    setProvider: (provider: string) => Promise<void>
    cancel: () => void
    onStreamChunk: (callback: (chunk: string) => void) => () => void
    onStreamEnd: (callback: () => void) => () => void
  }

  auth: {
    login: (email: string, password: string) => Promise<unknown>
    logout: () => Promise<void>
    register: (email: string, password: string) => Promise<unknown>
    getSession: () => Promise<unknown>
    onSessionChange: (callback: (session: unknown) => void) => () => void
  }

  platform: NodeJS.Platform
}

export interface IslandAPI {
  window: {
    openHub: () => void
    toggleHub: () => void
    setIgnoreMouse: (ignore: boolean) => void
  }

  phivision: {
    trigger: () => Promise<{ success: boolean }>
    close: () => void
    onStatusChange: (callback: (status: string) => void) => () => void
    onResult: (callback: (result: unknown) => void) => () => void
  }

  platform: NodeJS.Platform
}

declare global {
  interface Window {
    axora: AxoraAPI | IslandAPI
  }
}

export {}
