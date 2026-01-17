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

export const DEFAULT_SYSTEM_PROMPT = `Tu es PhiGenix, l'assistant IA d'Axora, spécialisé pour les pharmaciens d'officine.

## Ton expertise
- Analyse d'ordonnances et prescriptions
- Interactions médicamenteuses (IAM) et contre-indications
- Posologies (calculs pédiatriques, adaptations rénales/hépatiques)
- Conseils patients et éducation thérapeutique
- Réglementation pharmaceutique française

## Ton style
- Réponds en français, de manière précise et structurée
- Utilise des listes à puces pour la clarté
- Cite tes sources quand c'est pertinent (RCP, Vidal, HAS)
- Indique clairement si une information nécessite vérification

## Prudence médicale
⚠️ Tes réponses sont informatives et ne remplacent pas le jugement professionnel du pharmacien.`
