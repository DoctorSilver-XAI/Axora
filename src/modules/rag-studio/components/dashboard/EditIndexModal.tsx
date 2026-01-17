/**
 * EditIndexModal - Modal pour modifier un index RAG custom existant
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { useToast } from '@shared/contexts/ToastContext'
import { CustomIndexService } from '../../services/CustomIndexService'
import { IndexDefinition } from '../../types'

interface EditIndexModalProps {
  index: IndexDefinition | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

interface FormData {
  name: string
  description: string
  icon: string
}

const AVAILABLE_ICONS = [
  'Database',
  'Building2',
  'FileText',
  'Sparkles',
  'ClipboardList',
]

export function EditIndexModal({ index, isOpen, onClose, onUpdated }: EditIndexModalProps) {
  const toast = useToast()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    icon: 'Database',
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialiser le formulaire avec les données de l'index
  useEffect(() => {
    if (index && isOpen) {
      setFormData({
        name: index.name,
        description: index.description || '',
        icon: 'Database', // TODO: extraire l'icône de l'index
      })
      setError(null)
    }
  }, [index, isOpen])

  const handleClose = useCallback(() => {
    if (isUpdating) return
    onClose()
  }, [isUpdating, onClose])

  const handleUpdate = async () => {
    if (!index?._customId) return

    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom est requis')
      return
    }

    setIsUpdating(true)

    try {
      await CustomIndexService.updateIndex(index._customId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
      })

      toast.success('Index mis à jour', `"${formData.name}" a été modifié`)
      onUpdated()
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      setError(msg)
    } finally {
      setIsUpdating(false)
    }
  }

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-surface-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-lg pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-axora-500/20">
                    <Settings className="w-5 h-5 text-axora-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Modifier l'index</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isUpdating}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Nom de l'index <span className="text-axora-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((f) => ({ ...f, name: e.target.value }))
                      setError(null)
                    }}
                    placeholder="Ex: Pharmacie de Tassigny"
                    disabled={isUpdating}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'bg-surface-50 border border-white/10 text-white',
                      'placeholder-white/30 focus:border-axora-500/50 focus:outline-none',
                      'focus:ring-2 focus:ring-axora-500/20 transition-all',
                      'disabled:opacity-50'
                    )}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Informations spécifiques à la pharmacie..."
                    rows={3}
                    disabled={isUpdating}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl resize-none',
                      'bg-surface-50 border border-white/10 text-white',
                      'placeholder-white/30 focus:border-axora-500/50 focus:outline-none',
                      'focus:ring-2 focus:ring-axora-500/20 transition-all',
                      'disabled:opacity-50'
                    )}
                  />
                </div>

                {/* Icône */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Icône
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, icon: iconName }))}
                        disabled={isUpdating}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          formData.icon === iconName
                            ? 'bg-axora-500/20 text-axora-400 border-2 border-axora-500'
                            : 'bg-white/5 text-white/60 border-2 border-transparent hover:bg-white/10',
                          'disabled:opacity-50'
                        )}
                      >
                        {iconName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-300">{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                <button
                  onClick={handleClose}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating || !formData.name.trim()}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                    'bg-axora-500 text-white hover:bg-axora-600',
                    (isUpdating || !formData.name.trim()) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
