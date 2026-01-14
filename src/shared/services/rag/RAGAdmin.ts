/**
 * RAG Admin - Utilitaire pour gérer les données du catalogue produits
 * Utilisation : import { RAGAdmin } from '@shared/services/rag'
 */

import { supabase } from '@shared/lib/supabase'
import { ProductIngestionService } from './ProductIngestionService'
import { ProductSearchService } from './ProductSearchService'
import { EmbeddingService } from './EmbeddingService'
import { ProductData, ProductIngestionInput, PharmaceuticalProduct } from './types'

export const RAGAdmin = {
  // ===========================================
  // AJOUTER DES DONNÉES
  // ===========================================

  /**
   * Ajoute UN produit au catalogue
   *
   * @example
   * await RAGAdmin.addProduct({
   *   productCode: 'doliprane_1000mg',
   *   productName: 'DOLIPRANE 1000 mg',
   *   dci: 'paracétamol',
   *   category: 'Antalgique',
   *   productData: { ... } // ton JSON complet
   * })
   */
  async addProduct(input: ProductIngestionInput): Promise<string> {
    console.log(`[RAGAdmin] Ajout de "${input.productName}"...`)
    const id = await ProductIngestionService.ingestProduct(input)
    console.log(`[RAGAdmin] ✅ Produit ajouté avec ID: ${id}`)
    return id
  },

  /**
   * Ajoute PLUSIEURS produits en lot
   *
   * @example
   * const result = await RAGAdmin.addProducts([
   *   { productCode: 'prod1', productName: 'Produit 1', productData: {...} },
   *   { productCode: 'prod2', productName: 'Produit 2', productData: {...} },
   * ])
   * console.log(result) // { success: 2, failed: 0 }
   */
  async addProducts(
    products: ProductIngestionInput[]
  ): Promise<{ success: number; failed: number }> {
    console.log(`[RAGAdmin] Ajout de ${products.length} produits...`)
    const result = await ProductIngestionService.ingestBatch(products)
    console.log(`[RAGAdmin] ✅ ${result.success} ajoutés, ❌ ${result.failed} échoués`)
    return result
  },

  /**
   * Ajoute un produit depuis un JSON brut (format simplifié)
   *
   * @example
   * await RAGAdmin.addFromJSON({
   *   code: 'efferalgan_500mg',
   *   nom: 'EFFERALGAN 500 mg',
   *   dci: 'paracétamol',
   *   categorie: 'Antalgique',
   *   data: monObjetJSON
   * })
   */
  async addFromJSON(params: {
    code: string
    nom: string
    dci?: string
    categorie?: string
    data: ProductData
  }): Promise<string> {
    return this.addProduct({
      productCode: params.code,
      productName: params.nom,
      dci: params.dci,
      category: params.categorie,
      productData: params.data,
    })
  },

  // ===========================================
  // SUPPRIMER DES DONNÉES
  // ===========================================

  /**
   * Désactive un produit (soft delete - reste en base mais invisible)
   *
   * @example
   * await RAGAdmin.disableProduct('uuid-du-produit')
   * // ou par code
   * const product = await RAGAdmin.findByCode('doliprane_500mg')
   * await RAGAdmin.disableProduct(product.id)
   */
  async disableProduct(productId: string): Promise<void> {
    console.log(`[RAGAdmin] Désactivation du produit ${productId}...`)
    await ProductIngestionService.deactivateProduct(productId)
    console.log(`[RAGAdmin] ✅ Produit désactivé`)
  },

  /**
   * Supprime définitivement un produit (irréversible)
   *
   * @example
   * await RAGAdmin.deleteProduct('uuid-du-produit')
   */
  async deleteProduct(productId: string): Promise<void> {
    console.log(`[RAGAdmin] ⚠️ Suppression définitive du produit ${productId}...`)
    await ProductIngestionService.deleteProduct(productId)
    console.log(`[RAGAdmin] ✅ Produit supprimé définitivement`)
  },

  /**
   * Supprime un produit par son code
   *
   * @example
   * await RAGAdmin.deleteByCode('doliprane_500mg')
   */
  async deleteByCode(productCode: string): Promise<boolean> {
    const product = await this.findByCode(productCode)
    if (!product) {
      console.log(`[RAGAdmin] ❌ Produit "${productCode}" non trouvé`)
      return false
    }
    await this.deleteProduct(product.id)
    return true
  },

  // ===========================================
  // RECHERCHER / LISTER
  // ===========================================

  /**
   * Trouve un produit par son code
   *
   * @example
   * const product = await RAGAdmin.findByCode('doliprane_500mg')
   */
  async findByCode(productCode: string): Promise<PharmaceuticalProduct | null> {
    return ProductSearchService.getByCode(productCode)
  },

  /**
   * Trouve un produit par son ID
   */
  async findById(productId: string): Promise<PharmaceuticalProduct | null> {
    return ProductSearchService.getById(productId)
  },

  /**
   * Liste tous les produits du catalogue
   *
   * @example
   * const products = await RAGAdmin.listAll()
   * console.table(products.map(p => ({ code: p.productCode, nom: p.productName })))
   */
  async listAll(limit = 100): Promise<PharmaceuticalProduct[]> {
    return ProductSearchService.getAll(limit)
  },

  /**
   * Compte le nombre de produits
   */
  async count(): Promise<number> {
    return ProductSearchService.count()
  },

  /**
   * Recherche des produits (teste le RAG)
   *
   * @example
   * const results = await RAGAdmin.search('mal de tête')
   * results.forEach(r => console.log(`${r.productName} (score: ${r.combinedScore})`))
   */
  async search(query: string, limit = 5) {
    console.log(`[RAGAdmin] Recherche: "${query}"`)
    const results = await ProductSearchService.searchHybrid(query, { matchCount: limit })
    console.log(`[RAGAdmin] ${results.length} résultat(s) trouvé(s)`)
    return results
  },

  // ===========================================
  // METTRE À JOUR
  // ===========================================

  /**
   * Met à jour les données d'un produit
   *
   * @example
   * const product = await RAGAdmin.findByCode('doliprane_500mg')
   * product.productData.posology.adult = 'Nouvelle posologie...'
   * await RAGAdmin.updateProduct(product.id, product.productData)
   */
  async updateProduct(productId: string, productData: ProductData): Promise<void> {
    console.log(`[RAGAdmin] Mise à jour du produit ${productId}...`)
    await ProductIngestionService.updateProduct(productId, productData)
    console.log(`[RAGAdmin] ✅ Produit mis à jour (embedding regénéré)`)
  },

  // ===========================================
  // DIAGNOSTICS
  // ===========================================

  /**
   * Vérifie que le système RAG est opérationnel
   */
  async healthCheck(): Promise<{
    supabase: boolean
    openai: boolean
    productCount: number
  }> {
    console.log('[RAGAdmin] Vérification du système...')

    // Test Supabase
    let supabaseOk = false
    try {
      const { error } = await supabase.from('pharmaceutical_products').select('id').limit(1)
      supabaseOk = !error
    } catch {
      supabaseOk = false
    }

    // Test OpenAI Embeddings
    let openaiOk = EmbeddingService.isConfigured()
    if (openaiOk) {
      try {
        await EmbeddingService.embed('test')
        openaiOk = true
      } catch {
        openaiOk = false
      }
    }

    // Compte produits
    const productCount = await this.count()

    console.log(`[RAGAdmin] Supabase: ${supabaseOk ? '✅' : '❌'}`)
    console.log(`[RAGAdmin] OpenAI: ${openaiOk ? '✅' : '❌'}`)
    console.log(`[RAGAdmin] Produits: ${productCount}`)

    return { supabase: supabaseOk, openai: openaiOk, productCount }
  },
}
