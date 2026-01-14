// ============================================================================
// THÉMATIQUES DE PRÉVENTION - Données de référence pour le bilan pharmaceutique
// Score de pertinence : 1 = peu concerné, 5 = très concerné
// ============================================================================

import { AgeRange } from '../types'

export interface Thematique {
  id: number
  label: string
  scores: Record<AgeRange, number>
  keywords?: string[] // Mots-clés pour faciliter la recherche
}

// Mapping des scores par tranche d'âge (source: référentiel bilan de prévention)
export const THEMATIQUES: Thematique[] = [
  { id: 1, label: 'Alimentation', scores: { '18-25': 4, '45-50': 4, '60-65': 5, '70-75': 5 }, keywords: ['nutrition', 'régime', 'poids'] },
  { id: 2, label: 'Activité physique et sédentarité', scores: { '18-25': 4, '45-50': 5, '60-65': 5, '70-75': 5 }, keywords: ['sport', 'marche', 'exercice'] },
  { id: 3, label: 'Tabac', scores: { '18-25': 4, '45-50': 4, '60-65': 3, '70-75': 2 }, keywords: ['cigarette', 'fumer', 'sevrage'] },
  { id: 4, label: 'Alcool', scores: { '18-25': 4, '45-50': 4, '60-65': 3, '70-75': 3 }, keywords: ['consommation', 'addiction'] },
  { id: 5, label: 'Autres addictions', scores: { '18-25': 4, '45-50': 3, '60-65': 2, '70-75': 1 }, keywords: ['cannabis', 'jeux', 'écrans'] },
  { id: 6, label: 'Bien-être mental', scores: { '18-25': 5, '45-50': 4, '60-65': 4, '70-75': 3 }, keywords: ['stress', 'anxiété', 'relaxation'] },
  { id: 7, label: 'Santé psychique', scores: { '18-25': 5, '45-50': 4, '60-65': 4, '70-75': 3 }, keywords: ['dépression', 'burnout', 'psychologie'] },
  { id: 8, label: 'Sommeil', scores: { '18-25': 4, '45-50': 4, '60-65': 4, '70-75': 4 }, keywords: ['insomnie', 'fatigue', 'repos'] },
  { id: 9, label: 'Prévention des cancers', scores: { '18-25': 2, '45-50': 5, '60-65': 5, '70-75': 5 }, keywords: ['dépistage', 'mammographie', 'coloscopie'] },
  { id: 10, label: 'Prévention cardiovasculaire', scores: { '18-25': 2, '45-50': 5, '60-65': 5, '70-75': 5 }, keywords: ['cœur', 'tension', 'cholestérol'] },
  { id: 11, label: 'Diabète et troubles métaboliques', scores: { '18-25': 2, '45-50': 4, '60-65': 5, '70-75': 5 }, keywords: ['glycémie', 'sucre', 'insuline'] },
  { id: 12, label: 'Maladies respiratoires chroniques', scores: { '18-25': 2, '45-50': 3, '60-65': 4, '70-75': 4 }, keywords: ['asthme', 'BPCO', 'souffle'] },
  { id: 13, label: 'Prévention de la perte d\'autonomie', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['dépendance', 'maintien'] },
  { id: 14, label: 'Prévention des chutes', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['équilibre', 'fracture', 'vertiges'] },
  { id: 15, label: 'Santé bucco-dentaire', scores: { '18-25': 4, '45-50': 4, '60-65': 4, '70-75': 4 }, keywords: ['dents', 'gencives', 'dentiste'] },
  { id: 16, label: 'Vaccinations', scores: { '18-25': 4, '45-50': 4, '60-65': 5, '70-75': 5 }, keywords: ['vaccin', 'rappel', 'grippe'] },
  { id: 17, label: 'Santé sexuelle', scores: { '18-25': 5, '45-50': 3, '60-65': 2, '70-75': 1 }, keywords: ['contraception', 'IST', 'fertilité'] },
  { id: 18, label: 'Contraception', scores: { '18-25': 5, '45-50': 2, '60-65': 1, '70-75': 1 }, keywords: ['pilule', 'préservatif', 'stérilet'] },
  { id: 19, label: 'IST', scores: { '18-25': 5, '45-50': 3, '60-65': 2, '70-75': 1 }, keywords: ['dépistage', 'VIH', 'protection'] },
  { id: 20, label: 'Ménopause', scores: { '18-25': 1, '45-50': 5, '60-65': 4, '70-75': 2 }, keywords: ['bouffées', 'hormones', 'THM'] },
  { id: 21, label: 'Andropause / santé hormonale masculine', scores: { '18-25': 1, '45-50': 4, '60-65': 4, '70-75': 3 }, keywords: ['testostérone', 'libido'] },
  { id: 22, label: 'Santé osseuse (ostéoporose)', scores: { '18-25': 1, '45-50': 3, '60-65': 5, '70-75': 5 }, keywords: ['calcium', 'vitamine D', 'densitométrie'] },
  { id: 23, label: 'Santé auditive', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['audition', 'appareils', 'acouphènes'] },
  { id: 24, label: 'Santé visuelle', scores: { '18-25': 2, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['vue', 'lunettes', 'ophtalmologue'] },
  { id: 25, label: 'Douleur chronique', scores: { '18-25': 1, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['antalgiques', 'inflammation'] },
  { id: 26, label: 'Médicaments et iatrogénie', scores: { '18-25': 2, '45-50': 3, '60-65': 5, '70-75': 5 }, keywords: ['effets indésirables', 'interactions'] },
  { id: 27, label: 'Observance et bon usage', scores: { '18-25': 2, '45-50': 3, '60-65': 5, '70-75': 5 }, keywords: ['prise', 'oubli', 'pilulier'] },
  { id: 28, label: 'Automédication / phytothérapie', scores: { '18-25': 3, '45-50': 3, '60-65': 3, '70-75': 2 }, keywords: ['plantes', 'compléments'] },
  { id: 29, label: 'Santé au travail', scores: { '18-25': 5, '45-50': 4, '60-65': 2, '70-75': 1 }, keywords: ['TMS', 'ergonomie', 'stress professionnel'] },
  { id: 30, label: 'Accidents domestiques', scores: { '18-25': 2, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['prévention', 'sécurité'] },
  { id: 31, label: 'Prévention routière', scores: { '18-25': 4, '45-50': 4, '60-65': 3, '70-75': 2 }, keywords: ['conduite', 'médicaments'] },
  { id: 32, label: 'Violences', scores: { '18-25': 4, '45-50': 3, '60-65': 2, '70-75': 2 }, keywords: ['harcèlement', 'aide'] },
  { id: 33, label: 'Isolement social', scores: { '18-25': 2, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['solitude', 'lien social'] },
  { id: 34, label: 'Précarité et accès aux droits', scores: { '18-25': 3, '45-50': 3, '60-65': 4, '70-75': 4 }, keywords: ['CMU', 'aide sociale'] },
  { id: 35, label: 'Santé et environnement', scores: { '18-25': 3, '45-50': 3, '60-65': 3, '70-75': 3 }, keywords: ['pollution', 'qualité air'] },
  { id: 36, label: 'Perturbateurs endocriniens', scores: { '18-25': 4, '45-50': 3, '60-65': 2, '70-75': 1 }, keywords: ['plastiques', 'cosmétiques'] },
  { id: 37, label: 'Chaleur / froid / climat', scores: { '18-25': 2, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['canicule', 'hydratation'] },
  { id: 38, label: 'Dénutrition du sujet âgé', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['protéines', 'perte poids'] },
  { id: 39, label: 'Maintien à domicile', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['aide', 'aménagement'] },
  { id: 40, label: 'Aidants et charge de l\'aidance', scores: { '18-25': 1, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['proche', 'épuisement'] },
  { id: 41, label: 'Santé de la femme', scores: { '18-25': 4, '45-50': 4, '60-65': 3, '70-75': 2 }, keywords: ['gynécologie', 'cycle'] },
  { id: 42, label: 'Santé de l\'homme', scores: { '18-25': 3, '45-50': 4, '60-65': 4, '70-75': 3 }, keywords: ['prostate', 'urologie'] },
  { id: 43, label: 'Santé des jeunes adultes', scores: { '18-25': 5, '45-50': 1, '60-65': 1, '70-75': 1 }, keywords: ['étudiant', 'insertion'] },
  { id: 44, label: 'Santé des seniors', scores: { '18-25': 1, '45-50': 2, '60-65': 5, '70-75': 5 }, keywords: ['vieillissement', 'bien vieillir'] },
  { id: 45, label: 'Maladies infectieuses', scores: { '18-25': 3, '45-50': 3, '60-65': 4, '70-75': 5 }, keywords: ['infection', 'antibiotiques'] },
  { id: 46, label: 'Troubles cognitifs', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['mémoire', 'concentration', 'Alzheimer'] },
  { id: 47, label: 'Mémoire et vieillissement cérébral', scores: { '18-25': 1, '45-50': 2, '60-65': 4, '70-75': 5 }, keywords: ['cerveau', 'stimulation'] },
  { id: 48, label: 'Troubles musculosquelettiques', scores: { '18-25': 3, '45-50': 4, '60-65': 4, '70-75': 4 }, keywords: ['arthrose', 'douleurs articulaires'] },
  { id: 49, label: 'Santé cardiovasculaire féminine', scores: { '18-25': 2, '45-50': 5, '60-65': 5, '70-75': 5 }, keywords: ['infarctus femme', 'risque CV'] },
  { id: 50, label: 'Expositions spécifiques (ex. chlordécone)', scores: { '18-25': 2, '45-50': 2, '60-65': 3, '70-75': 3 }, keywords: ['pesticides', 'exposition professionnelle'] },
]

/**
 * Retourne les thématiques triées par pertinence pour une tranche d'âge donnée
 * @param ageRange - La tranche d'âge sélectionnée
 * @param minScore - Score minimum pour inclure la thématique (défaut: 1)
 */
export function getThematiquesForAge(ageRange: AgeRange, minScore = 1): Thematique[] {
  return THEMATIQUES
    .filter(t => t.scores[ageRange] >= minScore)
    .sort((a, b) => b.scores[ageRange] - a.scores[ageRange])
}

/**
 * Retourne les thématiques "prioritaires" (score >= 4) pour une tranche d'âge
 */
export function getPriorityThematiques(ageRange: AgeRange): Thematique[] {
  return getThematiquesForAge(ageRange, 4)
}

/**
 * Retourne la couleur d'accent basée sur le score
 */
export function getScoreColor(score: number): { bg: string; text: string; border: string } {
  switch (score) {
    case 5:
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case 4:
      return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' }
    case 3:
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' }
    case 2:
      return { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10' }
    default:
      return { bg: 'bg-white/3', text: 'text-white/30', border: 'border-white/5' }
  }
}
