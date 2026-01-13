/**
 * PhiVision V2 Service - DEBUG MODE
 * Only performs OCR (via Supabase URL), logs to local DB, skips analysis for debugging.
 */

import { performOCR, OcrResult } from '../ocr.service';
import { logOcrRequest } from '../db.service';
import { AnalysisResult } from '../types';

export async function analyzeV2(base64Image: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    console.log('[PhiVision] DEBUG MODE - OCR Only (via Supabase URL)');
    console.log('[PhiVision] Image length:', base64Image?.length || 0, 'chars');

    // OCR Extraction via Supabase URL
    let ocrResult: OcrResult;
    try {
        ocrResult = await performOCR(base64Image);
        console.log('[PhiVision] ✅ OCR Complete!');
        console.log('[PhiVision] Extracted:', ocrResult.ocrLength, 'characters');
    } catch (ocrError) {
        console.error('[PhiVision] ❌ OCR FAILED:', ocrError);
        throw ocrError;
    }

    const totalTime = Date.now() - startTime;

    // Log to local database for development analysis
    try {
        logOcrRequest({
            screenshotBase64: base64Image,
            supabaseUrl: ocrResult.supabaseUrl,
            ocrTextRaw: ocrResult.ocrText,
            ocrLength: ocrResult.ocrLength,
            ocrTimeMs: ocrResult.ocrTimeMs,
            totalTimeMs: totalTime,
            mistralResponseRaw: ocrResult.mistralResponse
        });
    } catch (logError) {
        console.error('[PhiVision] Log error (non-blocking):', logError);
    }

    // Return raw OCR result for debugging
    return {
        module: 'debug',
        context: 'ocr_only_supabase',
        confidence: 1.0,
        ocrText: ocrResult.ocrText,
        ocrLength: ocrResult.ocrLength,
        supabaseUrl: ocrResult.supabaseUrl,
        version: 'v2-debug-supabase',
        isMock: false,
        _archiveMetadata: {
            ocrTextRaw: ocrResult.ocrText,
            systemPromptUsed: 'NONE (Debug Mode)',
            modelUsed: 'mistral-ocr-latest',
            processingTimeMs: totalTime,
            ocrTimeMs: ocrResult.ocrTimeMs,
            capturedAt: new Date().toISOString()
        }
    };
}
