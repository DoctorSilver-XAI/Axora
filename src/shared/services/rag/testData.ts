/**
 * Données de test pour le système RAG
 * Ces produits servent à valider le fonctionnement du RAG avant import réel
 */

import { ProductData } from './types'

/**
 * Doliprane 500mg - Exemple complet basé sur ton schéma
 */
export const DOLIPRANE_500: ProductData = {
  product_identity: {
    product_id: 'doliprane_500mg_comprime_opella_fr',
    commercial_name: 'DOLIPRANE 500 mg, comprimé',
    active_substances: ['paracétamol'],
    dosage_strength: '500 mg',
    pharmaceutical_forms: ['comprimé'],
    laboratory: 'OPELLA HEALTHCARE FRANCE SAS (ex-Sanofi)',
  },
  fr_referencing: {
    amm_status: 'AMM',
    otc_status: 'OTC',
    cip_codes: ['3400938829402', '3400932320240', '3400932181650', '3400932320189', '3400955473350'],
    reimbursement_status: 'NR',
    ansm_category: 'médicament',
  },
  officinal_classification: {
    therapeutic_family: 'Antalgique / antipyrétique',
    sub_family: 'Anilides (ATC N02BE01)',
    main_symptoms: ['douleur', 'fièvre', 'état grippal', 'céphalées', 'douleurs dentaires'],
    seasonality: 'annuel',
  },
  pharmacodynamics: {
    mechanism_of_action: "Mécanisme d'action central et périphérique (antalgique et antipyrétique).",
    therapeutic_target: 'Contrôle de la douleur légère à modérée et de la fièvre.',
    expected_clinical_effects: ['diminution douleur', 'baisse fièvre'],
  },
  pharmacokinetics: {
    absorption: {
      route: 'orale',
      conditions_optimales: 'absorption orale complète et rapide',
      bioavailability_percent: null,
    },
    distribution: {
      protein_binding_percent: 'faible',
    },
    metabolism: {
      organs: ['foie'],
      enzymes: ['CYP450 (voie mineure)'],
    },
    elimination: {
      route: ['rénale (urinaire)'],
      half_life_hours: 2,
    },
    tmax_minutes: 30,
    cmax: null,
    therapeutic_window: 'large (prudence sur surdosage)',
    time_to_first_effect_minutes: 30,
  },
  interactions: {
    major_interactions: [
      {
        substance: 'alcool (usage chronique / excès)',
        risk: "augmentation du risque hépatotoxique en cas de surdosage ou terrain à risque",
        severity: 'élevée',
      },
    ],
    frequent_officinal_interactions: [
      'cumul involontaire via associations (rhume/états grippaux) contenant déjà du paracétamol',
    ],
  },
  safety: {
    contraindications: [
      {
        condition: 'hypersensibilité au paracétamol ou à un excipient',
        severity: 'absolue',
      },
      {
        condition: 'insuffisance hépatocellulaire sévère (terrain à haut risque)',
        severity: 'majeure',
      },
    ],
    adverse_effects: {
      frequent: [],
      rare: [
        "réactions d'hypersensibilité",
        'atteintes hématologiques ou cutanées sévères (très rares)',
      ],
    },
    special_populations: {
      pregnancy: 'autorisé (usage aux doses efficaces minimales, durée la plus courte)',
      breastfeeding: 'autorisé',
      elderly: 'prudence (comorbidités, polymédication)',
      renal_impairment: 'prudence (élimination retardée si insuffisance rénale)',
    },
  },
  posology: {
    adult: '1 à 2 comprimés par prise (500 à 1000 mg), à renouveler si besoin en respectant un intervalle minimal de 4 à 6 h selon schémas usuels',
    child: 'adapté au poids; préférer formes pédiatriques si < 27 kg',
    max_daily_dose: '3000 mg/j (référence prudente officinale; 4000 mg/j sur avis médical selon contexte)',
    duration_limit_days: 3,
  },
  officinal_practice: {
    key_counter_questions: [
      'Depuis quand (fièvre/douleur) ? (seuil: > 48–72 h)',
      "Poids de l'enfant (kg) si pédiatrie ?",
      'Avez-vous déjà pris un produit rhume/état grippal aujourd\'hui ?',
      "Consommation d'alcool, maladie du foie, dénutrition ?",
    ],
    deliverable_counsel: [
      "Vérifier le cumul de paracétamol sur 24 h (objectif: éviter double prise).",
      'Espacer les prises, viser la dose minimale efficace.',
      "Stopper et consulter si aggravation ou absence d'amélioration.",
    ],
    red_flags: [
      'fièvre > 3 jours',
      'douleur > 5 jours',
      "dyspnée, altération de l'état général, signes neurologiques",
      'suspicion de surdosage (prises multiples, confusion, alcool)',
    ],
    referral_recommendation:
      'médecin si fièvre persistante > 72 h, douleur inhabituelle, terrain fragile (hépatopathie, dénutrition, insuffisance rénale)',
  },
  associated_sales: {
    conditional_cross_selling: [
      {
        if_conditions: ['fièvre', 'suivi à domicile'],
        suggested_products: [
          'thermomètre',
          'solution de réhydratation orale si risque de déshydratation',
        ],
        rationale: "objectiver l'évolution et prévenir la déshydratation",
      },
      {
        if_conditions: ['douleur ORL/état grippal', 'congestion nasale'],
        suggested_products: [
          'lavage nasal (sérum physiologique ou eau de mer)',
          'mouchoirs doux',
        ],
        rationale: 'réduction des symptômes associés sans majorer le risque iatrogène',
      },
    ],
    preventive_addons: [
      'hydratation',
      'repos',
      "éducation au repérage des associations contenant du paracétamol",
    ],
  },
  rag_metadata: {
    semantic_tags: ['paracétamol', 'fièvre', 'douleur', 'antalgique', 'OTC France'],
    clinical_contexts: ['état grippal', 'céphalées', 'douleurs dentaires', 'courbatures'],
    embedding_priority: 'high',
    confidence_level: 'élevé',
  },
}

