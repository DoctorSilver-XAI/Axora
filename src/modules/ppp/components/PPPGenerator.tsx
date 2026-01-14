import { useState, useEffect } from 'react'
import { FileText, Camera, Loader2, Printer, Eye, EyeOff, Eraser, FileCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@shared/utils/cn'
import { PPPData, AgeRange, PPPGenerationRequest } from '../types'
import { PPPService } from '../services/PPPService'
import { PPPStorageService } from '../services/PPPStorageService'
import { getTheme } from '../utils/themes'
import { getTemplate } from '../utils/templates'
import { usePhiVision } from '@shared/contexts/PhiVisionContext'
import { PPPDocument } from './PPPDocument'

const AGE_RANGES: Array<{ value: AgeRange; label: string }> = [
  { value: '18-25', label: '18-25 ans' },
  { value: '45-50', label: '45-50 ans' },
  { value: '60-65', label: '60-65 ans' },
  { value: '70-75', label: '70-75 ans' },
]

const PHARMACISTS = [
  'Clara El Rawadi',
  'Emma Cohen',
  'François Claron',
  'Gauthier Humbert',
  'Marjorie Lahaie',
  'Pierre Gil',
]

export function PPPGenerator() {
  const { capturedImage, triggerCapture, status: phiVisionStatus } = usePhiVision()

  // Form state
  const [patientName, setPatientName] = useState('')
  const [pharmacistName, setPharmacistName] = useState('')
  const [pharmacyName, setPharmacyName] = useState('Grande Pharmacie de Tassigny')
  const [ageRange, setAgeRange] = useState<AgeRange>('45-50')
  const [notes, setNotes] = useState('')
  const [imageBase64, setImageBase64] = useState<string>('')

  // Generated PPP data
  const [pppData, setPppData] = useState<PPPData | null>(null)

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Sync PhiVision captured image
  useEffect(() => {
    if (capturedImage && !imageBase64) {
      setImageBase64(capturedImage)
    }
  }, [capturedImage, imageBase64])

  // Apply theme based on age range
  useEffect(() => {
    const theme = getTheme(ageRange)
    const root = document.documentElement
    root.style.setProperty('--ppp-primary', theme.primaryColor)
    root.style.setProperty('--ppp-accent', theme.accentColor)
  }, [ageRange])

  const handleGenerate = async () => {
    // Validation
    if (!patientName.trim()) {
      setError('Veuillez renseigner le nom du patient')
      return
    }
    if (!pharmacistName.trim()) {
      setError('Veuillez sélectionner un pharmacien')
      return
    }
    if (!imageBase64 && !notes.trim()) {
      setError('Veuillez fournir soit une capture du dossier pharmaceutique, soit des notes d\'entretien')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const request: PPPGenerationRequest = {
        imageBase64: imageBase64 || undefined,
        notes,
        ageRange,
      }

      const generated = await PPPService.generatePPP(request)

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

      setPppData(fullPPP)
      setShowPreview(true)

      // Save to cloud (optional, can fail silently)
      try {
        await PPPStorageService.create(fullPPP)
      } catch (saveError) {
        console.warn('Failed to save PPP to cloud:', saveError)
        // Continue anyway, user can still print
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération du PPP')
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
    setImageBase64('')
  }

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

          {/* PhiVision Capture */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Dossier pharmaceutique
            </label>
            <button
              onClick={triggerCapture}
              disabled={phiVisionStatus === 'capturing'}
              className={cn(
                'w-full p-4 rounded-lg border-2 border-dashed transition-all',
                imageBase64
                  ? 'border-axora-500/50 bg-axora-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <div className="flex items-center justify-center gap-3">
                {phiVisionStatus === 'capturing' ? (
                  <>
                    <Loader2 className="w-5 h-5 text-axora-400 animate-spin" />
                    <span className="text-sm text-white/60">Capture en cours...</span>
                  </>
                ) : imageBase64 ? (
                  <>
                    <Camera className="w-5 h-5 text-axora-400" />
                    <span className="text-sm text-white">Image capturée • Cliquez pour recapturer</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-white/40" />
                    <span className="text-sm text-white/60">Cliquez pour capturer le dossier pharmaceutique</span>
                  </>
                )}
              </div>
            </button>
          </div>

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

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
                isGenerating
                  ? 'bg-axora-500/50 text-white/50 cursor-not-allowed'
                  : 'bg-axora-500 text-white hover:bg-axora-600'
              )}
            >
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
            </button>

            <button
              onClick={handleLoadExample}
              className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
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

          {/* PPP Document (Editable) */}
          {showPreview && pppData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8"
            >
              <div className="mb-4 p-4 bg-axora-500/10 border border-axora-500/20 rounded-lg text-sm text-white">
                <strong>💡 Conseil :</strong> Cliquez sur n'importe quelle ligne pour modifier le contenu avant impression.
                Les modifications sont automatiquement sauvegardées.
              </div>
              <PPPDocument
                data={pppData}
                onChange={(updated) => setPppData(updated)}
                isPreview={false}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
