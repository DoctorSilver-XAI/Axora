/**
 * PhiVision Screen Capture Service
 * Captures the primary display while completely hiding the Electron window.
 */

import { desktopCapturer, screen, BrowserWindow } from 'electron';

const HIDE_DELAY_MS = 500;  // Wait longer after hiding

export async function captureScreen(): Promise<string> {
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows[0];

    // Store original state
    let wasVisible = true;

    try {
        // 1. Completely hide the window (not just opacity)
        if (mainWindow) {
            wasVisible = mainWindow.isVisible();
            console.log('[Capture] Hiding window...');
            mainWindow.hide();  // Completely hide instead of just opacity
            await delay(HIDE_DELAY_MS);
        }

        // 2. Get display info
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const scaleFactor = primaryDisplay.scaleFactor;

        console.log(`[Capture] Display: ${width}x${height} @${scaleFactor}x`);

        // 3. Capture screen at native resolution
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: Math.floor(width * scaleFactor),
                height: Math.floor(height * scaleFactor)
            }
        });

        if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
        }

        const screenshot = sources[0].thumbnail.toDataURL();
        console.log(`[Capture] Screenshot taken: ${screenshot.length} chars`);

        return screenshot;

    } finally {
        // 4. Always restore window visibility
        if (mainWindow && wasVisible) {
            console.log('[Capture] Restoring window...');
            mainWindow.show();
            mainWindow.focus();
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
