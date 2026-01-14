import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'

export class DynamicIslandWindow {
  static async create(): Promise<BrowserWindow> {
    const isDev = !app.isPackaged
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

    const preloadPath = join(__dirname, '../preload/island.js')
    console.log('[DynamicIslandWindow] Preload path:', preloadPath)
    console.log('[DynamicIslandWindow] __dirname:', __dirname)

    const window = new BrowserWindow({
      width: 300,
      height: 150,
      x: Math.round(screenWidth / 2 - 150),
      y: 8,

      frame: false,
      transparent: true,
      hasShadow: false,

      alwaysOnTop: true,
      skipTaskbar: true,

      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: true,

      vibrancy: undefined,
      visualEffectState: 'active',

      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    window.setIgnoreMouseEvents(true, { forward: true })

    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      await window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/island.html`)
      // Ouvrir DevTools en dev pour débugger (désactivé par défaut)
      // window.webContents.openDevTools({ mode: 'detach' })
    } else {
      await window.loadFile(join(__dirname, '../renderer/island.html'))
    }

    return window
  }
}
