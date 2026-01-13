/**
 * Mistral OCR Service
 * Uploads image to Supabase, then calls Mistral OCR with the public URL.
 */

import { uploadToSupabase } from './supabase.service';

import { config } from './config';
import { OcrResult } from './types';

// Export type from central types
export { OcrResult };

export async function performOCR(base64Image: string): Promise<OcrResult> {
    console.log('[OCR] Starting OCR pipeline...');
    console.log('[OCR] Base64 image length:', base64Image?.length || 0);
    const startTime = Date.now();

    // Step 1: Upload image to Supabase to get a public URL
    console.log('[OCR] Step 1/2 - Uploading to Supabase...');
    const publicUrl = await uploadToSupabase(base64Image);
    console.log('[OCR] Public URL obtained:', publicUrl);

    // Step 2: Call Mistral OCR with the public URL
    console.log('[OCR] Step 2/2 - Calling Mistral OCR API...');

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.mistral.apiKey}`
        },
        body: JSON.stringify({
            model: config.mistral.model,
            document: {
                type: "image_url",
                image_url: publicUrl
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[OCR] Mistral API Error:', response.status, errorText);
        throw new Error(`Mistral OCR Failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[OCR] Mistral response received');
    console.log('[OCR] Pages found:', data.pages?.length || 0);

    // Extract and clean text from all pages
    let extractedText = '';
    if (data.pages && data.pages.length > 0) {
        extractedText = data.pages
            .map((page: any) => page.markdown || '')
            .join('\n\n')
            .replace(/!\[.*?\]\(.*?\)/g, '')  // Remove markdown image references
            .trim();
    }

    const ocrTimeMs = Date.now() - startTime;
    console.log('[OCR] Extracted text length:', extractedText.length);
    console.log('[OCR] Preview (first 300 chars):', extractedText.substring(0, 300));

    return {
        ocrText: extractedText,
        ocrLength: extractedText.length,
        supabaseUrl: publicUrl,
        mistralResponse: data,
        ocrTimeMs
    };
}
