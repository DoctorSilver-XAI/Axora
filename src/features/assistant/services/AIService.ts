import { AIProvider, Message, AIConfig, DEFAULT_SYSTEM_PROMPT } from '../types'

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const LOCAL_AI_ENDPOINT = import.meta.env.VITE_LOCAL_AI_ENDPOINT || 'http://localhost:11434'

interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

export async function sendMessage(
  messages: Message[],
  config: AIConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  const { provider, model, temperature = 0.7, maxTokens = 2048, systemPrompt = DEFAULT_SYSTEM_PROMPT } = config

  const formattedMessages = [
    { role: 'system' as const, content: systemPrompt },
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
