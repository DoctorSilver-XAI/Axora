/**
 * Composant principal orchestrant le calcul de posologie
 * Assemble DrugSearchInput, DrugCard, PatientForm, PosologyResult et GenericsList
 */

import { useState, useCallback } from 'react'
import { Calculator, RefreshCw, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { PatientData, PosologyCalculation } from '../types'
import { PosologyService } from '../services/PosologyService'
import { DrugSearchInput } from './DrugSearchInput'
import { DrugCard } from './DrugCard'
import { PatientForm } from './PatientForm'
import { PosologyResult } from './PosologyResult'
import { GenericsList } from './GenericsList'
import { BDPMLocalStatus } from './BDPMLocalStatus'
import { cn } from '@shared/utils/cn'

const initialPatient: PatientData = {
  weightKg: 0,
  age: 0,
  ageUnit: 'years',
  isPediatric: true,
}

export function PosologyCalculator() {
  // State
  const [selectedDrug, setSelectedDrug] = useState<BDPMProduct | null>(null)
  const [patient, setPatient] = useState<PatientData>(initialPatient)
  const [calculation, setCalculation] = useState<PosologyCalculation | null>(null)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [generiques, setGeneriques] = useState<BDPMProduct[]>([])
  const [loadingGeneriques, setLoadingGeneriques] = useState(false)

  // Handlers
  const handleDrugSelect = useCallback(async (drug: BDPMProduct) => {
    setSelectedDrug(drug)
    setCalculation(null)
    setCalculationError(null)
    setGeneriques([])

    // Charger les génériques en arrière-plan
    setLoadingGeneriques(true)
    try {
      const genList = await PosologyService.getGeneriques(drug)
      setGeneriques(genList)
    } catch (err) {
      console.error('[PosologyCalculator] Erreur chargement génériques:', err)
    } finally {
      setLoadingGeneriques(false)
    }
  }, [])

  const handleClearDrug = useCallback(() => {
    setSelectedDrug(null)
    setCalculation(null)
    setCalculationError(null)
    setGeneriques([])
  }, [])

  const handlePatientChange = useCallback((data: Partial<PatientData>) => {
    setPatient((prev) => ({ ...prev, ...data }))
    // Clear previous calculation when patient data changes
    setCalculation(null)
    setCalculationError(null)
  }, [])

  const handleCalculate = useCallback(() => {
    if (!selectedDrug || patient.weightKg <= 0) return

    const result = PosologyService.calculatePosology(selectedDrug, patient)

    if ('error' in result) {
      setCalculationError(result.error)
      setCalculation(null)
    } else {
      setCalculation(result)
      setCalculationError(null)
    }
  }, [selectedDrug, patient])

  const handleReset = useCallback(() => {
    setSelectedDrug(null)
    setPatient(initialPatient)
    setCalculation(null)
    setCalculationError(null)
    setGeneriques([])
  }, [])

  const canCalculate = selectedDrug && patient.weightKg > 0 && patient.age >= 0

  return (
    <div className="max-w-2xl space-y-6">
      {/* Section 1: Recherche de médicament */}
      <section>
        <h3 className="text-sm font-medium text-white/60 mb-3">1. Sélectionner un médicament</h3>
        {!selectedDrug ? (
          <DrugSearchInput onSelect={handleDrugSelect} />
        ) : (
          <DrugCard drug={selectedDrug} onClear={handleClearDrug} />
        )}
      </section>

      {/* Section 2: Données patient (visible si médicament sélectionné) */}
      <AnimatePresence>
        {selectedDrug && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3 className="text-sm font-medium text-white/60 mb-3">2. Données du patient</h3>
            <PatientForm patient={patient} onChange={handlePatientChange} />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Actions */}
      {selectedDrug && (
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={cn(
              'flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
              canCalculate
                ? 'bg-axora-500 text-white hover:bg-axora-600 active:scale-[0.98]'
                : 'bg-white/5 text-white/40 cursor-not-allowed'
            )}
          >
            <Calculator className="w-4 h-4" />
            Calculer la posologie
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Réinitialiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Erreur de calcul */}
      <AnimatePresence>
        {calculationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">Calcul impossible</p>
                <p className="text-sm text-red-400/80">{calculationError}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 3: Résultats */}
      <AnimatePresence>
        {calculation && selectedDrug && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h3 className="text-sm font-medium text-white/60 mb-3">3. Résultat du calcul</h3>
            <PosologyResult
              calculation={calculation}
              drug={selectedDrug}
              patient={patient}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Section 4: Génériques */}
      {selectedDrug && (generiques.length > 0 || loadingGeneriques) && (
        <section>
          <h3 className="text-sm font-medium text-white/60 mb-3">Alternatives génériques</h3>
          <GenericsList
            generiques={generiques}
            currentDrug={selectedDrug}
            isLoading={loadingGeneriques}
          />
        </section>
      )}

      {/* Statut base locale */}
      <BDPMLocalStatus />

      {/* Avertissement */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-400/80">
          <strong>⚠️ Avertissement :</strong> Ce calculateur est un outil d'aide à la décision.
          Vérifiez toujours les posologies avec le RCP du médicament et adaptez selon le contexte
          clinique du patient. <span className="text-white/40">Source : BDPM (ANSM)</span>
        </p>
      </div>
    </div>
  )
}
