/**
 * ProductFactory - Helpers pour créer des produits pharmaceutiques rapidement
 * Simplifie l'ajout en ne demandant que les champs essentiels
 */

import { ProductData, ProductIngestionInput } from './types'
import { RAGAdmin } from './RAGAdmin'

// Template de base avec valeurs par défaut
const DEFAULT_PRODUCT_DATA: Partial<ProductData> = {
  schema_version: '1.0',
  safety: {
    contraindications_absolute: [],
    contraindications_relative: [],
    drug_interactions: [],
    pregnancy_breastfeeding: { pregnancy: 'non renseigné', breastfeeding: 'non renseigné' },
    adverse_effects_common: [],
  },
  officinal_practice: {
    key_counter_questions: [],
    deliverable_counsel: [],
    red_flags: [],
    referral_criteria: [],
  },
  rag_metadata: {
    semantic_tags: [],
    common_patient_queries: [],
    priority_score: 0.5,
  },
}

/**
 * Interface simplifiée pour créer un produit
 */
export interface QuickProductInput {
  // === OBLIGATOIRES ===
  code: string // ex: 'doliprane_500mg'
  nom: string // ex: 'DOLIPRANE 500 mg'
  dci: string // ex: 'paracétamol'

  // === OPTIONNELS (mais recommandés) ===
  laboratoire?: string
  forme?: string // ex: 'comprimé', 'gélule', 'sirop'
  dosage?: string // ex: '500 mg'
  categorie?: string // ex: 'Antalgique', 'AINS', 'Antispasmodique'

  // === INDICATIONS & POSOLOGIE ===
  indications?: string[] // ex: ['douleur', 'fièvre']
  posologieAdulte?: string
  posologieEnfant?: string
  doseMaxJour?: string
  dureeMaxJours?: number

  // === SÉCURITÉ ===
  contreIndicationsAbsolues?: string[]
  contreIndicationsRelatives?: string[]
  effetsIndesirables?: string[]
  interactionsMedicamenteuses?: string[]
  grossesse?: string
  allaitement?: string

  // === PRATIQUE OFFICINALE ===
  questionsComptoir?: string[]
  conseilsDelivrance?: string[]
  signesdAlerte?: string[]

  // === METADATA RAG ===
  tags?: string[] // ex: ['douleur', 'antalgique', 'fièvre', 'céphalée']
  requetesPatients?: string[] // ex: ['mal de tête', 'fièvre enfant']
  priorite?: number // 0-1, pour le scoring RAG
}

/**
 * Crée un ProductData complet à partir d'une entrée simplifiée
 */
function buildProductData(input: QuickProductInput): ProductData {
  return {
    schema_version: '1.0',

    product_identity: {
      commercial_name: input.nom,
      active_substances: [input.dci],
      laboratory: input.laboratoire,
      pharmaceutical_forms: input.forme ? [input.forme] : [],
      dosages: input.dosage ? [input.dosage] : [],
    },

    officinal_classification: {
      prescription_status: 'PMF',
      therapeutic_family: input.categorie,
    },

    clinical: {
      indications: input.indications || [],
      mechanism_of_action: undefined,
    },

    posology: {
      adult: input.posologieAdulte || 'Se référer à la notice',
      child: input.posologieEnfant,
      max_daily_dose: input.doseMaxJour,
      duration_limit_days: input.dureeMaxJours,
    },

    safety: {
      contraindications_absolute: input.contreIndicationsAbsolues || [],
      contraindications_relative: input.contreIndicationsRelatives || [],
      drug_interactions: input.interactionsMedicamenteuses || [],
      pregnancy_breastfeeding: {
        pregnancy: input.grossesse || 'non renseigné',
        breastfeeding: input.allaitement || 'non renseigné',
      },
      adverse_effects_common: input.effetsIndesirables || [],
    },

    officinal_practice: {
      key_counter_questions: input.questionsComptoir || [],
      deliverable_counsel: input.conseilsDelivrance || [],
      red_flags: input.signesdAlerte || [],
      referral_criteria: [],
    },

    rag_metadata: {
      semantic_tags: input.tags || [],
      common_patient_queries: input.requetesPatients || [],
      priority_score: input.priorite ?? 0.5,
    },
  }
}

