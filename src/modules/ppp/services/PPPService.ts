import { PPPGenerationRequest, PPPGenerationResponse } from '../types'
import { PPP_SYSTEM_PROMPT } from '../utils/prompts'

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

// Mistral Vision model for analyzing pharmaceutical documents
const MISTRAL_MODEL = 'pixtral-12b-2409'

function sanitizeJson(text: string): string | null {
  // Handle cases where the model returns code fences or trailing text.
  const fenced = text.match(/```(?:json)?\n?([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1)
  }
  return null
}

export const PPPService = {
  /**
   * Génère un Plan Personnalisé de Prévention via l'API Mistral
   */
  async generatePPP(request: PPPGenerationRequest): Promise<PPPGenerationResponse> {
    if (!MISTRAL_API_KEY) {
      throw new Error('Clé API Mistral non configurée. Vérifiez vos variables d\'environnement.')
    }

    const { imageBase64, notes, ageRange } = request

    // Validation des entrées
    if (!imageBase64 && !notes.trim()) {
      throw new Error('Vous devez fournir soit une capture du dossier pharmaceutique, soit des notes d\'entretien.')
    }

    // Construction du message utilisateur
    const userText = `Tranche d'âge: ${ageRange}\nNotes d'entretien: ${notes || 'Aucune note fournie.'}`

    // Préparer les messages selon le type d'entrée
    const messages: Array<{
      role: string
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    }> = [
      {
        role: 'system',
        content: PPP_SYSTEM_PROMPT,
      },
    ]

    // Si on a une image, on utilise le format vision
    if (imageBase64) {
      const imageUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      })
    } else {
      // Sinon, juste le texte
      messages.push({
        role: 'user',
        content: userText,
      })
    }

    // Appel à l'API Mistral
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages,
        max_tokens: 4096,
        temperature: 0.1, // Température basse pour plus de cohérence médicale
        response_format: { type: 'json_object' }, // Force JSON output
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur API Mistral (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Réponse vide de l\'API Mistral')
    }

    // Parser le JSON
    const cleaned = sanitizeJson(content)
    if (!cleaned) {
      console.error('Réponse Mistral non-JSON:', content.slice(0, 300))
      throw new Error('Format de réponse invalide de l\'API Mistral')
    }

    try {
      const parsed = JSON.parse(cleaned) as PPPGenerationResponse

      // Validation de la structure
      if (!parsed.priorities || !Array.isArray(parsed.priorities)) {
        throw new Error('Structure de réponse invalide: manque le champ "priorities"')
      }

      return parsed
    } catch (err) {
      console.error('Erreur de parsing JSON:', err, cleaned.slice(0, 300))
      throw new Error(`Impossible de parser la réponse de l'API: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    }
  },
}
