import { Cloud, HardDrive } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { StorageType } from '../types'

interface StorageBadgeProps {
  storageType: StorageType
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function StorageBadge({
  storageType,
  size = 'sm',
  showLabel = false,
}: StorageBadgeProps) {
  const isLocal = storageType === 'local'

  // Taille fixe pour maintenir le ratio d'aspect
  const iconSize = size === 'sm' ? 'w-3 h-3 min-w-[12px] min-h-[12px]' : 'w-4 h-4 min-w-[16px] min-h-[16px]'
  const badgeSize = size === 'sm' ? 'h-5 px-1.5' : 'h-6 px-2'

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full flex-shrink-0',
        badgeSize,
        isLocal ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
      )}
      title={isLocal ? 'Stockage local' : 'Stockage cloud'}
    >
      {isLocal ? (
        <HardDrive className={cn(iconSize, 'flex-shrink-0')} />
      ) : (
        <Cloud className={cn(iconSize, 'flex-shrink-0')} />
      )}
      {showLabel && (
        <span className={cn('font-medium whitespace-nowrap', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
          {isLocal ? 'Local' : 'Cloud'}
        </span>
      )}
    </div>
  )
}
