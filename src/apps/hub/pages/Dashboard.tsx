import { motion } from 'framer-motion'
import { Scan, MessageSquare, Grid3X3, TrendingUp, Sparkles } from 'lucide-react'
import { cn } from '@shared/utils/cn'

// Animation variants for stagger effect
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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

export function Dashboard() {
  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-axora-500/10">
            <Sparkles className="w-5 h-5 text-axora-400" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            Tableau de bord
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">
          Bienvenue sur <span className="text-gradient">Axora</span>
        </h1>
        <p className="text-white/50 mt-2 text-[15px]">
          Votre assistant intelligent pour l'officine
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        <QuickActionCard
          icon={Scan}
          title="PhiVision"
          description="Analyser un écran"
          color="indigo"
          shortcut="⌘⇧P"
        />
        <QuickActionCard
          icon={MessageSquare}
          title="Assistant IA"
          description="Poser une question"
          color="cyan"
        />
        <QuickActionCard
          icon={Grid3X3}
          title="Nexus"
          description="Accéder aux modules"
          color="violet"
        />
        <QuickActionCard
          icon={TrendingUp}
          title="Activité"
          description="12 analyses aujourd'hui"
          color="emerald"
        />
      </motion.div>

      {/* Recent activity */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Activité récente</h2>
        <div className="space-y-2">
          <ActivityItem
            type="phivision"
            title="Analyse PhiVision"
            description="Ordonnance - Doliprane 1000mg, Amoxicilline"
            time="Il y a 5 min"
          />
          <ActivityItem
            type="assistant"
            title="Question Assistant"
            description="Interactions médicamenteuses paracétamol + ibuprofène"
            time="Il y a 23 min"
          />
          <ActivityItem
            type="nexus"
            title="Module Posologie"
            description="Calcul posologie pédiatrique"
            time="Il y a 1h"
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={containerVariants}
      >
        <StatCard label="Analyses ce mois" value="142" change="+12%" />
        <StatCard label="Questions IA" value="89" change="+8%" />
        <StatCard label="Modules utilisés" value="5" />
      </motion.div>
    </motion.div>
  )
}

interface QuickActionCardProps {
  icon: React.ElementType
  title: string
  description: string
  color: 'indigo' | 'cyan' | 'violet' | 'emerald'
  shortcut?: string
}

function QuickActionCard({ icon: Icon, title, description, color, shortcut }: QuickActionCardProps) {
  const colorConfig = {
    indigo: {
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      border: 'border-indigo-500/20 hover:border-indigo-500/40',
      icon: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      glow: 'group-hover:shadow-indigo-500/20',
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

  const config = colorConfig[color]

  return (
    <motion.button
      variants={itemVariants}
      className={cn(
        'group relative p-5 rounded-2xl text-left transition-all duration-200',
        'bg-gradient-to-br border backdrop-blur-xl',
        'hover:shadow-lg',
        config.gradient,
        config.border,
        config.glow
      )}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', config.iconBg)}>
        <Icon className={cn('w-5 h-5', config.icon)} />
      </div>
      <h3 className="font-medium text-white text-[15px]">{title}</h3>
      <p className="text-sm text-white/50 mt-1">{description}</p>
      {shortcut && (
        <span className="absolute top-4 right-4 text-[10px] text-white/30 font-mono px-1.5 py-0.5 rounded bg-white/5">
          {shortcut}
        </span>
      )}
    </motion.button>
  )
}

interface ActivityItemProps {
  type: 'phivision' | 'assistant' | 'nexus'
  title: string
  description: string
  time: string
}

function ActivityItem({ type, title, description, time }: ActivityItemProps) {
  const typeConfig = {
    phivision: { icon: Scan, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    assistant: { icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    nexus: { icon: Grid3X3, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  }
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group cursor-pointer">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{title}</p>
        <p className="text-[13px] text-white/40 truncate">{description}</p>
      </div>
      <span className="text-[11px] text-white/30 flex-shrink-0 group-hover:text-white/50 transition-colors">{time}</span>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  change?: string
}

function StatCard({ label, value, change }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass rounded-2xl p-5 group hover:bg-white/[0.03] transition-colors"
    >
      <p className="text-[13px] text-white/50 font-medium">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-2xl font-semibold text-white tracking-tight">{value}</span>
        {change && (
          <span className="text-xs font-medium text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
            {change}
          </span>
        )}
      </div>
    </motion.div>
  )
}
