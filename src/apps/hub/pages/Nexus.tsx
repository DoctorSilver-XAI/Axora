import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import {
  ModuleRegistry,
  useModuleLoader,
  ModuleViewer,
  CATEGORY_LABELS,
} from '@/modules'
import type { ModuleCategory, ModuleDefinition } from '@/modules'
import { cn } from '@shared/utils/cn'

const categories: { id: ModuleCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'tools', label: 'Outils' },
  { id: 'documents', label: 'Documents' },
  { id: 'trod', label: 'TROD' },
  { id: 'reference', label: 'Référence' },
  { id: 'productivity', label: 'Productivité' },
]

export function Nexus() {
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { activeModule, openModule } = useModuleLoader()

  // Get modules from registry
  const allModules = useMemo(() => ModuleRegistry.getAll(), [])

  // Filter modules
  const filteredModules = useMemo(() => {
    let modules = allModules

    // Filter by category
    if (selectedCategory !== 'all') {
      modules = modules.filter((m) => m.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      modules = modules.filter((m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.keywords?.some((k) => k.toLowerCase().includes(query))
      )
    }

    return modules
  }, [allModules, selectedCategory, searchQuery])

  // If a module is active, show it
  if (activeModule) {
    return <ModuleViewer />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nexus</h1>
          <p className="text-white/60 mt-1">
            Modules et outils pour votre pratique quotidienne
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-axora-500/20 text-axora-400 text-sm">
          <Sparkles className="w-4 h-4" />
          {allModules.length} modules
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un module..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
              'transition-all duration-200',
              selectedCategory === category.id
                ? 'bg-axora-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Modules grid */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40">Aucun module trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={index}
              onOpen={() => openModule(module.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ModuleCardProps {
  module: ModuleDefinition
  index: number
  onOpen: () => void
}

function ModuleCard({ module, index, onOpen }: ModuleCardProps) {
  const Icon = module.icon
  const isComingSoon = module.status === 'coming_soon'
  const isBeta = module.status === 'beta'

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onOpen}
      className={cn(
        'relative p-5 rounded-2xl text-left transition-all duration-300',
        'glass hover:border-axora-500/30',
        'hover:scale-[1.02] active:scale-[0.98]',
        isComingSoon && 'opacity-60 cursor-not-allowed'
      )}
      disabled={isComingSoon}
    >
      {/* Icon */}
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
        'bg-gradient-to-br from-axora-500/20 to-axora-600/10'
      )}>
        <Icon className="w-6 h-6 text-axora-400" />
      </div>

      {/* Content */}
      <h3 className="font-semibold text-white">{module.name}</h3>
      <p className="text-sm text-white/50 mt-1 line-clamp-2">
        {module.description}
      </p>

      {/* Category badge */}
      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40">
        {CATEGORY_LABELS[module.category]}
      </span>

      {/* Status badge */}
      {isComingSoon && (
        <span className="absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
          Bientôt
        </span>
      )}
      {isBeta && (
        <span className="absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-medium bg-cyan-500/20 text-cyan-400">
          Beta
        </span>
      )}
    </motion.button>
  )
}
