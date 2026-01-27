/**
 * Liste des génériques disponibles pour un médicament
 * Triés par prix croissant avec indicateur de disponibilité
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Pill, AlertCircle, CheckCircle2, Euro } from 'lucide-react'
import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { cn } from '@shared/utils/cn'

interface GenericsListProps {
  generiques: BDPMProduct[]
  currentDrug: BDPMProduct
  isLoading?: boolean
}

export function GenericsList({ generiques, currentDrug, isLoading }: GenericsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Filtrer le médicament actuel de la liste
  const otherGeneriques = generiques.filter((g) => g.codeCis !== currentDrug.codeCis)

  // Trier par prix croissant
  const sortedGeneriques = otherGeneriques.sort((a, b) => {
    const priceA = getLowestPrice(a)
    const priceB = getLowestPrice(b)
    if (priceA === null && priceB === null) return 0
    if (priceA === null) return 1
    if (priceB === null) return -1
    return priceA - priceB
  })

  if (sortedGeneriques.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'bg-white/5 hover:bg-white/10 transition-colors',
          isLoading && 'cursor-wait'
        )}
      >
        <div className="flex items-center gap-3">
          <Pill className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">
            {isLoading ? (
              'Chargement des génériques...'
            ) : (
              <>
                Génériques disponibles
                <span className="text-cyan-400 ml-2">({sortedGeneriques.length})</span>
              </>
            )}
          </span>
        </div>
        {!isLoading && (
          isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )
        )}
      </button>

      {/* List */}
      <AnimatePresence>
        {isExpanded && !isLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {sortedGeneriques.map((drug, index) => (
                <GenericItem key={drug.id} drug={drug} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface GenericItemProps {
  drug: BDPMProduct
  index: number
}

function GenericItem({ drug, index }: GenericItemProps) {
  const price = getLowestPrice(drug)
  const presentation = getCheapestPresentation(drug)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex items-center justify-between p-4',
        'border-t border-white/5',
        'hover:bg-white/5 transition-colors'
      )}
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm text-white truncate">{drug.productName}</p>
        <p className="text-xs text-white/40 truncate">
          {drug.laboratory || 'Laboratoire inconnu'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Prix */}
        {price !== null ? (
          <div className="text-right">
            <p className="text-sm font-medium text-white flex items-center gap-1">
              <Euro className="w-3 h-3 text-green-400" />
              {price.toFixed(2)} €
            </p>
            {presentation?.remboursement && (
              <p className="text-xs text-green-400">{presentation.remboursement}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/40">Prix N/C</p>
        )}

        {/* Disponibilité */}
        {drug.hasRupture ? (
          <div className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Rupture</span>
          </div>
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        )}
      </div>
    </motion.div>
  )
}

/**
 * Obtient le prix le plus bas parmi les présentations
 */
function getLowestPrice(drug: BDPMProduct): number | null {
  const presentations = drug.productData.presentations || []
  const prices = presentations
    .filter((p) => p.commercialise && p.prix !== null)
    .map((p) => p.prix as number)

  if (prices.length === 0) return null
  return Math.min(...prices)
}

/**
 * Obtient la présentation la moins chère
 */
function getCheapestPresentation(drug: BDPMProduct) {
  const presentations = drug.productData.presentations || []
  return presentations
    .filter((p) => p.commercialise && p.prix !== null)
    .sort((a, b) => (a.prix || 0) - (b.prix || 0))[0]
}
