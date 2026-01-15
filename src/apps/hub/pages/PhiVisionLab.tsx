import { useState, useEffect, useCallback, memo } from 'react'
import {
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Camera,
  Code,
  Database,
  Bot,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { DBCapture } from '@features/phivision/services/CaptureService'
import type {
  PhiBrainResult,
  FacturationOrdoResult,
  OrdonnanceScanResult,
} from '@features/phivision/services/OCRService'
import { supabase } from '@shared/lib/supabase'

// =============================================================================
// Types
// =============================================================================

interface LabCapture {
  id: string
  imageUrl: string | null
  rawText: string | null
  ocrConfidence: number | null
  createdAt: Date
  updatedAt: Date
  charCount: number
  context: string
  parsedData: PhiBrainResult | null
  rawDbData: DBCapture
}

type TabId = 'capture' | 'response' | 'parsed' | 'agents'

// =============================================================================
// Utils
// =============================================================================

function parseCapture(db: DBCapture): LabCapture {
  let parsedData: PhiBrainResult | null = null
  let context = 'UNKNOWN'

  if (db.raw_text) {
    try {
      const parsed = JSON.parse(db.raw_text)
      if (parsed.context) {
        parsedData = parsed
        context = parsed.context
      } else if (parsed.document_annotation) {
        try {
          const inner = JSON.parse(parsed.document_annotation)
          if (inner.context) {
            parsedData = inner
            context = inner.context
          }
        } catch {
          // Keep raw parsed
          parsedData = parsed
        }
      }
    } catch {
      // Not JSON
    }
  }

  return {
    id: db.id,
    imageUrl: db.image_url,
    rawText: db.raw_text,
    ocrConfidence: db.ocr_confidence,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    charCount: db.raw_text?.length || 0,
    context,
    parsedData,
    rawDbData: db,
  }
}

function getContextColor(ctx: string): string {
  switch (ctx) {
    case 'FACTURATION_ORDO': return 'text-cyan-400'
    case 'ORDONNANCE_SCAN': return 'text-indigo-400'
    case 'FICHE_PATIENT': return 'text-pink-400'
    default: return 'text-white/40'
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR')
}

// =============================================================================
// Main Component
// =============================================================================

export function PhiVisionLabPage() {
  const [captures, setCaptures] = useState<LabCapture[]>([])
  const [selected, setSelected] = useState<LabCapture | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('response')
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const loadCaptures = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[Lab] Load error:', error)
        return
      }

      const parsed = (data || []).map((c) => parseCapture(c as DBCapture))
      setCaptures(parsed)
      if (parsed.length > 0 && !selected) {
        setSelected(parsed[0])
      }
    } catch (err) {
      console.error('[Lab] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCaptures()
  }, [loadCaptures])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette capture ?')) return
    try {
      await supabase.from('captures').delete().eq('id', id)
      setCaptures((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (selected?.id === id) setSelected(filtered[0] || null)
        return filtered
      })
    } catch (err) {
      console.error('[Lab] Delete error:', err)
    }
  }

  return (
    <div className="flex h-full bg-black/50">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-white/10 bg-surface-100/50">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
            PhiVision Lab
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40">
              {captures.length}
            </span>
            <button
              onClick={loadCaptures}
              disabled={isLoading}
              className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white"
            >
              <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 text-white/20 animate-spin" />
            </div>
          ) : captures.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-xs">
              Aucune capture
            </div>
          ) : (
            captures.map((capture) => (
              <CaptureRow
                key={capture.id}
                capture={capture}
                isSelected={selected?.id === capture.id}
                onClick={() => setSelected(capture)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-surface-100/30">
              {/* Mini thumbnail */}
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt=""
                  className="w-8 h-8 rounded object-cover border border-white/10"
                />
              )}

              <div className="flex items-center gap-2 text-xs font-mono flex-1 min-w-0">
                <span className="text-white/40">ID:</span>
                <span className="text-white/80">{selected.id.substring(0, 8)}</span>
                <span className="text-white/20">│</span>
                <span className={cn('font-semibold', getContextColor(selected.context))}>
                  {selected.context}
                </span>
                <span className="text-white/20">│</span>
                <span className={cn(
                  selected.ocrConfidence && selected.ocrConfidence > 0.8
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                )}>
                  {selected.ocrConfidence ? `${(selected.ocrConfidence * 100).toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-white/20">│</span>
                <span className="text-white/50">
                  {formatDate(selected.createdAt)} {formatTime(selected.createdAt)}
                </span>
                <span className="text-white/20">│</span>
                <span className="text-white/40">{selected.charCount}c</span>
              </div>

              <button
                onClick={() => handleDelete(selected.id)}
                className="p-1.5 hover:bg-red-500/20 rounded text-red-400/50 hover:text-red-400"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-surface-100/20">
              <TabButton
                active={activeTab === 'capture'}
                onClick={() => setActiveTab('capture')}
                icon={Camera}
                label="1. Capture"
              />
              <TabButton
                active={activeTab === 'response'}
                onClick={() => setActiveTab('response')}
                icon={Code}
                label="2. Response"
              />
              <TabButton
                active={activeTab === 'parsed'}
                onClick={() => setActiveTab('parsed')}
                icon={Database}
                label="3. Parsed"
              />
              <TabButton
                active={activeTab === 'agents'}
                onClick={() => setActiveTab('agents')}
                icon={Bot}
                label="4. Agents"
                disabled
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-3">
              {activeTab === 'capture' && <TabCapture capture={selected} />}
              {activeTab === 'response' && (
                <TabResponse capture={selected} onCopy={handleCopy} copied={copied} />
              )}
              {activeTab === 'parsed' && <TabParsed capture={selected} />}
              {activeTab === 'agents' && <TabAgents />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            Sélectionnez une capture
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Sidebar Components
// =============================================================================

const CaptureRow = memo(function CaptureRow({
  capture,
  isSelected,
  onClick,
}: {
  capture: LabCapture
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5 border-l-2 transition-colors',
        isSelected
          ? 'bg-white/10 border-l-cyan-400'
          : 'border-l-transparent'
      )}
    >
      <ChevronRight
        className={cn(
          'w-3 h-3 transition-transform',
          isSelected ? 'text-cyan-400 rotate-90' : 'text-white/20'
        )}
      />
      <span className={cn('text-[10px] font-bold uppercase w-24 truncate', getContextColor(capture.context))}>
        {capture.context.replace('_', ' ')}
      </span>
      <span className="text-[10px] font-mono text-white/50">
        {formatTime(capture.createdAt)}
      </span>
      <span className="text-[10px] font-mono text-white/30">
        {capture.charCount}c
      </span>
      <span className="text-[10px] font-mono text-white/20 ml-auto">
        {capture.id.substring(0, 7)}
      </span>
    </button>
  )
})

// =============================================================================
// Tab Components
// =============================================================================

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors',
        active
          ? 'text-white border-b-cyan-400 bg-white/5'
          : disabled
            ? 'text-white/20 border-b-transparent cursor-not-allowed'
            : 'text-white/50 border-b-transparent hover:text-white hover:bg-white/5'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

// -----------------------------------------------------------------------------
// Tab 1: Capture
// -----------------------------------------------------------------------------

function TabCapture({ capture }: { capture: LabCapture }) {
  const db = capture.rawDbData

  const rows = [
    ['id', capture.id],
    ['created_at', capture.createdAt.toISOString()],
    ['updated_at', capture.updatedAt.toISOString()],
    ['ocr_provider', db.ocr_provider || 'mistral'],
    ['ocr_confidence', capture.ocrConfidence?.toFixed(4) || 'null'],
    ['char_count', capture.charCount.toString()],
    ['context', capture.context],
    ['image_url', capture.imageUrl || 'null'],
    ['is_favorite', db.is_favorite ? 'true' : 'false'],
    ['tags', JSON.stringify(db.tags || [])],
    ['notes', db.notes || 'null'],
  ]

  return (
    <div className="space-y-4">
      {/* Image preview */}
      {capture.imageUrl && (
        <div className="flex gap-4">
          <a href={capture.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={capture.imageUrl}
              alt="Capture"
              className="max-w-xs max-h-48 rounded border border-white/10 hover:border-cyan-400/50 transition-colors"
            />
          </a>
        </div>
      )}

      {/* Metadata table */}
      <table className="w-full text-xs font-mono">
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-1.5 px-2 text-white/40 w-36">{key}</td>
              <td className="py-1.5 px-2 text-white/80 break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Enrichment */}
      {db.enrichment && Object.keys(db.enrichment).length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-mono text-white/40 mb-2">enrichment</h4>
          <pre className="text-xs font-mono text-purple-400 bg-black/30 p-2 rounded overflow-auto">
            {JSON.stringify(db.enrichment, null, 2)}
          </pre>
        </div>
      )}

      {/* Entities */}
      {db.entities && db.entities.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-mono text-white/40 mb-2">
            entities ({db.entities.length})
          </h4>
          <pre className="text-xs font-mono text-amber-400 bg-black/30 p-2 rounded overflow-auto">
            {JSON.stringify(db.entities, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Tab 2: Response
// -----------------------------------------------------------------------------

function TabResponse({
  capture,
  onCopy,
  copied,
}: {
  capture: LabCapture
  onCopy: (text: string) => void
  copied: boolean
}) {
  let content = ''
  let isValidJson = false

  if (capture.rawText) {
    try {
      const parsed = JSON.parse(capture.rawText)
      content = JSON.stringify(parsed, null, 2)
      isValidJson = true
    } catch {
      content = capture.rawText
    }
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-32 text-white/30 text-xs">
        Aucune réponse disponible
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          {isValidJson ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3 h-3" /> JSON valide
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" /> Texte brut
            </span>
          )}
        </div>
        <button
          onClick={() => onCopy(content)}
          className="flex items-center gap-1 text-xs font-mono text-white/50 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" /> Copié
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copier
            </>
          )}
        </button>
      </div>

      <pre className="flex-1 text-xs font-mono text-cyan-400 bg-black/40 p-3 rounded border border-white/5 overflow-auto whitespace-pre-wrap break-all">
        {content}
      </pre>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Tab 3: Parsed
// -----------------------------------------------------------------------------

function TabParsed({ capture }: { capture: LabCapture }) {
  const data = capture.parsedData

  if (!data) {
    return (
      <div className="flex items-center justify-center h-32 text-white/30 text-xs">
        Aucune donnée parsée (contexte non reconnu)
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Structured view based on context */}
      {data.context === 'FACTURATION_ORDO' && (
        <FacturationView data={data as FacturationOrdoResult} />
      )}
      {data.context === 'ORDONNANCE_SCAN' && (
        <OrdonnanceView data={data as OrdonnanceScanResult} />
      )}
      {data.context === 'FICHE_PATIENT' && (
        <GenericJsonView data={data} label="Fiche Patient" />
      )}
      {data.context === 'UNKNOWN' && (
        <GenericJsonView data={data} label="Contexte Inconnu" />
      )}

      {/* Raw JSON below */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <h4 className="text-xs font-mono text-white/40 mb-2">JSON brut</h4>
        <pre className="text-xs font-mono text-white/60 bg-black/30 p-3 rounded overflow-auto max-h-64">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}

function FacturationView({ data }: { data: FacturationOrdoResult }) {
  return (
    <div className="space-y-4">
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/20 rounded p-2">
          <h5 className="text-[10px] font-mono text-white/40 uppercase mb-1">Patient</h5>
          <div className="text-xs font-mono text-white/80">
            {data.patient_fullname || '—'}
          </div>
          <div className="text-[10px] font-mono text-white/50">
            {data.patient_age_years ? `${data.patient_age_years} ans` : '—'}
            {data.insurance && ` • ${data.insurance}`}
          </div>
        </div>
        <div className="bg-black/20 rounded p-2">
          <h5 className="text-[10px] font-mono text-white/40 uppercase mb-1">Prescripteur</h5>
          <div className="text-xs font-mono text-white/80">
            {data.prescriber || '—'}
          </div>
        </div>
      </div>

      {/* Flags */}
      {data.flags && data.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.flags.map((flag, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-400 rounded"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Lines table */}
      {data.lines && data.lines.length > 0 && (
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-white/40 text-left border-b border-white/10">
              <th className="py-1 px-2">Désignation</th>
              <th className="py-1 px-2 text-right">Qté</th>
              <th className="py-1 px-2 text-right">Prix</th>
              <th className="py-1 px-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-1 px-2 text-white/80">{line.designation}</td>
                <td className="py-1 px-2 text-right text-cyan-400">{line.qty}</td>
                <td className="py-1 px-2 text-right text-white/60">
                  {line.unit_price_eur?.toFixed(2) || '—'}€
                </td>
                <td className="py-1 px-2 text-right text-white/40">
                  {line.stock ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Total */}
      {data.total_eur !== null && (
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-white/10">
          <span className="text-xs font-mono text-white/40">TOTAL</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {data.total_eur.toFixed(2)}€
          </span>
        </div>
      )}

      {/* Missing fields */}
      {data.missing_fields && data.missing_fields.length > 0 && (
        <div className="text-[10px] font-mono text-red-400/60">
          Missing: {data.missing_fields.join(', ')}
        </div>
      )}
    </div>
  )
}

function OrdonnanceView({ data }: { data: OrdonnanceScanResult }) {
  return (
    <div className="space-y-4">
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/20 rounded p-2">
          <h5 className="text-[10px] font-mono text-white/40 uppercase mb-1">Prescripteur</h5>
          <div className="text-xs font-mono text-white/80">{data.prescriber_name || '—'}</div>
          <div className="text-[10px] font-mono text-white/50">
            {data.prescriber_specialty || '—'}
            {data.prescriber_rpps && ` • RPPS: ${data.prescriber_rpps}`}
          </div>
        </div>
        <div className="bg-black/20 rounded p-2">
          <h5 className="text-[10px] font-mono text-white/40 uppercase mb-1">Patient</h5>
          <div className="text-xs font-mono text-white/80">{data.patient_fullname || '—'}</div>
          <div className="text-[10px] font-mono text-white/50">
            {data.patient_birthdate || '—'}
          </div>
        </div>
      </div>

      {/* Date */}
      {data.prescription_date && (
        <div className="text-xs font-mono text-white/50">
          Date prescription: {data.prescription_date}
        </div>
      )}

      {/* Mentions */}
      {data.mentions && data.mentions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.mentions.map((m, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-indigo-500/20 text-indigo-400 rounded"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {/* Medications */}
      {data.medications && data.medications.length > 0 && (
        <div>
          <h5 className="text-[10px] font-mono text-white/40 uppercase mb-1">
            Médicaments ({data.medications.length})
          </h5>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-white/40 text-left border-b border-white/10">
                <th className="py-1 px-2">Nom</th>
                <th className="py-1 px-2">DCI</th>
                <th className="py-1 px-2">Posologie</th>
                <th className="py-1 px-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {data.medications.map((med, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-1 px-2 text-white/80">{med.name}</td>
                  <td className="py-1 px-2 text-cyan-400">{med.dci || '—'}</td>
                  <td className="py-1 px-2 text-white/60">{med.posology || '—'}</td>
                  <td className="py-1 px-2 text-white/40">{med.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Missing fields */}
      {data.missing_fields && data.missing_fields.length > 0 && (
        <div className="text-[10px] font-mono text-red-400/60">
          Missing: {data.missing_fields.join(', ')}
        </div>
      )}
    </div>
  )
}

function GenericJsonView({ data, label }: { data: PhiBrainResult; label: string }) {
  return (
    <div>
      <h4 className="text-xs font-mono text-white/40 mb-2">{label}</h4>
      <pre className="text-xs font-mono text-white/70 bg-black/30 p-3 rounded overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Tab 4: Agents (Placeholder)
// -----------------------------------------------------------------------------

function TabAgents() {
  const agents = [
    { name: 'PhiBRAIN', desc: 'Orchestrateur principal', status: 'planned' },
    { name: 'PhiMEDS', desc: 'Traitement médicaments (DCI, recommandations)', status: 'planned' },
    { name: 'PhiADVICES', desc: 'Conseils patients', status: 'planned' },
    { name: 'PhiCROSS_SELL', desc: 'Suggestions cross-selling', status: 'planned' },
    { name: 'PhiCHIPS', desc: 'Micro-rappels (chips/badges)', status: 'planned' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-mono text-white/40">
        <Bot className="w-4 h-4" />
        Système Multi-Agent (à venir)
      </div>

      <div className="bg-black/20 rounded p-3 border border-dashed border-white/10">
        <p className="text-xs text-white/50 mb-4">
          Cette section affichera le pipeline d'agents PhiBRAIN avec leurs inputs/outputs
          pour chaque étape du traitement.
        </p>

        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-3 px-2 py-1.5 bg-black/30 rounded"
            >
              <div className="w-2 h-2 rounded-full bg-white/20" />
              <span className="text-xs font-mono text-white/60 w-28">{agent.name}</span>
              <span className="text-[10px] text-white/40">{agent.desc}</span>
              <span className="ml-auto text-[10px] font-mono text-white/20 uppercase">
                {agent.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
