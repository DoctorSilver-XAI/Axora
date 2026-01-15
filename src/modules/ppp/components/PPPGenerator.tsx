import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Loader2, Printer, Eye, EyeOff, Eraser, FileCheck, Monitor, Upload, Trash2, Check, Mic, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@shared/utils/cn'
import { PPPData, AgeRange, PPPGenerationRequest } from '../types'
import { PPPService } from '../services/PPPService'
import { PPPStorageService } from '../services/PPPStorageService'
import { getTheme } from '../utils/themes'
import { getTemplate } from '../utils/templates'
import { detectAgeBucket, AGE_RANGES } from '../utils/age'
import { PPPDocumentV2 } from './PPPDocumentV2'
import { ThematiquesSuggestions } from './ThematiquesSuggestions'
import { AudioTranscriptionModal } from './AudioTranscriptionModal'

const PHARMACISTS = [
  'Clara El Rawadi',
  'Emma Cohen',
  'François Claron',
  'Gauthier Humbert',
  'Marjorie Lahaie',
  'Pierre Gil',
]

// Animation variants pour effet stagger premium
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

export function PPPGenerator() {
  // Form state
  const [patientName, setPatientName] = useState('')
  const [pharmacistName, setPharmacistName] = useState('')
  const [pharmacyName, setPharmacyName] = useState('Grande Pharmacie de Tassigny')
  const [ageRange, setAgeRange] = useState<AgeRange>('45-50')
  const [notes, setNotes] = useState('')
  const [imageBase64, setImageBase64] = useState<string>('')
  const [isImageValidated, setIsImageValidated] = useState(false)
  const [insertedTags, setInsertedTags] = useState<Set<string>>(new Set())

  // Generated PPP data
  const [pppData, setPppData] = useState<PPPData | null>(null)

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showAudioModal, setShowAudioModal] = useState(false)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Timer ref for progress simulation
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Smart feature: Detect age from notes
  useEffect(() => {
    const detected = detectAgeBucket(notes)
    if (detected && detected !== ageRange) {
      setAgeRange(detected)
    }
  }, [notes])

  // Apply theme based on age range
  useEffect(() => {
    const theme = getTheme(ageRange)
    const root = document.documentElement
    root.style.setProperty('--ppp-primary', theme.primaryColor)
    root.style.setProperty('--ppp-accent', theme.accentColor)
  }, [ageRange])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [])

  const simulateProgress = () => {
    setProgress(5)

    // Simulation logic matching lab/ppp-generator/js/main.js
    const phases = [
      { target: 35, min: 2, max: 10, delayMin: 250, delayMax: 600 },
      { target: 65, min: 1, max: 5, delayMin: 350, delayMax: 750 },
      { target: 92, min: 0.5, max: 4, delayMin: 300, delayMax: 650 }
    ]

    const step = () => {
      setProgress(current => {
        if (current >= 92) return current

        const phase = phases.find((p) => current < p.target) || phases[phases.length - 1]
        const increment = phase.min + Math.random() * (phase.max - phase.min)
        const nextProgress = Math.min(current + increment, phase.target)

        const delay = phase.delayMin + Math.random() * (phase.delayMax - phase.delayMin)
        progressTimerRef.current = setTimeout(step, delay)

        return nextProgress
      })
    }

    progressTimerRef.current = setTimeout(step, 250)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Basic validation
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image (JPG, PNG).')
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        setImageBase64(ev.target?.result as string)
        setIsImageValidated(false)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleScreenCapture = async () => {
    try {
      if (window.axora?.ppp?.captureScreen) {
        // Use Electron Main process capture (auto-hides window)
        const base64 = await window.axora.ppp.captureScreen()
        setImageBase64(base64)
        setIsImageValidated(false)
        setError(null)
      } else {
        // Fallback for browser dev mode (not fully supported)
        console.warn('Screen capture requires Electron environment')
        setError('Fonctionnalité disponible uniquement dans l\'application de bureau')
      }
    } catch (err) {
      console.log('Screen capture cancelled or failed', err)
      // Don't show error if user cancelled or it's just a permissions denial that was handled
    }
  }

  const handleGenerate = async () => {
    // Validation
    if (!patientName.trim()) {
      setError('Veuillez renseigner le nom du patient')
      const el = document.getElementById('input-patientName')
      el?.focus()
      return
    }
    if (!pharmacistName.trim()) {
      setError('Veuillez sélectionner un pharmacien')
      const el = document.getElementById('select-pharmacist')
      el?.focus()
      return
    }
    if (!imageBase64 && !notes.trim()) {
      setError('Veuillez fournir soit une capture du dossier pharmaceutique, soit des notes d\'entretien')
      return
    }

    setError(null)
    setIsGenerating(true)
    simulateProgress()

    try {
      const request: PPPGenerationRequest = {
        imageBase64: imageBase64 || undefined,
        notes,
        ageRange,
      }

      const generated = await PPPService.generatePPP(request)

      // Complete progress
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
      setProgress(100)

      // Construct full PPP data
      const fullPPP: PPPData = {
        patientName,
        pharmacistName,
        pharmacyName,
        date: new Date().toLocaleDateString('fr-FR'),
        ageRange,
        imageBase64: imageBase64 || undefined,
        notes,
        insights: generated.insights,
        priorities: generated.priorities,
        freins: generated.freins,
        conseils: generated.conseils,
        ressources: generated.ressources,
        suivi: generated.suivi,
        opposeMedecin: false,
      }

      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 500))

      setPppData(fullPPP)
      setShowPreview(true)

      // Save to cloud (optional, can fail silently)
      try {
        await PPPStorageService.create(fullPPP)
      } catch (saveError) {
        console.warn('Failed to save PPP to cloud:', saveError)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PPP')
      // Reset progress
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
      setProgress(0)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    if (window.axora?.ppp?.print) {
      window.axora.ppp.print()
    } else {
      window.print()
    }
  }

  const handleClear = () => {
    setPppData(null)
    setShowPreview(false)
    setNotes('')
    setInsertedTags(new Set())
    setImageBase64('')
    setIsImageValidated(false)
    setProgress(0)
    setError(null)
  }

  // Handler pour recevoir la synthèse audio
  const handleAudioTranscription = useCallback((synthesis: string) => {
    setNotes(prev => {
      if (prev.trim()) {
        return `${prev}\n\n--- Synthèse de l'entretien audio ---\n${synthesis}`
      }
      return synthesis
    })
    setShowAudioModal(false)
  }, [])

  const handleToggleThematique = useCallback((label: string) => {
    setInsertedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(label)) {
        // Retirer des notes
        setNotes(current => {
          // Supprime "• Label" ou "\n• Label"
          const patterns = [
            new RegExp(`\\n• ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
            new RegExp(`^• ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'g'),
          ]
          let result = current
          for (const pattern of patterns) {
            result = result.replace(pattern, '')
          }
          return result.trim()
        })
        newSet.delete(label)
      } else {
        // Ajouter aux notes
        setNotes(current => {
          const prefix = current.trim() ? '\n• ' : '• '
          return current + prefix + label
        })
        newSet.add(label)
      }
      return newSet
    })
  }, [])

  const handleLoadExample = () => {
    const template = getTemplate(ageRange)

    const exampleData: PPPData = {
      patientName: patientName || 'Exemple Patient',
      pharmacistName: pharmacistName || PHARMACISTS[0],
      pharmacyName,
      date: new Date().toLocaleDateString('fr-FR'),
      ageRange,
      notes: notes || 'Exemple de bilan de prévention pré-rempli',
      priorities: template.priorities,
      freins: template.freins,
      conseils: template.conseils,
      ressources: template.ressources,
      suivi: template.suivi,
      opposeMedecin: false,
    }

    setPppData(exampleData)
    setShowPreview(true)
  }

  return (
    <motion.div
      className="flex flex-col gap-6 -mx-6 h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="px-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                Module Prévention
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Plan Personnalisé de Prévention
            </h1>
            <p className="text-white/50 mt-1.5 text-[15px]">
              Générez un bilan de prévention personnalisé pour vos patients
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100/50 border border-white/5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-white/60">PhiGenix Rx</span>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6 scrollbar-thin">
        <motion.div
          className="max-w-4xl space-y-6"
          variants={containerVariants}
        >
          {/* Patient & Pharmacist Info */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Nom du patient <span className="text-emerald-400">*</span>
              </label>
              <input
                id="input-patientName"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Nom et prénom"
                className="w-full px-4 py-3 rounded-xl bg-surface-100/30 border border-white/5 text-white placeholder-white/30 focus:bg-surface-100/50 focus:border-axora-500/30 focus:outline-none transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Pharmacien <span className="text-emerald-400">*</span>
              </label>
              <select
                id="select-pharmacist"
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-100/30 border border-white/5 text-white focus:bg-surface-100/50 focus:border-axora-500/30 focus:outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="" className="bg-surface-100">Sélectionner...</option>
                {PHARMACISTS.map((name) => (
                  <option key={name} value={name} className="bg-surface-100">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Age Range - Premium Buttons */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="block text-sm font-medium text-white/70">
              Tranche d'âge
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AGE_RANGES.map((range) => (
                <motion.button
                  key={range.value}
                  onClick={() => setAgeRange(range.value)}
                  className={cn(
                    'relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden',
                    ageRange === range.value
                      ? 'text-white'
                      : 'bg-surface-100/30 border border-white/5 text-white/50 hover:text-white/80 hover:bg-surface-100/50 hover:border-white/10'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {ageRange === range.value && (
                    <motion.div
                      layoutId="age-range-bg"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 rounded-xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{range.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Image Source Selection (Screen Capture or File Upload) */}
          <motion.div variants={itemVariants} className="space-y-3">
            <label className="block text-sm font-medium text-white/70">
              Dossier pharmaceutique / Contexte médical
            </label>

            {imageBase64 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl border border-white/10 bg-surface-100/30 backdrop-blur-xl p-6 flex flex-col items-center"
              >
                <img
                  src={imageBase64}
                  alt="Capture"
                  className="h-48 object-contain rounded-xl border border-white/10 mb-5 shadow-lg"
                />

                {isImageValidated ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 text-sm font-medium">Document prêt pour l'analyse</span>
                    </div>
                    <motion.button
                      onClick={() => {
                        setImageBase64('')
                        setIsImageValidated(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer l'image
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => {
                        setImageBase64('')
                        setIsImageValidated(false)
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-100/50 border border-white/10 text-white/70 hover:bg-surface-100/70 hover:text-white transition-all text-sm font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Recommencer
                    </motion.button>

                    <motion.button
                      onClick={() => setIsImageValidated(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all text-sm font-medium shadow-lg shadow-emerald-500/25"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check className="w-4 h-4" />
                      Valider l'image
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Option 1: Screen Capture */}
                <motion.button
                  onClick={handleScreenCapture}
                  className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-white/5 bg-surface-100/30 backdrop-blur-xl hover:bg-surface-100/50 hover:border-axora-500/30 transition-all duration-300 overflow-hidden"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-axora-500/0 to-violet-500/0 group-hover:from-axora-500/10 group-hover:to-violet-500/5 transition-all duration-300" />

                  <div className="relative w-14 h-14 rounded-xl bg-axora-500/10 border border-axora-500/20 flex items-center justify-center group-hover:scale-110 group-hover:border-axora-500/40 transition-all duration-300">
                    <Monitor className="w-6 h-6 text-axora-400" />
                  </div>
                  <div className="relative text-center">
                    <span className="block font-semibold text-white mb-1">Capturer l'écran</span>
                    <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Via votre LGO ou autre fenêtre</span>
                  </div>
                </motion.button>

                {/* Option 2: File Upload */}
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-white/5 bg-surface-100/30 backdrop-blur-xl hover:bg-surface-100/50 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-teal-500/0 group-hover:from-cyan-500/10 group-hover:to-teal-500/5 transition-all duration-300" />

                  <div className="relative w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 group-hover:border-cyan-500/40 transition-all duration-300">
                    <Upload className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="relative text-center">
                    <span className="block font-semibold text-white mb-1">Importer un fichier</span>
                    <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">Images (JPEG, PNG)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </motion.button>
              </div>
            )}
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <span className="text-amber-400">💡</span>
              <span>Capturez l'historique médicamenteux de votre LGO pour une analyse complète par l'IA.</span>
            </p>
          </motion.div>

          {/* Thématiques suggérées */}
          <motion.div variants={itemVariants}>
            <ThematiquesSuggestions
              ageRange={ageRange}
              onInsert={handleToggleThematique}
              insertedTags={insertedTags}
            />
          </motion.div>

          {/* Notes */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">
                Notes de l'entretien
              </label>
              <motion.button
                onClick={() => setShowAudioModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all text-sm font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mic className="w-4 h-4" />
                Importer un enregistrement
              </motion.button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Décrivez le déroulé du bilan : sujets abordés, conseils donnés, produits vendus..."
              className="w-full px-4 py-4 rounded-xl bg-surface-100/30 border border-white/5 text-white placeholder-white/30 focus:bg-surface-100/50 focus:border-axora-500/30 focus:outline-none resize-none transition-all duration-200 scrollbar-thin"
            />
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl"
              >
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar when Generating */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-4 rounded-xl bg-surface-100/30 border border-white/5 backdrop-blur-xl"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-axora-400 animate-spin" />
                    <span className="text-sm font-medium text-white/80">Analyse en cours avec l'IA...</span>
                  </div>
                  <span className="text-sm font-semibold text-axora-400">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-surface-200/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-axora-500 via-violet-500 to-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 pt-2">
            <motion.button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                'flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all duration-200 relative overflow-hidden',
                isGenerating
                  ? 'bg-axora-500/30 text-white/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-axora-500 to-violet-500 text-white hover:from-axora-600 hover:to-violet-600 shadow-lg shadow-axora-500/25'
              )}
              whileHover={!isGenerating ? { scale: 1.01 } : {}}
              whileTap={!isGenerating ? { scale: 0.99 } : {}}
            >
              <div className="relative z-10 flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer le PPP
                  </>
                )}
              </div>
            </motion.button>

            <motion.button
              onClick={handleLoadExample}
              disabled={isGenerating}
              className="px-5 py-3.5 rounded-xl bg-surface-100/30 border border-white/5 text-white/70 hover:bg-surface-100/50 hover:text-white hover:border-white/10 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!isGenerating ? { scale: 1.02 } : {}}
              whileTap={!isGenerating ? { scale: 0.98 } : {}}
            >
              <FileCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Exemple</span>
            </motion.button>

            <AnimatePresence>
              {pppData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2"
                >
                  <motion.button
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      'px-5 py-3.5 rounded-xl border transition-all duration-200 flex items-center gap-2',
                      showPreview
                        ? 'bg-axora-500/10 border-axora-500/30 text-axora-400'
                        : 'bg-surface-100/30 border-white/5 text-white/70 hover:bg-surface-100/50 hover:text-white hover:border-white/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="text-sm font-medium">{showPreview ? 'Masquer' : 'Aperçu'}</span>
                  </motion.button>

                  <motion.button
                    onClick={handleClear}
                    className="px-5 py-3.5 rounded-xl bg-surface-100/30 border border-white/5 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="text-sm font-medium">Effacer</span>
                  </motion.button>

                  <motion.button
                    onClick={handlePrint}
                    className="px-5 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200 flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Printer className="w-4 h-4" />
                    <span className="text-sm font-medium">Imprimer</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* PPP Document (Editable) - Format A4 Paysage */}
          <AnimatePresence>
            {showPreview && pppData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 space-y-4"
              >
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-axora-500/10 border border-axora-500/20">
                  <div className="p-1.5 rounded-lg bg-axora-500/20">
                    <FileText className="w-4 h-4 text-axora-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-axora-300">Document prêt pour impression</p>
                    <p className="text-xs text-axora-400/70 mt-0.5">
                      Format A4 paysage (297mm × 210mm). Cliquez sur les lignes pour éditer avant impression.
                    </p>
                  </div>
                </div>

                {/* Document preview container */}
                <div className="-mx-6 text-black bg-white rounded-t-2xl overflow-hidden shadow-2xl">
                  <PPPDocumentV2 data={pppData} onChange={(updated) => setPppData(updated)} readOnly={false} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modal de transcription audio */}
      <AudioTranscriptionModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        onTranscriptionComplete={handleAudioTranscription}
      />
    </motion.div>
  )
}
