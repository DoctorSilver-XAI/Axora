import { cn } from '@shared/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  lines?: number
  animate?: boolean
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseStyles = cn(
    'bg-white/5 relative overflow-hidden',
    animate && 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent'
  )

  const variantStyles = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyles, variantStyles[variant])}
            style={{
              ...style,
              width: i === lines - 1 ? '60%' : style.width,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
    />
  )
}

// Preset variants for common use cases
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '70%' : '100%'}
          height={16}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl bg-white/5 border border-white/10 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton variant="rounded" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height={14} />
        <Skeleton variant="text" width="50%" height={12} />
      </div>
    </div>
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      width={120}
      height={40}
      className={className}
    />
  )
}

export function SkeletonInput({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      width="100%"
      height={44}
      className={className}
    />
  )
}

// Module card skeleton for Nexus
export function SkeletonModuleCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4', className)}>
      <div className="flex items-start justify-between">
        <Skeleton variant="rounded" width={48} height={48} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="60%" height={18} />
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="80%" height={14} />
      </div>
    </div>
  )
}

// Conversation item skeleton for Assistant
export function SkeletonConversation({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3', className)}>
      <SkeletonAvatar size={32} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="80%" height={14} />
        <Skeleton variant="text" width="50%" height={12} />
      </div>
    </div>
  )
}

// Message bubble skeleton
export function SkeletonMessage({ isUser = false, className }: { isUser?: boolean; className?: string }) {
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse', className)}>
      <SkeletonAvatar size={32} />
      <div className={cn('max-w-[70%] space-y-2 p-3 rounded-2xl bg-white/5', isUser && 'bg-cyan-500/10')}>
        <Skeleton variant="text" width={200} height={14} />
        <Skeleton variant="text" width={150} height={14} />
      </div>
    </div>
  )
}
