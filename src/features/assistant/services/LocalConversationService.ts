import { Message, AIProvider, Conversation } from '../types'
import type {
  LocalConversation as DBLocalConversation,
  LocalMessage as DBLocalMessage,
  AxoraAPI,
} from '@shared/types/electron'

// Type guard pour vérifier si l'API Axora est disponible avec localConversations
function getLocalConversationsAPI(): AxoraAPI['localConversations'] | null {
  const axora = window.axora as AxoraAPI | undefined
  if (axora && 'localConversations' in axora) {
    return axora.localConversations
  }
  return null
}

// Convert DB conversation to app conversation
function toAppConversation(
  dbConv: DBLocalConversation,
  messages: DBLocalMessage[] = []
): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    provider: dbConv.provider as AIProvider,
    messages: messages.map(toAppMessage),
    createdAt: new Date(dbConv.created_at),
    updatedAt: new Date(dbConv.updated_at),
    storageType: 'local',
  }
}

function toAppMessage(dbMsg: DBLocalMessage): Message {
  return {
    id: dbMsg.id,
    role: dbMsg.role,
    content: dbMsg.content,
    timestamp: new Date(dbMsg.created_at),
    provider: dbMsg.provider as AIProvider | undefined,
  }
}

export const LocalConversationService = {
  async getAll(): Promise<Conversation[]> {
    const api = getLocalConversationsAPI()
    if (!api) {
      console.warn('Local conversations API not available')
      return []
    }

    try {
      const data = await api.getAll()
      return data.map((conv: DBLocalConversation) => toAppConversation(conv))
    } catch (error) {
      console.error('Error fetching local conversations:', error)
      return []
    }
  },

  async getById(id: string): Promise<Conversation | null> {
    const api = getLocalConversationsAPI()
    if (!api) {
      console.warn('Local conversations API not available')
      return null
    }

    try {
      const data = await api.getById(id)
      if (!data) return null
      return toAppConversation(data, data.messages || [])
    } catch (error) {
      console.error('Error fetching local conversation:', error)
      return null
    }
  },

  async create(provider: AIProvider, model?: string): Promise<Conversation> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    const data = await api.create(provider, model)
    return toAppConversation(data)
  },

  async updateTitle(id: string, title: string): Promise<void> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    await api.updateTitle(id, title)
  },

  async archive(id: string): Promise<void> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    await api.archive(id)
  },

  async delete(id: string): Promise<void> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    await api.delete(id)
  },

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    provider?: AIProvider,
    model?: string
  ): Promise<Message> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    const data = await api.addMessage(conversationId, role, content, provider, model)
    return toAppMessage(data)
  },

  async togglePin(id: string, isPinned: boolean): Promise<void> {
    const api = getLocalConversationsAPI()
    if (!api) {
      throw new Error('Local conversations API not available')
    }

    await api.togglePin(id, isPinned)
  },
}
