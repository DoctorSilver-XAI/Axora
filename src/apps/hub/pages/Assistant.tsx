import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, Settings, User, Bot, Loader2, X, AlertCircle, Trash2, PanelLeft, MessageSquare, Sparkles, Database, CheckCircle2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import {
  Message,
  AIConfig,
  Conversation,
  StorageType,
  RAGTrace,
  ToolCall,
  AgentExecution,
} from '@features/assistant/types'
import { sendMessage } from '@features/assistant/services/AIService'
import { useAIPreference } from '@features/assistant/hooks/useAIPreference'
import { getConversationService, UnifiedConversationService } from '@features/assistant/services/ConversationServiceFactory'
import { NewConversationModal } from '@features/assistant/components/NewConversationModal'
import { StorageBadge } from '@features/assistant/components/StorageBadge'
import { RAGSourcesIndicator } from '@features/assistant/components/RAGSourcesIndicator'
import { PROVIDER_LABELS, getModelDisplayName } from '@features/assistant/constants/providers'
import { MarkdownPreview } from '@modules/notes/components/MarkdownPreview'
import { QuickPromptsGrid } from '@features/assistant/components/QuickPromptsGrid'
import { QuickPrompt } from '@features/assistant/constants/quickPrompts'

// Animation variants pour effet premium
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

