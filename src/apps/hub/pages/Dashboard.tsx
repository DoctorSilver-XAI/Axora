import { motion } from 'framer-motion'
import { Scan, MessageSquare, Grid3X3, TrendingUp } from 'lucide-react'
import { cn } from '@shared/utils/cn'

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Bienvenue sur <span className="text-gradient">Axora</span>
        </h1>
        <p className="text-white/60 mt-1">
          Votre assistant intelligent pour l'officine
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Recent activity */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Activité récente</h2>
        <div className="space-y-3">
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
      </div>

      {/* Stats placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Analyses ce mois" value="142" change="+12%" />
        <StatCard label="Questions IA" value="89" change="+8%" />
        <StatCard label="Modules utilisés" value="5" />
      </div>
    </div>
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
  const colorClasses = {
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 hover:border-indigo-500/50',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-500/50',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 hover:border-violet-500/50',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/50',
  }

  const iconColors = {
    indigo: 'text-indigo-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
  }

  return (
    <motion.button
      className={cn(
        'relative p-5 rounded-2xl text-left transition-all duration-300',
        'bg-gradient-to-br border backdrop-blur-xl',
        'hover:scale-[1.02] active:scale-[0.98]',
        colorClasses[color]
      )}
      whileHover={{ y: -2 }}
    >
      <Icon className={cn('w-8 h-8 mb-3', iconColors[color])} />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-white/60 mt-1">{description}</p>
      {shortcut && (
        <span className="absolute top-4 right-4 text-xs text-white/40 font-mono">
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
  const icons = {
    phivision: Scan,
    assistant: MessageSquare,
    nexus: Grid3X3,
  }
  const Icon = icons[type]

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{title}</p>
        <p className="text-sm text-white/50 truncate">{description}</p>
      </div>
      <span className="text-xs text-white/40 flex-shrink-0">{time}</span>
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
    <div className="glass rounded-2xl p-5">
      <p className="text-sm text-white/60">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-3xl font-semibold text-white">{value}</span>
        {change && (
          <span className="text-sm text-emerald-400 mb-1">{change}</span>
        )}
      </div>
    </div>
  )
}
