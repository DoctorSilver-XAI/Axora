/**
 * RAG Studio - Composant principal avec navigation
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Search, Upload, Settings } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { RAGStudioView, RAGStudioState } from '../types'
import { IndexDashboard } from './dashboard/IndexDashboard'
import { DataExplorer } from './explorer/DataExplorer'
import { IngestionWizard } from './ingestion/IngestionWizard'
import { IndexRegistry } from '../services/IndexRegistry'

// Configuration des vues
const VIEWS: Array<{ id: RAGStudioView; label: string; icon: typeof LayoutGrid }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'explorer', label: 'Explorer', icon: Search },
  { id: 'ingestion', label: 'Ingestion', icon: Upload },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

export function RAGStudioMain() {
  const [state, setState] = useState<RAGStudioState>({
    currentView: 'dashboard',
    selectedIndexId: null,
    ingestionJob: null,
  })

  const setView = useCallback((view: RAGStudioView) => {
    setState((s) => ({ ...s, currentView: view }))
  }, [])

  const selectIndex = useCallback((indexId: string | null) => {
    setState((s) => ({ ...s, selectedIndexId: indexId }))
  }, [])

  const handleExploreIndex = useCallback((indexId: string) => {
    selectIndex(indexId)
    setView('explorer')
  }, [selectIndex, setView])

  const handleIngestIndex = useCallback((indexId: string) => {
    selectIndex(indexId)
    setView('ingestion')
  }, [selectIndex, setView])

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">
      {/* Sub-navigation */}
      <div className="px-6 py-4 border-b border-white/5 bg-surface-50/30">
        <div className="flex items-center gap-1 p-1 bg-surface-100/50 rounded-xl border border-white/5 w-fit">
          {VIEWS.map((view) => {
            const Icon = view.icon
            const isActive = state.currentView === view.id
            const isDisabled = view.id === 'settings'

            return (
              <button
                key={view.id}
                onClick={() => !isDisabled && setView(view.id)}
                disabled={isDisabled}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative',
                  isActive
                    ? 'bg-axora-500 text-white shadow-lg shadow-axora-500/20'
                    : isDisabled
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{view.label}</span>
                {isDisabled && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {state.currentView === 'dashboard' && (
              <IndexDashboard
                onExplore={handleExploreIndex}
                onIngest={handleIngestIndex}
              />
            )}

            {state.currentView === 'explorer' && (
              <DataExplorer
                indexId={state.selectedIndexId}
                onChangeIndex={selectIndex}
              />
            )}

            {state.currentView === 'ingestion' && (
              <IngestionWizard
                indexId={state.selectedIndexId || IndexRegistry.getAll()[0]?.id || 'pharmaceutical_products'}
                onComplete={() => {
                  // Refresh dashboard après ingestion
                  setView('dashboard')
                }}
              />
            )}

            {state.currentView === 'settings' && (
              <ComingSoonPlaceholder
                title="Paramètres des index"
                description="Configuration et création de nouveaux index"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Placeholder pour les fonctionnalités à venir
function ComingSoonPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="p-6 rounded-2xl bg-surface-100/50 border border-white/5 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/50">{description}</p>
        <div className="mt-4 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium inline-block">
          Bientôt disponible
        </div>
      </div>
    </div>
  )
}
