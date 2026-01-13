export interface Drug {
    id: string;
    name: string;
    brandNames: string[]; // e.g., ["Clamoxyl", "Amoxicilline Sandoz"]
    type: 'antibiotic' | 'analgesic' | 'corticoid' | 'antiviral';
    description: string;
    forms: DrugForm[];
    indications: Indication[];
    monograph?: string; // Markdown content for "Expert Info"
}

export interface DrugForm {
    id: string;
    name: string; // e.g., "500 mg / 5 ml"
    concentration: number; // in mg/ml (e.g., 100 for 500mg/5ml)
    volume?: number; // bottle volume in ml (e.g., 60, 100)
    type: 'suspension' | 'sachet' | 'tablet' | 'drops';
    dropEquivalent?: number; // drops per ml (e.g., 40 for Celestene)
    storage: string; // e.g. "Refrigerate 2-8°C"
    shelfLifeReconstituted?: number; // days, e.g., 14
}

export interface Indication {
    id: string;
    name: string; // e.g. "Otite Moyenne Aiguë"
    minDoseMgKg: number; // e.g. 80
    maxDoseMgKg: number; // e.g. 90
    usualDoseMgKg: number;
    maxDailyDoseMg?: number; // Hard cap, e.g., 3000 (3g)
    frequency: number; // doses per day, e.g., 2 or 3
    durationDays: number; // recommended duration
    minAgeMonths?: number; // Minimum age in months (contraindication if younger)
    instructions?: string; // e.g., "Au milieu du repas"
}

export function isRenalAdjustmentNeeded(clCr: number, drugId: string): boolean {
    // Hardcoded logic for now based on the report
    if (drugId === 'cefpodoxime' && clCr < 40) return true;
    return false;
}

