import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, Settings, User, Bot, Loader2, ChevronDown, X, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { Message, AIProvider, AIConfig, Conversation, StorageType } from '@features/assistant/types'
import { sendMessage, getAvailableProviders, getProviderModels } from '@features/assistant/services/AIService'
import { getConversationService, UnifiedConversationService } from '@features/assistant/services/ConversationServiceFactory'
import { NewConversationModal } from '@features/assistant/components/NewConversationModal'
import { StorageBadge } from '@features/assistant/components/StorageBadge'

const PROVIDER_LABELS: Record<AIProvider, string> = {
  mistral: 'Mistral AI',
  openai: 'OpenAI',
  local: 'Local (Ollama)',
}

export function Assistant() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showProviderMenu, setShowProviderMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  // AI Config
  const availableProviders = getAvailableProviders()
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(availableProviders[0] || 'mistral')
  const [selectedModel, setSelectedModel] = useState(getProviderModels(selectedProvider)[0])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const providerMenuRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

  // Close provider menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerMenuRef.current && !providerMenuRef.current.contains(event.target as Node)) {
        setShowProviderMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const models = getProviderModels(selectedProvider)
    setSelectedModel(models[0])
  }, [selectedProvider])

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
    setError(null)

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
            // Add assistant message using the appropriate service
            const assistantMessage = await service.addMessage(
              currentConversation.id,
              'assistant',
              fullResponse,
              selectedProvider,
              selectedModel
            )
            updateConversationMessages(currentConversation.id, (msgs) => [...msgs, assistantMessage])
          } catch (err) {
            console.error('Failed to save assistant message:', err)
          }
          setStreamingContent('')
          setIsStreaming(false)
        },
        onError: (err) => {
          setError(err.message)
          setIsStreaming(false)
          setStreamingContent('')
        },
      })
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Impossible d\'envoyer le message')
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex gap-6 h-full -m-6">
      {/* Conversations sidebar */}
      <div className="w-72 bg-surface-50 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-axora-500 text-white font-medium hover:bg-axora-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8 px-4">
              Aucune conversation. Cliquez sur "Nouvelle conversation" pour commencer.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectConversation(conv)}
                className={cn(
                  'w-full p-3 rounded-xl text-left transition-colors group cursor-pointer',
                  'hover:bg-white/5',
                  currentConversation?.id === conv.id && 'bg-white/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate flex-1">
                        {conv.title}
                      </p>
                      <StorageBadge storageType={conv.storageType} />
                    </div>
                    <p className="text-xs text-white/40 mt-1">
                      {conv.createdAt.toLocaleDateString('fr-FR')} - {PROVIDER_LABELS[conv.provider]}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Provider selector */}
        <div className="p-4 border-t border-white/5 relative" ref={providerMenuRef}>
          <button
            onClick={() => setShowProviderMenu(!showProviderMenu)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-white/60" />
              <div className="text-left">
                <p className="font-medium">{PROVIDER_LABELS[selectedProvider]}</p>
                <p className="text-xs text-white/50">{selectedModel}</p>
              </div>
            </div>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showProviderMenu && 'rotate-180')} />
          </button>

          {/* Provider dropdown */}
          <AnimatePresence>
            {showProviderMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-4 right-4 mb-2 p-2 rounded-xl bg-surface-100 border border-white/10 shadow-xl"
              >
                <p className="text-xs text-white/40 px-2 py-1 mb-1">Provider</p>
                {availableProviders.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      selectedProvider === provider
                        ? 'bg-axora-500/20 text-axora-400'
                        : 'text-white/80 hover:bg-white/5'
                    )}
                  >
                    {PROVIDER_LABELS[provider]}
                  </button>
                ))}

                <div className="border-t border-white/5 mt-2 pt-2">
                  <p className="text-xs text-white/40 px-2 py-1 mb-1">Modèle</p>
                  {getProviderModels(selectedProvider).map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model)
                        setShowProviderMenu(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                        selectedModel === model
                          ? 'bg-axora-500/20 text-axora-400'
                          : 'text-white/80 hover:bg-white/5'
                      )}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border-b border-red-500/20"
                >
                  <div className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
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
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-axora-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-white/5">
                    {streamingContent ? (
                      <p className="text-sm text-white/90 whitespace-pre-wrap">
                        {streamingContent}
                        <span className="inline-block w-1.5 h-4 bg-axora-400 ml-0.5 animate-pulse" />
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                        <span className="text-white/60 text-sm">Réflexion...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Posez votre question..."
                  disabled={isStreaming}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'px-4 py-3 rounded-xl font-medium transition-all',
                    'flex items-center gap-2',
                    input.trim() && !isStreaming
                      ? 'bg-axora-500 text-white hover:bg-axora-600'
                      : 'bg-white/5 text-white/40 cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-axora-500/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-axora-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Assistant IA Axora
              </h2>
              <p className="text-white/60 max-w-md">
                Posez vos questions sur les médicaments, interactions, posologies et bien plus.
              </p>
              <p className="text-sm text-white/40 mt-2">
                Provider actuel : {PROVIDER_LABELS[selectedProvider]} ({selectedModel})
              </p>
              <button
                onClick={handleNewConversation}
                className="mt-6 px-6 py-3 rounded-xl bg-axora-500 text-white font-medium hover:bg-axora-600 transition-colors"
              >
                Démarrer une conversation
              </button>
            </div>
          </div>
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
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-cyan-500' : 'bg-axora-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[70%] px-4 py-3 rounded-2xl',
          isUser
            ? 'bg-cyan-500/20 text-white'
            : 'bg-white/5 text-white/90'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-[10px] text-white/40 mt-2">
          {message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}
