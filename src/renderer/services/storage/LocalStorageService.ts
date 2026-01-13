import { db, LocalConversation, LocalMessage, createLocalConversation, createLocalMessage } from '../db/schema';

/**
 * Service pour les conversations stockées localement (IndexedDB uniquement)
 * Pas de synchronisation avec Supabase
 */

// =============================================================================
// CONVERSATIONS
// =============================================================================

export async function getLocalConversations(): Promise<LocalConversation[]> {
    return db.conversations
        .where('storageType')
        .equals('local')
        .reverse()
        .sortBy('updatedAt');
}

export async function getLocalConversation(id: string): Promise<LocalConversation | undefined> {
    const conv = await db.conversations.get(id);
    return conv?.storageType === 'local' ? conv : undefined;
}

export async function createNewLocalConversation(title?: string): Promise<LocalConversation> {
    const conversation = createLocalConversation(title, null, 'local');
    await db.conversations.add(conversation);
    return conversation;
}

export async function updateLocalConversation(
    id: string,
    updates: Partial<Pick<LocalConversation, 'title'>>
): Promise<void> {
    await db.conversations.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
}

export async function deleteLocalConversation(id: string): Promise<void> {
    // Supprimer les messages d'abord
    await db.messages.where('conversationId').equals(id).delete();
    // Puis la conversation
    await db.conversations.delete(id);
}

// =============================================================================
// MESSAGES
// =============================================================================

export async function getLocalMessages(conversationId: string): Promise<LocalMessage[]> {
    return db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('timestamp');
}

export async function addLocalMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
): Promise<LocalMessage> {
    const message = createLocalMessage(conversationId, role, content);
    await db.messages.add(message);

    // Met à jour le timestamp de la conversation
    await db.conversations.update(conversationId, {
        updatedAt: Date.now()
    });

    return message;
}

export async function updateLocalMessage(id: string, content: string): Promise<void> {
    await db.messages.update(id, { content });
}

export async function deleteLocalMessage(id: string): Promise<void> {
    await db.messages.delete(id);
}
