/**
 * HumanReviewPanel - Panel de validation humaine des documents enrichis
 * Affiche les scores de confiance et permet d'approuver/rejeter chaque document
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Info,
  Sparkles,
  Shield,
  FileJson,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { EnrichedDocument, EnrichmentService } from '../../services/EnrichmentService'

interface HumanReviewPanelProps {
  documents: EnrichedDocument[]
  onBack: () => void
  onContinue: (approvedDocs: EnrichedDocument[]) => void
  onDocumentsUpdated: (docs: EnrichedDocument[]) => void
}

export function HumanReviewPanel({
  documents,
  onBack,
  onContinue,
  onDocumentsUpdated,
}: HumanReviewPanelProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  // Stats
  const pendingCount = documents.filter((d) => d.status === 'pending').length
  const approvedCount = documents.filter((d) => d.status === 'approved').length
  const rejectedCount = documents.filter((d) => d.status === 'rejected').length

  // Approve document
  const handleApprove = (docId: string) => {
    const updated = documents.map((d) =>
      d.id === docId ? { ...d, status: 'approved' as const } : d
    )
    onDocumentsUpdated(updated)
  }

  // Reject document
  const handleReject = (docId: string) => {
    const updated = documents.map((d) =>
      d.id === docId ? { ...d, status: 'rejected' as const } : d
    )
    onDocumentsUpdated(updated)
  }

  // Approve all pending
  const handleApproveAll = () => {
    const updated = documents.map((d) =>
      d.status === 'pending' ? { ...d, status: 'approved' as const } : d
    )
    onDocumentsUpdated(updated)
  }

  // Handle continue
  const handleContinue = () => {
    const approvedDocs = documents.filter((d) => d.status === 'approved')
    onContinue(approvedDocs)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Validation humaine</h3>
        <p className="text-sm text-white/50 mt-1">
          Vérifiez les données enrichies par l'IA avant injection
        </p>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-3 mt-4">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">
                {pendingCount} à valider
              </span>
            </div>
          )}
          {approvedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">
                {approvedCount} approuvé{approvedCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">
                {rejectedCount} rejeté{rejectedCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Approve all button */}
          {pendingCount > 0 && (
            <button
              onClick={handleApproveAll}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm transition-all',
                'bg-green-500/10 border border-green-500/30',
                'text-green-300 hover:text-green-200 hover:border-green-400/50'
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Tout approuver ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-auto">
        {documents.map((doc, index) => {
          const isExpanded = expandedDoc === doc.id
          const overallConfidence = doc.confidence.overall || 0
          const title =
            (doc.enrichedData.product_name as string) ||
            (doc.originalData.product_name as string) ||
            (doc.originalData.nom as string) ||
            `Document ${index + 1}`

          return (
            <div key={doc.id} className="border-b border-white/5">
              {/* Document header */}
              <div
                className={cn(
                  'flex items-center gap-3 px-6 py-4 transition-colors',
                  doc.status === 'approved'
                    ? 'bg-green-500/5'
                    : doc.status === 'rejected'
                      ? 'bg-red-500/5'
                      : 'hover:bg-white/5'
                )}
              >
                {/* Status icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    doc.status === 'approved'
                      ? 'bg-green-500/20'
                      : doc.status === 'rejected'
                        ? 'bg-red-500/20'
                        : 'bg-purple-500/20'
                  )}
                >
                  {doc.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : doc.status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  )}
                </div>

                {/* Title and confidence */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className={cn('w-3 h-3', EnrichmentService.getConfidenceColor(overallConfidence))} />
                      <span className={cn('text-xs', EnrichmentService.getConfidenceColor(overallConfidence))}>
                        {overallConfidence}% confiance
                      </span>
                    </div>
                    {doc.warnings.length > 0 && (
                      <div className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs">{doc.warnings.length} warning{doc.warnings.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {doc.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(doc.id)}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Rejeter"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(doc.id)}
                      className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
                      title="Approuver"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
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
                      {/* Confidence breakdown */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/60 uppercase tracking-wide flex items-center gap-2">
                          <Shield className="w-3 h-3" />
                          Scores de confiance
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(doc.confidence)
                            .filter(([key]) => key !== 'overall' && key !== 'error')
                            .map(([key, value]) => (
                              <div
                                key={key}
                                className="p-2 rounded-lg bg-surface-100 border border-white/5"
                              >
                                <p className="text-xs text-white/40 capitalize">{key}</p>
                                <p className={cn('text-sm font-medium', EnrichmentService.getConfidenceColor(value as number))}>
                                  {value}%
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Warnings */}
                      {doc.warnings.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/60 uppercase tracking-wide flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Points à vérifier
                          </p>
                          <div className="space-y-1">
                            {doc.warnings.map((warning, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-300">{warning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reasoning */}
                      {doc.reasoning.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/60 uppercase tracking-wide flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            Raisonnement IA
                          </p>
                          <div className="p-3 rounded-lg bg-surface-100 border border-white/5">
                            <ul className="space-y-1">
                              {doc.reasoning.map((reason, i) => (
                                <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                                  <span className="text-white/30">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Enriched data preview */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/60 uppercase tracking-wide flex items-center gap-2">
                          <FileJson className="w-3 h-3" />
                          Données enrichies
                        </p>
                        <div className="p-3 rounded-lg bg-surface-100 border border-white/5">
                          <pre className="text-xs text-white/60 font-mono overflow-auto max-h-60">
                            {JSON.stringify(doc.enrichedData, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Original data (collapsed) */}
                      <details className="group">
                        <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                          Voir les données originales
                        </summary>
                        <div className="mt-2 p-3 rounded-lg bg-surface-100/50 border border-white/5">
                          <pre className="text-xs text-white/40 font-mono overflow-auto max-h-32">
                            {JSON.stringify(doc.originalData, null, 2)}
                          </pre>
                        </div>
                      </details>
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
            {approvedCount > 0 && (
              <span className="text-sm text-white/50">
                {approvedCount} document{approvedCount > 1 ? 's' : ''} prêt{approvedCount > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleContinue}
              disabled={approvedCount === 0}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
                approvedCount > 0
                  ? 'bg-axora-500 text-white hover:bg-axora-600'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              )}
            >
              <FileJson className="w-4 h-4" />
              Injecter ({approvedCount})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
