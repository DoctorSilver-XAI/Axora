/**
 * PhiVision Field Test Logger
 * 
 * Saves screen captures and analysis results to a structured folder
 * for later review and AI model training.
 * 
 * Output Folder: ~/Documents/Axora/Captures/
 * Files: {timestamp}.png, {timestamp}.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Toggle this flag to enable/disable logging globally
let isLoggingEnabled = true;

const CAPTURES_DIR = path.join(os.homedir(), 'Documents', 'Axora', 'Captures');

/**
 * Enable or disable the logger
 */
export function setLoggingEnabled(enabled: boolean): void {
    isLoggingEnabled = enabled;
    console.log(`[PhiVisionLogger] Logging ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Check if logging is active
 */
export function isLoggingActive(): boolean {
    return isLoggingEnabled;
}

/**
 * Ensure the captures directory exists
 */
function ensureDirectoryExists(): void {
    if (!fs.existsSync(CAPTURES_DIR)) {
        fs.mkdirSync(CAPTURES_DIR, { recursive: true });
        console.log(`[PhiVisionLogger] Created directory: ${CAPTURES_DIR}`);
    }
}

/**
 * Save a capture session (image + analysis data)
 * 
 * @param base64Image - The captured screenshot as a data URL
 * @param ocrText - The raw OCR text extracted
 * @param analysisResult - The full analysis JSON from Mistral
 */
export async function logCaptureSession(
    base64Image: string,
    ocrText: string,
    analysisResult: object
): Promise<string | null> {
    if (!isLoggingEnabled) {
        return null;
    }

    try {
        ensureDirectoryExists();

        // Generate timestamp-based filename
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')  // Replace : and . with - for filesystem compatibility
            .replace('T', '_')
            .slice(0, 19);  // YYYY-MM-DD_HH-MM-SS

        const baseFilename = `capture_${timestamp}`;
        const imagePath = path.join(CAPTURES_DIR, `${baseFilename}.png`);
        const jsonPath = path.join(CAPTURES_DIR, `${baseFilename}.json`);

        // --- Save Image ---
        // Extract base64 data from data URL (remove "data:image/png;base64," prefix)
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(imagePath, imageBuffer);

        // --- Save JSON Metadata ---
        const metadata = {
            capturedAt: new Date().toISOString(),
            ocrTextLength: ocrText.length,
            ocrTextPreview: ocrText.substring(0, 500), // First 500 chars for quick review
            analysisResult: analysisResult,
            // Don't save full OCR text to save space, but keep a snippet
        };
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

        console.log(`[PhiVisionLogger] ✅ Saved: ${baseFilename}.png + ${baseFilename}.json`);
        console.log(`[PhiVisionLogger] 📁 Location: ${CAPTURES_DIR}`);

        return CAPTURES_DIR;

    } catch (error) {
        console.error('[PhiVisionLogger] ❌ Failed to save capture:', error);
        return null;
    }
}

/**
 * Get the captures directory path
 */
export function getCapturesDirectory(): string {
    return CAPTURES_DIR;
}
