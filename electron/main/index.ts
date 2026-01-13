import { app, BrowserWindow } from 'electron'
import { WindowManager } from './windows/WindowManager'
import { registerIpcHandlers } from './ipc/handlers'
import { GlobalShortcuts } from './services/GlobalShortcuts'

class AxoraApp {
  private windowManager: WindowManager
  private shortcuts: GlobalShortcuts

  constructor() {
    this.windowManager = WindowManager.getInstance()
    this.shortcuts = new GlobalShortcuts(this.windowManager)
  }

  async initialize(): Promise<void> {
    await app.whenReady()

    // Set app user model id for windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.axora.app')
    }

    // S'assurer que l'app apparaît dans le dock sur macOS
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show()
    }

    registerIpcHandlers(this.windowManager)

    await this.windowManager.initialize()

    this.shortcuts.register()

    app.on('activate', () => {
      // Sur macOS, ouvrir le Hub quand on clique sur l'icône du dock
      const hub = this.windowManager.getHub()
      if (hub && !hub.isDestroyed()) {
        hub.show()
      } else {
        this.windowManager.openHub()
      }
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    app.on('will-quit', () => {
      this.shortcuts.unregisterAll()
    })
  }
}

const axoraApp = new AxoraApp()
axoraApp.initialize().catch(console.error)
