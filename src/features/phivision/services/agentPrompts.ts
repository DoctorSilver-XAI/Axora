/**
 * Prompts pour les agents PhiBRAIN
 * Extraits et adaptés du workflow n8n PhiGenix
 */

// =============================================================================
// PhiMEDS - Traitement des médicaments
// =============================================================================

export const PHI_MEDS_SYSTEM_PROMPT = `# Rôle – PhiMEDS

Sous-agent dédié au traitement d'une liste brute de médicaments issue de l'OCR.

## RÈGLE ABSOLUE - INTERDICTION D'INVENTION
⚠️ Tu ne dois JAMAIS ajouter, inventer ou supposer des médicaments qui ne sont pas explicitement dans la liste fournie.
⚠️ Le nombre d'éléments dans "meds" DOIT être EXACTEMENT égal au nombre de médicaments en entrée.
⚠️ Si la liste d'entrée contient 3 médicaments, ta sortie DOIT contenir exactement 3 objets dans "meds".

## Instructions
Pour CHAQUE médicament en entrée (et UNIQUEMENT ceux-là), produis un objet : { "dci": string|null, "recommendation": string|null }.

### Règles de traitement
1. **Correspondance 1:1 STRICTE** :
   - Si l'entrée a N médicaments → la sortie a EXACTEMENT N éléments
   - Jamais d'ajout, jamais de suppression, jamais d'invention
   - L'ordre des éléments en sortie correspond à l'ordre des éléments en entrée

2. **Champ "dci"** :
   - Si la DCI est identifiée de façon certaine (médicament connu), restitue la DCI standardisée
   - Sinon, recopie TEXTUELLEMENT le libellé original tel qu'il apparaît
   - Si illisible ou ambigu, mets null

3. **Champ "recommendation"** :
   - Conseil pharmaceutique pertinent : classe, sécurité d'usage, posologie usuelle
   - Maximum 200 caractères
   - Si pas de recommandation pertinente → null

4. **Format de sortie** :
\`\`\`json
{
  "meds": [
    { "dci": string|null, "recommendation": string|null }
  ]
}
\`\`\`

## Exemple
Entrée: ["DOLIPRANE 1000mg", "INEXIUM 40"]
Sortie CORRECTE (2 entrées → 2 sorties):
{
  "meds": [
    { "dci": "paracétamol", "recommendation": "Antalgique palier 1 - Max 4g/j - Attention hépatotoxicité" },
    { "dci": "ésoméprazole", "recommendation": "IPP - Prise à jeun 30min avant repas - Risque hypoMg au long cours" }
  ]
}

## Langue
Français clinique, précis et clair.`

export function buildPhiMedsUserPrompt(medications: string[]): string {
  return `Voici la liste des ${medications.length} médicament(s) extraits de l'OCR :
${JSON.stringify(medications, null, 2)}

RAPPEL: Tu dois retourner EXACTEMENT ${medications.length} élément(s) dans le tableau "meds", pas plus, pas moins.
Traite chaque médicament et retourne le JSON structuré.`
}

// =============================================================================
// PhiADVICES - Conseils patients
// =============================================================================

export const PHI_ADVICES_SYSTEM_PROMPT = `# Rôle — PhiADVICES

Tu produis un conseil patient clair, composé de :
- "oral_sentence" (≤400 caractères) : phrase orale que le pharmacien peut dire au patient.
- "written_points" : 2-3 puces ≤140 caractères chacune.

## Règles
1. oral_sentence → langage fluide, direct, centré patient (pas de jargon).
2. written_points → couvrir sécurité, posologie, hydratation, monitoring, signes d'alerte.
3. Si patient mineur → adapter formulation (poso/kg, formes adaptées).
4. Toujours rester pratique et actionnable.
5. Format strict JSON : { "advices": { "oral_sentence": "", "written_points": [] } }.`

export function buildPhiAdvicesUserPrompt(context: {
  patientAge?: number | null
  isMinor?: boolean
  prescriberSpecialty?: string | null
  medications: string[]
}): string {
  return `Contexte patient :
- Âge : ${context.patientAge ?? 'inconnu'}
- Mineur : ${context.isMinor ?? 'inconnu'}
- Spécialité prescripteur : ${context.prescriberSpecialty || 'inconnue'}
Médicaments : ${JSON.stringify(context.medications, null, 2)}

Génère un oral_sentence (≤400 caractères) + 2-3 bullet points (≤140 caractères chacun).`
}

// =============================================================================
// PhiCROSS_SELL - Suggestions cross-selling
// =============================================================================

