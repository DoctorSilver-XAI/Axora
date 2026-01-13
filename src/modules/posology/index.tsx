import { useState } from 'react'
import { Calculator, Weight, Calendar, Pill, RefreshCw } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { cn } from '@shared/utils/cn'

function PosologyCalculator() {
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [dosePerKg, setDosePerKg] = useState('')
  const [frequency, setFrequency] = useState('3')
  const [result, setResult] = useState<{
    singleDose: number
    dailyDose: number
  } | null>(null)

  const calculate = () => {
    const w = parseFloat(weight)
    const dose = parseFloat(dosePerKg)
    const freq = parseInt(frequency)

    if (isNaN(w) || isNaN(dose) || isNaN(freq) || w <= 0 || dose <= 0 || freq <= 0) {
      return
    }

    const dailyDose = w * dose
    const singleDose = dailyDose / freq

    setResult({
      singleDose: Math.round(singleDose * 100) / 100,
      dailyDose: Math.round(dailyDose * 100) / 100,
    })
  }

  const reset = () => {
    setWeight('')
    setAge('')
    setDosePerKg('')
    setFrequency('3')
    setResult(null)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <Weight className="w-4 h-4" />
            Poids du patient (kg)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="ex: 70"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-axora-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <Calendar className="w-4 h-4" />
            Âge (optionnel)
          </label>
          <input
            type="text"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="ex: 45 ans"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-axora-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <Pill className="w-4 h-4" />
            Dose par kg (mg/kg/jour)
          </label>
          <input
            type="number"
            value={dosePerKg}
            onChange={(e) => setDosePerKg(e.target.value)}
            placeholder="ex: 50"
            step="0.1"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-axora-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/60">Nombre de prises par jour</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-axora-500/50 focus:outline-none transition-colors"
          >
            <option value="1">1 prise</option>
            <option value="2">2 prises</option>
            <option value="3">3 prises</option>
            <option value="4">4 prises</option>
            <option value="6">6 prises</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={calculate}
          disabled={!weight || !dosePerKg}
          className={cn(
            'flex-1 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
            weight && dosePerKg
              ? 'bg-axora-500 text-white hover:bg-axora-600'
              : 'bg-white/5 text-white/40 cursor-not-allowed'
          )}
        >
          <Calculator className="w-4 h-4" />
          Calculer
        </button>
        <button
          onClick={reset}
          className="px-4 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-axora-500/10 to-axora-600/5 border border-axora-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Résultat du calcul</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-white/60 mb-1">Dose par prise</p>
              <p className="text-2xl font-bold text-axora-400">
                {result.singleDose} <span className="text-base font-normal text-white/60">mg</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-sm text-white/60 mb-1">Dose journalière</p>
              <p className="text-2xl font-bold text-cyan-400">
                {result.dailyDose} <span className="text-base font-normal text-white/60">mg/j</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-4">
            Calcul basé sur : {weight} kg × {dosePerKg} mg/kg/jour = {result.dailyDose} mg/jour ÷ {frequency} prises
          </p>
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-400/80">
          <strong>Note :</strong> Ce calculateur est un outil d'aide. Vérifiez toujours les posologies
          avec les recommandations officielles et adaptez selon le contexte clinique du patient.
        </p>
      </div>
    </div>
  )
}

// Module definition
const posologyModule: ModuleDefinition = {
  id: 'posology',
  name: 'Calculateur Posologie',
  description: 'Calculs de posologie adaptés au poids du patient',
  version: '1.0.0',
  category: 'tools',
  status: 'available',
  icon: Calculator,
  keywords: ['posologie', 'calcul', 'dose', 'poids', 'mg/kg'],
  component: PosologyCalculator,
}

// Register the module
registerModule(posologyModule)

export default posologyModule
