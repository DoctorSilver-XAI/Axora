import { AgeRange, PPPTheme } from '../types'

export const DEFAULT_AGE_RANGE: AgeRange = '45-50'

export const PPP_THEMES: Record<AgeRange, PPPTheme> = {
  '18-25': {
    primaryColor: '#EBBF23', // Jaune Moutarde
    accentColor: '#EBBF23',
    backgroundColor: '#fff',
  },
  '45-50': {
    primaryColor: '#009689', // Vert Teal
    accentColor: '#009689',
    backgroundColor: '#fff',
  },
  '60-65': {
    primaryColor: '#C34A81', // Rose/Magenta
    accentColor: '#C34A81',
    backgroundColor: '#fff',
  },
  '70-75': {
    primaryColor: '#F2804A', // Orange Saumon
    accentColor: '#F2804A',
    backgroundColor: '#fff',
  },
}

export function getTheme(ageRange: AgeRange): PPPTheme {
  return PPP_THEMES[ageRange] || PPP_THEMES[DEFAULT_AGE_RANGE]
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const bigint = parseInt(
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized,
    16
  )
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
