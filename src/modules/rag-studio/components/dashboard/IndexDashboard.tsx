/**
 * IndexDashboard - Grille des index RAG avec stats
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Plus, Database } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { IndexRegistry } from '../../services/IndexRegistry'
import { IndexDefinition, IndexStats } from '../../types'
import { IndexCard } from './IndexCard'
import { CreateIndexModal } from './CreateIndexModal'
import { EditIndexModal } from './EditIndexModal'
import { DeleteIndexDialog } from './DeleteIndexDialog'

interface IndexDashboardProps {
  onExplore: (indexId: string) => void
  onIngest: (indexId: string) => void
}

export function IndexDashboard({ onExplore, onIngest }: IndexDashboardProps) {
  const [indexes, setIndexes] = useState<IndexDefinition[]>([])
  const [stats, setStats] = useState<Map<string, IndexStats>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [indexToEdit, setIndexToEdit] = useState<IndexDefinition | null>(null)
  const [indexToDelete, setIndexToDelete] = useState<IndexDefinition | null>(null)

  // Charger les index (y compris custom) et stats
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Charger les index custom depuis Supabase
      await IndexRegistry.loadCustomIndexes()

      const allIndexes = IndexRegistry.getAll()
      setIndexes(allIndexes)

      const allStats = await IndexRegistry.refreshAllStats()
      setStats(allStats)
    } catch (err) {
      console.error('[IndexDashboard] Erreur chargement:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Charger au montage
  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    IndexRegistry.invalidateStatsCache()
    await IndexRegistry.reloadCustomIndexes()
    await loadData()
    setIsRefreshing(false)
  }

  // Callback après création d'un index (optimisé)
  const handleIndexCreated = async () => {
    await IndexRegistry.reloadCustomIndexes()
    const allIndexes = IndexRegistry.getAll()
    setIndexes(allIndexes)
    const allStats = await IndexRegistry.refreshAllStats()
    setStats(allStats)
  }

  // Callback après modification d'un index
  const handleIndexUpdated = async () => {
    await IndexRegistry.reloadCustomIndexes()
    const allIndexes = IndexRegistry.getAll()
    setIndexes(allIndexes)
  }

  // Callback après suppression d'un index
  const handleIndexDeleted = async () => {
    await IndexRegistry.reloadCustomIndexes()
    const allIndexes = IndexRegistry.getAll()
    setIndexes(allIndexes)
    const allStats = await IndexRegistry.refreshAllStats()
    setStats(allStats)
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
            onClick={() => setShowCreateModal(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-axora-500 text-white hover:bg-axora-600'
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
                onEdit={index._isCustom ? () => setIndexToEdit(index) : undefined}
                onDelete={index._isCustom ? () => setIndexToDelete(index) : undefined}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de création */}
      <CreateIndexModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleIndexCreated}
      />

      {/* Modal d'édition */}
      <EditIndexModal
        index={indexToEdit}
        isOpen={indexToEdit !== null}
        onClose={() => setIndexToEdit(null)}
        onUpdated={handleIndexUpdated}
      />

      {/* Dialog de suppression */}
      <DeleteIndexDialog
        index={indexToDelete}
        isOpen={indexToDelete !== null}
        onClose={() => setIndexToDelete(null)}
        onDeleted={handleIndexDeleted}
      />
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
