import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../main/ipc/channels'

console.log('[Preload Hub] Loading...')

const axoraAPI = {
  // Window controls
  window: {
    openHub: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.OPEN_HUB),
    closeHub: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.CLOSE_HUB),
    toggleHub: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.TOGGLE_HUB),
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.CLOSE),
    setIgnoreMouse: (ignore: boolean) =>
      ipcRenderer.send(IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE, ignore),
  },

  // PhiVision
  phivision: {
    trigger: () => ipcRenderer.invoke(IPC_CHANNELS.PHIVISION.TRIGGER),
    capture: () => ipcRenderer.invoke(IPC_CHANNELS.PHIVISION.CAPTURE),
    analyze: (imageData: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PHIVISION.ANALYZE, imageData),
    getPending: () => ipcRenderer.invoke(IPC_CHANNELS.PHIVISION.GET_PENDING),
    close: () => ipcRenderer.send(IPC_CHANNELS.PHIVISION.CLOSE),
    onTrigger: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.TRIGGER, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.TRIGGER, handler)
    },
    onResult: (callback: (result: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, result: unknown) => callback(result)
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.RESULT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.RESULT, handler)
    },
    onStatusChange: (callback: (status: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, status: string) => callback(status)
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.STATUS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.STATUS, handler)
    },
    onAnalysisResult: (callback: (result: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, result: unknown) => callback(result)
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.ANALYSIS_RESULT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.ANALYSIS_RESULT, handler)
    },
  },

  // AI
  ai: {
    sendMessage: (message: string, conversationId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.SEND_MESSAGE, message, conversationId),
    getProviders: () => ipcRenderer.invoke(IPC_CHANNELS.AI.GET_PROVIDERS),
    setProvider: (provider: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI.SET_PROVIDER, provider),
    cancel: () => ipcRenderer.send(IPC_CHANNELS.AI.CANCEL),
    onStreamChunk: (callback: (chunk: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
      ipcRenderer.on(IPC_CHANNELS.AI.STREAM_CHUNK, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI.STREAM_CHUNK, handler)
    },
    onStreamEnd: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(IPC_CHANNELS.AI.STREAM_END, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI.STREAM_END, handler)
    },
  },

  // Auth
  auth: {
    login: (email: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGIN, email, password),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGOUT),
    register: (email: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.REGISTER, email, password),
    getSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.GET_SESSION),
    onSessionChange: (callback: (session: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, session: unknown) => callback(session)
      ipcRenderer.on(IPC_CHANNELS.AUTH.SESSION_CHANGED, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AUTH.SESSION_CHANGED, handler)
    },
  },

  // Local Conversations (SQLite)
  localConversations: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.GET_ALL),
    getById: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.GET_BY_ID, id),
    create: (provider: string, model?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.CREATE, provider, model),
    updateTitle: (id: string, title: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.UPDATE_TITLE, id, title),
    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.DELETE, id),
    archive: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.ARCHIVE, id),
    togglePin: (id: string, isPinned: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOCAL_CONVERSATIONS.TOGGLE_PIN, id, isPinned),
    addMessage: (
      conversationId: string,
      role: 'user' | 'assistant' | 'system',
      content: string,
      provider?: string,
      model?: string
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.LOCAL_CONVERSATIONS.ADD_MESSAGE,
        conversationId,
        role,
        content,
        provider,
        model
      ),
  },

  // PPP (Plan Personnalisé de Prévention)
  ppp: {
    print: () => ipcRenderer.send(IPC_CHANNELS.PPP.PRINT),
  },

  // Platform info
  platform: process.platform,
}

try {
  contextBridge.exposeInMainWorld('axora', axoraAPI)
  console.log('[Preload Hub] API exposed successfully')
} catch (error) {
  console.error('[Preload Hub] Failed to expose API:', error)
}

export type AxoraAPI = typeof axoraAPI
