// Utilitaires de calcul TVA pour les factures commerciales

import { InvoiceLine, VATRate, VATSummary } from '../types'

/**
 * Arrondir à 2 décimales (centimes)
 */
export const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100
}

/**
 * Calcule le montant de TVA à partir du montant HT
 */
export const calculateVAT = (amountHT: number, rate: VATRate): number => {
    return roundToTwoDecimals(amountHT * (rate / 100))
}

/**
 * Calcule le montant HT à partir du montant TTC
 */
export const calculateHT = (amountTTC: number, rate: VATRate): number => {
    return roundToTwoDecimals(amountTTC / (1 + rate / 100))
}

/**
 * Calcule le montant TTC à partir du montant HT
 */
export const calculateTTC = (amountHT: number, rate: VATRate): number => {
    return roundToTwoDecimals(amountHT * (1 + rate / 100))
}

/**
 * Calcule tous les montants pour une ligne de facture
 */
export const calculateLineAmounts = (
    quantity: number,
    unitPriceHT: number,
    vatRate: VATRate,
    applyVAT: boolean
): { amountHT: number; amountVAT: number; amountTTC: number } => {
    const amountHT = roundToTwoDecimals(quantity * unitPriceHT)

    if (!applyVAT) {
        return {
            amountHT,
            amountVAT: 0,
            amountTTC: amountHT,
        }
    }

    const amountVAT = calculateVAT(amountHT, vatRate)
    const amountTTC = roundToTwoDecimals(amountHT + amountVAT)

    return { amountHT, amountVAT, amountTTC }
}

/**
 * Récapitule les montants de TVA par taux
 */
export const summarizeByVATRate = (lines: InvoiceLine[], applyVAT: boolean): VATSummary[] => {
    if (!applyVAT) {
        return []
    }

    const summaryMap = new Map<VATRate, VATSummary>()

    for (const line of lines) {
        if (line.amountHT <= 0) continue

        const existing = summaryMap.get(line.vatRate)
        if (existing) {
            existing.baseHT = roundToTwoDecimals(existing.baseHT + line.amountHT)
            existing.amountVAT = roundToTwoDecimals(existing.amountVAT + line.amountVAT)
        } else {
            summaryMap.set(line.vatRate, {
                rate: line.vatRate,
                baseHT: line.amountHT,
                amountVAT: line.amountVAT,
            })
        }
    }

    // Trier par taux croissant
    return Array.from(summaryMap.values()).sort((a, b) => a.rate - b.rate)
}

/**
 * Calcule les totaux de la facture
 */
export const calculateInvoiceTotals = (
    lines: InvoiceLine[],
    applyVAT: boolean
): { totalHT: number; totalVAT: number; totalTTC: number; vatSummary: VATSummary[] } => {
    let totalHT = 0
    let totalVAT = 0
    let totalTTC = 0

    for (const line of lines) {
        totalHT = roundToTwoDecimals(totalHT + line.amountHT)
        totalVAT = roundToTwoDecimals(totalVAT + line.amountVAT)
        totalTTC = roundToTwoDecimals(totalTTC + line.amountTTC)
    }

    const vatSummary = summarizeByVATRate(lines, applyVAT)

    return { totalHT, totalVAT, totalTTC, vatSummary }
}

/**
 * Génère un numéro de facture automatique
 * Format: FACT-AAAA-XXXX (ex: FACT-2026-0001)
 */
export const generateInvoiceNumber = (): string => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 9999) + 1
    return `FACT-${year}-${random.toString().padStart(4, '0')}`
}

/**
 * Formate un montant en euros
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount)
}

/**
 * Formate une date en format français
 */
export const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}
