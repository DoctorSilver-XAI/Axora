import { BrowserWindow, ipcMain } from 'electron'
import { DynamicIslandWindow } from './DynamicIslandWindow'
import { HubWindow } from './HubWindow'
import { IPC_CHANNELS } from '../ipc/channels'

interface WindowState {
  island: BrowserWindow | null
  hub: BrowserWindow | null
}

interface PendingPhiVisionResult {
  image: string
  timestamp: number
}

interface PendingAnalysisResult {
  image: string
  result: unknown
  timestamp: number
}

export class WindowManager {
  private windows: WindowState = { island: null, hub: null }
  private static instance: WindowManager
  private pendingPhiVisionResult: PendingPhiVisionResult | null = null
  private pendingAnalysisResult: PendingAnalysisResult | null = null

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  async initialize(): Promise<void> {
    this.windows.island = await DynamicIslandWindow.create()
    this.setupInterWindowIPC()
  }

  async openHub(): Promise<void> {
    console.log('[WindowManager] openHub called, existing hub:', !!this.windows.hub, 'pending:', !!this.pendingPhiVisionResult)
    if (this.windows.hub && !this.windows.hub.isDestroyed()) {
      console.log('[WindowManager] Hub already exists, focusing...')
      this.windows.hub.focus()
      // Si le Hub existe deja et qu'il y a un resultat en attente, l'envoyer
      if (this.pendingPhiVisionResult) {
        console.log('[WindowManager] Sending pending result to existing Hub...')
        this.sendPendingPhiVisionResult()
      }
      return
    }

    // Cacher l'Island quand le Hub s'ouvre
    this.hideIsland()

    console.log('[WindowManager] Creating new Hub window...')
    this.windows.hub = await HubWindow.create()

    // Envoyer le resultat PhiVision en attente une fois le Hub charge
    this.windows.hub.webContents.once('did-finish-load', () => {
      console.log('[WindowManager] Hub did-finish-load, waiting 500ms...')
      // Petit delai pour s'assurer que React est monte
      setTimeout(() => {
        console.log('[WindowManager] Timeout done, sending pending result...')
        this.sendPendingPhiVisionResult()
      }, 500)
    })

    this.windows.hub.on('closed', () => {
      this.windows.hub = null
      // Réafficher l'Island quand le Hub se ferme
      this.showIsland()
    })
  }

  closeHub(): void {
    if (this.windows.hub && !this.windows.hub.isDestroyed()) {
      this.windows.hub.close()
      this.windows.hub = null
      // Réafficher l'Island
      this.showIsland()
    }
  }

  toggleHub(): void {
    if (this.windows.hub && !this.windows.hub.isDestroyed()) {
      this.closeHub()
    } else {
      this.openHub()
    }
  }

  hideIsland(): void {
    const island = this.windows.island
    if (island && !island.isDestroyed()) {
      island.hide()
    }
  }

  showIsland(): void {
    const island = this.windows.island
    if (island && !island.isDestroyed()) {
      island.show()
    }
  }

  broadcast(channel: string, ...args: unknown[]): void {
    Object.values(this.windows).forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    })
  }

  sendTo(windowName: keyof WindowState, channel: string, ...args: unknown[]): void {
    const win = this.windows[windowName]
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }

  private setupInterWindowIPC(): void {
    ipcMain.on(IPC_CHANNELS.INTER_WINDOW, (_event, targetWindow, channel, ...args) => {
      this.sendTo(targetWindow, channel, ...args)
    })
  }

  getWindow(name: keyof WindowState): BrowserWindow | null {
    return this.windows[name]
  }

  getIsland(): BrowserWindow | null {
    return this.windows.island
  }

  getHub(): BrowserWindow | null {
    return this.windows.hub
  }

  setIslandIgnoreMouse(ignore: boolean): void {
    const island = this.windows.island
    if (island && !island.isDestroyed()) {
      island.setIgnoreMouseEvents(ignore, { forward: true })
    }
  }

  // Stocke le resultat PhiVision pour l'envoyer au Hub quand il sera pret
  setPendingPhiVisionResult(image: string): void {
    console.log('[WindowManager] setPendingPhiVisionResult called, image size:', image.length)
    this.pendingPhiVisionResult = {
      image,
      timestamp: Date.now(),
    }
  }

  // Envoie le resultat en attente au Hub et le supprime
  private sendPendingPhiVisionResult(): void {
    console.log('[WindowManager] sendPendingPhiVisionResult called, pending:', !!this.pendingPhiVisionResult)
    if (!this.pendingPhiVisionResult) return

    const hub = this.windows.hub
    if (hub && !hub.isDestroyed()) {
      // Verifier que le resultat n'est pas trop vieux (5 minutes max)
      const age = Date.now() - this.pendingPhiVisionResult.timestamp
      console.log('[WindowManager] Pending result age:', age, 'ms')
      if (age < 5 * 60 * 1000) {
        console.log('[WindowManager] Sending pending result to Hub...')
        hub.webContents.send(IPC_CHANNELS.PHIVISION.RESULT, {
          image: this.pendingPhiVisionResult.image,
        })
        console.log('[WindowManager] Pending result sent!')
      } else {
        console.log('[WindowManager] Pending result too old, discarding')
      }
      this.pendingPhiVisionResult = null
    }
  }

  // Permet de verifier s'il y a un resultat en attente
  hasPendingPhiVisionResult(): boolean {
    return this.pendingPhiVisionResult !== null
  }

  // Retourne le pending result (sans le supprimer)
  getPendingPhiVisionResult(): PendingPhiVisionResult | null {
    if (!this.pendingPhiVisionResult) return null

    // Verifier que le resultat n'est pas trop vieux (5 minutes max)
    const age = Date.now() - this.pendingPhiVisionResult.timestamp
    if (age >= 5 * 60 * 1000) {
      console.log('[WindowManager] Pending result too old, discarding')
      this.pendingPhiVisionResult = null
      return null
    }

    return this.pendingPhiVisionResult
  }

  // Efface le resultat en attente (si besoin)
  clearPendingPhiVisionResult(): void {
    this.pendingPhiVisionResult = null
  }
}
