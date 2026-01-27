import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Grid3X3,
  Scan,
  Microscope,
  MessageSquare,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { AxoraLogo } from '@apps/island/components/AxoraLogo'
import { UserMenu } from './UserMenu'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/nexus', icon: Grid3X3, label: 'Nexus' },
  { path: '/phivision', icon: Scan, label: 'PhiVision' },
  { path: '/phivision-lab', icon: Microscope, label: 'PhiVision Lab' },
  { path: '/assistant', icon: MessageSquare, label: 'Assistant' },
  { path: '/messaging', icon: Mail, label: 'Messagerie' },
]

export function Sidebar() {
  const [isCompact, setIsCompact] = useState(() => {
    const saved = localStorage.getItem('sidebar-compact')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('sidebar-compact', JSON.stringify(isCompact))
  }, [isCompact])

  const toggleSidebar = () => {
    setIsCompact(!isCompact)
  }

  return (
    <aside
      className={cn(
        "bg-surface-50/80 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-50 shadow-2xl transition-all duration-300 ease-in-out",
        isCompact ? "w-[80px]" : "w-72"
      )}
    >
      {/* Logo section - accounts for traffic lights on macOS */}
      <div className={cn(
        "h-24 flex items-center drag-region transition-all duration-300",
        isCompact ? "justify-center px-0" : "px-6"
      )}>
        <div className={cn(
          "flex items-center gap-4 no-drag group cursor-pointer transition-all duration-300",
          isCompact ? "pl-0" : "pl-12"
        )}>
          <div className="relative">
            <AxoraLogo size={38} />
            <div className="absolute inset-0 bg-axora-500/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
          </div>

          <div className={cn(
            "flex flex-col transition-all duration-200 overflow-hidden whitespace-nowrap",
            isCompact ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <span className="text-xl font-bold tracking-wide text-white group-hover:text-axora-300 transition-colors">Axora</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium ml-0.5">PhiGenix</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <div className={cn(
          "text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2 mt-4 transition-all duration-300 whitespace-nowrap overflow-hidden",
          isCompact ? "opacity-0 h-0" : "px-4 opacity-100 h-auto"
        )}>
          Menu Principal
        </div>
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} isCompact={isCompact} />
        ))}
      </nav>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="mx-auto mb-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors border border-white/5"
      >
        {isCompact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* User section */}
      <div className={cn(
        "mb-6 mt-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors cursor-pointer group",
        isCompact ? "mx-2 p-2" : "p-4 mx-4"
      )}>
        <UserMenu isCompact={isCompact} />
      </div>
    </aside>
  )
}

interface NavItemProps {
  path: string
  icon: React.ElementType
  label: string
  isCompact: boolean
}

function NavItem({ path, icon: Icon, label, isCompact }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'relative flex items-center rounded-xl transition-all duration-200 group overflow-hidden',
          isCompact ? 'justify-center p-3' : 'gap-3 px-4 py-3',
          'text-sm font-medium',
          isActive
            ? 'text-white'
            : 'text-white/50 hover:text-white/90 hover:bg-white/[0.03]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active background with subtle gradient */}
          {isActive && (
            <motion.div
              layoutId="nav-bg"
              className="absolute inset-0 bg-gradient-to-r from-axora-500/15 via-axora-500/5 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}

          {/* Active left border accent */}
          {isActive && !isCompact && (
            <motion.div
              layoutId="nav-border"
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-axora-400"
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}

          {/* Active dot for compact mode */}
          {isActive && isCompact && (
            <motion.div
              layoutId="nav-dot-compact"
              className="absolute right-1 w-1 h-1 rounded-full bg-axora-400"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
            />
          )}

          {/* Icon with subtle animation */}
          <div className="relative z-10 flex-shrink-0">
            <Icon
              className={cn(
                "transition-all duration-200",
                isCompact ? "w-6 h-6" : "w-[18px] h-[18px]",
                isActive ? "text-axora-400" : "text-current group-hover:scale-105"
              )}
            />
            {isActive && (
              <div className="absolute inset-0 bg-axora-400/30 blur-md -z-10" />
            )}
          </div>

          {/* Label */}
          <span className={cn(
            "relative z-10 tracking-wide transition-all duration-200 whitespace-nowrap",
            isCompact ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
          )}>
            {label}
          </span>

          {/* Active indicator dot */}
          {isActive && !isCompact && (
            <motion.div
              layoutId="nav-glow"
              className="absolute right-3 w-1 h-1 rounded-full bg-axora-400"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <div className="absolute inset-0 bg-axora-400 rounded-full animate-ping opacity-75" />
            </motion.div>
          )}
        </>
      )}
    </NavLink>
  )
}
