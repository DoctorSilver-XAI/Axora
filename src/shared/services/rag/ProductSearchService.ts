/**
 * Service de recherche de produits pharmaceutiques
 * Utilise Supabase avec pgvector et full-text search
 */

import { supabase } from '@shared/lib/supabase'
import { EmbeddingService } from './EmbeddingService'
import { SearchResult, SearchOptions, PharmaceuticalProduct, ProductData } from './types'

const DEFAULT_OPTIONS: SearchOptions = {
  matchCount: 5,
  vectorWeight: 0.7,
  textWeight: 0.3,
  category: null,
  similarityThreshold: 0.3,
}

export const ProductSearchService = {
  /**
   * Recherche hybride : combine similarité vectorielle et full-text
   * C'est la méthode principale à utiliser
   */
  async searchHybrid(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Générer l'embedding de la requête
    const queryEmbedding = await EmbeddingService.embed(query)

    // Appeler la fonction RPC Supabase
    const { data, error } = await supabase.rpc('search_products_hybrid', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: opts.matchCount,
      vector_weight: opts.vectorWeight,
      text_weight: opts.textWeight,
      category_filter: opts.category,
      similarity_threshold: opts.similarityThreshold,
    })

    if (error) {
      console.error('Erreur recherche hybride:', error)
      throw error
    }

    return (data || []).map(mapToSearchResult)
  },

  /**
   * Recherche sémantique pure (similarité vectorielle uniquement)
   * Utile pour des requêtes conceptuelles/floues
   */
  async searchSemantic(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    const queryEmbedding = await EmbeddingService.embed(query)

    const { data, error } = await supabase.rpc('search_products_semantic', {
      query_embedding: queryEmbedding,
      match_count: options.matchCount || 5,
      category_filter: options.category || null,
      similarity_threshold: options.similarityThreshold || 0.5,
    })

    if (error) {
      console.error('Erreur recherche sémantique:', error)
      throw error
    }

    return (data || []).map((item) => ({
      ...mapToProduct(item),
      vectorScore: item.similarity,
      textScore: 0,
      combinedScore: item.similarity,
    }))
  },

  /**
   * Recherche full-text pure (mots-clés exacts)
   * Utile pour codes CIP, noms exacts, DCI
   */
  async searchFullText(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_products_fulltext', {
      query_text: query,
      match_count: options.matchCount || 10,
      category_filter: options.category || null,
    })

    if (error) {
      console.error('Erreur recherche full-text:', error)
      throw error
    }

    return (data || []).map((item) => ({
      ...mapToProduct(item),
      vectorScore: 0,
      textScore: item.rank,
      combinedScore: item.rank,
    }))
  },

  /**
   * Récupère un produit par son ID
   */
  async getById(id: string): Promise<PharmaceuticalProduct | null> {
    const { data, error } = await supabase
      .from('pharmaceutical_products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erreur récupération produit:', error)
      return null
    }

    return mapToProduct(data)
  },

  /**
   * Récupère un produit par son code (CIP, CIS, etc.)
   */
  async getByCode(productCode: string): Promise<PharmaceuticalProduct | null> {
    const { data, error } = await supabase
      .from('pharmaceutical_products')
      .select('*')
      .eq('product_code', productCode)
      .single()

    if (error) {
      console.error('Erreur récupération produit par code:', error)
      return null
    }

    return mapToProduct(data)
  },

  /**
   * Récupère tous les produits d'une catégorie
   */
  async getByCategory(category: string, limit = 20): Promise<PharmaceuticalProduct[]> {
    const { data, error } = await supabase
      .from('pharmaceutical_products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .limit(limit)

    if (error) {
      console.error('Erreur récupération par catégorie:', error)
      throw error
    }

    return (data || []).map(mapToProduct)
  },

  /**
   * Récupère tous les produits actifs (pour admin/debug)
   */
  async getAll(limit = 100): Promise<PharmaceuticalProduct[]> {
    const { data, error } = await supabase
      .from('pharmaceutical_products')
      .select('*')
      .eq('is_active', true)
      .order('product_name')
      .limit(limit)

    if (error) {
      console.error('Erreur récupération tous produits:', error)
      throw error
    }

    return (data || []).map(mapToProduct)
  },

  /**
   * Compte le nombre total de produits
   */
  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('pharmaceutical_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      console.error('Erreur comptage produits:', error)
      return 0
    }

    return count || 0
  },
}

// ===========================================
// HELPERS DE MAPPING
// ===========================================

/**
 * Convertit une row Supabase en PharmaceuticalProduct
 */
function mapToProduct(row: Record<string, unknown>): PharmaceuticalProduct {
  return {
    id: row.id as string,
    productCode: row.product_code as string,
    productName: row.product_name as string,
    dci: row.dci as string | null,
    laboratory: row.laboratory as string | null,
    atcCode: row.atc_code as string | null,
    dosageForm: row.dosage_form as string | null,
    category: row.category as string | null,
    tags: (row.tags as string[]) || [],
    productData: row.product_data as ProductData,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  }
}

/**
 * Convertit une row de résultat de recherche en SearchResult
 */
function mapToSearchResult(row: Record<string, unknown>): SearchResult {
  return {
    ...mapToProduct(row),
    vectorScore: (row.vector_score as number) || 0,
    textScore: (row.text_score as number) || 0,
    combinedScore: (row.combined_score as number) || 0,
  }
}
