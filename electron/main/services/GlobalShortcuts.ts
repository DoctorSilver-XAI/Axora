import { globalShortcut } from 'electron'
import { WindowManager } from '../windows/WindowManager'
import { IPC_CHANNELS } from '../ipc/channels'

export class GlobalShortcuts {
  private windowManager: WindowManager
  private shortcuts: { accelerator: string; callback: () => void }[] = []

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager
  }

  register(): void {
    // PhiVision trigger: Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows/Linux)
    this.registerShortcut('CommandOrControl+Shift+P', () => {
      this.windowManager.broadcast(IPC_CHANNELS.PHIVISION.TRIGGER)
      console.log('PhiVision triggered via shortcut')
    })

    // Hub toggle: Cmd+Shift+H (Mac) / Ctrl+Shift+H (Windows/Linux)
    this.registerShortcut('CommandOrControl+Shift+H', () => {
      this.windowManager.toggleHub()
      console.log('Hub toggled via shortcut')
    })
  }

  private registerShortcut(accelerator: string, callback: () => void): void {
    const success = globalShortcut.register(accelerator, callback)
    if (success) {
      this.shortcuts.push({ accelerator, callback })
      console.log(`Shortcut registered: ${accelerator}`)
    } else {
      console.error(`Failed to register shortcut: ${accelerator}`)
    }
  }

  unregisterAll(): void {
    this.shortcuts.forEach(({ accelerator }) => {
      globalShortcut.unregister(accelerator)
    })
    this.shortcuts = []
  }
}
