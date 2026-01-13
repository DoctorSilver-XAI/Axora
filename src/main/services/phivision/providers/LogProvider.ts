import { BaseProvider } from '../core/ServiceProvider';
import { PhiVisionLogEntry } from '../types';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

export class LogProvider extends BaseProvider {
    name = 'LogProvider';
    private dbPath: string = '';
    private screenshotDir: string = '';

    async initialize(): Promise<void> {
        this.dbPath = path.join(config.paths.dataDir, 'ocr_logs.json');
        this.screenshotDir = config.paths.screenshotsDir;

        // Ensure directories exist
        if (!fs.existsSync(config.paths.dataDir)) {
            fs.mkdirSync(config.paths.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        await super.initialize();
    }

    /**
     * Log a new entry asynchronously
     */
    async logEntry(data: Omit<PhiVisionLogEntry, 'id' | 'timestamp' | 'screenshotPath' | 'version'> & { screenshotBase64?: string }): Promise<PhiVisionLogEntry> {
        this.checkInitialized();

        const id = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const timestamp = new Date().toISOString();
        let screenshotPath: string | null = null;

        // Save screenshot locally if provided
        if (data.screenshotBase64) {
            try {
                const filename = `${id}.png`;
                screenshotPath = path.join(this.screenshotDir, filename);
                const base64Data = data.screenshotBase64.split(',')[1] || data.screenshotBase64;
                await fs.promises.writeFile(screenshotPath, Buffer.from(base64Data, 'base64'));
            } catch (err) {
                console.error('[LogProvider] Failed to save screenshot:', err);
            }
        }

        const entry: PhiVisionLogEntry = {
            id,
            timestamp,
            screenshotPath,
            screenshotBase64: null, // Don't store heavy data in JSON
            supabaseUrl: data.supabaseUrl,
            ocrTextRaw: data.ocrTextRaw,
            ocrLength: data.ocrLength,
            ocrTimeMs: data.ocrTimeMs,
            totalTimeMs: data.totalTimeMs,
            mistralResponseRaw: data.mistralResponseRaw,
            parsedAnnotation: data.parsedAnnotation || null,
            version: 'v3-parsed'
        };

        // Async read-modify-write (simple implementation, improved over sync)
        try {
            const logs = await this.readLogs();
            logs.unshift(entry);
            // Keep last 100
            const trimmedLogs = logs.slice(0, 100);
            await this.writeLogs(trimmedLogs);
        } catch (err) {
            console.error('[LogProvider] Failed to update logs:', err);
        }

        return entry;
    }

    async getAllLogs(): Promise<PhiVisionLogEntry[]> {
        return this.readLogs();
    }

    async getLogById(id: string): Promise<PhiVisionLogEntry | null> {
        const logs = await this.readLogs();
        const entry = logs.find(l => l.id === id);
        if (!entry) return null;

        // Load screenshot if requested (not efficient for lists, but fine for single view)
        if (entry.screenshotPath) {
            try {
                const buffer = await fs.promises.readFile(entry.screenshotPath);
                entry.screenshotBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
            } catch (err) {
                console.error('[LogProvider] Failed to read screenshot file:', entry.screenshotPath, err);
            }
        }
        return entry;
    }

    async deleteLog(id: string): Promise<boolean> {
        const logs = await this.readLogs();
        const entryIndex = logs.findIndex(l => l.id === id);
        if (entryIndex === -1) return false;

        const entry = logs[entryIndex];
        if (entry.screenshotPath) {
            try {
                await fs.promises.unlink(entry.screenshotPath);
            } catch (ignore) { }
        }

        logs.splice(entryIndex, 1);
        await this.writeLogs(logs);
        return true;
    }

    /**
     * Update log entry with enrichment data
     */
    async updateEnrichment(id: string, enrichmentData: any): Promise<boolean> {
        const logs = await this.readLogs();
        const entryIndex = logs.findIndex(l => l.id === id);
        if (entryIndex === -1) {
            console.error(`[LogProvider] updateEnrichment: Log not found: ${id}`);
            return false;
        }

        logs[entryIndex].enrichedData = enrichmentData;
        logs[entryIndex].version = 'v4-enriched';
        await this.writeLogs(logs);
        console.log(`[LogProvider] Enrichment saved for: ${id}`);
        return true;
    }

    private async readLogs(): Promise<PhiVisionLogEntry[]> {
        try {
            if (!fs.existsSync(this.dbPath)) return [];
            const data = await fs.promises.readFile(this.dbPath, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            return [];
        }
    }

    private async writeLogs(logs: PhiVisionLogEntry[]): Promise<void> {
        await fs.promises.writeFile(this.dbPath, JSON.stringify(logs, null, 2), 'utf-8');
    }
}
