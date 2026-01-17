/**
 * Quick Prompts Constants
 *
 * Suggestions de prompts pré-définis pour guider les utilisateurs
 * dans leurs interactions avec l'assistant IA.
 *
 * Ces prompts sont spécifiquement adaptés au contexte pharmaceutique d'officine.
 */

import { LucideIcon, AlertTriangle, Calculator, MessageCircle, Stethoscope } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export type QuickPromptCategory = 'interactions' | 'posologies' | 'conseils' | 'pathologies'

export interface QuickPrompt {
  id: string
  label: string // Texte court affiché sur le bouton
  prompt: string // Prompt complet envoyé à l'IA
  category: QuickPromptCategory
}

export interface QuickPromptCategoryConfig {
  id: QuickPromptCategory
  label: string
  icon: LucideIcon
  color: 'amber' | 'cyan' | 'violet' | 'emerald'
}

// =============================================================================
// CATEGORY CONFIGURATION
// =============================================================================

export const QUICK_PROMPT_CATEGORIES: Record<QuickPromptCategory, QuickPromptCategoryConfig> = {
  interactions: {
    id: 'interactions',
    label: 'Interactions',
    icon: AlertTriangle,
    color: 'amber',
  },
  posologies: {
    id: 'posologies',
    label: 'Posologies',
    icon: Calculator,
    color: 'cyan',
  },
  conseils: {
    id: 'conseils',
    label: 'Conseils',
    icon: MessageCircle,
    color: 'violet',
  },
  pathologies: {
    id: 'pathologies',
    label: 'Pathologies',
    icon: Stethoscope,
    color: 'emerald',
  },
}

// =============================================================================
// PROMPTS DATA
// =============================================================================

export const QUICK_PROMPTS: QuickPrompt[] = [
  // Interactions
  {
    id: 'int-1',
    label: 'Vérifier des interactions',
    prompt:
      'Quelles sont les interactions médicamenteuses entre ces médicaments : [listez les médicaments]. Y a-t-il des contre-indications majeures ?',
    category: 'interactions',
  },
  {
    id: 'int-2',
    label: 'AVK et alimentation',
    prompt:
      "Quels sont les conseils alimentaires à donner à un patient sous AVK ? Quels aliments éviter et pourquoi ?",
    category: 'interactions',
  },
  // Posologies
  {
    id: 'pos-1',
    label: 'Posologie pédiatrique',
    prompt:
      'Comment calculer la posologie pédiatrique de [médicament] pour un enfant de [âge] ans pesant [poids] kg ?',
    category: 'posologies',
  },
  {
    id: 'pos-2',
    label: 'Adaptation rénale',
    prompt:
      'Comment adapter la posologie de [médicament] chez un patient insuffisant rénal avec un DFG de [valeur] mL/min ?',
    category: 'posologies',
  },
  // Conseils
  {
    id: 'con-1',
    label: 'Conseils antibiotique',
    prompt:
      'Quels conseils donner à un patient qui débute un traitement antibiotique ? (prise, durée, effets secondaires)',
    category: 'conseils',
  },
  {
    id: 'con-2',
    label: 'Gestion de la douleur',
    prompt:
      'Quels conseils officinaux pour la gestion de la douleur chronique sans ordonnance ? Quelles alternatives au paracétamol ?',
    category: 'conseils',
  },
  // Pathologies
  {
    id: 'pat-1',
    label: 'Diabète type 2',
    prompt:
      "Quels sont les points clés du suivi officinal d'un patient diabétique de type 2 ? Quels signes d'alerte surveiller ?",
    category: 'pathologies',
  },
  {
    id: 'pat-2',
    label: 'Hypertension',
    prompt:
      "Quels conseils hygiénodiététiques pour un patient hypertendu ? Comment expliquer l'importance de l'observance ?",
    category: 'pathologies',
  },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Retourne les prompts filtrés par catégorie
 */
export function getPromptsByCategory(category: QuickPromptCategory): QuickPrompt[] {
  return QUICK_PROMPTS.filter((p) => p.category === category)
}

/**
 * Retourne un nombre limité de prompts avec un mix équilibré de chaque catégorie
 */
export function getTopPrompts(count: number = 6): QuickPrompt[] {
  const categories = Object.keys(QUICK_PROMPT_CATEGORIES) as QuickPromptCategory[]
  const result: QuickPrompt[] = []

  // Distribue équitablement les prompts de chaque catégorie
  for (let i = 0; result.length < count; i++) {
    for (const cat of categories) {
      const catPrompts = getPromptsByCategory(cat)
      if (catPrompts[i]) {
        result.push(catPrompts[i])
        if (result.length >= count) break
      }
    }
  }

  return result
}
