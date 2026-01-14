import { PPPGenerationRequest, PPPGenerationResponse } from '../types'
import { PPP_SYSTEM_PROMPT } from '../utils/prompts'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o'
const MAX_TOKENS = 2000

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

function buildImageDataUrl(imageBase64: string): string | null {
  const raw = typeof imageBase64 === "string" ? imageBase64.trim() : "";
  if (!raw) return null;
  return raw.startsWith("data:")
    ? raw
    : `data:image/png;base64,${raw}`;
}

export const PPPService = {
  /**
   * Génère un Plan Personnalisé de Prévention via l'API OpenAI (GPT-4o)
   */
  async generatePPP(request: PPPGenerationRequest): Promise<PPPGenerationResponse> {
    let apiKey = OPENAI_API_KEY

    // Fallback to localStorage if available (legacy support)
    if (!apiKey) {
      try {
        apiKey = localStorage.getItem("openaiApiKey") || ""
      } catch (e) { /* ignore */ }
    }

    if (!apiKey) {
      throw new Error("Clé API OpenAI manquante. Veuillez configurer VITE_OPENAI_API_KEY ou 'openaiApiKey' dans localStorage.")
    }

    const { imageBase64, notes, ageRange } = request

    // Validation des entrées
    if (!imageBase64 && !notes.trim()) {
      throw new Error('Vous devez fournir soit une capture du dossier pharmaceutique, soit des notes d\'entretien.')
    }

    const systemPrompt = PPP_SYSTEM_PROMPT
    const hasImageInput = typeof imageBase64 === "string" && imageBase64.trim() !== "";
    const imageUrl = hasImageInput ? buildImageDataUrl(imageBase64) : null;
    const userText = `Tranche d'âge: ${ageRange || "non précisée"}\nNotes d'entretien: ${notes || "Aucune note fournie."}`;
    const hasImage = Boolean(imageUrl);

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (hasImage && imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({ role: "user", content: userText });
    }

    const body = {
      model: OPENAI_MODEL,
      max_tokens: MAX_TOKENS,
      response_format: { type: "json_object" },
      messages
    };

    // Appel à l'API OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Appel OpenAI échoué (${response.status}): ${errorText}`);
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("Réponse OpenAI vide ou inattendue.");
    }

    // Parser le JSON
    const cleaned = sanitizeJson(content)
    if (!cleaned) {
      throw new Error(`Impossible de parser le JSON retourné par OpenAI: contenu non JSON (${content?.slice?.(0, 160) || "vide"})`);
    }

    try {
      const parsed = JSON.parse(cleaned) as PPPGenerationResponse

      // Validation de la structure (basic check)
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
