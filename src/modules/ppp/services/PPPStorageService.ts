import { supabase } from '@shared/lib/supabase'
import { PPPData } from '../types'

// Interface pour Supabase
interface DBPPPBilan {
  id: string
  user_id: string
  patient_name: string
  pharmacist_name: string
  pharmacy_name: string
  ppp_date: string
  age_range: string
  image_url: string | null
  notes: string
  insights: string[]
  priorities: string[]
  freins: string[]
  conseils: string[]
  ressources: string[]
  suivi: string[]
  oppose_medecin: boolean
  created_at: string
  updated_at: string
}

// Conversion DB → App
function toAppPPP(dbPPP: DBPPPBilan): PPPData {
  return {
    id: dbPPP.id,
    patientName: dbPPP.patient_name,
    pharmacistName: dbPPP.pharmacist_name,
    pharmacyName: dbPPP.pharmacy_name,
    date: dbPPP.ppp_date,
    ageRange: dbPPP.age_range as PPPData['ageRange'],
    imageBase64: dbPPP.image_url || undefined,
    notes: dbPPP.notes,
    insights: dbPPP.insights,
    priorities: dbPPP.priorities,
    freins: dbPPP.freins,
    conseils: dbPPP.conseils,
    ressources: dbPPP.ressources,
    suivi: dbPPP.suivi,
    opposeMedecin: dbPPP.oppose_medecin,
    createdAt: new Date(dbPPP.created_at),
    updatedAt: new Date(dbPPP.updated_at),
    storageType: 'cloud',
  }
}

/**
 * Service de stockage cloud (Supabase) pour les PPP
 */
export const PPPStorageService = {
  /**
   * Récupère tous les PPP de l'utilisateur
   */
  async getAll(): Promise<PPPData[]> {
    const { data, error } = await supabase
      .from('ppp_bilans')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching PPP bilans:', error)
      throw error
    }

    return (data || []).map((ppp) => toAppPPP(ppp as DBPPPBilan))
  },

  /**
   * Récupère un PPP par ID
   */
  async getById(id: string): Promise<PPPData | null> {
    const { data, error } = await supabase
      .from('ppp_bilans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching PPP bilan:', error)
      return null
    }

    return data ? toAppPPP(data as DBPPPBilan) : null
  },

  /**
   * Crée un nouveau PPP
   */
  async create(ppp: Omit<PPPData, 'id' | 'createdAt' | 'updatedAt' | 'storageType'>): Promise<PPPData> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('ppp_bilans')
      .insert({
        user_id: user.id,
        patient_name: ppp.patientName,
        pharmacist_name: ppp.pharmacistName,
        pharmacy_name: ppp.pharmacyName,
        ppp_date: ppp.date,
        age_range: ppp.ageRange,
        image_url: ppp.imageBase64 || null,
        notes: ppp.notes,
        insights: ppp.insights || [],
        priorities: ppp.priorities,
        freins: ppp.freins,
        conseils: ppp.conseils,
        ressources: ppp.ressources,
        suivi: ppp.suivi,
        oppose_medecin: ppp.opposeMedecin,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating PPP bilan:', error)
      throw error
    }

    return toAppPPP(data as DBPPPBilan)
  },

  /**
   * Met à jour un PPP existant
   */
  async update(id: string, updates: Partial<PPPData>): Promise<PPPData> {
    const updateData: Partial<Record<string, unknown>> = {}

    if (updates.patientName) updateData.patient_name = updates.patientName
    if (updates.pharmacistName) updateData.pharmacist_name = updates.pharmacistName
    if (updates.pharmacyName) updateData.pharmacy_name = updates.pharmacyName
    if (updates.date) updateData.ppp_date = updates.date
    if (updates.ageRange) updateData.age_range = updates.ageRange
    if (updates.imageBase64 !== undefined) updateData.image_url = updates.imageBase64
    if (updates.notes) updateData.notes = updates.notes
    if (updates.insights) updateData.insights = updates.insights
    if (updates.priorities) updateData.priorities = updates.priorities
    if (updates.freins) updateData.freins = updates.freins
    if (updates.conseils) updateData.conseils = updates.conseils
    if (updates.ressources) updateData.ressources = updates.ressources
    if (updates.suivi) updateData.suivi = updates.suivi
    if (updates.opposeMedecin !== undefined) updateData.oppose_medecin = updates.opposeMedecin

    const { data, error } = await supabase
      .from('ppp_bilans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating PPP bilan:', error)
      throw error
    }

    return toAppPPP(data as DBPPPBilan)
  },

  /**
   * Supprime un PPP
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ppp_bilans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting PPP bilan:', error)
      throw error
    }
  },

  /**
   * Recherche des PPP par nom de patient
   */
  async searchByPatientName(query: string): Promise<PPPData[]> {
    const { data, error } = await supabase
      .from('ppp_bilans')
      .select('*')
      .ilike('patient_name', `%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching PPP bilans:', error)
      throw error
    }

    return (data || []).map((ppp) => toAppPPP(ppp as DBPPPBilan))
  },
}

// TODO: Implémenter le service SQLite local pour fallback offline
// export const LocalPPPStorageService = { ... }
