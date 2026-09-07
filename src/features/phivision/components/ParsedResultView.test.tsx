import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParsedResultView } from './ParsedResultView'
import type { FacturationOrdoResult } from '../services/OCRService'

/**
 * Regression tests for the "black screen on captures" bug: a FACTURATION_ORDO
 * capture whose `total_eur` field is missing (undefined) from the LLM JSON
 * output — rather than explicitly `null` — used to crash the render with
 * `Cannot read properties of undefined (reading 'toFixed')` because the
 * guard checked `!== null` instead of `!= null` (see git history: d964dfc).
 * With no ErrorBoundary in place, that crash unmounted the whole React tree.
 */
describe('ParsedResultView · FACTURATION_ORDO', () => {
  const baseData: Omit<FacturationOrdoResult, 'total_eur'> = {
    context: 'FACTURATION_ORDO',
    module: 'test',
    flags: [],
    patient_fullname: 'Jean Dupont',
    patient_age_years: 45,
    insurance: 'CPAM',
    prescriber: 'Dr. Martin',
    lines: [
      { designation: 'Doliprane 1g', qty: 1, unit_price_eur: 2.5, honorarium_eur: null, prestation: null, stock: null },
    ],
    confidence: 0.9,
    missing_fields: [],
  }

  function renderCapture(data: Partial<FacturationOrdoResult>) {
    const rawText = JSON.stringify({ ...baseData, ...data })
    return render(<ParsedResultView rawText={rawText} />)
  }

  it('does not crash and omits the Total row when total_eur is missing from the JSON (undefined)', () => {
    const { total_eur: _omitted, ...withoutTotal } = { ...baseData, total_eur: undefined } as Record<string, unknown>
    const rawText = JSON.stringify(withoutTotal)

    expect(() => render(<ParsedResultView rawText={rawText} />)).not.toThrow()
    expect(screen.queryByText(/Total/i)).not.toBeInTheDocument()
  })

  it('does not crash and omits the Total row when total_eur is explicitly null', () => {
    expect(() => renderCapture({ total_eur: null })).not.toThrow()
    expect(screen.queryByText(/Total/i)).not.toBeInTheDocument()
  })

  it('renders the formatted total when total_eur is a number', () => {
    renderCapture({ total_eur: 15.5 })
    expect(screen.getByText('15.50€')).toBeInTheDocument()
  })

  it('renders the formatted total for a zero total (falsy but valid)', () => {
    renderCapture({ total_eur: 0 })
    expect(screen.getByText('0.00€')).toBeInTheDocument()
  })
})
