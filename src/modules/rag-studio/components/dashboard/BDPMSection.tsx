/**
 * Section BDPM dans le Dashboard RAG Studio
 * Permet de visualiser et mettre à jour la Base de Données Publique des Médicaments
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  FileText,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { BDPMSearchService } from '@shared/services/rag/BDPMSearchService'

// ============================================
// TYPES
// ============================================

interface BDPMStats {
  totalProducts: number
  isLoading: boolean
  error: string | null
}

type IngestionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

interface IngestionState {
  status: IngestionStatus
  progress: number
  message: string
  error: string | null
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function BDPMSection() {
  const [stats, setStats] = useState<BDPMStats>({
    totalProducts: 0,
    isLoading: true,
    error: null,
  })

  const [ingestion] = useState<IngestionState>({
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
  })

  const [showInfo, setShowInfo] = useState(false)

  // Charger les stats BDPM
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = useCallback(async () => {
    setStats((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const count = await BDPMSearchService.count()
      setStats({
        totalProducts: count,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setStats({
        totalProducts: 0,
        isLoading: false,
        error: 'Impossible de charger les statistiques BDPM',
      })
    }
  }, [])

  // Ouvrir le sélecteur de dossier
  const handleSelectFolder = useCallback(() => {
    // Note: Dans Electron, on pourrait utiliser dialog.showOpenDialog
    // Pour l'instant, on affiche les instructions CLI
    setShowInfo(true)
  }, [])

  const handleRefresh = useCallback(async () => {
    await loadStats()
  }, [loadStats])

  const isProcessing = ingestion.status === 'uploading' || ingestion.status === 'processing'

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20">
            <Pill className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Base BDPM</h3>
            <p className="text-xs text-white/50">Données officielles ANSM</p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Info className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-3 rounded-xl bg-surface-100/50 border border-white/5 text-xs text-white/60 space-y-2">
              <p>
                <strong className="text-white">BDPM</strong> = Base de Données Publique des
                Médicaments
              </p>
              <p>
                Contient les données officielles de l'ANSM sur ~15 800 médicaments français : prix,
                remboursement, compositions, génériques, alertes, etc.
              </p>
              <a
                href="https://base-donnees-publique.medicaments.gouv.fr/telechargement.php"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Télécharger les fichiers
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-surface-100/30 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Médicaments</div>
          {stats.isLoading ? (
            <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
          ) : (
            <div className="text-lg font-bold text-white">
              {stats.totalProducts.toLocaleString('fr-FR')}
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-surface-100/30 border border-white/5">
          <div className="text-xs text-white/40 mb-1">Statut</div>
          <div className="flex items-center gap-1.5">
            {stats.totalProducts > 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Actif</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Vide</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ingestion progress */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="p-3 rounded-xl bg-surface-100/50 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">{ingestion.message}</span>
                <span className="text-xs text-white/40">{ingestion.progress}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${ingestion.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {(stats.error || ingestion.error) && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{stats.error || ingestion.error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSelectFolder}
          disabled={isProcessing}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            isProcessing
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          )}
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>Mettre à jour</span>
        </button>

        <button
          onClick={handleRefresh}
          disabled={stats.isLoading || isProcessing}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            stats.isLoading || isProcessing
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          )}
          title="Rafraîchir les statistiques"
        >
          <RefreshCw className={cn('w-4 h-4', stats.isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Instructions CLI */}
      {showInfo && (
        <div className="mt-4 p-3 rounded-xl bg-surface-100/30 border border-white/5">
          <div className="text-xs text-white/60 mb-2">
            <FileText className="w-3 h-3 inline mr-1" />
            Pour mettre à jour la BDPM :
          </div>
          <code className="block text-xs text-emerald-400 bg-black/30 p-2 rounded-lg overflow-x-auto">
            npm run bdpm:ingest -- /chemin/vers/fichiers/bdpm
          </code>
        </div>
      )}
    </div>
  )
}
