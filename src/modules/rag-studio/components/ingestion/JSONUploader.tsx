/**
 * JSONUploader - Upload fichier JSON ou paste direct
 * Supporte les fichiers .json et le collage de JSON brut
 */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileJson, Clipboard, X, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@shared/utils/cn'

interface JSONUploaderProps {
  onDataLoaded: (data: Record<string, unknown>[]) => void
  onBack: () => void
  onContinue: () => void
  loadedData: Record<string, unknown>[] | null
}

type InputMode = 'upload' | 'paste'

export function JSONUploader({ onDataLoaded, onBack, onContinue, loadedData }: JSONUploaderProps) {
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse JSON et normalise en tableau
  const parseJSON = useCallback((text: string): Record<string, unknown>[] | null => {
    try {
      const parsed = JSON.parse(text)

      // Si c'est un tableau, on le garde
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          setError('Le tableau JSON est vide')
          return null
        }
        return parsed
      }

      // Si c'est un objet unique, on le met dans un tableau
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed]
      }

      setError('Format JSON invalide : attendu un objet ou un tableau')
      return null
    } catch (e) {
      setError(`Erreur de parsing JSON : ${(e as Error).message}`)
      return null
    }
  }, [])

  // Gestion du fichier uploadé
  const handleFileChange = useCallback((file: File) => {
    setError(null)

    if (!file.name.endsWith('.json')) {
      setError('Seuls les fichiers .json sont acceptés')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseJSON(text)
      if (data) {
        onDataLoaded(data)
        setJsonText(text)
      }
    }
    reader.onerror = () => setError('Erreur lors de la lecture du fichier')
    reader.readAsText(file)
  }, [parseJSON, onDataLoaded])

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) handleFileChange(file)
  }, [handleFileChange])

  // Validation du texte collé
  const handlePasteValidate = useCallback(() => {
    setError(null)
    const data = parseJSON(jsonText)
    if (data) {
      onDataLoaded(data)
    }
  }, [jsonText, parseJSON, onDataLoaded])

  // Coller depuis le presse-papier
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJsonText(text)
      setError(null)
    } catch {
      setError('Impossible d\'accéder au presse-papier')
    }
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setJsonText('')
    setError(null)
    onDataLoaded([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onDataLoaded])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Import des données</h3>
        <p className="text-sm text-white/50 mt-1">
          Uploadez un fichier JSON ou collez directement vos données
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setInputMode('upload')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                inputMode === 'upload'
                  ? 'bg-axora-500/20 text-axora-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              <Upload className="w-4 h-4" />
              Fichier
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                inputMode === 'paste'
                  ? 'bg-axora-500/20 text-axora-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              <Clipboard className="w-4 h-4" />
              Coller JSON
            </button>
          </div>

          {/* Upload zone */}
          <AnimatePresence mode="wait">
            {inputMode === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                    isDragging
                      ? 'border-axora-500 bg-axora-500/10'
                      : loadedData && loadedData.length > 0
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-white/20 hover:border-white/40 bg-surface-50/50'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    className="hidden"
                  />

                  {loadedData && loadedData.length > 0 ? (
                    <div className="space-y-3">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                      <p className="text-white font-medium">
                        {loadedData.length} document{loadedData.length > 1 ? 's' : ''} chargé{loadedData.length > 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReset()
                        }}
                        className="text-sm text-white/50 hover:text-white underline"
                      >
                        Charger un autre fichier
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FileJson className="w-12 h-12 text-white/30 mx-auto" />
                      <p className="text-white/60">
                        Glissez un fichier <span className="text-axora-400 font-mono">.json</span> ici
                      </p>
                      <p className="text-sm text-white/40">ou cliquez pour parcourir</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="paste"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <textarea
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value)
                      setError(null)
                    }}
                    placeholder='{"product_code": "...", "product_name": "...", ...}'
                    className={cn(
                      'w-full h-64 p-4 rounded-xl font-mono text-sm',
                      'bg-surface-100 border border-white/10 text-white',
                      'placeholder-white/30 focus:border-axora-500/50 focus:outline-none resize-none'
                    )}
                  />

                  {/* Paste button */}
                  <button
                    onClick={handlePasteFromClipboard}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Coller depuis le presse-papier"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePasteValidate}
                    disabled={!jsonText.trim()}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl font-medium transition-colors',
                      jsonText.trim()
                        ? 'bg-axora-500 text-white hover:bg-axora-600'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    )}
                  >
                    Valider le JSON
                  </button>

                  {loadedData && loadedData.length > 0 && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {loadedData && loadedData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-green-300">
                      {loadedData.length} document{loadedData.length > 1 ? 's' : ''} chargé{loadedData.length > 1 ? 's' : ''}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-start gap-3 mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Erreur</p>
                  <p className="text-sm text-red-300/70 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* JSON Preview (collapsed) */}
          {loadedData && loadedData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl bg-surface-100 border border-white/5"
            >
              <p className="text-xs text-white/40 mb-2">Aperçu (premier document)</p>
              <pre className="text-xs text-white/60 font-mono overflow-auto max-h-32">
                {JSON.stringify(loadedData[0], null, 2)}
              </pre>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer with navigation */}
      <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <button
            onClick={onContinue}
            disabled={!loadedData || loadedData.length === 0}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
              loadedData && loadedData.length > 0
                ? 'bg-axora-500 text-white hover:bg-axora-600'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            )}
          >
            Valider
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
