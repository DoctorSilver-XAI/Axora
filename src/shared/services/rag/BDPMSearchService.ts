/**
 * Service de recherche dans la Base de Données Publique des Médicaments (BDPM)
 * Source officielle ANSM - Données de référence pour les médicaments français
 */

import { supabase } from '@shared/lib/supabase'
import { EmbeddingService } from './EmbeddingService'

// ============================================
// TYPES
// ============================================

export interface BDPMPresentation {
  cip13: string
  cip7?: string
  libelle: string
  prix: number | null
  remboursement: string | null
  commercialise: boolean
}

export interface BDPMSubstance {
  substance: string
  dosage: string | null
  reference?: string
}

export interface BDPMGenerique {
  id_groupe: number
  libelle: string
  type: 'princeps' | 'générique' | 'complémentarité posologique' | 'générique substituable' | 'autre'
  type_code: number
}

export interface BDPMDisponibilite {
  statut: string
  code: number // 1=rupture, 2=tension, 3=arrêt, 4=remise dispo
  date_debut?: string
  date_maj?: string
  date_remise?: string | null
  lien?: string
}

export interface BDPMAlerte {
  texte: string
  lien?: string
  date_debut?: string
  date_fin?: string | null
}

export interface BDPMAvisSMR {
  valeur: string
  libelle?: string
  date?: string
  motif?: string
}

export interface BDPMProductData {
  presentations?: BDPMPresentation[]
  substances_actives?: BDPMSubstance[]
  conditions_delivrance?: string[]
  info_generique?: BDPMGenerique | null
  avis_smr?: BDPMAvisSMR | null
  avis_asmr?: BDPMAvisSMR | null
  alertes_actives?: BDPMAlerte[]
  disponibilite?: BDPMDisponibilite | null
  surveillance_renforcee?: boolean
}

export interface BDPMProduct {
  id: string
  codeCis: string
  productName: string
  dci: string | null
  laboratory: string | null
  formePharmaceutique?: string | null
  codeAtc?: string | null
  productData: BDPMProductData
  hasRupture: boolean
  hasAlerte: boolean
  isGenerique: boolean
  isMitm: boolean
  vectorScore: number
  textScore: number
  combinedScore: number
}

