/**
 * IngestionProgress - Affiche la progression de l'ingestion
 * Montre l'embedding génération et l'insertion en base
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Database,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { ProcessedDocument } from '../../types'
import { MultiIndexService } from '@shared/services/rag/MultiIndexService'

interface IngestionProgressProps {
  documents: ProcessedDocument[]
  indexId: string
  onComplete: (results: IngestionResult[]) => void
  onReset: () => void
}

interface IngestionResult {
  docId: string
  productName: string
  success: boolean
  error?: string
  insertedId?: string
}

type IngestionPhase = 'preparing' | 'embedding' | 'inserting' | 'completed' | 'error'

export function IngestionProgress({
  documents,
  indexId,
  onComplete,
  onReset,
}: IngestionProgressProps) {
  const [phase, setPhase] = useState<IngestionPhase>('preparing')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<IngestionResult[]>([])
  const [globalError] = useState<string | null>(null)

  // Lancer l'ingestion au montage
  useEffect(() => {
    runIngestion()
  }, [])

  const runIngestion = async () => {
    setPhase('embedding')
    const newResults: IngestionResult[] = []

    for (let i = 0; i < documents.length; i++) {
      setCurrentIndex(i)
      const doc = documents[i]
      const productName =
        (doc.originalData.product_name as string) ||
        (doc.originalData.name as string) ||
        `Document ${i + 1}`

      try {
        // Phase insertion (embedding généré automatiquement par MultiIndexService)
        setPhase('inserting')

        const insertedId = await MultiIndexService.ingestDocument(
          indexId,
          doc.originalData,
          doc.searchableText || ''
        )

        newResults.push({
          docId: doc.id,
          productName,
          success: true,
          insertedId,
        })
      } catch (error) {
        console.error(`[IngestionProgress] Erreur pour ${productName}:`, error)
        newResults.push({
          docId: doc.id,
          productName,
          success: false,
          error: (error as Error).message,
        })
      }

      setResults([...newResults])
    }

    // Vérifier s'il y a des erreurs
    const hasErrors = newResults.some((r) => !r.success)
    setPhase(hasErrors ? 'error' : 'completed')
    onComplete(newResults)
  }

  const progress = documents.length > 0 ? ((currentIndex + 1) / documents.length) * 100 : 0
  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Ingestion en cours</h3>
        <p className="text-sm text-white/50 mt-1">
          {phase === 'completed'
            ? 'Ingestion terminée'
            : phase === 'error'
              ? 'Ingestion terminée avec erreurs'
              : `Traitement de ${documents.length} document${documents.length > 1 ? 's' : ''}...`}
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Progression</span>
              <span className="text-white font-medium">
                {currentIndex + 1} / {documents.length}
              </span>
            </div>
            <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  phase === 'completed'
                    ? 'bg-green-500'
                    : phase === 'error'
                      ? 'bg-amber-500'
                      : 'bg-axora-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Phase indicators */}
          <div className="grid grid-cols-3 gap-4">
            <PhaseCard
              icon={Sparkles}
              label="Préparation"
              isActive={phase === 'preparing'}
              isComplete={phase !== 'preparing'}
            />
            <PhaseCard
              icon={Sparkles}
              label="Embedding"
              isActive={phase === 'embedding'}
              isComplete={['inserting', 'completed', 'error'].includes(phase)}
            />
            <PhaseCard
              icon={Database}
              label="Insertion"
              isActive={phase === 'inserting'}
              isComplete={['completed', 'error'].includes(phase)}
            />
          </div>

          {/* Current document */}
          {phase !== 'completed' && phase !== 'error' && currentIndex < documents.length && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-surface-100 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-axora-400 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {(documents[currentIndex]?.originalData.product_name as string) ||
                      `Document ${currentIndex + 1}`}
                  </p>
                  <p className="text-xs text-white/40">
                    {phase === 'embedding' ? 'Génération de l\'embedding...' : 'Insertion en base...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Results summary */}
          {(phase === 'completed' || phase === 'error') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Summary card */}
              <div
                className={cn(
                  'p-6 rounded-2xl border text-center',
                  phase === 'completed'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                )}
              >
                {phase === 'completed' ? (
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                )}
                <h4 className="text-xl font-semibold text-white mb-2">
                  {phase === 'completed' ? 'Ingestion réussie !' : 'Ingestion partielle'}
                </h4>
                <p className="text-white/60">
                  {successCount} document{successCount > 1 ? 's' : ''} injecté
                  {successCount > 1 ? 's' : ''} avec succès
                  {failCount > 0 && `, ${failCount} erreur${failCount > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Results list */}
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.docId}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      result.success ? 'bg-green-500/5' : 'bg-red-500/5'
                    )}
                  >
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="flex-1 text-sm text-white/80">{result.productName}</span>
                    {result.success && result.insertedId && (
                      <span className="text-xs font-mono text-white/30">
                        #{result.insertedId.slice(0, 8)}
                      </span>
                    )}
                    {!result.success && result.error && (
                      <span className="text-xs text-red-400">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Global error */}
          {globalError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Erreur globale</p>
                  <p className="text-sm text-red-300/70 mt-1">{globalError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
        <div className="flex justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Nouvelle ingestion
          </button>

          {(phase === 'completed' || phase === 'error') && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-axora-500 text-white font-medium hover:bg-axora-600 transition-colors"
            >
              Terminer
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Composant pour une phase
function PhaseCard({
  icon: Icon,
  label,
  isActive,
  isComplete,
}: {
  icon: typeof Sparkles
  label: string
  isActive: boolean
  isComplete: boolean
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border text-center transition-all',
        isComplete
          ? 'bg-green-500/10 border-green-500/30'
          : isActive
            ? 'bg-axora-500/10 border-axora-500/50'
            : 'bg-surface-50/50 border-white/5'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2',
          isComplete ? 'bg-green-500/20' : isActive ? 'bg-axora-500/20' : 'bg-white/5'
        )}
      >
        {isComplete ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : isActive ? (
          <Loader2 className="w-5 h-5 text-axora-400 animate-spin" />
        ) : (
          <Icon className="w-5 h-5 text-white/30" />
        )}
      </div>
      <p
        className={cn(
          'text-sm font-medium',
          isComplete ? 'text-green-300' : isActive ? 'text-axora-300' : 'text-white/40'
        )}
      >
        {label}
      </p>
    </div>
  )
}
