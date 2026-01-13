import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Menu, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiManager } from '../services/ai/manager';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSidebar } from './ChatSidebar';
import { AIChatMessage } from '../services/ai/types';
import { AXORA_SYSTEM_PROMPT } from '../data/assistant_prompts';
import { StorageChoiceModal } from './StorageChoiceModal';

// Storage services
import { useConversations, useMessages, useConversation, UnifiedMessage } from '../hooks/useConversations';
import { createNewLocalConversation, addLocalMessage, updateLocalMessage, deleteLocalConversation, updateLocalConversation } from '../services/storage/LocalStorageService';
import { createCloudConversation, addCloudMessage, updateCloudMessage, deleteCloudConversation, updateCloudConversation } from '../services/storage/CloudStorageService';
import {
    renameConversation as renameConv,
    deleteConversation as deleteConv,
} from '../services/ConversationService';
import { StorageType } from '../services/db';

export function ChatInterface() {
    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------
    const { conversations, isLoading, refreshCloudConversations } = useConversations();
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentStorageType, setCurrentStorageType] = useState<StorageType>('local');
    const { messages } = useMessages(currentSessionId, currentStorageType);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);

    // UI state
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------

    // Sélectionne la première conversation au chargement
    // Sélectionne la première conversation au chargement
    useEffect(() => {
        if (!isLoading && conversations.length > 0 && !currentSessionId) {
            const lastActive = conversations[0];
            setCurrentSessionId(lastActive.id);
            setCurrentStorageType(lastActive.storageType || 'local');
        } else if (!isLoading && conversations.length === 0 && !currentSessionId) {
            // Crée une conversation initiale seulement si aucune n'existe
            handleNewChat();
        }
    }, [isLoading, conversations, currentSessionId]);

    // Scroll behavior
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // -------------------------------------------------------------------------
    // ACTIONS (Local-First)
    // -------------------------------------------------------------------------

    const handleNewChat = () => {
        setShowStorageModal(true);
    };

    const handleStorageChoice = async (storageType: StorageType) => {
        setShowStorageModal(false);
        try {
            let newConversationId: string;

            if (storageType === 'local') {
                const newConv = await createNewLocalConversation('Nouvelle conversation');
                await addLocalMessage(newConv.id, 'assistant', 'Bonjour ! Je suis Axora (Mode Orchestrator). Comment puis-je vous aider ?');
                newConversationId = newConv.id;
            } else {
                const newConv = await createCloudConversation('Nouvelle conversation');
                await addCloudMessage(newConv.id, 'assistant', 'Bonjour ! Je suis Axora (Mode Orchestrator). Comment puis-je vous aider ?');
                newConversationId = newConv.id;
                // Refresh cloud conversations list
                await refreshCloudConversations();
            }

            setCurrentSessionId(newConversationId);
            setCurrentStorageType(storageType);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        } catch (e) {
            console.error("Failed to create session", e);
        }
    };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const convToDelete = conversations.find(c => c.id === id);
        if (!convToDelete) return;

        if (!confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

        try {
            if (convToDelete.storageType === 'local') {
                await deleteLocalConversation(id);
            } else {
                await deleteCloudConversation(id);
                await refreshCloudConversations();
            }

            if (currentSessionId === id) {
                const remaining = conversations.filter(c => c.id !== id);
                if (remaining.length > 0) {
                    setCurrentSessionId(remaining[0].id);
                    setCurrentStorageType(remaining[0].storageType || 'local');
                } else {
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error("Failed to delete session", error);
        }
    };

    const handleRenameSession = async (id: string, newTitle: string) => {
        const conv = conversations.find(c => c.id === id);
        if (!conv) return;

        try {
            if (conv.storageType === 'local') {
                await updateLocalConversation(id, { title: newTitle });
            } else {
                await updateCloudConversation(id, { title: newTitle });
                await refreshCloudConversations();
            }
        } catch (error) {
            console.error("Failed to rename session", error);
        }
    };

    // -------------------------------------------------------------------------
    // SEND MESSAGE
    // -------------------------------------------------------------------------
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || !currentSessionId) return;

        const userContent = inputValue;
        setInputValue('');
        setIsTyping(true);

        try {
            // 1. Sauvegarde du message utilisateur
            let userMessageId: string;
            if (currentStorageType === 'local') {
                const userMsg = await addLocalMessage(currentSessionId, 'user', userContent);
                userMessageId = userMsg.id;
            } else {
                const userMsg = await addCloudMessage(currentSessionId, 'user', userContent);
                userMessageId = userMsg.id;
                await refreshCloudConversations();
            }

            // 2. Crée un message assistant vide pour le streaming
            let assistantMessageId: string;
            if (currentStorageType === 'local') {
                const assistantMsg = await addLocalMessage(currentSessionId, 'assistant', '');
                assistantMessageId = assistantMsg.id;
            } else {
                const assistantMsg = await addCloudMessage(currentSessionId, 'assistant', '');
                assistantMessageId = assistantMsg.id;
            }

            let aiContent = "";

            // 3. Prépare les messages pour l'API
            const apiMessages: AIChatMessage[] = [
                { role: 'system', content: AXORA_SYSTEM_PROMPT },
                ...messages.map(m => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content
                })),
                { role: 'user', content: userContent }
            ];

            // 4. Stream la réponse
            await aiManager.streamResponse(
                apiMessages,
                async (chunk) => {
                    aiContent += chunk;
                    // Met à jour le contenu pendant le streaming
                    if (currentStorageType === 'local') {
                        await updateLocalMessage(assistantMessageId, aiContent);
                    } else {
                        await updateCloudMessage(assistantMessageId, aiContent);
                    }
                },
                { conversationId: currentSessionId }
            );

            // 5. Refresh final pour cloud
            if (currentStorageType === 'cloud') {
                await refreshCloudConversations();
            }

        } catch (error: any) {
            console.error("Chat Error:", error);
            const errorMessage = "Erreur: " + (error.message || "Impossible de joindre l'IA.");
            if (currentStorageType === 'local') {
                await addLocalMessage(currentSessionId, 'assistant', errorMessage);
            } else {
                await addCloudMessage(currentSessionId, 'assistant', errorMessage);
            }
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearCurrent = () => {
        if (currentSessionId) {
            // Créer un faux événement pour satisfaire la signature
            const fakeEvent = { stopPropagation: () => { } } as React.MouseEvent;
            handleDeleteSession(currentSessionId, fakeEvent);
        }
    };

    // Convertit les entités locales pour le format attendu par ChatSidebar
    const sessionsForSidebar = conversations.map(c => ({
        id: c.id,
        title: c.title,
        storageType: c.storageType, // Pour afficher l'icône 📁/☁️
        updatedAt: c.updatedAt.getTime(),
        messages: [] // Les messages sont chargés séparément
    }));

    return (
        <div className="flex h-screen bg-[#0f0f16] overflow-hidden">
            <ChatSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                sessions={sessionsForSidebar}
                currentSessionId={currentSessionId}
                onSelectSession={(id) => {
                    const conv = conversations.find(c => c.id === id);
                    setCurrentSessionId(id);
                    setCurrentStorageType(conv?.storageType || 'local');
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
                onRenameSession={handleRenameSession}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full w-full relative">

                {/* Header */}
                <header className="flex items-center gap-3 py-3 px-4 md:px-6 border-b border-white/5 bg-[#0f0f16]/90 backdrop-blur z-10 window-drag-region">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-white/70 hover:text-white window-no-drag"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                            Axora
                        </h1>
                    </div>

                    <div className="ml-auto flex gap-2">

                        <button
                            onClick={handleClearCurrent}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/50 hover:text-red-400 transition-colors"
                            title="Réinitialiser cette conversation"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-4 p-4 md:p-6 custom-scrollbar scroll-smooth">
                    <AnimatePresence mode='popLayout'>
                        {messages.map((msg: UnifiedMessage) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl backdrop-blur-md border ${msg.role === 'user'
                                        ? 'bg-indigo-600/20 border-indigo-500/30 rounded-br-sm text-indigo-50'
                                        : 'bg-white/5 border-white/10 rounded-bl-sm text-gray-200'
                                        }`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-2 opacity-50 text-xs uppercase tracking-wider font-semibold">
                                            <Bot size={12} />
                                            Axora
                                        </div>
                                    )}
                                    <div className="leading-relaxed text-[15px] overflow-hidden">
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }: any) => <p className="mb-4 last:mb-0">{children}</p>,
                                                    h1: ({ children }: any) => <h1 className="text-xl font-bold mb-4 mt-6 text-indigo-300 border-b border-indigo-500/30 pb-2">{children}</h1>,
                                                    h2: ({ children }: any) => <h2 className="text-lg font-bold mb-3 mt-5 text-indigo-200">{children}</h2>,
                                                    h3: ({ children }: any) => <h3 className="text-base font-bold mb-2 mt-4 text-indigo-100">{children}</h3>,
                                                    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                                                    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                                                    li: ({ children }: any) => <li className="pl-1">{children}</li>,
                                                    strong: ({ children }: any) => <strong className="font-bold text-indigo-200">{children}</strong>,
                                                    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{children}</a>,
                                                    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-indigo-500/40 pl-4 py-1 my-4 bg-indigo-900/10 italic text-white/80 rounded-r">{children}</blockquote>,
                                                    code: ({ inline, className, children, ...props }: any) => {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return !inline ? (
                                                            <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e2e]">
                                                                <div className="bg-white/5 px-3 py-1 text-xs text-white/50 border-b border-white/5 font-mono">
                                                                    {match?.[1] || 'code'}
                                                                </div>
                                                                <div className="p-3 overflow-x-auto text-sm font-mono text-gray-300">
                                                                    <code className={className} {...props}>
                                                                        {children}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-200" {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    },
                                                    table: ({ children }: any) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-sm text-left">{children}</table></div>,
                                                    thead: ({ children }: any) => <thead className="bg-white/5 text-xs uppercase text-white/70 font-semibold">{children}</thead>,
                                                    tbody: ({ children }: any) => <tbody className="divide-y divide-white/5">{children}</tbody>,
                                                    tr: ({ children }: any) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                                                    th: ({ children }: any) => <th className="px-4 py-3 border-b border-white/10">{children}</th>,
                                                    td: ({ children }: any) => <td className="px-4 py-3">{children}</td>,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    <div className={`text-[10px] mt-2 opacity-30 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex justify-start w-full"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm p-4 flex gap-1.5 items-center backdrop-blur-md">
                                <div className="w-2 h-2 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-indigo-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 pt-2">
                    <form
                        onSubmit={handleSendMessage}
                        className="relative group glass-panel rounded-2xl p-1.5 flex items-center gap-2 transition-all duration-300 focus-within:border-indigo-500/50 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Écrivez votre message..."
                            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder-white/20"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping}
                            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                    <div className="text-center mt-2 text-xs text-white/20 select-none">
                        Axora AI Assistant • v0.1.0 Alpha
                    </div>
                </div>
            </div>

            {/* Storage Choice Modal */}
            <StorageChoiceModal
                isOpen={showStorageModal}
                onClose={() => setShowStorageModal(false)}
                onChoose={handleStorageChoice}
            />
        </div>
    );
}
