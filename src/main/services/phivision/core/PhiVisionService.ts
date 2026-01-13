import { CaptureProvider } from '../providers/CaptureProvider';
import { OcrProvider } from '../providers/OcrProvider';
import { StorageProvider } from '../providers/StorageProvider';
import { LogProvider } from '../providers/LogProvider';
import { LlmProvider } from '../providers/LlmProvider';
import { AnnotationParser } from '../parsers/AnnotationParser';
import { EnrichmentOrchestrator } from '../enrichment/EnrichmentOrchestrator';
import { AnalysisResult } from '../types';
import { FacturationScreenV2 } from '../types/facturationV2.types';
import { EnrichmentResult } from '../enrichment/types/enrichmentTypes';
import { IAnalyzer } from '../analyzers/IAnalyzer';
import { DefaultAnalyzer } from '../analyzers/DefaultAnalyzer';
import { FacturationAnalyzer } from '../analyzers/FacturationAnalyzer';
import { LGPI_FACTURATION_SCHEMA } from '../schemas/lgpiSchemas';

/**
 * PhiVision Service (Core Orchestrator)
 * Coordinates Capture -> Storage -> OCR -> Logging
 */
export class PhiVisionService {
    private static instance: PhiVisionService;

    // Providers
    private captureProvider: CaptureProvider;
    private ocrProvider: OcrProvider;
    private storageProvider: StorageProvider;
    private logProvider: LogProvider;
    public llmProvider: LlmProvider;
    private annotationParser: AnnotationParser;
    private enrichmentOrchestrator: EnrichmentOrchestrator;

    // Analyzer Registry
    private analyzers: IAnalyzer[] = [];

    private constructor() {
        this.captureProvider = new CaptureProvider();
        this.ocrProvider = new OcrProvider();
        this.storageProvider = new StorageProvider();
        this.logProvider = new LogProvider();
        this.llmProvider = new LlmProvider();
        this.annotationParser = new AnnotationParser();
        this.enrichmentOrchestrator = new EnrichmentOrchestrator();

        // Register default analyzers
        // Order matters! More specific analyzers first.
        this.registerAnalyzer(new FacturationAnalyzer());
        this.registerAnalyzer(new DefaultAnalyzer());

        // Register enrichment agents
        this.registerEnrichmentAgents();
    }

    public registerAnalyzer(analyzer: IAnalyzer) {
        this.analyzers.push(analyzer);
        console.log(`[PhiVisionService] Registered analyzer: ${analyzer.name}`);
    }

    public static getInstance(): PhiVisionService {
        if (!PhiVisionService.instance) {
            PhiVisionService.instance = new PhiVisionService();
        }
        return PhiVisionService.instance;
    }

    public async initialize(): Promise<void> {
        console.log('[PhiVisionService] Initializing providers...');
        await Promise.all([
            this.captureProvider.initialize(),
            this.ocrProvider.initialize(),
            this.storageProvider.initialize(),
            this.logProvider.initialize(),
            this.llmProvider.initialize(),
            this.annotationParser.initialize(),
            this.enrichmentOrchestrator.initialize()
        ]);
        console.log('[PhiVisionService] Initialization complete.');
    }

    // ========================================================================
    // Core Workflow: Capture -> Analyze
    // ========================================================================

