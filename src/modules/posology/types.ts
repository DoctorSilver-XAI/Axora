/**
 * Types pour le module de calcul de posologie intelligent
 */

import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'

// ============================================
// PATIENT
// ============================================

export type AgeUnit = 'years' | 'months' | 'days'

export interface PatientData {
  weightKg: number
  age: number
  ageUnit: AgeUnit
  isPediatric: boolean
}

// ============================================
// RÈGLES DE POSOLOGIE
// ============================================

export interface DosageRule {
  dci: string
  mgPerKgPerDay: number
  maxDailyMg: number
  maxSingleDoseMg: number
  defaultFrequency: number
  minIntervalHours: number
  minAgeMonths?: number
  maxAgeYears?: number
  notes: string[]
}

// ============================================
// RÉSULTAT DU CALCUL
// ============================================

export interface PosologyCalculation {
  dailyDoseMg: number
  singleDoseMg: number
  frequency: number
  intervalHours: number
  isCapped: boolean
  capReason?: string
  warnings: string[]
  recommendation: string
}

export interface PosologyResult {
  drug: BDPMProduct
  patient: PatientData
  calculation: PosologyCalculation
  generiques: BDPMProduct[]
  hasRuptureRisk: boolean
  hasSecurityAlert: boolean
  calculatedAt: Date
}

// ============================================
// ÉTAT DU MODULE
// ============================================

export type SearchStatus = 'idle' | 'searching' | 'success' | 'error' | 'no-results'

export interface PosologyState {
  // Recherche
  searchQuery: string
  searchStatus: SearchStatus
  searchResults: BDPMProduct[]

  // Médicament sélectionné
  selectedDrug: BDPMProduct | null

  // Patient
  patient: PatientData

  // Résultat
  result: PosologyResult | null
  calculationError: string | null

  // Génériques
  generiques: BDPMProduct[]
  showGeneriques: boolean
  loadingGeneriques: boolean
}

// ============================================
// ACTIONS
// ============================================

export type PosologyAction =
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_STATUS'; payload: SearchStatus }
  | { type: 'SET_SEARCH_RESULTS'; payload: BDPMProduct[] }
  | { type: 'SELECT_DRUG'; payload: BDPMProduct }
  | { type: 'CLEAR_DRUG' }
  | { type: 'SET_PATIENT'; payload: Partial<PatientData> }
  | { type: 'SET_RESULT'; payload: PosologyResult }
  | { type: 'SET_CALCULATION_ERROR'; payload: string }
  | { type: 'SET_GENERIQUES'; payload: BDPMProduct[] }
  | { type: 'TOGGLE_GENERIQUES' }
  | { type: 'SET_LOADING_GENERIQUES'; payload: boolean }
  | { type: 'RESET' }
