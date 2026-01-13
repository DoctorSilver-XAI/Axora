/**
 * Supabase Storage Service (Main Process)
 * Uploads images to Supabase Storage and returns public URLs.
 */

import { config } from './config';

/**
 * Upload a base64 image to Supabase Storage and return the public URL
 */
export async function uploadToSupabase(base64Image: string): Promise<string> {
    const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, storageBucket: STORAGE_BUCKET } = config.supabase;

    // Extract base64 data from data URL
    const parts = base64Image.split(',');
    const base64Data = parts.length > 1 ? parts[1] : parts[0];

    // Convert base64 to binary buffer
    const binaryData = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `ocr/${timestamp}_${randomSuffix}.png`;

    console.log('[Supabase] Uploading screenshot...', filename);
    console.log('[Supabase] Image size:', binaryData.length, 'bytes');

    // Upload to Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filename}`;

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'image/png',
            'x-upsert': 'true'
        },
        body: binaryData
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[Supabase] Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Supabase upload failed: ${uploadResponse.status}`);
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
    console.log('[Supabase] Upload success! URL:', publicUrl);

    return publicUrl;
}
