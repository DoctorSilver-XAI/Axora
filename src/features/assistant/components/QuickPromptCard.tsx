import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { QuickPrompt, QUICK_PROMPT_CATEGORIES } from '../constants/quickPrompts'

interface QuickPromptCardProps {
  prompt: QuickPrompt
  onClick: (prompt: QuickPrompt) => void
  variant?: 'default' | 'compact'
}

/**
 * Configuration des couleurs par catégorie
 * Suit le pattern du Dashboard pour la cohérence visuelle
 */
const colorConfig = {
  amber: {
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    glow: 'group-hover:shadow-amber-500/20',
  },
  cyan: {
    gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    icon: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    glow: 'group-hover:shadow-cyan-500/20',
  },
  violet: {
    gradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
    border: 'border-violet-500/20 hover:border-violet-500/40',
    icon: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    glow: 'group-hover:shadow-violet-500/20',
  },
  emerald: {
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    glow: 'group-hover:shadow-emerald-500/20',
  },
}

export function QuickPromptCard({ prompt, onClick, variant = 'default' }: QuickPromptCardProps) {
  const category = QUICK_PROMPT_CATEGORIES[prompt.category]
  const Icon = category.icon
  const config = colorConfig[category.color]

  // Variante compacte : pill horizontale
  if (variant === 'compact') {
    return (
      <motion.button
        onClick={() => onClick(prompt)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all',
          'bg-surface-100/30 border border-white/5',
          'hover:bg-surface-100/50 hover:border-white/10',
          'group'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', config.icon)} />
        <span className="text-sm text-white/80 truncate">{prompt.label}</span>
        <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
      </motion.button>
    )
  }

  // Variante default : card complète
  return (
    <motion.button
      onClick={() => onClick(prompt)}
      className={cn(
        'group relative p-4 rounded-2xl text-left transition-all duration-200',
        'bg-gradient-to-br border backdrop-blur-xl',
        'hover:shadow-lg',
        config.gradient,
        config.border,
        config.glow
      )}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', config.iconBg)}>
        <Icon className={cn('w-4 h-4', config.icon)} />
      </div>
      <h3 className="font-medium text-white text-sm">{prompt.label}</h3>
      <p className="text-xs text-white/40 mt-1.5 line-clamp-2">{prompt.prompt.slice(0, 60)}...</p>
      <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
    </motion.button>
  )
}
