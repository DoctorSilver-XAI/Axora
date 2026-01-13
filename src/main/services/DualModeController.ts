import { BrowserWindow, screen, ipcMain, globalShortcut } from 'electron';
import { SidecarConfig, ClassicVariant, DynamicIslandVariant } from '../../config/sidecar.config';

export type ViewMode = 'compact' | 'hub' | 'hidden' | 'phivision';

export class DualModeController {
  private mainWindow: BrowserWindow;
  private currentMode: ViewMode = 'compact';

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.init();
  }

  private init() {
    this.setupListeners();
    this.registerShortcuts();
    this.setCompactMode(); // Default start
  }

  private registerShortcuts() {
    // Register Global Shortcut for PhiVision (requested by user)
    // Mac: Cmd+Shift+P, Windows: Ctrl+Shift+P
    const ret = globalShortcut.register('CommandOrControl+Shift+P', () => {
      console.log('PhiVision Shortcut Triggered');

      // 1. Ensure we are in PhiVision Mode (Fullscreen, Top)
      if (this.currentMode !== 'phivision') {
        this.switchMode('phivision');
      }

      // 2. Trigger the analysis logic in the Renderer
      // This allows the Renderer to handle the lifecycle (spinner, calling capture, showing results)
      this.mainWindow.webContents.send('axora:trigger-phivision');
    });

    if (!ret) {
      console.error('PhiVision global shortcut registration failed');
    }
  }

  private setupListeners() {
    ipcMain.handle('axora:set-mode', (_, mode: ViewMode, options?: any) => {
      this.switchMode(mode, options);
    });

    ipcMain.handle('axora:get-mode', () => {
      return this.currentMode;
    });

    // Handle mouse interactivity toggling
    ipcMain.handle('axora:set-ignore-mouse', (_, ignore: boolean) => {
      // In phivision mode, we might want fine-grained control, but generally 
      // the renderer will tell us when the mouse is over an interactive element
      if (this.currentMode === 'compact' || this.currentMode === 'phivision') {
        // forward: true lets the hover events pass through to the webview even if ignored
        this.mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
      }
    });
  }

  public switchMode(mode: ViewMode, options?: { variant?: 'classic' | 'dynamic-island' }) {
    this.currentMode = mode;
    // Notify Renderer
    this.mainWindow.webContents.send('axora:mode-changed', mode);

    switch (mode) {
      case 'compact':
        this.setCompactMode(options);
        break;
      case 'hub':
        this.setHubMode();
        break;
      case 'phivision':
        this.setPhiVisionMode();
        break;
      case 'hidden':
        this.mainWindow.hide();
        break;
    }
  }

  private setCompactMode(options?: { variant?: 'classic' | 'dynamic-island' }) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Determine Configuration
    const variant = options?.variant || SidecarConfig.variant || 'dynamic-island';
    const config = variant === 'classic' ? ClassicVariant : DynamicIslandVariant;

    // Use configured window dimensions
    const SIDEBAR_WIDTH = config.window.width;
    const SIDEBAR_HEIGHT = config.window.height;

    this.mainWindow.setSize(SIDEBAR_WIDTH, SIDEBAR_HEIGHT);

    // Position based on configuration
    let yPos;
    const { yAxisAlign, margins } = config.position;

    // AXE Y
    if (yAxisAlign === 'top') {
      yPos = margins.top;
    } else if (yAxisAlign === 'bottom') {
      yPos = height - SIDEBAR_HEIGHT - margins.bottom;
    } else if (yAxisAlign === 'upper-quarter') {
      yPos = Math.floor((height * 0.25) - (SIDEBAR_HEIGHT / 2));
    } else {
      yPos = Math.floor((height - SIDEBAR_HEIGHT) / 2);
    }

    // AXE X (Nouveau: Support du centrage)
    let xPos: number;
    // @ts-ignore
    if (config.position.xAxisAlign === 'center') {
      xPos = Math.floor((width - SIDEBAR_WIDTH) / 2);
    } else {
      // Default: Right aligned
      xPos = width - SIDEBAR_WIDTH - margins.right;
    }

    this.mainWindow.setPosition(xPos, yPos);

    this.mainWindow.setAlwaysOnTop(true, 'floating');
    this.mainWindow.setOpacity(1.0);

    // Hide controls for Compact
    if (process.platform === 'darwin') {
      this.mainWindow.setWindowButtonVisibility(false);
    }
    this.mainWindow.setHasShadow(false);

    // Reset mouse behavior to default for compact (usually relying on renderer to set ignore or not)
    // IMPORTANT: forward: true est nécessaire pour que le Renderer puisse capter le hover et activer l'interactivité
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true });

    this.mainWindow.show();
  }

  private setHubMode() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // Hub: Central overlay, 80% width/height
    const HUB_WIDTH = Math.floor(width * 0.82);
    const HUB_HEIGHT = Math.floor(height * 0.85); // Slightly larger
    const x = Math.floor((width - HUB_WIDTH) / 2);
    const y = Math.floor((height - HUB_HEIGHT) / 2);

    // Disable ignoring mouse events for Hub
    this.mainWindow.setIgnoreMouseEvents(false);

    this.mainWindow.setSize(HUB_WIDTH, HUB_HEIGHT);
    this.mainWindow.setPosition(x, y);

    // Hub has standard controls
    this.mainWindow.setResizable(true);
    if (process.platform === 'darwin') {
      this.mainWindow.setWindowButtonVisibility(true);
    }
    this.mainWindow.setHasShadow(true);

    this.mainWindow.setAlwaysOnTop(false);
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  private setPhiVisionMode() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Fullscreen Overlay
    this.mainWindow.setSize(width, height);
    this.mainWindow.setPosition(0, 0);

    // Transparent & Top
    this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
    this.mainWindow.setOpacity(1.0);

    // Hide controls for PhiVision
    if (process.platform === 'darwin') {
      this.mainWindow.setWindowButtonVisibility(false);
    }
    this.mainWindow.setHasShadow(false);

    // IMPORTANT: Do NOT force ignore mouse events here anymore.
    // The Renderer will control interactivity based on the current UI state.
    // - During loading capsule: ignore except on hover
    // - During results panel: fully interactive
    // This fixes the exit bug where clicks passed through because of forced ignore.
    this.mainWindow.setIgnoreMouseEvents(false);

    this.mainWindow.show();
  }
}
