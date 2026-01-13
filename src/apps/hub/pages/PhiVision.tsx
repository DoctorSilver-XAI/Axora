import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Scan, Image, Clock, Trash2, Upload, Sparkles, Copy, Check, AlertCircle, Pill } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { usePhiVision } from '@shared/contexts/PhiVisionContext'
import { useState } from 'react'

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
  } = usePhiVision()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setManualImage(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isProcessing = status === 'capturing' || status === 'analyzing'

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

        {/* Content */}
        <div className="flex-1 flex flex-col gap-6">
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
                      onClick={handleCopy}
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

                  {/* Type badge */}
                  {result.analysis?.type && result.analysis.type !== 'unknown' && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 capitalize">
                        {result.analysis.type}
                      </span>
                    </div>
                  )}

                  {/* Extracted text */}
                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">Texte extrait</h4>
                    <div className="bg-surface-100 rounded-xl p-4 text-sm text-white/90 whitespace-pre-wrap max-h-48 overflow-auto">
                      {result.text}
                    </div>
                  </div>

                  {/* Medications */}
                  {result.analysis?.medications && result.analysis.medications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white/60 mb-2 flex items-center gap-1.5">
                        <Pill className="w-4 h-4" />
                        Médicaments détectés
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.medications.map((med, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-lg text-sm bg-emerald-500/20 text-emerald-300"
                          >
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {result.analysis?.summary && (
                    <div>
                      <h4 className="text-sm font-medium text-white/60 mb-2">Résumé</h4>
                      <p className="text-sm text-white/80">{result.analysis.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
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
              <button
                key={item.id}
                className="w-full p-3 rounded-xl text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.rawText?.slice(0, 30) || 'Document'}
                    </p>
                    <p className="text-xs text-white/40">
                      {item.createdAt.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
