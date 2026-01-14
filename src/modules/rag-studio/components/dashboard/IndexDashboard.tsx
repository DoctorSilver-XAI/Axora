/**
 * IndexDashboard - Grille des index RAG avec stats
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Plus, Database } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { IndexRegistry } from '../../services/IndexRegistry'
import { IndexDefinition, IndexStats } from '../../types'
import { IndexCard } from './IndexCard'

interface IndexDashboardProps {
  onExplore: (indexId: string) => void
  onIngest: (indexId: string) => void
}

export function IndexDashboard({ onExplore, onIngest }: IndexDashboardProps) {
  const [indexes, setIndexes] = useState<IndexDefinition[]>([])
  const [stats, setStats] = useState<Map<string, IndexStats>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Charger les index et stats au montage
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const allIndexes = IndexRegistry.getAll()
      setIndexes(allIndexes)

      const allStats = await IndexRegistry.refreshAllStats()
      setStats(allStats)
    } catch (err) {
      console.error('[IndexDashboard] Erreur chargement:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    IndexRegistry.invalidateStatsCache()
    await loadData()
    setIsRefreshing(false)
  }

  // Calcul des stats globales
  const totalDocuments = Array.from(stats.values()).reduce((sum, s) => sum + s.documentCount, 0)
  const healthyCount = Array.from(stats.values()).filter((s) => s.health === 'healthy').length
  const totalIndexes = indexes.length

  return (
    <div className="p-6 space-y-6">
      {/* Header avec stats globales */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Index RAG</h2>
          <p className="text-sm text-white/50 mt-1">
            {totalIndexes} index · {totalDocuments} documents · {healthyCount}/{totalIndexes} healthy
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10',
              isRefreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Rafraîchir
          </button>

          <button
            disabled
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-axora-500/20 text-axora-400 cursor-not-allowed opacity-50'
            )}
          >
            <Plus className="w-4 h-4" />
            Nouvel index
          </button>
        </div>
      </div>

      {/* Grille des index */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-surface-100/50 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : indexes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indexes.map((index, i) => (
            <motion.div
              key={index.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <IndexCard
                index={index}
                stats={stats.get(index.id) || null}
                onExplore={() => onExplore(index.id)}
                onIngest={() => onIngest(index.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-surface-50/30 border border-white/5 border-dashed">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Database className="w-8 h-8 text-white/20" />
      </div>
      <p className="text-white/60 text-lg">Aucun index RAG configuré</p>
      <p className="text-white/40 text-sm mt-1">
        Créez votre premier index pour commencer
      </p>
    </div>
  )
}
