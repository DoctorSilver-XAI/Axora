import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, Command, Grid3X3 } from 'lucide-react'
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
}

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
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <Grid3X3 className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-white/40">
              Centre de modules
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Nexus
          </h1>
          <p className="text-white/50 mt-2 text-[15px]">
            Hub central de vos outils pharmaceutiques
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100/50 border border-white/5 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-axora-400" />
          <span className="text-xs font-medium text-white/60">{allModules.length} modules</span>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div
        variants={itemVariants}
        className="bg-surface-50/30 p-2 rounded-2xl border border-white/5 backdrop-blur-xl flex flex-col md:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-axora-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un module..."
            className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-surface-100/30 border border-white/5 text-sm text-white placeholder-white/40 focus:bg-surface-100/50 focus:border-axora-500/30 focus:outline-none transition-all duration-200"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            <Command className="w-2.5 h-2.5 text-white/30" />
            <span className="text-[10px] text-white/30">K</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 md:pb-0 px-1 items-center scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 relative overflow-hidden',
                selectedCategory === category.id
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              {selectedCategory === category.id && (
                <motion.div
                  layoutId="category-bg"
                  className="absolute inset-0 bg-axora-500/80 rounded-lg"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{category.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Modules Grid */}
      {filteredModules.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-16 rounded-2xl bg-surface-50/20 border border-white/5 border-dashed"
        >
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
            <Search className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Aucun module trouvé</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}
            className="mt-3 px-3 py-1.5 text-xs text-axora-400 hover:text-axora-300 hover:bg-axora-500/10 rounded-lg transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {filteredModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onOpen={() => openModule(module.id)}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

interface ModuleCardProps {
  module: ModuleDefinition
  onOpen: () => void
}

function ModuleCard({ module, onOpen }: ModuleCardProps) {
  const Icon = module.icon
  const isComingSoon = module.status === 'coming_soon'
  const isBeta = module.status === 'beta'

  return (
    <motion.button
      variants={itemVariants}
      onClick={onOpen}
      className={cn(
        'group relative p-5 rounded-2xl text-left transition-all duration-200',
        'bg-surface-100/30 backdrop-blur-xl border border-white/5',
        'hover:bg-surface-100/50 hover:border-white/10 overflow-hidden',
        isComingSoon && 'opacity-50 cursor-not-allowed grayscale'
      )}
      disabled={isComingSoon}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-axora-500/0 to-cyan-500/0 group-hover:from-axora-500/5 group-hover:to-cyan-500/5 transition-colors duration-300" />

      {/* Icon */}
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10',
        'bg-surface-200/30 border border-white/5 group-hover:border-white/10 transition-all duration-200'
      )}>
        <Icon className="w-5 h-5 text-white/70 group-hover:text-axora-400 transition-colors" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">{module.name}</h3>
        <p className="text-xs text-white/40 mt-1.5 line-clamp-2 leading-relaxed group-hover:text-white/50 transition-colors">
          {module.description}
        </p>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <span className="text-[9px] uppercase tracking-wider font-medium text-white/30">
          {CATEGORY_LABELS[module.category]}
        </span>

        {(isBeta || isComingSoon) && (
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide",
            isBeta ? "bg-cyan-500/15 text-cyan-400" : "bg-amber-500/15 text-amber-400"
          )}>
            {isBeta ? 'Beta' : 'Bientôt'}
          </span>
        )}
      </div>
    </motion.button>
  )
}
