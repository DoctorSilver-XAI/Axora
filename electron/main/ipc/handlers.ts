import { ipcMain, BrowserWindow, desktopCapturer, screen } from 'electron'
import { IPC_CHANNELS } from './channels'
import { WindowManager } from '../windows/WindowManager'

export function registerIpcHandlers(windowManager: WindowManager): void {
  // Window handlers
  ipcMain.on(IPC_CHANNELS.WINDOW.OPEN_HUB, () => {
    windowManager.openHub()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE_HUB, () => {
    windowManager.closeHub()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.TOGGLE_HUB, () => {
    windowManager.toggleHub()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW.SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    windowManager.setIslandIgnoreMouse(ignore)
  })

  // PhiVision handlers
  ipcMain.handle(IPC_CHANNELS.PHIVISION.TRIGGER, async () => {
    windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'capturing')

    try {
      // Capture l'écran principal
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
      })

      const primarySource = sources[0]
      if (!primarySource) {
        throw new Error('No screen source found')
      }

      // Convertir en base64
      const thumbnail = primarySource.thumbnail
      const base64Image = thumbnail.toDataURL()

      windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'idle')
      windowManager.broadcast(IPC_CHANNELS.PHIVISION.RESULT, { image: base64Image })

      return { success: true, image: base64Image }
    } catch (error) {
      console.error('Screen capture error:', error)
      windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'error')
      windowManager.broadcast(IPC_CHANNELS.PHIVISION.RESULT, {
        error: error instanceof Error ? error.message : 'Capture failed',
      })
      return { success: false, error: 'Capture failed' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PHIVISION.CAPTURE, async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
      })

      const primarySource = sources[0]
      if (!primarySource) {
        return { success: false, error: 'No screen source found' }
      }

      const base64Image = primarySource.thumbnail.toDataURL()
      return { success: true, imageData: base64Image }
    } catch (error) {
      return { success: false, error: 'Capture failed' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.PHIVISION.ANALYZE, async (_event, imageData: string) => {
    windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'analyzing')
    // L'analyse OCR se fait côté renderer avec l'API Mistral
    console.log('Analyzing image...', imageData?.substring(0, 50))
    return { success: true }
  })

  ipcMain.on(IPC_CHANNELS.PHIVISION.CLOSE, () => {
    windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'idle')
  })

  // AI handlers
  ipcMain.handle(IPC_CHANNELS.AI.GET_PROVIDERS, async () => {
    return ['mistral', 'openai', 'local']
  })

  ipcMain.handle(IPC_CHANNELS.AI.SEND_MESSAGE, async (_event, message: string, conversationId?: string) => {
    console.log('AI message:', message, 'conversation:', conversationId)
    return { success: true }
  })

  // Auth handlers (Supabase gère l'auth côté renderer)
  ipcMain.handle(IPC_CHANNELS.AUTH.GET_SESSION, async () => {
    return null
  })
}
