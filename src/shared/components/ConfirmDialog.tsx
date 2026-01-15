import { ReactNode, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react'
import { cn } from '@shared/utils/cn'

export type ConfirmVariant = 'danger' | 'warning' | 'default'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string | ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  icon?: 'trash' | 'logout' | 'warning'
  isLoading?: boolean
}

const variantStyles: Record<ConfirmVariant, {
  iconBg: string
  iconColor: string
  confirmButton: string
  confirmHover: string
}> = {
  danger: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    confirmButton: 'bg-red-500 text-white',
    confirmHover: 'hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    confirmButton: 'bg-amber-500 text-white',
    confirmHover: 'hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20',
  },
  default: {
    iconBg: 'bg-axora-500/10',
    iconColor: 'text-axora-400',
    confirmButton: 'bg-axora-500 text-white',
    confirmHover: 'hover:bg-axora-600 hover:shadow-lg hover:shadow-axora-500/20',
  },
}

const icons = {
  trash: Trash2,
  logout: LogOut,
  warning: AlertTriangle,
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  icon = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant]
  const IconComponent = icons[icon]

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    },
    [onClose, isLoading]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div
              className={cn(
                'relative w-full max-w-md',
                'bg-surface-100 rounded-2xl border border-white/10',
                'shadow-2xl shadow-black/40'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'absolute top-4 right-4 p-1.5 rounded-lg',
                  'text-white/40 hover:text-white hover:bg-white/10',
                  'transition-colors',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6 pt-8 flex flex-col items-center text-center">
                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mb-5',
                    styles.iconBg
                  )}
                >
                  <IconComponent className={cn('w-7 h-7', styles.iconColor)} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {title}
                </h3>

                {/* Description */}
                {description && (
                  <div className="text-sm text-white/60 leading-relaxed max-w-sm">
                    {description}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl',
                    'bg-white/5 text-white/80 font-medium',
                    'hover:bg-white/10 hover:text-white',
                    'transition-all duration-200',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl font-medium',
                    'transition-all duration-200',
                    styles.confirmButton,
                    styles.confirmHover,
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Chargement...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
