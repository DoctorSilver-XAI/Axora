/**
 * Service d'import BDPM
 * Synchronise les données depuis Supabase vers SQLite local
 * pour permettre un fonctionnement hors-ligne du calculateur de posologie
 */

import { supabase } from '@shared/lib/supabase'
import type {
  LocalBDPMMedicament,
  LocalBDPMComposition,
  LocalBDPMPresentation,
  LocalBDPMPosologie,
} from '@shared/types/electron'

// Référentiel de posologies pédiatriques (intégré dans l'import)
const POSOLOGIES_REFERENCE: Omit<LocalBDPMPosologie, 'id' | 'dci_normalized'>[] = [
  {
    dci: 'paracétamol',
    mg_per_kg_per_day: 60,
    max_daily_mg: 4000,
    max_single_dose_mg: 1000,
    default_frequency: 4,
    min_interval_hours: 4,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Dose maximale 1g par prise chez l\'adulte',
      'Adapter en cas d\'insuffisance hépatique',
    ]),
  },
  {
    dci: 'ibuprofène',
    mg_per_kg_per_day: 30,
    max_daily_mg: 1200,
    max_single_dose_mg: 400,
    default_frequency: 3,
    min_interval_hours: 6,
    min_age_months: 3,
    max_age_years: null,
    notes: JSON.stringify([
      'Contre-indiqué avant 3 mois',
      'À prendre au cours des repas',
      'Éviter en cas de varicelle ou déshydratation',
    ]),
  },
  {
    dci: 'amoxicilline',
    mg_per_kg_per_day: 80,
    max_daily_mg: 3000,
    max_single_dose_mg: 1000,
    default_frequency: 3,
    min_interval_hours: 8,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Dose standard 50 mg/kg/j, jusqu\'à 80-100 mg/kg/j pour OMA',
      'Vérifier les allergies aux pénicillines',
    ]),
  },
  {
    dci: 'azithromycine',
    mg_per_kg_per_day: 10,
    max_daily_mg: 500,
    max_single_dose_mg: 500,
    default_frequency: 1,
    min_interval_hours: 24,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Traitement de 3 jours en général',
      'Prise unique quotidienne',
    ]),
  },
  {
    dci: 'céfixime',
    mg_per_kg_per_day: 8,
    max_daily_mg: 400,
    max_single_dose_mg: 200,
    default_frequency: 2,
    min_interval_hours: 12,
    min_age_months: 6,
    max_age_years: null,
    notes: JSON.stringify([
      'Alternative en cas d\'allergie aux pénicillines (vérifier allergie croisée)',
      'Utilisé principalement dans les infections urinaires',
    ]),
  },
  {
    dci: 'prednisolone',
    mg_per_kg_per_day: 2,
    max_daily_mg: 60,
    max_single_dose_mg: 60,
    default_frequency: 1,
    min_interval_hours: 24,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Dose d\'attaque 1-2 mg/kg/j',
      'Prise matinale recommandée',
      'Traitement court (3-5 jours) ne nécessite pas de décroissance',
    ]),
  },
  {
    dci: 'prednisone',
    mg_per_kg_per_day: 2,
    max_daily_mg: 60,
    max_single_dose_mg: 60,
    default_frequency: 1,
    min_interval_hours: 24,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Équivalent prednisolone',
      'Prise matinale recommandée',
    ]),
  },
  {
    dci: 'dexaméthasone',
    mg_per_kg_per_day: 0.6,
    max_daily_mg: 16,
    max_single_dose_mg: 8,
    default_frequency: 1,
    min_interval_hours: 24,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Corticoïde puissant (1 mg = 7 mg prednisone)',
      'Utilisé notamment dans le croup',
    ]),
  },
  {
    dci: 'céfpodoxime',
    mg_per_kg_per_day: 8,
    max_daily_mg: 400,
    max_single_dose_mg: 200,
    default_frequency: 2,
    min_interval_hours: 12,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Céphalosporine de 3ème génération orale',
      'À prendre au cours des repas',
    ]),
  },
  {
    dci: 'clarithromycine',
    mg_per_kg_per_day: 15,
    max_daily_mg: 1000,
    max_single_dose_mg: 500,
    default_frequency: 2,
    min_interval_hours: 12,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Alternative en cas d\'allergie aux bêta-lactamines',
      'Nombreuses interactions médicamenteuses',
    ]),
  },
  {
    dci: 'josamycine',
    mg_per_kg_per_day: 50,
    max_daily_mg: 2000,
    max_single_dose_mg: 1000,
    default_frequency: 2,
    min_interval_hours: 12,
    min_age_months: 0,
    max_age_years: null,
    notes: JSON.stringify([
      'Macrolide avec peu d\'interactions',
      'Alternative en cas d\'allergie aux bêta-lactamines',
    ]),
  },
  {
    dci: 'méropénem',
    mg_per_kg_per_day: 60,
    max_daily_mg: 6000,
    max_single_dose_mg: 2000,
    default_frequency: 3,
    min_interval_hours: 8,
    min_age_months: 3,
    max_age_years: null,
    notes: JSON.stringify([
      'Carbapénème - usage hospitalier',
      'Réservé aux infections sévères',
    ]),
  },
]

export interface ImportProgress {
  step: 'medicaments' | 'compositions' | 'presentations' | 'posologies' | 'done'
  current: number
  total: number
  message: string
}

export type ImportProgressCallback = (progress: ImportProgress) => void

