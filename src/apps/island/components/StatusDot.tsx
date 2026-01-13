import { motion } from 'framer-motion'
import { cn } from '@shared/utils/cn'

interface StatusDotProps {
  status: 'online' | 'offline' | 'busy'
  pulse?: boolean
  className?: string
}

export function StatusDot({ status, pulse = false, className }: StatusDotProps) {
  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-zinc-500',
    busy: 'bg-amber-500',
  }

  const glowColors = {
    online: 'rgba(16, 185, 129, 0.6)',
    offline: 'transparent',
    busy: 'rgba(245, 158, 11, 0.6)',
  }

  return (
    <div className={cn('relative', className)}>
      {/* Pulse ring */}
      {pulse && (
        <motion.div
          className={cn('absolute inset-0 rounded-full', statusColors[status])}
          animate={{
            scale: [1, 2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Main dot */}
      <div
        className={cn('w-2 h-2 rounded-full', statusColors[status])}
        style={{
          boxShadow: `0 0 8px ${glowColors[status]}`,
        }}
      />
    </div>
  )
}
