/**
 * EnrichmentOrchestrator
 * Coordinates the execution of all enrichment agents in sequence
 */

import { BaseProvider } from '../core/ServiceProvider';
import { FacturationScreenV2 } from '../types/facturationV2.types';
import { IEnrichmentAgent, EnrichmentAgentResult } from './IEnrichmentAgent';
import { EnrichmentResult, EnrichmentProgress } from './types/enrichmentTypes';

export class EnrichmentOrchestrator extends BaseProvider {
    name = 'EnrichmentOrchestrator';

    private agents: IEnrichmentAgent[] = [];
    private currentProgress: EnrichmentProgress = {
        status: 'idle',
        currentAgent: null,
        completedAgents: [],
        totalAgents: 0
    };

    async initialize(): Promise<void> {
        await super.initialize();
        console.log('[EnrichmentOrchestrator] Initialized with 0 agents (agents will be registered later)');
    }

    /**
     * Register an enrichment agent
     */
    registerAgent(agent: IEnrichmentAgent): void {
        this.agents.push(agent);
        console.log(`[EnrichmentOrchestrator] Registered agent: ${agent.name}`);
    }

    /**
     * Get current progress
     */
    getProgress(): EnrichmentProgress {
        return { ...this.currentProgress };
    }

    /**
     * Run all registered agents on the parsed annotation
     * @param captureId - ID of the capture being enriched
     * @param parsedAnnotation - The parsed OCR annotation
     * @returns Full enrichment result
     */
    async runEnrichment(captureId: string, parsedAnnotation: FacturationScreenV2): Promise<EnrichmentResult> {
        this.checkInitialized();

        console.log(`[EnrichmentOrchestrator] Starting enrichment for capture: ${captureId}`);
        const startTime = Date.now();

        // Initialize progress
        this.currentProgress = {
            status: 'running',
            currentAgent: null,
            completedAgents: [],
            totalAgents: this.agents.length
        };

        const result: EnrichmentResult = {
            version: 'v1',
            captureId,
            timestamp: new Date().toISOString(),
            processingTimeMs: 0,
            parsedAnnotation,
            agentsExecuted: [],
            errors: []
        };

        // Execute each agent sequentially
        for (const agent of this.agents) {
            this.currentProgress.currentAgent = agent.name;
            console.log(`[EnrichmentOrchestrator] Running agent: ${agent.name}`);

            try {
                // Initialize agent if needed
                await agent.initialize();

                // Run enrichment
                const agentResult: EnrichmentAgentResult = await agent.enrich(parsedAnnotation);

                if (agentResult.success) {
                    // Map result to the appropriate field
                    this.mapAgentResult(result, agent.name, agentResult.data);
                    result.agentsExecuted.push(agent.name);
                } else {
                    result.errors.push({ agent: agent.name, error: agentResult.error || 'Unknown error' });
                }

                this.currentProgress.completedAgents.push(agent.name);
                console.log(`[EnrichmentOrchestrator] Agent ${agent.name} completed in ${agentResult.processingTimeMs}ms`);

            } catch (error: any) {
                console.error(`[EnrichmentOrchestrator] Agent ${agent.name} failed:`, error);
                result.errors.push({ agent: agent.name, error: error.message });
                this.currentProgress.completedAgents.push(agent.name);
            }
        }

        result.processingTimeMs = Date.now() - startTime;
        this.currentProgress.status = result.errors.length === this.agents.length ? 'error' : 'completed';
        this.currentProgress.currentAgent = null;

        console.log(`[EnrichmentOrchestrator] Enrichment complete in ${result.processingTimeMs}ms. ` +
            `Agents: ${result.agentsExecuted.length}/${this.agents.length} successful`);

        return result;
    }

    /**
     * Map agent result to the appropriate field in EnrichmentResult
     */
    private mapAgentResult(result: EnrichmentResult, agentName: string, data: any): void {
        switch (agentName) {
            case 'DCIResolver':
                result.dciResolver = data;
                break;
            case 'PharmaAnalyzer':
                result.pharmaAnalyzer = data;
                break;
            case 'ContextDeductor':
                result.contextDeductor = data;
                break;
            case 'OpportunityScout':
                result.opportunityScout = data;
                break;
            default:
                console.warn(`[EnrichmentOrchestrator] Unknown agent: ${agentName}`);
        }
    }

    /**
     * Get list of registered agents
     */
    getAgentNames(): string[] {
        return this.agents.map(a => a.name);
    }
}
