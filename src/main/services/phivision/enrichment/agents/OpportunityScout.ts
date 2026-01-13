/**
 * OpportunityScout Agent
 * Identifies cross-selling opportunities based on clinical context
 */

import { BaseEnrichmentAgent, EnrichmentAgentResult } from '../IEnrichmentAgent';
import { FacturationScreenV2 } from '../../types/facturationV2.types';
import { OpportunityScoutResult, SalesOpportunity, OpportunityCategory } from '../types/enrichmentTypes';
import { config } from '../../config';

export class OpportunityScout extends BaseEnrichmentAgent {
    name = 'OpportunityScout';
    description = 'Identifie les opportunités de ventes conseils pertinentes';
    recommendedModel = 'mistral-small-latest'; // Commercial creativity, smaller model sufficient

    private apiKey: string = '';

    async initialize(): Promise<void> {
        this.apiKey = config.mistral.apiKey;
        await super.initialize();
    }

    async enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult> {
        this.checkInitialized();

        const { result, timeMs } = await this.withTiming(async () => {
            return this.scoutOpportunities(parsedData);
        });

        return {
            agentName: this.name,
            success: result !== null,
            data: result,
            processingTimeMs: timeMs,
            error: result === null ? 'Failed to scout opportunities' : undefined
        };
    }

    private async scoutOpportunities(parsedData: FacturationScreenV2): Promise<OpportunityScoutResult | null> {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;

        if (products.length === 0) {
            console.log('[OpportunityScout] No products to analyze');
            return { opportunites: [] };
        }

        console.log(`[OpportunityScout] Scouting opportunities for ${products.length} products...`);

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
                    temperature: 0.3 // Slightly creative
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[OpportunityScout] API Error:', response.status, errorText);
                return null;
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            const parsed = JSON.parse(content);

            const result: OpportunityScoutResult = {
                opportunites: (parsed.opportunites || []).slice(0, 5).map((o: any) => ({
                    produit: o.produit,
                    categorie: o.categorie as OpportunityCategory,
                    pertinence: o.pertinence,
                    argumentaire: o.argumentaire,
                    margeEstimee: o.margeEstimee || o.marge_estimee || 'moyenne'
                }))
            };

            console.log(`[OpportunityScout] Found ${result.opportunites.length} opportunities`);
            return result;

        } catch (error) {
            console.error('[OpportunityScout] Error:', error);
            return null;
        }
    }

    private buildUserPrompt(parsedData: FacturationScreenV2): string {
        const products = parsedData.dispensation_lines || [];
        const patient = parsedData.patient;

        let prompt = `Contexte de délivrance :\n\n`;

        if (patient) {
            if (patient.age_years) prompt += `Patient: ${patient.age_years} ans\n`;
        }

        prompt += `\nProduits délivrés:\n`;
        products.forEach((p, i) => {
            prompt += `- ${p.designation}\n`;
        });

        prompt += `\nPropose 3 à 5 produits complémentaires pertinents.`;

        return prompt;
    }

    private buildSystemPrompt(): string {
        return `Tu es un pharmacien expert en conseil officinal et ventes associées.

À partir du contexte de délivrance, identifie 3 à 5 produits complémentaires PERTINENTS à proposer au patient.

CATÉGORIES POSSIBLES:
- otc: Médicaments sans ordonnance
- phytotherapie: Plantes médicinales
- aromatherapie: Huiles essentielles
- complement: Compléments alimentaires, vitamines
- dispositif_medical: DM (compresses, thermomètres...)
- hygiene: Hygiène, cosmétique, soins

RÈGLES IMPORTANTES:
- Les produits doivent être RÉELLEMENT pertinents par rapport au contexte clinique
- Évite les suggestions génériques sans lien avec l'ordonnance
- L'argumentaire doit être une phrase courte et convaincante pour le patient
- Score de pertinence entre 0 et 1 (1 = très pertinent)
- Marge estimée: basse | moyenne | haute

EXEMPLES DE BONNES ASSOCIATIONS:
- Antibiotique → Probiotiques
- Corticoïdes → Protection cutanée
- AINS → Protecteur gastrique
- Traitement ORL → Spray nasal salin
- Antihistaminique → Collyre anti-allergique

FORMAT DE SORTIE:
{
  "opportunites": [
    {
      "produit": "Probiotiques (Lactibiane, Ergyphilus...)",
      "categorie": "complement",
      "pertinence": 0.95,
      "argumentaire": "Protège votre flore intestinale pendant l'antibiothérapie",
      "margeEstimee": "haute"
    },
    {
      "produit": "Spray nasal eau de mer",
      "categorie": "hygiene",
      "pertinence": 0.80,
      "argumentaire": "Nettoie et hydrate les voies nasales pendant le traitement",
      "margeEstimee": "moyenne"
    }
  ]
}

Retourne UNIQUEMENT le JSON, sans texte supplémentaire.`;
    }
}
