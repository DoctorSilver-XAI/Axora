import { supabase } from '@shared/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { VoiceMemo, VoiceMemoCallbacks } from '../types'

/**
 * Service de gestion des memos vocaux
 * Gère le CRUD et les subscriptions Realtime
 */
export const VoiceMemoService = {
  /**
   * Récupère tous les memos de l'utilisateur
   */
  async getAll(includeArchived = false): Promise<VoiceMemo[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    let query = supabase
      .from('voice_memos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      query = query.neq('status', 'archived')
    }

    const { data, error } = await query

    if (error) {
      console.error('[VoiceMemoService] Erreur récupération:', error)
      throw error
    }

    return data as VoiceMemo[]
  },

  /**
   * Récupère un memo par ID
   */
  async getById(id: string): Promise<VoiceMemo | null> {
    const { data, error } = await supabase
      .from('voice_memos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[VoiceMemoService] Erreur récupération memo:', error)
      return null
    }

    return data as VoiceMemo
  },

  /**
   * Met à jour un memo (titre, notes)
   */
  async update(
    id: string,
    updates: Partial<Pick<VoiceMemo, 'title' | 'notes'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('voice_memos')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('[VoiceMemoService] Erreur mise à jour:', error)
      throw error
    }
  },

  /**
   * Archive un memo
   */
  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('voice_memos')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[VoiceMemoService] Erreur archivage:', error)
      throw error
    }
  },

  /**
   * Restaure un memo archivé
   */
  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from('voice_memos')
      .update({
        status: 'completed',
        archived_at: null,
      })
      .eq('id', id)

    if (error) {
      console.error('[VoiceMemoService] Erreur restauration:', error)
      throw error
    }
  },

  /**
   * Supprime définitivement un memo et son fichier audio
   */
  async delete(id: string): Promise<void> {
    // Récupérer d'abord pour supprimer l'audio
    const memo = await this.getById(id)

    if (memo?.audio_url) {
      const { error: storageError } = await supabase
        .storage
        .from('audio')
        .remove([memo.audio_url])

      if (storageError) {
        console.warn('[VoiceMemoService] Erreur suppression audio:', storageError)
      }
    }

    const { error } = await supabase
      .from('voice_memos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[VoiceMemoService] Erreur suppression:', error)
      throw error
    }
  },

  /**
   * Relance le traitement d'un memo en erreur
   */
  async retry(id: string): Promise<void> {
    // Remettre en pending
    const { error: updateError } = await supabase
      .from('voice_memos')
      .update({
        status: 'pending',
        error_message: null,
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Appeler la fonction de processing
    const { error: invokeError } = await supabase.functions.invoke('process-voice-memo', {
      body: { memoId: id },
    })

    if (invokeError) {
      console.error('[VoiceMemoService] Erreur invocation Edge Function:', invokeError)
      throw invokeError
    }
  },

  /**
   * Récupère l'URL de téléchargement de l'audio
   */
  async getAudioUrl(audioPath: string): Promise<string | null> {
    const { data } = await supabase
      .storage
      .from('audio')
      .createSignedUrl(audioPath, 3600) // URL valide 1 heure

    return data?.signedUrl || null
  },

  /**
   * S'abonne aux changements en temps réel
   * Retourne une fonction pour se désabonner
   */
  subscribeToChanges(callbacks: VoiceMemoCallbacks): () => void {
    let channel: RealtimeChannel | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('voice_memos_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'voice_memos',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            callbacks.onInsert?.(payload.new as VoiceMemo)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'voice_memos',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            callbacks.onUpdate?.(payload.new as VoiceMemo)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'voice_memos',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            callbacks.onDelete?.(payload.old.id)
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  },

  /**
   * Copie le transcrit dans le presse-papier
   */
  async copyToClipboard(memo: VoiceMemo): Promise<boolean> {
    if (!memo.transcription) return false

    try {
      await navigator.clipboard.writeText(memo.transcription)
      return true
    } catch (error) {
      console.error('[VoiceMemoService] Erreur copie:', error)
      return false
    }
  },
}
