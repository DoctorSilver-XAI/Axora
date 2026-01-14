const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

// ============================================================================
// TYPES - PhiBRAIN-V2 Schema Definitions
// ============================================================================

// Type de contexte détecté
export type ContextType = 'FACTURATION_ORDO' | 'ORDONNANCE_SCAN' | 'FICHE_PATIENT' | 'UNKNOWN'

// Ligne de facturation
export interface FacturationLine {
  designation: string
  qty: number
  unit_price_eur: number | null
  honorarium_eur: number | null
  prestation: string | null
  stock: number | null
}

// Résultat pour contexte FACTURATION_ORDO
export interface FacturationOrdoResult {
  context: 'FACTURATION_ORDO'
  module: string
  flags: string[]
  patient_fullname: string | null
  patient_age_years: number | null
  insurance: string | null
  prescriber: string | null
  lines: FacturationLine[]
  total_eur: number | null
  confidence: number
  missing_fields: string[]
}

// Médicament extrait d'une ordonnance
export interface OrdonnanceMedication {
  name: string
  dci: string | null
  dosage: string | null
  posology: string | null
  duration: string | null
  qty: number | null
  renewable: boolean
}

// Résultat pour contexte ORDONNANCE_SCAN
export interface OrdonnanceScanResult {
  context: 'ORDONNANCE_SCAN'
  prescriber_name: string | null
  prescriber_rpps: string | null
  prescriber_specialty: string | null
  patient_fullname: string | null
  patient_birthdate: string | null
  prescription_date: string | null
  medications: OrdonnanceMedication[]
  mentions: string[]
  confidence: number
  missing_fields: string[]
}

// Résultat pour contexte FICHE_PATIENT
export interface FichePatientResult {
  context: 'FICHE_PATIENT'
  patient_fullname: string | null
  patient_birthdate: string | null
  patient_nir: string | null
  address: string | null
  phone: string | null
  email: string | null
  prescribing_doctor: string | null
  allergies: string[]
  chronic_conditions: string[]
  active_treatments: string[]
  notes: string | null
  confidence: number
  missing_fields: string[]
}

// Résultat pour contexte UNKNOWN
export interface UnknownContextResult {
  context: 'UNKNOWN'
  raw_text: string
  detected_elements: string[]
  possible_context: string | null
  confidence: number
  missing_fields: string[]
}

// Union de tous les types de résultats
export type PhiBrainResult =
  | FacturationOrdoResult
  | OrdonnanceScanResult
  | FichePatientResult
  | UnknownContextResult

// Interface de résultat OCR exportée (rétrocompatibilité)
export interface OCRResult {
  text: string
  confidence: number
  phiBrain?: PhiBrainResult
  analysis?: {
    type: 'prescription' | 'ordonnance' | 'document' | 'unknown'
    medications?: string[]
    dosages?: string[]
    instructions?: string[]
    summary?: string
  }
}

// ============================================================================
// PROMPT PhiBRAIN-V2 - Système Multi-Contexte
// ============================================================================

