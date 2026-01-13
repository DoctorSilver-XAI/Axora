/**
 * Browser Mock for Electron APIs
 * Enables running the UI in Chrome for rapid development previews
 * 
 * Usage: Import this file early in the app entry point
 */

type ViewMode = 'compact' | 'hub' | 'hidden';

interface MockAxoraHandler {
    setMode: (mode: ViewMode) => Promise<void>;
    getMode: () => Promise<ViewMode>;
    _currentMode: ViewMode;
    _isMock: boolean;
}

interface MockElectronHandler {
    ipcRenderer: {
        sendMessage: (channel: string, ...args: unknown[]) => void;
        on: (channel: string, func: (...args: unknown[]) => void) => () => void;
        once: (channel: string, func: (...args: unknown[]) => void) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
}

// Check if we're running in Electron or Browser
const isElectron = (): boolean => {
    return !!(window as any).electron?.ipcRenderer;
};

// Mock state
let mockCurrentMode: ViewMode = 'hub'; // Default to hub in browser for full preview

const mockAxoraHandler: MockAxoraHandler = {
    _currentMode: mockCurrentMode,
    _isMock: true,

    setMode: async (mode: ViewMode): Promise<void> => {
        console.log(`%c[BROWSER MOCK] setMode: ${mode}`, 'color: #00f2ff; font-weight: bold;');
        mockCurrentMode = mode;
        mockAxoraHandler._currentMode = mode;

        // Dispatch custom event so React can listen
        window.dispatchEvent(new CustomEvent('axora:mode-changed', { detail: { mode } }));
        return Promise.resolve();
    },

    getMode: async (): Promise<ViewMode> => {
        console.log(`%c[BROWSER MOCK] getMode: ${mockCurrentMode}`, 'color: #00f2ff;');
        return Promise.resolve(mockCurrentMode);
    }
};

const mockElectronHandler: MockElectronHandler = {
    ipcRenderer: {
        sendMessage: (channel: string, ...args: unknown[]) => {
            console.log(`%c[BROWSER MOCK] sendMessage: ${channel}`, 'color: #bc13fe;', args);
        },
        on: (channel: string, func: (...args: unknown[]) => void) => {
            console.log(`%c[BROWSER MOCK] on: ${channel}`, 'color: #bc13fe;');
            return () => { }; // Return unsubscribe function
        },
        once: (channel: string, func: (...args: unknown[]) => void) => {
            console.log(`%c[BROWSER MOCK] once: ${channel}`, 'color: #bc13fe;');
        },
        invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
            console.log(`%c[BROWSER MOCK] invoke: ${channel}`, 'color: #bc13fe;', args);
            return null;
        }
    }
};

/**
 * Initialize browser mocks if not running in Electron
 */
export function initBrowserMocks(): boolean {
    if (isElectron()) {
        console.log('%c[Axora] Running in Electron environment', 'color: #10b981; font-weight: bold;');
        return false;
    }

    console.log('%c[Axora] Running in Browser Preview Mode', 'color: #00f2ff; font-weight: bold; font-size: 14px;');
    console.log('%c  → UI preview only, Electron features are mocked', 'color: #94a3b8;');
    console.log('%c  → Use Electron build for full functionality', 'color: #94a3b8;');

    // Inject mocks into window
    (window as any).axora = mockAxoraHandler;
    (window as any).electron = mockElectronHandler;

    return true;
}

/**
 * Check if currently running in browser mock mode
 */
export function isBrowserMode(): boolean {
    return !isElectron() || (window as any).axora?._isMock === true;
}

// Auto-initialize on import
const isMockMode = initBrowserMocks();

export { isMockMode, mockCurrentMode };
