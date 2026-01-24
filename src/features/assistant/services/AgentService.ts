/**
 * AgentService - Orchestrateur de la boucle agent
 *
 * Transforme le LLM passif en agent actif capable de :
 * - Réfléchir à la question
 * - Décider d'utiliser des outils (Function Calling)
 * - Exécuter les outils
 * - Analyser les résultats
 * - Itérer jusqu'à avoir une réponse complète
 */

import {
  AIProvider,
  Message,
  AgentConfig,
  AgentStreamCallbacks,
  AgentExecution,
  ToolCall,
} from '../types'
import { buildAgentSystemPrompt } from './AgentPrompts'
import { getToolsForAPI, executeToolCall } from './AgentTools'

// ============================================
// CONFIGURATION
// ============================================

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

const DEFAULT_MAX_ITERATIONS = 10
const DEFAULT_TIMEOUT_MS = 60000

// ============================================
// TYPES INTERNES
// ============================================

interface APIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface StreamChunk {
  id: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string | null
      tool_calls?: Array<{
        index: number
        id?: string
        type?: string
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason: 'stop' | 'tool_calls' | 'length' | null
  }>
}

// ============================================
// SERVICE PRINCIPAL
// ============================================

export const AgentService = {
  /**
   * Exécute la boucle agent complète
   */
  async execute(
    messages: Message[],
    config: AgentConfig,
    callbacks: AgentStreamCallbacks
  ): Promise<AgentExecution> {
    const startTime = Date.now()
    const executionId = crypto.randomUUID()
    const maxIterations = config.maxIterations || DEFAULT_MAX_ITERATIONS
    const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS

    const execution: AgentExecution = {
      id: executionId,
      steps: [],
      toolsUsed: [],
      iterationCount: 0,
      totalDurationMs: 0,
      success: false,
    }

    // Construire les messages initiaux
    const apiMessages: APIMessage[] = [
      { role: 'system', content: buildAgentSystemPrompt({ includeToolReminder: true }) },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Obtenir les outils
    const tools = getToolsForAPI()

    try {
      // Boucle agent
      while (execution.iterationCount < maxIterations) {
        // Vérification timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Timeout: exécution dépassée (${timeoutMs}ms)`)
        }

        execution.iterationCount++
        callbacks.onIterationStart?.(execution.iterationCount)

        console.log(`[Agent] === Itération ${execution.iterationCount}/${maxIterations} ===`)

        // Appeler le LLM avec les tools
        const { content, toolCalls, finishReason } = await this.callLLM(
          apiMessages,
          tools,
          config,
          callbacks
        )

        // Cas 1: Réponse finale (stop)
        if (finishReason === 'stop' || !toolCalls || toolCalls.length === 0) {
          execution.finalResponse = content || ''
          execution.success = true

          // Ajouter l'étape finale
          execution.steps.push({
            stepNumber: execution.steps.length + 1,
            type: 'response',
            content: execution.finalResponse,
            timestamp: new Date(),
          })

          break
        }

        // Cas 2: Tool calls
        if (finishReason === 'tool_calls' && toolCalls.length > 0) {
          // Ajouter le message assistant avec tool_calls
          apiMessages.push({
            role: 'assistant',
            content: content,
            tool_calls: toolCalls,
          })

          // Exécuter chaque tool call
          for (const toolCall of toolCalls) {
            // Notifier le début de l'exécution
            callbacks.onToolCall(toolCall)

            // Enregistrer l'étape
            execution.steps.push({
              stepNumber: execution.steps.length + 1,
              type: 'tool_call',
              toolCall,
              timestamp: new Date(),
            })

            // Exécuter l'outil
            const stepStartTime = Date.now()
            const toolResult = await executeToolCall(toolCall)
            const stepDuration = Date.now() - stepStartTime

            // Notifier le résultat
            callbacks.onToolResult(toolResult, toolCall.function.name)

            // Enregistrer l'outil utilisé
            if (!execution.toolsUsed.includes(toolCall.function.name)) {
              execution.toolsUsed.push(toolCall.function.name)
            }

            // Enregistrer l'étape résultat
            execution.steps.push({
              stepNumber: execution.steps.length + 1,
              type: 'tool_result',
              toolResult,
              durationMs: stepDuration,
              timestamp: new Date(),
            })

            // Ajouter le résultat aux messages
            apiMessages.push({
              role: 'tool',
              content: toolResult.content,
              tool_call_id: toolResult.tool_call_id,
            })
          }
        }
      }

      // Si on atteint max iterations sans stop
      if (!execution.success) {
        execution.error = `Nombre maximum d'itérations atteint (${maxIterations})`
        console.warn(`[Agent] ⚠️ ${execution.error}`)
      }
    } catch (error) {
      execution.error = error instanceof Error ? error.message : 'Erreur inconnue'
      execution.success = false
      callbacks.onError(error instanceof Error ? error : new Error(execution.error))
    }

    execution.totalDurationMs = Date.now() - startTime
    callbacks.onComplete(execution)

    console.log(
      `[Agent] ✅ Exécution terminée en ${execution.totalDurationMs}ms, ` +
        `${execution.iterationCount} itération(s), ` +
        `${execution.toolsUsed.length} outil(s) utilisé(s)`
    )

    return execution
  },

  /**
   * Appelle le LLM avec streaming et retourne le résultat
   */
  async callLLM(
    messages: APIMessage[],
    tools: ReturnType<typeof getToolsForAPI>,
    config: AgentConfig,
    callbacks: AgentStreamCallbacks
  ): Promise<{
    content: string | null
    toolCalls: ToolCall[] | null
    finishReason: 'stop' | 'tool_calls' | 'length' | null
  }> {
    const { provider, model, temperature = 0.7 } = config

    // Sélectionner l'API selon le provider
    const apiConfig = this.getAPIConfig(provider, model)

    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: messages.map((m) => {
          // Formater selon le format attendu par l'API
          if (m.role === 'tool') {
            return {
              role: 'tool',
              content: m.content,
              tool_call_id: m.tool_call_id,
            }
          }
          if (m.tool_calls) {
            return {
              role: 'assistant',
              content: m.content,
              tool_calls: m.tool_calls,
            }
          }
          return {
            role: m.role,
            content: m.content,
          }
        }),
        tools,
        tool_choice: 'auto',
        temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error (${provider}): ${errorText}`)
    }

    // Parser le stream
    return this.parseStream(response, callbacks)
  },

  /**
   * Parse le stream SSE et extrait content, tool_calls, finish_reason
   */
  async parseStream(
    response: Response,
    callbacks: AgentStreamCallbacks
  ): Promise<{
    content: string | null
    toolCalls: ToolCall[] | null
    finishReason: 'stop' | 'tool_calls' | 'length' | null
  }> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let content = ''
    let finishReason: 'stop' | 'tool_calls' | 'length' | null = null

    // Accumulation des tool_calls (ils arrivent en morceaux)
    const toolCallsMap = new Map<
      number,
      { id: string; type: string; function: { name: string; arguments: string } }
    >()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const json: StreamChunk = JSON.parse(data)
          const choice = json.choices?.[0]

          if (!choice) continue

          // Extraire le contenu textuel
          if (choice.delta?.content) {
            content += choice.delta.content
            callbacks.onChunk(choice.delta.content)
          }

          // Extraire les tool_calls (arrivent en morceaux)
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const existing = toolCallsMap.get(tc.index)

              if (!existing) {
                // Nouveau tool_call
                toolCallsMap.set(tc.index, {
                  id: tc.id || '',
                  type: tc.type || 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  },
                })
              } else {
                // Mise à jour incrémentale
                if (tc.id) existing.id = tc.id
                if (tc.function?.name) existing.function.name += tc.function.name
                if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
              }
            }
          }

          // Extraire finish_reason
          if (choice.finish_reason) {
            finishReason = choice.finish_reason as 'stop' | 'tool_calls' | 'length'
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Convertir la map en array de ToolCall
    const toolCalls: ToolCall[] | null =
      toolCallsMap.size > 0
        ? Array.from(toolCallsMap.values()).map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }))
        : null

    console.log('[Agent] Stream parsed:', {
      contentLength: content.length,
      toolCallsCount: toolCalls?.length || 0,
      finishReason,
    })

    return {
      content: content || null,
      toolCalls,
      finishReason,
    }
  },

  /**
   * Retourne la configuration API pour un provider
   */
  getAPIConfig(
    provider: AIProvider,
    model?: string
  ): { endpoint: string; apiKey: string; model: string } {
    switch (provider) {
      case 'mistral':
        if (!MISTRAL_API_KEY) throw new Error('Mistral API key not configured')
        return {
          endpoint: 'https://api.mistral.ai/v1/chat/completions',
          apiKey: MISTRAL_API_KEY,
          model: model || 'mistral-large-latest',
        }

      case 'openai':
        if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured')
        return {
          endpoint: 'https://api.openai.com/v1/chat/completions',
          apiKey: OPENAI_API_KEY,
          model: model || 'gpt-4o',
        }

      case 'local':
        throw new Error('Local provider does not support Function Calling. Use Mistral or OpenAI.')

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  },

  /**
   * Vérifie si un provider supporte le mode agent (Function Calling)
   */
  supportsAgentMode(provider: AIProvider): boolean {
    return provider === 'mistral' || provider === 'openai'
  },
}
