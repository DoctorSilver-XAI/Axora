/**
 * DCIResolver Agent
 * Normalizes product designations to DCI (Dénomination Commune Internationale)
 */

import { BaseEnrichmentAgent, EnrichmentAgentResult } from '../IEnrichmentAgent';
import { FacturationScreenV2 } from '../../types/facturationV2.types';
import { DCIResolverResult, NormalizedProduct } from '../types/enrichmentTypes';
import { config } from '../../config';

export class DCIResolver extends BaseEnrichmentAgent {
    name = 'DCIResolver';
    description = 'Normalise les désignations produits en DCI (Dénomination Commune Internationale)';
    recommendedModel = 'mistral-small-latest';

    private apiKey: string = '';

    async initialize(): Promise<void> {
        this.apiKey = config.mistral.apiKey;
        await super.initialize();
    }

    async enrich(parsedData: FacturationScreenV2): Promise<EnrichmentAgentResult> {
        this.checkInitialized();

        const { result, timeMs } = await this.withTiming(async () => {
            return this.resolveDCI(parsedData);
        });

        return {
            agentName: this.name,
            success: result !== null,
            data: result,
            processingTimeMs: timeMs,
            error: result === null ? 'Failed to resolve DCI' : undefined
        };
    }

    private async resolveDCI(parsedData: FacturationScreenV2): Promise<DCIResolverResult | null> {
        // Extract product designations from dispensation lines
        const products = parsedData.dispensation_lines || [];

        if (products.length === 0) {
            console.log('[DCIResolver] No products to normalize');
            return { products: [] };
        }

        const designations = products.map(p => p.designation).filter(Boolean);
        console.log(`[DCIResolver] Normalizing ${designations.length} products...`);

        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = `Voici les désignations de produits pharmaceutiques à normaliser en DCI:

${designations.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Retourne un JSON avec le tableau "products" contenant pour chaque produit les informations normalisées.`;

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
                    temperature: 0.0
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[DCIResolver] API Error:', response.status, errorText);
                return null;
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            const parsed = JSON.parse(content);

            // Validate and enrich with original designations
            const normalizedProducts: NormalizedProduct[] = (parsed.products || []).map((p: any, idx: number) => ({
                originalDesignation: designations[idx] || p.originalDesignation || '',
                dci: p.dci || null,
                principesActifs: p.principesActifs || p.principes_actifs || [],
                classeAtc: p.classeAtc || p.classe_atc || null,
                familleTherapeutique: p.familleTherapeutique || p.famille_therapeutique || null,
                forme: p.forme || null,
                isGeneric: p.isGeneric || p.is_generic || false
            }));

            console.log(`[DCIResolver] Normalized ${normalizedProducts.length} products`);
            return { products: normalizedProducts };

        } catch (error) {
            console.error('[DCIResolver] Error:', error);
            return null;
        }
    }

    private buildSystemPrompt(): string {
        return `Tu es un expert en pharmacologie et nomenclature pharmaceutique.

Ta tâche est de normaliser des désignations de produits pharmaceutiques français en extrayant:
1. La DCI (Dénomination Commune Internationale) / INN
2. Les principes actifs avec leurs dosages
3. La classe ATC si connue
4. La famille thérapeutique
5. La forme galénique

RÈGLES:
- Retourne UNIQUEMENT un JSON valide
- Si le produit n'est pas un médicament (dispositif médical, cosmétique), dci = null
- Pour les associations, liste tous les principes actifs
- Utilise les DCI officielles en minuscules
- isGeneric = true si c'est un générique

FORMAT DE SORTIE:
{
  "products": [
    {
      "originalDesignation": "DOLIPRANE 500MG CPR B/16",
      "dci": "paracétamol",
      "principesActifs": [{"nom": "paracétamol", "dosage": "500mg"}],
      "classeAtc": "N02BE01",
      "familleTherapeutique": "Antalgique, antipyrétique",
      "forme": "comprimé",
      "isGeneric": false
    }
  ]
}`;
    }
}
