/**
 * Service d'ingestion de produits pharmaceutiques
 * Gère l'import et la mise à jour des embeddings
 */

import { supabase } from '@shared/lib/supabase'
import { EmbeddingService } from './EmbeddingService'
import { ProductIngestionInput, BatchIngestionResult, ProductData } from './types'

// Taille des chunks pour l'import batch (évite les rate limits OpenAI)
const BATCH_CHUNK_SIZE = 10
const BATCH_DELAY_MS = 200

export const ProductIngestionService = {
  /**
   * Ingère un produit unique avec génération d'embedding
   */
  async ingestProduct(input: ProductIngestionInput): Promise<string> {
    // Préparer le texte searchable pour tsvector
    const searchableText = EmbeddingService.prepareProductText(input.productData)

    // Générer l'embedding
    const embedding = await EmbeddingService.embed(searchableText)

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('pharmaceutical_products')
      .insert({
        product_code: input.productCode,
        product_name: input.productName,
        dci: input.dci || input.productData.product_identity?.active_substances?.[0] || null,
        laboratory: input.laboratory || input.productData.product_identity?.laboratory || null,
        atc_code: input.atcCode || null,
        dosage_form:
          input.dosageForm || input.productData.product_identity?.pharmaceutical_forms?.[0] || null,
        category: input.category || input.productData.officinal_classification?.therapeutic_family || null,
        tags: input.tags || input.productData.rag_metadata?.semantic_tags || [],
        product_data: input.productData,
        searchable_text: searchableText,
        embedding: embedding,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erreur ingestion produit:', error)
      throw error
    }

    return data.id
  },

  /**
   * Ingestion batch de produits (plus efficace pour import initial)
   */
  async ingestBatch(products: ProductIngestionInput[]): Promise<BatchIngestionResult> {
    let success = 0
    let failed = 0
    const errors: Array<{ productCode: string; error: string }> = []

    // Traiter par chunks pour éviter les rate limits
    for (let i = 0; i < products.length; i += BATCH_CHUNK_SIZE) {
      const chunk = products.slice(i, i + BATCH_CHUNK_SIZE)

      // Préparer les textes pour batch embedding
      const texts = chunk.map((p) => EmbeddingService.prepareProductText(p.productData))

      try {
        // Batch embed
        const embeddings = await EmbeddingService.embedBatch(texts)

        // Préparer les records
        const records = chunk.map((product, idx) => ({
          product_code: product.productCode,
          product_name: product.productName,
          dci: product.dci || product.productData.product_identity?.active_substances?.[0] || null,
          laboratory:
            product.laboratory || product.productData.product_identity?.laboratory || null,
          atc_code: product.atcCode || null,
          dosage_form:
            product.dosageForm ||
            product.productData.product_identity?.pharmaceutical_forms?.[0] ||
            null,
          category:
            product.category ||
            product.productData.officinal_classification?.therapeutic_family ||
            null,
          tags: product.tags || product.productData.rag_metadata?.semantic_tags || [],
          product_data: product.productData,
          searchable_text: texts[idx],
          embedding: embeddings[idx],
        }))

        // Batch insert
        const { error } = await supabase.from('pharmaceutical_products').insert(records)

        if (error) {
          console.error('Erreur batch insert:', error)
          failed += chunk.length
          chunk.forEach((p) =>
            errors.push({ productCode: p.productCode, error: error.message })
          )
        } else {
          success += chunk.length
        }
      } catch (err) {
        console.error('Erreur batch processing:', err)
        failed += chunk.length
        chunk.forEach((p) =>
          errors.push({
            productCode: p.productCode,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        )
      }

      // Pause entre les chunks pour éviter les rate limits
      if (i + BATCH_CHUNK_SIZE < products.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    return { success, failed, errors: errors.length > 0 ? errors : undefined }
  },

  /**
   * Met à jour l'embedding d'un produit existant
   */
  async updateEmbedding(productId: string): Promise<void> {
    // Récupérer le produit
    const { data: product, error: fetchError } = await supabase
      .from('pharmaceutical_products')
      .select('product_data')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      throw new Error('Produit non trouvé')
    }

    // Regénérer l'embedding
    const searchableText = EmbeddingService.prepareProductText(product.product_data as ProductData)
    const embedding = await EmbeddingService.embed(searchableText)

    // Mettre à jour
    const { error } = await supabase
      .from('pharmaceutical_products')
      .update({
        searchable_text: searchableText,
        embedding: embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (error) {
      throw error
    }
  },

  /**
   * Met à jour les données d'un produit (et regénère l'embedding)
   */
  async updateProduct(productId: string, productData: ProductData): Promise<void> {
    const searchableText = EmbeddingService.prepareProductText(productData)
    const embedding = await EmbeddingService.embed(searchableText)

    const { error } = await supabase
      .from('pharmaceutical_products')
      .update({
        product_data: productData,
        searchable_text: searchableText,
        embedding: embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (error) {
      throw error
    }
  },

  /**
   * Supprime un produit (soft delete via is_active = false)
   */
  async deactivateProduct(productId: string): Promise<void> {
    const { error } = await supabase
      .from('pharmaceutical_products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (error) {
      throw error
    }
  },

  /**
   * Suppression définitive d'un produit
   */
  async deleteProduct(productId: string): Promise<void> {
    const { error } = await supabase.from('pharmaceutical_products').delete().eq('id', productId)

    if (error) {
      throw error
    }
  },

  /**
   * Régénère tous les embeddings (utile après changement de modèle)
   */
  async regenerateAllEmbeddings(
    onProgress?: (current: number, total: number) => void
  ): Promise<{ updated: number; failed: number }> {
    // Récupérer tous les produits
    const { data: products, error } = await supabase
      .from('pharmaceutical_products')
      .select('id, product_data')
      .eq('is_active', true)

    if (error) {
      throw error
    }

    let updated = 0
    let failed = 0
    const total = products?.length || 0

    for (let i = 0; i < total; i++) {
      const product = products![i]
      try {
        await this.updateEmbedding(product.id)
        updated++
      } catch {
        failed++
      }

      if (onProgress) {
        onProgress(i + 1, total)
      }

      // Pause pour éviter rate limits
      if (i > 0 && i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return { updated, failed }
  },
}
