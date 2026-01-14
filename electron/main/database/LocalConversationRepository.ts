import { SQLiteDatabase } from './SQLiteDatabase'
import { randomUUID } from 'crypto'

export interface LocalConversation {
  id: string
  title: string
  provider: string
  model: string | null
  created_at: string
  updated_at: string
  is_archived: number
  is_pinned: number
}

export interface LocalMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  provider: string | null
  model: string | null
  created_at: string
}

export interface LocalConversationWithMessages extends LocalConversation {
  messages: LocalMessage[]
}

export class LocalConversationRepository {
  private async getDb() {
    try {
      const database = await SQLiteDatabase.getInstance()
      return database.getDb()
    } catch (error) {
      console.error('[LocalConversationRepository] Failed to get database:', error)
      return null
    }
  }

  private async saveDb() {
    try {
      const database = await SQLiteDatabase.getInstance()
      database.save()
    } catch (error) {
      console.error('[LocalConversationRepository] Failed to save database:', error)
    }
  }

  async getAll(): Promise<LocalConversation[]> {
    const db = await this.getDb()
    if (!db) return []

    const stmt = db.prepare(
      'SELECT * FROM conversations WHERE is_archived = 0 ORDER BY updated_at DESC'
    )
    const results: LocalConversation[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as LocalConversation
      results.push(row)
    }
    stmt.free()

    return results
  }

  async getById(id: string): Promise<LocalConversationWithMessages | null> {
    const db = await this.getDb()
    if (!db) return null

    // Récupérer la conversation
    const convStmt = db.prepare('SELECT * FROM conversations WHERE id = ?')
    convStmt.bind([id])

    let conversation: LocalConversation | null = null
    if (convStmt.step()) {
      conversation = convStmt.getAsObject() as unknown as LocalConversation
    }
    convStmt.free()

    if (!conversation) return null

    // Récupérer les messages
    const msgStmt = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    )
    msgStmt.bind([id])

    const messages: LocalMessage[] = []
    while (msgStmt.step()) {
      messages.push(msgStmt.getAsObject() as unknown as LocalMessage)
    }
    msgStmt.free()

    return { ...conversation, messages }
  }

  async create(provider: string, model?: string): Promise<LocalConversation | null> {
    const db = await this.getDb()
    if (!db) {
      console.error('[LocalConversationRepository] Cannot create: database not available')
      return null
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.run(
      `INSERT INTO conversations (id, title, provider, model, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'Nouvelle conversation', provider, model || null, now, now]
    )

    await this.saveDb()

    return {
      id,
      title: 'Nouvelle conversation',
      provider,
      model: model || null,
      created_at: now,
      updated_at: now,
      is_archived: 0,
      is_pinned: 0,
    }
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    const now = new Date().toISOString()
    db.run('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?', [
      title,
      now,
      id,
    ])

    await this.saveDb()
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    // Supprimer d'abord les messages
    db.run('DELETE FROM messages WHERE conversation_id = ?', [id])
    // Puis la conversation
    db.run('DELETE FROM conversations WHERE id = ?', [id])

    await this.saveDb()
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    provider?: string,
    model?: string
  ): Promise<LocalMessage | null> {
    const db = await this.getDb()
    if (!db) {
      console.error('[LocalConversationRepository] Cannot add message: database not available')
      return null
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.run(
      `INSERT INTO messages (id, conversation_id, role, content, provider, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, conversationId, role, content, provider || null, model || null, now]
    )

    // Mettre à jour updated_at de la conversation
    db.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [
      now,
      conversationId,
    ])

    await this.saveDb()

    return {
      id,
      conversation_id: conversationId,
      role,
      content,
      provider: provider || null,
      model: model || null,
      created_at: now,
    }
  }

  async archive(id: string): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    const now = new Date().toISOString()
    db.run(
      'UPDATE conversations SET is_archived = 1, updated_at = ? WHERE id = ?',
      [now, id]
    )

    await this.saveDb()
  }

  async togglePin(id: string, isPinned: boolean): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    const now = new Date().toISOString()
    db.run(
      'UPDATE conversations SET is_pinned = ?, updated_at = ? WHERE id = ?',
      [isPinned ? 1 : 0, now, id]
    )

    await this.saveDb()
  }
}
