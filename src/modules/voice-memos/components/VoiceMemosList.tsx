import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Trash2, RotateCcw, Archive, ArchiveRestore, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { VoiceMemo } from '../types'
import { StatusBadge } from './StatusBadge'

interface VoiceMemosListProps {
  memos: VoiceMemo[]
  selectedMemo: VoiceMemo | null
  isLoading: boolean
  showArchived: boolean
  onSelectMemo: (memo: VoiceMemo) => void
  onArchive: (id: string) => void
  onRestore?: (id: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
  onToggleArchived: () => void
}

export function VoiceMemosList({
  memos,
  selectedMemo,
  isLoading,
  showArchived,
  onSelectMemo,
  onArchive,
  onRestore,
  onDelete,
  onRetry,
  onToggleArchived,
}: VoiceMemosListProps) {

  // Formatage de la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Trier par date décroissante
  const sortedMemos = useMemo(() => {
    return [...memos].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [memos])

  return (
    <div className="w-72 flex flex-col bg-surface-50 rounded-xl border border-white/5 ml-6">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Memos vocaux</h3>
          <span className="text-xs text-white/40">{memos.length}</span>
        </div>

        {/* Toggle archives */}
        <button
          onClick={onToggleArchived}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors',
            showArchived
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          )}
        >
          {showArchived ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Masquer les archives
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Afficher les archives
            </>
          )}
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : sortedMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Mic className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-sm text-white/40">Aucun memo vocal</p>
            <p className="text-xs text-white/30 mt-1">
              Enregistrez depuis votre iPhone
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedMemos.map((memo, index) => (
              <motion.div
                key={memo.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <button
                  onClick={() => onSelectMemo(memo)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-colors group mb-1',
                    'hover:bg-white/5',
                    selectedMemo?.id === memo.id && 'bg-white/10'
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <StatusBadge status={memo.status} size="sm" />
                    <span className="text-xs text-white/40">
                      {formatDate(memo.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <p className={cn(
                    'text-sm font-medium truncate',
                    memo.status === 'archived' ? 'text-white/40' : 'text-white'
                  )}>
                    {memo.title || 'Memo sans titre'}
                  </p>

                  {/* Transcription preview */}
                  {memo.transcription && (
                    <p className="text-xs text-white/40 truncate mt-1">
                      {memo.transcription.slice(0, 80)}...
                    </p>
                  )}

                  {/* Error message */}
                  {memo.status === 'error' && memo.error_message && (
                    <p className="text-xs text-red-400/80 mt-1 truncate">
                      {memo.error_message}
                    </p>
                  )}

                  {/* Actions (visible on hover) */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Retry button for errors */}
                    {memo.status === 'error' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRetry(memo.id)
                        }}
                        className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="Réessayer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}

                    {/* Archive/Restore button */}
                    {memo.status === 'archived' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestore?.(memo.id)
                        }}
                        className="p-1.5 rounded bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                        title="Restaurer"
                      >
                        <ArchiveRestore className="w-3 h-3" />
                      </button>
                    ) : memo.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onArchive(memo.id)
                        }}
                        className="p-1.5 rounded bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                        title="Archiver"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(memo.id)
                      }}
                      className="p-1.5 rounded bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
