/**
 * IndexCard - Carte d'un index RAG avec stats et actions
 */

import { Search, Upload, CheckCircle, AlertTriangle, XCircle, Trash2, Settings } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { IndexDefinition, IndexStats } from '../../types'
import { CATEGORY_LABELS } from '../../services/IndexRegistry'

interface IndexCardProps {
  index: IndexDefinition
  stats: IndexStats | null
  onExplore: () => void
  onIngest: () => void
  onEdit?: () => void // Optionnel, pour les custom indexes
  onDelete?: () => void // Optionnel, pour les custom indexes
}

export function IndexCard({ index, stats, onExplore, onIngest, onEdit, onDelete }: IndexCardProps) {
  const Icon = index.icon

  // Formatage du nombre de documents
  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  // Formatage de la date relative
  const formatRelativeDate = (date: Date | null) => {
    if (!date) return 'Jamais'

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Icône et couleur de santé
  const getHealthDisplay = () => {
    if (!stats) return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' }

    switch (stats.health) {
      case 'healthy':
        return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' }
      case 'error':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
    }
  }

  const health = getHealthDisplay()
  const HealthIcon = health.icon

  return (
    <div
      className={cn(
        'relative p-5 rounded-2xl transition-all group',
        'bg-surface-100/40 backdrop-blur-xl border border-white/5',
        'hover:border-axora-500/30 hover:shadow-lg hover:shadow-axora-500/5'
      )}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
          'bg-gradient-to-br from-axora-500/5 to-cyan-500/5'
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br from-axora-500/20 to-cyan-500/10',
              'group-hover:scale-105 transition-transform'
            )}
          >
            <Icon className="w-6 h-6 text-axora-400" />
          </div>

          <div>
            <h3 className="font-semibold text-white group-hover:text-axora-300 transition-colors">
              {index.name}
            </h3>
            <span className="text-xs text-white/40 uppercase tracking-wider">
              {CATEGORY_LABELS[index.category]}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className={cn('px-2 py-1 rounded-full flex items-center gap-1.5', health.bg)}>
          <HealthIcon className={cn('w-3 h-3', health.color)} />
          <span className={cn('text-xs font-medium', health.color)}>
            {stats?.health === 'healthy' ? 'OK' : stats?.health === 'error' ? 'Erreur' : 'Chargement'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/50 mb-4 line-clamp-2 relative">{index.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 relative">
        <div className="p-3 rounded-xl bg-white/5">
          <p className="text-xs text-white/40 mb-1">Documents</p>
          <p className="text-lg font-bold text-white">
            {stats ? formatCount(stats.documentCount) : '—'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/5">
          <p className="text-xs text-white/40 mb-1">Dernière MAJ</p>
          <p className="text-sm font-medium text-white/80">
            {stats ? formatRelativeDate(stats.lastIngestion) : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 relative">
        <button
          onClick={onExplore}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'bg-axora-500/10 text-axora-400 font-medium text-sm',
            'hover:bg-axora-500/20 transition-colors'
          )}
        >
          <Search className="w-4 h-4" />
          Explorer
        </button>

        <button
          onClick={onIngest}
          disabled={!index._isCustom}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
            index._isCustom
              ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors'
              : 'bg-white/5 text-white/40 cursor-not-allowed opacity-50'
          )}
          title={index._isCustom ? 'Importer des documents' : 'Index système (lecture seule)'}
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* Bouton édition (custom indexes uniquement) */}
        {index._isCustom && onEdit && (
          <button
            onClick={onEdit}
            className={cn(
              'flex items-center justify-center p-2.5 rounded-xl',
              'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors'
            )}
            title="Modifier l'index"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Bouton suppression (custom indexes uniquement) */}
        {index._isCustom && onDelete && (
          <button
            onClick={onDelete}
            className={cn(
              'flex items-center justify-center p-2.5 rounded-xl',
              'bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors'
            )}
            title="Supprimer l'index"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Beta badge for module */}
      {index.status === 'maintenance' && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
          Maintenance
        </div>
      )}
    </div>
  )
}
