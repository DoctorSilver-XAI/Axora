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

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1',
        isLocal ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
      )}
      title={isLocal ? 'Stockage local' : 'Stockage cloud'}
    >
      {isLocal ? <HardDrive className={iconSize} /> : <Cloud className={iconSize} />}
      {showLabel && (
        <span className={cn('font-medium', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
          {isLocal ? 'Local' : 'Cloud'}
        </span>
      )}
    </div>
  )
}
