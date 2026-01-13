import { BaseProvider } from '../core/ServiceProvider';
import { OcrResult } from '../types';
import { config } from '../config';

export class OcrProvider extends BaseProvider {
    name = 'OcrProvider';
    private model = 'mistral-ocr-latest'; // Reverting to specialized OCR model

    async initialize(): Promise<void> {
        await super.initialize();
    }

    /**
     * Perform OCR on an image URL using Mistral OCR API
     * Optionally accepts a JSON Schema to guide structural extraction (Document Annotation).
     */
    async processImage(imageUrl: string, jsonSchema?: object): Promise<OcrResult> {
        this.checkInitialized();
        console.log(`[OcrProvider] Calling Mistral OCR API (${this.model})...`);
        const startTime = Date.now();

        const performRequest = async (useSchema: boolean) => {
            const payload: any = {
                model: this.model,
                document: {
                    type: "image_url",
                    image_url: imageUrl
                }
            };

            if (useSchema && jsonSchema) {
                console.log('[OcrProvider] Requesting Document Annotation with Schema.');
                // Wrap the schema in Mistral's expected format
                payload.document_annotation_format = {
                    type: "json_schema",
                    json_schema: jsonSchema
                };
            }

            // Safe logging of payload
            try {
                const debugPayload = { ...payload, document: { ...payload.document, image_url: '...truncated...' } };
                console.log('[OcrProvider] Payload:', JSON.stringify(debugPayload));
            } catch (e) { console.error('Error logging payload', e); }

            const response = await fetch('https://api.mistral.ai/v1/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.mistral.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Check if it's a schema validation error (400)
                if (useSchema && (response.status === 400 || response.status === 422)) {
                    console.warn(`[OcrProvider] Schema validation failed (${response.status}). Error: ${errorText}`);
                    return null; // Return null to trigger fallback
                }
                throw new Error(`Mistral OCR Failed: ${response.status} - ${errorText}`);
            }

            return response.json();
        };

        // 1. Try with schema if provided
        let data = null;
        if (jsonSchema) {
            try {
                data = await performRequest(true);
            } catch (err: any) {
                console.error('[OcrProvider] Error during Schema OCR attempt:', err);
                // If it wasn't a schema validation error (which returns null), it's a real network/auth error.
                // However, for robustness, we retry without schema if it failed unexpectedly.
                if (err instanceof Error && err.message.includes('Mistral OCR Failed')) {
                    console.log('[OcrProvider] Attempting fallback to standard OCR due to error...');
                } else {
                    throw err; // Re-throw critical errors not related to API response code
                }
            }
        }

        // 2. Fallback: Retry without schema if data is still null (explicit null returned or catch block)
        if (!data) {
            if (jsonSchema) console.log('[OcrProvider] Performing Standard OCR Fallback (No Schema).');
            data = await performRequest(false);
            if (!data) throw new Error('Mistral OCR Failed even after fallback.');
        }

        const ocrTimeMs = Date.now() - startTime;
        let extractedText = '';
        let annotationData = null;

        if (jsonSchema && data.document_annotation) {
            console.log('[OcrProvider] Document Annotation received!');
            annotationData = data.document_annotation;
            extractedText = JSON.stringify(annotationData, null, 2);
        } else if (data.pages && Array.isArray(data.pages)) {
            extractedText = data.pages
                .map((page: any) => page.markdown || '')
                .join('\n\n')
                .replace(/!\[.*?\]\(.*?\)/g, '')
                .trim();
        }

        console.log(`[OcrProvider] OCR complete in ${ocrTimeMs}ms. Text length: ${extractedText.length}`);

        return {
            ocrText: extractedText,
            ocrLength: extractedText.length,
            supabaseUrl: imageUrl,
            mistralResponse: data,
            ocrTimeMs
        };
    }
}