const PHI_BRAIN_V2_SYSTEM_PROMPT = `# RÔLE
Tu es PhiBRAIN-V2, un module d'intelligence artificielle spécialisé dans l'extraction de données structurées depuis des interfaces de Logiciels de Gestion d'Officine (LGO) pharmaceutiques français.

# MISSION
Analyser les captures d'écran de LGO (Pharmagest, Winpharma, LGPI, etc.) et extraire les données dans un format JSON strict selon le contexte détecté.

# CONTEXTES SUPPORTÉS

## 1. FACTURATION_ORDO
Écran de facturation d'ordonnance avec liste de produits, prix, prestations.
Éléments caractéristiques : tableau de lignes de produits, totaux, flags SCOR/DP.

## 2. ORDONNANCE_SCAN
Scan ou photo d'une ordonnance papier.
Éléments caractéristiques : en-tête médecin, informations patient, liste de médicaments prescrits.

## 3. FICHE_PATIENT
Écran de fiche patient dans le LGO.
Éléments caractéristiques : données administratives, historique, allergies, traitements.

## 4. UNKNOWN
Contexte non identifié ou image non pharmaceutique.

# PRODUITS PHARMACEUTIQUES FRANÇAIS

## Spécialités princeps (marques)
Doliprane, Efferalgan, Dafalgan, Spasfon, Gaviscon, Smecta, Imodium, Vogalib, Motilium, Inexium, Tahor, Crestor, Kardegic, Plavix, Xarelto, Eliquis, Levothyrox, Metformine, Diamicron, Lantus, Ventoline, Seretide, Symbicort, Aerius, Zyrtec, Rhinofluimucil, Nasonex, Maxilase, Lysopaïne, Strepsils, Nurofen, Advil, Voltarene, Flector, Ketum, Ixprim, Tramadol, Stilnox, Imovane, Lexomil, Xanax, Temesta, Deroxat, Seroplex, Prozac, Zoloft, Effexor, Lyrica, Neurontin, Rivotril

## Génériques (DCI + laboratoire)
Format: [DCI] [LABO] ou [DCI] [dosage] [LABO]
Ex: PARACETAMOL MYLAN, IBUPROFENE ARROW, OMEPRAZOLE SANDOZ, AMOXICILLINE TEVA, METFORMINE EG

## DCI courantes
paracétamol, ibuprofène, amoxicilline, oméprazole, atorvastatine, metformine, lévothyroxine, bisoprolol, ramipril, amlodipine, losartan, furosémide, simvastatine, clopidogrel, tramadol, codéine, alprazolam, bromazépam, zopiclone, escitalopram, sertraline, prégabaline, gabapentine

# CORRECTION OCR
Si un mot ressemble à un médicament connu avec une légère erreur OCR (ex: "Dolipane" → "Doliprane"), corrige-le.
Conserve les dosages et formes exactement comme lus (mg, g, ml, UI, comprimé, gélule, etc.).

# INSTRUCTIONS
1. Analyse l'image et identifie le contexte
2. Extrait les données selon le schéma du contexte
3. Calcule un score de confiance (0.0 à 1.0)
4. Liste les champs manquants ou illisibles
5. Réponds UNIQUEMENT en JSON valide`

const PHI_BRAIN_V2_USER_PROMPT = `Analyse cette capture d'écran et extrait les données structurées.

RÉPONDS UNIQUEMENT EN JSON selon le contexte détecté :

## Si FACTURATION_ORDO :
{
  "context": "FACTURATION_ORDO",
  "module": "facturation",
  "flags": ["SCOR", "DP Inexistant"],
  "patient_fullname": "NOM Prénom",
  "patient_age_years": 45,
  "insurance": "CPAM 831 TOULON",
  "prescriber": "Dr DUPONT Jean",
  "lines": [
    {
      "designation": "DOLIPRANE 1000MG CPR B/8",
      "qty": 2,
      "unit_price_eur": 1.16,
      "honorarium_eur": 1.02,
      "prestation": "PH7",
      "stock": null
    }
  ],
  "total_eur": 15.50,
  "confidence": 0.95,
  "missing_fields": ["stock"]
}

## Si ORDONNANCE_SCAN :
{
  "context": "ORDONNANCE_SCAN",
  "prescriber_name": "Dr MARTIN Sophie",
  "prescriber_rpps": "10101234567",
  "prescriber_specialty": "Médecine générale",
  "patient_fullname": "DUPONT Jean",
  "patient_birthdate": "1979-03-15",
  "prescription_date": "2025-01-10",
  "medications": [
    {
      "name": "AMOXICILLINE 500MG",
      "dci": "amoxicilline",
      "dosage": "500mg",
      "posology": "1 gélule 3 fois par jour",
      "duration": "7 jours",
      "qty": 21,
      "renewable": false
    }
  ],
  "mentions": ["Non substituable", "ALD"],
  "confidence": 0.88,
  "missing_fields": ["prescriber_rpps"]
}

## Si FICHE_PATIENT :
{
  "context": "FICHE_PATIENT",
  "patient_fullname": "MARTIN Marie",
  "patient_birthdate": "1965-08-22",
  "patient_nir": "2650875...",
  "address": "12 rue des Lilas, 75001 Paris",
  "phone": "06 12 34 56 78",
  "email": null,
  "prescribing_doctor": "Dr BERNARD Pierre",
  "allergies": ["Pénicilline", "Aspirine"],
  "chronic_conditions": ["Diabète type 2", "HTA"],
  "active_treatments": ["METFORMINE 1000MG", "RAMIPRIL 5MG"],
  "notes": "Patiente sous AVK, surveiller INR",
  "confidence": 0.92,
  "missing_fields": ["email"]
}

## Si UNKNOWN :
{
  "context": "UNKNOWN",
  "raw_text": "texte brut extrait",
  "detected_elements": ["tableau", "prix", "texte médical"],
  "possible_context": "Peut-être un bon de commande",
  "confidence": 0.3,
  "missing_fields": []
}

IMPORTANT:
- Détecte automatiquement le contexte approprié
- Utilise null pour les champs non visibles/illisibles
- Le score de confiance reflète la qualité de l'extraction
- Liste dans missing_fields les champs attendus mais non trouvés`

