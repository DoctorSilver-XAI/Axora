import { BaseAnalyzer } from './IAnalyzer';
import { AnalysisResult, OcrResult } from '../types';

/**
 * Facturation Analyzer V2
 * Directly consumes the structured V2 annotation from Mistral OCR
 * without requiring an additional LLM call.
 */
export class FacturationAnalyzer extends BaseAnalyzer {
    name = 'FacturationAnalyzer';
    description = 'Expert for Facturation/Delivery screens (LGPI) - V2 Schema';

    canHandle(context: string): boolean {
        return context.toLowerCase().includes('facturation') ||
            context.toLowerCase().includes('délivrance') ||
            context === 'auto';
    }

    /**
     * Analyze Facturation screen using V2 structured annotation
     */
    async analyze(ocrResult: OcrResult): Promise<AnalysisResult> {
        console.log('[FacturationAnalyzer] 🧠 Analyzing Facturation Screen (V2)...');

        const result = this.formatBaseResult(ocrResult, 'facturation');
        result.context = 'délivrance';
        result.version = 'v4-schema-v2';

        // Try to extract structured annotation from Mistral response
        const annotation = ocrResult.mistralResponse?.document_annotation;

        if (annotation && annotation.schema_version === '2.0') {
            console.log('[FacturationAnalyzer] ✓ V2 Structured annotation found!');
            result.confidence = 0.98;

            // Map dispensation lines to meds array
            result.meds = (annotation.dispensation_lines || []).map((line: any) => ({
                dci: line.designation,
                quantity: line.quantity ?? 1,
                unitPrice: line.unit_price_eur,
                honoraire: line.honoraire_eur,
                stock: line.stock_level,
                dus: line.dus,
                flags: line.flags,
                recommendation: this.buildRecommendation(line)
            }));

            // Build insights from patient, prescriber, totals
            result.insights = [];

            // Patient info (gracefully handle null)
            const patient = annotation.patient;
            if (patient) {
                const patientName = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Inconnu';
                result.insights.push({
                    title: 'Patient',
                    value: patient.age_years ? `${patientName} (${patient.age_years} ans)` : patientName,
                    icon: 'user'
                });

                // Insurance info
                if (patient.mandatory_insurance?.name) {
                    result.insights.push({
                        title: 'AMO',
                        value: patient.mandatory_insurance.name,
                        icon: 'shield'
                    });
                }
                if (patient.complementary_insurance?.name) {
                    result.insights.push({
                        title: 'AMC',
                        value: patient.complementary_insurance.name,
                        icon: 'shield-check'
                    });
                }
            } else {
                result.insights.push({ title: 'Patient', value: 'Vente libre', icon: 'user' });
            }

            // Prescriber info (gracefully handle null)
            const prescriber = annotation.prescriber;
            if (prescriber) {
                const prescriberName = [prescriber.first_name, prescriber.last_name].filter(Boolean).join(' ') || 'Inconnu';
                result.insights.push({
                    title: 'Prescripteur',
                    value: prescriber.specialty ? `${prescriberName} (${prescriber.specialty})` : prescriberName,
                    icon: 'stethoscope'
                });
            }

            // Totals
            const totals = annotation.totals;
            if (totals) {
                result.insights.push({
                    title: 'Total',
                    value: `${totals.total_amount_eur?.toFixed(2) ?? '0.00'} €`,
                    icon: 'euro'
                });
                if (totals.patient_share_eur != null) {
                    result.insights.push({
                        title: 'Part Patient',
                        value: `${totals.patient_share_eur.toFixed(2)} €`,
                        icon: 'wallet'
                    });
                }
                if (totals.number_of_lines != null) {
                    result.insights.push({
                        title: 'Lignes',
                        value: totals.number_of_lines.toString(),
                        icon: 'list'
                    });
                }
            }

            // Screen context chips
            const ctx = annotation.screen_context;
            result.chips = [];
            if (ctx?.dp_status === 'actif') result.chips.push('DP Actif');
            if (ctx?.ins_status === 'present') result.chips.push('INS');
            if (ctx?.vitale_mode) result.chips.push(ctx.vitale_mode);
            if (ctx?.scor_status) result.chips.push(ctx.scor_status);

            // Alerts
            const alerts = annotation.alerts || [];
            if (alerts.length > 0) {
                result.detected_items = alerts.map((a: any) => `[${a.severity?.toUpperCase() || 'INFO'}] ${a.message}`);
            }

            // Archive metadata
            result._archiveMetadata!.apiResponseRaw = annotation;
            result._archiveMetadata!.modelUsed = 'mistral-ocr-latest (V2 Schema)';

        } else {
            // Fallback: No V2 annotation, use raw OCR text
            console.log('[FacturationAnalyzer] ⚠ No V2 annotation found. Using fallback.');
            result.confidence = 0.6;
            result.insights = [
                { title: 'Status', value: 'OCR brut (sans annotation structurée)', icon: 'alert-triangle' }
            ];
            result._archiveMetadata!.apiResponseRaw = ocrResult.mistralResponse;
            result._archiveMetadata!.modelUsed = 'mistral-ocr-latest (fallback)';
        }

        return result;
    }

    /**
     * Build a human-readable recommendation string for a dispensation line
     */
    private buildRecommendation(line: any): string {
        const parts: string[] = [];
        if (line.stock_level != null) parts.push(`Stock: ${line.stock_level}`);
        if (line.dus != null && line.dus > 0) parts.push(`Dû: ${line.dus}`);
        if (line.prestation_code) parts.push(`Prest: ${line.prestation_code}`);
        return parts.join(' | ') || '-';
    }
}
