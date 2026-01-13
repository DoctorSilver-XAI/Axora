/**
 * PhiVision Service Types
 * Centralized type definitions for the main process.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface PhiVisionConfig {
    mistral: {
        apiKey: string;
        model: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        storageBucket: string;
    };
    paths: {
        dataDir: string;
        screenshotsDir: string;
    };
}

// ============================================================================
// OCR & Analysis Types
// ============================================================================

export interface OcrResult {
    ocrText: string;
    ocrLength: number;
    supabaseUrl: string;
    mistralResponse: Record<string, any>;
    ocrTimeMs: number;
}

export interface AnalysisResult {
    module: string;
    context: string;
    confidence: number;
    ocrText: string;
    ocrLength: number;
    supabaseUrl: string;
    version: string;
    isMock: boolean;
    advices?: {
        oral_sentence: string;
        written_points: string[];
    };
    meds?: any[];
    cross_selling?: any[];
    chips?: string[];
    is_minor?: boolean;
    detected_items?: string[];
    insights?: any[];
    _archiveMetadata?: ArchiveMetadata;
}

export interface ArchiveMetadata {
    ocrTextRaw: string;
    systemPromptUsed: string;
    modelUsed: string;
    processingTimeMs: number;
    ocrTimeMs: number;
    capturedAt: string;
    userPromptUsed?: string;
    ocrModelUsed?: string;
    analysisTimeMs?: number;
    apiResponseRaw?: Record<string, any>;
}

// ============================================================================
// Database & Logging Types
// ============================================================================

export interface PhiVisionLogEntry {
    id: string;
    timestamp: string;
    screenshotPath: string | null;
    screenshotBase64: string | null; // Optional, mainly for display
    supabaseUrl: string;
    ocrTextRaw: string;
    ocrLength: number;
    ocrTimeMs: number;
    totalTimeMs: number;
    mistralResponseRaw: any;
    parsedAnnotation?: any; // Structured data from LLM parsing
    enrichedData?: any; // AI-enriched data from enrichment pipeline
    version: string;
}

// ============================================================================
// IPC Response Types
// ============================================================================

export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp?: string;
}
