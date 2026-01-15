import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Grid3X3,
  Scan,
  Microscope,
  MessageSquare,
  Mail,
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
  return (
    <aside className="w-72 bg-surface-50/80 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-50 shadow-2xl">
      {/* Logo section - accounts for traffic lights on macOS */}
      <div className="h-24 flex items-center px-6 drag-region">
        <div className="flex items-center gap-4 no-drag pl-12 group cursor-pointer">
          <div className="relative">
            <AxoraLogo size={38} />
            <div className="absolute inset-0 bg-axora-500/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-wide text-white group-hover:text-axora-300 transition-colors">Axora</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium ml-0.5">PhiGenix</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold px-4 mb-2 mt-4">Menu Principal</div>
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 mx-4 mb-6 mt-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors cursor-pointer group">
        <UserMenu />
      </div>
    </aside>
  )
}

interface NavItemProps {
  path: string
  icon: React.ElementType
  label: string
}

function NavItem({ path, icon: Icon, label }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group overflow-hidden',
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
          {isActive && (
            <motion.div
              layoutId="nav-border"
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-axora-400"
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}

          {/* Icon with subtle animation */}
          <div className="relative z-10">
            <Icon
              className={cn(
                "w-[18px] h-[18px] transition-all duration-200",
                isActive ? "text-axora-400" : "text-current group-hover:scale-105"
              )}
            />
            {isActive && (
              <div className="absolute inset-0 bg-axora-400/30 blur-md -z-10" />
            )}
          </div>

          {/* Label */}
          <span className="relative z-10 tracking-wide">{label}</span>

          {/* Active indicator dot */}
          {isActive && (
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
