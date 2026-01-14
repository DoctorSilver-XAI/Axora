/**
 * AIFixService - Correction automatique des documents avec IA
 * Utilise GPT-4o pour transformer un JSON incomplet en format valide
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// Schéma attendu pour les produits pharmaceutiques
const PHARMACEUTICAL_SCHEMA = `
{
  "product_code": "string (obligatoire) - Code unique en snake_case, ex: doliprane_500mg",
  "product_name": "string (obligatoire) - Nom commercial du produit, ex: DOLIPRANE 500 mg",
  "dci": "string (obligatoire) - Dénomination Commune Internationale (molécule active), ex: paracétamol",
  "category": "string (optionnel) - Catégorie thérapeutique, ex: Antalgique, AINS, Antispasmodique",
  "product_data": {
    "schema_version": "1.0",
    "product_identity": {
      "commercial_name": "string",
      "active_substances": ["string"],
      "laboratory": "string (optionnel)",
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
      "child": "string (optionnel)",
      "max_daily_dose": "string",
      "duration_limit_days": "number (optionnel)"
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
      "priority_score": "number 0-1"
    }
  }
}
`

const SYSTEM_PROMPT = `Tu es un expert en pharmacologie et en structuration de données pharmaceutiques.

Ta mission : Transformer un document JSON incomplet ou mal formaté en un document conforme au schéma attendu.

RÈGLES STRICTES :
1. Génère UNIQUEMENT les champs manquants ou corrige les champs mal formatés
2. Pour product_code : utilise le format snake_case basé sur le nom du produit (ex: "DOLIPRANE 500 mg" → "doliprane_500mg")
3. Pour dci : c'est la molécule active, PAS le nom commercial
4. Base-toi sur tes connaissances pharmaceutiques pour enrichir les données
5. Si tu ne connais pas une information avec certitude, mets une valeur générique appropriée
6. Les champs product_code, product_name et dci sont OBLIGATOIRES
7. Retourne UNIQUEMENT le JSON corrigé, pas d'explications

SCHÉMA ATTENDU :
${PHARMACEUTICAL_SCHEMA}

IMPORTANT : Ta réponse doit être un objet JSON valide et rien d'autre.`

export interface AIFixResult {
  success: boolean
  fixedDocument?: Record<string, unknown>
  error?: string
  tokensUsed?: number
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
 * Service de correction IA
 */
export const AIFixService = {
  /**
   * Vérifie si l'API est configurée
   */
  isConfigured(): boolean {
    return Boolean(OPENAI_API_KEY)
  },

  /**
   * Corrige un document JSON avec l'IA
   */
  async fixDocument(
    document: Record<string, unknown>,
    validationErrors: Array<{ field: string; message: string }>
  ): Promise<AIFixResult> {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error: 'Clé API OpenAI non configurée (VITE_OPENAI_API_KEY)',
      }
    }

    // Construire le prompt utilisateur
    const userPrompt = `Voici un document JSON à corriger :

\`\`\`json
${JSON.stringify(document, null, 2)}
\`\`\`

Erreurs de validation détectées :
${validationErrors.map((e) => `- ${e.field}: ${e.message}`).join('\n')}

Corrige ce document pour qu'il soit conforme au schéma. Retourne le JSON complet corrigé.`

    try {
      console.log('[AIFixService] Envoi de la requête à GPT-4o...')

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
          temperature: 0.2,
          response_format: { type: 'json_object' },
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AIFixService] Erreur API:', errorText)
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

      console.log('[AIFixService] Réponse reçue, parsing...')

      // Parser la réponse JSON
      const fixedDocument = JSON.parse(content)

      console.log('[AIFixService] Document corrigé avec succès')

      return {
        success: true,
        fixedDocument,
        tokensUsed,
      }
    } catch (error) {
      console.error('[AIFixService] Erreur:', error)

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
   * Corrige plusieurs documents en batch
   */
  async fixBatch(
    documents: Array<{
      document: Record<string, unknown>
      validationErrors: Array<{ field: string; message: string }>
    }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<AIFixResult[]> {
    const results: AIFixResult[] = []

    for (let i = 0; i < documents.length; i++) {
      onProgress?.(i + 1, documents.length)

      const result = await this.fixDocument(
        documents[i].document,
        documents[i].validationErrors
      )
      results.push(result)

      // Petite pause pour éviter le rate limiting
      if (i < documents.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    return results
  },
}
