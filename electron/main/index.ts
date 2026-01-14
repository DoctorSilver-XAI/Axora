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

    // Handle permission requests for screen capture
    app.whenReady().then(() => {
      const { session } = require('electron')
      session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem']
        if (allowedPermissions.includes(permission)) {
          callback(true) // Approve permission request
        } else {
          console.warn(`[Main] Denied permission request: ${permission}`)
          callback(false)
        }
      })

      // Specifically handle display media requests (screen sharing picker)
      session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        const { desktopCapturer } = require('electron')

        desktopCapturer.getSources({ types: ['screen'] })
          .then((sources) => {
            // Grant access to the first screen found (Primary Display)
            if (sources.length > 0) {
              callback({ video: sources[0] })
            } else {
              // No screen found
              callback(null)
            }
          })
          .catch((err) => {
            console.error('[Main] Error getting sources:', err)
            callback(null)
          })
      })
    })

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