export const BDPMImportService = {
  /**
   * Vérifie si la base locale est initialisée
   */
  async isInitialized(): Promise<boolean> {
    try {
      const axora = window.axora as { bdpm?: { isInitialized: () => Promise<boolean> } }
      if (!axora.bdpm) return false
      return await axora.bdpm.isInitialized()
    } catch {
      return false
    }
  },

  /**
   * Compte le nombre de médicaments en base locale
   */
  async getLocalCount(): Promise<number> {
    try {
      const axora = window.axora as { bdpm?: { count: () => Promise<number> } }
      if (!axora.bdpm) return 0
      return await axora.bdpm.count()
    } catch {
      return 0
    }
  },

  /**
   * Import complet depuis Supabase vers SQLite local
   * Cette opération peut prendre quelques minutes pour 15 000+ médicaments
   */
  async importFromSupabase(onProgress?: ImportProgressCallback): Promise<{ success: boolean; error?: string; stats?: { medicaments: number; compositions: number; presentations: number; posologies: number } }> {
    const axora = window.axora as {
      bdpm?: {
        clearAll: () => Promise<void>
        importMedicaments: (data: unknown[]) => Promise<number>
        importCompositions: (data: unknown[]) => Promise<number>
        importPresentations: (data: unknown[]) => Promise<number>
        importPosologies: (data: unknown[]) => Promise<number>
      }
    }

    if (!axora.bdpm) {
      return { success: false, error: 'API BDPM non disponible' }
    }

    try {
      // 1. Vider les tables existantes
      await axora.bdpm.clearAll()

      // 2. Importer les médicaments depuis bdpm_specialites
      onProgress?.({ step: 'medicaments', current: 0, total: 1, message: 'Récupération des médicaments...' })

      const { data: specialites, error: specError } = await supabase
        .from('bdpm_specialites')
        .select('code_cis, denomination, forme_pharmaceutique, voies_administration, titulaires, etat_commercialisation, surveillance_renforcee')
        .eq('etat_commercialisation', 'Commercialisée')

      if (specError) throw new Error(`Erreur récupération spécialités: ${specError.message}`)

      const medicaments: Omit<LocalBDPMMedicament, 'created_at'>[] = (specialites || []).map((s) => ({
        code_cis: s.code_cis,
        denomination: s.denomination,
        forme_pharmaceutique: s.forme_pharmaceutique,
        voies_administration: s.voies_administration,
        dci_principal: null, // Sera enrichi depuis compositions
        laboratoire: s.titulaires,
        etat_commercialisation: s.etat_commercialisation || 'Commercialisée',
        surveillance_renforcee: s.surveillance_renforcee ? 1 : 0,
      }))

      onProgress?.({ step: 'medicaments', current: medicaments.length, total: medicaments.length, message: `Import de ${medicaments.length} médicaments...` })
      const nbMed = await axora.bdpm.importMedicaments(medicaments)

      // 3. Importer les compositions depuis bdpm_compositions
      onProgress?.({ step: 'compositions', current: 0, total: 1, message: 'Récupération des compositions...' })

      const { data: compos, error: compoError } = await supabase
        .from('bdpm_compositions')
        .select('code_cis, substance, dosage, reference_dosage')

      if (compoError) throw new Error(`Erreur récupération compositions: ${compoError.message}`)

      const compositions: Omit<LocalBDPMComposition, 'id'>[] = (compos || []).map((c) => ({
        code_cis: c.code_cis,
        substance: c.substance,
        dosage: c.dosage,
        reference_dosage: c.reference_dosage,
      }))

      onProgress?.({ step: 'compositions', current: compositions.length, total: compositions.length, message: `Import de ${compositions.length} compositions...` })
      const nbCompo = await axora.bdpm.importCompositions(compositions)

      // 4. Importer les présentations depuis bdpm_presentations
      onProgress?.({ step: 'presentations', current: 0, total: 1, message: 'Récupération des présentations...' })

      const { data: pres, error: presError } = await supabase
        .from('bdpm_presentations')
        .select('code_cis, cip13, cip7, libelle, prix_sans_honoraire, remboursement, etat_commercialisation')

      if (presError) throw new Error(`Erreur récupération présentations: ${presError.message}`)

      const presentations: Omit<LocalBDPMPresentation, 'id'>[] = (pres || []).map((p) => ({
        code_cis: p.code_cis,
        cip13: p.cip13,
        cip7: p.cip7,
        libelle: p.libelle,
        prix: p.prix_sans_honoraire,
        remboursement: p.remboursement,
        commercialise: p.etat_commercialisation === 'Commercialisée' ? 1 : 0,
      }))

      onProgress?.({ step: 'presentations', current: presentations.length, total: presentations.length, message: `Import de ${presentations.length} présentations...` })
      const nbPres = await axora.bdpm.importPresentations(presentations)

      // 5. Importer le référentiel de posologies
      onProgress?.({ step: 'posologies', current: 0, total: POSOLOGIES_REFERENCE.length, message: 'Import des posologies...' })
      const nbPoso = await axora.bdpm.importPosologies(POSOLOGIES_REFERENCE)
      onProgress?.({ step: 'posologies', current: POSOLOGIES_REFERENCE.length, total: POSOLOGIES_REFERENCE.length, message: 'Posologies importées' })

      onProgress?.({ step: 'done', current: 1, total: 1, message: 'Import terminé !' })

      return {
        success: true,
        stats: {
          medicaments: nbMed,
          compositions: nbCompo,
          presentations: nbPres,
          posologies: nbPoso,
        },
      }
    } catch (error) {
      console.error('[BDPMImportService] Import error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  },
}