export const DRUGS: Drug[] = [
    {
        id: 'amoxicillin',
        name: 'Amoxicilline',
        brandNames: ['Clamoxyl', 'Amoxicilline Biogaran', 'Amoxicilline Sandoz'],
        type: 'antibiotic',
        description: 'Antibiotique de référence pour les infections ORL et respiratoires.',
        forms: [
            {
                id: 'amox_250',
                name: '250 mg / 5 ml',
                concentration: 50, // 250mg / 5ml = 50mg/ml
                volume: 60, // Standard bottle
                type: 'suspension',
                storage: 'Ambiante (< 25°C)',
                shelfLifeReconstituted: 14
            },
            {
                id: 'amox_500',
                name: '500 mg / 5 ml',
                concentration: 100, // 500mg / 5ml = 100mg/ml
                volume: 60, // Standard bottle
                type: 'suspension',
                storage: 'Ambiante (< 25°C)',
                shelfLifeReconstituted: 14
            },
            {
                id: 'amox_500_100ml',
                name: '500 mg / 5 ml (Grand Modèle)',
                concentration: 100,
                volume: 100,
                type: 'suspension',
                storage: 'Ambiante (< 25°C)',
                shelfLifeReconstituted: 14
            }
        ],
        indications: [
            {
                id: 'amox_angina',
                name: 'Angine / Inf. Légère',
                minDoseMgKg: 40,
                maxDoseMgKg: 50,
                usualDoseMgKg: 50,
                maxDailyDoseMg: 3000, // 3g max
                frequency: 2,
                durationDays: 6
            },
            {
                id: 'amox_otitis',
                name: 'Otite / Pneumonie (Hautes Doses)',
                minDoseMgKg: 80,
                maxDoseMgKg: 90,
                usualDoseMgKg: 80,
                maxDailyDoseMg: 3000, // 3g max
                frequency: 3, // Better pharmacokinetics with 3 intakes
                durationDays: 8 // Typical for otitis
            }
        ]
    },
    {
        id: 'augmentin',
        name: 'Amoxicilline + Ac. Clavulanique',
        brandNames: ['Augmentin', 'Amox-Clav Viatris'],
        type: 'antibiotic',
        description: 'Association pour germes résistants (bêta-lactamases). Rapport 8:1.',
        forms: [
            {
                id: 'aug_100',
                name: '100 mg/ml (Enfants)', // 100mg amox/ml (80mg/kg/j standard)
                concentration: 100, // Based on Amoxicillin content
                volume: 60, // Usually 30 or 60
                type: 'suspension',
                storage: 'Réfrigérateur (2-8°C)',
                shelfLifeReconstituted: 7 // Only 7 days for Augmentin princeps, up to 10 for generics but safer to say 7
            }
        ],
        indications: [
            {
                id: 'aug_general',
                name: 'Tout spectre (Otite, Sinusite...)',
                minDoseMgKg: 80,
                maxDoseMgKg: 80, // Fixed does for pipette accuracy
                usualDoseMgKg: 80,
                maxDailyDoseMg: 3000,
                frequency: 3,
                durationDays: 8
            }
        ],
        monograph: `
### Attention : Pipette
La pipette est graduée en kg pour une dose de **80 mg/kg/j**.
Si la posologie prescrite est différente (ex: insuffisance rénale), la pipette **ne doit pas être utilisée en kg** mais convertie en ml.
`
    },
    {
        id: 'celestene',
        name: 'Bétaméthasone',
        brandNames: ['Célestène', 'Betamethasone Zentiva'],
        type: 'corticoid',
        description: 'Corticoïde oral. Attention au surdosage.',
        forms: [
            {
                id: 'cel_drops',
                name: '0.05% Solution Buvable',
                concentration: 0.5, // 0.5 mg/ml
                volume: 30,
                type: 'drops',
                dropEquivalent: 40, // 40 drops = 1 ml = 0.5mg => 1 drop = 0.0125mg
                storage: 'Ambiante',
                shelfLifeReconstituted: 60 // Usually long stability after opening
            }
        ],
        indications: [
            {
                id: 'cel_dyspnea',
                name: 'Dyspnée (Urgence / Laryngite)',
                minDoseMgKg: 0.15, // approx 10 drops/kg
                maxDoseMgKg: 0.3,
                usualDoseMgKg: 0.15, // 10-12 drops/kg usually given as load
                frequency: 1, // Short duration
                durationDays: 2,
                instructions: "Le matin de préférence"
            },
            {
                id: 'cel_asthma',
                name: 'Entretien / Asthme',
                minDoseMgKg: 0.03, // approx 3 drops/kg
                maxDoseMgKg: 0.05,
                usualDoseMgKg: 0.0375, // 3 drops/kg
                frequency: 1,
                durationDays: 3
            }
        ]
    },
    {
        id: 'doliprane',
        name: 'Paracétamol',
        brandNames: ['Doliprane', 'Efferalgan', 'Dafalgan'],
        type: 'analgesic',
        description: 'Antalgique et antipyrétique de référence.',
        forms: [
            {
                id: 'doli_syrup',
                name: '2.4% Suspension',
                concentration: 24, // 24 mg/ml
                volume: 100,
                type: 'suspension',
                storage: 'Ambiante',
                shelfLifeReconstituted: 90 // Check specific product
            }
        ],
        indications: [
            {
                id: 'doli_pain',
                name: 'Douleur / Fièvre',
                minDoseMgKg: 10,
                maxDoseMgKg: 15,
                usualDoseMgKg: 15,
                maxDailyDoseMg: 4000, // 4g absolute max, often 3g for children < 50kg
                frequency: 4, // every 6h
                durationDays: 3
            }
        ]
    },
    {
        id: 'advil',
        name: 'Ibuprofène',
        brandNames: ['Advil', 'Antarène', 'Nurofen'],
        type: 'analgesic',
        description: 'Anti-inflammatoire non stéroïdien (AINS).',
        forms: [
            {
                id: 'advil_susp',
                name: '20 mg/ml Suspension',
                concentration: 20,
                volume: 200,
                type: 'suspension',
                storage: 'Ambiante',
                shelfLifeReconstituted: 180
            }
        ],
        indications: [
            {
                id: 'ibu_pain',
                name: 'Douleur / Fièvre (si > 3 mois)',
                minDoseMgKg: 20,
                maxDoseMgKg: 30,
                usualDoseMgKg: 30,
                maxDailyDoseMg: 1200, // verify max
                frequency: 3, // every 8h
                durationDays: 3,
                minAgeMonths: 3 // Contraindicated < 3 months
            }
        ],
        monograph: `
### Contre-indications
- Varicelle (risque fasciite nécrosante)
- Déshydratation
- Insuffisance rénale sévère
`
    },
    {
        id: 'orelox',
        name: 'Cefpodoxime',
        brandNames: ['Orelox'],
        type: 'antibiotic',
        description: 'Céphalosporine 3ème génération (C3G).',
        forms: [
            {
                id: 'orelox_susp',
                name: '40 mg / 5 ml',
                concentration: 8, // 40mg/5ml = 8mg/ml
                volume: 100,
                type: 'suspension',
                storage: 'Réfrigérateur (2-8°C)',
                shelfLifeReconstituted: 10
            }
        ],
        indications: [
            {
                id: 'orelox_gen',
                name: 'Infection ORL',
                minDoseMgKg: 8,
                maxDoseMgKg: 8,
                usualDoseMgKg: 8,
                frequency: 2, // 4mg/kg per dose
                durationDays: 8
            }
        ],
        monograph: `
### Insuffisance Rénale
- Si ClCr 10-39 ml/min : 1 prise par 24h (au lieu de 2).
- Si ClCr < 10 ml/min : 1 prise toutes les 48h.
`
    }
];
