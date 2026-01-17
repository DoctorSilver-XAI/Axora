/**
 * Service de génération d'embeddings via OpenAI
 * Utilise le modèle text-embedding-3-small (1536 dimensions)
 */

import { OpenAIEmbeddingResponse, ProductData } from './types'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

export const EmbeddingService = {
  /**
   * Génère un embedding pour un texte unique
   */
  async embed(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
      throw new Error('VITE_OPENAI_API_KEY non configurée')
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Embedding API error: ${error}`)
    }

    const data: OpenAIEmbeddingResponse = await response.json()
    return data.data[0].embedding
  },

  /**
   * Génère des embeddings en batch (plus efficace pour import)
   * OpenAI supporte jusqu'à 2048 textes par requête
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!OPENAI_API_KEY) {
      throw new Error('VITE_OPENAI_API_KEY non configurée')
    }

    if (texts.length === 0) {
      return []
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Embedding API error: ${error}`)
    }

    const data: OpenAIEmbeddingResponse = await response.json()

    // Trier par index pour maintenir l'ordre
    return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding)
  },

  /**
   * Prépare le texte à embedder à partir des données produit
   * Combine les champs pertinents avec pondération implicite
   */
  prepareProductText(product: ProductData): string {
    const parts: string[] = []

    // === HAUTE PRIORITÉ (A) ===

    // Identité produit
    if (product.product_identity) {
      const pi = product.product_identity
      parts.push(`Nom commercial: ${pi.commercial_name}`)

      if (pi.active_substances?.length) {
        parts.push(`Principes actifs: ${pi.active_substances.join(', ')}`)
      }

      if (pi.dosage_strength) {
        parts.push(`Dosage: ${pi.dosage_strength}`)
      }

      if (pi.pharmaceutical_forms?.length) {
        parts.push(`Formes: ${pi.pharmaceutical_forms.join(', ')}`)
      }

      if (pi.laboratory) {
        parts.push(`Laboratoire: ${pi.laboratory}`)
      }
    }

    // Classification officinale
    if (product.officinal_classification) {
      const oc = product.officinal_classification
      if (oc.therapeutic_family) {
        parts.push(`Famille thérapeutique: ${oc.therapeutic_family}`)
      }
      if (oc.sub_family) {
        parts.push(`Sous-famille: ${oc.sub_family}`)
      }
      if (oc.main_symptoms?.length) {
        parts.push(`Symptômes traités: ${oc.main_symptoms.join(', ')}`)
      }
    }

    // === MOYENNE PRIORITÉ (B) ===

    // Pharmacodynamique
    if (product.pharmacodynamics) {
      const pd = product.pharmacodynamics
      if (pd.mechanism_of_action) {
        parts.push(`Mécanisme d'action: ${pd.mechanism_of_action}`)
      }
      if (pd.therapeutic_target) {
        parts.push(`Cible thérapeutique: ${pd.therapeutic_target}`)
      }
      if (pd.expected_clinical_effects?.length) {
        parts.push(`Effets attendus: ${pd.expected_clinical_effects.join(', ')}`)
      }
    }

    // Posologie
    if (product.posology) {
      const pos = product.posology
      if (pos.adult) {
        parts.push(`Posologie adulte: ${pos.adult}`)
      }
      if (pos.child) {
        parts.push(`Posologie enfant: ${pos.child}`)
      }
      if (pos.max_daily_dose) {
        parts.push(`Dose max journalière: ${pos.max_daily_dose}`)
      }
    }

    // Sécurité - Contre-indications
    if (product.safety?.contraindications?.length) {
      const cis = product.safety.contraindications.map((c) => c.condition)
      parts.push(`Contre-indications: ${cis.join(', ')}`)
    }

    // Interactions majeures
    if (product.interactions?.major_interactions?.length) {
      const interactions = product.interactions.major_interactions.map(
        (i) => `${i.substance} (${i.severity})`
      )
      parts.push(`Interactions majeures: ${interactions.join(', ')}`)
    }

    // === BASSE PRIORITÉ (C) ===

    // Pratique officinale
    if (product.officinal_practice) {
      const op = product.officinal_practice
      if (op.deliverable_counsel?.length) {
        parts.push(`Conseils dispensation: ${op.deliverable_counsel.slice(0, 3).join('. ')}`)
      }
      if (op.red_flags?.length) {
        parts.push(`Signes d'alerte: ${op.red_flags.join(', ')}`)
      }
    }

    // Tags sémantiques
    if (product.rag_metadata?.semantic_tags?.length) {
      parts.push(`Tags: ${product.rag_metadata.semantic_tags.join(', ')}`)
    }

    // Contextes cliniques
    if (product.rag_metadata?.clinical_contexts?.length) {
      parts.push(`Contextes: ${product.rag_metadata.clinical_contexts.join(', ')}`)
    }

    return parts.join('\n')
  },

  /**
   * Prépare le texte à embedder pour un document générique (index custom)
   * Combine tous les champs textuels du document de manière intelligente
   */
  prepareGenericText(
    document: Record<string, unknown>,
    options?: {
      priorityFields?: string[] // Champs à mettre en premier
      excludeFields?: string[] // Champs à exclure
      maxLength?: number // Longueur max du texte
    }
  ): string {
    const priorityFields = options?.priorityFields || ['title', 'name', 'content', 'description']
    const excludeFields = options?.excludeFields || ['id', 'created_at', 'updated_at', 'embedding', 'search_vector', 'is_active', 'index_id']
    const maxLength = options?.maxLength || 8000

    const parts: string[] = []

    // Fonction récursive pour extraire le texte d'une valeur
    const extractText = (value: unknown, prefix?: string): string[] => {
      if (value === null || value === undefined) return []

      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed ? [prefix ? `${prefix}: ${trimmed}` : trimmed] : []
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return prefix ? [`${prefix}: ${String(value)}`] : [String(value)]
      }

      if (Array.isArray(value)) {
        const items = value.filter((v) => v !== null && v !== undefined)
        if (items.length === 0) return []

        // Si c'est un tableau de strings
        if (items.every((v) => typeof v === 'string')) {
          return prefix ? [`${prefix}: ${items.join(', ')}`] : [items.join(', ')]
        }

        // Si c'est un tableau d'objets, récursif
        const texts: string[] = []
        items.forEach((item) => {
          texts.push(...extractText(item))
        })
        return texts
      }

      if (typeof value === 'object') {
        const texts: string[] = []
        for (const [key, val] of Object.entries(value)) {
          if (!excludeFields.includes(key)) {
            texts.push(...extractText(val, key))
          }
        }
        return texts
      }

      return []
    }

    // D'abord les champs prioritaires
    for (const field of priorityFields) {
      if (field in document && !excludeFields.includes(field)) {
        parts.push(...extractText(document[field], field))
      }
    }

    // Ensuite les autres champs
    for (const [key, value] of Object.entries(document)) {
      if (!priorityFields.includes(key) && !excludeFields.includes(key)) {
        parts.push(...extractText(value, key))
      }
    }

    // Joindre et tronquer si nécessaire
    let text = parts.join('\n')
    if (text.length > maxLength) {
      text = text.slice(0, maxLength) + '...'
    }

    return text
  },

  /**
   * Retourne les dimensions du modèle d'embedding
   */
  getDimensions(): number {
    return EMBEDDING_DIMENSIONS
  },

  /**
   * Vérifie si l'API OpenAI est configurée
   */
  isConfigured(): boolean {
    return Boolean(OPENAI_API_KEY)
  },
}
