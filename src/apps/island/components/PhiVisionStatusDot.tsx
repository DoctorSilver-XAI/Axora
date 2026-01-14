import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@shared/utils/cn'

export type PhiVisionStatus = 'idle' | 'capturing' | 'analyzing' | 'complete' | 'error'

interface PhiVisionStatusDotProps {
  status: PhiVisionStatus
  showRipple?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const COLORS = {
  idle: {
    bg: '#10b981', // emerald-500
    glow: 'rgba(16, 185, 129, 0.6)',
    tailwind: 'bg-emerald-500',
  },
  capturing: {
    bg: '#f59e0b', // amber-500
    glow: 'rgba(245, 158, 11, 0.6)',
    tailwind: 'bg-amber-500',
  },
  analyzing: {
    bg: '#818cf8', // indigo-400
    glow: 'rgba(129, 140, 248, 0.6)',
    tailwind: 'bg-indigo-400',
  },
  complete: {
    bg: '#22d3ee', // cyan-400
    glow: 'rgba(34, 211, 238, 0.8)',
    tailwind: 'bg-cyan-400',
  },
  error: {
    bg: '#ef4444', // red-500
    glow: 'rgba(239, 68, 68, 0.6)',
    tailwind: 'bg-red-500',
  },
} as const

export function PhiVisionStatusDot({
  status,
  showRipple = false,
  size = 'sm',
  className,
}: PhiVisionStatusDotProps) {
  const color = COLORS[status]
  const isAnalyzing = status === 'analyzing'
  const isComplete = status === 'complete'
  const isCapturing = status === 'capturing'

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <div className={cn('relative', className)}>
      {/* Ripple effect for complete state - multiple rings */}
      <AnimatePresence>
        {showRipple && isComplete && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color.bg }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: color.bg }}
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Pulse ring for analyzing - expanding outward */}
      {isAnalyzing && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color.bg }}
          animate={{
            scale: [1, 2.5],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Quick flash for capturing */}
      {isCapturing && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color.bg }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.8, 0.3, 0.8],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main dot with smooth color transition */}
      <motion.div
        className={cn('rounded-full', dotSize)}
        style={{ backgroundColor: color.bg }}
        animate={
          isAnalyzing
            ? { scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }
            : isComplete && showRipple
              ? { scale: [1, 1.3, 1] }
              : isCapturing
                ? { scale: [1, 1.1, 1] }
                : { scale: 1 }
        }
        transition={
          isAnalyzing
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : isCapturing
              ? { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
        }
        initial={false}
        layoutId="phivision-status-dot"
      />

      {/* Glow effect with smooth transition */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          boxShadow:
            isComplete && showRipple
              ? [
                  `0 0 8px ${color.glow}`,
                  `0 0 24px ${color.glow}`,
                  `0 0 12px ${color.glow}`,
                ]
              : `0 0 8px ${color.glow}`,
        }}
        transition={
          isComplete && showRipple
            ? { duration: 0.6, ease: 'easeOut' }
            : { duration: 0.3 }
        }
      />
    </div>
  )
}

export { COLORS as PHIVISION_COLORS }
