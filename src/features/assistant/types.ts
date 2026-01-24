export type AIProvider = 'mistral' | 'openai' | 'local'

export type StorageType = 'local' | 'cloud'

/**
 * Représente une source RAG utilisée pour enrichir une réponse
 */
export interface RAGSource {
  id: string
  name: string
  dci?: string
  type: 'bdpm' | 'custom' // bdpm = données officielles ANSM, custom = catalogue enrichi
  score: number // Score de pertinence (0-1)
}

/**
 * Trace RAG attachée à un message assistant
 * Permet de savoir si/comment le RAG a été utilisé
 */
export interface RAGTrace {
  used: boolean // RAG a-t-il été invoqué ?
  query: string // Requête originale
  sources: RAGSource[] // Sources trouvées
  searchType: 'hybrid' | 'exact_cip' | 'exact_cis' | 'dci' | 'none'
  durationMs: number // Temps de recherche
  timestamp: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  provider?: AIProvider
  /** Trace RAG (uniquement pour les messages assistant) */
  ragTrace?: RAGTrace
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

// ============================================
// TYPES AGENT - ARCHITECTURE FUNCTION CALLING
// ============================================

/**
 * Définition d'un paramètre d'outil (JSON Schema)
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: ToolParameter
  required?: boolean
}

/**
 * Définition d'une fonction d'outil au format OpenAI/Mistral
 */
export interface ToolFunction {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required: string[]
  }
}

/**
 * Définition complète d'un outil
 */
export interface Tool {
  type: 'function'
  function: ToolFunction
}

/**
 * Appel d'outil émis par le LLM
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string des arguments
  }
}

/**
 * Résultat d'exécution d'un outil
 */
export interface ToolResult {
  tool_call_id: string
  role: 'tool'
  content: string // JSON string du résultat
}

/**
 * Type d'étape dans la boucle agent
 */
export type AgentStepType = 'thinking' | 'tool_call' | 'tool_result' | 'response'

/**
 * Étape individuelle de l'exécution agent
 */
export interface AgentStep {
  stepNumber: number
  type: AgentStepType
  toolCall?: ToolCall
  toolResult?: ToolResult
  content?: string // Contenu textuel (thinking ou réponse)
  timestamp: Date
  durationMs?: number
}

/**
 * Exécution complète d'un cycle agent
 */
export interface AgentExecution {
  id: string
  steps: AgentStep[]
  finalResponse?: string
  totalDurationMs: number
  toolsUsed: string[]
  iterationCount: number
  success: boolean
  error?: string
}

/**
 * Callbacks pour le streaming agent
 */
export interface AgentStreamCallbacks {
  /** Appelé pour chaque chunk de texte streamé */
  onChunk: (text: string) => void
  /** Appelé quand le LLM décide d'utiliser un outil */
  onToolCall: (toolCall: ToolCall) => void
  /** Appelé quand un outil a terminé son exécution */
  onToolResult: (result: ToolResult, toolName: string) => void
  /** Appelé quand l'exécution agent est terminée */
  onComplete: (execution: AgentExecution) => void
  /** Appelé en cas d'erreur */
  onError: (error: Error) => void
  /** Appelé pour signaler le début d'une nouvelle itération */
  onIterationStart?: (iterationNumber: number) => void
}

/**
 * Configuration d'exécution de l'agent
 */
export interface AgentConfig {
  /** Provider AI à utiliser */
  provider: AIProvider
  /** Modèle spécifique (optionnel) */
  model?: string
  /** Température (0-1) */
  temperature?: number
  /** Nombre max d'itérations de la boucle agent */
  maxIterations?: number
  /** Timeout total en ms */
  timeoutMs?: number
  /** Outils activés (par défaut: tous) */
  enabledTools?: string[]
}