/**
 * Nurofen 400mg - Anti-inflammatoire
 */
export const NUROFEN_400: ProductData = {
  product_identity: {
    product_id: 'nurofen_400mg_comprime_reckitt_fr',
    commercial_name: 'NUROFEN 400 mg, comprimé enrobé',
    active_substances: ['ibuprofène'],
    dosage_strength: '400 mg',
    pharmaceutical_forms: ['comprimé enrobé'],
    laboratory: 'RECKITT BENCKISER HEALTHCARE FRANCE',
  },
  fr_referencing: {
    amm_status: 'AMM',
    otc_status: 'OTC',
    cip_codes: ['3400935429667', '3400935429728'],
    reimbursement_status: 'NR',
    ansm_category: 'médicament',
  },
  officinal_classification: {
    therapeutic_family: 'Anti-inflammatoire non stéroïdien (AINS)',
    sub_family: 'Dérivés de l\'acide propionique (ATC M01AE01)',
    main_symptoms: ['douleur', 'fièvre', 'inflammation', 'règles douloureuses', 'maux de tête'],
    seasonality: 'annuel',
  },
  pharmacodynamics: {
    mechanism_of_action: 'Inhibition de la cyclo-oxygénase (COX-1 et COX-2), réduisant la synthèse des prostaglandines.',
    therapeutic_target: 'Réduction de la douleur, de la fièvre et de l\'inflammation.',
    expected_clinical_effects: ['diminution douleur', 'baisse fièvre', 'effet anti-inflammatoire'],
  },
  pharmacokinetics: {
    absorption: {
      route: 'orale',
      conditions_optimales: 'absorption rapide, pic plasmatique en 1-2h',
      bioavailability_percent: 80,
    },
    distribution: {
      protein_binding_percent: 99,
    },
    metabolism: {
      organs: ['foie'],
      enzymes: ['CYP2C9'],
    },
    elimination: {
      route: ['rénale (urinaire)'],
      half_life_hours: 2,
    },
    tmax_minutes: 90,
    cmax: null,
    therapeutic_window: 'étroite (risque digestif et rénal)',
    time_to_first_effect_minutes: 30,
  },
  interactions: {
    major_interactions: [
      {
        substance: 'anticoagulants oraux (AVK, AOD)',
        risk: 'augmentation du risque hémorragique',
        severity: 'élevée',
      },
      {
        substance: 'lithium',
        risk: 'augmentation de la lithiémie',
        severity: 'élevée',
      },
      {
        substance: 'méthotrexate (doses > 20 mg/sem)',
        risk: 'toxicité hématologique',
        severity: 'élevée',
      },
    ],
    frequent_officinal_interactions: [
      'association avec autres AINS (aspirine incluse)',
      'corticoïdes',
      'IEC/ARA2 (risque rénal)',
    ],
  },
  safety: {
    contraindications: [
      {
        condition: 'ulcère gastroduodénal évolutif',
        severity: 'absolue',
      },
      {
        condition: 'insuffisance cardiaque sévère',
        severity: 'absolue',
      },
      {
        condition: 'insuffisance rénale sévère',
        severity: 'absolue',
      },
      {
        condition: 'grossesse (3ème trimestre)',
        severity: 'absolue',
      },
      {
        condition: 'antécédent d\'allergie aux AINS ou aspirine',
        severity: 'absolue',
      },
    ],
    adverse_effects: {
      frequent: ['troubles digestifs', 'nausées', 'douleurs abdominales'],
      rare: ['ulcère gastrique', 'insuffisance rénale aiguë', 'réactions cutanées graves'],
    },
    special_populations: {
      pregnancy: 'CONTRE-INDIQUÉ au 3ème trimestre. Éviter aux 1er et 2ème trimestres.',
      breastfeeding: 'usage ponctuel possible',
      elderly: 'risque accru d\'effets indésirables digestifs et rénaux',
      renal_impairment: 'contre-indiqué si sévère, prudence si modérée',
    },
  },
  posology: {
    adult: '1 comprimé (400 mg) 3 fois/jour maximum, de préférence au cours des repas',
    child: 'réservé à l\'adulte et adolescent > 12 ans (> 40 kg)',
    max_daily_dose: '1200 mg/j en automédication',
    duration_limit_days: 3,
  },
  officinal_practice: {
    key_counter_questions: [
      'Avez-vous des antécédents d\'ulcère ou de problèmes d\'estomac ?',
      'Prenez-vous des anticoagulants ou de l\'aspirine ?',
      'Êtes-vous enceinte ou allaitante ?',
      'Avez-vous des problèmes de reins ou de cœur ?',
    ],
    deliverable_counsel: [
      'Prendre au cours d\'un repas pour limiter les effets digestifs.',
      'Ne pas associer avec d\'autres AINS ni aspirine.',
      'Durée maximale 3 jours sans avis médical.',
      'Consulter si douleurs abdominales ou selles noires.',
    ],
    red_flags: [
      'douleurs abdominales intenses',
      'selles noires ou vomissements sanglants',
      'gonflement des jambes ou prise de poids rapide',
      'éruption cutanée ou difficultés respiratoires',
    ],
    referral_recommendation:
      'médecin si symptômes > 3 jours, signes digestifs, terrain à risque cardiovasculaire ou rénal',
  },
  associated_sales: {
    conditional_cross_selling: [
      {
        if_conditions: ['douleurs articulaires', 'inflammation locale'],
        suggested_products: ['gel anti-inflammatoire local', 'poche de froid'],
        rationale: 'action locale complémentaire',
      },
    ],
    preventive_addons: [
      'protection gastrique si usage répété',
      'hydratation suffisante',
    ],
  },
  rag_metadata: {
    semantic_tags: ['ibuprofène', 'AINS', 'anti-inflammatoire', 'douleur', 'fièvre'],
    clinical_contexts: ['dysménorrhée', 'céphalées', 'douleurs musculaires', 'inflammation'],
    embedding_priority: 'high',
    confidence_level: 'élevé',
  },
}

