import { Clock, Loader2, CheckCircle2, AlertCircle, Archive } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { VoiceMemoStatus } from '../types'
import { STATUS_CONFIG } from '../types'

interface StatusBadgeProps {
  status: VoiceMemoStatus
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const ICONS = {
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Archive,
}

export function StatusBadge({ status, size = 'sm', showLabel = false }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = ICONS[config.iconName]

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const padding = showLabel
    ? size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
    : size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        config.bgColor,
        padding
      )}
    >
      <Icon
        className={cn(
          iconSize,
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  )
}