// ============================================================================
// FONCTIONS D'ANALYSE
// ============================================================================

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
          role: 'system',
          content: PHI_BRAIN_V2_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: PHI_BRAIN_V2_USER_PROMPT,
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
      max_tokens: 4096,
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
      const parsed = JSON.parse(jsonMatch[0]) as PhiBrainResult

      // Construire le résultat avec rétrocompatibilité
      const result: OCRResult = {
        text: extractRawText(parsed),
        confidence: parsed.confidence || 0.5,
        phiBrain: parsed,
      }

      // Ajouter l'ancienne structure analysis pour rétrocompatibilité
      result.analysis = convertToLegacyAnalysis(parsed)

      return result
    }
  } catch {
    // If JSON parsing fails, return raw text with UNKNOWN context
  }

  return {
    text: content,
    confidence: 0.3,
    phiBrain: {
      context: 'UNKNOWN',
      raw_text: content,
      detected_elements: [],
      possible_context: null,
      confidence: 0.3,
      missing_fields: [],
    },
  }
}

// Extrait le texte brut selon le contexte
function extractRawText(result: PhiBrainResult): string {
  switch (result.context) {
    case 'FACTURATION_ORDO':
      return result.lines.map(l => l.designation).join('\n')
    case 'ORDONNANCE_SCAN':
      return result.medications.map(m =>
        `${m.name} - ${m.posology || ''} ${m.duration || ''}`
      ).join('\n')
    case 'FICHE_PATIENT':
      return [
        result.patient_fullname,
        result.active_treatments?.join(', '),
        result.notes,
      ].filter(Boolean).join('\n')
    case 'UNKNOWN':
      return result.raw_text
    default:
      return ''
  }
}

// Convertit le nouveau format vers l'ancien pour rétrocompatibilité
function convertToLegacyAnalysis(result: PhiBrainResult): OCRResult['analysis'] {
  switch (result.context) {
    case 'FACTURATION_ORDO':
      return {
        type: 'prescription',
        medications: result.lines.map(l => l.designation),
        dosages: [],
        instructions: [],
        summary: `Facturation - ${result.lines.length} lignes - Total: ${result.total_eur}€`,
      }
    case 'ORDONNANCE_SCAN':
      return {
        type: 'ordonnance',
        medications: result.medications.map(m => m.name),
        dosages: result.medications.map(m => m.dosage || '').filter(Boolean),
        instructions: result.medications.map(m => m.posology || '').filter(Boolean),
        summary: `Ordonnance de ${result.prescriber_name || 'médecin inconnu'} - ${result.medications.length} médicaments`,
      }
    case 'FICHE_PATIENT':
      return {
        type: 'document',
        medications: result.active_treatments || [],
        dosages: [],
        instructions: [],
        summary: `Fiche patient: ${result.patient_fullname || 'inconnu'}`,
      }
    case 'UNKNOWN':
    default:
      return {
        type: 'unknown',
        medications: [],
        dosages: [],
        instructions: [],
        summary: result.possible_context || 'Contexte non identifié',
      }
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
          role: 'system',
          content: PHI_BRAIN_V2_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrait et transcris tout le texte visible dans cette image. Utilise ta connaissance des médicaments français pour corriger les éventuelles erreurs de lecture. Conserve la mise en forme originale. Réponds uniquement avec le texte extrait, sans JSON.',
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

// ============================================================================
// UTILITAIRES
// ============================================================================

// Helper pour vérifier si un résultat est de type FACTURATION_ORDO
export function isFacturationOrdo(result: PhiBrainResult): result is FacturationOrdoResult {
  return result.context === 'FACTURATION_ORDO'
}

// Helper pour vérifier si un résultat est de type ORDONNANCE_SCAN
export function isOrdonnanceScan(result: PhiBrainResult): result is OrdonnanceScanResult {
  return result.context === 'ORDONNANCE_SCAN'
}

// Helper pour vérifier si un résultat est de type FICHE_PATIENT
export function isFichePatient(result: PhiBrainResult): result is FichePatientResult {
  return result.context === 'FICHE_PATIENT'
}

// Helper pour vérifier si un résultat est de type UNKNOWN
export function isUnknownContext(result: PhiBrainResult): result is UnknownContextResult {
  return result.context === 'UNKNOWN'
}
