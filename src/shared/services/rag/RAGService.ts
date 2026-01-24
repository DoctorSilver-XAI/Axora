/**
 * Service RAG (Retrieval-Augmented Generation)
 * Orchestre la recherche et l'injection de contexte dans les prompts
 * Intègre la BDPM (Base de Données Publique des Médicaments) pour données officielles
 */

import { ProductSearchService } from './ProductSearchService'
import { BDPMSearchService, BDPMProduct } from './BDPMSearchService'
import { SearchResult, RAGContext, SearchOptions, ProductData } from './types'

// Configuration
const MAX_CONTEXT_PRODUCTS = 3
const MAX_CONTEXT_CHARS = 4000

// Patterns pour détecter les codes CIP/CIS
const CIP13_PATTERN = /\b\d{13}\b/
const CIP7_PATTERN = /\b\d{7}\b/
const CIS_PATTERN = /\b\d{8}\b/

// Mots-clés BDPM spécifiques (prix, disponibilité, etc.)
const BDPM_KEYWORDS = [
  'prix',
  'coût',
  'cout',
  'remboursement',
  'remboursé',
  'rembourse',
  'générique',
  'generique',
  'princeps',
  'rupture',
  'stock',
  'disponible',
  'disponibilité',
  'alerte',
  'smr',
  'asmr',
  'has',
  'ansm',
  'cip',
  'code barre',
  'amm',
  'liste i',
  'liste ii',
  'stupéfiant',
]

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
   * Priorise BDPM pour les données officielles, fallback sur catalogue custom
   */
  async getContextForAssistant(
    query: string,
    options: SearchOptions = {}
  ): Promise<RAGContext | null> {
    if (!this.shouldUseRAG(query)) {
      return null
    }

    try {
      // Prioriser BDPM pour données officielles
      if (this.shouldUseBDPM(query)) {
        const bdpmContext = await this.buildContextBDPM(query)
        if (bdpmContext.products.length > 0) {
          return bdpmContext
        }
      }

      // Fallback sur le catalogue custom (pharmaceutical_products)
      const context = await this.buildContext(query, options)
      return context.products.length > 0 ? context : null
    } catch (error) {
      console.warn('[RAG] Erreur, fallback sans contexte:', error)
      return null
    }
  },

  // ===========================================
  // INTÉGRATION BDPM
  // ===========================================

  /**
   * Détermine si on doit utiliser BDPM vs catalogue custom
   * BDPM pour: codes CIP/CIS, prix, remboursement, génériques, ruptures
   */
  shouldUseBDPM(query: string): boolean {
    // Si code CIP ou CIS détecté → BDPM
    if (CIP13_PATTERN.test(query) || CIP7_PATTERN.test(query) || CIS_PATTERN.test(query)) {
      return true
    }

    // Si mots-clés BDPM spécifiques → BDPM
    const lowerQuery = query.toLowerCase()
    if (BDPM_KEYWORDS.some((kw) => lowerQuery.includes(kw))) {
      return true
    }

    // Par défaut, utiliser BDPM pour tout ce qui est pharmaceutique
    return this.shouldUseRAG(query)
  },

  /**
   * Construit le contexte RAG à partir de la BDPM
   */
  async buildContextBDPM(query: string): Promise<RAGContext> {
    const results: SearchResult[] = []

    // 1. Recherche par code exact (CIP ou CIS)
    const cip13Match = query.match(CIP13_PATTERN)
    const cip7Match = query.match(CIP7_PATTERN)
    const cisMatch = query.match(CIS_PATTERN)

    if (cip13Match || cip7Match) {
      const cipCode = cip13Match?.[0] || cip7Match?.[0]
      const product = await BDPMSearchService.searchByCIP(cipCode!)
      if (product) {
        results.push(this.bdpmToSearchResult(product))
      }
    }

    if (cisMatch && results.length === 0) {
      const product = await BDPMSearchService.searchByCIS(cisMatch[0])
      if (product) {
        results.push(this.bdpmToSearchResult(product))
      }
    }

    // 2. Si pas de code trouvé, recherche hybride
    if (results.length === 0) {
      const bdpmResults = await BDPMSearchService.searchHybrid(query, {
        matchCount: MAX_CONTEXT_PRODUCTS,
      })
      results.push(...bdpmResults.map((p) => this.bdpmToSearchResult(p)))
    }

    return {
      products: results,
      query,
      totalResults: results.length,
    }
  },

  /**
   * Convertit un BDPMProduct en SearchResult pour compatibilité
   */
  bdpmToSearchResult(product: BDPMProduct): SearchResult {
    return {
      id: product.id,
      productCode: product.codeCis,
      productName: product.productName,
      dci: product.dci,
      laboratory: product.laboratory,
      atcCode: product.codeAtc || null,
      dosageForm: product.formePharmaceutique || null,
      category: null,
      tags: [],
      productData: this.bdpmToProductData(product),
      vectorScore: product.vectorScore,
      textScore: product.textScore,
      combinedScore: product.combinedScore,
    }
  },

  /**
   * Convertit les données BDPM en format ProductData existant
   */
  bdpmToProductData(product: BDPMProduct): ProductData {
    const pd = product.productData

    // Extraire les red flags
    const redFlags: string[] = []
    if (product.hasAlerte && pd.alertes_actives?.length) {
      redFlags.push(...pd.alertes_actives.map((a) => `⚠️ ${a.texte}`))
    }
    if (product.hasRupture && pd.disponibilite) {
      redFlags.push(`🔴 ${pd.disponibilite.statut}`)
    }

    return {
      product_identity: {
        product_id: product.codeCis,
        commercial_name: product.productName,
        active_substances: pd.substances_actives?.map((s) => s.substance) || [],
        dosage_strength: pd.substances_actives?.[0]?.dosage || '',
        pharmaceutical_forms: product.formePharmaceutique ? [product.formePharmaceutique] : [],
        laboratory: product.laboratory || '',
      },
      fr_referencing: {
        amm_status: 'Autorisé',
        otc_status:
          pd.conditions_delivrance?.some(
            (c) => c.includes('liste I') || c.includes('liste II') || c.includes('stupéfiant')
          )
            ? 'Prescription'
            : 'OTC',
        cip_codes: pd.presentations?.map((p) => p.cip13) || [],
        reimbursement_status:
          pd.presentations?.find((p) => p.remboursement)?.remboursement || 'Non remboursé',
        ansm_category: pd.conditions_delivrance?.join(', ') || '',
      },
      officinal_practice: {
        key_counter_questions: [],
        deliverable_counsel: [],
        red_flags: redFlags,
        referral_recommendation: '',
      },
      rag_metadata: {
        semantic_tags: [
          ...(product.isGenerique ? ['générique'] : ['princeps']),
          ...(pd.avis_smr?.valeur ? [`SMR ${pd.avis_smr.valeur}`] : []),
          ...(product.isMitm ? ['MITM'] : []),
        ],
        clinical_contexts: [],
        embedding_priority: product.hasAlerte || product.hasRupture ? 'high' : 'medium',
        confidence_level: 'BDPM officiel',
      },
    }
  },

  /**
   * Formate le contexte BDPM de manière optimisée pour le LLM
   */
  formatBDPMProductForContext(product: BDPMProduct): string {
    const lines: string[] = []
    const pd = product.productData

    // En-tête
    lines.push(`## ${product.productName}`)
    if (product.dci) lines.push(`**DCI:** ${product.dci}`)
    if (product.laboratory) lines.push(`**Laboratoire:** ${product.laboratory}`)

    // ALERTES EN PREMIER (priorité sécurité)
    if (product.hasAlerte && pd.alertes_actives?.length) {
      lines.push('')
      lines.push('⚠️ **ALERTES DE SÉCURITÉ:**')
      pd.alertes_actives.forEach((a) => {
        lines.push(`- ${a.texte}`)
      })
    }

    // RUPTURES
    if (product.hasRupture && pd.disponibilite) {
      lines.push('')
      lines.push(`🔴 **DISPONIBILITÉ:** ${pd.disponibilite.statut}`)
      if (pd.disponibilite.date_remise) {
        lines.push(`   Remise à disposition prévue: ${pd.disponibilite.date_remise}`)
      }
    }

    // Substances actives
    if (pd.substances_actives?.length) {
      lines.push('')
      lines.push('**Composition:**')
      pd.substances_actives.forEach((s) => {
        lines.push(`- ${s.substance} ${s.dosage || ''}`)
      })
    }

    // Conditions de délivrance
    if (pd.conditions_delivrance?.length) {
      lines.push('')
      lines.push(`**Délivrance:** ${pd.conditions_delivrance.join(', ')}`)
    }

    // Génériques
    if (pd.info_generique) {
      lines.push('')
      lines.push(`**Groupe générique:** ${pd.info_generique.libelle}`)
      lines.push(`**Type:** ${pd.info_generique.type}`)
    }

    // Prix et remboursement
    const presComm = pd.presentations?.filter((p) => p.commercialise)
    if (presComm?.length) {
      lines.push('')
      lines.push('**Présentations disponibles:**')
      presComm.slice(0, 3).forEach((p) => {
        let info = `- ${p.libelle}`
        if (p.prix) info += ` — **${p.prix}€**`
        if (p.remboursement && p.remboursement !== 'NR') {
          info += ` (${p.remboursement})`
        }
        lines.push(info)
      })
    }

    // SMR
    if (pd.avis_smr?.valeur) {
      lines.push('')
      lines.push(`**Avis HAS:** SMR ${pd.avis_smr.valeur}`)
    }

    return lines.join('\n')
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
