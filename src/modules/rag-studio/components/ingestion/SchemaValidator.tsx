/**
 * SchemaValidator - Affiche les résultats de validation des documents
 * Permet de voir les erreurs/warnings, corriger avec l'IA, et confirmer l'ingestion
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  FileJson,
  Wand2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { ProcessedDocument, ValidationError } from '../../types'
import { AIFixService } from '../../services/AIFixService'
import { ValidationService } from '../../services/ValidationService'

interface SchemaValidatorProps {
  documents: ProcessedDocument[]
  indexId: string
  onBack: () => void
  onContinue: (validDocs: ProcessedDocument[]) => void
  onDocumentsUpdated: (docs: ProcessedDocument[]) => void
}

export function SchemaValidator({
  documents,
  indexId,
  onBack,
  onContinue,
  onDocumentsUpdated,
}: SchemaValidatorProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(() => {
    return new Set(
      documents.filter((d) => !d.validationErrors.some((e) => e.severity === 'error')).map((d) => d.id)
    )
  })
  const [isFixing, setIsFixing] = useState(false)
  const [fixingDocId, setFixingDocId] = useState<string | null>(null)
  const [fixError, setFixError] = useState<string | null>(null)

  // Stats
  const validCount = documents.filter(
    (d) => !d.validationErrors.some((e) => e.severity === 'error')
  ).length
  const warningCount = documents.filter(
    (d) =>
      d.validationErrors.some((e) => e.severity === 'warning') &&
      !d.validationErrors.some((e) => e.severity === 'error')
  ).length
  const errorCount = documents.filter((d) =>
    d.validationErrors.some((e) => e.severity === 'error')
  ).length

  // Toggle selection
  const toggleSelection = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        const doc = documents.find((d) => d.id === docId)
        if (doc && !doc.validationErrors.some((e) => e.severity === 'error')) {
          next.add(docId)
        }
      }
      return next
    })
  }

  // Select all valid
  const selectAllValid = () => {
    setSelectedDocs(
      new Set(
        documents.filter((d) => !d.validationErrors.some((e) => e.severity === 'error')).map((d) => d.id)
      )
    )
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedDocs(new Set())
  }

  // Get document status
  const getDocStatus = (doc: ProcessedDocument) => {
    const hasErrors = doc.validationErrors.some((e) => e.severity === 'error')
    const hasWarnings = doc.validationErrors.some((e) => e.severity === 'warning')
    if (hasErrors) return 'error'
    if (hasWarnings) return 'warning'
    return 'valid'
  }

  // Handle continue
  const handleContinue = () => {
    const validDocs = documents.filter((d) => selectedDocs.has(d.id))
    onContinue(validDocs)
  }

  // Fix single document with AI
  const handleFixWithAI = async (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return

    setFixingDocId(docId)
    setIsFixing(true)
    setFixError(null)

    try {
      const result = await AIFixService.fixDocument(
        doc.originalData,
        doc.validationErrors.map((e) => ({ field: e.field, message: e.message }))
      )

      if (result.success && result.fixedDocument) {
        // Re-validate the fixed document
        const [revalidated] = ValidationService.validateBatch([result.fixedDocument], indexId)

        // Update the document in the list
        const updatedDocs = documents.map((d) =>
          d.id === docId
            ? {
                ...d,
                originalData: result.fixedDocument!,
                processedData: result.fixedDocument!,
                validationErrors: revalidated.validationErrors,
                searchableText: revalidated.searchableText,
              }
            : d
        )

        onDocumentsUpdated(updatedDocs)

        // Auto-select if now valid
        const newDoc = updatedDocs.find((d) => d.id === docId)
        if (newDoc && !newDoc.validationErrors.some((e) => e.severity === 'error')) {
          setSelectedDocs((prev) => new Set([...prev, docId]))
        }
      } else {
        setFixError(result.error || 'Erreur inconnue')
      }
    } catch (error) {
      setFixError((error as Error).message)
    } finally {
      setIsFixing(false)
      setFixingDocId(null)
    }
  }

  // Fix all documents with errors
  const handleFixAllWithAI = async () => {
    const docsWithErrors = documents.filter((d) =>
      d.validationErrors.some((e) => e.severity === 'error')
    )

    if (docsWithErrors.length === 0) return

    setIsFixing(true)
    setFixError(null)

    try {
      const results = await AIFixService.fixBatch(
        docsWithErrors.map((d) => ({
          document: d.originalData,
          validationErrors: d.validationErrors.map((e) => ({ field: e.field, message: e.message })),
        })),
        (current, total) => {
          // Progress callback - could be used for UI feedback
          console.log(`[SchemaValidator] Fixing ${current}/${total}...`)
        }
      )

      // Update all fixed documents
      let updatedDocs = [...documents]
      const newlyValidIds: string[] = []

      results.forEach((result, index) => {
        if (result.success && result.fixedDocument) {
          const docId = docsWithErrors[index].id
          const [revalidated] = ValidationService.validateBatch([result.fixedDocument], indexId)

          updatedDocs = updatedDocs.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  originalData: result.fixedDocument!,
                  processedData: result.fixedDocument!,
                  validationErrors: revalidated.validationErrors,
                  searchableText: revalidated.searchableText,
                }
              : d
          )

          if (!revalidated.validationErrors.some((e) => e.severity === 'error')) {
            newlyValidIds.push(docId)
          }
        }
      })

      onDocumentsUpdated(updatedDocs)

      // Auto-select newly valid docs
      if (newlyValidIds.length > 0) {
        setSelectedDocs((prev) => new Set([...prev, ...newlyValidIds]))
      }

      const successCount = results.filter((r) => r.success).length
      if (successCount < docsWithErrors.length) {
        setFixError(`${successCount}/${docsWithErrors.length} documents corrigés`)
      }
    } catch (error) {
      setFixError((error as Error).message)
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Validation des données</h3>
        <p className="text-sm text-white/50 mt-1">
          {documents.length} document{documents.length > 1 ? 's' : ''} analysé
          {documents.length > 1 ? 's' : ''}
        </p>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-300">
              {validCount} valide{validCount > 1 ? 's' : ''}
            </span>
          </div>
          {warningCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">
                {errorCount} erreur{errorCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Fix All button */}
          {errorCount > 0 && (
            <button
              onClick={handleFixAllWithAI}
              disabled={isFixing}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm transition-all',
                'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
                'border border-purple-500/30 hover:border-purple-400/50',
                'text-purple-300 hover:text-purple-200',
                isFixing && 'opacity-50 cursor-wait'
              )}
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {isFixing ? 'Correction...' : `Corriger tout avec l'IA (${errorCount})`}
            </button>
          )}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {fixError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300"
            >
              {fixError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selection controls */}
      <div className="px-6 py-3 border-b border-white/5 bg-surface-50/30 flex items-center justify-between">
        <span className="text-sm text-white/50">
          {selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''} sélectionné
          {selectedDocs.size > 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <button
            onClick={selectAllValid}
            className="text-xs text-axora-400 hover:text-axora-300 transition-colors"
          >
            Tout sélectionner
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={deselectAll}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-auto">
        {documents.map((doc, index) => {
          const status = getDocStatus(doc)
          const isExpanded = expandedDoc === doc.id
          const isSelected = selectedDocs.has(doc.id)
          const isDisabled = status === 'error'
          const isCurrentlyFixing = fixingDocId === doc.id
          const title =
            (doc.originalData.product_name as string) ||
            (doc.originalData.name as string) ||
            `Document ${index + 1}`

          return (
            <div key={doc.id} className="border-b border-white/5">
              {/* Document header */}
              <div
                className={cn(
                  'flex items-center gap-3 px-6 py-3 transition-colors',
                  isDisabled ? 'bg-red-500/5' : isSelected ? 'bg-axora-500/5' : 'hover:bg-white/5'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelection(doc.id)}
                  disabled={isDisabled}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    isDisabled
                      ? 'border-white/10 bg-white/5 cursor-not-allowed'
                      : isSelected
                        ? 'border-axora-500 bg-axora-500'
                        : 'border-white/20 hover:border-white/40'
                  )}
                >
                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                </button>

                {/* Status icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    status === 'valid'
                      ? 'bg-green-500/20'
                      : status === 'warning'
                        ? 'bg-amber-500/20'
                        : 'bg-red-500/20'
                  )}
                >
                  {isCurrentlyFixing ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  ) : status === 'valid' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isDisabled ? 'text-white/50' : 'text-white'
                    )}
                  >
                    {title}
                  </p>
                  {doc.validationErrors.length > 0 && (
                    <p className="text-xs text-white/40">
                      {doc.validationErrors.filter((e) => e.severity === 'error').length} erreur(s),{' '}
                      {doc.validationErrors.filter((e) => e.severity === 'warning').length} warning(s)
                    </p>
                  )}
                </div>

                {/* Fix button for single doc */}
                {status === 'error' && !isCurrentlyFixing && (
                  <button
                    onClick={() => handleFixWithAI(doc.id)}
                    disabled={isFixing}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      'bg-purple-500/10 border border-purple-500/30',
                      'text-purple-300 hover:text-purple-200 hover:border-purple-400/50',
                      isFixing && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    Corriger
                  </button>
                )}

                {/* Expand button */}
                <button
                  onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-surface-50/30 space-y-4">
                      {/* Validation errors */}
                      {doc.validationErrors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
                            Messages de validation
                          </p>
                          {doc.validationErrors.map((error, i) => (
                            <ValidationErrorItem key={i} error={error} />
                          ))}
                        </div>
                      )}

                      {/* JSON preview */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
                          Données JSON
                        </p>
                        <div className="p-3 rounded-lg bg-surface-100 border border-white/5">
                          <pre className="text-xs text-white/60 font-mono overflow-auto max-h-40">
                            {JSON.stringify(doc.originalData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-center gap-4">
            {selectedDocs.size > 0 && (
              <span className="text-sm text-white/50">
                {selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''} prêt
                {selectedDocs.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleContinue}
              disabled={selectedDocs.size === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
                selectedDocs.size > 0
                  ? 'bg-axora-500 text-white hover:bg-axora-600'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
            >
              <FileJson className="w-4 h-4" />
              Injecter {selectedDocs.size > 0 ? `(${selectedDocs.size})` : ''}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant pour afficher une erreur de validation
function ValidationErrorItem({ error }: { error: ValidationError }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        error.severity === 'error'
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-amber-500/10 border border-amber-500/20'
      )}
    >
      {error.severity === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            error.severity === 'error' ? 'text-red-300' : 'text-amber-300'
          )}
        >
          {error.message}
        </p>
        {error.suggestion && <p className="text-xs text-white/40 mt-1">💡 {error.suggestion}</p>}
        <p className="text-xs text-white/30 mt-1 font-mono">Champ: {error.field}</p>
      </div>
    </div>
  )
}
