/**
 * Types pour le système multi-agent PhiBRAIN
 * Inspiré du workflow n8n PhiGenix
 */

import type { PhiBrainResult } from '../services/OCRService'

// =============================================================================
// Agent Status & Base Types
// =============================================================================

export type AgentName = 'PhiMEDS' | 'PhiADVICES' | 'PhiCROSS_SELL' | 'PhiCHIPS'
export type AgentStatus = 'idle' | 'pending' | 'running' | 'success' | 'error'

export interface PhiAgentResult<T = unknown> {
  agent: AgentName
  status: AgentStatus
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  input: Record<string, unknown>
  output: T | null
  error?: string
}

// =============================================================================
// Agent Output Types
// =============================================================================

/**
 * PhiMEDS - Traitement des médicaments
 * Retourne DCI + recommandations pharmaceutiques par médicament
 */
export interface PhiMedsOutput {
  meds: Array<{
    dci: string | null
    recommendation: string | null
  }>
}

/**
 * PhiADVICES - Conseils patients
 * Retourne une phrase orale + points écrits
 */
export interface PhiAdvicesOutput {
  advices: {
    oral_sentence: string
    written_points: string[]
  }
}

/**
 * PhiCROSS_SELL - Suggestions cross-selling
 * Retourne 5 produits complémentaires avec justification
 */
export interface PhiCrossSellOutput {
  cross_selling: Array<{
    name: string
    reason: string
  }>
}

/**
 * PhiCHIPS - Micro-rappels
 * Retourne 2-4 chips/badges pour rappels rapides
 */
export interface PhiChipsOutput {
  chips: string[]
}

// =============================================================================
// Enriched Result (avec résultats agents)
// =============================================================================

export interface AgentsResults {
  phiMeds: PhiAgentResult<PhiMedsOutput> | null
  phiAdvices: PhiAgentResult<PhiAdvicesOutput> | null
  phiCrossSell: PhiAgentResult<PhiCrossSellOutput> | null
  phiChips: PhiAgentResult<PhiChipsOutput> | null
}

export type PhiBrainEnrichedResult = PhiBrainResult & {
  agents?: Partial<AgentsResults>
}

// =============================================================================
// Agent Definitions (pour l'UI)
// =============================================================================

export interface AgentDefinition {
  id: AgentName
  name: string
  description: string
  color: string
  bgColor: string
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'PhiMEDS',
    name: 'PhiMEDS',
    description: 'DCI + Recommandations',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'PhiADVICES',
    name: 'PhiADVICES',
    description: 'Conseils patients',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'PhiCROSS_SELL',
    name: 'PhiCROSS_SELL',
    description: 'Cross-selling',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'PhiCHIPS',
    name: 'PhiCHIPS',
    description: 'Micro-rappels',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
]
