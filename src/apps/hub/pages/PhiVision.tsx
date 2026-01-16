import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scan,
  Image,
  Clock,
  Trash2,
  Upload,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Star,
  Pencil,
  X,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { usePhiVision } from '@shared/contexts/PhiVisionContext'
import { CaptureService, Capture } from '@features/phivision/services/CaptureService'
import { ParsedResultView } from '@features/phivision/components/ParsedResultView'
import { AgentsSection } from '@features/phivision/components/AgentsSection'

export function PhiVisionPage() {
  const {
    status,
    capturedImage,
    result,
    error,
    history,
    triggerCapture,
    analyzeCapture,
    clearCapture,
    setManualImage,
    deleteCapture,
    toggleFavorite,
    loadHistory,
    runAgents,
    getAgentsResults,
    isRunningAgents,
  } = usePhiVision()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null)

  // Sélectionner une capture depuis l'historique
  const handleSelectCapture = (capture: Capture) => {
    setSelectedCapture(capture)
  }

  // Retour à la vue de capture
  const handleBackToCapture = () => {
    setSelectedCapture(null)
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setManualImage(base64)
    }
    reader.onerror = () => {
      console.error('Erreur lors de la lecture du fichier')
    }
    reader.readAsDataURL(file)
  }, [setManualImage])

  const handleCopy = (text?: string | null) => {
    const textToCopy = text || result?.text || selectedCapture?.rawText
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveTitle = async () => {
    if (!editingId) return
    try {
      await CaptureService.updateNotes(editingId, editTitle)
      await loadHistory()
      setEditingId(null)
      setEditTitle('')
    } catch (err) {
      console.error('Failed to update title:', err)
    }
  }

  const isProcessing = status === 'capturing' || status === 'analyzing'

  // Callback pour lancer les agents sur une capture archivée
  const handleRunAgentsOnArchive = useCallback(() => {
    if (!selectedCapture?.rawText || !selectedCapture?.id) return

    try {
      // Le rawText contient le JSON PhiBrain stringifié
      const phiBrainData = JSON.parse(selectedCapture.rawText) as Record<string, unknown>
      runAgents(selectedCapture.id, phiBrainData)
    } catch (err) {
      console.error('Failed to parse PhiBrain data from archive:', err)
    }
  }, [selectedCapture?.rawText, selectedCapture?.id, runAgents])

  // Callback pour lancer les agents sur le résultat actuel (utilise 'current' comme ID temporaire)
  const handleRunAgentsOnResult = useCallback(() => {
    if (!result?.phiBrain) return
    runAgents('current', result.phiBrain as unknown as Record<string, unknown>)
  }, [result?.phiBrain, runAgents])

  return (
    <div className="flex gap-6 h-full">
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Scan className="w-7 h-7 text-indigo-400" />
            PhiVision
          </h1>
          <p className="text-white/60 mt-1">
            Capture et analyse intelligente de documents pharmaceutiques
          </p>
        </div>

        {/* Bouton Nouvelle capture - visible après analyse */}
        <AnimatePresence>
          {(result || selectedCapture) && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <button
                onClick={() => {
                  if (selectedCapture) {
                    handleBackToCapture()
                  }
                  clearCapture()
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-axora-500 hover:bg-axora-600 text-white font-medium transition-all shadow-lg shadow-axora-500/25"
              >
                <Scan className="w-4 h-4" />
                Nouvelle capture
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-6 overflow-auto">
          {/* Vue d'une capture archivée */}
          {selectedCapture ? (
            <>
              {/* Image de la capture archivée */}
              <div className="flex-1 glass rounded-2xl p-6 flex flex-col">
                <div className="flex-1 rounded-xl bg-black/30 overflow-hidden flex items-center justify-center min-h-[300px]">
                  {selectedCapture.imageUrl ? (
                    <img
                      src={selectedCapture.imageUrl}
                      alt="Capture archivée"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/40">
                      <Image className="w-12 h-12" />
                      <p>Image non disponible</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={handleBackToCapture}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </button>

                  <button
                    onClick={() => handleCopy(selectedCapture.rawText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Copié' : 'Copier le texte'}
                  </button>
                </div>
              </div>

              {/* Données de la capture archivée */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      {selectedCapture.notes || 'Capture du ' + selectedCapture.createdAt.toLocaleDateString('fr-FR')}
                    </h3>
                    <span className="text-xs text-white/40">
                      {selectedCapture.createdAt.toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {/* Parsed Result View */}
                  <ParsedResultView rawText={selectedCapture.rawText} />

                  {/* Agents Section */}
                  <AgentsSection
                    className="mt-4"
                    agents={selectedCapture?.id ? getAgentsResults(selectedCapture.id) ?? undefined : undefined}
                    onRunAgents={handleRunAgentsOnArchive}
                    isRunning={selectedCapture?.id ? isRunningAgents(selectedCapture.id) : false}
                  />

                </div>
              </motion.div>
            </>
          ) : (
            <>
          {/* Image preview / Capture zone */}
          <div className="flex-1 glass rounded-2xl p-6 flex flex-col">
            {capturedImage ? (
              <>
                {/* Image preview */}
                <div className="flex-1 rounded-xl bg-black/30 overflow-hidden flex items-center justify-center min-h-[300px]">
                  <img
                    src={capturedImage}
                    alt="Capture"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={clearCapture}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>

                  <button
                    onClick={analyzeCapture}
                    disabled={isProcessing}
                    className={cn(
                      'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isProcessing
                        ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    )}
                  >
                    {status === 'analyzing' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Analyser avec IA
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6">
                  <motion.button
                    onClick={triggerCapture}
                    disabled={isProcessing}
                    className={cn(
                      'relative w-48 h-48 rounded-3xl mx-auto',
                      'border-2 border-dashed border-white/20',
                      'flex flex-col items-center justify-center gap-4',
                      'transition-all duration-300',
                      'hover:border-indigo-500/50 hover:bg-indigo-500/5',
                      isProcessing && 'border-indigo-500 bg-indigo-500/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isProcessing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Scan className="w-12 h-12 text-indigo-400" />
                      </motion.div>
                    ) : (
                      <Scan className="w-12 h-12 text-white/40" />
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {isProcessing ? 'Capture...' : 'Capturer l\'écran'}
                      </p>
                      <p className="text-white/40 text-sm">⌘⇧P</p>
                    </div>
                  </motion.button>

                  <div className="flex items-center gap-4 text-white/40">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-sm">ou</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-white/60 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Importer une image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {(result || error) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6"
            >
              {error ? (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              ) : result && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Résultat de l'analyse
                    </h3>
                    <button
                      onClick={() => handleCopy()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? 'Copié' : 'Copier'}
                    </button>
                  </div>

                  {/* Parsed Result View */}
                  <ParsedResultView rawText={result.phiBrain ? JSON.stringify(result.phiBrain) : result.text} />

                  {/* Agents Section */}
                  <AgentsSection
                    className="mt-6"
                    agents={getAgentsResults('current') ?? undefined}
                    onRunAgents={handleRunAgentsOnResult}
                    isRunning={isRunningAgents('current')}
                  />
                </div>
              )}
            </motion.div>
          )}
          </>
          )}
        </div>
      </div>

      {/* History sidebar */}
      <div className="w-72 glass rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/60" />
            Historique
          </h2>
        </div>

        <div className="flex-1 space-y-2 overflow-auto scrollbar-hide">
          {history.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">
              Aucune analyse
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectCapture(item)}
                className={cn(
                  'group relative p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer',
                  selectedCapture?.id === item.id && 'bg-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-4 h-4 text-white/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.notes || item.rawText?.slice(0, 25) || 'Sans titre'}
                    </p>
                    <p className="text-xs text-white/40">
                      {item.createdAt.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Actions (visibles au hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(item.id, !item.isFavorite)
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Favori"
                    >
                      <Star
                        className={cn(
                          'w-3.5 h-3.5',
                          item.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'
                        )}
                      />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(item.id)
                        setEditTitle(item.notes || '')
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="Renommer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Supprimer cette capture ?')) {
                          deleteCapture(item.id)
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de renommage */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setEditingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-100 rounded-2xl p-6 w-80 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Renommer</h3>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500 focus:outline-none transition-colors"
                placeholder="Titre de la capture"
                autoFocus
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTitle}
                  className="px-4 py-2 text-sm bg-axora-500 hover:bg-axora-600 text-white rounded-xl transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
