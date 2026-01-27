/**
 * Service de calcul de posologie intelligent
 * Utilise SQLite local en priorité (hors-ligne), avec fallback Supabase
 */

import { BDPMSearchService, BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { supabase } from '@shared/lib/supabase'
import { PatientData, DosageRule, PosologyCalculation, AgeUnit } from '../types'
import type {
  LocalBDPMSearchResult,
  LocalBDPMPosologie,
} from '@shared/types/electron'

// ============================================
// RÉFÉRENTIEL DES POSOLOGIES
// ============================================

const DOSAGE_RULES: Record<string, DosageRule> = {
  paracetamol: {
    dci: 'paracétamol',
    mgPerKgPerDay: 60,
    maxDailyMg: 4000,
    maxSingleDoseMg: 1000,
    defaultFrequency: 4,
    minIntervalHours: 4,
    minAgeMonths: 0,
    notes: [
      'Maximum 1g par prise chez l\'adulte',
      'Intervalle minimum de 4 heures entre les prises',
      'Adaptation nécessaire en cas d\'insuffisance hépatique',
    ],
  },
  ibuprofene: {
    dci: 'ibuprofène',
    mgPerKgPerDay: 30,
    maxDailyMg: 1200,
    maxSingleDoseMg: 400,
    defaultFrequency: 3,
    minIntervalHours: 6,
    minAgeMonths: 3,
    notes: [
      'Contre-indiqué avant 3 mois',
      'À prendre au cours des repas',
      'Éviter en cas de varicelle ou déshydratation',
    ],
  },
  amoxicilline: {
    dci: 'amoxicilline',
    mgPerKgPerDay: 50,
    maxDailyMg: 3000,
    maxSingleDoseMg: 1000,
    defaultFrequency: 3,
    minIntervalHours: 8,
    minAgeMonths: 0,
    notes: [
      'Dose standard 50 mg/kg/jour',
      'Otites, pneumonies : jusqu\'à 80-100 mg/kg/jour',
      'Adaptation rénale si DFG < 30 mL/min',
    ],
  },
  azithromycine: {
    dci: 'azithromycine',
    mgPerKgPerDay: 10,
    maxDailyMg: 500,
    maxSingleDoseMg: 500,
    defaultFrequency: 1,
    minIntervalHours: 24,
    minAgeMonths: 0,
    notes: [
      'Prise unique journalière',
      'Durée de traitement courte (3-5 jours)',
      'Peut être pris indépendamment des repas',
    ],
  },
  cefixime: {
    dci: 'céfixime',
    mgPerKgPerDay: 8,
    maxDailyMg: 400,
    maxSingleDoseMg: 200,
    defaultFrequency: 2,
    minIntervalHours: 12,
    minAgeMonths: 6,
    notes: [
      'Contre-indiqué avant 6 mois',
      'Alternative en cas d\'allergie aux pénicillines (sauf allergie croisée)',
    ],
  },
  prednisolone: {
    dci: 'prednisolone',
    mgPerKgPerDay: 1,
    maxDailyMg: 60,
    maxSingleDoseMg: 60,
    defaultFrequency: 1,
    minIntervalHours: 24,
    minAgeMonths: 0,
    notes: [
      'Prise le matin de préférence',
      'Ne pas arrêter brutalement si traitement > 10 jours',
      'Dose variable selon indication (1-2 mg/kg/j)',
    ],
  },
  dexamethasone: {
    dci: 'dexaméthasone',
    mgPerKgPerDay: 0.15,
    maxDailyMg: 16,
    maxSingleDoseMg: 8,
    defaultFrequency: 1,
    minIntervalHours: 24,
    minAgeMonths: 0,
    notes: [
      '1 mg de dexaméthasone ≈ 6,7 mg de prednisolone',
      'Prise le matin',
      'Laryngite aiguë : 0.15-0.6 mg/kg dose unique',
    ],
  },
  cetirizine: {
    dci: 'cétirizine',
    mgPerKgPerDay: 0.25,
    maxDailyMg: 10,
    maxSingleDoseMg: 10,
    defaultFrequency: 1,
    minIntervalHours: 24,
    minAgeMonths: 24,
    notes: [
      '2-6 ans : 2.5 mg × 2/jour ou 5 mg × 1/jour',
      '> 6 ans : 10 mg × 1/jour',
      'Peut provoquer une somnolence',
    ],
  },
  desloratadine: {
    dci: 'desloratadine',
    mgPerKgPerDay: 0.1,
    maxDailyMg: 5,
    maxSingleDoseMg: 5,
    defaultFrequency: 1,
    minIntervalHours: 24,
    minAgeMonths: 12,
    notes: [
      '1-5 ans : 1.25 mg/jour',
      '6-11 ans : 2.5 mg/jour',
      '> 12 ans : 5 mg/jour',
      'Moins sédatif que la cétirizine',
    ],
  },
  domperidone: {
    dci: 'dompéridone',
    mgPerKgPerDay: 0.75,
    maxDailyMg: 30,
    maxSingleDoseMg: 10,
    defaultFrequency: 3,
    minIntervalHours: 8,
    minAgeMonths: 0,
    notes: [
      'Maximum 0.25 mg/kg par prise',
      'Durée de traitement la plus courte possible',
      'Attention au risque cardiaque (allongement QT)',
    ],
  },
  metoclopramide: {
    dci: 'métoclopramide',
    mgPerKgPerDay: 0.4,
    maxDailyMg: 30,
    maxSingleDoseMg: 10,
    defaultFrequency: 3,
    minIntervalHours: 6,
    minAgeMonths: 12,
    notes: [
      'Contre-indiqué avant 1 an',
      'Durée maximale 5 jours',
      'Risque de syndromes extrapyramidaux',
    ],
  },
  ondansetron: {
    dci: 'ondansétron',
    mgPerKgPerDay: 0.3,
    maxDailyMg: 16,
    maxSingleDoseMg: 8,
    defaultFrequency: 2,
    minIntervalHours: 8,
    minAgeMonths: 6,
    notes: [
      '< 10 kg : 2 mg',
      '10-40 kg : 4 mg',
      '> 40 kg : 8 mg',
      'Peut allonger le QT',
    ],
  },
}

// Alias pour les variantes orthographiques
const DCI_ALIASES: Record<string, string> = {
  'paracétamol': 'paracetamol',
  'acetaminophen': 'paracetamol',
  'acetaminophene': 'paracetamol',
  'doliprane': 'paracetamol',
  'dafalgan': 'paracetamol',
  'efferalgan': 'paracetamol',
  'ibuprofène': 'ibuprofene',
  'advil': 'ibuprofene',
  'nurofen': 'ibuprofene',
  'céfixime': 'cefixime',
  'oroken': 'cefixime',
  'zithromax': 'azithromycine',
  'solupred': 'prednisolone',
  'célestène': 'dexamethasone',
  'celestene': 'dexamethasone',
  'zyrtec': 'cetirizine',
  'cétirizine': 'cetirizine',
  'aerius': 'desloratadine',
  'désloratadine': 'desloratadine',
  'motilium': 'domperidone',
  'dompéridone': 'domperidone',
  'primpéran': 'metoclopramide',
  'primperan': 'metoclopramide',
  'métoclopramide': 'metoclopramide',
  'zophren': 'ondansetron',
  'ondansétron': 'ondansetron',
}

// ============================================
// SERVICE
// ============================================

export const PosologyService = {
  /**
   * Vérifie si la base locale SQLite est disponible et initialisée
   */
  async isLocalAvailable(): Promise<boolean> {
    try {
      const axora = window.axora as { bdpm?: { isInitialized: () => Promise<boolean> } }
      if (!axora.bdpm) return false
      return await axora.bdpm.isInitialized()
    } catch {
      return false
    }
  },

  /**
   * Recherche de médicaments avec détection code CIP
   * Priorité : SQLite local > Supabase embeddings > Supabase fallback
   */
  async searchDrugs(query: string, limit = 5): Promise<BDPMProduct[]> {
    if (!query || query.length < 2) return []

    // Détection code CIP (7 ou 13 chiffres)
    const cleanQuery = query.replace(/[\s-]/g, '')
    const isCIP = /^\d{7,13}$/.test(cleanQuery)

    // Essayer SQLite local d'abord
    const localAvailable = await this.isLocalAvailable()
    if (localAvailable) {
      const localResults = isCIP
        ? await this.searchLocalByCIP(cleanQuery)
        : await this.searchLocal(query, limit)

      if (localResults.length > 0) {
        return localResults
      }
    }

    // Fallback vers Supabase
    if (isCIP) {
      const result = await BDPMSearchService.searchByCIP(cleanQuery)
      return result ? [result] : []
    }

    // Recherche hybride avec fallback
    let results = await BDPMSearchService.searchHybrid(query, {
      matchCount: limit,
      onlyCommercialised: true,
    })

    // Fallback si pas de résultats (embeddings non générés)
    if (results.length === 0) {
      results = await this.searchFallback(query, limit)
    }

    return results
  },

  /**
   * Recherche locale dans SQLite
   */
  async searchLocal(query: string, limit: number): Promise<BDPMProduct[]> {
    try {
      const axora = window.axora as { bdpm?: { search: (q: string, l?: number) => Promise<LocalBDPMSearchResult[]> } }
      if (!axora.bdpm) return []

      const results = await axora.bdpm.search(query, limit)
      return results.map(this.localResultToBDPMProduct)
    } catch (error) {
      console.error('[PosologyService] Local search error:', error)
      return []
    }
  },

  /**
   * Recherche locale par code CIP
   */
  async searchLocalByCIP(cip: string): Promise<BDPMProduct[]> {
    try {
      const axora = window.axora as { bdpm?: { searchByCIP: (c: string) => Promise<LocalBDPMSearchResult | null> } }
      if (!axora.bdpm) return []

      const result = await axora.bdpm.searchByCIP(cip)
      return result ? [this.localResultToBDPMProduct(result)] : []
    } catch (error) {
      console.error('[PosologyService] Local CIP search error:', error)
      return []
    }
  },

  /**
   * Convertit un résultat SQLite local en BDPMProduct
   */
  localResultToBDPMProduct(local: LocalBDPMSearchResult): BDPMProduct {
    const { medicament, compositions, presentations, posologie } = local

    return {
      id: medicament.code_cis,
      codeCis: medicament.code_cis,
      productName: medicament.denomination,
      dci: medicament.dci_principal || compositions[0]?.substance || null,
      laboratory: medicament.laboratoire,
      formePharmaceutique: medicament.forme_pharmaceutique,
      codeAtc: null,
      productData: {
        surveillance_renforcee: medicament.surveillance_renforcee === 1,
        substances_actives: compositions.map((c) => ({
          substance: c.substance,
          dosage: c.dosage,
          reference: c.reference_dosage,
        })),
        presentations: presentations.map((p) => ({
          cip13: p.cip13,
          cip7: p.cip7,
          libelle: p.libelle,
          prix: p.prix,
          remboursement: p.remboursement,
          commercialise: p.commercialise === 1,
        })),
      },
      hasRupture: false,
      hasAlerte: false,
      isGenerique: false,
      isMitm: false,
      vectorScore: 0,
      textScore: 1,
      combinedScore: 1,
      // Ajouter les infos de posologie locale si disponible
      _localPosologie: posologie || undefined,
    } as BDPMProduct & { _localPosologie?: LocalBDPMPosologie }
  },

  /**
   * Fallback sur bdpm_specialites si les embeddings ne sont pas disponibles
   */
  async searchFallback(query: string, limit: number): Promise<BDPMProduct[]> {
    const { data: specialites } = await supabase
      .from('bdpm_specialites')
      .select(`
        code_cis,
        denomination,
        forme_pharmaceutique,
        titulaires,
        etat_commercialisation,
        surveillance_renforcee,
        dci_principal,
        laboratoire_principal
      `)
      .or(`denomination.ilike.%${query}%,dci_principal.ilike.%${query}%`)
      .eq('etat_commercialisation', 'Commercialisée')
      .limit(limit)

    if (!specialites) return []

    return specialites.map((s) => ({
      id: s.code_cis,
      codeCis: s.code_cis,
      productName: s.denomination,
      dci: s.dci_principal,
      laboratory: s.laboratoire_principal || s.titulaires?.[0] || null,
      formePharmaceutique: s.forme_pharmaceutique,
      codeAtc: null,
      productData: {
        surveillance_renforcee: s.surveillance_renforcee,
      },
      hasRupture: false,
      hasAlerte: false,
      isGenerique: false,
      isMitm: false,
      vectorScore: 0,
      textScore: 1,
      combinedScore: 1,
    }))
  },

  /**
   * Récupère les génériques d'un médicament
   */
  async getGeneriques(drug: BDPMProduct): Promise<BDPMProduct[]> {
    if (!drug.codeCis) return []
    return BDPMSearchService.findGeneriques(drug.codeCis)
  },

  /**
   * Extrait et normalise le DCI principal d'un médicament
   */
  extractMainDCI(drug: BDPMProduct): string | null {
    if (drug.dci) {
      return this.normalizeDCI(drug.dci)
    }

    const substances = drug.productData.substances_actives || []
    if (substances.length > 0) {
      return this.normalizeDCI(substances[0].substance)
    }

    return null
  },

  /**
   * Normalise un DCI pour la recherche dans le référentiel
   */
  normalizeDCI(dci: string): string {
    const normalized = dci
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Vérifier les alias
    return DCI_ALIASES[normalized] || DCI_ALIASES[dci.toLowerCase()] || normalized
  },

  /**
   * Trouve la règle de posologie pour un DCI
   */
  findDosageRule(dci: string): DosageRule | null {
    const normalized = this.normalizeDCI(dci)

    // Recherche exacte
    if (DOSAGE_RULES[normalized]) {
      return DOSAGE_RULES[normalized]
    }

    // Recherche partielle (ex: "paracetamol codeine" -> "paracetamol")
    for (const key of Object.keys(DOSAGE_RULES)) {
      if (normalized.includes(key)) {
        return DOSAGE_RULES[key]
      }
    }

    return null
  },

  /**
   * Convertit un âge en mois
   */
  convertToMonths(age: number, unit: AgeUnit): number {
    switch (unit) {
      case 'years':
        return age * 12
      case 'months':
        return age
      case 'days':
        return Math.floor(age / 30)
    }
  },

  /**
   * Calcule la posologie pour un patient donné
   * Utilise la posologie locale SQLite si disponible
   */
  calculatePosology(
    drug: BDPMProduct & { _localPosologie?: LocalBDPMPosologie },
    patient: PatientData
  ): PosologyCalculation | { error: string } {
    const dci = this.extractMainDCI(drug)

    if (!dci) {
      return { error: 'Impossible d\'identifier la substance active' }
    }

    // Priorité à la posologie locale SQLite si disponible
    let rule: DosageRule | null = null

    if (drug._localPosologie) {
      const poso = drug._localPosologie
      rule = {
        dci: poso.dci,
        mgPerKgPerDay: poso.mg_per_kg_per_day,
        maxDailyMg: poso.max_daily_mg,
        maxSingleDoseMg: poso.max_single_dose_mg,
        defaultFrequency: poso.default_frequency,
        minIntervalHours: poso.min_interval_hours,
        minAgeMonths: poso.min_age_months ?? undefined,
        maxAgeYears: poso.max_age_years ?? undefined,
        notes: typeof poso.notes === 'string' ? JSON.parse(poso.notes) : poso.notes,
      }
    } else {
      rule = this.findDosageRule(dci)
    }

    if (!rule) {
      return {
        error: `Posologie non disponible pour "${dci}". Consultez le RCP du médicament.`,
      }
    }

    // Vérification âge minimum
    const ageInMonths = this.convertToMonths(patient.age, patient.ageUnit)
    if (rule.minAgeMonths !== undefined && ageInMonths < rule.minAgeMonths) {
      const ageText =
        rule.minAgeMonths >= 12
          ? `${Math.floor(rule.minAgeMonths / 12)} an(s)`
          : `${rule.minAgeMonths} mois`
      return {
        error: `${rule.dci} est contre-indiqué avant ${ageText}`,
      }
    }

    // Calcul de base
    const rawDailyDose = patient.weightKg * rule.mgPerKgPerDay
    const warnings: string[] = []

    // Plafonnement dose journalière
    let dailyDoseMg = rawDailyDose
    let isCapped = false
    let capReason: string | undefined

    if (dailyDoseMg > rule.maxDailyMg) {
      dailyDoseMg = rule.maxDailyMg
      isCapped = true
      capReason = `Plafonnée à ${rule.maxDailyMg} mg/jour (dose maximale)`
      warnings.push(capReason)
    }

    // Calcul dose par prise
    let singleDoseMg = Math.round(dailyDoseMg / rule.defaultFrequency)

    // Plafonnement dose unitaire
    if (singleDoseMg > rule.maxSingleDoseMg) {
      singleDoseMg = rule.maxSingleDoseMg
      warnings.push(`Dose par prise limitée à ${rule.maxSingleDoseMg} mg`)
    }

    // Recommandation pratique
    const recommendation = this.buildRecommendation(drug, singleDoseMg)

    return {
      dailyDoseMg: Math.round(dailyDoseMg),
      singleDoseMg,
      frequency: rule.defaultFrequency,
      intervalHours: rule.minIntervalHours,
      isCapped,
      capReason,
      warnings: [...warnings, ...rule.notes],
      recommendation,
    }
  },

  /**
   * Génère une recommandation pratique basée sur le dosage unitaire du médicament
   */
  buildRecommendation(drug: BDPMProduct, doseMg: number): string {
    const substances = drug.productData.substances_actives || []
    if (substances.length === 0) return ''

    // Parser le dosage (ex: "500 mg", "100 mg/5 ml")
    const dosageStr = substances[0].dosage
    if (!dosageStr) return ''

    const dosageMatch = dosageStr.match(/(\d+(?:[.,]\d+)?)\s*mg/i)
    if (!dosageMatch) return ''

    const unitDosage = parseFloat(dosageMatch[1].replace(',', '.'))
    if (isNaN(unitDosage) || unitDosage === 0) return ''

    const units = doseMg / unitDosage

    // Déterminer le type d'unité
    const forme = drug.formePharmaceutique?.toLowerCase() || ''
    let unitName = 'unité'

    if (forme.includes('comprimé')) unitName = 'comprimé'
    else if (forme.includes('gélule')) unitName = 'gélule'
    else if (forme.includes('sachet')) unitName = 'sachet'
    else if (forme.includes('suppositoire')) unitName = 'suppositoire'
    else if (forme.includes('solution') || forme.includes('sirop') || forme.includes('suspension')) {
      // Pour les formes liquides, calculer le volume
      const refMatch = substances[0].reference?.match(/(\d+(?:[.,]\d+)?)\s*ml/i)
      if (refMatch) {
        const mlPerDose = parseFloat(refMatch[1].replace(',', '.'))
        const totalMl = (doseMg / unitDosage) * mlPerDose
        return `≈ ${totalMl.toFixed(1)} ml`
      }
      return ''
    }

    // Formater le nombre d'unités
    if (units < 0.4) {
      return `≈ ¼ ${unitName}`
    } else if (units < 0.6) {
      return `≈ ½ ${unitName}`
    } else if (units < 0.9) {
      return `≈ ¾ ${unitName}`
    } else if (Math.abs(units - Math.round(units)) < 0.15) {
      const n = Math.round(units)
      return `≈ ${n} ${unitName}${n > 1 ? 's' : ''}`
    } else {
      const whole = Math.floor(units)
      const fraction = units - whole
      if (fraction >= 0.4 && fraction <= 0.6) {
        return whole === 0 ? `≈ ½ ${unitName}` : `≈ ${whole} ${unitName}${whole > 1 ? 's' : ''} et ½`
      }
      return `≈ ${units.toFixed(1)} ${unitName}${units > 1 ? 's' : ''}`
    }
  },

  /**
   * Liste des DCI disponibles dans le référentiel
   */
  getAvailableDCIs(): string[] {
    return Object.values(DOSAGE_RULES).map((rule) => rule.dci)
  },

  /**
   * Vérifie si un DCI est dans le référentiel
   */
  hasDosageRule(dci: string): boolean {
    return this.findDosageRule(dci) !== null
  },
}
