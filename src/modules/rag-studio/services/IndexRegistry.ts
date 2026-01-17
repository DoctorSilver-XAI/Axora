/**
 * IndexRegistry - Registre centralisé des index RAG
 * Pattern singleton similaire à ModuleRegistry
 */

import { Pill, Layers, FileText, ClipboardList, Database, Building2, Sparkles } from 'lucide-react'
import { IndexDefinition, IndexCategory, IndexStats, IndexStatus } from '../types'
import { supabase } from '@shared/lib/supabase'
import { CustomIndexService, CustomIndexDefinition } from './CustomIndexService'

// Mapping des noms d'icônes vers les composants Lucide
const ICON_MAP: Record<string, typeof Database> = {
  Database,
  Building2,
  FileText,
  Pill,
  Layers,
  ClipboardList,
  Sparkles,
}

// ============================================================================
// INDEX PAR DÉFAUT
// ============================================================================

const DEFAULT_INDEXES: IndexDefinition[] = [
  {
    id: 'pharmaceutical_products',
    name: 'Produits pharmaceutiques',
    description: 'Catalogue de médicaments avec données complètes (posologie, CI, interactions)',
    icon: Pill,
    category: 'products',
    tableName: 'pharmaceutical_products',
    schemaVersion: '1.0',
    searchConfig: {
      rpcFunctionName: 'search_products_hybrid',
      vectorWeight: 0.7,
      textWeight: 0.3,
      defaultMatchCount: 5,
    },
    embeddingConfig: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      prepareTextFn: 'prepareProductText',
    },
    status: 'active',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
  },
]

// ============================================================================
// INDEX REGISTRY CLASS
// ============================================================================

class IndexRegistryClass {
  private indexes: Map<string, IndexDefinition> = new Map()
  private statsCache: Map<string, IndexStats> = new Map()
  private customIndexesLoaded = false

  constructor() {
    DEFAULT_INDEXES.forEach((idx) => this.register(idx))
  }

  /**
   * Charge les index custom depuis Supabase
   */
  async loadCustomIndexes(): Promise<void> {
    if (this.customIndexesLoaded) return

    try {
      const customIndexes = await CustomIndexService.listIndexes()

      for (const custom of customIndexes) {
        const definition = this.mapCustomToDefinition(custom)
        this.register(definition)
      }

      this.customIndexesLoaded = true
      console.log(`[IndexRegistry] ${customIndexes.length} index custom chargés`)
    } catch (err) {
      console.error('[IndexRegistry] Erreur chargement custom indexes:', err)
    }
  }

  /**
   * Force le rechargement des index custom
   */
  async reloadCustomIndexes(): Promise<void> {
    // Supprimer les anciens custom
    for (const [id, index] of this.indexes) {
      if (index._isCustom) {
        this.indexes.delete(id)
        this.statsCache.delete(id)
      }
    }
    this.customIndexesLoaded = false
    await this.loadCustomIndexes()
  }

  /**
   * Convertit un CustomIndexDefinition en IndexDefinition
   */
  private mapCustomToDefinition(custom: CustomIndexDefinition): IndexDefinition {
    return {
      id: `custom_${custom.slug}`,
      name: custom.name,
      description: custom.description || '',
      icon: ICON_MAP[custom.icon] || Database,
      category: 'custom',
      tableName: 'custom_rag_documents',
      schemaVersion: '1.0',
      searchConfig: {
        rpcFunctionName: 'search_custom_index',
        vectorWeight: custom.searchWeights.vector,
        textWeight: custom.searchWeights.text,
        defaultMatchCount: 5,
      },
      embeddingConfig: {
        model: custom.embeddingModel,
        dimensions: 1536,
        prepareTextFn: 'prepareGenericText',
      },
      status: custom.status as IndexStatus,
      createdAt: custom.createdAt,
      updatedAt: custom.updatedAt,
      _customId: custom.id,
      _isCustom: true,
    }
  }

  /**
   * Enregistre un nouvel index
   */
  register(index: IndexDefinition): void {
    if (this.indexes.has(index.id)) {
      console.warn(`[IndexRegistry] Index "${index.id}" déjà enregistré, mise à jour`)
    }
    this.indexes.set(index.id, index)
    console.log(`[IndexRegistry] Index "${index.id}" enregistré`)
  }

  /**
   * Supprime un index du registre
   */
  unregister(indexId: string): boolean {
    const deleted = this.indexes.delete(indexId)
    if (deleted) {
      this.statsCache.delete(indexId)
      console.log(`[IndexRegistry] Index "${indexId}" supprimé`)
    }
    return deleted
  }

