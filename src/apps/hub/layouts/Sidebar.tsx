import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Grid3X3,
  Scan,
  MessageSquare,
  Mail,
  Settings,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { AxoraLogo } from '@apps/island/components/AxoraLogo'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/nexus', icon: Grid3X3, label: 'Nexus' },
  { path: '/phivision', icon: Scan, label: 'PhiVision' },
  { path: '/assistant', icon: MessageSquare, label: 'Assistant' },
  { path: '/messaging', icon: Mail, label: 'Messagerie' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
]

export function Sidebar() {
  return (
    <aside className="w-64 bg-surface-50 border-r border-white/5 flex flex-col">
      {/* Logo section - accounts for traffic lights on macOS */}
      <div className="h-14 flex items-center px-4 drag-region">
        <div className="flex items-center gap-3 no-drag pl-16">
          <AxoraLogo size={32} />
          <span className="text-lg font-semibold text-gradient">Axora</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-axora-500 flex items-center justify-center">
            <span className="text-sm font-medium text-white">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Pharmacien</p>
            <p className="text-xs text-white/50 truncate">Non connecté</p>
          </div>
        </div>
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          'text-sm font-medium',
          isActive
            ? 'bg-axora-500/20 text-axora-400'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="w-5 h-5" />
          <span>{label}</span>
          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute left-0 w-1 h-6 bg-axora-500 rounded-r-full"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}
