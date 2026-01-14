import { AgeRange } from '../types'

export const AGE_RANGES: Array<{ value: AgeRange; label: string; min: number; max: number }> = [
    { value: '18-25', label: '18-25 ans', min: 18, max: 25 },
    { value: '45-50', label: '45-50 ans', min: 45, max: 50 },
    { value: '60-65', label: '60-65 ans', min: 60, max: 65 },
    { value: '70-75', label: '70-75 ans', min: 70, max: 75 },
]

export function detectAgeBucket(text: string): AgeRange | null {
    if (!text) return null

    // Regex to find patterns like "XX ans"
    const matches = [...text.matchAll(/(\d{2})\s*ans/gi)]
    if (matches.length === 0) return null

    const ages = matches
        .map((m) => parseInt(m[1], 10))
        .filter((n) => !Number.isNaN(n))

    // Find first age that matches a range
    const match = ages.find((age) =>
        AGE_RANGES.some((range) => age >= range.min && age <= range.max)
    )

    if (!match) return null

    const bucket = AGE_RANGES.find((range) => match >= range.min && match <= range.max)
    return bucket ? bucket.value : null
}