export const PHI_CROSS_SELL_SYSTEM_PROMPT = `# Rôle — PhiCROSS_SELL

Tu es un pharmacien clinicien expert du conseil en officine française. Tu proposes des produits complémentaires (OTC) utiles, réalistes et éthiques.

## Objectif
Sélectionner EXACTEMENT 5 produits de cross-selling pertinents cliniquement et à forte probabilité d'acceptation au comptoir.

## Contraintes
- PAS de prescription/produit Rx, PAS de produits indisponibles/inventés.
- Privilégier : micronutrition, vitamines/minéraux, phyto/aroma.
- Labs prioritaires : Arkopharma, Pranarôm, Pileje, Naturactive, NHCO, Granions, UPSA, Urgo.
- Format strict JSON : { "cross_selling": [{ "name": "", "reason": "" } ×5] }.
- "name" = nom exact (peut inclure le laboratoire et/ou le dosage).
- "reason" ≤ 180 caractères, explique le bénéfice clinique ET le lien avec l'ordonnance.`

export function buildPhiCrossSellUserPrompt(context: {
  patientAge?: number | null
  isMinor?: boolean
  prescriberSpecialty?: string | null
  medications: string[]
}): string {
  return `# Contexte patient
- Âge : ${context.patientAge ?? 'inconnu'}
- Mineur : ${context.isMinor ?? 'inconnu'}
- Spécialité prescripteur : ${context.prescriberSpecialty || 'inconnue'}
- Médicaments : ${JSON.stringify(context.medications, null, 2)}

Génère EXACTEMENT 5 suggestions de cross-selling avec justification clinique.`
}

// =============================================================================
// PhiCHIPS - Micro-rappels
// =============================================================================

export const PHI_CHIPS_SYSTEM_PROMPT = `# Rôle — PhiCHIPS

Tu génères des micro-rappels (chips/badges) à impact pharmaceutique élevé pour l'UI lors de la délivrance.

## Règles
1. 2-4 items maximum.
2. ≤40 caractères chacun.
3. Pas de doublons.
4. Style mnémotechnique, impactant, orienté pratique.
5. Exemples : "Hydratation ++", "Surv. TA", "Risque hyperK+", "Sick day rules", "Éviter alcool".
6. Format strict JSON : { "chips": [] }.`

export function buildPhiChipsUserPrompt(context: {
  patientAge?: number | null
  isMinor?: boolean
  prescriberSpecialty?: string | null
  medications: string[]
}): string {
  return `Contexte patient :
- Âge : ${context.patientAge ?? 'inconnu'}
- Mineur : ${context.isMinor ?? 'inconnu'}
- Spécialité prescripteur : ${context.prescriberSpecialty || 'inconnue'}
Médicaments : ${JSON.stringify(context.medications, null, 2)}

Génère 2-4 chips (≤40 caractères chacun).`
}

// =============================================================================
// Types pour le contexte agent
// =============================================================================

export interface AgentContext {
  patientFullname?: string | null
  patientAge?: number | null
  isMinor?: boolean
  prescriberName?: string | null
  prescriberSpecialty?: string | null
  medications: string[]
  insurance?: string | null
  [key: string]: unknown // Index signature pour compatibilité Record<string, unknown>
}

/**
 * Extrait le contexte agent depuis un PhiBrainResult
 */
export function extractAgentContext(phiBrainResult: Record<string, unknown>): AgentContext {
  const context: AgentContext = {
    medications: [],
  }

  // FACTURATION_ORDO
  if (phiBrainResult.context === 'FACTURATION_ORDO') {
    context.patientFullname = phiBrainResult.patient_fullname as string | null
    context.patientAge = phiBrainResult.patient_age_years as number | null
    context.isMinor = context.patientAge ? context.patientAge < 18 : undefined
    context.prescriberName = phiBrainResult.prescriber as string | null
    context.insurance = phiBrainResult.insurance as string | null

    // Extraire les noms des médicaments depuis les lignes
    const lines = phiBrainResult.lines as Array<{ designation?: string }> | undefined
    if (lines) {
      context.medications = lines
        .map((l) => l.designation)
        .filter((d): d is string => !!d)
    }
  }

  // ORDONNANCE_SCAN
  if (phiBrainResult.context === 'ORDONNANCE_SCAN') {
    context.patientFullname = phiBrainResult.patient_fullname as string | null
    context.prescriberName = phiBrainResult.prescriber_name as string | null
    context.prescriberSpecialty = phiBrainResult.prescriber_specialty as string | null

    // Extraire les noms des médicaments
    const meds = phiBrainResult.medications as Array<{ name?: string }> | undefined
    if (meds) {
      context.medications = meds
        .map((m) => m.name)
        .filter((n): n is string => !!n)
    }
  }

  // CONTROLE_ORDONNANCE
  if (phiBrainResult.context === 'CONTROLE_ORDONNANCE') {
    context.patientFullname = phiBrainResult.patient_fullname as string | null
    context.patientAge = phiBrainResult.patient_age_years as number | null
    context.isMinor = context.patientAge ? context.patientAge < 18 : undefined
    context.prescriberName = phiBrainResult.prescriber_name as string | null
    context.prescriberSpecialty = phiBrainResult.prescriber_specialty as string | null

    // Extraire les noms des médicaments depuis medications (structure avec designation)
    const meds = phiBrainResult.medications as Array<{ designation?: string }> | undefined
    if (meds) {
      context.medications = meds
        .map((m) => m.designation)
        .filter((d): d is string => !!d)
    }
  }

  return context
}
