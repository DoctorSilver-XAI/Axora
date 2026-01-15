/**
 * AgentsSection - Section UI pour le système multi-agent PhiBRAIN
 * Affiche les 4 agents avec leurs résultats ou placeholders
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pill,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type {
  AgentsResults,
  PhiMedsOutput,
  PhiAdvicesOutput,
  PhiCrossSellOutput,
  PhiChipsOutput,
  AgentStatus,
} from '../types/agents'

interface AgentsSectionProps {
  agents?: Partial<AgentsResults>
  onRunAgents?: () => void
  isRunning?: boolean
  className?: string
}

export function AgentsSection({
  agents,
  onRunAgents,
  isRunning = false,
  className,
}: AgentsSectionProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const hasAnyResult = agents && Object.values(agents).some((a) => a?.output)

  return (
    <div className={cn('rounded-xl border border-white/5 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 bg-surface-100/50 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-axora-400" />
          <h3 className="text-sm font-semibold text-white">Agents PhiBRAIN</h3>
          {hasAnyResult && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
              Enrichi
            </span>
          )}
        </div>

        <button
          onClick={onRunAgents}
          disabled={isRunning || !onRunAgents}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            isRunning
              ? 'bg-axora-500/20 text-axora-400 cursor-not-allowed'
              : onRunAgents
                ? 'bg-axora-500 hover:bg-axora-600 text-white'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              {onRunAgents ? 'Lancer' : 'Bientôt disponible'}
            </>
          )}
        </button>
      </div>

      {/* Agents Grid */}
      <div className="divide-y divide-white/5">
        {/* PhiMEDS */}
        <AgentCard
          name="PhiMEDS"
          description="DCI + Recommandations"
          icon={Pill}
          color="emerald"
          status={agents?.phiMeds?.status}
          isExpanded={expandedAgent === 'PhiMEDS'}
          onToggle={() => setExpandedAgent(expandedAgent === 'PhiMEDS' ? null : 'PhiMEDS')}
        >
          <PhiMedsContent output={agents?.phiMeds?.output as PhiMedsOutput | null} />
        </AgentCard>

        {/* PhiADVICES */}
        <AgentCard
          name="PhiADVICES"
          description="Conseils patients"
          icon={MessageSquare}
          color="blue"
          status={agents?.phiAdvices?.status}
          isExpanded={expandedAgent === 'PhiADVICES'}
          onToggle={() => setExpandedAgent(expandedAgent === 'PhiADVICES' ? null : 'PhiADVICES')}
        >
          <PhiAdvicesContent output={agents?.phiAdvices?.output as PhiAdvicesOutput | null} />
        </AgentCard>

        {/* PhiCROSS_SELL */}
        <AgentCard
          name="PhiCROSS_SELL"
          description="Cross-selling"
          icon={ShoppingBag}
          color="purple"
          status={agents?.phiCrossSell?.status}
          isExpanded={expandedAgent === 'PhiCROSS_SELL'}
          onToggle={() => setExpandedAgent(expandedAgent === 'PhiCROSS_SELL' ? null : 'PhiCROSS_SELL')}
        >
          <PhiCrossSellContent output={agents?.phiCrossSell?.output as PhiCrossSellOutput | null} />
        </AgentCard>

        {/* PhiCHIPS */}
        <AgentCard
          name="PhiCHIPS"
          description="Micro-rappels"
          icon={Sparkles}
          color="amber"
          status={agents?.phiChips?.status}
          isExpanded={expandedAgent === 'PhiCHIPS'}
          onToggle={() => setExpandedAgent(expandedAgent === 'PhiCHIPS' ? null : 'PhiCHIPS')}
        >
          <PhiChipsContent output={agents?.phiChips?.output as PhiChipsOutput | null} />
        </AgentCard>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Card
// =============================================================================

const colorMap = {
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
}

function AgentCard({
  name,
  description,
  icon: Icon,
  color,
  status,
  isExpanded,
  onToggle,
  children,
}: {
  name: string
  description: string
  icon: typeof Bot
  color: keyof typeof colorMap
  status?: AgentStatus
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const colors = colorMap[color]
  const hasContent = status === 'success'

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors',
          isExpanded && 'bg-white/5'
        )}
      >
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.text)} />
        </div>

        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-white/40">{description}</p>
        </div>

        <StatusBadge status={status} />

        <ChevronDown
          className={cn(
            'w-4 h-4 text-white/30 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-black/20 border-t border-white/5">
              {hasContent ? children : (
                <p className="text-xs text-white/40 italic">
                  Aucune donnée - lancez les agents pour enrichir l'analyse
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status?: AgentStatus }) {
  if (!status || status === 'idle') {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-white/30">
        En attente
      </span>
    )
  }

  const configs: Record<AgentStatus, { icon: typeof Bot; text: string; className: string }> = {
    idle: { icon: Bot, text: 'En attente', className: 'bg-white/5 text-white/30' },
    pending: { icon: Loader2, text: 'File...', className: 'bg-white/5 text-white/40' },
    running: { icon: Loader2, text: 'Analyse...', className: 'bg-axora-500/20 text-axora-400' },
    success: { icon: CheckCircle2, text: 'OK', className: 'bg-emerald-500/20 text-emerald-400' },
    error: { icon: AlertCircle, text: 'Erreur', className: 'bg-red-500/20 text-red-400' },
  }

  const conf = configs[status]
  const Icon = conf.icon

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded', conf.className)}>
      <Icon className={cn('w-3 h-3', status === 'running' && 'animate-spin')} />
      {conf.text}
    </span>
  )
}

// =============================================================================
// Agent Content Components
// =============================================================================

function PhiMedsContent({ output }: { output: PhiMedsOutput | null }) {
  if (!output?.meds?.length) {
    return <p className="text-xs text-white/40">Aucun médicament enrichi</p>
  }

  return (
    <div className="space-y-2">
      {output.meds.map((med, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-emerald-400 mt-0.5">●</span>
          <div>
            <p className="text-sm text-white/90">
              {med.dci || 'DCI inconnue'}
            </p>
            {med.recommendation && (
              <p className="text-xs text-white/50 mt-0.5">{med.recommendation}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PhiAdvicesContent({ output }: { output: PhiAdvicesOutput | null }) {
  if (!output?.advices) {
    return <p className="text-xs text-white/40">Aucun conseil généré</p>
  }

  return (
    <div className="space-y-3">
      {output.advices.oral_sentence && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-white/90 italic">
            "{output.advices.oral_sentence}"
          </p>
        </div>
      )}
      {output.advices.written_points?.length > 0 && (
        <ul className="space-y-1">
          {output.advices.written_points.map((point, i) => (
            <li key={i} className="text-xs text-white/70 flex items-start gap-2">
              <span className="text-blue-400">•</span>
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PhiCrossSellContent({ output }: { output: PhiCrossSellOutput | null }) {
  if (!output?.cross_selling?.length) {
    return <p className="text-xs text-white/40">Aucune suggestion</p>
  }

  return (
    <div className="space-y-2">
      {output.cross_selling.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-purple-400 text-xs font-bold mt-0.5">{i + 1}.</span>
          <div>
            <p className="text-sm text-white/90">{item.name}</p>
            <p className="text-xs text-white/50">{item.reason}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PhiChipsContent({ output }: { output: PhiChipsOutput | null }) {
  if (!output?.chips?.length) {
    return <p className="text-xs text-white/40">Aucun rappel</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {output.chips.map((chip, i) => (
        <span
          key={i}
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"
        >
          {chip}
        </span>
      ))}
    </div>
  )
}