  /**
   * Récupère un index par son ID
   */
  get(indexId: string): IndexDefinition | undefined {
    return this.indexes.get(indexId)
  }

  /**
   * Récupère tous les index
   */
  getAll(): IndexDefinition[] {
    return Array.from(this.indexes.values())
  }

  /**
   * Filtre par catégorie
   */
  getByCategory(category: IndexCategory): IndexDefinition[] {
    return this.getAll().filter((idx) => idx.category === category)
  }

  /**
   * Filtre par statut
   */
  getByStatus(status: IndexStatus): IndexDefinition[] {
    return this.getAll().filter((idx) => idx.status === status)
  }

  /**
   * Récupère uniquement les index actifs
   */
  getActive(): IndexDefinition[] {
    return this.getByStatus('active')
  }

  /**
   * Vérifie si un index existe
   */
  has(indexId: string): boolean {
    return this.indexes.has(indexId)
  }

  /**
   * Nombre total d'index
   */
  count(): number {
    return this.indexes.size
  }

  /**
   * Récupère les stats d'un index (avec cache)
   */
  async getStats(indexId: string): Promise<IndexStats | null> {
    const index = this.get(indexId)
    if (!index) return null

    // Vérifier le cache (5 minutes)
    const cached = this.statsCache.get(indexId)
    if (cached && Date.now() - (cached as IndexStats & { _cachedAt?: number })._cachedAt! < 5 * 60 * 1000) {
      return cached
    }

    return this.refreshStats(indexId)
  }

  /**
   * Rafraîchit les stats d'un index
   */
  async refreshStats(indexId: string): Promise<IndexStats | null> {
    const index = this.get(indexId)
    if (!index) return null

    try {
      // Pour les index custom, on filtre par index_id
      const isCustom = index._isCustom && index._customId

      // Compter les documents
      let countQuery = supabase
        .from(index.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (isCustom) {
        countQuery = countQuery.eq('index_id', index._customId)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        const stats: IndexStats = {
          indexId,
          documentCount: 0,
          lastIngestion: null,
          health: 'error',
          errorMessage: countError.message,
        }
        this.statsCache.set(indexId, { ...stats, _cachedAt: Date.now() } as IndexStats)
        return stats
      }

      // Récupérer la dernière mise à jour
      let lastDocQuery = supabase
        .from(index.tableName)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)

      if (isCustom) {
        lastDocQuery = lastDocQuery.eq('index_id', index._customId)
      }

      const { data: lastDoc } = await lastDocQuery.single()

      const stats: IndexStats = {
        indexId,
        documentCount: count || 0,
        lastIngestion: lastDoc?.created_at ? new Date(lastDoc.created_at) : null,
        health: 'healthy',
      }

      this.statsCache.set(indexId, { ...stats, _cachedAt: Date.now() } as IndexStats)
      return stats
    } catch (err) {
      const stats: IndexStats = {
        indexId,
        documentCount: 0,
        lastIngestion: null,
        health: 'error',
        errorMessage: err instanceof Error ? err.message : 'Erreur inconnue',
      }
      this.statsCache.set(indexId, { ...stats, _cachedAt: Date.now() } as IndexStats)
      return stats
    }
  }

  /**
   * Rafraîchit les stats de tous les index
   */
  async refreshAllStats(): Promise<Map<string, IndexStats>> {
    const results = new Map<string, IndexStats>()

    for (const index of this.getAll()) {
      const stats = await this.refreshStats(index.id)
      if (stats) {
        results.set(index.id, stats)
      }
    }

    return results
  }

  /**
   * Invalide le cache des stats
   */
  invalidateStatsCache(indexId?: string): void {
    if (indexId) {
      this.statsCache.delete(indexId)
    } else {
      this.statsCache.clear()
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const IndexRegistry = new IndexRegistryClass()

export function registerIndex(index: IndexDefinition): void {
  IndexRegistry.register(index)
}

// Icons par catégorie (utilitaire)
export const CATEGORY_ICONS: Record<IndexCategory, typeof Pill> = {
  products: Pill,
  interactions: Layers,
  articles: FileText,
  protocols: ClipboardList,
  custom: Database,
}

export const CATEGORY_LABELS: Record<IndexCategory, string> = {
  products: 'Produits',
  interactions: 'Interactions',
  articles: 'Articles',
  protocols: 'Protocoles',
  custom: 'Personnalisé',
}
