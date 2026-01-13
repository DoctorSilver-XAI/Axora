/**
 * PhiVision Local Log Database Service
 * Uses JSON file for simplicity (no native dependencies needed)
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { PhiVisionLogEntry } from './types';

// Re-export for compatibility if needed, but preferably use from types
export { PhiVisionLogEntry };

// Database file path
const getDbPath = () => {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'phivision_data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'ocr_logs.json');
};

const getScreenshotDir = () => {
    const userDataPath = app.getPath('userData');
    const screenshotDir = path.join(userDataPath, 'phivision_data', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    return screenshotDir;
};

// Load existing logs
const loadLogs = (): PhiVisionLogEntry[] => {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
        return [];
    }
    try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('[PhiVision DB] Error loading logs:', err);
        return [];
    }
};

// Save logs
const saveLogs = (logs: PhiVisionLogEntry[]) => {
    const dbPath = getDbPath();
    try {
        fs.writeFileSync(dbPath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
        console.error('[PhiVision DB] Error saving logs:', err);
    }
};

// Generate unique ID
const generateId = () => {
    return `pv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

/**
 * Log an OCR request to the local database
 */
export function logOcrRequest(data: {
    screenshotBase64?: string;
    supabaseUrl: string;
    ocrTextRaw: string;
    ocrLength: number;
    ocrTimeMs?: number;
    totalTimeMs?: number;
    mistralResponseRaw?: any;
}): PhiVisionLogEntry {
    const id = generateId();
    const timestamp = new Date().toISOString();

    // Save screenshot as file
    let screenshotPath: string | null = null;
    if (data.screenshotBase64) {
        try {
            const filename = `${id}.png`;
            screenshotPath = path.join(getScreenshotDir(), filename);

            // Extract base64 data
            const base64Data = data.screenshotBase64.split(',')[1] || data.screenshotBase64;
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(screenshotPath, buffer);
        } catch (err) {
            console.error('[PhiVision DB] Error saving screenshot:', err);
        }
    }

    const entry: PhiVisionLogEntry = {
        id,
        timestamp,
        screenshotPath,
        screenshotBase64: null,  // Don't store in JSON for space
        supabaseUrl: data.supabaseUrl,
        ocrTextRaw: data.ocrTextRaw,
        ocrLength: data.ocrLength,
        ocrTimeMs: data.ocrTimeMs || 0,
        totalTimeMs: data.totalTimeMs || 0,
        mistralResponseRaw: data.mistralResponseRaw || null,
        version: 'v2'
    };

    const logs = loadLogs();
    logs.unshift(entry);  // Add at beginning (newest first)

    // Keep only last 100 entries to avoid bloat
    const trimmedLogs = logs.slice(0, 100);
    saveLogs(trimmedLogs);

    console.log(`[PhiVision DB] Logged entry ${id} (${data.ocrLength} chars)`);
    return entry;
}

/**
 * Get all logs
 */
export function getAllLogs(): PhiVisionLogEntry[] {
    return loadLogs();
}

/**
 * Get a single log by ID
 */
export function getLogById(id: string): PhiVisionLogEntry | null {
    const logs = loadLogs();
    const entry = logs.find(l => l.id === id);

    if (entry && entry.screenshotPath) {
        // Load screenshot as base64 for display
        try {
            if (fs.existsSync(entry.screenshotPath)) {
                const buffer = fs.readFileSync(entry.screenshotPath);
                entry.screenshotBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
            }
        } catch (err) {
            console.error('[PhiVision DB] Error loading screenshot:', err);
        }
    }

    return entry || null;
}

/**
 * Delete a log entry
 */
export function deleteLog(id: string): boolean {
    const logs = loadLogs();
    const entry = logs.find(l => l.id === id);

    if (entry) {
        // Delete screenshot file
        if (entry.screenshotPath && fs.existsSync(entry.screenshotPath)) {
            try {
                fs.unlinkSync(entry.screenshotPath);
            } catch (err) {
                console.error('[PhiVision DB] Error deleting screenshot:', err);
            }
        }

        const newLogs = logs.filter(l => l.id !== id);
        saveLogs(newLogs);
        return true;
    }
    return false;
}
