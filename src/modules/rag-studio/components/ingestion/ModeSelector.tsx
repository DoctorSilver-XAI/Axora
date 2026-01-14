/**
 * ModeSelector - Choix du mode d'ingestion
 * - Structuré : JSON conforme au schéma → injection directe
 * - AI-Enriched : Données brutes → enrichissement GPT → review → injection
 * - Natural Language : Texte libre → génération complète par IA → review → injection
 */

import { motion } from 'framer-motion'
import { FileJson, Sparkles, ArrowRight, MessageSquareText } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { IngestionMode } from '../../types'

interface ModeSelectorProps {
  selectedMode: IngestionMode | null
  onSelectMode: (mode: IngestionMode) => void
  onContinue: () => void
}

const MODES = [
  {
    id: 'structured' as IngestionMode,
    name: 'Import structuré',
    description: 'JSON conforme au schéma attendu',
    icon: FileJson,
    features: [
      'Validation automatique du schéma',
      'Injection directe après validation',
      'Idéal pour données déjà formatées',
    ],
    recommended: true,
  },
  {
    id: 'ai-enriched' as IngestionMode,
    name: 'Enrichissement AI',
    description: 'Données brutes enrichies par GPT-4o',
    icon: Sparkles,
    features: [
      'Génération complète à partir de données minimales',
      'Indicateurs de confiance par champ',
      'Validation humaine obligatoire',
    ],
    recommended: false,
    beta: true,
  },
  {
    id: 'natural-language' as IngestionMode,
    name: 'Langage naturel',
    description: 'Tapez simplement le nom du médicament',
    icon: MessageSquareText,
    features: [
      'Saisie en texte libre (ex: "Doliprane 500mg")',
      'Génération 100% automatique par GPT-4o',
      'Validation humaine obligatoire',
    ],
    recommended: false,
    isNew: true,
  },
]

export function ModeSelector({ selectedMode, onSelectMode, onContinue }: ModeSelectorProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">Mode d'ingestion</h3>
        <p className="text-sm text-white/50 mt-1">
          Choisissez comment vous souhaitez ajouter vos données
        </p>
      </div>

      {/* Mode cards */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {MODES.map((mode, i) => {
            const isSelected = selectedMode === mode.id
            const isDisabled = false // All modes are now enabled

            return (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => !isDisabled && onSelectMode(mode.id)}
                disabled={isDisabled}
                className={cn(
                  'relative p-6 rounded-2xl text-left transition-all',
                  'border-2',
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed border-white/5 bg-surface-50/30'
                    : isSelected
                      ? 'border-axora-500 bg-axora-500/10'
                      : 'border-white/10 bg-surface-50/50 hover:border-white/20 hover:bg-surface-100/50'
                )}
              >
                {/* Recommended badge */}
                {mode.recommended && !isDisabled && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-axora-500 text-white text-[10px] font-bold">
                    Recommandé
                  </div>
                )}

                {/* Beta badge */}
                {mode.beta && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold">
                    Beta
                  </div>
                )}

                {/* New badge */}
                {mode.isNew && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[10px] font-bold">
                    ✨ Nouveau
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    isSelected ? 'bg-axora-500/20' : 'bg-white/5'
                  )}
                >
                  <mode.icon
                    className={cn('w-6 h-6', isSelected ? 'text-axora-400' : 'text-white/60')}
                  />
                </div>

                {/* Title & description */}
                <h4 className={cn('font-semibold mb-1', isSelected ? 'text-axora-300' : 'text-white')}>
                  {mode.name}
                </h4>
                <p className="text-sm text-white/50 mb-4">{mode.description}</p>

                {/* Features list */}
                <ul className="space-y-2">
                  {mode.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-white/40">
                      <span className={cn('mt-1', isSelected ? 'text-axora-400' : 'text-white/30')}>
                        •
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 rounded-2xl border-2 border-axora-500 pointer-events-none"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Footer with continue button */}
      <div className="px-6 py-4 border-t border-white/5 bg-surface-50/30">
        <div className="flex justify-end">
          <button
            onClick={onContinue}
            disabled={!selectedMode}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all',
              selectedMode
                ? 'bg-axora-500 text-white hover:bg-axora-600'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            )}
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
