import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Loader2, Printer, Eye, EyeOff, Eraser, FileCheck, Monitor, Upload, Image as ImageIcon, X, Trash2, Check } from 'lucide-react'
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

const PHARMACISTS = [
  'Clara El Rawadi',
  'Emma Cohen',
  'François Claron',
  'Gauthier Humbert',
  'Marjorie Lahaie',
  'Pierre Gil',
]

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
    <div className="flex flex-col gap-6 -mx-6 h-full">
      {/* Header */}
      <div className="px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-axora-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-axora-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Plan Personnalisé de Prévention</h2>
            <p className="text-sm text-white/60">
              Générez un bilan de prévention personnalisé pour vos patients
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6">
        <div className="max-w-4xl space-y-6">
          {/* Patient & Pharmacist Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Nom du patient *
              </label>
              <input
                id="input-patientName"
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Nom et prénom"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Pharmacien *
              </label>
              <select
                id="select-pharmacist"
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-axora-500/50 focus:outline-none"
              >
                <option value="">Sélectionner...</option>
                {PHARMACISTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Tranche d'âge
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AGE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setAgeRange(range.value)}
                  className={cn(
                    'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    ageRange === range.value
                      ? 'bg-axora-500 border-axora-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Source Selection (Screen Capture or File Upload) */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Dossier pharmaceutique / Contexte médical
            </label>

            {imageBase64 ? (
              <div className="relative rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center">
                <img
                  src={imageBase64}
                  alt="Capture"
                  className="h-48 object-contain rounded-lg border border-white/10 mb-4"
                />

                {isImageValidated ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                      <FileCheck className="w-5 h-5" />
                      Document prêt pour l'analyse
                    </div>
                    <button
                      onClick={() => {
                        setImageBase64('')
                        setIsImageValidated(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer l'image
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setImageBase64('')
                        setIsImageValidated(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Recommencer
                    </button>

                    <button
                      onClick={() => setIsImageValidated(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-medium shadow-lg shadow-emerald-500/20"
                    >
                      <Check className="w-4 h-4" />
                      Valider l'image
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Option 1: Screen Capture */}
                <button
                  onClick={handleScreenCapture}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:border-axora-500/50 hover:bg-axora-500/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-200/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Monitor className="w-6 h-6 text-axora-400" />
                  </div>
                  <div className="text-center">
                    <span className="block font-medium text-white mb-1">Capturer l'écran</span>
                    <span className="text-xs text-white/50">Via votre LGO ou une autre fenêtre</span>
                  </div>
                </button>

                {/* Option 2: File Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-200/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="text-center">
                    <span className="block font-medium text-white mb-1">Importer un fichier</span>
                    <span className="text-xs text-white/50">Images (JPEG, PNG)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-white/40">
              💡 Astuce : Capturez l'historique médicamenteux de votre logiciel (LGO) pour permettre à l'IA d'analyser le dossier complet.
            </p>
          </div>

          {/* Thématiques suggérées */}
          <ThematiquesSuggestions
            ageRange={ageRange}
            onInsert={handleToggleThematique}
            insertedTags={insertedTags}
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Notes de l'entretien
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Décrivez le déroulé du bilan : sujets abordés, conseils donnés, produits vendus..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
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
                className="space-y-2"
              >
                <div className="flex justify-between text-xs text-white/60 font-medium">
                  <span>Analyse en cours avec l'IA...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-axora-600 to-axora-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all relative overflow-hidden',
                isGenerating
                  ? 'bg-axora-500/50 text-white/50 cursor-not-allowed'
                  : 'bg-axora-500 text-white hover:bg-axora-600'
              )}
            >
              <div className="relative z-10 flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Générer le PPP
                  </>
                )}
              </div>
            </button>

            <button
              onClick={handleLoadExample}
              disabled={isGenerating}
              className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileCheck className="w-5 h-5" />
              Remplir l'exemple
            </button>

            {pppData && (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  {showPreview ? 'Masquer' : 'Aperçu'}
                </button>

                <button
                  onClick={handleClear}
                  className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Eraser className="w-5 h-5" />
                  Effacer
                </button>

                <button
                  onClick={handlePrint}
                  className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Imprimer
                </button>
              </>
            )}
          </div>

          {/* PPP Document (Editable) - Format A4 Paysage */}
          {showPreview && pppData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 -mx-6 text-black bg-white"
            >
              <div className="mb-4 mx-6 p-4 bg-axora-500/10 border border-axora-500/20 rounded-lg text-sm text-axora-700">
                <strong>💡 Conseil :</strong> Document optimisé pour impression A4 paysage (297mm × 210mm). Cliquez
                sur les lignes pour éditer avant impression.
              </div>
              <PPPDocumentV2 data={pppData} onChange={(updated) => setPppData(updated)} readOnly={false} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
