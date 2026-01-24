/**
 * RAGSourcesIndicator - Affiche les sources RAG utilisées pour une réponse
 * Permet de visualiser si le système RAG a été utilisé et quelles sources
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, ChevronDown, ChevronUp, Clock, Search, Pill, Package } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { RAGTrace, RAGSource } from '../types'

interface RAGSourcesIndicatorProps {
  trace: RAGTrace
  className?: string
}

export function RAGSourcesIndicator({ trace, className }: RAGSourcesIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Si RAG non utilisé, afficher un indicateur discret
  if (!trace.used) {
    return (
      <div className={cn('flex items-center gap-1.5 text-[10px] text-white/30', className)}>
        <Database className="w-3 h-3" />
        <span>Sans contexte RAG</span>
      </div>
    )
  }

  const searchTypeLabels: Record<RAGTrace['searchType'], string> = {
    hybrid: 'Recherche hybride',
    exact_cip: 'Code CIP exact',
    exact_cis: 'Code CIS exact',
    dci: 'Recherche DCI',
    none: 'Aucune recherche',
  }

  const bdpmCount = trace.sources.filter(s => s.type === 'bdpm').length

  return (
    <div className={cn('mt-2', className)}>
      {/* Badge cliquable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-200',
          'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15',
          'text-[10px] text-emerald-400'
        )}
      >
        <Database className="w-3 h-3" />
        <span className="font-medium">
          {trace.sources.length} source{trace.sources.length > 1 ? 's' : ''} RAG
        </span>
        {bdpmCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            BDPM
          </span>
        )}
        <span className="text-white/30">•</span>
        <span className="text-white/40">{trace.durationMs}ms</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </button>

      {/* Panel détaillé */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-surface-100/50 border border-white/5 space-y-3">
              {/* Métadonnées de recherche */}
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5 text-white/40">
                  <Search className="w-3 h-3" />
                  <span>{searchTypeLabels[trace.searchType]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40">
                  <Clock className="w-3 h-3" />
                  <span>{trace.durationMs}ms</span>
                </div>
              </div>

              {/* Requête */}
              <div className="text-[10px]">
                <span className="text-white/40">Requête:</span>
                <p className="text-white/60 mt-0.5 line-clamp-2">
                  "{trace.query.slice(0, 100)}{trace.query.length > 100 ? '...' : ''}"
                </p>
              </div>

              {/* Liste des sources */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-white/40">Sources utilisées:</span>
                {trace.sources.map((source, idx) => (
                  <SourceItem key={source.id || idx} source={source} />
                ))}
              </div>

              {/* Légende */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-[9px] text-white/30">
                <div className="flex items-center gap-1">
                  <Pill className="w-2.5 h-2.5 text-emerald-400" />
                  <span>BDPM = Données officielles ANSM</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Custom = Catalogue enrichi</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SourceItem({ source }: { source: RAGSource }) {
  const isBDPM = source.type === 'bdpm'

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg',
        isBDPM ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-cyan-500/5 border border-cyan-500/10'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isBDPM ? (
          <Pill className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        ) : (
          <Package className="w-3 h-3 text-cyan-400 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className={cn('text-[10px] font-medium truncate', isBDPM ? 'text-emerald-300' : 'text-cyan-300')}>
            {source.name}
          </p>
          {source.dci && (
            <p className="text-[9px] text-white/40 truncate">
              DCI: {source.dci}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ScoreBar score={source.score} />
        <span className="text-[9px] text-white/30">{(source.score * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const percentage = Math.min(100, Math.max(0, score * 100))
  const color = percentage > 70 ? 'bg-emerald-500' : percentage > 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
