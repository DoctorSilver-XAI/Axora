/**
 * ParsedResultView - Affichage structuré des résultats PhiBrain
 * Parse le JSON et affiche selon le contexte (FACTURATION_ORDO, ORDONNANCE_SCAN, etc.)
 */

import { useMemo } from 'react'
import { User, Stethoscope, Receipt, AlertTriangle, FileText, ClipboardCheck, ShieldAlert, Pill } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type {
  PhiBrainResult,
  FacturationOrdoResult,
  OrdonnanceScanResult,
  ControlOrdonnanceResult,
} from '../services/OCRService'

interface ParsedResultViewProps {
  rawText: string | null
  className?: string
}

export function ParsedResultView({ rawText, className }: ParsedResultViewProps) {
  const parsed = useMemo(() => {
    if (!rawText) return null
    try {
      const data = JSON.parse(rawText)
      // Handle nested document_annotation
      if (data.document_annotation) {
        try {
          return JSON.parse(data.document_annotation) as PhiBrainResult
        } catch {
          return data as PhiBrainResult
        }
      }
      return data as PhiBrainResult
    } catch {
      return null
    }
  }, [rawText])

  if (!parsed || !parsed.context) {
    return (
      <div className={cn('p-4 rounded-xl bg-surface-100/50 border border-white/5', className)}>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <FileText className="w-4 h-4" />
          <span>Données non structurées</span>
        </div>
        {rawText && (
          <pre className="mt-3 text-xs text-white/60 font-mono whitespace-pre-wrap max-h-32 overflow-auto">
            {rawText.substring(0, 500)}...
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Context Badge & Confidence */}
      <div className="flex items-center gap-3">
        <ContextBadge context={parsed.context} />
        {parsed.confidence !== undefined && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-md',
            parsed.confidence > 0.8
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          )}>
            {(parsed.confidence * 100).toFixed(0)}% confiance
          </span>
        )}
      </div>

      {/* Render based on context */}
      {parsed.context === 'FACTURATION_ORDO' && (
        <FacturationView data={parsed as FacturationOrdoResult} />
      )}
      {parsed.context === 'ORDONNANCE_SCAN' && (
        <OrdonnanceView data={parsed as OrdonnanceScanResult} />
      )}
      {parsed.context === 'FICHE_PATIENT' && (
        <GenericView data={parsed} title="Fiche Patient" />
      )}
      {parsed.context === 'CONTROLE_ORDONNANCE' && (
        <ControlOrdonnanceView data={parsed as ControlOrdonnanceResult} />
      )}
      {parsed.context === 'UNKNOWN' && (
        <GenericView data={parsed} title="Document" />
      )}

      {/* Missing Fields Warning */}
      {parsed.missing_fields && parsed.missing_fields.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-400">Champs manquants</p>
            <p className="text-xs text-white/50 mt-0.5">
              {parsed.missing_fields.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Context Badge
// =============================================================================

function ContextBadge({ context }: { context: string }) {
  const config: Record<string, { label: string; icon: typeof Receipt; color: string }> = {
    FACTURATION_ORDO: { label: 'Facturation', icon: Receipt, color: 'bg-cyan-500/20 text-cyan-400' },
    ORDONNANCE_SCAN: { label: 'Ordonnance', icon: FileText, color: 'bg-indigo-500/20 text-indigo-400' },
    FICHE_PATIENT: { label: 'Fiche Patient', icon: User, color: 'bg-pink-500/20 text-pink-400' },
    CONTROLE_ORDONNANCE: { label: 'Contrôle Ordo', icon: ClipboardCheck, color: 'bg-orange-500/20 text-orange-400' },
    UNKNOWN: { label: 'Document', icon: FileText, color: 'bg-white/10 text-white/60' },
  }

  const conf = config[context] || config.UNKNOWN
  const Icon = conf.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg', conf.color)}>
      <Icon className="w-3.5 h-3.5" />
      {conf.label}
    </span>
  )
}

// =============================================================================
// Facturation View
// =============================================================================

function FacturationView({ data }: { data: FacturationOrdoResult }) {
  return (
    <div className="space-y-4">
      {/* Patient & Prescripteur */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard icon={User} title="Patient" color="text-pink-400">
          <InfoRow label="Nom" value={data.patient_fullname} />
          <InfoRow label="Âge" value={data.patient_age_years ? `${data.patient_age_years} ans` : null} />
          <InfoRow label="Assurance" value={data.insurance} highlight />
        </InfoCard>

        <InfoCard icon={Stethoscope} title="Prescripteur" color="text-cyan-400">
          <InfoRow label="Nom" value={data.prescriber} />
        </InfoCard>
      </div>

      {/* Flags */}
      {data.flags && data.flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.flags.map((flag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Lines Table */}
      {data.lines && data.lines.length > 0 && (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/5">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide">
              Lignes de facturation
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/40 uppercase tracking-wide">
                <th className="text-left py-2 px-4 font-medium">Désignation</th>
                <th className="text-center py-2 px-4 font-medium w-16">Qté</th>
                <th className="text-right py-2 px-4 font-medium w-24">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.lines.map((line, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4 text-white/90">{line.designation}</td>
                  <td className="py-2.5 px-4 text-center text-cyan-400 font-mono">{line.qty}</td>
                  <td className="py-2.5 px-4 text-right text-white/70 font-mono">
                    {line.unit_price_eur?.toFixed(2) ?? '—'}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          {data.total_eur !== null && (
            <div className="px-4 py-3 bg-axora-500/10 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Total</span>
              <span className="text-lg font-bold text-axora-400 font-mono">
                {data.total_eur.toFixed(2)}€
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Ordonnance View
// =============================================================================

function OrdonnanceView({ data }: { data: OrdonnanceScanResult }) {
  return (
    <div className="space-y-4">
      {/* Prescripteur & Patient */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard icon={Stethoscope} title="Prescripteur" color="text-indigo-400">
          <InfoRow label="Nom" value={data.prescriber_name} />
          <InfoRow label="RPPS" value={data.prescriber_rpps} mono />
          <InfoRow label="Spécialité" value={data.prescriber_specialty} />
        </InfoCard>

        <InfoCard icon={User} title="Patient" color="text-pink-400">
          <InfoRow label="Nom" value={data.patient_fullname} />
          <InfoRow label="Naissance" value={data.patient_birthdate} />
        </InfoCard>
      </div>

      {/* Date prescription */}
      {data.prescription_date && (
        <div className="text-sm text-white/60">
          Date de prescription : <span className="text-white/80">{data.prescription_date}</span>
        </div>
      )}

      {/* Mentions */}
      {data.mentions && data.mentions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.mentions.map((mention, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
            >
              {mention}
            </span>
          ))}
        </div>
      )}

      {/* Medications */}
      {data.medications && data.medications.length > 0 && (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/5">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide">
              Médicaments ({data.medications.length})
            </h4>
          </div>
          <div className="divide-y divide-white/5">
            {data.medications.map((med, i) => (
              <div key={i} className="px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">{med.name}</p>
                    {med.dci && (
                      <p className="text-xs text-cyan-400 mt-0.5">{med.dci}</p>
                    )}
                  </div>
                  {med.qty && (
                    <span className="text-xs font-mono text-white/50">×{med.qty}</span>
                  )}
                </div>
                {med.posology && (
                  <p className="text-xs text-white/60 mt-1">{med.posology}</p>
                )}
                {med.duration && (
                  <p className="text-xs text-white/40 mt-0.5">Durée : {med.duration}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Contrôle Ordonnance View
// =============================================================================

function ControlOrdonnanceView({ data }: { data: ControlOrdonnanceResult }) {
  // TODO(human): Implement getClinicalAlerts function
  // This function should analyze the medications and patient data to return clinical alerts
  // Return type: Array<{ type: 'warning' | 'danger' | 'info', message: string }>
  const getClinicalAlerts = (): Array<{ type: 'warning' | 'danger' | 'info'; message: string }> => {
    return []
  }

  const alerts = getClinicalAlerts()

  return (
    <div className="space-y-4">
      {/* Control Status Badge */}
      {data.control_status && (
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
          data.control_status === 'validated' && 'bg-emerald-500/20 text-emerald-400',
          data.control_status === 'pending' && 'bg-amber-500/20 text-amber-400',
          data.control_status === 'rejected' && 'bg-red-500/20 text-red-400'
        )}>
          <ClipboardCheck className="w-4 h-4" />
          {data.control_status === 'validated' && 'Validé'}
          {data.control_status === 'pending' && 'En attente de contrôle'}
          {data.control_status === 'rejected' && 'Rejeté'}
        </div>
      )}

      {/* Clinical Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg border',
                alert.type === 'danger' && 'bg-red-500/10 border-red-500/20',
                alert.type === 'warning' && 'bg-amber-500/10 border-amber-500/20',
                alert.type === 'info' && 'bg-blue-500/10 border-blue-500/20'
              )}
            >
              <ShieldAlert className={cn(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                alert.type === 'danger' && 'text-red-400',
                alert.type === 'warning' && 'text-amber-400',
                alert.type === 'info' && 'text-blue-400'
              )} />
              <p className="text-sm text-white/80">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Patient & Prescripteur */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard icon={User} title="Patient" color="text-pink-400">
          <InfoRow label="Nom" value={data.patient_fullname} />
          <InfoRow label="Âge" value={data.patient_age_years ? `${data.patient_age_years} ans` : null} />
          <InfoRow label="Sexe" value={data.patient_sex} />
          <InfoRow label="Ville" value={data.patient_city} />
        </InfoCard>

        <InfoCard icon={Stethoscope} title="Prescripteur" color="text-cyan-400">
          <InfoRow label="Nom" value={data.prescriber_name} />
          <InfoRow label="RPPS" value={data.prescriber_rpps} mono />
          <InfoRow label="Spécialité" value={data.prescriber_specialty} />
          <InfoRow label="Ville" value={data.prescriber_city} />
        </InfoCard>
      </div>

      {/* Pathologies & Allergies - Critical for control */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pathologies */}
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <Pill className="w-3.5 h-3.5" />
            Pathologies
          </h4>
          {data.pathologies && data.pathologies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.pathologies.map((p, i) => (
                <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-500/20 text-indigo-300">
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-white/40 italic">Non renseigné</span>
          )}
        </div>

        {/* Allergies */}
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Allergies
          </h4>
          {data.allergies && data.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.allergies.map((a, i) => (
                <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-md bg-red-500/20 text-red-300">
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-white/40 italic">Aucune connue</span>
          )}
        </div>
      </div>

      {/* Delivery Info */}
      <div className="flex flex-wrap gap-4 text-sm text-white/60">
        {data.facture_number && (
          <span>Facture : <span className="text-white/80 font-mono">{data.facture_number}</span></span>
        )}
        {data.delivery_date && (
          <span>Délivré le : <span className="text-white/80">{data.delivery_date}</span></span>
        )}
        {data.delivery_time && (
          <span>à <span className="text-white/80">{data.delivery_time}</span></span>
        )}
        {data.renewal_count !== null && data.renewal_count > 0 && (
          <span className="text-cyan-400">Renouvellement : {data.renewal_count}</span>
        )}
      </div>

      {/* Medications Table */}
      {data.medications && data.medications.length > 0 && (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="px-4 py-2.5 bg-orange-500/10 border-b border-white/5">
            <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
              Médicaments délivrés ({data.medications.length})
            </h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/40 uppercase tracking-wide">
                <th className="text-left py-2 px-4 font-medium w-16">Type</th>
                <th className="text-center py-2 px-4 font-medium w-16">Qté</th>
                <th className="text-left py-2 px-4 font-medium">Désignation</th>
                <th className="text-center py-2 px-4 font-medium w-16">Dû</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.medications.map((med, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-4">
                    {med.type && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-xs font-medium rounded',
                        med.type === 'ALD' && 'bg-emerald-500/20 text-emerald-400',
                        med.type === 'Nexo' && 'bg-purple-500/20 text-purple-400',
                        !['ALD', 'Nexo'].includes(med.type) && 'bg-white/10 text-white/60'
                      )}>
                        {med.type}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center text-cyan-400 font-mono">{med.qty}</td>
                  <td className="py-2.5 px-4 text-white/90">{med.designation}</td>
                  <td className="py-2.5 px-4 text-center text-white/50 font-mono">
                    {med.due ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Generic View (fallback)
// =============================================================================

function GenericView({ data, title }: { data: PhiBrainResult; title: string }) {
  return (
    <div className="p-4 rounded-xl bg-surface-100/50 border border-white/5">
      <h4 className="text-sm font-semibold text-white/80 mb-3">{title}</h4>
      <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap overflow-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// =============================================================================
// Helper Components
// =============================================================================

function InfoCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof User
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-xl bg-surface-100/30 border border-white/5">
      <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-1.5 mb-3">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string
  value?: string | null
  highlight?: boolean
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-white/40">{label}</span>
      <span
        className={cn(
          highlight ? 'text-cyan-400' : 'text-white/90',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </span>
    </div>
  )
}
