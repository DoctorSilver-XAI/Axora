import { generateUUID } from '../db/schema';
import { supabase } from '../supabase';

/**
 * Service pour les conversations stockées dans le cloud (Supabase)
 * Utilise le client Supabase configuré pour gérer l'authentification automatiquement.
 */

// =============================================================================
// TYPES - Modèles Supabase (format snake_case)
// =============================================================================

export interface CloudConversation {
    id: string;
    user_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface CloudMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

// =============================================================================
// CONVERSATIONS
// =============================================================================

export async function getCloudConversations(): Promise<CloudConversation[]> {
    // Check session but don't block if unavailable - Supabase client handles auth via stored tokens
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.log('[CloudStorage] No session from getSession(), trying query anyway (client may have tokens)...');
    }

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[CloudStorage] Error fetching cloud conversations:', error);
        // If it's an auth error, return empty instead of throwing
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
            console.warn('[CloudStorage] Auth error, returning empty.');
            return [];
        }
        throw error;
    }

    console.log(`[CloudStorage] Fetched ${data?.length || 0} cloud conversations`);
    return data || [];
}

export async function getCloudConversation(id: string): Promise<CloudConversation | null> {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching conversation:', error);
        throw error;
    }

    return data;
}

export async function createCloudConversation(title: string = 'Nouvelle conversation'): Promise<CloudConversation> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User must be logged in to create a cloud conversation");
    }

    const now = new Date().toISOString();
    const conversation = {
        id: generateUUID(),
        user_id: user.id,
        title,
        created_at: now,
        updated_at: now
    };

    const { data, error } = await supabase
        .from('conversations')
        .insert(conversation)
        .select()
        .single();

    if (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }

    return data;
}

export async function updateCloudConversation(
    id: string,
    updates: Partial<Pick<CloudConversation, 'title'>>
): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating conversation:', error);
        throw error;
    }
}

export async function deleteCloudConversation(id: string): Promise<void> {
    // Note: ON DELETE CASCADE on the foreign key should handle messages,
    // but we can be explicit if needed. Since we have RLS, we just delete the conversation.

    // With CASCADE in schema:
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
}

// =============================================================================
// MESSAGES
// =============================================================================

export async function getCloudMessages(conversationId: string): Promise<CloudMessage[]> {

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }

    return data || [];
}

export async function addCloudMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
): Promise<CloudMessage> {
    const message = {
        id: generateUUID(),
        conversation_id: conversationId,
        role,
        content,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();

    if (error) {
        console.error('Error adding message:', error);
        throw error;
    }

    // Met à jour le updated_at de la conversation (fire and forget update)
    // We don't await this to keep UI snappy, or we could if consistency is critical
    updateCloudConversation(conversationId, {});

    return data;
}

export async function updateCloudMessage(id: string, content: string): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', id);

    if (error) {
        console.error('Error updating message:', error);
        throw error;
    }
}

export async function deleteCloudMessage(id: string): Promise<void> {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}

// =============================================================================
// REALTIME (pour synchronisation temps réel)
// =============================================================================

export function isCloudConfigured(): boolean {
    // If supabase client is initialized, we assume strict config check was done there.
    // But we can double check env vars here or expose a method from supabase.ts
    return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
}
