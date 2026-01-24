/**
 * Types pour le module Voice Memos
 */

export type VoiceMemoStatus =
  | 'pending'     // Fichier reçu, en attente de traitement
  | 'processing'  // Transcription Whisper en cours
  | 'completed'   // Transcription terminée
  | 'error'       // Erreur de transcription
  | 'archived'    // Archivé par l'utilisateur

export interface VoiceMemo {
  id: string
  user_id: string
  audio_url: string
  audio_filename: string | null
  audio_duration_seconds: number | null
  audio_size_bytes: number | null
  status: VoiceMemoStatus
  transcription: string | null
  title: string | null
  notes: string | null
  error_message: string | null
  retry_count: number
  created_at: string
  processed_at: string | null
  archived_at: string | null
}

/**
 * Configuration visuelle des statuts
 */
export const STATUS_CONFIG: Record<VoiceMemoStatus, {
  label: string
  color: string
  bgColor: string
  iconName: 'Clock' | 'Loader2' | 'CheckCircle2' | 'AlertCircle' | 'Archive'
  animate?: boolean
}> = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    iconName: 'Clock',
  },
  processing: {
    label: 'Transcription...',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    iconName: 'Loader2',
    animate: true,
  },
  completed: {
    label: 'Terminé',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    iconName: 'CheckCircle2',
  },
  error: {
    label: 'Erreur',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    iconName: 'AlertCircle',
  },
  archived: {
    label: 'Archivé',
    color: 'text-white/40',
    bgColor: 'bg-white/10',
    iconName: 'Archive',
  },
}

/**
 * Callbacks pour les événements Realtime
 */
export interface VoiceMemoCallbacks {
  onInsert?: (memo: VoiceMemo) => void
  onUpdate?: (memo: VoiceMemo) => void
  onDelete?: (memoId: string) => void
}
