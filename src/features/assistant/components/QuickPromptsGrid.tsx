import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { QuickPromptCard } from './QuickPromptCard'
import { QuickPrompt, getTopPrompts } from '../constants/quickPrompts'

interface QuickPromptsGridProps {
  onSelectPrompt: (prompt: QuickPrompt) => void
  variant?: 'grid' | 'inline'
  maxItems?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
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

export function QuickPromptsGrid({
  onSelectPrompt,
  variant = 'grid',
  maxItems = 6,
}: QuickPromptsGridProps) {
  const prompts = getTopPrompts(maxItems)

  // Mode inline : ligne horizontale scrollable
  if (variant === 'inline') {
    return (
      <motion.div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {prompts.slice(0, 4).map((prompt) => (
          <motion.div key={prompt.id} variants={itemVariants} className="flex-shrink-0">
            <QuickPromptCard prompt={prompt} onClick={onSelectPrompt} variant="compact" />
          </motion.div>
        ))}
      </motion.div>
    )
  }

  // Mode grid : grille 2x3 responsive
  return (
    <motion.div
      className="mt-8 w-full max-w-2xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="flex items-center gap-2 mb-4" variants={itemVariants}>
        <div className="p-1.5 rounded-lg bg-axora-500/10">
          <Lightbulb className="w-4 h-4 text-axora-400" />
        </div>
        <span className="text-sm font-medium text-white/60">Suggestions pour commencer</span>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prompts.map((prompt) => (
          <motion.div key={prompt.id} variants={itemVariants}>
            <QuickPromptCard prompt={prompt} onClick={onSelectPrompt} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
