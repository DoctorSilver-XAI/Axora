import { AgeRange } from '../types'

export interface PPPTemplate {
  priorities: string[]
  freins: string[]
  conseils: string[]
  ressources: string[]
  suivi: string[]
}

export const PPP_TEMPLATES: Record<AgeRange, PPPTemplate> = {
  '18-25': {
    priorities: [
      'Sommeil réparateur (7-8 h, horaires réguliers, hygiène numérique)',
      'Usage alcool festif et binge drinking : réduction structurée',
      'Activité physique cardio + renforcement (VO2 et posture)',
      'Couverture vaccinale complète (HPV, Covid, grippe)',
      'Nutrition PNNS : fibres, index glycémique, ultra-transformés à réduire',
      'Prévention psycho / stress examens : routines de récupération',
    ],
    freins: [
      'Horaires décalés (cours/travail de nuit), dette de sommeil',
      'Pression sociale sur alcool/expérimentations (cannabis, etc.)',
      'Budget restreint pour alimentation qualitative',
      'Sedentarité (écrans >6 h/j), peu d\'activité structurée',
    ],
    conseils: [
      '3 séances cardio 25-30 min + 2 renfo/sem (RPE 6-7/10)',
      'Batch cooking économique : légumineuses + céréales complètes + légumes surgelés',
      'Couvre-feu écrans 60 min avant sommeil, chambre sans notifications',
      'Alcool : eau entre verres, 2 verres max/soirée, jours sans',
    ],
    ressources: [
      'Pass sport/structures locales, applis cardio/renfo gratuites',
      'CSAPA ou ligne écoute alcool/tabac pour stratégies de réduction',
      'RDV vaccination via sante.fr/doctolib',
      'Pharmacie : hygiène du sommeil, sevrage tabac, vaccination',
    ],
    suivi: [
      'Point pharmacie/MT dans 1 mois : conso alcool, sommeil, programme sport',
      'Revue vaccination et poids/IMC dans 3 mois',
    ],
  },

  '45-50': {
    priorities: [
      'Risque cardio global : PA, LDL-c, IMC, tour de taille',
      'Tabac/alcool : stratégie de sevrage ou réduction cadrée',
      'Dépistage cancer colorectal (test immunologique)',
      'Activité physique 150-180 min/sem + renforcement 2x',
      'Sommeil/stress professionnel : hygiène et récupération',
      'Nutrition cardioprotectrice : réduction sucres rapides/AGS',
    ],
    freins: [
      'Temps contraint (travail/famille), repas pris à l\'extérieur',
      'Tabagisme ancien, crainte de prise de poids au sevrage',
      'Stress/sommeil écourté, chroniquement fragmenté',
      'Faible régularité sportive, douleurs initiales',
    ],
    conseils: [
      'Mesure TA, bilan lipidique, poids/TT tous les 3-6 mois',
      'Marche rapide 30 min/j + renfo 2x/sem (gainage, charges légères)',
      'Plan d\'arrêt tabac : substituts dosés, patch + forme orale, date cible',
      'Test immunologique colorectal à retirer/réaliser (50-74 ans)',
    ],
    ressources: [
      'Tabac info service / CSAPA pour accompagnement sevrage',
      'Programmes marche/renfo locaux, appli podomètre',
      'Médecin traitant : ordonnance test colorectal, bilans bio',
      'Pharmacie : éducation nutrition, sommeil, substituts nicotiniques',
    ],
    suivi: [
      'Point officine dans 1 mois : tabac/PA, tolérance substituts',
      'Revue dépistage colorectal et bilans lipides/glycémie sous 3 mois',
    ],
  },

  '60-65': {
    priorities: [
      'Equilibre cardio-metabolique (PA, LDL-c, HbA1c si risque)',
      'Vaccination grippe/Covid/pneumocoque',
      'Activité physique endurance + équilibre + renforcement doux',
      'Poids/stéatose : modèle méditerranéen, apport protéique adapté',
      'Sommeil et douleurs articulaires (arthrose, tendinopathies)',
      'Dépistage colorectal (si non réalisé)',
    ],
    freins: [
      'Douleurs articulaires limitant charge ou impact',
      'Oublis vaccins/rappels, hésitation pneumocoque',
      'Habitudes salées/sucrées, portions généreuses',
      'Sommeil fragmenté, lever nocturne',
    ],
    conseils: [
      'Marche rapide 30 min/j + exercice équilibre 10 min/j + renfo léger',
      'Régime méditerranéen : légumes, huile d\'olive, poissons gras 2x/sem',
      'Hydratation 1.5 L/j, sel <5 g/j, limiter sucres simples',
      'Plan vaccins : grippe, Covid, pneumocoque (selon schéma)',
    ],
    ressources: [
      'Maison sport-santé / marche nordique / APA locale',
      'Pharmacie : bilan médicamenteux, rappel vaccins',
      'Médecin traitant : ordonnances dépistage/bilans',
      'Mutuelle/mairie : ateliers équilibre, prévention chutes',
    ],
    suivi: [
      'Revue traitements/vaccins en officine dans 1 mois',
      'Contrôle TA/glycémie/lipides + dépistage colorectal sous 3 mois',
    ],
  },

  '70-75': {
    priorities: [
      'Prévention chutes : équilibre, vision, chaussures stables, environnement',
      'Revue traitements (polymédication, iatrogénie), observance',
      'Vaccins grippe/Covid/pneumocoque/zona',
      'Activité physique quotidienne douce + renforcement bas du corps',
      'Dépistage colorectal si non réalisé avant 74 ans',
      'Nutrition : protéines 1-1.2 g/kg/j, hydratation suffisante',
    ],
    freins: [
      'Arthrose/douleurs limitant marche, peur de chuter',
      'Oublis de prises médicamenteuses, organisation complexe',
      'Appétit réduit, hydratation insuffisante',
      'Isolement social, moral fluctuant',
    ],
    conseils: [
      'Marche 20-30 min/j + exercices équilibre/proprioception quotidiens',
      'Sécuriser domicile : tapis retirés, barres d\'appui, éclairage nuit',
      'Plan vaccinal complet : grippe, Covid, pneumocoque, zona',
      'Apport protéique fractionné (3 repas + collation protéique), hydratation 1-1.5 L',
    ],
    ressources: [
      'Pharmacie : bilan partagé de médication, rappel vaccins',
      'Médecin traitant : ordonnances vaccins, suivi douleurs/sommeil',
      'Kiné/APA : équilibre, renforcement, prévention chutes',
      'Opticien/audioprothésiste : réévaluation',
    ],
    suivi: [
      'Revue médication + vaccins en officine sous 1 mois',
      'Point équilibre/chutes et douleur avec médecin/kine sous 2-3 mois',
    ],
  },
}

export function getTemplate(ageRange: AgeRange): PPPTemplate {
  return PPP_TEMPLATES[ageRange]
}
