/**
 * AIEnrichmentPipeline - Orchestrateur du pipeline d'enrichissement AI
 * Gère le flux : Upload → Enrichissement GPT-4o → Review humain → Injection
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { EnrichmentService, EnrichedDocument } from '../../services/EnrichmentService'
import { HumanReviewPanel } from './HumanReviewPanel'
import { ProcessedDocument } from '../../types'
import { ValidationService } from '../../services/ValidationService'

interface AIEnrichmentPipelineProps {
  rawDocuments: Record<string, unknown>[]
  indexId: string
  onBack: () => void
  onContinue: (validDocs: ProcessedDocument[]) => void
}

type PipelinePhase = 'enriching' | 'reviewing'

export function AIEnrichmentPipeline({
  rawDocuments,
  indexId,
  onBack,
  onContinue,
}: AIEnrichmentPipelineProps) {
  const [phase, setPhase] = useState<PipelinePhase>('enriching')
  const [enrichedDocuments, setEnrichedDocuments] = useState<EnrichedDocument[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentDocName, setCurrentDocName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Start enrichment on mount
  useEffect(() => {
    runEnrichment()
  }, [])

  const runEnrichment = async () => {
    setPhase('enriching')
    setError(null)

    try {
      const results = await EnrichmentService.enrichBatch(
        rawDocuments,
        (current, _total, docName) => {
          setCurrentIndex(current)
          setCurrentDocName(docName)
        }
      )

      setEnrichedDocuments(results)
      setPhase('reviewing')
    } catch (err) {
      console.error('[AIEnrichmentPipeline] Erreur:', err)
      setError((err as Error).message)
    }
  }

  // Handle review continue
  const handleReviewContinue = (approvedDocs: EnrichedDocument[]) => {
    // Convert EnrichedDocument to ProcessedDocument for injection
    const processedDocs: ProcessedDocument[] = approvedDocs.map((doc) => {
      // Validate the enriched document
      const [validated] = ValidationService.validateBatch([doc.enrichedData], indexId)

      return {
        id: doc.id,
        originalData: doc.enrichedData, // Use enriched data as the source
        processedData: doc.enrichedData,
        validationErrors: validated.validationErrors,
        enrichmentStatus: 'completed' as const,
        enrichmentNotes: doc.reasoning,
        humanReviewRequired: false,
        humanReviewCompleted: true,
        searchableText: validated.searchableText,
      }
    })

    onContinue(processedDocs)
  }

  // Enrichment loading phase
  if (phase === 'enriching') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Enrichissement en cours</h3>
          <p className="text-sm text-white/50 mt-1">
            GPT-4o analyse et enrichit vos données...
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Animated icon */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'loop',
              }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto"
            >
              <Sparkles className="w-10 h-10 text-purple-400" />
            </motion.div>

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Progression</span>
                <span className="text-white font-medium">
                  {currentIndex} / {rawDocuments.length}
                </span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentIndex / rawDocuments.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current document */}
            {currentDocName && (
              <motion.div
                key={currentDocName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-surface-100 border border-white/10"
              >
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{currentDocName}</p>
                    <p className="text-xs text-white/40">Enrichissement en cours...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-300">Erreur</p>
                    <p className="text-sm text-red-300/70 mt-0.5">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info */}
            <p className="text-xs text-white/30">
              L'IA génère des données complètes avec scores de confiance.
              <br />
              Vous pourrez valider chaque document à l'étape suivante.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
          <button
            onClick={onBack}
            disabled={currentIndex > 0 && currentIndex < rawDocuments.length}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              currentIndex > 0 && currentIndex < rawDocuments.length
                ? 'text-white/20 cursor-not-allowed'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // Review phase
  return (
    <HumanReviewPanel
      documents={enrichedDocuments}
      onBack={onBack}
      onContinue={handleReviewContinue}
      onDocumentsUpdated={setEnrichedDocuments}
    />
  )
}
