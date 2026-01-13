import { Drug, DrugForm, Indication, isRenalAdjustmentNeeded } from '../data/pharmacology';

export interface CalculationResult {
    dailyDoseMg: number;
    dosePerIntakeMg: number;
    dosePerIntakeMl: number;
    numberOfIntakes: number;
    volumeTotalMl: number;
    bottlesNeeded: number;
    alerts: string[];
    warnings: string[];
    recommendation: string;
}

export class PosoEngine {

    static calculate(
        weightKg: number,
        drug: Drug,
        indication: Indication,
        selectedForm: DrugForm,
        durationDays: number,
        clCr?: number, // optional Creatinine Clearance
        ageYears?: number // optional Age in Years
    ): CalculationResult {
        const alerts: string[] = [];
        const warnings: string[] = [];

        // 0. Age Check (Contraindication)
        if (ageYears !== undefined && indication.minAgeMonths) {
            const ageMonths = ageYears * 12;
            if (ageMonths < indication.minAgeMonths) {
                alerts.push(`CONTRE-INDICATION : Enfant de moins de ${indication.minAgeMonths} mois.`);
            }
        }

        // 1. Calculate Theoretical Daily Dose
        let dailyDoseMg = weightKg * indication.usualDoseMgKg;

        // 2. Apply Hard Caps (Max Daily Dose)
        // Example: Paracetamol max 3g or 4g depending on weight/age, usually 60mg/kg/day cap is not enough, there is absolute max.
        // For now we use the drug's maxDailyDoseMg from data
        if (indication.maxDailyDoseMg && dailyDoseMg > indication.maxDailyDoseMg) {
            dailyDoseMg = indication.maxDailyDoseMg;
            warnings.push(`Dose plafonnée à ${indication.maxDailyDoseMg} mg/jour (Maximum autorisé).`);
        }

        // 2b. Specific Override for "Adult" weight children
        // If child > 40-50kg, often we switch to adult fixed forms, but here we cap the syrup calculation.
        if (weightKg > 50 && drug.id === 'doliprane') {
            if (dailyDoseMg > 4000) dailyDoseMg = 4000;
            warnings.push("Poids > 50kg : Dose adulte standard (max 4g/j) appliquée.");
        }

        // 3. Renal Adjustment
        let frequency = indication.frequency;
        if (clCr !== undefined && isRenalAdjustmentNeeded(clCr, drug.id)) {
            if (drug.id === 'orelox') {
                if (clCr < 40 && clCr >= 10) {
                    frequency = 1; // Once daily instead of twice
                    alerts.push("Insuffisance Rénale (10-39 ml/min) : Fréquence réduite à 1 prise / 24h.");
                } else if (clCr < 10) {
                    frequency = 0.5; // Every 48h
                    alerts.push("Insuffisance Rénale Sévère (<10 ml/min) : Fréquence réduite à 1 prise / 48h.");
                }
            }
        }

        // 4. Per Intake Calculation
        const dosePerIntakeMg = dailyDoseMg / frequency;

        // 5. Convert to Volume (ml) or Drops
        let dosePerIntakeMl = 0;
        let recommendation = "";

        if (selectedForm.type === 'drops' && selectedForm.dropEquivalent) {
            // Calculation for drops (e.g. Celestene)
            // Usually drops are prescribed by drop count, not ml.
            // Celestene 40 drops = 1 ml.
            // Dose (mg) -> Volume (ml) -> Drops
            const vol = dosePerIntakeMg / selectedForm.concentration;
            const drops = Math.round(vol * selectedForm.dropEquivalent);
            dosePerIntakeMl = vol;
            recommendation = `${drops} gouttes par prise`;

            // Celestene specific check for "kg rule" validity
            if (drug.id === 'celestene') {
                // Check if the calculated drops match the "X drops/kg" rule of thumb
                // Dyspnea (10 drops/kg) vs Asthma (3 drops/kg)
                const dropsPerKg = drops / weightKg;
                // warnings.push(`Ratio calculé : env. ${dropsPerKg.toFixed(1)} gouttes/kg`);
            }

        } else {
            // Standard suspension
            dosePerIntakeMl = dosePerIntakeMg / selectedForm.concentration;
            // Round to reasonable precision (e.g. 1 decimal for pipette)
            dosePerIntakeMl = Math.round(dosePerIntakeMl * 10) / 10;
            recommendation = `${dosePerIntakeMl} ml par prise`;

            // Augmentin Pipette warning
            if (drug.id === 'augmentin' && indication.usualDoseMgKg !== 80) {
                alerts.push("ATTENTION : Ne pas utiliser la pipette graduée en kg (elle est calibrée pour 80mg/kg). Utiliser une seringue graduée en ml.");
            }
        }

        // 6. Logistics (Volume Total)
        // daily mg * duration / concentration
        // OR: dosePerIntakeMl * frequency * duration
        // Let's use the exact volume needed
        const dailyVolumeMl = (dailyDoseMg / selectedForm.concentration);
        const volumeTotalMl = dailyVolumeMl * durationDays;

        // Bottle calculation
        let bottlesNeeded = 1;
        if (selectedForm.volume) {
            bottlesNeeded = Math.ceil(volumeTotalMl / selectedForm.volume);
            if (bottlesNeeded > 1) {
                warnings.push(`Volume total nécesssaire (${Math.round(volumeTotalMl)} ml) dépasse un flacon.`);
            }
        }

        return {
            dailyDoseMg,
            dosePerIntakeMg,
            dosePerIntakeMl,
            numberOfIntakes: frequency,
            volumeTotalMl,
            bottlesNeeded,
            alerts,
            warnings,
            recommendation
        };
    }
}
