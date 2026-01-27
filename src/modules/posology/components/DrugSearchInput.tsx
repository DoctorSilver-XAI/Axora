/**
 * Composant de recherche de médicaments avec autocomplete
 * Utilise la BDPM via PosologyService
 */

import { useState, useEffect, useRef } from 'react'
import { Search, Barcode, Loader2, AlertTriangle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { PosologyService } from '../services/PosologyService'
import { cn } from '@shared/utils/cn'

interface DrugSearchInputProps {
  onSelect: (drug: BDPMProduct) => void
  disabled?: boolean
}

export function DrugSearchInput({ onSelect, disabled }: DrugSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BDPMProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query || query.length < 2) {
      setResults([])
      setShowResults(false)
      setError(null)
      return
    }

    setIsSearching(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const searchResults = await PosologyService.searchDrugs(query, 5)
        setResults(searchResults)
        setShowResults(true)

        if (searchResults.length === 0) {
          setError('Aucun médicament trouvé')
        }
      } catch (err) {
        console.error('[DrugSearchInput] Erreur recherche:', err)
        setError('Erreur lors de la recherche')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (drug: BDPMProduct) => {
    onSelect(drug)
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setError(null)
    inputRef.current?.focus()
  }

  const isCIPCode = /^\d{7,13}$/.test(query.replace(/[\s-]/g, ''))

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isCIPCode ? (
            <Barcode className="w-5 h-5" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Rechercher un médicament (nom, DCI ou code CIP)..."
          disabled={disabled}
          className={cn(
            'w-full pl-12 pr-10 py-4 rounded-xl',
            'bg-white/5 border border-white/10',
            'text-white placeholder-white/30',
            'focus:border-axora-500/50 focus:outline-none focus:ring-2 focus:ring-axora-500/20',
            'transition-all',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {showResults && (results.length > 0 || error) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 rounded-xl bg-surface-100 border border-white/10 shadow-xl overflow-hidden"
          >
            {error ? (
              <div className="p-4 text-center text-white/60">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>{error}</p>
                <p className="text-xs mt-1">Essayez un autre terme ou un code CIP</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {results.map((drug, index) => (
                  <motion.button
                    key={drug.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelect(drug)}
                    className={cn(
                      'w-full p-4 text-left',
                      'hover:bg-white/5 transition-colors',
                      'border-b border-white/5 last:border-0'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{drug.productName}</p>
                        <p className="text-sm text-white/60 truncate">
                          {drug.dci || 'DCI non renseigné'} · {drug.laboratory || 'Laboratoire inconnu'}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {drug.hasRupture && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                            Rupture
                          </span>
                        )}
                        {drug.hasAlerte && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Alerte
                          </span>
                        )}
                        {drug.isGenerique && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                            Générique
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Forme pharmaceutique */}
                    {drug.formePharmaceutique && (
                      <p className="text-xs text-white/40 mt-1">{drug.formePharmaceutique}</p>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
