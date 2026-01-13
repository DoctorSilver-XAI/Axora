import { ElectronHandler, AxoraHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    axora: AxoraHandler;
  }
}

export { };
