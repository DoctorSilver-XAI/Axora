import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../main/ipc/channels'

console.log('[Preload Island] Loading...')

// Limited API for Dynamic Island
const islandAPI = {
  // Window controls
  window: {
    openHub: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.OPEN_HUB),
    toggleHub: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.TOGGLE_HUB),
    setIgnoreMouse: (ignore: boolean) =>
      ipcRenderer.send(IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE, ignore),
  },

  // PhiVision
  phivision: {
    trigger: () => ipcRenderer.invoke(IPC_CHANNELS.PHIVISION.TRIGGER),
    close: () => ipcRenderer.send(IPC_CHANNELS.PHIVISION.CLOSE),
    onStatusChange: (callback: (status: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, status: string) => callback(status)
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.STATUS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.STATUS, handler)
    },
    onResult: (callback: (result: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, result: unknown) => callback(result)
      ipcRenderer.on(IPC_CHANNELS.PHIVISION.RESULT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PHIVISION.RESULT, handler)
    },
  },

  // Platform info
  platform: process.platform,
}

try {
  contextBridge.exposeInMainWorld('axora', islandAPI)
  console.log('[Preload Island] API exposed successfully')
} catch (error) {
  console.error('[Preload Island] Failed to expose API:', error)
}

export type IslandAPI = typeof islandAPI
