/**
 * MultiIndexService - Abstraction pour opérations multi-index RAG
 * Permet de rechercher et gérer des documents dans différents index
 */

import { supabase } from '@shared/lib/supabase'
import { EmbeddingService } from './EmbeddingService'

// Import dynamique pour éviter les dépendances circulaires
let IndexRegistry: {
  get: (id: string) => {
    id: string
    tableName: string
    searchConfig: {
      rpcFunctionName: string
      vectorWeight: number
      textWeight: number
      defaultMatchCount: number
    }
  } | undefined
} | null = null

async function getIndexRegistry() {
  if (!IndexRegistry) {
    const module = await import('@modules/rag-studio/services/IndexRegistry')
    IndexRegistry = module.IndexRegistry
  }
  return IndexRegistry
}

interface GetDocumentsOptions {
  page?: number
  limit?: number
  search?: string
}

interface GetDocumentsResult {
  documents: Record<string, unknown>[]
  total: number
  hasMore: boolean
}

interface SearchOptions {
  matchCount?: number
  threshold?: number
}

export const MultiIndexService = {
  /**
   * Recherche hybride dans un index spécifique
   */
  async searchIndex(
    indexId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<Record<string, unknown>[]> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    const queryEmbedding = await EmbeddingService.embed(query)

    const { data, error } = await supabase.rpc(index.searchConfig.rpcFunctionName, {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: options.matchCount || index.searchConfig.defaultMatchCount,
      vector_weight: index.searchConfig.vectorWeight,
      text_weight: index.searchConfig.textWeight,
      similarity_threshold: options.threshold || 0.3,
    })

    if (error) {
      console.error('[MultiIndexService] Erreur recherche:', error)
      throw error
    }

    return data || []
  },

  /**
   * Récupère les documents paginés d'un index
   */
  async getDocuments(indexId: string, options: GetDocumentsOptions = {}): Promise<GetDocumentsResult> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    const page = options.page || 0
    const limit = options.limit || 20
    const offset = page * limit

    // Construire la requête
    let query = supabase
      .from(index.tableName)
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Ajouter la recherche textuelle si présente
    if (options.search) {
      query = query.textSearch('searchable_text', options.search, {
        type: 'websearch',
        config: 'french',
      })
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[MultiIndexService] Erreur getDocuments:', error)
      throw error
    }

    const total = count || 0
    const hasMore = offset + limit < total

    return {
      documents: data || [],
      total,
      hasMore,
    }
  },

  /**
   * Récupère un document par ID
   */
  async getDocumentById(indexId: string, documentId: string): Promise<Record<string, unknown> | null> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    const { data, error } = await supabase
      .from(index.tableName)
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  },

  /**
   * Compte le nombre de documents dans un index
   */
  async getDocumentCount(indexId: string): Promise<number> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    const { count, error } = await supabase
      .from(index.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) {
      console.error('[MultiIndexService] Erreur count:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Ingère un document dans un index
   */
  async ingestDocument(
    indexId: string,
    document: Record<string, unknown>,
    searchableText: string
  ): Promise<string> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    // Générer l'embedding
    const embedding = await EmbeddingService.embed(searchableText)

    // Insérer dans la table
    const { data, error } = await supabase
      .from(index.tableName)
      .insert({
        ...document,
        searchable_text: searchableText,
        embedding: embedding,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[MultiIndexService] Erreur ingestion:', error)
      throw error
    }

    return data.id
  },

  /**
   * Met à jour un document (régénère l'embedding)
   */
  async updateDocument(
    indexId: string,
    documentId: string,
    document: Record<string, unknown>,
    searchableText: string
  ): Promise<void> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    // Régénérer l'embedding
    const embedding = await EmbeddingService.embed(searchableText)

    const { error } = await supabase
      .from(index.tableName)
      .update({
        ...document,
        searchable_text: searchableText,
        embedding: embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (error) {
      console.error('[MultiIndexService] Erreur update:', error)
      throw error
    }
  },

  /**
   * Supprime un document (soft delete)
   */
  async deleteDocument(indexId: string, documentId: string): Promise<void> {
    const registry = await getIndexRegistry()
    const index = registry.get(indexId)
    if (!index) throw new Error(`Index "${indexId}" non trouvé`)

    const { error } = await supabase
      .from(index.tableName)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    if (error) {
      console.error('[MultiIndexService] Erreur delete:', error)
      throw error
    }
  },
}
