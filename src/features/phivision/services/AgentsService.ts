/**
 * AgentsService - Orchestration des agents PhiBRAIN
 * Support Mistral et OpenAI avec exécution parallèle
 */

import type {
  AgentsResults,
  PhiAgentResult,
  PhiMedsOutput,
  PhiAdvicesOutput,
  PhiCrossSellOutput,
  PhiChipsOutput,
  AgentName,
} from '../types/agents'
import {
  PHI_MEDS_SYSTEM_PROMPT,
  PHI_ADVICES_SYSTEM_PROMPT,
  PHI_CROSS_SELL_SYSTEM_PROMPT,
  PHI_CHIPS_SYSTEM_PROMPT,
  buildPhiMedsUserPrompt,
  buildPhiAdvicesUserPrompt,
  buildPhiCrossSellUserPrompt,
  buildPhiChipsUserPrompt,
  extractAgentContext,
  type AgentContext,
} from './agentPrompts'

// =============================================================================
// Types & Config
// =============================================================================

export type AIProvider = 'mistral' | 'openai'

export interface AgentConfig {
  provider: AIProvider
  model: string
  temperature?: number
}

export interface AgentsServiceConfig {
  defaultProvider: AIProvider
  mistralApiKey?: string
  openaiApiKey?: string
  agentConfigs?: Partial<Record<AgentName, AgentConfig>>
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  mistral: 'mistral-small-latest',
  openai: 'gpt-4o-mini',
}

// =============================================================================
// AgentsService
// =============================================================================

