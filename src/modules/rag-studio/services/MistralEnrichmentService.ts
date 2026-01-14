/**
 * MistralEnrichmentService - Enrichissement pharmaceutique avec Mistral AI
 * Utilise mistral-medium-2508 pour générer des fiches produits complètes
 * Optimisé pour les sources françaises et européennes
 */

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY

const SYSTEM_PROMPT = `Tu es un expert pharmacien d'officine français, spécialisé dans la documentation pharmaceutique.

Ta mission : À partir du nom d'un médicament, générer une fiche produit COMPLÈTE et PRÉCISE pour un système RAG officinal.

SOURCES DE RÉFÉRENCE (par ordre de priorité) :
1. Base de données publique des médicaments (ANSM) : https://base-donnees-publique.medicaments.gouv.fr
2. Thériaque (base de données médicamenteuses française)
3. Vidal / Dictionnaire Vidal
4. Agence européenne des médicaments (EMA)
5. Haute Autorité de Santé (HAS) - avis de la Commission de Transparence

RÈGLES DE GÉNÉRATION :
1. Base-toi sur tes connaissances des médicaments français commercialisés
2. Pour chaque champ, indique un niveau de confiance (0-100)
3. Confiance > 80 : Information certaine (RCP, base ANSM)
4. Confiance 50-80 : Information probable mais à vérifier
5. Confiance < 50 : Information générée/estimée
6. Les champs product_code, product_name, dci sont OBLIGATOIRES
7. Utilise les formulations françaises (ex: "comprimé pelliculé" pas "film-coated tablet")

FORMAT DE RÉPONSE OBLIGATOIRE (JSON) :
{
  "enrichedDocument": {
    "product_code": "string (snake_case, ex: doliprane_500mg)",
    "product_name": "string (nom commercial exact)",
    "dci": "string (Dénomination Commune Internationale)",
    "category": "string (classe thérapeutique)",
    "product_data": { ... données complètes ... }
  },
  "confidence": {
    "product_code": 100,
    "product_name": number,
    "dci": number,
    "category": number,
    "posology": number,
    "contraindications": number,
    "interactions": number,
    "overall": number
  },
  "reasoning": [
    "Source: Base de données publique des médicaments (ANSM)",
    "DCI identifiée : ...",
    "Classification ATC : ..."
  ],
  "warnings": [
    "Points à vérifier manuellement..."
  ],
  "sources": [
    "ANSM - RCP officiel",
    "Vidal 2024"
  ]
}

STRUCTURE product_data ATTENDUE :
{
  "schema_version": "1.0",
  "product_identity": {
    "commercial_name": "string",
    "active_substances": ["string (DCI)"],
    "laboratory": "string (laboratoire titulaire AMM)",
    "pharmaceutical_forms": ["comprimé", "gélule", "solution buvable"...],
    "dosages": ["500 mg", "1 g"...]
  },
  "regulatory": {
    "amm_number": "string (si connu)",
    "cip_codes": ["string (CIP13 si connu)"],
    "atc_code": "string (code ATC)",
    "generic_group": "string ou null"
  },
  "officinal_classification": {
    "prescription_status": "PMF | PMO | Liste I | Liste II | Stupéfiant",
    "therapeutic_family": "string",
    "smr": "Insuffisant | Faible | Modéré | Important | Majeur (si avis HAS)",
    "asmr": "I | II | III | IV | V (si applicable)"
  },
  "clinical": {
    "indications": ["string - indications AMM"],
    "off_label_uses": ["string - usages hors AMM fréquents"]
  },
  "posology": {
    "adult": "string",
    "child": "string ou null",
    "elderly": "string (adaptations sujet âgé)",
    "max_daily_dose": "string",
    "duration_limit_days": number ou null,
    "renal_adjustment": "string ou null",
    "hepatic_adjustment": "string ou null"
  },
  "safety": {
    "contraindications_absolute": ["string"],
    "contraindications_relative": ["string"],
    "drug_interactions": ["string (interactions cliniquement significatives)"],
    "pregnancy_breastfeeding": {
      "pregnancy": "string (Autorisé | Déconseillé | Contre-indiqué + trimestre)",
      "breastfeeding": "string"
    },
    "adverse_effects_common": ["string (> 1/100)"],
    "adverse_effects_serious": ["string (effets graves à surveiller)"],
    "driving_warning": true | false,
    "photosensitivity": true | false
  },
  "officinal_practice": {
    "key_counter_questions": ["Questions à poser au comptoir"],
    "deliverable_counsel": ["Conseils de délivrance"],
    "red_flags": ["Signaux d'alerte pour orientation médicale"],
    "storage": "string (conditions de conservation)",
    "dispensing_tips": ["Astuces de délivrance"]
  },
  "rag_metadata": {
    "semantic_tags": ["string"],
    "common_patient_queries": ["Questions fréquentes des patients"],
    "synonyms": ["Noms alternatifs, DCI, marques génériques"],
    "priority_score": 0.5
  }
}`