export interface BDPMSearchOptions {
  matchCount?: number
  vectorWeight?: number
  textWeight?: number
  includeRuptures?: boolean
  onlyCommercialised?: boolean
  threshold?: number
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_OPTIONS: BDPMSearchOptions = {
  matchCount: 5,
  vectorWeight: 0.7,
  textWeight: 0.3,
  includeRuptures: true,
  onlyCommercialised: false,
  threshold: 0.3,
}

// ============================================
// SERVICE
// ============================================

export const BDPMSearchService = {
  /**
   * Recherche hybride dans la base BDPM
   * Combine similarité vectorielle (70%) et full-text français (30%)
   */
  async searchHybrid(query: string, options: BDPMSearchOptions = {}): Promise<BDPMProduct[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
      const queryEmbedding = await EmbeddingService.embed(query)

      const { data, error } = await supabase.rpc('search_bdpm_hybrid', {
        query_text: query,
        query_embedding: queryEmbedding,
        match_count: opts.matchCount,
        vector_weight: opts.vectorWeight,
        text_weight: opts.textWeight,
        include_ruptures: opts.includeRuptures,
        only_commercialised: opts.onlyCommercialised,
        similarity_threshold: opts.threshold,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur recherche hybride:', error)
        throw error
      }

      return (data || []).map(mapToProduct)
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return []
    }
  },

  /**
   * Recherche exacte par code CIP (13 ou 7 chiffres)
   * Utilisé quand l'utilisateur scanne un code-barres ou saisit un CIP
   */
  async searchByCIP(cipCode: string): Promise<BDPMProduct | null> {
    // Normaliser le code CIP (retirer espaces, tirets)
    const normalized = cipCode.replace(/[\s-]/g, '')

    try {
      const { data, error } = await supabase.rpc('search_bdpm_by_cip', {
        cip_code: normalized,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur recherche CIP:', error)
        return null
      }

      if (!data?.[0]) return null

      return mapToProduct({
        ...data[0],
        vector_score: 1,
        text_score: 1,
        combined_score: 1,
      })
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return null
    }
  },

  /**
   * Recherche exacte par code CIS (8 chiffres)
   */
  async searchByCIS(cisCode: string): Promise<BDPMProduct | null> {
    try {
      const { data, error } = await supabase.rpc('search_bdpm_by_cis', {
        cis_code: cisCode,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur recherche CIS:', error)
        return null
      }

      if (!data?.[0]) return null

      return mapToProduct({
        ...data[0],
        vector_score: 1,
        text_score: 1,
        combined_score: 1,
      })
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return null
    }
  },

  /**
   * Trouve tous les génériques d'un médicament
   * Retourne le princeps et tous les génériques du même groupe
   */
  async findGeneriques(cisCode: string): Promise<BDPMProduct[]> {
    try {
      const { data, error } = await supabase.rpc('search_bdpm_generiques', {
        cis_code: cisCode,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur recherche génériques:', error)
        return []
      }

      return (data || []).map((row: Record<string, unknown>) =>
        mapToProduct({
          ...row,
          vector_score: 1,
          text_score: 1,
          combined_score: 1,
        })
      )
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return []
    }
  },

  /**
   * Recherche par DCI (substance active)
   * Ex: "paracétamol", "ibuprofène"
   */
  async searchByDCI(dci: string, limit = 20): Promise<BDPMProduct[]> {
    try {
      const { data, error } = await supabase.rpc('search_bdpm_by_dci', {
        dci_search: dci,
        max_results: limit,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur recherche DCI:', error)
        return []
      }

      return (data || []).map((row: Record<string, unknown>) =>
        mapToProduct({
          ...row,
          vector_score: 1,
          text_score: 1,
          combined_score: 1,
        })
      )
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return []
    }
  },

  /**
   * Liste des médicaments en rupture de stock ou tension
   */
  async getRuptures(limit = 50): Promise<BDPMProduct[]> {
    try {
      const { data, error } = await supabase.rpc('get_bdpm_ruptures', {
        max_results: limit,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur liste ruptures:', error)
        return []
      }

      return (data || []).map((row: Record<string, unknown>) =>
        mapToProduct({
          ...row,
          has_rupture: true,
          vector_score: 0,
          text_score: 0,
          combined_score: 0,
        })
      )
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return []
    }
  },

  /**
   * Liste des médicaments avec alertes de sécurité actives
   */
  async getAlertes(limit = 50): Promise<BDPMProduct[]> {
    try {
      const { data, error } = await supabase.rpc('get_bdpm_alertes', {
        max_results: limit,
      })

      if (error) {
        console.error('[BDPMSearch] Erreur liste alertes:', error)
        return []
      }

      return (data || []).map((row: Record<string, unknown>) =>
        mapToProduct({
          ...row,
          has_alerte: true,
          vector_score: 0,
          text_score: 0,
          combined_score: 0,
        })
      )
    } catch (err) {
      console.error('[BDPMSearch] Erreur:', err)
      return []
    }
  },

  /**
   * Compte le nombre total de médicaments BDPM
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('bdpm_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      console.error('[BDPMSearch] Erreur comptage:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Vérifie si la base BDPM est disponible et peuplée
   */
  async isAvailable(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  },
}

// ============================================
// HELPERS
// ============================================

/**
 * Convertit une row Supabase en BDPMProduct
 */
function mapToProduct(row: Record<string, unknown>): BDPMProduct {
  return {
    id: row.id as string,
    codeCis: row.code_cis as string,
    productName: row.product_name as string,
    dci: row.dci as string | null,
    laboratory: row.laboratory as string | null,
    formePharmaceutique: row.forme_pharmaceutique as string | null,
    codeAtc: row.code_atc as string | null,
    productData: row.product_data as BDPMProductData,
    hasRupture: Boolean(row.has_rupture),
    hasAlerte: Boolean(row.has_alerte),
    isGenerique: Boolean(row.is_generique),
    isMitm: Boolean(row.is_mitm),
    vectorScore: (row.vector_score as number) || 0,
    textScore: (row.text_score as number) || 0,
    combinedScore: (row.combined_score as number) || 0,
  }
}