/**
 * Spasfon Lyoc - Antispasmodique
 */
export const SPASFON_LYOC: ProductData = {
  product_identity: {
    product_id: 'spasfon_lyoc_160mg_teva_fr',
    commercial_name: 'SPASFON LYOC 160 mg, lyophilisat oral',
    active_substances: ['phloroglucinol'],
    dosage_strength: '160 mg',
    pharmaceutical_forms: ['lyophilisat oral'],
    laboratory: 'TEVA SANTÉ',
  },
  fr_referencing: {
    amm_status: 'AMM',
    otc_status: 'OTC',
    cip_codes: ['3400936908543'],
    reimbursement_status: 'NR',
    ansm_category: 'médicament',
  },
  officinal_classification: {
    therapeutic_family: 'Antispasmodique',
    sub_family: 'Antispasmodiques musculotropes (ATC A03AX12)',
    main_symptoms: ['spasmes digestifs', 'douleurs abdominales', 'coliques', 'règles douloureuses'],
    seasonality: 'annuel',
  },
  pharmacodynamics: {
    mechanism_of_action: 'Action antispasmodique musculotrope directe sur les fibres musculaires lisses.',
    therapeutic_target: 'Soulagement des spasmes des voies digestives, biliaires et urogénitales.',
    expected_clinical_effects: ['diminution des spasmes', 'soulagement des douleurs abdominales'],
  },
  pharmacokinetics: {
    absorption: {
      route: 'sublinguale',
      conditions_optimales: 'dissolution sous la langue, action rapide',
      bioavailability_percent: null,
    },
    distribution: {
      protein_binding_percent: 'faible',
    },
    metabolism: {
      organs: ['foie'],
      enzymes: [],
    },
    elimination: {
      route: ['rénale'],
      half_life_hours: 1.5,
    },
    tmax_minutes: 15,
    cmax: null,
    therapeutic_window: 'large',
    time_to_first_effect_minutes: 15,
  },
  interactions: {
    major_interactions: [],
    frequent_officinal_interactions: [],
  },
  safety: {
    contraindications: [
      {
        condition: 'hypersensibilité au phloroglucinol',
        severity: 'absolue',
      },
    ],
    adverse_effects: {
      frequent: [],
      rare: ['réactions allergiques cutanées'],
    },
    special_populations: {
      pregnancy: 'utilisable si nécessaire',
      breastfeeding: 'utilisable si nécessaire',
      elderly: 'pas de précaution particulière',
      renal_impairment: 'pas d\'adaptation nécessaire',
    },
  },
  posology: {
    adult: '2 lyophilisats par prise, jusqu\'à 6 par jour',
    child: 'formes pédiatriques disponibles',
    max_daily_dose: '6 lyophilisats/jour',
    duration_limit_days: 5,
  },
  officinal_practice: {
    key_counter_questions: [
      'Localisation exacte de la douleur ?',
      'Depuis combien de temps ?',
      'Fièvre associée ?',
      'Troubles du transit (diarrhée, constipation) ?',
    ],
    deliverable_counsel: [
      'Laisser fondre sous la langue sans croquer.',
      'Action rapide en 15-20 minutes.',
      'Consulter si douleur intense ou persistante > 48h.',
    ],
    red_flags: [
      'douleur abdominale brutale et intense',
      'fièvre associée',
      'vomissements répétés',
      'arrêt des gaz et des selles',
    ],
    referral_recommendation:
      'médecin en urgence si tableau occlusif, fièvre, ou douleur aiguë non soulagée',
  },
  associated_sales: {
    conditional_cross_selling: [
      {
        if_conditions: ['troubles digestifs', 'ballonnements'],
        suggested_products: ['charbon végétal', 'probiotiques'],
        rationale: 'confort digestif complémentaire',
      },
    ],
    preventive_addons: ['conseils alimentaires', 'gestion du stress'],
  },
  rag_metadata: {
    semantic_tags: ['phloroglucinol', 'antispasmodique', 'douleurs abdominales', 'coliques'],
    clinical_contexts: ['spasmes digestifs', 'dysménorrhée', 'coliques néphrétiques'],
    embedding_priority: 'medium',
    confidence_level: 'élevé',
  },
}

/**
 * Liste des produits de test à ingérer
 */
export const TEST_PRODUCTS = [
  {
    productCode: 'doliprane_500mg',
    productName: 'DOLIPRANE 500 mg, comprimé',
    dci: 'paracétamol',
    category: 'Antalgique / antipyrétique',
    productData: DOLIPRANE_500,
  },
  {
    productCode: 'nurofen_400mg',
    productName: 'NUROFEN 400 mg, comprimé enrobé',
    dci: 'ibuprofène',
    category: 'Anti-inflammatoire',
    productData: NUROFEN_400,
  },
  {
    productCode: 'spasfon_lyoc_160mg',
    productName: 'SPASFON LYOC 160 mg, lyophilisat oral',
    dci: 'phloroglucinol',
    category: 'Antispasmodique',
    productData: SPASFON_LYOC,
  },
]
