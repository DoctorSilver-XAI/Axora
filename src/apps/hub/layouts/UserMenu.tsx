import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Settings, LogOut, ChevronUp } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { useAuth } from '@shared/contexts/AuthContext'

interface MenuItem {
  icon: React.ElementType
  label: string
  onClick: () => void
  danger?: boolean
}

export function UserMenu({ isCompact }: { isCompact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pharmacien'
  const email = user?.email || 'Non connecté'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P'

  const handleProfile = () => {
    navigate('/profile')
    setIsOpen(false)
  }

  const handleSettings = () => {
    navigate('/settings')
    setIsOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const menuItems: MenuItem[] = [
    { icon: User, label: 'Profil', onClick: handleProfile },
    { icon: Settings, label: 'Paramètres', onClick: handleSettings },
    { icon: LogOut, label: 'Déconnexion', onClick: handleSignOut, danger: true },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center transition-all duration-200',
          'hover:bg-white/10',
          isOpen && 'bg-white/10',
          isCompact
            ? 'w-10 h-10 rounded-full justify-center mx-auto'
            : 'w-full gap-3 px-3 py-2 rounded-xl'
        )}
      >
        <div className={cn(
          "rounded-full bg-axora-500 flex items-center justify-center flex-shrink-0",
          isCompact ? "w-8 h-8" : "w-8 h-8"
        )}>
          <span className="text-sm font-medium text-white">{initials}</span>
        </div>

        {!isCompact && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-white/50 truncate">{email}</p>
            </div>
            <ChevronUp
              className={cn(
                'w-4 h-4 text-white/40 transition-transform duration-200 flex-shrink-0',
                !isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95, x: isCompact ? 10 : 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: isCompact ? 10 : 0 }}
              exit={{ opacity: 0, y: 10, scale: 0.95, x: isCompact ? 10 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'absolute bottom-full mb-2 z-50',
                'bg-surface-100 border border-white/10 rounded-xl',
                'shadow-xl overflow-hidden',
                isCompact ? 'left-full ml-2 w-48 origin-bottom-left' : 'left-0 right-0 origin-bottom'
              )}
            >
              {menuItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm',
                      'transition-colors duration-150',
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-white/80 hover:bg-white/5 hover:text-white',
                      index !== menuItems.length - 1 && 'border-b border-white/5'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
