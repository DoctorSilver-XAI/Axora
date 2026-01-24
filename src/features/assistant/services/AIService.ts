import {
  AIProvider,
  Message,
  AIConfig,
  DEFAULT_SYSTEM_PROMPT,
  RAGTrace,
  RAGSource,
  AgentStreamCallbacks,
  AgentExecution,
  ToolCall,
  ToolResult,
} from '../types'
import { RAGService, RAGContext } from '@shared/services/rag'
import { AgentService } from './AgentService'

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const LOCAL_AI_ENDPOINT = import.meta.env.VITE_LOCAL_AI_ENDPOINT || 'http://localhost:11434'

interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

interface SendMessageOptions {
  /** Activer/désactiver le RAG (défaut: true pour mode classique, ignoré en mode agent) */
  useRAG?: boolean
  /** Callback avec trace RAG complète (mode classique uniquement) */
  onRAGTrace?: (trace: RAGTrace) => void
  /** Activer le mode agent avec Function Calling (défaut: true pour Mistral/OpenAI) */
  useAgent?: boolean
  /** Callbacks spécifiques au mode agent */
  agentCallbacks?: {
    onToolCall?: (toolCall: ToolCall) => void
    onToolResult?: (result: ToolResult, toolName: string) => void
    onAgentComplete?: (execution: AgentExecution) => void
    onIterationStart?: (iteration: number) => void
  }
}

