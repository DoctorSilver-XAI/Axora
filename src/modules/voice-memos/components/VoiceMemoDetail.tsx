import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Copy,
  Check,
  Archive,
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
  Play,
  Pause,
  Volume2,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { VoiceMemo } from '../types'
import { StatusBadge } from './StatusBadge'
import { VoiceMemoService } from '../services/VoiceMemoService'

interface VoiceMemoDetailProps {
  memo: VoiceMemo
  onUpdate: (updates: Partial<Pick<VoiceMemo, 'title' | 'notes'>>) => Promise<void>
  onArchive: () => void
  onDelete: () => void
  onRetry: () => void
}

export function VoiceMemoDetail({
  memo,
  onUpdate,
  onArchive,
  onDelete,
  onRetry,
}: VoiceMemoDetailProps) {
  const [copied, setCopied] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(memo.title || '')
  const [notes, setNotes] = useState(memo.notes || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Sync state when memo changes
  useEffect(() => {
    setEditedTitle(memo.title || '')
    setNotes(memo.notes || '')
    setShowDeleteConfirm(false)
    setCopied(false)
  }, [memo.id, memo.title, memo.notes])

  // Load audio URL
  useEffect(() => {
    const loadAudio = async () => {
      if (memo.audio_url) {
        const url = await VoiceMemoService.getAudioUrl(memo.audio_url)
        setAudioUrl(url)
      }
    }
    loadAudio()
  }, [memo.audio_url])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
    }
  }, [audioElement])

  const handleCopy = useCallback(async () => {
    if (!memo.transcription) return

    const success = await VoiceMemoService.copyToClipboard(memo)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [memo])

  const handleTitleBlur = useCallback(async () => {
    setIsEditingTitle(false)
    if (editedTitle !== memo.title) {
      await onUpdate({ title: editedTitle })
    }
  }, [editedTitle, memo.title, onUpdate])

  const handleNotesBlur = useCallback(async () => {
    if (notes !== memo.notes) {
      await onUpdate({ notes })
    }
  }, [notes, memo.notes, onUpdate])

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete()
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }, [showDeleteConfirm, onDelete])

  const togglePlay = useCallback(() => {
    if (!audioUrl) return

    if (!audioElement) {
      const audio = new Audio(audioUrl)
      audio.onended = () => setIsPlaying(false)
      audio.onerror = () => setIsPlaying(false)
      setAudioElement(audio)
      audio.play()
      setIsPlaying(true)
    } else if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      audioElement.play()
      setIsPlaying(true)
    }
  }, [audioUrl, audioElement, isPlaying])

  // Format date
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      key={memo.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col bg-surface-50 rounded-xl border border-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={memo.status} size="md" showLabel />

          <div className="flex items-center gap-2">
            {/* Play button */}
            {audioUrl && (
              <button
                onClick={togglePlay}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isPlaying
                    ? 'bg-axora-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                )}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Écouter
                  </>
                )}
              </button>
            )}

            {/* Action buttons */}
            {memo.status === 'error' && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réessayer
              </button>
            )}

            {memo.status === 'completed' && (
              <button
                onClick={onArchive}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                title="Archiver"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleDelete}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showDeleteConfirm
                  ? 'bg-red-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400'
              )}
              title={showDeleteConfirm ? 'Confirmer la suppression' : 'Supprimer'}
            >
              {showDeleteConfirm ? (
                <Check className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Title (editable) */}
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
            autoFocus
            className="w-full text-lg font-semibold bg-transparent text-white border-b border-axora-500 focus:outline-none"
          />
        ) : (
          <h2
            onClick={() => memo.status === 'completed' && setIsEditingTitle(true)}
            className={cn(
              'text-lg font-semibold text-white',
              memo.status === 'completed' && 'cursor-pointer hover:text-axora-400 transition-colors'
            )}
          >
            {memo.title || 'Memo sans titre'}
          </h2>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateTime(memo.created_at)}
          </span>
          {memo.processed_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Transcrit {formatDateTime(memo.processed_at)}
            </span>
          )}
          {memo.audio_url && (
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" />
              Audio disponible
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Transcription */}
        {memo.status === 'pending' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-white/60">En attente de transcription...</p>
            <p className="text-xs text-white/40 mt-1">
              Le traitement démarrera automatiquement
            </p>
          </div>
        )}

        {memo.status === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RotateCcw className="w-6 h-6 text-blue-400" />
              </motion.div>
            </div>
            <p className="text-white/60">Transcription en cours...</p>
            <p className="text-xs text-white/40 mt-1">
              Whisper analyse votre enregistrement
            </p>
          </div>
        )}

        {memo.status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-medium">Erreur de transcription</p>
            <p className="text-sm text-red-400/80 mt-1">
              {memo.error_message || 'Une erreur est survenue lors de la transcription.'}
            </p>
            <p className="text-xs text-white/40 mt-2">
              Tentative {memo.retry_count}/3
            </p>
          </div>
        )}

        {(memo.status === 'completed' || memo.status === 'archived') && memo.transcription && (
          <>
            {/* Copy button (prominent) */}
            <div className="mb-4">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all w-full justify-center',
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-axora-500 text-white hover:bg-axora-600'
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier la transcription
                  </>
                )}
              </button>
            </div>

            {/* Transcription text */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                Transcription
              </h3>
              <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                {memo.transcription}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Notes section (only for completed memos) */}
      {(memo.status === 'completed' || memo.status === 'archived') && (
        <div className="p-4 border-t border-white/5">
          <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            Notes personnelles
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Ajouter des notes..."
            className="w-full h-20 bg-white/5 rounded-lg p-3 text-sm text-white placeholder-white/30 border border-white/10 focus:border-axora-500/50 focus:outline-none resize-none"
          />
        </div>
      )}
    </motion.div>
  )
}
