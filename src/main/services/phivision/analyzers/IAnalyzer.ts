import { AnalysisResult, OcrResult } from '../types';

export interface IAnalyzer {
    name: string;
    description: string;

    /**
     * Determines if this analyzer is suitable for the given context or triggers
     */
    canHandle(context: string): boolean;

    /**
     * Run the analysis
     */
    analyze(ocrResult: OcrResult): Promise<AnalysisResult>;
}

export abstract class BaseAnalyzer implements IAnalyzer {
    abstract name: string;
    abstract description: string;

    abstract canHandle(context: string): boolean;
    abstract analyze(ocrResult: OcrResult): Promise<AnalysisResult>;

    protected formatBaseResult(ocrResult: OcrResult, moduleName: string): AnalysisResult {
        return {
            module: moduleName,
            context: 'unknown', // To be refined by subclass
            confidence: 0,
            ocrText: ocrResult.ocrText,
            ocrLength: ocrResult.ocrLength,
            supabaseUrl: ocrResult.supabaseUrl,
            version: 'v3-modular',
            isMock: false,
            _archiveMetadata: {
                ocrTextRaw: ocrResult.ocrText,
                systemPromptUsed: 'unknown',
                modelUsed: 'unknown',
                processingTimeMs: 0,
                ocrTimeMs: ocrResult.ocrTimeMs,
                capturedAt: new Date().toISOString()
            }
        };
    }
}
