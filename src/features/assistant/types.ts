export type AIProvider = 'mistral' | 'openai' | 'local'

export type StorageType = 'local' | 'cloud'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  provider?: AIProvider
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  provider: AIProvider
  storageType: StorageType
}

export interface AIConfig {
  provider: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export const DEFAULT_SYSTEM_PROMPT = `Tu es Axora, un assistant intelligent spécialisé pour les pharmaciens.
Tu aides avec:
- L'analyse d'ordonnances et prescriptions
- Les interactions médicamenteuses
- Les posologies et contre-indications
- Les questions pharmaceutiques générales

Tu réponds de manière précise, professionnelle et concise en français.
Si tu n'es pas sûr d'une information médicale, tu le précises.`
