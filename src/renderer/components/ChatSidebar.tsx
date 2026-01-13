import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, X, ChevronLeft, ChevronRight, Cloud, Database, Lock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ChatSession } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionItemProps {
    session: ChatSession;
    isActive: boolean;
    isCompact: boolean;
    onSelect: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    editingId: string | null;
    editTitle: string;
    setEditTitle: (title: string) => void;
    onSaveRename: (id: string) => void;
    onKeyDown: (e: React.KeyboardEvent, id: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
    session, isActive, isCompact, onSelect, onEdit, onDelete,
    editingId, editTitle, setEditTitle, onSaveRename, onKeyDown
}) => {
    return (
        <div className="relative group">
            <button
                onClick={onSelect}
                title={isCompact ? (session.title || "Nouvelle conversation") : undefined}
                className={`w-full text-left rounded-xl flex items-center transition-colors ${isCompact ? 'justify-center p-3' : 'gap-3 p-3'
                    } ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
            >
                <div className="shrink-0">
                    {session.storageType === 'cloud' ? <Cloud size={16} /> : <MessageSquare size={16} />}
                </div>

                {!isCompact && (
                    <>
                        {editingId === session.id ? (
                            <input
                                autoFocus
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => onSaveRename(session.id)}
                                onKeyDown={(e) => onKeyDown(e, session.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-black/20 text-white text-sm rounded px-2 py-1 outline-none border border-indigo-500/50"
                            />
                        ) : (
                            <div className="truncate text-sm font-medium flex-1">
                                {session.title || "Nouvelle conversation"}
                            </div>
                        )}
                    </>
                )}
            </button>

            {!isCompact && editingId !== session.id && (
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white text-white/40 transition-all"
                        title="Renommer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all"
                        title="Supprimer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: ChatSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    onRenameSession: (id: string, newTitle: string) => void;
    isOnline?: boolean;
    syncStats?: { pending: number; errors: number; synced: number };
}

export function ChatSidebar({
    isOpen,
    onClose,
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onRenameSession,
    isOnline = true,
    syncStats = { pending: 0, errors: 0, synced: 0 }
}: ChatSidebarProps) {
    const [isCompact, setIsCompact] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditTitle(session.title || "Nouvelle conversation");
    };

    const handleSaveRename = (id: string) => {
        if (editTitle.trim()) {
            onRenameSession(id, editTitle.trim());
        }
        setEditingSessionId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            handleSaveRename(id);
        } else if (e.key === 'Escape') {
            setEditingSessionId(null);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                layout
                className={`fixed top-0 left-0 h-full ${isCompact ? 'md:w-20' : 'md:w-72'} w-72 bg-[#181825] border-r border-white/5 z-50 flex flex-col transition-[width] duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:relative`}

            >
                {/* Header */}
                <div className={`p-4 border-b border-white/5 flex items-center ${isCompact ? 'justify-center' : 'justify-between'}`}>
                    <button
                        onClick={onNewChat}
                        title="Nouvelle discussion"
                        className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/10 font-medium text-sm ${isCompact ? 'p-3 w-10 h-10' : 'flex-1 p-3'}`}
                    >
                        <Plus size={18} />
                        {!isCompact && <span>Nouvelle discussion</span>}
                    </button>
                    {!isCompact && (
                        <button onClick={onClose} className="md:hidden ml-2 p-2 text-white/50 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                    {sessions.length === 0 ? (
                        <div className={`text-center text-white/20 text-sm mt-10 ${isCompact ? 'hidden' : ''}`}>
                            Aucune conversation
                        </div>
                    ) : (
                        <>
                            {/* CLOUD SESSIONS */}
                            {sessions.some(s => s.storageType === 'cloud') && (
                                <div className="space-y-2">
                                    {!isCompact && (
                                        <div className="px-2 text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                            <Cloud size={12} />
                                            Cloud (Synchronisé)
                                        </div>
                                    )}
                                    {sessions.filter(s => s.storageType === 'cloud')
                                        .sort((a, b) => b.updatedAt - a.updatedAt)
                                        .map(session => (
                                            <SessionItem
                                                key={session.id}
                                                session={session}
                                                isActive={currentSessionId === session.id}
                                                isCompact={isCompact}
                                                onSelect={() => onSelectSession(session.id)}
                                                onEdit={(e) => handleStartRename(session, e)}
                                                onDelete={(e) => onDeleteSession(session.id, e)}
                                                editingId={editingSessionId}
                                                editTitle={editTitle}
                                                setEditTitle={setEditTitle}
                                                onSaveRename={handleSaveRename}
                                                onKeyDown={handleKeyDown}
                                            />
                                        ))}
                                </div>
                            )}

                            {/* LOCAL SESSIONS */}
                            {sessions.some(s => !s.storageType || s.storageType === 'local') && (
                                <div className="space-y-2">
                                    {!isCompact && (
                                        <div className="px-2 text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                            <Database size={12} />
                                            Local (Privé)
                                        </div>
                                    )}
                                    {sessions.filter(s => !s.storageType || s.storageType === 'local')
                                        .sort((a, b) => b.updatedAt - a.updatedAt)
                                        .map(session => (
                                            <SessionItem
                                                key={session.id}
                                                session={session}
                                                isActive={currentSessionId === session.id}
                                                isCompact={isCompact}
                                                onSelect={() => onSelectSession(session.id)}
                                                onEdit={(e) => handleStartRename(session, e)}
                                                onDelete={(e) => onDeleteSession(session.id, e)}
                                                editingId={editingSessionId}
                                                editTitle={editTitle}
                                                setEditTitle={setEditTitle}
                                                onSaveRename={handleSaveRename}
                                                onKeyDown={handleKeyDown}
                                            />
                                        ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 text-xs text-white/20 flex items-center justify-between">
                    {!isCompact && (
                        <div className="flex items-center gap-2">
                            {/* Sync Status Indicator */}
                            <span
                                className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-gray-500' :
                                    syncStats.errors > 0 ? 'bg-red-500' :
                                        syncStats.pending > 0 ? 'bg-yellow-500 animate-pulse' :
                                            'bg-green-500'
                                    }`}
                                title={`${isOnline ? 'En ligne' : 'Hors ligne'} | ${syncStats.pending} en attente | ${syncStats.errors} erreurs`}
                            />
                            <span className="truncate">
                                {!isOnline ? 'Hors ligne' :
                                    syncStats.pending > 0 ? `${syncStats.pending} en attente` :
                                        'Synchronisé'}
                            </span>
                        </div>
                    )}
                    <motion.button
                        layout
                        onClick={() => setIsCompact(!isCompact)}
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2 rounded-xl border border-white/5 bg-white/5 text-white/50 hover:text-white transition-colors ${isCompact ? 'mx-auto' : ''}`}
                    >
                        {isCompact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </motion.button>
                </div>
            </motion.div>
        </>
    );
}
