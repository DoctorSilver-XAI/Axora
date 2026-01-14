import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, ChevronUp, Plus, Check, X } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { AgeRange } from '../types'
import { THEMATIQUES, Thematique, getScoreColor } from '../data/thematiques'

interface ThematiquesSuggestionsProps {
  ageRange: AgeRange
  onInsert: (text: string) => void
  insertedTags: Set<string>
}

type FilterMode = 'priority' | 'all' | 'secondary' | null

export function ThematiquesSuggestions({ ageRange, onInsert, insertedTags }: ThematiquesSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('priority')
  const [showAll, setShowAll] = useState(false)

  // TODO(human): Implement the filtering logic
  // This function should categorize thematiques based on their relevance score
  // and return { priority: Thematique[], secondary: Thematique[], other: Thematique[] }
  const categorizedThematiques = useMemo(() => {
    return categorizeByRelevance(THEMATIQUES, ageRange)
  }, [ageRange])

  const displayedThematiques = useMemo(() => {
    switch (filterMode) {
      case 'priority':
        return categorizedThematiques.priority
      case 'secondary':
        return categorizedThematiques.secondary
      case 'all':
      case null:
        return [...categorizedThematiques.priority, ...categorizedThematiques.secondary, ...categorizedThematiques.other]
    }
  }, [filterMode, categorizedThematiques])

  // Reset showAll when filter changes
  const handleFilterClick = (mode: 'priority' | 'secondary' | 'all') => {
    setFilterMode(current => {
      setShowAll(false)
      return current === mode ? null : mode
    })
  }

  const handleTagClick = (thematique: Thematique) => {
    // Toggle: ajoute ou retire la thématique
    onInsert(thematique.label)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white/80">
            Thématiques suggérées
          </span>
          <span className="text-xs text-white/40">
            ({categorizedThematiques.priority.length} prioritaires pour {ageRange} ans)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filter Tabs */}
            <div className="flex gap-1 px-4 pb-3 border-b border-white/5">
              <FilterTab
                active={filterMode === 'priority'}
                onClick={() => handleFilterClick('priority')}
                label="Prioritaires"
                count={categorizedThematiques.priority.length}
                color="emerald"
              />
              <FilterTab
                active={filterMode === 'secondary'}
                onClick={() => handleFilterClick('secondary')}
                label="Secondaires"
                count={categorizedThematiques.secondary.length}
                color="cyan"
              />
              <FilterTab
                active={filterMode === 'all'}
                onClick={() => handleFilterClick('all')}
                label="Toutes"
                count={THEMATIQUES.length}
                color="white"
              />
            </div>

            {/* Tags Grid */}
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                  {(showAll ? displayedThematiques : displayedThematiques.slice(0, 15)).map((thematique, index) => (
                    <ThematiqueTag
                      key={thematique.id}
                      thematique={thematique}
                      ageRange={ageRange}
                      isInserted={insertedTags.has(thematique.label)}
                      onClick={() => handleTagClick(thematique)}
                      delay={index * 0.02}
                    />
                  ))}
                </AnimatePresence>

                {displayedThematiques.length > 15 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Voir moins
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Voir plus ({displayedThematiques.length - 15})
                      </>
                    )}
                  </button>
                )}
              </div>

              {displayedThematiques.length === 0 && (
                <p className="text-sm text-white/40 text-center py-4">
                  Aucune thématique dans cette catégorie
                </p>
              )}

              <p className="mt-3 text-xs text-white/30">
                Cliquez pour ajouter/retirer une thématique de vos notes
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FilterTab({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color: 'emerald' | 'cyan' | 'white'
}) {
  const colorClasses = {
    emerald: active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : '',
    cyan: active ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : '',
    white: active ? 'bg-white/10 text-white/80 border-white/20' : '',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
        active
          ? colorClasses[color]
          : 'bg-transparent text-white/40 border-transparent hover:text-white/60'
      )}
    >
      {label} ({count})
    </button>
  )
}

function ThematiqueTag({
  thematique,
  ageRange,
  isInserted,
  onClick,
  delay,
}: {
  thematique: Thematique
  ageRange: AgeRange
  isInserted: boolean
  onClick: () => void
  delay: number
}) {
  const score = thematique.scores[ageRange]
  const colors = getScoreColor(score)

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay, duration: 0.15 }}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer',
        isInserted
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
          : cn(
            colors.bg,
            colors.border,
            colors.text,
            'hover:scale-105 hover:shadow-lg'
          )
      )}
    >
      {isInserted ? (
        <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : (
        <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <span>{thematique.label}</span>
      {isInserted ? (
        <Check className="w-3 h-3 group-hover:hidden" />
      ) : (
        <span className="opacity-50 text-[10px]">{score}/5</span>
      )}
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper function - TODO(human)
// ─────────────────────────────────────────────────────────────────────────────

interface CategorizedThematiques {
  priority: Thematique[]   // Thématiques très pertinentes pour cet âge
  secondary: Thematique[]  // Thématiques moyennement pertinentes
  other: Thematique[]      // Thématiques peu pertinentes mais à conserver
}

function categorizeByRelevance(
  thematiques: Thematique[],
  ageRange: AgeRange
): CategorizedThematiques {
  // TODO(human): Implement the categorization logic here
  // You should decide the score thresholds for each category
  // Consider: What makes a thematique "priority" vs "secondary"?
  // Hint: Use the thematique.scores[ageRange] value (1-5)

  const priority: Thematique[] = []
  const secondary: Thematique[] = []
  const other: Thematique[] = []

  for (const t of thematiques) {
    const score = t.scores[ageRange]
    // Your categorization logic here...
    // Example structure:
    // if (score >= X) priority.push(t)
    // else if (score >= Y) secondary.push(t)
    // else other.push(t)

    // Placeholder - replace with your logic
    if (score >= 4) priority.push(t)
    else if (score >= 3) secondary.push(t)
    else other.push(t)
  }

  // Sort each category by score descending
  priority.sort((a, b) => b.scores[ageRange] - a.scores[ageRange])
  secondary.sort((a, b) => b.scores[ageRange] - a.scores[ageRange])
  other.sort((a, b) => b.scores[ageRange] - a.scores[ageRange])

  return { priority, secondary, other }
}
