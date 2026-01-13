/**
 * PhiVision LGPI Facturation V2 Types
 * Type definitions matching the V2 JSON Schema for Mistral OCR Document Annotation
 */

// ============================================================================
// Bounding Box
// ============================================================================

export interface BoundingBox {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
}

// ============================================================================
// Screen Context
// ============================================================================

export interface InvoiceProgress {
    current: number | null;
    total: number | null;
}

export interface ScreenContext {
    app: 'LGPI';
    module: 'Facturation';
    pharmacy_name?: string | null;
    user_display_name?: string | null;
    capture_datetime_raw?: string | null;
    acts_count?: number | null;
    invoice_progress?: InvoiceProgress | null;
    dp_status?: 'actif' | 'inexistant' | 'inconnu' | null;
    vitale_mode?: string | null;
    ins_status?: 'present' | 'absent' | 'inconnu' | null;
    center_panel?: 'comments' | 'stock_waiting' | 'other' | null;
    scor_status?: string | null;
    cible_status?: boolean | null;
}

// ============================================================================
// Patient & Prescriber
// ============================================================================

export interface Insurance {
    name?: string | null;
    code?: string | null;
}

export interface Patient {
    last_name?: string | null;
    first_name?: string | null;
    age_years?: number | null;
    mandatory_insurance?: Insurance | null;
    complementary_insurance?: Insurance | null;
    rights_status_raw?: string | null;
    bounding_box?: BoundingBox;
}

export interface Prescriber {
    last_name?: string | null;
    first_name?: string | null;
    specialty?: string | null;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Prescription & Stock
// ============================================================================

export interface Prescription {
    prescription_date_raw?: string | null;
    comment_text?: string | null;
    bounding_box?: BoundingBox;
}

export interface StockWaiting {
    orders_distributor_qty?: number | null;
    orders_direct_qty?: number | null;
    dus_qty?: number | null;
    available_qty?: number | null;
    transmitted_at_raw?: string | null;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Sales Metrics
// ============================================================================

export interface SalesMetrics {
    last_sale_id?: string | null;
    last_sale_payment_eur?: number | null;
    ca_vd_eur?: number | null;
    ca_ordo_eur?: number | null;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Alerts
// ============================================================================

export type AlertCategory = 'administratif' | 'facturation' | 'stock' | 'clinique' | 'inconnu' | null;
export type AlertSeverity = 'info' | 'warning' | 'critical' | null;

export interface Alert {
    category?: AlertCategory;
    message: string;
    severity?: AlertSeverity;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Dispensation Lines
// ============================================================================

export interface DispensationLine {
    line_no?: number | null;
    product_type?: string | null;
    flags?: string[] | null;
    designation: string;
    quantity?: number | null;
    unit_price_eur?: number | null;
    t_remb_raw?: string | null;
    discount_raw?: string | null;
    honoraire_eur?: number | null;
    prestation_code?: string | null;
    liste_raw?: string | null;
    stock_level?: number | null;
    dus?: number | null;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Totals
// ============================================================================

export interface Totals {
    currency?: 'EUR';
    total_amount_eur?: number | null;
    patient_share_eur?: number | null;
    line_amount_eur?: number | null;
    remote_deposit?: number | null;
    number_of_lines?: number | null;
    bounding_box?: BoundingBox;
}

// ============================================================================
// Zones (OCR Proof/Audit)
// ============================================================================

export type ZoneType =
    | 'header'
    | 'patient_identity'
    | 'prescriber'
    | 'center_panel'
    | 'alerts'
    | 'dispensation_grid'
    | 'totals'
    | 'follow_up'
    | 'actions'
    | 'other';

export interface Zone {
    zone_id: string;
    zone_name: string;
    zone_type: ZoneType;
    bounding_box: BoundingBox;
    extracted_text?: string | null;
    confidence?: number | null;
}

// ============================================================================
// Main V2 Annotation Type
// ============================================================================

export interface FacturationScreenV2 {
    schema_version: '2.0';
    document_type: 'lgpi_facturation_screen' | 'lgo_screen_other';
    screen_context: ScreenContext;
    patient?: Patient | null;
    prescriber?: Prescriber | null;
    prescription?: Prescription | null;
    stock_waiting?: StockWaiting | null;
    sales_metrics?: SalesMetrics | null;
    alerts: Alert[];
    dispensation_lines: DispensationLine[];
    totals?: Totals | null;
    zones: Zone[];
}
