/**
 * ContextDeductor Agent
 * Deduces clinical context and probable pathologies from prescription
 */

import { BaseEnrichmentAgent, EnrichmentAgentResult } from '../IEnrichmentAgent';
import { FacturationScreenV2 } from '../../types/facturationV2.types';
import { ContextDeductorResult, ClinicalHypothesis, PatientProfile } from '../types/enrichmentTypes';
import { config } from '../../config';

export class ContextDeductor extends BaseEnrichmentAgent {
    name = 'ContextDeductor';
    description = 'Déduit le contexte clinique et les pathologies probables';
    recommendedModel = 'mistral-large-latest'; // Medical inference requires larger model

    private apiKey: string = '';

    async initialize(): Promise<void> {
        this.apiKey = config.mistral.apiKey;
        await super.initialize();
    }

    async enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult> {
        this.checkInitialized();

        const { result, timeMs } = await this.withTiming(async () => {
            return this.deduceContext(parsedData);
        });

        return {
            agentName: this.name,
            success: result !== null,
            data: result,
            processingTimeMs: timeMs,
            error: result === null ? 'Failed to deduce clinical context' : undefined
        };
    }

    private async deduceContext(parsedData: FacturationScreenV2): Promise<ContextDeductorResult | null> {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;
        const prescriber = parsedData.prescriber;

        if (products.length === 0) {
            console.log('[ContextDeductor] No products to analyze');
            return {
                hypothesesCliniques: [],
                profilPatientDeduit: {
                    trancheAge: null,
                    contexteProbable: null,
                    facteursRisque: []
                }
            };
        }

        console.log(`[ContextDeductor] Deducing context from ${products.length} products...`);

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
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ContextDeductor] API Error:', response.status, errorText);
                return null;
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            const parsed = JSON.parse(content);

            const result: ContextDeductorResult = {
                hypothesesCliniques: (parsed.hypothesesCliniques || parsed.hypotheses_cliniques || []).map((h: any) => ({
                    pathologie: h.pathologie,
                    confidence: h.confidence,
                    evidence: h.evidence || []
                })),
                profilPatientDeduit: {
                    trancheAge: parsed.profilPatientDeduit?.trancheAge || parsed.profil_patient_deduit?.tranche_age || this.inferAgeGroup(patient?.age_years),
                    contexteProbable: parsed.profilPatientDeduit?.contexteProbable || parsed.profil_patient_deduit?.contexte_probable || null,
                    facteursRisque: parsed.profilPatientDeduit?.facteursRisque || parsed.profil_patient_deduit?.facteurs_risque || []
                }
            };

            console.log(`[ContextDeductor] Found ${result.hypothesesCliniques.length} clinical hypotheses`);
            return result;

        } catch (error) {
            console.error('[ContextDeductor] Error:', error);
            return null;
        }
    }

    private inferAgeGroup(age?: number): PatientProfile['trancheAge'] {
        if (!age) return null;
        if (age < 2) return 'nourrisson';
        if (age < 12) return 'enfant';
        if (age < 18) return 'adolescent';
        if (age < 65) return 'adulte';
        return 'senior';
    }

    private buildUserPrompt(parsedData: FacturationScreenV2): string {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;
        const prescriber = parsedData.prescriber;

        let prompt = `Analyse ce contexte de délivrance :\n\n`;

        if (patient) {
            prompt += `PATIENT:\n`;
            if (patient.age_years) prompt += `- Âge: ${patient.age_years} ans\n`;
            if (patient.amu_organism) prompt += `- AMO: ${patient.amu_organism}\n`;
            prompt += `\n`;
        }

        if (prescriber) {
            prompt += `PRESCRIPTEUR:\n`;
            if (prescriber.full_name) prompt += `- Nom: ${prescriber.full_name}\n`;
            if (prescriber.specialty) prompt += `- Spécialité: ${prescriber.specialty}\n`;
            prompt += `\n`;
        }

        prompt += `PRODUITS DÉLIVRÉS:\n`;
        products.forEach((p, i) => {
            prompt += `${i + 1}. ${p.designation}\n`;
        });

        return prompt;
    }

    private buildSystemPrompt(): string {
        return `Tu es un expert en sémiologie pharmaceutique et analyse clinique.

À partir des médicaments délivrés et du contexte patient/prescripteur, déduis:

1. **hypothesesCliniques**: Top 3-5 pathologies/contextes probables avec score de confiance (0-1)
2. **profilPatientDeduit**: Profil synthétique du patient

RÈGLES:
- Base tes hypothèses sur les indications AMM des médicaments
- Considère la spécialité du prescripteur comme indice
- Considère l'âge du patient
- Score de confiance basé sur la convergence des indices
- Liste les preuves (evidence) justifiant chaque hypothèse

TRANCHES D'ÂGE: nourrisson | enfant | adolescent | adulte | senior

FORMAT DE SORTIE:
{
  "hypothesesCliniques": [
    {
      "pathologie": "Otite externe aiguë",
      "confidence": 0.92,
      "evidence": ["ciprofloxacine auriculaire", "prescripteur ORL", "patient pédiatrique"]
    },
    {
      "pathologie": "Douleur/Fièvre",
      "confidence": 0.75,
      "evidence": ["paracétamol", "contexte infectieux probable"]
    }
  ],
  "profilPatientDeduit": {
    "trancheAge": "enfant",
    "contexteProbable": "Infection ORL aiguë nécessitant antibiothérapie locale",
    "facteursRisque": []
  }
}

Retourne UNIQUEMENT le JSON, sans texte supplémentaire.`;
    }
}
