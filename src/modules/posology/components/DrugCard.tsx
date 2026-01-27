/**
 * Carte d'affichage du médicament sélectionné
 * Montre la composition, prix, disponibilité et alertes
 */

import { X, FlaskConical, Package, Building2, Euro, AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { PosologyService } from '../services/PosologyService'

interface DrugCardProps {
  drug: BDPMProduct
  onClear: () => void
}

export function DrugCard({ drug, onClear }: DrugCardProps) {
  const substances = drug.productData.substances_actives || []
  const presentations = drug.productData.presentations || []
  const alertes = drug.productData.alertes_actives || []
  const disponibilite = drug.productData.disponibilite

  // Trouver la présentation avec le meilleur prix
  const availablePresentations = presentations.filter((p) => p.commercialise && p.prix)
  const cheapestPresentation = availablePresentations.sort((a, b) => (a.prix || 0) - (b.prix || 0))[0]

  // Vérifier si le DCI est dans le référentiel
  const dci = PosologyService.extractMainDCI(drug)
  const hasDosageRule = dci ? PosologyService.hasDosageRule(dci) : false

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl bg-gradient-to-br from-axora-500/10 to-axora-600/5 border border-axora-500/20"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{drug.productName}</h3>
          {drug.formePharmaceutique && (
            <p className="text-sm text-white/60">{drug.formePharmaceutique}</p>
          )}
        </div>
        <button
          onClick={onClear}
          className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Composition */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
          <FlaskConical className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-white/40 mb-1">Composition</p>
            {substances.length > 0 ? (
              <div className="space-y-0.5">
                {substances.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-sm text-white truncate">
                    {s.substance} {s.dosage && <span className="text-axora-400">{s.dosage}</span>}
                  </p>
                ))}
                {substances.length > 3 && (
                  <p className="text-xs text-white/40">+{substances.length - 3} autres</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/60">Non renseignée</p>
            )}
          </div>
        </div>

        {/* Laboratoire */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
          <Building2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-white/40 mb-1">Laboratoire</p>
            <p className="text-sm text-white truncate">{drug.laboratory || 'Non renseigné'}</p>
          </div>
        </div>

        {/* Prix */}
        {cheapestPresentation && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
            <Euro className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-white/40 mb-1">Prix public</p>
              <p className="text-sm text-white">
                {cheapestPresentation.prix?.toFixed(2)} €
                {cheapestPresentation.remboursement && (
                  <span className="text-green-400 ml-2">· {cheapestPresentation.remboursement}</span>
                )}
              </p>
              <p className="text-xs text-white/40 truncate">{cheapestPresentation.libelle}</p>
            </div>
          </div>
        )}

        {/* Conditionnements */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
          <Package className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-white/40 mb-1">Conditionnements</p>
            <p className="text-sm text-white">
              {availablePresentations.length} présentation{availablePresentations.length > 1 ? 's' : ''} disponible{availablePresentations.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Disponibilité */}
        {drug.hasRupture ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              {disponibilite?.statut || 'Rupture de stock'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Disponible</span>
          </div>
        )}

        {/* Alerte sécurité */}
        {drug.hasAlerte && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Alerte de sécurité</span>
          </div>
        )}

        {/* Générique */}
        {drug.isGenerique && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm">
            <span>Générique</span>
          </div>
        )}

        {/* MITM */}
        {drug.isMitm && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
            <span>MITM</span>
          </div>
        )}

        {/* Posologie disponible */}
        {hasDosageRule ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-axora-500/20 text-axora-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Posologie disponible</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-sm">
            <Info className="w-4 h-4" />
            <span>Posologie non référencée</span>
          </div>
        )}
      </div>

      {/* Alertes actives */}
      {alertes.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm font-medium text-amber-400 mb-2">⚠️ Alertes actives</p>
          <ul className="space-y-1">
            {alertes.slice(0, 2).map((alerte, i) => (
              <li key={i} className="text-sm text-amber-400/80">
                {alerte.texte.length > 150 ? alerte.texte.slice(0, 150) + '...' : alerte.texte}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
