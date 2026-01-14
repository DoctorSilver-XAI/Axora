import { SQLiteDatabase } from './SQLiteDatabase'
import { randomUUID } from 'crypto'

export interface CashClosureData {
  id: string
  date: string
  fonds_caisses_json: string
  total_pieces: number
  billets_retires_json: string
  fond_veille: number
  montant_lgpi: number
  results_json: string
  notes: string | null
  created_at: string
}

export class CashRegisterRepository {
  private initialized = false

  private async getDb() {
    try {
      const database = await SQLiteDatabase.getInstance()
      if (!this.initialized) {
        await this.initializeSchema()
        this.initialized = true
      }
      return database.getDb()
    } catch (error) {
      console.error('[CashRegisterRepository] Failed to get database:', error)
      return null
    }
  }

  private async initializeSchema() {
    const database = await SQLiteDatabase.getInstance()
    const db = database.getDb()
    if (!db) return

    db.run(`
      CREATE TABLE IF NOT EXISTS cash_closures (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        fonds_caisses_json TEXT NOT NULL,
        total_pieces REAL NOT NULL,
        billets_retires_json TEXT NOT NULL,
        fond_veille REAL NOT NULL,
        montant_lgpi REAL NOT NULL,
        results_json TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )
    `)

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_cash_closures_date
      ON cash_closures(date DESC)
    `)

    database.save()
  }

  private async saveDb() {
    try {
      const database = await SQLiteDatabase.getInstance()
      database.save()
    } catch (error) {
      console.error('[CashRegisterRepository] Failed to save database:', error)
    }
  }

  async getAll(limit = 30): Promise<CashClosureData[]> {
    const db = await this.getDb()
    if (!db) return []

    const stmt = db.prepare(
      'SELECT * FROM cash_closures ORDER BY date DESC LIMIT ?'
    )
    stmt.bind([limit])

    const results: CashClosureData[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as CashClosureData)
    }
    stmt.free()

    return results
  }

  async getByDate(date: string): Promise<CashClosureData | null> {
    const db = await this.getDb()
    if (!db) return null

    const stmt = db.prepare('SELECT * FROM cash_closures WHERE date = ?')
    stmt.bind([date])

    let result: CashClosureData | null = null
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as CashClosureData
    }
    stmt.free()

    return result
  }

  async getLatest(): Promise<CashClosureData | null> {
    const db = await this.getDb()
    if (!db) return null

    const stmt = db.prepare(
      'SELECT * FROM cash_closures ORDER BY date DESC LIMIT 1'
    )

    let result: CashClosureData | null = null
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as CashClosureData
    }
    stmt.free()

    return result
  }

  async save(data: {
    date: string
    fondsCaisses: Record<string, number | string>
    totalPieces: number
    billetsRetires: Record<string, number | string>
    fondVeille: number
    montantLGPI: number
    results: Record<string, number>
    notes?: string
  }): Promise<CashClosureData | null> {
    const db = await this.getDb()
    if (!db) return null

    // Vérifier si une clôture existe déjà pour cette date
    const existing = await this.getByDate(data.date)

    const id = existing?.id || randomUUID()
    const now = new Date().toISOString()

    const closureData: CashClosureData = {
      id,
      date: data.date,
      fonds_caisses_json: JSON.stringify(data.fondsCaisses),
      total_pieces: data.totalPieces,
      billets_retires_json: JSON.stringify(data.billetsRetires),
      fond_veille: data.fondVeille,
      montant_lgpi: data.montantLGPI,
      results_json: JSON.stringify(data.results),
      notes: data.notes || null,
      created_at: existing?.created_at || now,
    }

    if (existing) {
      // Mise à jour
      db.run(
        `UPDATE cash_closures SET
          fonds_caisses_json = ?,
          total_pieces = ?,
          billets_retires_json = ?,
          fond_veille = ?,
          montant_lgpi = ?,
          results_json = ?,
          notes = ?
        WHERE id = ?`,
        [
          closureData.fonds_caisses_json,
          closureData.total_pieces,
          closureData.billets_retires_json,
          closureData.fond_veille,
          closureData.montant_lgpi,
          closureData.results_json,
          closureData.notes,
          id,
        ]
      )
    } else {
      // Insertion
      db.run(
        `INSERT INTO cash_closures
          (id, date, fonds_caisses_json, total_pieces, billets_retires_json, fond_veille, montant_lgpi, results_json, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          closureData.id,
          closureData.date,
          closureData.fonds_caisses_json,
          closureData.total_pieces,
          closureData.billets_retires_json,
          closureData.fond_veille,
          closureData.montant_lgpi,
          closureData.results_json,
          closureData.notes,
          closureData.created_at,
        ]
      )
    }

    await this.saveDb()
    return closureData
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    db.run('DELETE FROM cash_closures WHERE id = ?', [id])
    await this.saveDb()
  }
}
