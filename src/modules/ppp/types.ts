// ============================================================================
// TYPES - Plan Personnalisé de Prévention
// ============================================================================

export type AgeRange = '18-25' | '45-50' | '60-65' | '70-75'

export interface PPPTheme {
  primaryColor: string
  accentColor: string
  backgroundColor: string
}

export interface PPPData {
  // Métadonnées
  id?: string
  patientName: string
  pharmacistName: string
  pharmacyName: string
  date: string
  ageRange: AgeRange

  // Données d'entrée
  imageBase64?: string
  notes: string

  // Données générées par l'IA
  insights?: string[]  // Synthèse clinique (non affichée au patient)
  priorities: string[] // Mes priorités en santé
  freins: string[]     // Freins rencontrés
  conseils: string[]   // Conseils, modalités pratiques
  ressources: string[] // Ressources et intervenants
  suivi: string[]      // Modalités de suivi

  // Opposition médecin
  opposeMedecin: boolean

  // Métadonnées de stockage
  createdAt?: Date
  updatedAt?: Date
  storageType?: 'cloud' | 'local'
}

export interface PPPGenerationRequest {
  imageBase64?: string
  notes: string
  ageRange: AgeRange
}

export interface PPPGenerationResponse {
  insights: string[]
  priorities: string[]
  freins: string[]
  conseils: string[]
  ressources: string[]
  suivi: string[]
}
