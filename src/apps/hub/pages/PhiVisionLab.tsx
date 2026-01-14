import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Microscope,
  FileText,
  Sparkles,
  Brain,
  Bot,
  BarChart3,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  User,
  Stethoscope,
  Pill,
  Clock,
  Database,
  AlertTriangle,
  Receipt,
  FileSearch,
  UserCircle,
  HelpCircle,
  Activity,
  Scan,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { Capture, DBCapture } from '@features/phivision/services/CaptureService'
import type {
  PhiBrainResult,
  FacturationOrdoResult,
  OrdonnanceScanResult,
} from '@features/phivision/services/OCRService'
import { supabase } from '@shared/lib/supabase'

// Types étendus pour le Lab
interface LabCapture extends Capture {
  char_count: number
  parsed_data?: Record<string, unknown>
  mistral_response?: Record<string, unknown>
  raw_db_data?: DBCapture
}

function transformToLabCapture(dbCapture: DBCapture): LabCapture {
  const rawText = dbCapture.raw_text
  let parsedData: Record<string, unknown> | undefined
  let mistralResponse: Record<string, unknown> | undefined

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText)
      parsedData = parsed
      if (parsed.document_annotation) {
        mistralResponse = parsed
        try {
          parsedData = JSON.parse(parsed.document_annotation)
        } catch {
          // Keep original
        }
      }
    } catch {
      // Not JSON
    }
  }

  return {
    id: dbCapture.id,
    imageUrl: dbCapture.image_url,
    thumbnailUrl: dbCapture.thumbnail_url,
    rawText: dbCapture.raw_text,
    ocrConfidence: dbCapture.ocr_confidence,
    entities: dbCapture.entities || [],
    enrichment: dbCapture.enrichment || {},
    isFavorite: dbCapture.is_favorite,
    tags: dbCapture.tags || [],
    notes: dbCapture.notes,
    createdAt: new Date(dbCapture.created_at),
    updatedAt: new Date(dbCapture.updated_at),
    char_count: rawText?.length || 0,
    parsed_data: parsedData,
    mistral_response: mistralResponse,
    raw_db_data: dbCapture,
  }
}

type TabId = 'ocr' | 'parsed' | 'enrichment' | 'mistral' | 'metadata'

function getPhiBrainContext(capture: LabCapture): { context: string; icon: React.ElementType; color: string } | null {
  const data = capture.parsed_data as PhiBrainResult | undefined
  if (!data?.context) return null

  const config: Record<string, { icon: React.ElementType; color: string }> = {
    FACTURATION_ORDO: { icon: Receipt, color: 'text-cyan-400 bg-cyan-400/10' },
    ORDONNANCE_SCAN: { icon: FileSearch, color: 'text-indigo-400 bg-indigo-400/10' },
    FICHE_PATIENT: { icon: UserCircle, color: 'text-pink-400 bg-pink-400/10' },
    UNKNOWN: { icon: HelpCircle, color: 'text-surface-400 bg-surface-500/10' },
  }

  const conf = config[data.context] || config.UNKNOWN
  return { context: data.context, ...conf }
}

const TABS: readonly { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'ocr', label: 'Texte OCR', icon: FileText },
  { id: 'parsed', label: 'Données Parsées', icon: Sparkles },
  { id: 'enrichment', label: 'Enrichissement', icon: Brain },
  { id: 'mistral', label: 'DEBUG Mistral', icon: Bot },
  { id: 'metadata', label: 'Métadonnées', icon: BarChart3 },
] as const

