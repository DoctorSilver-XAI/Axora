/**
 * Composant affichant le statut de la base BDPM locale
 * et permettant son import depuis Supabase
 */

import { useState, useEffect } from 'react'
import { Database, Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BDPMImportService, ImportProgress } from '../services/BDPMImportService'
import { cn } from '@shared/utils/cn'

export function BDPMLocalStatus() {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [medicamentCount, setMedicamentCount] = useState<number>(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const initialized = await BDPMImportService.isInitialized()
    setIsInitialized(initialized)
    if (initialized) {
      const count = await BDPMImportService.getLocalCount()
      setMedicamentCount(count)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setImportError(null)
    setImportProgress(null)

    const result = await BDPMImportService.importFromSupabase((progress) => {
      setImportProgress(progress)
    })

    setIsImporting(false)

    if (result.success) {
      await checkStatus()
    } else {
      setImportError(result.error || 'Erreur inconnue')
    }
  }

  if (isInitialized === null) {
    return null // Loading
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isInitialized ? 'bg-green-500/20' : 'bg-amber-500/20'
          )}>
            {isInitialized ? (
              <Database className="w-5 h-5 text-green-400" />
            ) : (
              <CloudOff className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              Base BDPM locale
            </p>
            <p className="text-xs text-white/60">
              {isInitialized ? (
                <>
                  <CheckCircle2 className="w-3 h-3 inline mr-1 text-green-400" />
                  {medicamentCount.toLocaleString()} médicaments · Mode hors-ligne activé
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 inline mr-1" />
                  Non initialisée · Requiert une connexion
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={isImporting}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            isImporting
              ? 'bg-white/5 text-white/40 cursor-wait'
              : 'bg-axora-500/20 text-axora-400 hover:bg-axora-500/30'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isImporting && 'animate-spin')} />
          {isImporting ? 'Import...' : isInitialized ? 'Actualiser' : 'Importer'}
        </button>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {importProgress && importProgress.step !== 'done' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-white/5"
          >
            <p className="text-xs text-white/60 mb-2">{importProgress.message}</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-axora-500"
                initial={{ width: 0 }}
                animate={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-white/5"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{importError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