export async function sendMessage(
  messages: Message[],
  config: AIConfig,
  callbacks: StreamCallbacks,
  options: SendMessageOptions = {}
): Promise<void> {
  const { provider, model, temperature = 0.7, maxTokens = 2048, systemPrompt = DEFAULT_SYSTEM_PROMPT } = config
  const { useRAG = true, onRAGTrace, useAgent, agentCallbacks } = options

  // === MODE AGENT (Function Calling) ===
  // Par défaut activé pour les providers compatibles (Mistral, OpenAI)
  const shouldUseAgent = useAgent ?? AgentService.supportsAgentMode(provider)

  if (shouldUseAgent && AgentService.supportsAgentMode(provider)) {
    console.log('[AIService] 🤖 Mode Agent activé')

    const agentStreamCallbacks: AgentStreamCallbacks = {
      onChunk: callbacks.onChunk,
      onToolCall: agentCallbacks?.onToolCall || ((tc) => console.log('[Agent] Tool call:', tc.function.name)),
      onToolResult:
        agentCallbacks?.onToolResult || ((_tr, name) => console.log('[Agent] Tool result:', name)),
      onComplete: (execution) => {
        // Appeler le callback de complétion standard
        callbacks.onComplete(execution.finalResponse || '')

        // Appeler le callback agent si fourni
        agentCallbacks?.onAgentComplete?.(execution)
      },
      onError: callbacks.onError,
      onIterationStart: agentCallbacks?.onIterationStart,
    }

    await AgentService.execute(
      messages,
      {
        provider,
        model,
        temperature,
        maxIterations: 10,
        timeoutMs: 60000,
      },
      agentStreamCallbacks
    )

    return
  }

  // === MODE CLASSIQUE (RAG auto-injecté) ===
  console.log('[AIService] 📄 Mode classique (RAG auto-injecté)')

  let enhancedSystemPrompt = systemPrompt

  // === INJECTION RAG AVEC TRAÇABILITÉ ===
  if (useRAG) {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()

    if (lastUserMessage) {
      const startTime = Date.now()
      let ragContext: RAGContext | null = null
      let searchType: RAGTrace['searchType'] = 'none'

      try {
        // Déterminer le type de recherche
        const query = lastUserMessage.content
        const hasCIP = /\b\d{13}\b/.test(query) || /\b\d{7}\b/.test(query)
        const hasCIS = /\b\d{8}\b/.test(query)

        if (hasCIP) searchType = 'exact_cip'
        else if (hasCIS) searchType = 'exact_cis'
        else if (RAGService.shouldUseRAG(query)) searchType = 'hybrid'

        // Exécuter la recherche RAG
        ragContext = await RAGService.getContextForAssistant(query)

        if (ragContext && ragContext.products.length > 0) {
          enhancedSystemPrompt = RAGService.buildEnhancedSystemPrompt(systemPrompt, ragContext)
          console.log(`[RAG] ✅ Contexte enrichi avec ${ragContext.products.length} produit(s)`)
        } else {
          console.log(`[RAG] ⚠️ Aucun résultat trouvé pour: "${query.slice(0, 50)}..."`)
        }
      } catch (err) {
        console.warn('[RAG] ❌ Erreur:', err)
        searchType = 'none'
      }

      // Générer la trace RAG
      const durationMs = Date.now() - startTime
      const trace: RAGTrace = {
        used: ragContext !== null && ragContext.products.length > 0,
        query: lastUserMessage.content,
        sources: ragContext?.products.map((p): RAGSource => ({
          id: p.id,
          name: p.productName,
          dci: p.dci || undefined,
          type: p.productData?.rag_metadata?.confidence_level === 'BDPM officiel' ? 'bdpm' : 'custom',
          score: p.combinedScore || p.vectorScore || 0,
        })) || [],
        searchType: ragContext?.products.length ? searchType : 'none',
        durationMs,
        timestamp: new Date(),
      }

      // Notifier avec la trace complète
      if (onRAGTrace) {
        onRAGTrace(trace)
      }

      // Log détaillé pour debugging
      console.log('[RAG] Trace:', {
        used: trace.used,
        searchType: trace.searchType,
        sourcesCount: trace.sources.length,
        durationMs: trace.durationMs,
        sources: trace.sources.map(s => `${s.name} (${s.type}, score: ${s.score.toFixed(2)})`),
      })
    }
  }

  const formattedMessages = [
    { role: 'system' as const, content: enhancedSystemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    switch (provider) {
      case 'mistral':
        await streamMistral(formattedMessages, model || 'mistral-large-latest', temperature, maxTokens, callbacks)
        break
      case 'openai':
        await streamOpenAI(formattedMessages, model || 'gpt-4o', temperature, maxTokens, callbacks)
        break
      case 'local':
        await streamLocal(formattedMessages, model || 'llama3', temperature, maxTokens, callbacks)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

async function streamMistral(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number,
  maxTokens: number,
  callbacks: StreamCallbacks
): Promise<void> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API key not configured')
  }

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mistral API error: ${error}`)
  }

  await processStream(response, callbacks)
}

async function streamOpenAI(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number,
  maxTokens: number,
  callbacks: StreamCallbacks
): Promise<void> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  await processStream(response, callbacks)
}

async function streamLocal(
  messages: Array<{ role: string; content: string }>,
  model: string,
  temperature: number,
  _maxTokens: number,
  callbacks: StreamCallbacks
): Promise<void> {
  // Ollama API format
  const response = await fetch(`${LOCAL_AI_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature,
      },
    }),
  })

  if (!response.ok) {
    throw new Error('Local AI not available. Make sure Ollama is running.')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.message?.content) {
          fullResponse += json.message.content
          callbacks.onChunk(json.message.content)
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  callbacks.onComplete(fullResponse)
}

async function processStream(response: Response, callbacks: StreamCallbacks): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            fullResponse += content
            callbacks.onChunk(content)
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  callbacks.onComplete(fullResponse)
}

export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []

  if (MISTRAL_API_KEY) providers.push('mistral')
  if (OPENAI_API_KEY) providers.push('openai')
  providers.push('local') // Always available (might fail at runtime)

  return providers
}

export function getProviderModels(provider: AIProvider): string[] {
  switch (provider) {
    case 'mistral':
      return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest']
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    case 'local':
      return ['llama3', 'mistral', 'codellama', 'phi3']
    default:
      return []
  }
}
