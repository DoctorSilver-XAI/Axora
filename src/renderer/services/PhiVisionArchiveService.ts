/**
 * PhiVision Archive Service
 * 
 * Archives PhiVision capture sessions to Supabase for:
 * - Historical tracking
 * - Prompt improvement analysis
 * - Quality monitoring
 * 
 * Uses Supabase Storage for screenshots and the phivision_captures table for metadata.
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface PhiVisionCaptureData {
    // Timestamps
    capturedAt: Date;

    // Screenshot
    screenshotBase64: string; // Full data URL

    // OCR Data
    ocrTextRaw: string;
    ocrTextLength: number;

    // Prompts (for improvement analysis)
    systemPromptUsed: string;
    userPromptUsed?: string;

    // Model Information
    modelUsed: string;
    ocrModelUsed: string;

    // API Response
    apiResponseRaw: object;
    analysisResult: object;

    // Performance Metrics
    processingTimeMs: number;
    ocrTimeMs?: number;
    analysisTimeMs?: number;

    // Context
    deviceOs: string;
    deviceResolution: string;
    appVersion: string;
}

export interface ArchiveResult {
    success: boolean;
    captureId?: string;
    screenshotUrl?: string;
    error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'phivision-captures';
const TABLE_NAME = 'phivision_captures';
const APP_VERSION = '2.5.0'; // Update as needed

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert base64 data URL to Blob for storage
 */
function base64ToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64 = parts[1];
    const byteString = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    return new Blob([uint8Array], { type: mime });
}

/**
 * Create a thumbnail from the screenshot (smaller for quick preview)
 */
function createThumbnail(dataUrl: string, maxWidth: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // Lower quality for thumbnail
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
    });
}

/**
 * Get current user ID if authenticated
 */
async function getCurrentUserId(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id || null;
    } catch {
        return null;
    }
}

/**
 * Get device information
 */
function getDeviceInfo(): { os: string; resolution: string } {
    const os = navigator.platform || 'unknown';
    const resolution = `${window.screen.width}x${window.screen.height}`;
    return { os, resolution };
}

// ============================================================================
// MAIN ARCHIVE FUNCTION
// ============================================================================

/**
 * Archive a PhiVision capture session to Supabase
 * 
 * @param data - The capture data to archive
 * @returns ArchiveResult with success status and capture ID
 */
export async function archiveCapture(data: PhiVisionCaptureData): Promise<ArchiveResult> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.warn('[PhiVisionArchive] Supabase not configured, skipping archive');
        return {
            success: false,
            error: 'Supabase not configured'
        };
    }

    try {
        const userId = await getCurrentUserId();
        const deviceInfo = getDeviceInfo();

        // Generate unique filename for screenshot
        const timestamp = data.capturedAt.toISOString().replace(/[:.]/g, '-');
        const filename = `capture_${timestamp}_${Math.random().toString(36).substring(7)}.png`;

        // 1. Upload screenshot to Supabase Storage
        let screenshotUrl: string | null = null;
        try {
            const blob = base64ToBlob(data.screenshotBase64);
            const filePath = userId ? `${userId}/${filename}` : `anonymous/${filename}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, blob, {
                    contentType: 'image/png',
                    upsert: false
                });

            if (uploadError) {
                console.error('[PhiVisionArchive] Storage upload failed:', uploadError);
                // Continue without screenshot URL - we can still save metadata
            } else {
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(filePath);
                screenshotUrl = urlData?.publicUrl || null;
            }
        } catch (storageError) {
            console.error('[PhiVisionArchive] Storage error:', storageError);
            // Continue without screenshot
        }

        // 2. Create thumbnail for quick preview
        let thumbnailBase64: string | null = null;
        try {
            thumbnailBase64 = await createThumbnail(data.screenshotBase64);
        } catch {
            // Thumbnail is optional, continue without it
        }

        // 3. Insert metadata into phivision_captures table
        const record = {
            captured_at: data.capturedAt.toISOString(),
            screenshot_url: screenshotUrl,
            screenshot_thumbnail: thumbnailBase64,
            ocr_text_raw: data.ocrTextRaw,
            ocr_text_length: data.ocrTextLength,
            system_prompt_used: data.systemPromptUsed,
            user_prompt_used: data.userPromptUsed || null,
            model_used: data.modelUsed,
            ocr_model_used: data.ocrModelUsed,
            api_response_raw: data.apiResponseRaw,
            analysis_result: data.analysisResult,
            processing_time_ms: data.processingTimeMs,
            ocr_time_ms: data.ocrTimeMs || null,
            analysis_time_ms: data.analysisTimeMs || null,
            user_id: userId,
            device_os: data.deviceOs || deviceInfo.os,
            device_resolution: data.deviceResolution || deviceInfo.resolution,
            app_version: data.appVersion || APP_VERSION,
            tags: [],
            notes: null,
            quality_rating: null
        };

        const { data: insertData, error: insertError } = await supabase
            .from(TABLE_NAME)
            .insert(record)
            .select('id')
            .single();

        if (insertError) {
            console.error('[PhiVisionArchive] Database insert failed:', insertError);
            return {
                success: false,
                error: `Database error: ${insertError.message}`
            };
        }

        console.log(`[PhiVisionArchive] ✅ Capture archived: ${insertData.id}`);

        return {
            success: true,
            captureId: insertData.id,
            screenshotUrl: screenshotUrl || undefined
        };

    } catch (error) {
        console.error('[PhiVisionArchive] Unexpected error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update tags or notes for a capture (for post-analysis annotation)
 */
export async function updateCaptureAnnotations(
    captureId: string,
    updates: { tags?: string[]; notes?: string; qualityRating?: number }
): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                tags: updates.tags,
                notes: updates.notes,
                quality_rating: updates.qualityRating
            })
            .eq('id', captureId);

        return !error;
    } catch {
        return false;
    }
}

/**
 * Get capture history for the current user (for future UI)
 */
export async function getCaptureHistory(limit: number = 50): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, captured_at, screenshot_thumbnail, analysis_result, tags, quality_rating')
            .order('captured_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[PhiVisionArchive] Failed to fetch history:', error);
            return [];
        }

        return data || [];
    } catch {
        return [];
    }
}
