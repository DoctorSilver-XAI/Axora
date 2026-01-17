/**
 * CreateIndexModal - Modal pour créer un nouvel index RAG custom
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Database,
  Loader2,
  AlertCircle,
  Building2,
  FileText,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { useToast } from '@shared/contexts/ToastContext'
import { CustomIndexService } from '../../services/CustomIndexService'

interface CreateIndexModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

type ModalStep = 'preset' | 'form'

// Presets d'index suggérés
const INDEX_PRESETS = [
  {
    id: 'pharmacy_info',
    name: 'Informations Pharmacie',
    icon: Building2,
    description: 'Procédures internes, contacts, horaires, équipe...',
    suggestedSlug: 'pharmacie_info',
    suggestedIcon: 'Building2',
  },
  {
    id: 'protocols',
    name: 'Protocoles',
    icon: FileText,
    description: 'Protocoles de dispensation, TROD, vaccinations...',
    suggestedSlug: 'protocols',
    suggestedIcon: 'FileText',
  },
  {
    id: 'custom',
    name: 'Index personnalisé',
    icon: Sparkles,
    description: 'Créez un index avec vos propres données',
    suggestedSlug: '',
    suggestedIcon: 'Database',
  },
]

interface FormData {
  name: string
  slug: string
  description: string
  icon: string
}

export function CreateIndexModal({ isOpen, onClose, onCreated }: CreateIndexModalProps) {
  const toast = useToast()

  const [step, setStep] = useState<ModalStep>('preset')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
    icon: 'Database',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset le modal quand il se ferme
  const handleClose = useCallback(() => {
    onClose()
    // Reset après l'animation
    setTimeout(() => {
      setStep('preset')
      setFormData({ name: '', slug: '', description: '', icon: 'Database' })
      setError(null)
    }, 200)
  }, [onClose])

  // Sélection d'un preset
  const handlePresetSelect = (presetId: string) => {
    const preset = INDEX_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      if (preset.id !== 'custom') {
        setFormData({
          name: preset.name,
          slug: preset.suggestedSlug,
          description: preset.description,
          icon: preset.suggestedIcon,
        })
      } else {
        setFormData({ name: '', slug: '', description: '', icon: 'Database' })
      }
      setStep('form')
    }
  }

  // Normalisation du slug
  const handleSlugChange = (value: string) => {
    const normalized = CustomIndexService.normalizeSlug(value)
    setFormData((f) => ({ ...f, slug: normalized }))
    setError(null)
  }

  // Création de l'index
  const handleCreate = async () => {
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Le nom est requis')
      return
    }
    if (!formData.slug.trim()) {
      setError("L'identifiant est requis")
      return
    }
    if (formData.slug.length < 3) {
      setError("L'identifiant doit faire au moins 3 caractères")
      return
    }

    setIsCreating(true)

    try {
      // Vérifier disponibilité du slug
      const isAvailable = await CustomIndexService.isSlugAvailable(formData.slug)
      if (!isAvailable) {
        setError('Un index avec cet identifiant existe déjà')
        setIsCreating(false)
        return
      }

      await CustomIndexService.createIndex({
        name: formData.name.trim(),
        slug: formData.slug,
        description: formData.description.trim() || undefined,
        icon: formData.icon,
      })

      toast.success('Index créé', `"${formData.name}" est prêt à recevoir des données`)
      onCreated()
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setIsCreating(false)
    }
  }

  // Retour à l'étape précédente
  const handleBack = () => {
    setStep('preset')
    setError(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
                    <Database className="w-5 h-5 text-axora-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {step === 'preset' ? 'Nouvel index RAG' : "Configurer l'index"}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {step === 'preset' ? (
                  <motion.div
                    key="preset"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 space-y-3"
                  >
                    <p className="text-sm text-white/60 mb-4">
                      Choisissez un type d'index ou créez-en un personnalisé
                    </p>

                    {INDEX_PRESETS.map((preset) => {
                      const Icon = preset.icon
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handlePresetSelect(preset.id)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 transition-all text-left group',
                            'border-white/10 hover:border-axora-500/50 bg-white/5 hover:bg-axora-500/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-axora-500/20 transition-colors">
                              <Icon className="w-5 h-5 text-white/60 group-hover:text-axora-400 transition-colors" />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-white">{preset.name}</span>
                              <p className="text-sm text-white/50 mt-0.5">{preset.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-axora-400 transition-colors" />
                          </div>
                        </button>
                      )
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-4"
                  >
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
                        className={cn(
                          'w-full px-4 py-3 rounded-xl',
                          'bg-surface-50 border border-white/10 text-white',
                          'placeholder-white/30 focus:border-axora-500/50 focus:outline-none',
                          'focus:ring-2 focus:ring-axora-500/20 transition-all'
                        )}
                        autoFocus
                      />
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Identifiant unique <span className="text-axora-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="pharmacie_tassigny"
                        className={cn(
                          'w-full px-4 py-3 rounded-xl font-mono text-sm',
                          'bg-surface-50 border border-white/10 text-white',
                          'placeholder-white/30 focus:border-axora-500/50 focus:outline-none',
                          'focus:ring-2 focus:ring-axora-500/20 transition-all'
                        )}
                      />
                      <p className="text-xs text-white/40 mt-1.5">
                        Lettres minuscules, chiffres et underscores uniquement
                      </p>
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
                        className={cn(
                          'w-full px-4 py-3 rounded-xl resize-none',
                          'bg-surface-50 border border-white/10 text-white',
                          'placeholder-white/30 focus:border-axora-500/50 focus:outline-none',
                          'focus:ring-2 focus:ring-axora-500/20 transition-all'
                        )}
                      />
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="flex justify-between gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
                {step === 'form' ? (
                  <>
                    <button
                      onClick={handleBack}
                      disabled={isCreating}
                      className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={isCreating || !formData.name.trim() || !formData.slug.trim()}
                      className={cn(
                        'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                        'bg-axora-500 text-white hover:bg-axora-600',
                        (isCreating || !formData.name.trim() || !formData.slug.trim()) &&
                          'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Créer l'index
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleClose}
                    className="ml-auto px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
