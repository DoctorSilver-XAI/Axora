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
    getPending: () => Promise<{ image: string } | null>
    close: () => void
    onTrigger: (callback: () => void) => () => void
    onResult: (callback: (result: unknown) => void) => () => void
    onStatusChange: (callback: (status: string) => void) => () => void
    onAnalysisResult: (callback: (result: unknown) => void) => () => void
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

  localConversations: {
    getAll: () => Promise<LocalConversation[]>
    getById: (id: string) => Promise<LocalConversationWithMessages | null>
    create: (provider: string, model?: string) => Promise<LocalConversation>
    updateTitle: (id: string, title: string) => Promise<void>
    delete: (id: string) => Promise<void>
    archive: (id: string) => Promise<void>
    togglePin: (id: string, isPinned: boolean) => Promise<void>
    addMessage: (
      conversationId: string,
      role: 'user' | 'assistant' | 'system',
      content: string,
      provider?: string,
      model?: string
    ) => Promise<LocalMessage>
  }

  ppp: {
    print: () => void
    captureScreen: () => Promise<string>
  }

  platform: NodeJS.Platform
}

export interface LocalConversation {
  id: string
  title: string
  provider: string
  model: string | null
  created_at: string
  updated_at: string
  is_archived: number
  is_pinned: number
}

export interface LocalMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  provider: string | null
  model: string | null
  created_at: string
}

export interface LocalConversationWithMessages extends LocalConversation {
  messages: LocalMessage[]
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
    setStatus: (status: string) => void
    broadcastAnalysisResult: (result: unknown) => void
    onTrigger: (callback: () => void) => () => void
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

export { }
