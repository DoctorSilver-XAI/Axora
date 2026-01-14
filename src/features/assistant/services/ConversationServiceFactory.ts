import { StorageType, Conversation, Message, AIProvider } from '../types'
import { ConversationService } from './ConversationService'
import { LocalConversationService } from './LocalConversationService'

export interface IConversationService {
  getAll(): Promise<Conversation[]>
  getById(id: string): Promise<Conversation | null>
  create(provider: AIProvider, model?: string): Promise<Conversation>
  updateTitle(id: string, title: string): Promise<void>
  archive(id: string): Promise<void>
  delete(id: string): Promise<void>
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    provider?: AIProvider,
    model?: string
  ): Promise<Message>
  togglePin(id: string, isPinned: boolean): Promise<void>
}

export function getConversationService(storageType: StorageType): IConversationService {
  switch (storageType) {
    case 'local':
      return LocalConversationService
    case 'cloud':
      return ConversationService
    default:
      return ConversationService
  }
}

export const UnifiedConversationService = {
  async getAllFromBothStorages(): Promise<Conversation[]> {
    const [cloudConversations, localConversations] = await Promise.all([
      ConversationService.getAll().catch((error) => {
        console.error('Error loading cloud conversations:', error)
        return []
      }),
      LocalConversationService.getAll().catch((error) => {
        console.error('Error loading local conversations:', error)
        return []
      }),
    ])

    // Fusionner et trier par date de mise à jour
    const all = [...cloudConversations, ...localConversations]
    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },
}
