import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cloud, HardDrive, Lock, Globe } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { StorageType, AIProvider } from '../types'
import { getModelDisplayName } from '../constants/providers'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (storageType: StorageType) => void
  selectedProvider: AIProvider
  selectedModel: string
}

export function NewConversationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedProvider,
  selectedModel,
}: NewConversationModalProps) {
  const [selectedStorage, setSelectedStorage] = useState<StorageType>('cloud')

  const handleConfirm = () => {
    onConfirm(selectedStorage)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-surface-100 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full max-w-md max-h-full flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
                <h2 className="text-lg font-semibold text-white">Nouvelle conversation</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <p className="text-sm text-white/60">
                  Choisissez ou stocker cette conversation :
                </p>

                {/* Storage options */}
                <div className="space-y-3">
                  {/* Local option */}
                  <button
                    onClick={() => setSelectedStorage('local')}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 transition-all text-left',
                      selectedStorage === 'local'
                        ? 'border-axora-500 bg-axora-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          selectedStorage === 'local' ? 'bg-axora-500/20' : 'bg-white/10'
                        )}
                      >
                        <HardDrive
                          className={cn(
                            'w-5 h-5',
                            selectedStorage === 'local' ? 'text-axora-400' : 'text-white/60'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">Stockage Local</span>
                          <Lock className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <p className="text-sm text-white/50 mt-1">
                          Donnees stockees uniquement sur cet ordinateur. Plus de confidentialite,
                          pas de synchronisation.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Cloud option */}
                  <button
                    onClick={() => setSelectedStorage('cloud')}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 transition-all text-left',
                      selectedStorage === 'cloud'
                        ? 'border-axora-500 bg-axora-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          selectedStorage === 'cloud' ? 'bg-axora-500/20' : 'bg-white/10'
                        )}
                      >
                        <Cloud
                          className={cn(
                            'w-5 h-5',
                            selectedStorage === 'cloud' ? 'text-axora-400' : 'text-white/60'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">Stockage Cloud</span>
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <p className="text-sm text-white/50 mt-1">
                          Synchronise avec votre compte. Accessible depuis tous vos appareils.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Provider info */}
                <div
                  className="p-3 rounded-lg bg-white/5 text-sm text-white/50"
                  title={`API: ${selectedModel}`}
                >
                  <span className="text-white/80">{getModelDisplayName(selectedProvider, selectedModel)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-white/[0.02] flex-shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 rounded-lg bg-axora-500 text-white font-medium hover:bg-axora-600 transition-colors"
                >
                  Creer la conversation
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
