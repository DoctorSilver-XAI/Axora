import { BrowserWindow, ipcMain } from 'electron'
import { DynamicIslandWindow } from './DynamicIslandWindow'
import { HubWindow } from './HubWindow'
import { IPC_CHANNELS } from '../ipc/channels'

interface WindowState {
  island: BrowserWindow | null
  hub: BrowserWindow | null
}

export class WindowManager {
  private windows: WindowState = { island: null, hub: null }
  private static instance: WindowManager

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
    if (this.windows.hub && !this.windows.hub.isDestroyed()) {
      this.windows.hub.focus()
      return
    }

    // Cacher l'Island quand le Hub s'ouvre
    this.hideIsland()

    this.windows.hub = await HubWindow.create()

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
}