    public async runAnalysisPipeline(): Promise<AnalysisResult> {
        const startTime = Date.now();

        // 1. Capture Screen
        console.log('[PhiVision] 1. Capturing screen...');
        const base64Image = await this.captureProvider.capture();
        // this.broadcastStatus('uploading', 'Sécurisation de la capture...');

        // 2. Upload to Storage
        console.log('[PhiVision] 2. Uploading to storage...');
        const publicUrl = await this.storageProvider.uploadImage(base64Image);

        // 3. Process with OCR (Mistral)
        console.log('[PhiVision] 3. Running OCR with Schema...');
        // The overlay toast is handled by the renderer based on state, but we could send detailed progress here if needed
        // this.broadcastStatus('analyzing', 'Analyse structurelle...');

        // We use the Facturation schema by default for now as it's the primary use case
        const ocrResult = await this.ocrProvider.processImage(publicUrl, LGPI_FACTURATION_SCHEMA);

        // 4. Parse annotation with LLM
        console.log('[PhiVision] 4. Parsing annotation with LLM...');
        const parsedAnnotation = await this.annotationParser.parse(
            ocrResult.mistralResponse?.document_annotation
        );
        console.log(`[PhiVision] Parsed annotation: ${parsedAnnotation ? 'OK' : 'null'}`);

        // 5. Select and Run Analyzer
        console.log('[PhiVision] 5. Selecting Analyzer...');
        const selectedAnalyzer = this.analyzers.find(a => a.canHandle('auto')) || this.analyzers[0];
        console.log(`[PhiVision] Analyzer selected: ${selectedAnalyzer.name}`);

        const result = await selectedAnalyzer.analyze(ocrResult);

        // Update timing in result if needed
        if (result._archiveMetadata) {
            result._archiveMetadata.processingTimeMs = Date.now() - startTime;
        }

        // 6. Async Logging
        this.logProvider.logEntry({
            screenshotBase64: base64Image,
            supabaseUrl: publicUrl,
            ocrTextRaw: ocrResult.ocrText,
            ocrLength: ocrResult.ocrLength,
            ocrTimeMs: ocrResult.ocrTimeMs,
            totalTimeMs: Date.now() - startTime,
            mistralResponseRaw: ocrResult.mistralResponse,
            parsedAnnotation: parsedAnnotation
        });

        return result;
    }

    /**
     * Test logic: Run from existing file path
     */
    public async runTestPipeline(base64Image: string): Promise<AnalysisResult> {
        const startTime = Date.now();

        console.log('[PhiVision] TEST: Uploading...');
        const publicUrl = await this.storageProvider.uploadImage(base64Image);

        console.log('[PhiVision] TEST: Running OCR...');
        const ocrResult = await this.ocrProvider.processImage(publicUrl);

        // For tests, use default/first analyzer
        const analyzer = this.analyzers[0];
        const result = await analyzer.analyze(ocrResult);

        return result;
    }

    // ========================================================================
    // Data Access
    // ========================================================================

    public getLogProvider() {
        return this.logProvider;
    }

    // ========================================================================
    // Enrichment
    // ========================================================================

    /**
     * Run enrichment pipeline on a parsed annotation (manual trigger)
     */
    public async runEnrichment(captureId: string, parsedAnnotation: FacturationScreenV2): Promise<EnrichmentResult> {
        console.log(`[PhiVisionService] Running enrichment for capture: ${captureId}`);
        return this.enrichmentOrchestrator.runEnrichment(captureId, parsedAnnotation);
    }

    /**
     * Register an enrichment agent
     */
    public registerEnrichmentAgent(agent: any): void {
        this.enrichmentOrchestrator.registerAgent(agent);
    }

    /**
     * Register all enrichment agents
     */
    private registerEnrichmentAgents(): void {
        // Import agents dynamically to avoid circular dependencies
        const { DCIResolver } = require('../enrichment/agents/DCIResolver');
        const { PharmaAnalyzer } = require('../enrichment/agents/PharmaAnalyzer');
        const { ContextDeductor } = require('../enrichment/agents/ContextDeductor');
        const { OpportunityScout } = require('../enrichment/agents/OpportunityScout');

        // Register agents in order of execution
        this.enrichmentOrchestrator.registerAgent(new DCIResolver());
        this.enrichmentOrchestrator.registerAgent(new PharmaAnalyzer());
        this.enrichmentOrchestrator.registerAgent(new ContextDeductor());
        this.enrichmentOrchestrator.registerAgent(new OpportunityScout());

        console.log('[PhiVisionService] 4 Enrichment agents registered');
    }
}
