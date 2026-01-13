import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 'axora:trigger-phivision';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: string, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
};

const axoraHandler = {
  setMode: (mode: 'compact' | 'hub' | 'hidden' | 'phivision', variant?: 'classic' | 'dynamic-island') =>
    ipcRenderer.invoke('axora:set-mode', mode, { variant }),
  getMode: () => ipcRenderer.invoke('axora:get-mode'),
  onModeChanged: (callback: (mode: 'compact' | 'hub' | 'hidden' | 'phivision') => void) => {
    const subscription = (_event: IpcRendererEvent, mode: 'compact' | 'hub' | 'hidden' | 'phivision') => callback(mode);
    ipcRenderer.on('axora:mode-changed', subscription);
    return () => ipcRenderer.removeListener('axora:mode-changed', subscription);
  },
  ping: () => ipcRenderer.invoke('AXORA_PING'),
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.invoke('axora:set-ignore-mouse', ignore),
  onTriggerPhiVision: (callback: () => void) => {
    const subscription = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('axora:trigger-phivision', subscription);
    return () => ipcRenderer.removeListener('axora:trigger-phivision', subscription);
  },
  // PhiVision Dedicated Handlers
  runPhiVisionCapture: (version: string, scenarioOverride?: string) =>
    ipcRenderer.invoke('AXORA_VISION_CAPTURE', scenarioOverride, version),
  runPhiVisionTestImage: (filePath: string) =>
    ipcRenderer.invoke('AXORA_VISION_TEST', filePath),
  // Generic invoke for new IPC handlers
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
};

contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('axora', axoraHandler);

export type ElectronHandler = typeof electronHandler;
export type AxoraHandler = typeof axoraHandler;