export interface MistralEnrichmentResult {
  success: boolean
  enrichedDocument?: Record<string, unknown>
  confidence?: Record<string, number>
  reasoning?: string[]
  warnings?: string[]
  sources?: string[]
  error?: string
  tokensUsed?: number
}

export interface MistralEnrichedDocument {
  id: string
  originalData: Record<string, unknown>
  enrichedData: Record<string, unknown>
  confidence: Record<string, number>
  reasoning: string[]
  warnings: string[]
  sources: string[]
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
 * Service d'enrichissement Mistral AI
 */
export const MistralEnrichmentService = {
  /**
   * Vérifie si l'API est configurée
   */
  isConfigured(): boolean {
    return Boolean(MISTRAL_API_KEY)
  },

  /**
   * Enrichit un document avec Mistral AI
   */
  async enrichDocument(
    productName: string
  ): Promise<MistralEnrichmentResult> {
    if (!MISTRAL_API_KEY) {
      return {
        success: false,
        error: 'Clé API Mistral non configurée (VITE_MISTRAL_API_KEY)',
      }
    }

    const userPrompt = `Génère une fiche produit pharmaceutique COMPLÈTE pour le médicament suivant :

"${productName}"

Instructions :
1. Identifie le médicament exact (nom commercial, laboratoire, dosage)
2. Recherche dans tes connaissances les informations du RCP
3. Génère la fiche au format JSON demandé
4. Indique tes sources et niveaux de confiance

Si le médicament n'existe pas ou n'est pas commercialisé en France, indique-le dans les warnings avec confidence < 30.`

    try {
      console.log('[MistralEnrichmentService] Envoi de la requête à Mistral...')

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-medium-2505',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2, // Faible pour plus de précision
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[MistralEnrichmentService] Erreur API:', errorText)
        return {
          success: false,
          error: `Erreur API Mistral: ${response.status}`,
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

      console.log('[MistralEnrichmentService] Réponse reçue, parsing...')

      // Parser la réponse JSON
      const parsed = JSON.parse(content)

      console.log('[MistralEnrichmentService] Document enrichi avec succès')

      return {
        success: true,
        enrichedDocument: parsed.enrichedDocument,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || [],
        warnings: parsed.warnings || [],
        sources: parsed.sources || [],
        tokensUsed,
      }
    } catch (error) {
      console.error('[MistralEnrichmentService] Erreur:', error)

      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: "La réponse Mistral n'est pas un JSON valide",
        }
      }

      return {
        success: false,
        error: (error as Error).message,
      }
    }
  },

  /**
   * Enrichit plusieurs produits en batch
   */
  async enrichBatch(
    productNames: string[],
    onProgress?: (current: number, total: number, productName: string) => void
  ): Promise<MistralEnrichedDocument[]> {
    const results: MistralEnrichedDocument[] = []

    for (let i = 0; i < productNames.length; i++) {
      const productName = productNames[i]

      onProgress?.(i + 1, productNames.length, productName)

      const result = await this.enrichDocument(productName)

      if (result.success && result.enrichedDocument) {
        results.push({
          id: `mistral-${i}-${Date.now()}`,
          originalData: { product_name: productName },
          enrichedData: result.enrichedDocument,
          confidence: result.confidence || {},
          reasoning: result.reasoning || [],
          warnings: result.warnings || [],
          sources: result.sources || [],
          status: 'pending',
        })
      } else {
        // En cas d'erreur, on crée un document avec le statut rejected
        results.push({
          id: `mistral-${i}-${Date.now()}`,
          originalData: { product_name: productName },
          enrichedData: { product_name: productName },
          confidence: { overall: 0, error: 100 },
          reasoning: [],
          warnings: [result.error || 'Erreur inconnue'],
          sources: [],
          status: 'rejected',
        })
      }

      // Pause pour éviter le rate limiting
      if (i < productNames.length - 1) {
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
    if (confidence >= 80) return 'Source officielle'
    if (confidence >= 50) return 'À vérifier'
    return 'Estimation'
  },
}
