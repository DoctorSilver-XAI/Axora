/**
 * Types pour le système RAG pharmaceutique
 * Ces interfaces correspondent au schéma JSON standardisé des produits
 */

// ===========================================
// TYPES DE DONNÉES PRODUIT
// ===========================================

/**
 * Identité du produit pharmaceutique
 */
export interface ProductIdentity {
  product_id: string
  commercial_name: string
  active_substances: string[]
  dosage_strength: string
  pharmaceutical_forms: string[]
  laboratory: string
}

/**
 * Référencement France (AMM, CIP, etc.)
 */
export interface FrReferencing {
  amm_status: string
  otc_status: string
  cip_codes: string[]
  reimbursement_status: string
  ansm_category: string
}

/**
 * Classification officinale
 */
export interface OfficinalClassification {
  therapeutic_family: string
  sub_family: string
  main_symptoms: string[]
  seasonality: string
}

/**
 * Pharmacodynamique
 */
export interface Pharmacodynamics {
  mechanism_of_action: string
  therapeutic_target: string
  expected_clinical_effects: string[]
}

/**
 * Pharmacocinétique
 */
export interface Pharmacokinetics {
  absorption: {
    route: string
    conditions_optimales: string
    bioavailability_percent: number | null
  }
  distribution: {
    protein_binding_percent: string | number
  }
  metabolism: {
    organs: string[]
    enzymes: string[]
  }
  elimination: {
    route: string[]
    half_life_hours: number
  }
  tmax_minutes: number
  cmax: number | null
  therapeutic_window: string
  time_to_first_effect_minutes: number
}

/**
 * Interactions médicamenteuses
 */
export interface DrugInteraction {
  substance: string
  risk: string
  severity: string
}

export interface Interactions {
  major_interactions: DrugInteraction[]
  frequent_officinal_interactions: string[]
}

/**
 * Contre-indication
 */
export interface Contraindication {
  condition: string
  severity: string
}

/**
 * Sécurité et effets indésirables
 */
export interface Safety {
  contraindications: Contraindication[]
  adverse_effects: {
    frequent: string[]
    rare: string[]
  }
  special_populations: {
    pregnancy: string
    breastfeeding: string
    elderly: string
    renal_impairment: string
  }
}

/**
 * Posologie
 */
export interface Posology {
  adult: string
  child: string
  max_daily_dose: string
  duration_limit_days: number
}

/**
 * Pratique officinale (conseils au comptoir)
 */
export interface OfficinalPractice {
  key_counter_questions: string[]
  deliverable_counsel: string[]
  red_flags: string[]
  referral_recommendation: string
}

/**
 * Ventes associées conditionnelles
 */
export interface ConditionalCrossSelling {
  if_conditions: string[]
  suggested_products: string[]
  rationale: string
}

export interface AssociatedSales {
  conditional_cross_selling: ConditionalCrossSelling[]
  preventive_addons: string[]
}

/**
 * Métadonnées RAG
 */
export interface RAGMetadata {
  semantic_tags: string[]
  clinical_contexts: string[]
  embedding_priority: 'high' | 'medium' | 'low'
  confidence_level: string
}

/**
 * Structure complète des données produit (correspond au JSON standardisé)
 */
export interface ProductData {
  product_identity: ProductIdentity
  fr_referencing?: FrReferencing
  officinal_classification?: OfficinalClassification
  pharmacodynamics?: Pharmacodynamics
  pharmacokinetics?: Pharmacokinetics
  interactions?: Interactions
  safety?: Safety
  posology?: Posology
  officinal_practice?: OfficinalPractice
  associated_sales?: AssociatedSales
  rag_metadata?: RAGMetadata
}

// ===========================================
// TYPES DE RECHERCHE RAG
// ===========================================

/**
 * Produit pharmaceutique (version base de données)
 */
export interface PharmaceuticalProduct {
  id: string
  productCode: string
  productName: string
  dci: string | null
  laboratory: string | null
  atcCode: string | null
  dosageForm: string | null
  category: string | null
  tags: string[]
  productData: ProductData
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Résultat de recherche avec scores
 */
export interface SearchResult extends PharmaceuticalProduct {
  vectorScore: number   // Score de similarité vectorielle (0-1)
  textScore: number     // Score full-text (0+)
  combinedScore: number // Score pondéré final
}

/**
 * Contexte RAG à injecter dans le prompt
 */
export interface RAGContext {
  products: SearchResult[]
  query: string
  totalResults: number
}

/**
 * Options de recherche
 */
export interface SearchOptions {
  matchCount?: number         // Nombre de résultats (défaut: 5)
  vectorWeight?: number       // Poids vector (défaut: 0.7)
  textWeight?: number         // Poids full-text (défaut: 0.3)
  category?: string | null    // Filtre par catégorie
  similarityThreshold?: number // Seuil minimum (défaut: 0.3)
}

// ===========================================
// TYPES D'INGESTION
// ===========================================

/**
 * Input pour l'ingestion d'un produit
 */
export interface ProductIngestionInput {
  productCode: string
  productName: string
  dci?: string
  laboratory?: string
  atcCode?: string
  dosageForm?: string
  category?: string
  tags?: string[]
  productData: ProductData
}

/**
 * Résultat d'ingestion batch
 */
export interface BatchIngestionResult {
  success: number
  failed: number
  errors?: Array<{ productCode: string; error: string }>
}

// ===========================================
// TYPES EMBEDDING
// ===========================================

/**
 * Réponse de l'API OpenAI Embeddings
 */
export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}
