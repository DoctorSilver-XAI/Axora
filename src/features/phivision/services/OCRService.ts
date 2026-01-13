const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

export interface OCRResult {
  text: string
  confidence: number
  analysis?: {
    type: 'prescription' | 'ordonnance' | 'document' | 'unknown'
    medications?: string[]
    dosages?: string[]
    instructions?: string[]
    summary?: string
  }
}

export async function analyzeImage(base64Image: string): Promise<OCRResult> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API key not configured')
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Tu es un assistant pharmaceutique expert. Analyse cette image et extrait toutes les informations pertinentes.

Si c'est une ordonnance ou prescription médicale:
- Liste tous les médicaments mentionnés
- Extrait les dosages et posologies
- Identifie les instructions spéciales

Réponds en JSON avec ce format:
{
  "text": "texte brut extrait de l'image",
  "type": "prescription|ordonnance|document|unknown",
  "medications": ["médicament1", "médicament2"],
  "dosages": ["dosage1", "dosage2"],
  "instructions": ["instruction1", "instruction2"],
  "summary": "résumé court de l'analyse"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image.startsWith('data:')
                  ? base64Image
                  : `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mistral API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from Mistral API')
  }

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        text: parsed.text || content,
        confidence: 0.9,
        analysis: {
          type: parsed.type || 'unknown',
          medications: parsed.medications || [],
          dosages: parsed.dosages || [],
          instructions: parsed.instructions || [],
          summary: parsed.summary || '',
        },
      }
    }
  } catch {
    // If JSON parsing fails, return raw text
  }

  return {
    text: content,
    confidence: 0.7,
  }
}

export async function extractTextOnly(base64Image: string): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API key not configured')
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrait et transcris tout le texte visible dans cette image. Conserve la mise en forme originale autant que possible.',
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image.startsWith('data:')
                  ? base64Image
                  : `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mistral API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}
