/**
 * Service RAG (Retrieval-Augmented Generation)
 * Orchestre la recherche et l'injection de contexte dans les prompts
 */

import { ProductSearchService } from './ProductSearchService'
import { SearchResult, RAGContext, SearchOptions, ProductData } from './types'

// Configuration
const MAX_CONTEXT_PRODUCTS = 3
const MAX_CONTEXT_CHARS = 4000

// Mots-clés déclenchant le RAG
const PHARMACEUTICAL_KEYWORDS = [
  // Termes généraux
  'médicament',
  'medicament',
  'posologie',
  'dose',
  'dosage',
  'interaction',
  'effet',
  'indésirable',
  'contre-indication',
  'contre indication',
  'ordonnance',
  'prescription',
  'traitement',
  'patient',
  'allergie',
  'grossesse',
  'allaitement',
  'insuffisant',
  'insuffisance',
  'renal',
  'hepatique',
  'cardiaque',
  // Actions
  'prendre',
  'prescrire',
  'administrer',
  'avaler',
  // Formes
  'comprimé',
  'gélule',
  'sirop',
  'sachet',
  'suppositoire',
  // DCI courants
  'paracetamol',
  'paracétamol',
  'ibuprofene',
  'ibuprofène',
  'aspirine',
  'doliprane',
  'efferalgan',
  'dafalgan',
  'advil',
  'nurofen',
  'metformine',
  'levothyrox',
  'omeprazole',
  'oméprazole',
  'amoxicilline',
  // Symptômes
  'douleur',
  'fièvre',
  'fievre',
  'mal de tête',
  'céphalée',
  'migraine',
  'toux',
  'rhume',
  'grippe',
]

export const RAGService = {
  /**
   * Construit le contexte RAG à partir d'une requête utilisateur
   */
  async buildContext(query: string, options: SearchOptions = {}): Promise<RAGContext> {
    const results = await ProductSearchService.searchHybrid(query, {
      ...options,
      matchCount: options.matchCount || MAX_CONTEXT_PRODUCTS,
    })

    return {
      products: results,
      query,
      totalResults: results.length,
    }
  },

  /**
   * Formate le contexte RAG en string pour injection dans le prompt
   */
  formatContextForPrompt(context: RAGContext): string {
    if (context.products.length === 0) {
      return ''
    }

    const parts: string[] = ['--- CONTEXTE PHARMACEUTIQUE PERTINENT ---', '']

    for (const product of context.products) {
      const productInfo = formatProductForContext(product.productData)
      parts.push(`## ${product.productName}`)
      if (product.dci) parts.push(`DCI: ${product.dci}`)
      if (product.category) parts.push(`Catégorie: ${product.category}`)
      parts.push('')
      parts.push(productInfo)
      parts.push('')
    }

    parts.push('--- FIN DU CONTEXTE ---')

    // Tronquer si trop long
    let result = parts.join('\n')
    if (result.length > MAX_CONTEXT_CHARS) {
      result = result.slice(0, MAX_CONTEXT_CHARS) + '\n[... contexte tronqué ...]'
    }

    return result
  },

  /**
   * Enrichit le system prompt avec le contexte RAG
   */
  buildEnhancedSystemPrompt(basePrompt: string, context: RAGContext): string {
    const contextStr = this.formatContextForPrompt(context)

    if (!contextStr) {
      return basePrompt
    }

    return `${basePrompt}

IMPORTANT: Utilise les informations pharmaceutiques ci-dessous comme référence pour ta réponse. Ces données proviennent du catalogue de la pharmacie et doivent guider tes recommandations.

${contextStr}

Lorsque tu fais référence à un médicament du contexte:
- Précise les éléments pertinents (posologie, contre-indications, conseils)
- Si l'information n'est pas dans le contexte, indique-le clairement
- N'invente jamais d'informations médicales`
  },

  /**
   * Détermine si une requête devrait utiliser le RAG
   * Basé sur la détection de mots-clés pharmaceutiques
   */
  shouldUseRAG(query: string): boolean {
    const lowerQuery = query.toLowerCase()
    return PHARMACEUTICAL_KEYWORDS.some((keyword) => lowerQuery.includes(keyword))
  },

  /**
   * Extrait les termes pharmaceutiques d'une requête
   * Utile pour le debug et les logs
   */
  extractPharmaceuticalTerms(query: string): string[] {
    const lowerQuery = query.toLowerCase()
    return PHARMACEUTICAL_KEYWORDS.filter((keyword) => lowerQuery.includes(keyword))
  },

  /**
   * Récupère le contexte RAG pour l'Assistant IA
   * Méthode convenience qui combine shouldUseRAG + buildContext
   */
  async getContextForAssistant(
    query: string,
    options: SearchOptions = {}
  ): Promise<RAGContext | null> {
    if (!this.shouldUseRAG(query)) {
      return null
    }

    try {
      const context = await this.buildContext(query, options)
      return context.products.length > 0 ? context : null
    } catch (error) {
      console.warn('Erreur RAG, fallback sans contexte:', error)
      return null
    }
  },
}

// ===========================================
// HELPERS DE FORMATAGE
// ===========================================

/**
 * Formate les données produit pour injection dans le contexte LLM
 * On garde uniquement les informations les plus pertinentes
 */
function formatProductForContext(data: ProductData): string {
  const lines: string[] = []

  // Identité
  if (data.product_identity?.active_substances?.length) {
    lines.push(`Principes actifs: ${data.product_identity.active_substances.join(', ')}`)
  }

  // Classification
  if (data.officinal_classification?.therapeutic_family) {
    lines.push(`Famille: ${data.officinal_classification.therapeutic_family}`)
  }

  if (data.officinal_classification?.main_symptoms?.length) {
    lines.push(`Indications: ${data.officinal_classification.main_symptoms.join(', ')}`)
  }

  // Pharmacodynamique
  if (data.pharmacodynamics?.mechanism_of_action) {
    lines.push(`Mécanisme: ${data.pharmacodynamics.mechanism_of_action}`)
  }

  // Posologie
  if (data.posology?.adult) {
    lines.push(`Posologie adulte: ${data.posology.adult}`)
  }

  if (data.posology?.max_daily_dose) {
    lines.push(`Dose max: ${data.posology.max_daily_dose}`)
  }

  // Sécurité - Contre-indications absolues
  if (data.safety?.contraindications?.length) {
    const absolutes = data.safety.contraindications
      .filter((c) => c.severity === 'absolue' || c.severity === 'majeure')
      .map((c) => c.condition)

    if (absolutes.length) {
      lines.push(`⚠️ CONTRE-INDICATIONS: ${absolutes.join(', ')}`)
    }
  }

  // Interactions majeures
  if (data.interactions?.major_interactions?.length) {
    const interactions = data.interactions.major_interactions.slice(0, 3).map((i) => i.substance)
    lines.push(`Interactions: ${interactions.join(', ')}`)
  }

  // Populations spéciales
  if (data.safety?.special_populations) {
    const sp = data.safety.special_populations
    if (sp.pregnancy) lines.push(`Grossesse: ${sp.pregnancy}`)
    if (sp.breastfeeding) lines.push(`Allaitement: ${sp.breastfeeding}`)
  }

  // Pratique officinale
  if (data.officinal_practice?.deliverable_counsel?.length) {
    lines.push(`Conseils: ${data.officinal_practice.deliverable_counsel.slice(0, 2).join('. ')}`)
  }

  if (data.officinal_practice?.red_flags?.length) {
    lines.push(`🚩 Alertes: ${data.officinal_practice.red_flags.slice(0, 3).join(', ')}`)
  }

  return lines.join('\n')
}
