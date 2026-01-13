import { useState } from 'react'
import { Minus, Square, X, LogOut, User, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@shared/utils/cn'
import { useAuth } from '@shared/contexts/AuthContext'

export function Header() {
  const platform = window.axora?.platform ?? 'darwin'
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const handleMinimize = () => window.axora?.window.minimize()
  const handleMaximize = () => window.axora?.window.maximize()
  const handleClose = () => window.axora?.window.close()

  const handleSignOut = async () => {
    await signOut()
    setShowMenu(false)
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 drag-region">
      {/* Left side - empty on macOS (traffic lights handled by system) */}
      <div className="flex-1" />

      {/* Center - can be used for search or breadcrumbs */}
      <div className="flex-1 flex justify-center">
        {/* Search bar placeholder */}
      </div>

      {/* Right side - user menu + window controls */}
      <div className="flex-1 flex justify-end items-center gap-2">
        {/* User Menu */}
        <div className="relative no-drag">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium text-white">
              {initials}
            </div>
            <span className="text-sm text-white/80 hidden sm:block">{displayName}</span>
            <ChevronDown className={cn(
              'w-4 h-4 text-white/40 transition-transform',
              showMenu && 'rotate-180'
            )} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 py-1 bg-surface-50 border border-white/10 rounded-xl shadow-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-sm font-medium text-white">{displayName}</p>
                    <p className="text-xs text-white/50">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Window controls on Windows/Linux */}
        {platform !== 'darwin' && (
          <div className="flex items-center gap-1 no-drag ml-2">
            <WindowButton icon={Minus} onClick={handleMinimize} />
            <WindowButton icon={Square} onClick={handleMaximize} />
            <WindowButton icon={X} onClick={handleClose} danger />
          </div>
        )}
      </div>
    </header>
  )
}

interface WindowButtonProps {
  icon: React.ElementType
  onClick: () => void
  danger?: boolean
}

function WindowButton({ icon: Icon, onClick, danger }: WindowButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-10 h-10 flex items-center justify-center',
        'transition-colors duration-150',
        danger
          ? 'hover:bg-red-500 hover:text-white'
          : 'hover:bg-white/10 text-white/60 hover:text-white'
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
