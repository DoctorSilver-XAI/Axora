/**
 * Repository SQLite pour les données BDPM locales
 * Permet une recherche hors-ligne des médicaments et posologies
 */

import { SQLiteDatabase } from './SQLiteDatabase'

// ============================================
// INTERFACES
// ============================================

export interface LocalBDPMMedicament {
  code_cis: string
  denomination: string
  forme_pharmaceutique: string | null
  voies_administration: string | null
  dci_principal: string | null
  laboratoire: string | null
  etat_commercialisation: string
  surveillance_renforcee: number
  created_at: string
}

export interface LocalBDPMComposition {
  id: number
  code_cis: string
  substance: string
  dosage: string | null
  reference_dosage: string | null
}

export interface LocalBDPMPresentation {
  id: number
  code_cis: string
  cip13: string
  cip7: string | null
  libelle: string
  prix: number | null
  remboursement: string | null
  commercialise: number
}

export interface LocalBDPMPosologie {
  id: number
  dci: string
  dci_normalized: string
  mg_per_kg_per_day: number
  max_daily_mg: number
  max_single_dose_mg: number
  default_frequency: number
  min_interval_hours: number
  min_age_months: number | null
  max_age_years: number | null
  notes: string // JSON array
}

export interface LocalBDPMSearchResult {
  medicament: LocalBDPMMedicament
  compositions: LocalBDPMComposition[]
  presentations: LocalBDPMPresentation[]
  posologie: LocalBDPMPosologie | null
}

// ============================================
// REPOSITORY
// ============================================

export class BDPMRepository {
  private initialized = false

  private async getDb() {
    const database = await SQLiteDatabase.getInstance()
    if (!this.initialized) {
      await this.initializeSchema()
      this.initialized = true
    }
    return database.getDb()
  }

  private async saveDb() {
    const database = await SQLiteDatabase.getInstance()
    database.save()
  }

