/**
 * Affichage des résultats du calcul de posologie
 * Cards avec dose par prise, dose journalière, et warnings
 */

import { motion } from 'framer-motion'
import { Pill, Clock, AlertTriangle, Info, Calculator } from 'lucide-react'
import { PosologyCalculation, PatientData } from '../types'
import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { cn } from '@shared/utils/cn'

interface PosologyResultProps {
  calculation: PosologyCalculation
  drug: BDPMProduct
  patient: PatientData
}

export function PosologyResult({ calculation, drug, patient }: PosologyResultProps) {
  const substances = drug.productData.substances_actives || []
  const mainSubstance = substances[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main result cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Dose par prise */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-axora-500/20 to-axora-600/10 border border-axora-500/30">
          <div className="flex items-center gap-2 text-axora-400 mb-3">
            <Pill className="w-4 h-4" />
            <span className="text-sm font-medium">Dose par prise</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {calculation.singleDoseMg}
            <span className="text-lg font-normal text-white/60 ml-1">mg</span>
          </p>
          {calculation.recommendation && (
            <p className="text-sm text-axora-400 mt-2">{calculation.recommendation}</p>
          )}
        </div>

        {/* Dose journalière */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-400 mb-3">
            <Calculator className="w-4 h-4" />
            <span className="text-sm font-medium">Dose journalière</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {calculation.dailyDoseMg}
            <span className="text-lg font-normal text-white/60 ml-1">mg/j</span>
          </p>
          {calculation.isCapped && (
            <p className="text-sm text-amber-400 mt-2">⚠️ Plafonnée</p>
          )}
        </div>
      </div>

      {/* Frequency and interval */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
        <Clock className="w-5 h-5 text-white/40" />
        <div className="flex-1">
          <p className="text-white">
            <span className="font-medium">{calculation.frequency} prises</span> par jour
          </p>
          <p className="text-sm text-white/60">
            Intervalle minimum : {calculation.intervalHours} heures entre les prises
          </p>
        </div>
      </div>

      {/* Calculation basis */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 text-white/60 mb-2">
          <Info className="w-4 h-4" />
          <span className="text-sm">Base de calcul</span>
        </div>
        <p className="text-sm text-white/80">
          {mainSubstance && (
            <>
              <span className="text-white font-medium">{mainSubstance.substance}</span>
              {mainSubstance.dosage && ` ${mainSubstance.dosage}`}
            </>
          )}
        </p>
        <p className="text-xs text-white/40 mt-1">
          {patient.weightKg} kg × posologie standard = {calculation.dailyDoseMg} mg/jour ÷ {calculation.frequency} prises
        </p>
      </div>

      {/* Warnings */}
      {calculation.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Notes importantes</span>
          </div>
          <ul className="space-y-2">
            {calculation.warnings.map((warning, i) => (
              <li
                key={i}
                className={cn(
                  'text-sm pl-4 relative',
                  warning.startsWith('Plafonnée') || warning.startsWith('Dose par prise')
                    ? 'text-amber-400'
                    : 'text-white/70'
                )}
              >
                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-current" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
