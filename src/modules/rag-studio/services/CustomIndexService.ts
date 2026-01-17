/**
 * CustomIndexService - CRUD pour les index RAG custom
 *
 * Gère la création, lecture, mise à jour et suppression des index
 * personnalisés stockés dans Supabase.
 */

import { supabase } from '@shared/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface CustomIndexRow {
  id: string
  user_id: string
  slug: string
  name: string
  description: string | null
  icon: string
  category: string
  schema_config: Record<string, unknown>
  embedding_model: string
  search_weights: { vector: number; text: number }
  status: string
  document_count: number
  created_at: string
  updated_at: string
}

export interface CustomIndexDefinition {
  id: string
  userId: string
  slug: string
  name: string
  description: string | null
  icon: string
  category: string
  schemaConfig: Record<string, unknown>
  embeddingModel: string
  searchWeights: { vector: number; text: number }
  status: string
  documentCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateIndexParams {
  name: string
  slug: string
  description?: string
  icon?: string
  schemaConfig?: Record<string, unknown>
}

export interface UpdateIndexParams {
  name?: string
  description?: string
  icon?: string
  status?: string
  schemaConfig?: Record<string, unknown>
}

// ============================================================================
// SERVICE
// ============================================================================

export const CustomIndexService = {
  /**
   * Crée un nouvel index custom
   */
  async createIndex(params: CreateIndexParams): Promise<CustomIndexDefinition> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('Non authentifié')
    }

    const { data, error } = await supabase
      .from('custom_rag_indexes')
      .insert({
        user_id: user.user.id,
        slug: params.slug,
        name: params.name,
        description: params.description || null,
        icon: params.icon || 'Database',
        schema_config: params.schemaConfig || {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Un index avec cet identifiant existe déjà')
      }
      throw error
    }

    return this.mapToDefinition(data as CustomIndexRow)
  },

  /**
   * Liste tous les index de l'utilisateur courant
   */
  async listIndexes(): Promise<CustomIndexDefinition[]> {
    const { data, error } = await supabase
      .from('custom_rag_indexes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((row) => this.mapToDefinition(row as CustomIndexRow))
  },

  /**
   * Récupère un index par son ID
   */
  async getIndex(indexId: string): Promise<CustomIndexDefinition | null> {
    const { data, error } = await supabase
      .from('custom_rag_indexes')
      .select('*')
      .eq('id', indexId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return this.mapToDefinition(data as CustomIndexRow)
  },

  /**
   * Récupère un index par son slug
   */
  async getIndexBySlug(slug: string): Promise<CustomIndexDefinition | null> {
    const { data, error } = await supabase
      .from('custom_rag_indexes')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return this.mapToDefinition(data as CustomIndexRow)
  },

  /**
   * Met à jour un index
   */
  async updateIndex(
    indexId: string,
    params: UpdateIndexParams
  ): Promise<CustomIndexDefinition> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (params.name !== undefined) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description
    if (params.icon !== undefined) updateData.icon = params.icon
    if (params.status !== undefined) updateData.status = params.status
    if (params.schemaConfig !== undefined) updateData.schema_config = params.schemaConfig

    const { data, error } = await supabase
      .from('custom_rag_indexes')
      .update(updateData)
      .eq('id', indexId)
      .select()
      .single()

    if (error) throw error

    return this.mapToDefinition(data as CustomIndexRow)
  },

  /**
   * Supprime un index (cascade vers les documents)
   */
  async deleteIndex(indexId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_rag_indexes')
      .delete()
      .eq('id', indexId)

    if (error) throw error
  },

  /**
   * Vérifie si un slug est disponible
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return false

    const { count, error } = await supabase
      .from('custom_rag_indexes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user.id)
      .eq('slug', slug)

    if (error) return false
    return count === 0
  },

  /**
   * Normalise un slug (lowercase, underscores uniquement)
   */
  normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Retire les accents
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50)
  },

  /**
   * Mappe une row Supabase vers le type TypeScript
   */
  mapToDefinition(row: CustomIndexRow): CustomIndexDefinition {
    return {
      id: row.id,
      userId: row.user_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: row.icon,
      category: row.category,
      schemaConfig: row.schema_config,
      embeddingModel: row.embedding_model,
      searchWeights: row.search_weights,
      status: row.status,
      documentCount: row.document_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  },
}