  /**
   * Initialise le schéma SQLite pour les données BDPM
   */
  private async initializeSchema() {
    const database = await SQLiteDatabase.getInstance()
    const db = database.getDb()

    if (!db) {
      console.error('[BDPMRepository] Database not available')
      return
    }

    // Table des médicaments
    db.run(`
      CREATE TABLE IF NOT EXISTS bdpm_medicaments (
        code_cis TEXT PRIMARY KEY,
        denomination TEXT NOT NULL,
        forme_pharmaceutique TEXT,
        voies_administration TEXT,
        dci_principal TEXT,
        laboratoire TEXT,
        etat_commercialisation TEXT NOT NULL DEFAULT 'Commercialisée',
        surveillance_renforcee INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Table des compositions (substances actives)
    db.run(`
      CREATE TABLE IF NOT EXISTS bdpm_compositions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_cis TEXT NOT NULL,
        substance TEXT NOT NULL,
        dosage TEXT,
        reference_dosage TEXT,
        FOREIGN KEY (code_cis) REFERENCES bdpm_medicaments(code_cis)
      )
    `)

    // Table des présentations (conditionnements)
    db.run(`
      CREATE TABLE IF NOT EXISTS bdpm_presentations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_cis TEXT NOT NULL,
        cip13 TEXT NOT NULL UNIQUE,
        cip7 TEXT,
        libelle TEXT NOT NULL,
        prix REAL,
        remboursement TEXT,
        commercialise INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (code_cis) REFERENCES bdpm_medicaments(code_cis)
      )
    `)

    // Table des posologies (référentiel)
    db.run(`
      CREATE TABLE IF NOT EXISTS bdpm_posologies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dci TEXT NOT NULL,
        dci_normalized TEXT NOT NULL,
        mg_per_kg_per_day REAL NOT NULL,
        max_daily_mg REAL NOT NULL,
        max_single_dose_mg REAL NOT NULL,
        default_frequency INTEGER NOT NULL DEFAULT 3,
        min_interval_hours INTEGER NOT NULL DEFAULT 8,
        min_age_months INTEGER,
        max_age_years INTEGER,
        notes TEXT NOT NULL DEFAULT '[]'
      )
    `)

    // Index pour les recherches
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_denomination ON bdpm_medicaments(denomination)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_dci ON bdpm_medicaments(dci_principal)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_compo_cis ON bdpm_compositions(code_cis)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_pres_cis ON bdpm_presentations(code_cis)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_pres_cip ON bdpm_presentations(cip13)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_bdpm_poso_dci ON bdpm_posologies(dci_normalized)`)

    database.save()
    console.log('[BDPMRepository] Schema initialized')
  }

  // ============================================
  // MÉTHODES DE RECHERCHE
  // ============================================

  /**
   * Recherche des médicaments par nom ou DCI
   */
  async search(query: string, limit = 10): Promise<LocalBDPMSearchResult[]> {
    const db = await this.getDb()
    if (!db) return []

    const searchPattern = `%${query}%`
    const results: LocalBDPMSearchResult[] = []

    try {
      // Recherche dans les médicaments
      const stmt = db.prepare(`
        SELECT * FROM bdpm_medicaments
        WHERE denomination LIKE ? OR dci_principal LIKE ?
        ORDER BY
          CASE WHEN dci_principal LIKE ? THEN 0 ELSE 1 END,
          denomination
        LIMIT ?
      `)
      stmt.bind([searchPattern, searchPattern, searchPattern, limit])

      while (stmt.step()) {
        const medicament = stmt.getAsObject() as LocalBDPMMedicament
        const compositions = await this.getCompositions(medicament.code_cis)
        const presentations = await this.getPresentations(medicament.code_cis)
        const posologie = await this.getPosologieByDCI(medicament.dci_principal)

        results.push({
          medicament,
          compositions,
          presentations,
          posologie,
        })
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Search error:', error)
    }

    return results
  }

  /**
   * Recherche par code CIP (code-barres)
   */
  async searchByCIP(cip: string): Promise<LocalBDPMSearchResult | null> {
    const db = await this.getDb()
    if (!db) return null

    // Normaliser le CIP
    const normalizedCip = cip.replace(/[\s-]/g, '')

    try {
      // Trouver la présentation
      const presStmt = db.prepare(`
        SELECT code_cis FROM bdpm_presentations
        WHERE cip13 = ? OR cip7 = ?
        LIMIT 1
      `)
      presStmt.bind([normalizedCip, normalizedCip])

      let codeCis: string | null = null
      if (presStmt.step()) {
        codeCis = (presStmt.getAsObject() as { code_cis: string }).code_cis
      }
      presStmt.free()

      if (!codeCis) return null

      return this.getByCodeCIS(codeCis)
    } catch (error) {
      console.error('[BDPMRepository] Search by CIP error:', error)
      return null
    }
  }

  /**
   * Récupère un médicament par son code CIS
   */
  async getByCodeCIS(codeCis: string): Promise<LocalBDPMSearchResult | null> {
    const db = await this.getDb()
    if (!db) return null

    try {
      const stmt = db.prepare(`SELECT * FROM bdpm_medicaments WHERE code_cis = ?`)
      stmt.bind([codeCis])

      if (stmt.step()) {
        const medicament = stmt.getAsObject() as LocalBDPMMedicament
        stmt.free()

        const compositions = await this.getCompositions(codeCis)
        const presentations = await this.getPresentations(codeCis)
        const posologie = await this.getPosologieByDCI(medicament.dci_principal)

        return { medicament, compositions, presentations, posologie }
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Get by CIS error:', error)
    }

    return null
  }

  /**
   * Récupère les compositions d'un médicament
   */
  private async getCompositions(codeCis: string): Promise<LocalBDPMComposition[]> {
    const db = await this.getDb()
    if (!db) return []

    const compositions: LocalBDPMComposition[] = []

    try {
      const stmt = db.prepare(`SELECT * FROM bdpm_compositions WHERE code_cis = ?`)
      stmt.bind([codeCis])

      while (stmt.step()) {
        compositions.push(stmt.getAsObject() as LocalBDPMComposition)
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Get compositions error:', error)
    }

    return compositions
  }

  /**
   * Récupère les présentations d'un médicament
   */
  private async getPresentations(codeCis: string): Promise<LocalBDPMPresentation[]> {
    const db = await this.getDb()
    if (!db) return []

    const presentations: LocalBDPMPresentation[] = []

    try {
      const stmt = db.prepare(`
        SELECT * FROM bdpm_presentations
        WHERE code_cis = ?
        ORDER BY prix ASC NULLS LAST
      `)
      stmt.bind([codeCis])

      while (stmt.step()) {
        presentations.push(stmt.getAsObject() as LocalBDPMPresentation)
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Get presentations error:', error)
    }

    return presentations
  }

  // ============================================
  // MÉTHODES POSOLOGIES
  // ============================================

  /**
   * Récupère la posologie par DCI
   */
  async getPosologieByDCI(dci: string | null): Promise<LocalBDPMPosologie | null> {
    if (!dci) return null

    const db = await this.getDb()
    if (!db) return null

    // Normaliser le DCI
    const normalized = this.normalizeDCI(dci)

    try {
      const stmt = db.prepare(`
        SELECT * FROM bdpm_posologies
        WHERE dci_normalized = ? OR dci_normalized LIKE ?
        LIMIT 1
      `)
      stmt.bind([normalized, `%${normalized}%`])

      if (stmt.step()) {
        const result = stmt.getAsObject() as LocalBDPMPosologie
        stmt.free()
        return result
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Get posologie error:', error)
    }

    return null
  }

  /**
   * Liste toutes les posologies disponibles
   */
  async getAllPosologies(): Promise<LocalBDPMPosologie[]> {
    const db = await this.getDb()
    if (!db) return []

    const posologies: LocalBDPMPosologie[] = []

    try {
      const stmt = db.prepare(`SELECT * FROM bdpm_posologies ORDER BY dci`)

      while (stmt.step()) {
        posologies.push(stmt.getAsObject() as LocalBDPMPosologie)
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Get all posologies error:', error)
    }

    return posologies
  }

  // ============================================
  // MÉTHODES D'IMPORT
  // ============================================

  /**
   * Import en masse des médicaments
   */
  async bulkInsertMedicaments(medicaments: Omit<LocalBDPMMedicament, 'created_at'>[]): Promise<number> {
    const db = await this.getDb()
    if (!db) return 0

    let count = 0

    try {
      db.run('BEGIN TRANSACTION')

      for (const med of medicaments) {
        db.run(
          `INSERT OR REPLACE INTO bdpm_medicaments
           (code_cis, denomination, forme_pharmaceutique, voies_administration, dci_principal, laboratoire, etat_commercialisation, surveillance_renforcee)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            med.code_cis,
            med.denomination,
            med.forme_pharmaceutique,
            med.voies_administration,
            med.dci_principal,
            med.laboratoire,
            med.etat_commercialisation,
            med.surveillance_renforcee ? 1 : 0,
          ]
        )
        count++
      }

      db.run('COMMIT')
      await this.saveDb()
    } catch (error) {
      db.run('ROLLBACK')
      console.error('[BDPMRepository] Bulk insert medicaments error:', error)
    }

    return count
  }

  /**
   * Import en masse des compositions
   */
  async bulkInsertCompositions(compositions: Omit<LocalBDPMComposition, 'id'>[]): Promise<number> {
    const db = await this.getDb()
    if (!db) return 0

    let count = 0

    try {
      db.run('BEGIN TRANSACTION')

      for (const comp of compositions) {
        db.run(
          `INSERT INTO bdpm_compositions (code_cis, substance, dosage, reference_dosage)
           VALUES (?, ?, ?, ?)`,
          [comp.code_cis, comp.substance, comp.dosage, comp.reference_dosage]
        )
        count++
      }

      db.run('COMMIT')
      await this.saveDb()
    } catch (error) {
      db.run('ROLLBACK')
      console.error('[BDPMRepository] Bulk insert compositions error:', error)
    }

    return count
  }

  /**
   * Import en masse des présentations
   */
  async bulkInsertPresentations(presentations: Omit<LocalBDPMPresentation, 'id'>[]): Promise<number> {
    const db = await this.getDb()
    if (!db) return 0

    let count = 0

    try {
      db.run('BEGIN TRANSACTION')

      for (const pres of presentations) {
        db.run(
          `INSERT OR REPLACE INTO bdpm_presentations
           (code_cis, cip13, cip7, libelle, prix, remboursement, commercialise)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pres.code_cis,
            pres.cip13,
            pres.cip7,
            pres.libelle,
            pres.prix,
            pres.remboursement,
            pres.commercialise ? 1 : 0,
          ]
        )
        count++
      }

      db.run('COMMIT')
      await this.saveDb()
    } catch (error) {
      db.run('ROLLBACK')
      console.error('[BDPMRepository] Bulk insert presentations error:', error)
    }

    return count
  }

  /**
   * Import en masse des posologies
   */
  async bulkInsertPosologies(
    posologies: Omit<LocalBDPMPosologie, 'id' | 'dci_normalized'>[]
  ): Promise<number> {
    const db = await this.getDb()
    if (!db) return 0

    let count = 0

    try {
      db.run('BEGIN TRANSACTION')

      for (const poso of posologies) {
        const normalized = this.normalizeDCI(poso.dci)
        db.run(
          `INSERT OR REPLACE INTO bdpm_posologies
           (dci, dci_normalized, mg_per_kg_per_day, max_daily_mg, max_single_dose_mg, default_frequency, min_interval_hours, min_age_months, max_age_years, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            poso.dci,
            normalized,
            poso.mg_per_kg_per_day,
            poso.max_daily_mg,
            poso.max_single_dose_mg,
            poso.default_frequency,
            poso.min_interval_hours,
            poso.min_age_months,
            poso.max_age_years,
            typeof poso.notes === 'string' ? poso.notes : JSON.stringify(poso.notes),
          ]
        )
        count++
      }

      db.run('COMMIT')
      await this.saveDb()
    } catch (error) {
      db.run('ROLLBACK')
      console.error('[BDPMRepository] Bulk insert posologies error:', error)
    }

    return count
  }

  /**
   * Vide toutes les tables BDPM
   */
  async clearAll(): Promise<void> {
    const db = await this.getDb()
    if (!db) return

    try {
      db.run('DELETE FROM bdpm_compositions')
      db.run('DELETE FROM bdpm_presentations')
      db.run('DELETE FROM bdpm_posologies')
      db.run('DELETE FROM bdpm_medicaments')
      await this.saveDb()
      console.log('[BDPMRepository] All tables cleared')
    } catch (error) {
      console.error('[BDPMRepository] Clear error:', error)
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Normalise un DCI pour la recherche
   */
  private normalizeDCI(dci: string): string {
    return dci
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Compte le nombre de médicaments
   */
  async count(): Promise<number> {
    const db = await this.getDb()
    if (!db) return 0

    try {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM bdpm_medicaments')
      if (stmt.step()) {
        const result = stmt.getAsObject() as { count: number }
        stmt.free()
        return result.count
      }
      stmt.free()
    } catch (error) {
      console.error('[BDPMRepository] Count error:', error)
    }

    return 0
  }

  /**
   * Vérifie si la base est initialisée avec des données
   */
  async isInitialized(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }
}
