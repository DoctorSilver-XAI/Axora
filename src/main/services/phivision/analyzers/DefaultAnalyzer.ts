import { BaseAnalyzer } from './IAnalyzer';
import { AnalysisResult, OcrResult } from '../types';

export class DefaultAnalyzer extends BaseAnalyzer {
    name = 'DefaultAnalyzer';
    description = 'Standard OCR-only pass (Debug mode compatible)';

    canHandle(context: string): boolean {
        return true; // Fallback for everything
    }

    async analyze(ocrResult: OcrResult): Promise<AnalysisResult> {
        console.log('[DefaultAnalyzer] Analyzing...');

        // In the future, this would call an LLM with a generic prompt
        // For now, it returns the OCR result wrapped as "Analysis" to match Phase 1/2 behavior

        const result = this.formatBaseResult(ocrResult, 'default');

        result.context = 'ocr_pass_through';
        result.confidence = 1.0;
        result.version = 'v3-default';
        result._archiveMetadata!.systemPromptUsed = 'NONE (Default Analyzer)';
        result._archiveMetadata!.modelUsed = 'mistral-ocr-latest';

        return result;
    }
}
