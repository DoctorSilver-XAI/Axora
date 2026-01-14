/**
 * NaturalLanguagePipeline - Pipeline d'enrichissement avec Mistral AI
 * Spécialisé pour le mode langage naturel avec sources françaises
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { MistralEnrichmentService, MistralEnrichedDocument } from '../../services/MistralEnrichmentService'
import { MistralReviewPanel } from './MistralReviewPanel'
import { ProcessedDocument } from '../../types'
import { ValidationService } from '../../services/ValidationService'

interface NaturalLanguagePipelineProps {
  productNames: string[]
  indexId: string
  onBack: () => void
  onContinue: (validDocs: ProcessedDocument[]) => void
}

type PipelinePhase = 'enriching' | 'reviewing'

export function NaturalLanguagePipeline({
  productNames,
  indexId,
  onBack,
  onContinue,
}: NaturalLanguagePipelineProps) {
  const [phase, setPhase] = useState<PipelinePhase>('enriching')
  const [enrichedDocuments, setEnrichedDocuments] = useState<MistralEnrichedDocument[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentProductName, setCurrentProductName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Start enrichment on mount
  useEffect(() => {
    runEnrichment()
  }, [])

  const runEnrichment = async () => {
    setPhase('enriching')
    setError(null)

    try {
      const results = await MistralEnrichmentService.enrichBatch(
        productNames,
        (current, _total, productName) => {
          setCurrentIndex(current)
          setCurrentProductName(productName)
        }
      )

      setEnrichedDocuments(results)
      setPhase('reviewing')
    } catch (err) {
      console.error('[NaturalLanguagePipeline] Erreur:', err)
      setError((err as Error).message)
    }
  }

  // Handle review continue
  const handleReviewContinue = (approvedDocs: MistralEnrichedDocument[]) => {
    // Convert MistralEnrichedDocument to ProcessedDocument for injection
    const processedDocs: ProcessedDocument[] = approvedDocs.map((doc) => {
      // Validate the enriched document
      const [validated] = ValidationService.validateBatch([doc.enrichedData], indexId)

      return {
        id: doc.id,
        originalData: doc.enrichedData,
        processedData: doc.enrichedData,
        validationErrors: validated.validationErrors,
        enrichmentStatus: 'completed' as const,
        enrichmentNotes: [...doc.reasoning, ...doc.sources.map(s => `Source: ${s}`)],
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
          <h3 className="text-lg font-semibold text-white">Génération en cours</h3>
          <p className="text-sm text-white/50 mt-1">
            Mistral AI analyse les sources pharmaceutiques françaises...
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
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </motion.div>

            {/* Progress */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Progression</span>
                <span className="text-white font-medium">
                  {currentIndex} / {productNames.length}
                </span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentIndex / productNames.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current product */}
            {currentProductName && (
              <motion.div
                key={currentProductName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-surface-100 border border-white/10"
              >
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{currentProductName}</p>
                    <p className="text-xs text-white/40">Recherche dans les bases françaises...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sources info */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-300">Sources consultées</p>
                  <ul className="text-xs text-blue-300/70 mt-1 space-y-0.5">
                    <li>• Base de données publique des médicaments (ANSM)</li>
                    <li>• Thériaque / Vidal</li>
                    <li>• Agence européenne des médicaments (EMA)</li>
                  </ul>
                </div>
              </div>
            </div>

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
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
          <button
            onClick={onBack}
            disabled={currentIndex > 0 && currentIndex < productNames.length}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              currentIndex > 0 && currentIndex < productNames.length
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
    <MistralReviewPanel
      documents={enrichedDocuments}
      onBack={onBack}
      onContinue={handleReviewContinue}
      onDocumentsUpdated={setEnrichedDocuments}
    />
  )
}
