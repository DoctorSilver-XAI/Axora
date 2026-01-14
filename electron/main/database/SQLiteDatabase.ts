import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// Type pour sql.js Database
interface SqlJsDatabase {
  run: (sql: string, params?: unknown[]) => void
  prepare: (sql: string) => SqlJsStatement
  export: () => Uint8Array
  close: () => void
}

interface SqlJsStatement {
  bind: (params?: unknown[]) => void
  step: () => boolean
  getAsObject: () => Record<string, unknown>
  free: () => void
}

// Variable globale pour stocker le module SQL chargé dynamiquement
let SqlModule: { Database: new (data?: ArrayLike<number>) => SqlJsDatabase } | null = null

export class SQLiteDatabase {
  private static instance: SQLiteDatabase | null = null
  private static initPromise: Promise<SQLiteDatabase> | null = null
  private static initError: Error | null = null
  private db: SqlJsDatabase | null = null
  private dbPath: string

  private constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'axora-local.db')
  }

  static async getInstance(): Promise<SQLiteDatabase> {
    // Si une erreur précédente s'est produite, la relancer
    if (SQLiteDatabase.initError) {
      throw SQLiteDatabase.initError
    }

    if (SQLiteDatabase.instance) {
      return SQLiteDatabase.instance
    }

    if (SQLiteDatabase.initPromise) {
      return SQLiteDatabase.initPromise
    }

    SQLiteDatabase.initPromise = (async () => {
      try {
        const instance = new SQLiteDatabase()
        await instance.initialize()
        SQLiteDatabase.instance = instance
        return instance
      } catch (error) {
        SQLiteDatabase.initError = error as Error
        SQLiteDatabase.initPromise = null
        throw error
      }
    })()

    return SQLiteDatabase.initPromise
  }

  private async initialize(): Promise<void> {
    // Charger sql.js dynamiquement (version ASM, pas besoin de WASM)
    if (!SqlModule) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const initSqlJs = require('sql.js')
      SqlModule = await initSqlJs()
    }

    // S'assurer que le répertoire parent existe
    const dbDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    if (!SqlModule) {
      throw new Error('Failed to initialize sql.js')
    }

    // Charger la base de données existante ou en créer une nouvelle
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath)
      this.db = new SqlModule.Database(fileBuffer)
    } else {
      this.db = new SqlModule.Database()
    }

    this.initializeSchema()
    this.save()
  }

  private initializeSchema(): void {
    if (!this.db) return

    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_archived INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id)
    `)
  }

  getDb(): SqlJsDatabase | null {
    return this.db
  }

  save(): void {
    if (!this.db) return

    const data = this.db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(this.dbPath, buffer)
  }

  close(): void {
    if (this.db) {
      this.save()
      this.db.close()
      this.db = null
      SQLiteDatabase.instance = null
    }
  }
}
