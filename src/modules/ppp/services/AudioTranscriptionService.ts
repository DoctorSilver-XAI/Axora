import { supabase } from '@shared/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Statuts possibles d'une session de transcription audio
 */
export type AudioSessionStatus =
  | 'pending'     // En attente d'upload
  | 'uploading'   // Upload en cours
  | 'processing'  // Transcription/synthèse en cours
  | 'completed'   // Terminé avec succès
  | 'error'       // Erreur

/**
 * Interface d'une session audio en base
 */
interface DBAudioSession {
  id: string
  user_id: string
  token: string
  status: AudioSessionStatus
  audio_path: string | null
  transcription: string | null
  synthesis: string | null
  error_message: string | null
  created_at: string
  expires_at: string
}

/**
 * Callbacks pour les événements de session
 */
export interface AudioSessionCallbacks {
  onUploading?: () => void
  onProcessing?: () => void
  onCompleted?: (synthesis: string, transcription: string) => void
  onError?: (message: string) => void
}

/**
 * Résultat de la création d'une session
 */
export interface CreateSessionResult {
  sessionId: string
  token: string
  qrUrl: string
  expiresAt: Date
}

/**
 * Génère un token aléatoire de 32 caractères
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Construit l'URL de la webapp d'upload pour le QR code
 * Utilise GitHub Pages pour éviter les problèmes CSP de Safari iOS
 */
function buildUploadUrl(token: string): string {
  // GitHub Pages URL - Safari iOS le traite comme un site de confiance
  return `https://doctorsilver-xai.github.io/Axora/upload.html?token=${token}`
}

/**
 * Service de gestion des sessions de transcription audio
 */
export const AudioTranscriptionService = {
  /**
   * Crée une nouvelle session de transcription
   * Retourne le token et l'URL du QR code
   */
  async createSession(): Promise<CreateSessionResult> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié')

    const token = generateToken()

    const { data, error } = await supabase
      .from('audio_sessions')
      .insert({
        user_id: user.id,
        token,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création session audio:', error)
      throw new Error('Impossible de créer la session de transcription')
    }

    const session = data as DBAudioSession

    return {
      sessionId: session.id,
      token: session.token,
      qrUrl: buildUploadUrl(session.token),
      expiresAt: new Date(session.expires_at),
    }
  },

  /**
   * S'abonne aux mises à jour en temps réel d'une session
   * Retourne une fonction pour se désabonner
   */
  subscribeToSession(
    sessionId: string,
    callbacks: AudioSessionCallbacks
  ): () => void {
    let channel: RealtimeChannel | null = null

    // S'abonner aux changements de la session spécifique
    channel = supabase
      .channel(`audio_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audio_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new as DBAudioSession

          switch (session.status) {
            case 'uploading':
              callbacks.onUploading?.()
              break

            case 'processing':
              callbacks.onProcessing?.()
              break

            case 'completed':
              if (session.synthesis) {
                callbacks.onCompleted?.(
                  session.synthesis,
                  session.transcription || ''
                )
              }
              break

            case 'error':
              callbacks.onError?.(
                session.error_message || 'Une erreur est survenue'
              )
              break
          }
        }
      )
      .subscribe()

    // Retourner la fonction de désinscription
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  },

  /**
   * Récupère le statut actuel d'une session
   */
  async getSessionStatus(sessionId: string): Promise<{
    status: AudioSessionStatus
    synthesis?: string
    transcription?: string
    errorMessage?: string
  } | null> {
    const { data, error } = await supabase
      .from('audio_sessions')
      .select('status, synthesis, transcription, error_message')
      .eq('id', sessionId)
      .single()

    if (error) {
      console.error('Erreur récupération session:', error)
      return null
    }

    const session = data as Pick<DBAudioSession, 'status' | 'synthesis' | 'transcription' | 'error_message'>

    return {
      status: session.status,
      synthesis: session.synthesis || undefined,
      transcription: session.transcription || undefined,
      errorMessage: session.error_message || undefined,
    }
  },

  /**
   * Annule et supprime une session
   */
  async cancelSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('audio_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Erreur annulation session:', error)
      // On ne throw pas, l'annulation ne doit pas bloquer l'UI
    }
  },

  /**
   * Nettoie les sessions expirées de l'utilisateur courant
   * (appelé périodiquement ou au montage du composant)
   */
  async cleanupExpiredSessions(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('audio_sessions')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Erreur nettoyage sessions expirées:', error)
    }
  },
}
