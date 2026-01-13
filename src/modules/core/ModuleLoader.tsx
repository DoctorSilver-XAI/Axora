import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import { ModuleRegistry } from './ModuleRegistry'
import { ModuleContext, ModuleDefinition } from './types'
import { cn } from '@shared/utils/cn'

interface ModuleLoaderContextValue {
  activeModule: ModuleDefinition | null
  openModule: (moduleId: string) => void
  closeModule: () => void
  isModuleOpen: boolean
}

const ModuleLoaderContext = createContext<ModuleLoaderContextValue | null>(null)

export function useModuleLoader() {
  const context = useContext(ModuleLoaderContext)
  if (!context) {
    throw new Error('useModuleLoader must be used within ModuleLoaderProvider')
  }
  return context
}

interface ModuleLoaderProviderProps {
  children: ReactNode
}

export function ModuleLoaderProvider({ children }: ModuleLoaderProviderProps) {
  const [activeModule, setActiveModule] = useState<ModuleDefinition | null>(null)

  const openModule = useCallback((moduleId: string) => {
    const module = ModuleRegistry.get(moduleId)
    if (!module) {
      console.error(`Module "${moduleId}" not found`)
      return
    }
    if (module.status === 'coming_soon' || module.status === 'disabled') {
      console.warn(`Module "${moduleId}" is not available`)
      return
    }
    setActiveModule(module)
  }, [])

  const closeModule = useCallback(() => {
    setActiveModule(null)
  }, [])

  return (
    <ModuleLoaderContext.Provider
      value={{
        activeModule,
        openModule,
        closeModule,
        isModuleOpen: activeModule !== null,
      }}
    >
      {children}
    </ModuleLoaderContext.Provider>
  )
}

interface ModuleViewerProps {
  className?: string
}

export function ModuleViewer({ className }: ModuleViewerProps) {
  const { activeModule, closeModule } = useModuleLoader()

  if (!activeModule) return null

  const ModuleComponent = activeModule.component

  const moduleContext: ModuleContext = {
    moduleId: activeModule.id,
    close: closeModule,
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn('flex flex-col h-full', className)}
      >
        {/* Module header */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={closeModule}
              className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-axora-500/20 to-axora-600/10 flex items-center justify-center">
                <activeModule.icon className="w-5 h-5 text-axora-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{activeModule.name}</h2>
                <p className="text-sm text-white/50">{activeModule.description}</p>
              </div>
            </div>
          </div>
          <button
            onClick={closeModule}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Module content */}
        <div className="flex-1 pt-6 overflow-auto">
          <ModuleComponent />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for modules to access their context
export function useModuleContext(): ModuleContext {
  const { activeModule, closeModule } = useModuleLoader()

  if (!activeModule) {
    throw new Error('useModuleContext must be used within an active module')
  }

  return {
    moduleId: activeModule.id,
    close: closeModule,
  }
}
