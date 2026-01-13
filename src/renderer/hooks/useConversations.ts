// =============================================================================
// useConversations - Hook React pour accéder aux conversations
// Supporte les deux modes de stockage : local (IndexedDB) et cloud (Supabase)
// Utilise Supabase Realtime pour les mises à jour automatiques
// =============================================================================

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalConversation, LocalMessage, StorageType } from '../services/db';
import { useAuth } from '../services/AuthContext';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { migrateFromLocalStorage } from '../services/ConversationService';
import {
    getCloudConversations,
    getCloudMessages,
    CloudConversation,
    CloudMessage,
} from '../services/storage/CloudStorageService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedConversation {
    id: string;
    title: string;
    storageType: StorageType;
    createdAt: Date;
    updatedAt: Date;
}

export interface UnifiedMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface UseConversationsReturn {
    conversations: UnifiedConversation[];
    isLoading: boolean;
    refreshCloudConversations: () => Promise<void>;
}

// =============================================================================
// HELPERS
// =============================================================================

function localToUnified(conv: LocalConversation): UnifiedConversation {
    return {
        id: conv.id,
        title: conv.title,
        storageType: conv.storageType || 'local',
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt)
    };
}

function cloudToUnified(conv: CloudConversation): UnifiedConversation {
    return {
        id: conv.id,
        title: conv.title,
        storageType: 'cloud',
        createdAt: new Date(conv.created_at),
        updatedAt: new Date(conv.updated_at)
    };
}

function localMessageToUnified(msg: LocalMessage): UnifiedMessage {
    return {
        id: msg.id,
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
    };
}

function cloudMessageToUnified(msg: CloudMessage): UnifiedMessage {
    return {
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at)
    };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook pour accéder à toutes les conversations (local + cloud combinées)
 */
export function useConversations(): UseConversationsReturn {
    const { user } = useAuth();
    const [cloudConversations, setCloudConversations] = useState<UnifiedConversation[]>([]);
    const [cloudLoading, setCloudLoading] = useState(true);
    const [hasMigrated, setHasMigrated] = useState(false);

    // Migration au premier chargement
    useEffect(() => {
        if (!hasMigrated) {
            migrateFromLocalStorage().then(() => setHasMigrated(true));
        }
    }, [hasMigrated]);

    // Query réactive sur les conversations LOCALES
    const localConversations = useLiveQuery(
        async () => {
            return db.conversations
                .where('storageType')
                .equals('local')
                .reverse()
                .sortBy('updatedAt');
        },
        [user?.id]
    );

    // Charge les conversations CLOUD
    const refreshCloudConversations = useCallback(async () => {
        console.log('[useConversations] refreshCloudConversations called');

        if (!isSupabaseConfigured()) {
            console.log('[useConversations] Cloud not configured, skipping');
            setCloudLoading(false);
            return;
        }

        setCloudLoading(true);
        try {
            console.log('[useConversations] Fetching cloud conversations...');
            const cloudData = await getCloudConversations();
            console.log('[useConversations] Got cloud data:', cloudData.length, 'conversations');
            setCloudConversations(cloudData.map(cloudToUnified));
        } catch (error) {
            console.error('[useConversations] Failed to fetch cloud conversations:', error);
        } finally {
            setCloudLoading(false);
        }
    }, []);

    // Supabase Realtime subscription for automatic updates
    const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured()) return;

        // Listen for auth state changes to refresh conversations
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[useConversations] Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                console.log('[useConversations] User signed in, refreshing cloud conversations...');
                refreshCloudConversations();
            }
        });

        // Initial load if user is already authenticated
        if (user) {
            console.log('[useConversations] User already present, loading conversations...');
            refreshCloudConversations();
        }

        // Cleanup auth listener
        return () => {
            authSubscription?.unsubscribe();
        };
    }, [refreshCloudConversations, user]);

    // Separate effect for Realtime subscription (requires user ID)
    useEffect(() => {
        if (!user || !isSupabaseConfigured()) return;

        // Subscribe to realtime changes on conversations table
        const channel = supabase
            .channel('conversations-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'conversations',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[Realtime] Conversation change detected:', payload.eventType);
                    // Refresh the full list on any change
                    refreshCloudConversations();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Subscription status:', status);
            });

        subscriptionRef.current = channel;

        // Cleanup on unmount or user change
        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
                subscriptionRef.current = null;
            }
        };
    }, [user, refreshCloudConversations]);

    // Combine et trie les conversations par date
    const conversations = useMemo(() => {
        return [
            ...(localConversations || []).map(localToUnified),
            ...cloudConversations
        ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }, [localConversations, cloudConversations]);

    return {
        conversations,
        isLoading: localConversations === undefined || cloudLoading,
        refreshCloudConversations
    };
}

interface UseMessagesReturn {
    messages: UnifiedMessage[];
    isLoading: boolean;
}

/**
 * Hook pour accéder aux messages d'une conversation
 * Détecte automatiquement le type de stockage
 */
export function useMessages(conversationId: string | null, storageType: StorageType = 'local'): UseMessagesReturn {
    const [cloudMessages, setCloudMessages] = useState<UnifiedMessage[]>([]);
    const [cloudLoading, setCloudLoading] = useState(false);

    // Query réactive pour les messages LOCAUX
    const localMessages = useLiveQuery(
        async () => {
            if (!conversationId || storageType !== 'local') return [];

            return db.messages
                .where('conversationId')
                .equals(conversationId)
                .sortBy('timestamp');
        },
        [conversationId, storageType],
        []
    );

    // Charge les messages CLOUD
    useEffect(() => {
        if (!conversationId || storageType !== 'cloud') {
            setCloudMessages([]);
            return;
        }

        const fetchCloudMessages = async () => {
            setCloudLoading(true);
            try {
                const data = await getCloudMessages(conversationId);
                setCloudMessages(data.map(cloudMessageToUnified));
            } catch (error) {
                console.error('Failed to fetch cloud messages:', error);
            } finally {
                setCloudLoading(false);
            }
        };

        fetchCloudMessages();
    }, [conversationId, storageType]);

    if (storageType === 'cloud') {
        return {
            messages: cloudMessages,
            isLoading: cloudLoading
        };
    }

    return {
        messages: (localMessages || []).map(localMessageToUnified),
        isLoading: localMessages === undefined
    };
}

/**
 * Hook pour accéder à une conversation spécifique
 */
export function useConversation(conversationId: string | null): LocalConversation | undefined {
    return useLiveQuery(
        async () => {
            if (!conversationId) return undefined;
            return db.conversations.get(conversationId);
        },
        [conversationId]
    );
}
