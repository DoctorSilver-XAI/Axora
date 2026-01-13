/**
 * TypeScript Interfaces for LGPI Facturation Extraction (Option B2)
 */

export interface BboxField {
    value: string | null;
    bbox: [number, number, number, number] | null; // [x, y, w, h]
}

export interface LgpiPatient {
    last_name: BboxField;
    first_name: BboxField;
    age: BboxField;
    insurance: BboxField;
}

export interface LgpiPrescriber {
    last_name: BboxField;
    first_name: BboxField;
    specialty: BboxField;
}

export interface LgpiDispenseLine {
    drug_label: BboxField;
    quantity: BboxField;
    unit_price_eur: BboxField;
    honoraire_eur: BboxField;
}

export interface LgpiTotals {
    total_eur: BboxField;
    patient_due_eur: BboxField;
}

export interface LgpiMeta {
    missing_fields: string[];
}

export interface LgpiFacturationData {
    patient: LgpiPatient;
    prescriber: LgpiPrescriber;
    dispense_lines: LgpiDispenseLine[];
    totals: LgpiTotals;
    meta: LgpiMeta;
}
