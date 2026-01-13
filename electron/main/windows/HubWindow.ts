import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'

export class HubWindow {
  static async create(): Promise<BrowserWindow> {
    const isDev = !app.isPackaged
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

    const preloadPath = join(__dirname, '../preload/index.js')
    console.log('[HubWindow] Preload path:', preloadPath)

    const window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,

      x: Math.round((screenWidth - 1200) / 2),
      y: Math.round((screenHeight - 800) / 2),

      frame: false,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 16 },

      backgroundColor: '#0a0a0f',
      vibrancy: 'under-window',

      show: false, // Ne pas montrer avant que le contenu soit prêt

      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Désactivé pour permettre le preload
      },
    })

    // Afficher la fenêtre quand elle est prête
    window.once('ready-to-show', () => {
      window.show()
    })

    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      await window.loadURL(process.env['ELECTRON_RENDERER_URL'])
      // Ouvrir DevTools en dev pour débugger
      window.webContents.openDevTools({ mode: 'detach' })
    } else {
      await window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return window
  }
}