/**
 * ProductFactory - API simplifiée pour gérer les produits
 */
export const ProductFactory = {
  /**
   * Ajoute un produit rapidement avec seulement les champs essentiels
   *
   * @example
   * await ProductFactory.quick({
   *   code: 'efferalgan_1g',
   *   nom: 'EFFERALGAN 1g',
   *   dci: 'paracétamol',
   *   categorie: 'Antalgique',
   *   indications: ['douleur légère à modérée', 'fièvre'],
   *   posologieAdulte: '1 comprimé effervescent, max 3/jour',
   *   tags: ['douleur', 'fièvre', 'paracétamol', 'effervescent'],
   * })
   */
  async quick(input: QuickProductInput): Promise<string> {
    const productData = buildProductData(input)

    return RAGAdmin.addProduct({
      productCode: input.code,
      productName: input.nom,
      dci: input.dci,
      category: input.categorie,
      productData,
    })
  },

  /**
   * Ajoute plusieurs produits rapidement
   *
   * @example
   * await ProductFactory.quickBatch([
   *   { code: 'prod1', nom: 'Produit 1', dci: 'molecule1', ... },
   *   { code: 'prod2', nom: 'Produit 2', dci: 'molecule2', ... },
   * ])
   */
  async quickBatch(
    inputs: QuickProductInput[]
  ): Promise<{ success: number; failed: number }> {
    const products: ProductIngestionInput[] = inputs.map((input) => ({
      productCode: input.code,
      productName: input.nom,
      dci: input.dci,
      category: input.categorie,
      productData: buildProductData(input),
    }))

    return RAGAdmin.addProducts(products)
  },

  /**
   * Crée un produit minimal (juste code, nom, dci)
   * Utile pour des tests rapides
   *
   * @example
   * await ProductFactory.minimal('test_123', 'Produit Test', 'molecule_test')
   */
  async minimal(code: string, nom: string, dci: string): Promise<string> {
    return this.quick({ code, nom, dci })
  },

  /**
   * Import depuis un fichier JSON
   * Le fichier doit contenir un tableau de QuickProductInput
   *
   * @example
   * // Dans la console navigateur :
   * const json = await fetch('/data/products.json').then(r => r.json())
   * await ProductFactory.fromJSON(json)
   */
  async fromJSON(
    products: QuickProductInput[]
  ): Promise<{ success: number; failed: number }> {
    console.log(`[ProductFactory] Import de ${products.length} produits depuis JSON...`)
    return this.quickBatch(products)
  },

  /**
   * Génère le template JSON pour un nouveau produit
   * Utile pour préparer des fichiers d'import
   */
  getTemplate(): QuickProductInput {
    return {
      code: 'mon_produit_dosage',
      nom: 'MON PRODUIT dosage',
      dci: 'molecule',
      laboratoire: 'Laboratoire',
      forme: 'comprimé',
      dosage: '500 mg',
      categorie: 'Catégorie thérapeutique',
      indications: ['indication 1', 'indication 2'],
      posologieAdulte: 'Posologie adulte',
      posologieEnfant: 'Posologie enfant',
      doseMaxJour: 'Dose max par jour',
      dureeMaxJours: 5,
      contreIndicationsAbsolues: ['CI absolue 1'],
      contreIndicationsRelatives: ['CI relative 1'],
      effetsIndesirables: ['Effet 1', 'Effet 2'],
      interactionsMedicamenteuses: ['Interaction 1'],
      grossesse: 'Avis grossesse',
      allaitement: 'Avis allaitement',
      questionsComptoir: ['Question 1 ?', 'Question 2 ?'],
      conseilsDelivrance: ['Conseil 1', 'Conseil 2'],
      signesdAlerte: ['Red flag 1'],
      tags: ['tag1', 'tag2', 'tag3'],
      requetesPatients: ['recherche patient 1', 'recherche patient 2'],
      priorite: 0.5,
    }
  },
}
