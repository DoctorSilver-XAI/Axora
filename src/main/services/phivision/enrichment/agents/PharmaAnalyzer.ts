/**
 * PharmaAnalyzer Agent
 * Validates prescription conformity and generates patient recommendations
 */

import { BaseEnrichmentAgent, EnrichmentAgentResult } from '../IEnrichmentAgent';
import { FacturationScreenV2 } from '../../types/facturationV2.types';
import { PharmaAnalyzerResult, PharmaCheck, CheckSeverity } from '../types/enrichmentTypes';
import { config } from '../../config';

export class PharmaAnalyzer extends BaseEnrichmentAgent {
    name = 'PharmaAnalyzer';
    description = 'Analyse pharmaceutique: conformité, interactions, recommandations patient';
    recommendedModel = 'mistral-large-latest'; // Complex reasoning requires larger model

    private apiKey: string = '';

    async initialize(): Promise<void> {
        this.apiKey = config.mistral.apiKey;
        await super.initialize();
    }

    async enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult> {
        this.checkInitialized();

        const { result, timeMs } = await this.withTiming(async () => {
            return this.analyzePharma(parsedData);
        });

        return {
            agentName: this.name,
            success: result !== null,
            data: result,
            processingTimeMs: timeMs,
            error: result === null ? 'Failed to analyze prescription' : undefined
        };
    }

    private async analyzePharma(parsedData: FacturationScreenV2): Promise<PharmaAnalyzerResult | null> {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;

        if (products.length === 0) {
            console.log('[PharmaAnalyzer] No products to analyze');
            return {
                conformiteGlobale: 1.0,
                checks: [],
                recommandationsPatient: [],
                recommandationsPharmacien: []
            };
        }

        console.log(`[PharmaAnalyzer] Analyzing ${products.length} products...`);

        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(parsedData);

        try {
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.recommendedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[PharmaAnalyzer] API Error:', response.status, errorText);
                return null;
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            const parsed = JSON.parse(content);

            const result: PharmaAnalyzerResult = {
                conformiteGlobale: parsed.conformiteGlobale ?? parsed.conformite_globale ?? 0.9,
                checks: (parsed.checks || []).map((c: any) => ({
                    type: c.type,
                    severity: c.severity as CheckSeverity,
                    detail: c.detail,
                    productsInvolved: c.productsInvolved || c.products_involved || []
                })),
                recommandationsPatient: parsed.recommandationsPatient || parsed.recommandations_patient || [],
                recommandationsPharmacien: parsed.recommandationsPharmacien || parsed.recommandations_pharmacien || []
            };

            console.log(`[PharmaAnalyzer] Analysis complete: ${result.checks.length} checks, conformity ${(result.conformiteGlobale * 100).toFixed(0)}%`);
            return result;

        } catch (error) {
            console.error('[PharmaAnalyzer] Error:', error);
            return null;
        }
    }

    private buildUserPrompt(parsedData: FacturationScreenV2): string {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;

        let prompt = `Analyse cette ordonnance :\n\n`;

        if (patient) {
            prompt += `PATIENT:\n`;
            prompt += `- Nom: ${patient.first_name || ''} ${patient.last_name || ''}\n`;
            if (patient.age_years) prompt += `- Âge: ${patient.age_years} ans\n`;
            prompt += `\n`;
        }

        prompt += `PRODUITS DÉLIVRÉS:\n`;
        products.forEach((p, i) => {
            prompt += `${i + 1}. ${p.designation}`;
            if (p.quantity) prompt += ` (Qté: ${p.quantity})`;
            prompt += `\n`;
        });

        return prompt;
    }

    private buildSystemPrompt(): string {
        return `Tu es un pharmacien expert en analyse d'ordonnances et conseil pharmaceutique.

Analyse l'ordonnance fournie et retourne un JSON avec:

1. **conformiteGlobale** (0-1): Score global de conformité
2. **checks**: Liste des vérifications effectuées
3. **recommandationsPatient**: Conseils à donner au patient (phrases courtes, claires)
4. **recommandationsPharmacien**: Notes pour le pharmacien

TYPES DE CHECKS:
- interaction: Interactions médicamenteuses
- posologie: Vérification des dosages
- contre_indication: Contre-indications potentielles
- redondance: Même classe thérapeutique x2
- duree: Durée de traitement
- fenetre_therapeutique: Médicaments à marge étroite

SEVERITY: ok | info | warning | critical

FORMAT DE SORTIE:
{
  "conformiteGlobale": 0.85,
  "checks": [
    {"type": "interaction", "severity": "warning", "detail": "Description", "productsInvolved": [0, 1]},
    {"type": "posologie", "severity": "ok", "detail": "Dosage adapté à l'âge"}
  ],
  "recommandationsPatient": [
    "Prendre le paracétamol pendant les repas",
    "Éviter l'alcool pendant le traitement"
  ],
  "recommandationsPharmacien": [
    "Vérifier les antécédents hépatiques si usage prolongé"
  ]
}

Retourne UNIQUEMENT le JSON, sans texte supplémentaire.`;
    }
}
