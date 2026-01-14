import { supabase } from '@shared/lib/supabase'
import { Message, AIProvider, Conversation } from '../types'

export interface DBConversation {
  id: string
  user_id: string
  title: string
  provider: AIProvider
  model: string | null
  context_type: string
  message_count: number
  last_message_at: string | null
  is_archived: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface DBMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string | null
  provider: string | null
  tokens_used: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// Convert DB conversation to app conversation
function toAppConversation(dbConv: DBConversation, messages: DBMessage[] = []): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    provider: dbConv.provider as AIProvider,
    messages: messages.map(toAppMessage),
    createdAt: new Date(dbConv.created_at),
    updatedAt: new Date(dbConv.updated_at),
    storageType: 'cloud',
  }
}

function toAppMessage(dbMsg: DBMessage): Message {
  return {
    id: dbMsg.id,
    role: dbMsg.role,
    content: dbMsg.content,
    timestamp: new Date(dbMsg.created_at),
    provider: dbMsg.provider as AIProvider | undefined,
  }
}

export const ConversationService = {
  // Fetch all conversations for the current user
  async getAll(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    return (data || []).map((conv) => toAppConversation(conv as DBConversation))
  },

  // Fetch a single conversation with its messages
  async getById(id: string): Promise<Conversation | null> {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (convError) {
      console.error('Error fetching conversation:', convError)
      return null
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return null
    }

    return toAppConversation(conv as DBConversation, (messages || []) as DBMessage[])
  },

  // Create a new conversation
  async create(provider: AIProvider, model?: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'Nouvelle conversation',
        provider,
        model: model || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      throw error
    }

    return toAppConversation(data as DBConversation)
  },

  // Update conversation title
  async updateTitle(id: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id)

    if (error) {
      console.error('Error updating conversation title:', error)
      throw error
    }
  },

  // Archive a conversation
  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: true })
      .eq('id', id)

    if (error) {
      console.error('Error archiving conversation:', error)
      throw error
    }
  },

  // Delete a conversation
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  },

  // Add a message to a conversation
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    provider?: AIProvider,
    model?: string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        provider: provider || null,
        model: model || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding message:', error)
      throw error
    }

    return toAppMessage(data as DBMessage)
  },

  // Toggle pin status
  async togglePin(id: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ is_pinned: isPinned })
      .eq('id', id)

    if (error) {
      console.error('Error toggling pin:', error)
      throw error
    }
  },
}
