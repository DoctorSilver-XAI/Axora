import { Minus, Square, X } from 'lucide-react'
import { cn } from '@shared/utils/cn'

export function Header() {
  const platform = window.axora?.platform ?? 'darwin'

  const handleMinimize = () => window.axora?.window.minimize()
  const handleMaximize = () => window.axora?.window.maximize()
  const handleClose = () => window.axora?.window.close()

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 drag-region">
      {/* Left side - empty on macOS (traffic lights handled by system) */}
      <div className="flex-1" />

      {/* Center - can be used for search or breadcrumbs */}
      <div className="flex-1 flex justify-center">
        {/* Search bar placeholder */}
      </div>

      {/* Right side - window controls */}
      <div className="flex-1 flex justify-end items-center gap-2">
        {/* Window controls on Windows/Linux */}
        {platform !== 'darwin' && (
          <div className="flex items-center gap-1 no-drag">
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