export function Assistant() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingRAGTrace, setStreamingRAGTrace] = useState<RAGTrace | null>(null)
  const [activeToolCalls, setActiveToolCalls] = useState<{ name: string; status: 'pending' | 'done' }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // AI Config
  const { provider: selectedProvider, model: selectedModel, systemPrompt } = useAIPreference()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  // Sync textarea height with input value (handles clear after send)
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle window resize for responsive sidebar (only collapse on small screens)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      }
      // Ne pas forcer l'ouverture sur grand écran - laisser l'utilisateur décider
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load conversations from both local and cloud storage on mount
  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await UnifiedConversationService.getAllFromBothStorages()
        setConversations(data)
      } catch (err) {
        console.error('Failed to load conversations:', err)
        setError('Impossible de charger les conversations')
      } finally {
        setIsLoading(false)
      }
    }
    loadConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.messages, streamingContent])



  const handleNewConversation = () => {
    setShowNewConversationModal(true)
  }

  const handleCreateConversation = async (storageType: StorageType) => {
    try {
      setError(null)
      const service = getConversationService(storageType)
      const newConversation = await service.create(selectedProvider, selectedModel)
      setConversations((prev) => [newConversation, ...prev])
      setCurrentConversation(newConversation)
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setError('Impossible de creer la conversation')
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      setError(null)
      // Load full conversation with messages using the appropriate service
      const service = getConversationService(conv.storageType)
      const fullConversation = await service.getById(conv.id)
      if (fullConversation) {
        setCurrentConversation(fullConversation)
        // Update in list
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? fullConversation : c))
        )
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setError('Impossible de charger la conversation')
    }
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      // Find the conversation to get its storage type
      const conv = conversations.find((c) => c.id === id)
      if (conv) {
        const service = getConversationService(conv.storageType)
        await service.delete(id)
      }
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (currentConversation?.id === id) {
        setCurrentConversation(null)
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      setError('Impossible de supprimer la conversation')
    }
  }

  const handleQuickPromptSelect = useCallback(async (prompt: QuickPrompt) => {
    // Si pas de conversation active, créer une conversation cloud automatiquement
    if (!currentConversation) {
      try {
        setError(null)
        const service = getConversationService('cloud')
        const newConversation = await service.create(selectedProvider, selectedModel)
        setConversations((prev) => [newConversation, ...prev])
        setCurrentConversation(newConversation)
      } catch (err) {
        console.error('Failed to create conversation:', err)
        setError('Impossible de créer la conversation')
        return
      }
    }
    setInput(prompt.prompt)
  }, [currentConversation, selectedProvider, selectedModel])

  const updateConversationMessages = useCallback((conversationId: string, updater: (msgs: Message[]) => Message[]) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, messages: updater(conv.messages) } : conv
      )
    )
    setCurrentConversation((prev) =>
      prev?.id === conversationId ? { ...prev, messages: updater(prev.messages) } : prev
    )
  }, [])

  const updateConversationTitle = useCallback(async (conversationId: string, firstMessage: string, storageType: StorageType) => {
    const title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '')
    try {
      const service = getConversationService(storageType)
      await service.updateTitle(conversationId, title)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, title } : conv
        )
      )
      setCurrentConversation((prev) =>
        prev?.id === conversationId ? { ...prev, title } : prev
      )
    } catch (err) {
      console.error('Failed to update title:', err)
    }
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversation || isStreaming) return

    const userContent = input.trim()
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingRAGTrace(null)
    setActiveToolCalls([])
    setError(null)

    // Variable pour stocker la trace RAG reçue pendant le streaming
    let capturedRAGTrace: RAGTrace | null = null

    // Get the appropriate service based on storage type
    const service = getConversationService(currentConversation.storageType)

    try {
      // Add user message using the appropriate service
      const userMessage = await service.addMessage(
        currentConversation.id,
        'user',
        userContent,
        selectedProvider,
        selectedModel
      )

      // Update local state
      updateConversationMessages(currentConversation.id, (msgs) => [...msgs, userMessage])

      // Update title if first message
      if (currentConversation.messages.length === 0) {
        await updateConversationTitle(currentConversation.id, userContent, currentConversation.storageType)
      }

      const config: AIConfig = {
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt,
      }

      const allMessages: Message[] = [
        ...currentConversation.messages,
        userMessage,
      ]

      await sendMessage(allMessages, config, {
        onChunk: (chunk) => {
          setStreamingContent((prev) => prev + chunk)
        },
        onComplete: async (fullResponse) => {
          try {
            // Add assistant message with RAG trace
            const assistantMessage = await service.addMessage(
              currentConversation.id,
              'assistant',
              fullResponse,
              selectedProvider,
              selectedModel
            )
            // Attacher la trace RAG au message
            assistantMessage.ragTrace = capturedRAGTrace || undefined
            updateConversationMessages(currentConversation.id, (msgs) => [...msgs, assistantMessage])
          } catch (err) {
            console.error('Failed to save assistant message:', err)
          }
          setStreamingContent('')
          setStreamingRAGTrace(null)
          setActiveToolCalls([])
          setIsStreaming(false)
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
          setStreamingContent('')
          setStreamingRAGTrace(null)
          setActiveToolCalls([])
        },
      }, {
        useRAG: true,
        onRAGTrace: (trace) => {
          // Stocker la trace pour l'attacher au message
          capturedRAGTrace = trace
          setStreamingRAGTrace(trace)
        },
        // Callbacks mode agent
        agentCallbacks: {
          onToolCall: (toolCall: ToolCall) => {
            setActiveToolCalls((prev) => [...prev, { name: toolCall.function.name, status: 'pending' }])
          },
          onToolResult: (_result, toolName) => {
            setActiveToolCalls((prev) =>
              prev.map((tc) => (tc.name === toolName && tc.status === 'pending' ? { ...tc, status: 'done' } : tc))
            )
          },
          onAgentComplete: (execution: AgentExecution) => {
            console.log('[Agent] Exécution complète:', {
              toolsUsed: execution.toolsUsed,
              iterations: execution.iterationCount,
              duration: execution.totalDurationMs,
            })
          },
        },
      })
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Impossible d\'envoyer le message')
      setIsStreaming(false)
      setStreamingRAGTrace(null)
    }
  }

  return (
    <div className="flex gap-6 h-full -m-6 relative overflow-hidden">
      {/* Sidebar Toggle Button (Floating when closed) */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 p-2 rounded-lg bg-surface-100 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors shadow-lg"
          >
            <PanelLeft className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Conversations sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-surface-50/80 backdrop-blur-xl border-r border-white/5 flex flex-col flex-shrink-0 relative"
          >
            {/* Header avec nouveau bouton */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleNewConversation}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-axora-500 to-violet-500 text-white font-medium hover:from-axora-600 hover:to-violet-600 transition-all shadow-lg shadow-axora-500/20"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle conversation
                </motion.button>
                <motion.button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-3 rounded-xl bg-surface-100/50 border border-white/5 text-white/40 hover:bg-surface-100/70 hover:text-white transition-all"
                  title="Masquer la barre latérale"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PanelLeft className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Liste des conversations */}
            <div className="flex-1 overflow-auto p-3 scrollbar-thin">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-axora-400 animate-spin" />
                  <span className="text-sm text-white/40">Chargement...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-100/50 border border-white/5 flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-white/30" />
                  </div>
                  <p className="text-sm text-white/40 text-center">
                    Aucune conversation
                  </p>
                  <p className="text-xs text-white/30 text-center mt-1">
                    Cliquez sur le bouton ci-dessus pour commencer
                  </p>
                </div>
              ) : (
                <motion.div
                  className="space-y-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {conversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      variants={itemVariants}
                      onClick={() => handleSelectConversation(conv)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectConversation(conv)}
                      className={cn(
                        'w-full p-3.5 rounded-xl text-left transition-all duration-200 group cursor-pointer relative overflow-hidden',
                        currentConversation?.id === conv.id
                          ? 'bg-axora-500/10 border border-axora-500/20'
                          : 'bg-surface-100/30 border border-white/5 hover:bg-surface-100/50 hover:border-white/10'
                      )}
                    >
                      {/* Indicateur actif */}
                      {currentConversation?.id === conv.id && (
                        <motion.div
                          layoutId="conversation-indicator"
                          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-axora-400"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 pl-2">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm font-medium truncate flex-1 transition-colors",
                              currentConversation?.id === conv.id ? "text-white" : "text-white/80"
                            )}>
                              {conv.title}
                            </p>
                            <StorageBadge storageType={conv.storageType} />
                          </div>
                          <p className="text-[11px] text-white/40 mt-1.5 flex items-center gap-1.5">
                            <span>{conv.createdAt.toLocaleDateString('fr-FR')}</span>
                            <span className="text-white/20">•</span>
                            <span>{PROVIDER_LABELS[conv.provider]}</span>
                          </p>
                        </div>
                        <motion.button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Provider info (premium style) */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-100/30 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-axora-500/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-axora-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90">{PROVIDER_LABELS[selectedProvider]}</p>
                  <p className="text-[11px] text-white/40 truncate">{selectedModel}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversation ? (
          <>
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border-b border-red-500/20 backdrop-blur-xl"
                >
                  <div className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                    <motion.button
                      onClick={() => setError(null)}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {currentConversation.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </AnimatePresence>

              {/* Streaming response */}
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-axora-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-axora-500/20">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[75%] px-5 py-4 rounded-2xl bg-surface-100/50 border border-white/5 backdrop-blur-xl">
                    {/* Indicateur des outils en cours d'exécution */}
                    {activeToolCalls.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {activeToolCalls.map((tc, idx) => (
                          <motion.div
                            key={`${tc.name}-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-axora-500/10 border border-axora-500/20"
                          >
                            {tc.status === 'pending' ? (
                              <Loader2 className="w-3 h-3 text-axora-400 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                            <Database className="w-3 h-3 text-axora-400" />
                            <span className="text-xs text-white/70">
                              {tc.name === 'search_bdpm' && 'Recherche BDPM...'}
                              {tc.name === 'search_by_cip' && 'Recherche par CIP...'}
                              {tc.name === 'get_generiques' && 'Recherche génériques...'}
                              {tc.name === 'check_disponibilite' && 'Vérification disponibilité...'}
                              {tc.name === 'calculate_dosage' && 'Calcul posologie...'}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {streamingContent ? (
                      <div className="relative">
                        <MarkdownPreview
                          content={streamingContent}
                          className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2"
                        />
                        <span className="inline-block w-1.5 h-4 bg-axora-400 ml-1 animate-pulse rounded-sm align-middle" />
                        {/* Indicateur RAG pendant le streaming */}
                        {streamingRAGTrace && (
                          <RAGSourcesIndicator trace={streamingRAGTrace} />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-axora-400 animate-spin" />
                        <span className="text-white/60 text-sm">
                          {activeToolCalls.length > 0
                            ? 'Agent en action...'
                            : streamingRAGTrace?.used
                              ? `Contexte RAG: ${streamingRAGTrace.sources.length} source(s)...`
                              : 'Réflexion en cours...'}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input compact */}
            <div className="p-3 border-t border-white/5 bg-surface-50/30 backdrop-blur-xl">
              {/* Quick prompts pour conversation vide */}
              {currentConversation.messages.length === 0 && !isStreaming && (
                <div className="mb-2">
                  <QuickPromptsGrid
                    onSelectPrompt={handleQuickPromptSelect}
                    variant="inline"
                    maxItems={4}
                  />
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      adjustTextareaHeight()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Posez votre question..."
                    disabled={isStreaming}
                    rows={1}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-surface-100/50 border border-white/5 text-white placeholder-white/30 focus:bg-surface-100/70 focus:border-axora-500/30 focus:outline-none transition-all duration-200 disabled:opacity-50 resize-none overflow-hidden"
                  />
                </div>
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'p-2.5 rounded-lg font-medium transition-all duration-200',
                    'flex items-center justify-center',
                    input.trim() && !isStreaming
                      ? 'bg-gradient-to-r from-axora-500 to-violet-500 text-white shadow-md shadow-axora-500/25 hover:from-axora-600 hover:to-violet-600'
                      : 'bg-surface-100/50 border border-white/5 text-white/30 cursor-not-allowed'
                  )}
                  whileHover={input.trim() && !isStreaming ? { scale: 1.05 } : {}}
                  whileTap={input.trim() && !isStreaming ? { scale: 0.95 } : {}}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          /* État vide premium */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center max-w-lg">
              {/* Icône premium avec glow */}
              <motion.div
                className="relative w-20 h-20 mx-auto mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-axora-500 to-violet-500 opacity-20 blur-xl" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-axora-500/20 to-violet-500/20 border border-axora-500/30 flex items-center justify-center">
                  <Bot className="w-9 h-9 text-axora-400" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-semibold text-white mb-3 tracking-tight">
                Assistant IA Axora
              </h2>
              <p className="text-white/50 leading-relaxed">
                Posez vos questions sur les médicaments, interactions, posologies et bien plus.
              </p>

              {/* Badge provider */}
              <div
                className="flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-full bg-surface-100/50 border border-white/5 mx-auto w-fit"
                title={`API: ${selectedModel}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-axora-400" />
                <span className="text-xs font-medium text-white/60">
                  {getModelDisplayName(selectedProvider, selectedModel)}
                </span>
              </div>

              <motion.button
                onClick={handleNewConversation}
                className="mt-8 px-8 py-3.5 rounded-xl bg-gradient-to-r from-axora-500 to-violet-500 text-white font-medium hover:from-axora-600 hover:to-violet-600 transition-all shadow-lg shadow-axora-500/25"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Démarrer une conversation
              </motion.button>
            </div>

            {/* Quick Prompts Grid */}
            <QuickPromptsGrid
              onSelectPrompt={handleQuickPromptSelect}
              variant="grid"
              maxItems={6}
            />
          </motion.div>
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onConfirm={handleCreateConversation}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
      />
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar compact */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md',
          isUser
            ? 'bg-gradient-to-br from-cyan-500 to-teal-500 shadow-cyan-500/20'
            : 'bg-gradient-to-br from-axora-500 to-violet-500 shadow-axora-500/20'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Message bubble compact */}
      <div
        className={cn(
          'max-w-[80%] px-3.5 py-2.5 rounded-xl backdrop-blur-xl transition-all duration-200',
          isUser
            ? 'bg-cyan-500/15 border border-cyan-500/20'
            : 'bg-surface-100/50 border border-white/5'
        )}
      >
        {isUser ? (
          <p className="text-xs whitespace-pre-wrap leading-relaxed text-white/90">
            {message.content}
          </p>
        ) : (
          <>
            <MarkdownPreview
              content={message.content}
              className="text-xs leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5"
            />
            {/* Indicateur sources RAG */}
            {message.ragTrace && (
              <RAGSourcesIndicator trace={message.ragTrace} />
            )}
          </>
        )}
        <p className={cn(
          "text-[9px] mt-1.5 flex items-center gap-1",
          isUser ? "text-cyan-400/60" : "text-white/30"
        )}>
          {message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}