export function PhiVisionLabPage() {
  const [captures, setCaptures] = useState<LabCapture[]>([])
  const [selectedCapture, setSelectedCapture] = useState<LabCapture | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('parsed') // Changed default to parsed for better UX
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadCaptures = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('captures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[PhiVisionLab] Error loading captures:', error)
        return
      }

      const transformedCaptures = (data || []).map((c) => transformToLabCapture(c as DBCapture))
      setCaptures(transformedCaptures)

      if (transformedCaptures.length > 0 && !selectedCapture) {
        setSelectedCapture(transformedCaptures[0])
      }
    } catch (err) {
      console.error('[PhiVisionLab] Error:', err)
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
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefresh = async () => {
    await loadCaptures()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette capture ?')) return

    try {
      const { error } = await supabase.from('captures').delete().eq('id', id)
      if (error) {
        console.error('[PhiVisionLab] Error deleting capture:', error)
        return
      }

      setCaptures((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (selectedCapture?.id === id) {
          setSelectedCapture(filtered[0] || null)
        }
        return filtered
      })
    } catch (err) {
      console.error('[PhiVisionLab] Error:', err)
    }
  }

  return (
    <div className="flex h-full gap-6 p-2">
      {/* Liste des captures sidebar */}
      <div className="w-80 flex flex-col bg-surface-50/50 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-wide">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shadow-neon">
                <Microscope className="w-5 h-5" />
              </div>
              PhiVision
            </h1>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 font-medium uppercase tracking-wider">
            <span>Historique</span>
            <span>{captures.length} Captures</span>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : captures.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              Aucune capture récente
            </div>
          ) : (
            captures.map((capture) => (
              <CaptureListItem
                key={capture.id}
                capture={capture}
                isSelected={selectedCapture?.id === capture.id}
                onClick={() => setSelectedCapture(capture)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 flex flex-col bg-surface-50/30 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-radial from-axora-900/10 to-transparent pointer-events-none" />

        {selectedCapture ? (
          <>
            {/* Toolbar / Tabs */}
            <div className="flex items-center gap-2 p-4 border-b border-white/5 bg-surface-50/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex bg-surface-100/50 p-1 rounded-xl border border-white/5">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                      activeTab === tab.id
                        ? 'text-white shadow-lg'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="active-tab"
                        className="absolute inset-0 bg-surface-200/80 rounded-lg border border-white/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <tab.icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <button
                onClick={() => handleDelete(selectedCapture.id)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-5xl mx-auto space-y-8"
                >
                  {/* Common Header for all tabs (Context Summary) */}
                  <CaptureHeader capture={selectedCapture} />

                  {activeTab === 'ocr' && (
                    <TabOCR capture={selectedCapture} onCopy={handleCopy} copied={copied} />
                  )}
                  {activeTab === 'parsed' && <TabParsed capture={selectedCapture} />}
                  {activeTab === 'enrichment' && <TabEnrichment capture={selectedCapture} />}
                  {activeTab === 'mistral' && (
                    <TabMistral capture={selectedCapture} onCopy={handleCopy} copied={copied} />
                  )}
                  {activeTab === 'metadata' && <TabMetadata capture={selectedCapture} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-4">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center animate-pulse-slow">
              <Scan className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium">Sélectionnez une capture pour l'analyser</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------------

const CaptureListItem = memo(function CaptureListItem({ capture, isSelected, onClick }: { capture: LabCapture, isSelected: boolean, onClick: () => void }) {
  const ctx = getPhiBrainContext(capture)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-2xl transition-all duration-300 group border relative overflow-hidden',
        isSelected
          ? 'bg-surface-100/80 border-axora-500/30'
          : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
      )}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-axora-500" />}

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {ctx ? (
            <div className={cn("p-1.5 rounded-lg", ctx.color)}>
              <ctx.icon className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-surface-300/20 text-surface-400">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-xs font-semibold text-white/90 tracking-wide">
            {ctx?.context.replace('_', ' ') || 'Inconnu'}
          </span>
        </div>
        {capture.ocrConfidence && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
            capture.ocrConfidence > 0.8 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
          )}>
            {(capture.ocrConfidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <div className="text-xs text-white/40 font-mono mb-2 pl-1">
        {capture.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        <span className="mx-1.5 opacity-30">|</span>
        {capture.createdAt.toLocaleDateString('fr-FR')}
      </div>

      <div className="text-xs text-surface-400 pl-1 truncate group-hover:text-surface-300 transition-colors">
        {capture.rawText?.substring(0, 40) || 'Aucun texte extrait...'}
      </div>
    </button>
  )
})

function CaptureHeader({ capture }: { capture: LabCapture }) {
  return (
    <div className="flex items-start gap-6 p-6 rounded-3xl bg-surface-100/40 border border-white/5 backdrop-blur-md shadow-glass">
      <div className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 relative group">
        {capture.imageUrl ? (
          <img src={capture.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-white/20">
            <FileText className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white tracking-tight">Analyse PhiVision</h2>
          <div className="px-3 py-1 rounded-full bg-surface-200/50 border border-white/5 text-xs font-mono text-white/60">
            ID: {capture.id.substring(0, 8)}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-200/20 border border-white/5">
            <Clock className="w-4 h-4 text-axora-400" />
            <span className="text-sm text-white/80">{capture.createdAt.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-200/20 border border-white/5">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/80">{capture.char_count} chars</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab: Texte OCR
function TabOCR({ capture, onCopy, copied }: { capture: LabCapture; onCopy: (t: string) => void; copied: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Texte Brut Extrait</h3>
        <button onClick={() => capture.rawText && onCopy(capture.rawText)} className="text-xs flex items-center gap-2 text-axora-400 hover:text-axora-300 transition-colors">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copié !' : 'Copier le texte'}
        </button>
      </div>
      <div className="bg-black/40 rounded-2xl border border-white/5 p-6 font-mono text-sm text-surface-400 leading-relaxed max-h-[500px] overflow-auto shadow-inner">
        {capture.rawText}
      </div>
    </div>
  )
}

// Tab: Données Parsées - PhiBRAIN-V2
function TabParsed({ capture }: { capture: LabCapture }) {
  const data = capture.parsed_data
  const phiBrainData = data as PhiBrainResult | undefined

  if (phiBrainData?.context) {
    return <PhiBrainResultView result={phiBrainData} />
  }

  // Fallback generic json
  return (
    <div className="bg-surface-100/50 rounded-3xl border border-white/5 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-400" /> Données Structurées
      </h3>
      <pre className="text-xs text-medical-300 font-mono whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// ===== Result Views =====

function PhiBrainResultView({ result }: { result: PhiBrainResult }) {
  switch (result.context) {
    case 'FACTURATION_ORDO': return <FacturationOrdoView result={result} />
    case 'ORDONNANCE_SCAN': return <OrdonnanceScanView result={result} />
    default: return <div className="text-white/40">Vue non implémentée pour ce contexte</div>
  }
}

function FacturationOrdoView({ result }: { result: FacturationOrdoResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Patient" icon={User} color="text-pink-400">
          <InfoRow label="Nom" value={result.patient_fullname} />
          <InfoRow label="Âge" value={result.patient_age_years ? `${result.patient_age_years} ans` : undefined} />
          <InfoRow label="Assurance" value={result.insurance} highlight />
        </InfoCard>

        <InfoCard title="Prescripteur" icon={Stethoscope} color="text-cyan-400">
          <InfoRow label="Nom" value={result.prescriber} />
        </InfoCard>
      </div>

      {result.lines.length > 0 && (
        <div className="bg-surface-50/50 border border-white/5 rounded-3xl overflow-hidden shadow-glass">
          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-axora-400" /> Lignes de Facturation
            </h4>
            <div className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/60 font-mono">
              {result.lines.length} lignes
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/40 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Désignation</th>
                <th className="text-right py-3 px-4 font-medium">Qté</th>
                <th className="text-right py-3 px-4 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {result.lines.map((line, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white/90 font-medium">{line.designation}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{line.qty}</td>
                  <td className="py-3 px-4 text-right text-white/60 font-mono">{(line.unit_price_eur || 0).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.total_eur !== null && (
            <div className="p-4 bg-axora-900/20 border-t border-white/5 flex justify-between items-center">
              <span className="text-white/60 uppercase tracking-wider text-xs font-bold">Total Facturé</span>
              <span className="text-2xl font-bold text-medical-400 font-mono">{result.total_eur.toFixed(2)} €</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrdonnanceScanView({ result }: { result: OrdonnanceScanResult }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InfoCard title="Prescripteur" icon={Stethoscope} color="text-indigo-400">
        <InfoRow label="Nom" value={result.prescriber_name} />
        <InfoRow label="RPPS" value={result.prescriber_rpps} fontMono />
        <InfoRow label="Spécialité" value={result.prescriber_specialty} />
      </InfoCard>
      <InfoCard title="Patient" icon={User} color="text-pink-400">
        <InfoRow label="Nom" value={result.patient_fullname} />
        <InfoRow label="Date de naissance" value={result.patient_birthdate} />
        <InfoRow label="Date prescription" value={result.prescription_date} />
      </InfoCard>
    </div>
  )
}

// Helpers Components
function InfoCard({ title, icon: Icon, color, children }: { title: string, icon: React.ElementType, color: string, children: React.ReactNode }) {
  return (
    <div className="bg-surface-100/40 border border-white/5 rounded-3xl p-5 hover:bg-surface-100/60 transition-colors duration-300">
      <h4 className="text-sm font-medium text-white/80 flex items-center gap-2 mb-4 uppercase tracking-wider">
        <Icon className={cn("w-4 h-4", color)} />
        {title}
      </h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight, fontMono }: { label: string, value?: string | null, highlight?: boolean, fontMono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center group">
      <span className="text-surface-400 text-xs font-medium">{label}</span>
      <span className={cn(
        "text-sm relative z-10",
        highlight ? "text-cyan-400" : "text-white/90",
        fontMono && "font-mono"
      )}>{value}</span>
      {/* Dots leader effect on hover could go here */}
    </div>
  )
}

// Tab: Enrichissement (Restored)
function TabEnrichment({ capture }: { capture: LabCapture }) {
  // Parsing enrichment data safely
  const enrichmentData = capture.enrichment || {};

  // If enrichment is empty, check if we can show tags or other metadata
  const hasData = Object.keys(enrichmentData).length > 0;
  const tags = capture.tags || [];

  // Extract typed values safely
  const confidence = typeof enrichmentData.confidence === 'number' ? enrichmentData.confidence : null;
  const summary = typeof enrichmentData.summary === 'string' ? enrichmentData.summary : null;

  if (!hasData && tags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-100/30 rounded-3xl border border-white/5 border-dashed">
        <Brain className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40">Aucune donnée d'enrichissement disponible pour cette capture.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Résumé / Tags */}
      {(tags.length > 0 || hasData) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {tag}
            </span>
          ))}
          {/* Try to extract confidence or summary from enrichment if available */}
          {confidence !== null && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Confiance: {confidence <= 1 ? (confidence * 100).toFixed(0) : confidence}%
            </span>
          )}
        </div>
      )}

      {/* Structured Enrichment Data (if any specific fields exist) */}
      {summary && (
        <InfoCard title="Résumé" icon={FileText} color="text-amber-400">
          <p className="text-sm text-white/80 leading-relaxed">{summary}</p>
        </InfoCard>
      )}

      {/* Raw Enrichment JSON */}
      <div className="bg-surface-100/50 rounded-3xl border border-white/5 p-6 shadow-sm">
        <h4 className="text-sm font-medium text-white/80 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" /> Données Brutes
        </h4>
        <pre className="text-xs text-purple-300 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">
          {JSON.stringify(enrichmentData, null, 2)}
        </pre>
      </div>
    </div>
  )
}

function TabMistral({ capture, onCopy, copied }: { capture: LabCapture; onCopy: (t: string) => void; copied: boolean }) {
  let contentToDisplay = "";
  let isJson = false;

  // Try to use rawText and pretty print it first
  if (capture.rawText) {
    try {
      const parsed = JSON.parse(capture.rawText);
      contentToDisplay = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch (e) {
      contentToDisplay = capture.rawText;
      isJson = false;
    }
  } else if (capture.mistral_response) {
    contentToDisplay = JSON.stringify(capture.mistral_response, null, 2);
    isJson = true;
  }

  if (!contentToDisplay) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-100/30 rounded-3xl border border-white/5 border-dashed">
        <Bot className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40">Aucune donnée disponible.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className={cn("text-xs font-medium flex items-center gap-1", isJson ? "text-emerald-400" : "text-amber-400")}>
          {isJson ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {isJson ? "JSON Reçu & Formatté" : "Texte Brut (Non-JSON)"}
        </span>
        <button onClick={() => onCopy(contentToDisplay)} className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors">
          <Copy className="w-3 h-3" />
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <div className="bg-black/40 p-6 rounded-3xl border border-white/10 font-mono text-xs text-cyan-300 overflow-auto max-h-[600px] shadow-inner">
        <pre className="whitespace-pre-wrap break-all">{contentToDisplay}</pre>
      </div>
    </div>
  )
}

function TabMetadata({ capture }: { capture: LabCapture }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InfoCard title="Technique" icon={Activity} color="text-surface-400">
        <InfoRow label="ID Capture" value={capture.id} fontMono />
        <InfoRow label="Créé le" value={capture.createdAt.toLocaleString()} />
        <InfoRow label="Mis à jour" value={capture.updatedAt.toLocaleString()} />
      </InfoCard>

      <InfoCard title="Performance" icon={BarChart3} color="text-emerald-400">
        <InfoRow label="Confiance OCR" value={capture.ocrConfidence != null ? `${(capture.ocrConfidence * 100).toFixed(1)}%` : 'Non disponible'} highlight={capture.ocrConfidence != null} />
        <InfoRow label="Nb Carbon" value={capture.char_count.toString()} />
        <InfoRow label="Taille JSON" value={capture.rawText ? `${(capture.rawText.length / 1024).toFixed(2)} KB` : '0 KB'} fontMono />
      </InfoCard>
    </div>
  )
}
