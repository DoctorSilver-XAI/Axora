/**
 * IEnrichmentAgent Interface
 * Base interface for all enrichment mini-agents
 */

import { FacturationScreenV2 } from '../../types/facturationV2.types';

/**
 * Result from an enrichment agent
 */
export interface EnrichmentAgentResult {
    agentName: string;
    success: boolean;
    data: any;
    processingTimeMs: number;
    error?: string;
}

/**
 * Interface for modular enrichment agents
 * Each agent specializes in one enrichment task
 */
export interface IEnrichmentAgent {
    /** Unique name of the agent */
    name: string;

    /** Human-readable description */
    description: string;

    /** Recommended LLM model for this agent's task */
    recommendedModel: string;

    /**
     * Initialize the agent
     */
    initialize(): Promise<void>;

    /**
     * Process the parsed annotation and return enriched data
     * @param parsedData - The parsed annotation from OCR
     * @returns Enriched data specific to this agent
     */
    enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult>;
}

/**
 * Base class for enrichment agents with common functionality
 */
export abstract class BaseEnrichmentAgent implements IEnrichmentAgent {
    abstract name: string;
    abstract description: string;
    abstract recommendedModel: string;

    protected initialized = false;

    async initialize(): Promise<void> {
        this.initialized = true;
        console.log(`[${this.name}] Initialized`);
    }

    protected checkInitialized(): void {
        if (!this.initialized) {
            throw new Error(`${this.name} not initialized. Call initialize() first.`);
        }
    }

    abstract enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult>;

    /**
     * Helper to measure processing time
     */
    protected async withTiming<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
        const start = Date.now();
        const result = await fn();
        return { result, timeMs: Date.now() - start };
    }
}
