/**
 * PhiGenix Branding Constants
 *
 * IMPORTANT: Ces constantes sont uniquement pour l'affichage UI.
 * Le code technique continue d'utiliser les vrais noms de modèles (mistral-small, gpt-4o, etc.)
 *
 * Architecture:
 * - PROVIDER_LABELS : Noms de marque pour les providers (Mistral → PhiGenix Rx)
 * - MODEL_LABELS : Noms de tier pour les modèles (mistral-small-latest → Lite)
 * - getModelDisplayName() : Fonction helper pour l'affichage combiné
 */

import type { AIProvider } from '../types'

// =============================================================================
// PROVIDER BRANDING
// =============================================================================

/**
 * Labels de marque pour les providers AI
 * Utilisé dans l'UI pour afficher le nom commercial au lieu du nom technique
 */
export const PROVIDER_LABELS: Record<AIProvider, string> = {
  mistral: 'PhiGenix Rx',
  openai: 'PhiGenix Max',
  local: 'PhiGenix Secure',
}

/**
 * Descriptions des providers pour les tooltips et settings
 */
export const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  mistral: 'Recommandé pour Axora - Équilibre performance/coût',
  openai: 'Performance maximale - Modèles les plus avancés',
  local: 'Confidentialité totale - Aucune donnée transmise',
}

// =============================================================================
// MODEL BRANDING
// =============================================================================

/**
 * Labels de tier pour les modèles individuels
 * Clé = nom technique du modèle (utilisé dans le code)
 * Valeur = nom de tier PhiGenix (affiché dans l'UI)
 */
export const MODEL_LABELS: Record<string, string> = {
  // Mistral models
  'mistral-small-latest': 'Lite',
  'mistral-medium-latest': 'Standard',
  'mistral-large-latest': 'Pro',
  'codestral-latest': 'Code',

  // OpenAI models
  'gpt-3.5-turbo': 'Lite',
  'gpt-4o-mini': 'Standard',
  'gpt-4-turbo': 'Turbo',
  'gpt-4o': 'Omni',

  // Local models (gardent leur nom car ce sont des projets open-source distincts)
  llama3: 'Llama 3',
  mistral: 'Mistral',
  codellama: 'CodeLlama',
  phi3: 'Phi-3',
}

/**
 * Descriptions techniques des modèles pour les tooltips
 */
export const MODEL_DESCRIPTIONS: Record<string, string> = {
  // Mistral
  'mistral-small-latest': 'Rapide et économique, idéal pour les tâches courantes',
  'mistral-medium-latest': 'Équilibre entre performance et coût',
  'mistral-large-latest': 'Maximum de capacités, raisonnement avancé',
  'codestral-latest': 'Optimisé pour la génération de code',

  // OpenAI
  'gpt-3.5-turbo': 'Rapide et économique',
  'gpt-4o-mini': 'Compact mais performant',
  'gpt-4-turbo': 'Haute performance, contexte étendu',
  'gpt-4o': 'Modèle omnimodal le plus avancé',

  // Local
  llama3: 'Meta Llama 3 - Usage général',
  mistral: 'Mistral 7B - Léger et rapide',
  codellama: 'Spécialisé pour le code',
  phi3: 'Microsoft Phi-3 - Compact et efficace',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Retourne le nom d'affichage complet pour un modèle
 * Exemple: getModelDisplayName('mistral', 'mistral-small-latest') → "PhiGenix Rx Lite"
 *
 * @param provider - Le provider AI technique (mistral, openai, local)
 * @param model - Le nom technique du modèle
 * @returns Le nom d'affichage formaté pour l'UI
 */
export function getModelDisplayName(provider: AIProvider, model: string): string {
  const providerLabel = PROVIDER_LABELS[provider]
  const modelLabel = MODEL_LABELS[model]

  if (modelLabel) {
    return `${providerLabel} ${modelLabel}`
  }

  // Fallback: utilise le nom technique du modèle si pas de mapping
  return `${providerLabel} (${model})`
}

/**
 * Retourne uniquement le label du tier pour un modèle
 * Exemple: getModelTierLabel('mistral-small-latest') → "Lite"
 *
 * @param model - Le nom technique du modèle
 * @returns Le nom de tier ou le nom technique si pas de mapping
 */
export function getModelTierLabel(model: string): string {
  return MODEL_LABELS[model] || model
}

/**
 * Retourne le nom technique du modèle (pour les tooltips de transparence)
 * Exemple: getTechnicalModelName('mistral-small-latest') → "mistral-small-latest"
 *
 * @param model - Le nom technique du modèle
 * @returns Le même nom (identité, pour clarté sémantique)
 */
export function getTechnicalModelName(model: string): string {
  return model
}

/**
 * Formate un tooltip informatif avec le nom technique
 * Exemple: getModelTooltip('mistral', 'mistral-small-latest')
 * → "PhiGenix Rx Lite\nAPI: mistral-small-latest\nRapide et économique..."
 */
export function getModelTooltip(provider: AIProvider, model: string): string {
  const displayName = getModelDisplayName(provider, model)
  const description = MODEL_DESCRIPTIONS[model] || ''

  return `${displayName}\nAPI: ${model}${description ? `\n${description}` : ''}`
}
