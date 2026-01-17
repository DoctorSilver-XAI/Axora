/**
 * DeleteIndexDialog - Dialog de confirmation de suppression d'index custom
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { useToast } from '@shared/contexts/ToastContext'
import { CustomIndexService } from '../../services/CustomIndexService'
import { IndexDefinition } from '../../types'

interface DeleteIndexDialogProps {
  index: IndexDefinition | null
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}

export function DeleteIndexDialog({ index, isOpen, onClose, onDeleted }: DeleteIndexDialogProps) {
  const toast = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleClose = () => {
    if (isDeleting) return
    setConfirmText('')
    onClose()
  }

  const handleDelete = async () => {
    if (!index?._customId) return

    setIsDeleting(true)

    try {
      await CustomIndexService.deleteIndex(index._customId)
      toast.success('Index supprimé', `"${index.name}" a été supprimé définitivement`)
      onDeleted()
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      toast.error('Erreur', msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = confirmText.toLowerCase() === 'supprimer'

  return (
    <AnimatePresence>
      {isOpen && index && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-surface-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-md pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-500/20">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Supprimer l'index</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Warning */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-red-300 font-medium">
                      Cette action est irréversible
                    </p>
                    <p className="text-sm text-red-300/70">
                      Tous les documents de l'index <strong>"{index.name}"</strong> seront
                      définitivement supprimés.
                    </p>
                  </div>
                </div>

                {/* Confirmation input */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Tapez <span className="font-mono text-red-400">supprimer</span> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="supprimer"
                    disabled={isDeleting}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'bg-surface-50 border border-white/10 text-white',
                      'placeholder-white/30 focus:border-red-500/50 focus:outline-none',
                      'focus:ring-2 focus:ring-red-500/20 transition-all',
                      'disabled:opacity-50'
                    )}
                    autoFocus
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                <button
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || !canDelete}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                    'bg-red-500 text-white hover:bg-red-600',
                    (isDeleting || !canDelete) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
