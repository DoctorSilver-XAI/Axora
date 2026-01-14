/**
 * EnrichmentService - Enrichissement complet des documents avec IA
 * Génère un document pharmaceutique complet à partir de données minimales
 * Inclut des scores de confiance pour chaque champ généré
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

const SYSTEM_PROMPT = `Tu es un expert en pharmacologie française spécialisé dans la structuration de données pharmaceutiques pour les pharmaciens d'officine.

Ta mission : À partir d'informations minimales sur un médicament, générer une fiche produit COMPLÈTE et PRÉCISE.

RÈGLES DE GÉNÉRATION :
1. Base-toi UNIQUEMENT sur tes connaissances pharmaceutiques vérifiables
2. Pour chaque champ généré, indique un niveau de confiance (0-100)
3. Si tu n'es pas sûr d'une information, indique confidence < 50 et fournis une valeur générique
4. Les champs product_code, product_name, dci sont TOUJOURS obligatoires
5. Génère les données cliniques pertinentes (posologie, CI, interactions) basées sur le DCI

FORMAT DE RÉPONSE OBLIGATOIRE (JSON) :
{
  "enrichedDocument": {
    "product_code": "string (snake_case)",
    "product_name": "string",
    "dci": "string",
    "category": "string",
    "product_data": { ... données complètes ... }
  },
  "confidence": {
    "product_code": 100,
    "product_name": 100,
    "dci": number,
    "category": number,
    "posology": number,
    "contraindications": number,
    "interactions": number,
    "overall": number
  },
  "reasoning": [
    "Explication de la génération...",
    "Source des informations..."
  ],
  "warnings": [
    "Points à vérifier manuellement..."
  ]
}

STRUCTURE product_data ATTENDUE :
{
  "schema_version": "1.0",
  "product_identity": {
    "commercial_name": "string",
    "active_substances": ["string"],
    "laboratory": "string (si connu)",
    "pharmaceutical_forms": ["string"],
    "dosages": ["string"]
  },
  "officinal_classification": {
    "prescription_status": "PMF | PMO | Liste I | Liste II",
    "therapeutic_family": "string"
  },
  "clinical": {
    "indications": ["string"]
  },
  "posology": {
    "adult": "string",
    "child": "string ou null",
    "max_daily_dose": "string",
    "duration_limit_days": number ou null
  },
  "safety": {
    "contraindications_absolute": ["string"],
    "contraindications_relative": ["string"],
    "drug_interactions": ["string"],
    "pregnancy_breastfeeding": {
      "pregnancy": "string",
      "breastfeeding": "string"
    },
    "adverse_effects_common": ["string"]
  },
  "officinal_practice": {
    "key_counter_questions": ["string"],
    "deliverable_counsel": ["string"],
    "red_flags": ["string"]
  },
  "rag_metadata": {
    "semantic_tags": ["string"],
    "common_patient_queries": ["string"],
    "priority_score": 0.5
  }
}`

export interface EnrichmentResult {
  success: boolean
  enrichedDocument?: Record<string, unknown>
  confidence?: Record<string, number>
  reasoning?: string[]
  warnings?: string[]
  error?: string
  tokensUsed?: number
}

export interface EnrichedDocument {
  id: string
  originalData: Record<string, unknown>
  enrichedData: Record<string, unknown>
  confidence: Record<string, number>
  reasoning: string[]
  warnings: string[]
  status: 'pending' | 'approved' | 'rejected'
}

interface ChatCompletionResponse {
  id: string
  choices: Array<{
    message: {
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    total_tokens: number
  }
}

/**
 * Service d'enrichissement IA
 */
export const EnrichmentService = {
  /**
   * Vérifie si l'API est configurée
   */
  isConfigured(): boolean {
    return Boolean(OPENAI_API_KEY)
  },

  /**
   * Enrichit un document avec l'IA
   */
  async enrichDocument(
    document: Record<string, unknown>
  ): Promise<EnrichmentResult> {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error: 'Clé API OpenAI non configurée (VITE_OPENAI_API_KEY)',
      }
    }

    // Construire le prompt utilisateur
    const userPrompt = `Génère une fiche produit pharmaceutique COMPLÈTE à partir de ces données d'entrée :

\`\`\`json
${JSON.stringify(document, null, 2)}
\`\`\`

Analyse ces informations et enrichis avec toutes les données pharmaceutiques pertinentes.
Si le nom d'un médicament connu est détecté, utilise tes connaissances pour compléter.
Retourne le JSON au format demandé avec les scores de confiance.`

    try {
      console.log('[EnrichmentService] Envoi de la requête à GPT-4o...')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 3000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[EnrichmentService] Erreur API:', errorText)
        return {
          success: false,
          error: `Erreur API OpenAI: ${response.status}`,
        }
      }

      const data: ChatCompletionResponse = await response.json()
      const content = data.choices[0]?.message?.content
      const tokensUsed = data.usage?.total_tokens

      if (!content) {
        return {
          success: false,
          error: "Réponse vide de l'API",
        }
      }

      console.log('[EnrichmentService] Réponse reçue, parsing...')

      // Parser la réponse JSON
      const parsed = JSON.parse(content)

      console.log('[EnrichmentService] Document enrichi avec succès')

      return {
        success: true,
        enrichedDocument: parsed.enrichedDocument,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || [],
        warnings: parsed.warnings || [],
        tokensUsed,
      }
    } catch (error) {
      console.error('[EnrichmentService] Erreur:', error)

      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: "La réponse IA n'est pas un JSON valide",
        }
      }

      return {
        success: false,
        error: (error as Error).message,
      }
    }
  },

  /**
   * Enrichit plusieurs documents en batch
   */
  async enrichBatch(
    documents: Record<string, unknown>[],
    onProgress?: (current: number, total: number, docName: string) => void
  ): Promise<EnrichedDocument[]> {
    const results: EnrichedDocument[] = []

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      const docName = (doc.product_name as string) || (doc.name as string) || (doc.nom as string) || `Document ${i + 1}`

      onProgress?.(i + 1, documents.length, docName)

      const result = await this.enrichDocument(doc)

      if (result.success && result.enrichedDocument) {
        results.push({
          id: `enriched-${i}-${Date.now()}`,
          originalData: doc,
          enrichedData: result.enrichedDocument,
          confidence: result.confidence || {},
          reasoning: result.reasoning || [],
          warnings: result.warnings || [],
          status: 'pending',
        })
      } else {
        // En cas d'erreur, on garde le document original avec un statut d'erreur
        results.push({
          id: `enriched-${i}-${Date.now()}`,
          originalData: doc,
          enrichedData: doc,
          confidence: { overall: 0, error: 100 },
          reasoning: [],
          warnings: [result.error || 'Erreur inconnue'],
          status: 'rejected',
        })
      }

      // Pause pour éviter le rate limiting (important pour batch)
      if (i < documents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return results
  },

  /**
   * Calcule la couleur de confiance
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'text-green-400'
    if (confidence >= 50) return 'text-amber-400'
    return 'text-red-400'
  },

  /**
   * Calcule le label de confiance
   */
  getConfidenceLabel(confidence: number): string {
    if (confidence >= 80) return 'Haute confiance'
    if (confidence >= 50) return 'Confiance moyenne'
    return 'Faible confiance'
  },
}
