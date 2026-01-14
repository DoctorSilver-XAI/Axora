import { ipcMain, BrowserWindow, desktopCapturer, screen } from 'electron'
import { IPC_CHANNELS } from './channels'
import { WindowManager } from '../windows/WindowManager'
import { LocalConversationRepository } from '../database/LocalConversationRepository'
import { CashRegisterRepository } from '../database/CashRegisterRepository'

export function registerIpcHandlers(windowManager: WindowManager): void {
  const localRepo = new LocalConversationRepository()
  const cashRegisterRepo = new CashRegisterRepository()
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
    console.log('[PhiVision] TRIGGER received - starting capture')
    windowManager.broadcast(IPC_CHANNELS.PHIVISION.STATUS, 'capturing')

    // Sauvegarder l'état de visibilité des fenêtres
    const hubWindow = windowManager.getHub()
    const islandWindow = windowManager.getIsland()
    const hubWasVisible = hubWindow?.isVisible() ?? false
    const islandWasVisible = islandWindow?.isVisible() ?? false

    try {
      // Masquer toutes les fenêtres Axora pour capturer le logiciel métier derrière
      if (hubWindow && !hubWindow.isDestroyed()) hubWindow.hide()
      if (islandWindow && !islandWindow.isDestroyed()) islandWindow.hide()

      // Attendre que les fenêtres soient masquées
      await new Promise((resolve) => setTimeout(resolve, 200))

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

      // Réafficher les fenêtres qui étaient visibles
      if (hubWasVisible && hubWindow && !hubWindow.isDestroyed()) hubWindow.show()
      if (islandWasVisible && islandWindow && !islandWindow.isDestroyed()) islandWindow.show()

      // L'Island gérera la transition vers 'analyzing' puis 'complete'
      // On envoie juste le résultat de la capture
      console.log('[PhiVision] Capture successful, image size:', base64Image.length)
      console.log('[PhiVision] Broadcasting RESULT to Island...')
      windowManager.broadcast(IPC_CHANNELS.PHIVISION.RESULT, { image: base64Image })

      // Stocker le resultat pour le Hub qui pourrait s'ouvrir plus tard
      windowManager.setPendingPhiVisionResult(base64Image)

      console.log('[PhiVision] RESULT broadcast complete')
      return { success: true, image: base64Image }
    } catch (error) {
      // Réafficher les fenêtres en cas d'erreur
      if (hubWasVisible && hubWindow && !hubWindow.isDestroyed()) hubWindow.show()
      if (islandWasVisible && islandWindow && !islandWindow.isDestroyed()) islandWindow.show()

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

  // Le Hub peut demander le pending result quand il est pret
  ipcMain.handle(IPC_CHANNELS.PHIVISION.GET_PENDING, () => {
    console.log('[PhiVision] GET_PENDING called, hasPending:', windowManager.hasPendingPhiVisionResult())
    const pending = windowManager.getPendingPhiVisionResult()
    if (pending) {
      console.log('[PhiVision] Returning pending result, image size:', pending.image.length)
      windowManager.clearPendingPhiVisionResult()
      return { image: pending.image }
    }
    return null
  })

  // Broadcaster le résultat d'analyse de l'Island vers le Hub
  ipcMain.on(IPC_CHANNELS.PHIVISION.ANALYSIS_RESULT, (_event, result: unknown) => {
    console.log('[PhiVision] ANALYSIS_RESULT received from Island, broadcasting to Hub...')
    windowManager.broadcast(IPC_CHANNELS.PHIVISION.ANALYSIS_RESULT, result)
    console.log('[PhiVision] ANALYSIS_RESULT broadcast complete')
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

  // Local Conversations handlers
  ipcMain.handle(IPC_CHANNELS.LOCAL_CONVERSATIONS.GET_ALL, async () => {
    return localRepo.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.LOCAL_CONVERSATIONS.GET_BY_ID, async (_event, id: string) => {
    return localRepo.getById(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.LOCAL_CONVERSATIONS.CREATE,
    async (_event, provider: string, model?: string) => {
      const result = await localRepo.create(provider, model)
      if (!result) {
        throw new Error('Le stockage local n\'est pas disponible')
      }
      return result
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LOCAL_CONVERSATIONS.UPDATE_TITLE,
    async (_event, id: string, title: string) => {
      await localRepo.updateTitle(id, title)
    }
  )

  ipcMain.handle(IPC_CHANNELS.LOCAL_CONVERSATIONS.DELETE, async (_event, id: string) => {
    await localRepo.delete(id)
  })

  ipcMain.handle(IPC_CHANNELS.LOCAL_CONVERSATIONS.ARCHIVE, async (_event, id: string) => {
    await localRepo.archive(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.LOCAL_CONVERSATIONS.TOGGLE_PIN,
    async (_event, id: string, isPinned: boolean) => {
      await localRepo.togglePin(id, isPinned)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LOCAL_CONVERSATIONS.ADD_MESSAGE,
    async (
      _event,
      conversationId: string,
      role: 'user' | 'assistant' | 'system',
      content: string,
      provider?: string,
      model?: string
    ) => {
      const result = await localRepo.addMessage(conversationId, role, content, provider, model)
      if (!result) {
        throw new Error('Le stockage local n\'est pas disponible')
      }
      return result
    }
  )

  // PPP handlers
  ipcMain.on(IPC_CHANNELS.PPP.PRINT, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    // Options d'impression pour format A4 PAYSAGE (landscape)
    win.webContents.print({
      silent: false,
      printBackground: true,
      pageSize: 'A4',
      landscape: true, // Important: PPP en format paysage !
      margins: {
        marginType: 'none',
      },
    })
  })

  // Nouveau handler pour la capture décalée (Hide -> Capture -> Show)
  ipcMain.handle(IPC_CHANNELS.PPP.CAPTURE_SCREEN, async () => {
    // 1. Masquer les fenêtres
    const hubWindow = windowManager.getHub()
    const islandWindow = windowManager.getIsland()
    const hubWasVisible = hubWindow?.isVisible() ?? false
    const islandWasVisible = islandWindow?.isVisible() ?? false

    if (hubWindow && !hubWindow.isDestroyed()) hubWindow.hide()
    if (islandWindow && !islandWindow.isDestroyed()) islandWindow.hide()

    try {
      // 2. Attendre que l'animation de masquage soit finie (300ms)
      await new Promise((resolve) => setTimeout(resolve, 300))

      // 3. Capturer l'écran principal
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

      const base64Image = primarySource.thumbnail.toDataURL()

      // 4. Réafficher les fenêtres AVANT de renvoyer le résultat (pour UX fluide)
      if (hubWasVisible && hubWindow && !hubWindow.isDestroyed()) hubWindow.show()
      if (islandWasVisible && islandWindow && !islandWindow.isDestroyed()) islandWindow.show()

      return base64Image
    } catch (e) {
      console.error('PPP Capture error:', e)
      // En cas d'erreur, on réaffiche quand même
      if (hubWasVisible && hubWindow && !hubWindow.isDestroyed()) hubWindow.show()
      if (islandWasVisible && islandWindow && !islandWindow.isDestroyed()) islandWindow.show()
      throw e
    }
  })

  // Cash Register handlers
  ipcMain.handle(IPC_CHANNELS.CASH_REGISTER.GET_ALL, async (_event, limit?: number) => {
    return cashRegisterRepo.getAll(limit)
  })

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTER.GET_BY_DATE, async (_event, date: string) => {
    return cashRegisterRepo.getByDate(date)
  })

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTER.GET_LATEST, async () => {
    return cashRegisterRepo.getLatest()
  })

  ipcMain.handle(
    IPC_CHANNELS.CASH_REGISTER.SAVE,
    async (
      _event,
      data: {
        date: string
        fondsCaisses: Record<string, number | string>
        totalPieces: number
        billetsRetires: Record<string, number | string>
        fondVeille: number
        montantLGPI: number
        results: Record<string, number>
        notes?: string
      }
    ) => {
      return cashRegisterRepo.save(data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.CASH_REGISTER.DELETE, async (_event, id: string) => {
    return cashRegisterRepo.delete(id)
  })
}
