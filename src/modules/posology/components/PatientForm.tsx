/**
 * Formulaire de saisie des données patient
 * Poids, âge et détection automatique pédiatrique
 */

import { Weight, Calendar, Baby } from 'lucide-react'
import { PatientData, AgeUnit } from '../types'
import { cn } from '@shared/utils/cn'

interface PatientFormProps {
  patient: PatientData
  onChange: (data: Partial<PatientData>) => void
  disabled?: boolean
}

const AGE_UNITS: { value: AgeUnit; label: string }[] = [
  { value: 'years', label: 'années' },
  { value: 'months', label: 'mois' },
  { value: 'days', label: 'jours' },
]

export function PatientForm({ patient, onChange, disabled }: PatientFormProps) {
  const handleWeightChange = (value: string) => {
    const weight = parseFloat(value)
    if (!isNaN(weight) && weight >= 0) {
      onChange({ weightKg: weight })
    } else if (value === '') {
      onChange({ weightKg: 0 })
    }
  }

  const handleAgeChange = (value: string) => {
    const age = parseInt(value, 10)
    if (!isNaN(age) && age >= 0) {
      const isPediatric = calculateIsPediatric(age, patient.ageUnit)
      onChange({ age, isPediatric })
    } else if (value === '') {
      onChange({ age: 0, isPediatric: true })
    }
  }

  const handleAgeUnitChange = (unit: AgeUnit) => {
    const isPediatric = calculateIsPediatric(patient.age, unit)
    onChange({ ageUnit: unit, isPediatric })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Poids */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <Weight className="w-4 h-4" />
            Poids du patient (kg)
          </label>
          <input
            type="number"
            value={patient.weightKg || ''}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="ex: 25"
            min={0.5}
            max={300}
            step={0.1}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/5 border border-white/10',
              'text-white placeholder-white/30',
              'focus:border-axora-500/50 focus:outline-none focus:ring-2 focus:ring-axora-500/20',
              'transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Âge */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <Calendar className="w-4 h-4" />
            Âge du patient
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={patient.age || ''}
              onChange={(e) => handleAgeChange(e.target.value)}
              placeholder="ex: 8"
              min={0}
              max={150}
              disabled={disabled}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10',
                'text-white placeholder-white/30',
                'focus:border-axora-500/50 focus:outline-none focus:ring-2 focus:ring-axora-500/20',
                'transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
            <select
              value={patient.ageUnit}
              onChange={(e) => handleAgeUnitChange(e.target.value as AgeUnit)}
              disabled={disabled}
              className={cn(
                'px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10',
                'text-white',
                'focus:border-axora-500/50 focus:outline-none focus:ring-2 focus:ring-axora-500/20',
                'transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {AGE_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Indicateur pédiatrique */}
      {patient.isPediatric && patient.age > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <Baby className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-400">
            Patient pédiatrique ({formatAge(patient.age, patient.ageUnit)})
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Détermine si le patient est pédiatrique (< 15 ans)
 */
function calculateIsPediatric(age: number, unit: AgeUnit): boolean {
  switch (unit) {
    case 'years':
      return age < 15
    case 'months':
      return age < 180 // 15 ans
    case 'days':
      return age < 5475 // ~15 ans
  }
}

/**
 * Formate l'âge pour l'affichage
 */
function formatAge(age: number, unit: AgeUnit): string {
  switch (unit) {
    case 'years':
      return `${age} an${age > 1 ? 's' : ''}`
    case 'months':
      if (age >= 12) {
        const years = Math.floor(age / 12)
        const months = age % 12
        return months > 0 ? `${years} an${years > 1 ? 's' : ''} et ${months} mois` : `${years} an${years > 1 ? 's' : ''}`
      }
      return `${age} mois`
    case 'days':
      if (age >= 30) {
        const months = Math.floor(age / 30)
        return `${months} mois`
      }
      return `${age} jour${age > 1 ? 's' : ''}`
  }
}