export const AgentsService = {
  config: null as AgentsServiceConfig | null,

  /**
   * Configure le service avec les clés API
   */
  configure(config: AgentsServiceConfig): void {
    this.config = config
  },

  /**
   * Lance tous les agents en parallèle
   */
  async runAllAgents(phiBrainResult: Record<string, unknown>): Promise<AgentsResults> {
    if (!this.config) {
      throw new Error('AgentsService not configured. Call configure() first.')
    }

    const context = extractAgentContext(phiBrainResult)

    if (context.medications.length === 0) {
      console.warn('[AgentsService] No medications found in context')
    }

    // Exécuter tous les agents en parallèle
    const [medsResult, advicesResult, crossSellResult, chipsResult] = await Promise.allSettled([
      this.runPhiMeds(context),
      this.runPhiAdvices(context),
      this.runPhiCrossSell(context),
      this.runPhiChips(context),
    ])

    return {
      phiMeds: medsResult.status === 'fulfilled' ? medsResult.value : this.createErrorResult('PhiMEDS', medsResult.reason),
      phiAdvices: advicesResult.status === 'fulfilled' ? advicesResult.value : this.createErrorResult('PhiADVICES', advicesResult.reason),
      phiCrossSell: crossSellResult.status === 'fulfilled' ? crossSellResult.value : this.createErrorResult('PhiCROSS_SELL', crossSellResult.reason),
      phiChips: chipsResult.status === 'fulfilled' ? chipsResult.value : this.createErrorResult('PhiCHIPS', chipsResult.reason),
    }
  },

  /**
   * PhiMEDS - Traitement des médicaments
   */
  async runPhiMeds(context: AgentContext): Promise<PhiAgentResult<PhiMedsOutput>> {
    const startedAt = new Date()
    const agentConfig = this.getAgentConfig('PhiMEDS')

    try {
      const response = await this.callAI(
        agentConfig,
        PHI_MEDS_SYSTEM_PROMPT,
        buildPhiMedsUserPrompt(context.medications)
      )

      const output = this.parseJsonResponse<PhiMedsOutput>(response)

      return {
        agent: 'PhiMEDS',
        status: 'success',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        input: { medications: context.medications },
        output,
      }
    } catch (error) {
      return this.createErrorResult('PhiMEDS', error, startedAt, { medications: context.medications })
    }
  },

  /**
   * PhiADVICES - Conseils patients
   */
  async runPhiAdvices(context: AgentContext): Promise<PhiAgentResult<PhiAdvicesOutput>> {
    const startedAt = new Date()
    const agentConfig = this.getAgentConfig('PhiADVICES')

    try {
      const response = await this.callAI(
        agentConfig,
        PHI_ADVICES_SYSTEM_PROMPT,
        buildPhiAdvicesUserPrompt({
          patientAge: context.patientAge,
          isMinor: context.isMinor,
          prescriberSpecialty: context.prescriberSpecialty,
          medications: context.medications,
        })
      )

      const output = this.parseJsonResponse<PhiAdvicesOutput>(response)

      return {
        agent: 'PhiADVICES',
        status: 'success',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        input: context,
        output,
      }
    } catch (error) {
      return this.createErrorResult('PhiADVICES', error, startedAt, context)
    }
  },

  /**
   * PhiCROSS_SELL - Suggestions cross-selling
   */
  async runPhiCrossSell(context: AgentContext): Promise<PhiAgentResult<PhiCrossSellOutput>> {
    const startedAt = new Date()
    const agentConfig = this.getAgentConfig('PhiCROSS_SELL')

    try {
      const response = await this.callAI(
        agentConfig,
        PHI_CROSS_SELL_SYSTEM_PROMPT,
        buildPhiCrossSellUserPrompt({
          patientAge: context.patientAge,
          isMinor: context.isMinor,
          prescriberSpecialty: context.prescriberSpecialty,
          medications: context.medications,
        })
      )

      const output = this.parseJsonResponse<PhiCrossSellOutput>(response)

      return {
        agent: 'PhiCROSS_SELL',
        status: 'success',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        input: context,
        output,
      }
    } catch (error) {
      return this.createErrorResult('PhiCROSS_SELL', error, startedAt, context)
    }
  },

  /**
   * PhiCHIPS - Micro-rappels
   */
  async runPhiChips(context: AgentContext): Promise<PhiAgentResult<PhiChipsOutput>> {
    const startedAt = new Date()
    const agentConfig = this.getAgentConfig('PhiCHIPS')

    try {
      const response = await this.callAI(
        agentConfig,
        PHI_CHIPS_SYSTEM_PROMPT,
        buildPhiChipsUserPrompt({
          patientAge: context.patientAge,
          isMinor: context.isMinor,
          prescriberSpecialty: context.prescriberSpecialty,
          medications: context.medications,
        })
      )

      const output = this.parseJsonResponse<PhiChipsOutput>(response)

      return {
        agent: 'PhiCHIPS',
        status: 'success',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        input: context,
        output,
      }
    } catch (error) {
      return this.createErrorResult('PhiCHIPS', error, startedAt, context)
    }
  },

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  getAgentConfig(agent: AgentName): AgentConfig {
    const defaultProvider = this.config?.defaultProvider || 'mistral'
    const customConfig = this.config?.agentConfigs?.[agent]

    return {
      provider: customConfig?.provider || defaultProvider,
      model: customConfig?.model || DEFAULT_MODELS[customConfig?.provider || defaultProvider],
      temperature: customConfig?.temperature ?? 0.3,
    }
  },

  async callAI(config: AgentConfig, systemPrompt: string, userPrompt: string): Promise<string> {
    if (config.provider === 'mistral') {
      return this.callMistral(config, systemPrompt, userPrompt)
    } else {
      return this.callOpenAI(config, systemPrompt, userPrompt)
    }
  },

  async callMistral(config: AgentConfig, systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = this.config?.mistralApiKey
    if (!apiKey) {
      throw new Error('Mistral API key not configured')
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  },

  async callOpenAI(config: AgentConfig, systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = this.config?.openaiApiKey
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  },

  parseJsonResponse<T>(response: string): T {
    try {
      // Essayer de parser directement
      return JSON.parse(response) as T
    } catch {
      // Essayer d'extraire le JSON avec regex
      const match = response.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0]) as T
      }
      throw new Error('Failed to parse JSON response')
    }
  },

  createErrorResult<T>(
    agent: AgentName,
    error: unknown,
    startedAt?: Date,
    input?: Record<string, unknown>
  ): PhiAgentResult<T> {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[AgentsService] ${agent} error:`, errorMessage)

    return {
      agent,
      status: 'error',
      startedAt: startedAt || new Date(),
      completedAt: new Date(),
      durationMs: startedAt ? Date.now() - startedAt.getTime() : 0,
      input: input || {},
      output: null,
      error: errorMessage,
    }
  },
}

// =============================================================================
// Helper pour initialiser le service avec les variables d'environnement
// =============================================================================

export function initializeAgentsService(): void {
  // @ts-expect-error - Vite env
  const mistralKey = import.meta.env?.VITE_MISTRAL_API_KEY as string | undefined
  // @ts-expect-error - Vite env
  const openaiKey = import.meta.env?.VITE_OPENAI_API_KEY as string | undefined

  AgentsService.configure({
    defaultProvider: 'mistral',
    mistralApiKey: mistralKey,
    openaiApiKey: openaiKey,
  })

  console.log('[AgentsService] Initialized with providers:', {
    mistral: !!mistralKey,
    openai: !!openaiKey,
  })
}
