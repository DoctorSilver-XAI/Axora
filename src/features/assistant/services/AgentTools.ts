/**
 * AgentTools - Définition et exécuteurs des outils pour l'agent IA
 *
 * Ces outils permettent à l'agent de :
 * - Rechercher dans la base BDPM (15 800 médicaments)
 * - Identifier un médicament par code CIP/CIS
 * - Trouver les génériques d'un médicament
 * - Vérifier les ruptures et alertes
 * - Calculer des posologies pédiatriques
 */

import { Tool, ToolCall, ToolResult } from '../types'
import { BDPMSearchService, BDPMProduct } from '@shared/services/rag/BDPMSearchService'
import { supabase } from '@shared/lib/supabase'

// ============================================
// DÉFINITIONS DES OUTILS (FORMAT OPENAI/MISTRAL)
// ============================================

export const AGENT_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_bdpm',
      description:
        "Recherche hybride dans la Base de Données Publique des Médicaments (BDPM). Utilise une combinaison de recherche sémantique (70%) et full-text (30%) pour trouver les médicaments les plus pertinents. Utilise cet outil pour toute question sur un médicament, son prix, son remboursement, sa composition, etc.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "Terme de recherche : nom commercial (ex: 'Doliprane'), DCI (ex: 'paracétamol'), ou description (ex: 'antalgique enfant')",
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum de résultats (1-10, défaut: 5)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_by_cip',
      description:
        "Recherche exacte par code CIP (Code Identifiant de Présentation). Le code CIP est un identifiant unique pour chaque conditionnement de médicament. Utilise cet outil quand l'utilisateur fournit un code-barres ou un code CIP à 7 ou 13 chiffres.",
      parameters: {
        type: 'object',
        properties: {
          cip_code: {
            type: 'string',
            description: 'Code CIP à 7 ou 13 chiffres (ex: 3400930000013)',
          },
        },
        required: ['cip_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_generiques',
      description:
        "Trouve tous les génériques d'un médicament à partir de son code CIS. Retourne le princeps (médicament de référence) et tous les génériques substituables du même groupe. Utilise cet outil pour comparer les alternatives génériques ou vérifier la substituabilité.",
      parameters: {
        type: 'object',
        properties: {
          cis_code: {
            type: 'string',
            description: "Code CIS à 8 chiffres du médicament de référence (ex: '60234100')",
          },
        },
        required: ['cis_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_disponibilite',
      description:
        "Vérifie la disponibilité d'un médicament : ruptures de stock, tensions d'approvisionnement, alertes de sécurité. Utilise cet outil pour savoir si un médicament est disponible ou s'il y a des problèmes d'approvisionnement.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              "Nom du médicament ou code CIS (ex: 'amoxicilline' ou '60234100')",
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_dosage',
      description:
        "Calcule la posologie adaptée au poids pour un médicament. Particulièrement utile pour les posologies pédiatriques. ATTENTION : Ce calcul est indicatif et doit être validé par le professionnel de santé.",
      parameters: {
        type: 'object',
        properties: {
          drug_name: {
            type: 'string',
            description: "Nom du médicament ou DCI (ex: 'paracétamol', 'ibuprofène')",
          },
          weight_kg: {
            type: 'number',
            description: 'Poids du patient en kilogrammes',
          },
          age_years: {
            type: 'number',
            description: 'Âge du patient en années (optionnel, pour adapter la posologie)',
          },
        },
        required: ['drug_name', 'weight_kg'],
      },
    },
  },
]

// ============================================
// EXÉCUTEURS DES OUTILS
// ============================================

interface ToolExecutor {
  (args: Record<string, unknown>): Promise<string>
}

const toolExecutors: Record<string, ToolExecutor> = {
  /**
   * Recherche hybride BDPM avec fallback sur bdpm_specialites
   */
  search_bdpm: async (args) => {
    const query = args.query as string
    const limit = Math.min(Math.max((args.limit as number) || 5, 1), 10)

    // Essayer d'abord la recherche hybride (embeddings + full-text)
    let results = await BDPMSearchService.searchHybrid(query, { matchCount: limit })

    // FALLBACK: Si pas de résultats, chercher directement dans bdpm_specialites
    // (utile si les embeddings ne sont pas encore tous générés)
    if (results.length === 0) {
      console.log('[AgentTools] Fallback sur bdpm_specialites pour:', query)

      const { data: specialites } = await supabase
        .from('bdpm_specialites')
        .select(`
          code_cis,
          denomination,
          forme_pharmaceutique,
          titulaires,
          etat_commercialisation,
          surveillance_renforcee,
          dci_principal,
          laboratoire_principal
        `)
        .or(`denomination.ilike.%${query}%,dci_principal.ilike.%${query}%`)
        .limit(limit)

      if (specialites && specialites.length > 0) {
        // Convertir en format simplifié pour le LLM
        return JSON.stringify({
          success: true,
          count: specialites.length,
          source: 'bdpm_specialites (fallback)',
          note: 'Données de base ANSM. Pour prix/remboursement détaillés, les embeddings sont en cours de génération.',
          results: specialites.map((s) => ({
            nom: s.denomination,
            code_cis: s.code_cis,
            dci: s.dci_principal,
            laboratoire: s.laboratoire_principal || s.titulaires?.[0],
            forme: s.forme_pharmaceutique,
            commercialise: s.etat_commercialisation === 'Commercialisée',
            surveillance_renforcee: s.surveillance_renforcee,
          })),
        })
      }
    }

    if (results.length === 0) {
      return JSON.stringify({
        success: false,
        message: `Aucun médicament trouvé pour "${query}"`,
        suggestions: [
          "Vérifiez l'orthographe",
          'Essayez avec le nom de la substance active (DCI)',
          'Utilisez search_by_cip si vous avez un code CIP',
        ],
      })
    }

    return JSON.stringify({
      success: true,
      count: results.length,
      results: results.map(formatProductForLLM),
    })
  },

  /**
   * Recherche exacte par CIP
   */
  search_by_cip: async (args) => {
    const cipCode = args.cip_code as string
    const result = await BDPMSearchService.searchByCIP(cipCode)

    if (!result) {
      return JSON.stringify({
        success: false,
        message: `Aucun médicament trouvé pour le code CIP "${cipCode}"`,
        suggestions: [
          'Vérifiez que le code comporte 7 ou 13 chiffres',
          "Le médicament n'est peut-être plus commercialisé",
        ],
      })
    }

    return JSON.stringify({
      success: true,
      result: formatProductForLLM(result),
    })
  },

  /**
   * Recherche des génériques
   */
  get_generiques: async (args) => {
    const cisCode = args.cis_code as string
    const results = await BDPMSearchService.findGeneriques(cisCode)

    if (results.length === 0) {
      return JSON.stringify({
        success: false,
        message: `Aucun groupe générique trouvé pour le code CIS "${cisCode}"`,
        suggestions: [
          "Le médicament n'appartient peut-être pas à un groupe générique",
          'Vérifiez le code CIS (8 chiffres)',
        ],
      })
    }

    const princeps = results.find((p) => p.productData.info_generique?.type === 'princeps')
    const generiques = results.filter((p) => p.productData.info_generique?.type !== 'princeps')

    return JSON.stringify({
      success: true,
      groupe: results[0].productData.info_generique?.libelle || 'Groupe générique',
      princeps: princeps ? formatProductForLLM(princeps) : null,
      generiques: generiques.map(formatProductForLLM),
      total_generiques: generiques.length,
    })
  },

  /**
   * Vérification disponibilité
   */
  check_disponibilite: async (args) => {
    const query = args.query as string

    // Essayer d'abord par CIS si c'est un code numérique
    const isCISCode = /^\d{8}$/.test(query)
    let products: BDPMProduct[] = []

    if (isCISCode) {
      const result = await BDPMSearchService.searchByCIS(query)
      if (result) products = [result]
    } else {
      products = await BDPMSearchService.searchHybrid(query, { matchCount: 3 })
    }

    if (products.length === 0) {
      return JSON.stringify({
        success: false,
        message: `Aucun médicament trouvé pour "${query}"`,
      })
    }

    const disponibiliteInfo = products.map((p) => ({
      nom: p.productName,
      code_cis: p.codeCis,
      en_rupture: p.hasRupture,
      alerte_securite: p.hasAlerte,
      surveillance_renforcee: p.productData.surveillance_renforcee || false,
      disponibilite: p.productData.disponibilite
        ? {
            statut: p.productData.disponibilite.statut,
            date_debut: p.productData.disponibilite.date_debut,
            date_remise_dispo: p.productData.disponibilite.date_remise,
          }
        : { statut: 'Disponible' },
      alertes: p.productData.alertes_actives || [],
    }))

    const hasIssues = disponibiliteInfo.some(
      (d) => d.en_rupture || d.alerte_securite || d.surveillance_renforcee
    )

    return JSON.stringify({
      success: true,
      has_issues: hasIssues,
      results: disponibiliteInfo,
    })
  },

  /**
   * Calcul de posologie
   */
  calculate_dosage: async (args) => {
    const drugName = (args.drug_name as string).toLowerCase()
    const weightKg = args.weight_kg as number
    const ageYears = args.age_years as number | undefined

    // Référentiel des posologies courantes (mg/kg/jour)
    const dosageRules: Record<
      string,
      {
        mgPerKgPerDay: number
        maxDailyMg: number
        doses: number
        minAge?: number
        notes: string
      }
    > = {
      paracetamol: {
        mgPerKgPerDay: 60,
        maxDailyMg: 4000,
        doses: 4,
        minAge: 0,
        notes: 'Maximum 1g par prise chez l\'adulte. Intervalle minimum de 4h entre les prises.',
      },
      paracétamol: {
        mgPerKgPerDay: 60,
        maxDailyMg: 4000,
        doses: 4,
        minAge: 0,
        notes: 'Maximum 1g par prise chez l\'adulte. Intervalle minimum de 4h entre les prises.',
      },
      ibuprofene: {
        mgPerKgPerDay: 30,
        maxDailyMg: 1200,
        doses: 3,
        minAge: 0.25, // 3 mois
        notes: 'Contre-indiqué avant 3 mois. À prendre au cours des repas.',
      },
      ibuprofène: {
        mgPerKgPerDay: 30,
        maxDailyMg: 1200,
        doses: 3,
        minAge: 0.25,
        notes: 'Contre-indiqué avant 3 mois. À prendre au cours des repas.',
      },
      amoxicilline: {
        mgPerKgPerDay: 80,
        maxDailyMg: 3000,
        doses: 3,
        minAge: 0,
        notes:
          'Dose standard pour infections courantes. Peut aller jusqu\'à 100mg/kg/j pour otites/pneumonies.',
      },
    }

    // Normaliser le nom du médicament
    const normalizedName = drugName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const rule = dosageRules[drugName] || dosageRules[normalizedName]

    if (!rule) {
      return JSON.stringify({
        success: false,
        message: `Posologie non disponible pour "${drugName}"`,
        available_drugs: Object.keys(dosageRules),
        suggestion:
          'Utilisez search_bdpm pour trouver les informations officielles du RCP.',
      })
    }

    // Vérification de l'âge minimum
    if (ageYears !== undefined && rule.minAge !== undefined && ageYears < rule.minAge) {
      return JSON.stringify({
        success: false,
        warning: `${drugName} est contre-indiqué avant ${rule.minAge * 12} mois`,
        age_patient: ageYears,
        age_minimum: rule.minAge,
      })
    }

    // Calcul
    const dailyDoseMg = Math.min(weightKg * rule.mgPerKgPerDay, rule.maxDailyMg)
    const dosePerTake = Math.round(dailyDoseMg / rule.doses)

    return JSON.stringify({
      success: true,
      medicament: drugName,
      patient: {
        poids_kg: weightKg,
        age_annees: ageYears,
      },
      posologie: {
        dose_journaliere_mg: Math.round(dailyDoseMg),
        dose_par_prise_mg: dosePerTake,
        nombre_prises: rule.doses,
        base_calcul: `${rule.mgPerKgPerDay} mg/kg/jour`,
      },
      limites: {
        dose_max_journaliere_mg: rule.maxDailyMg,
        plafonne: dailyDoseMg >= rule.maxDailyMg,
      },
      notes: rule.notes,
      avertissement:
        '⚠️ Ce calcul est indicatif. Vérifiez toujours le RCP et adaptez selon le contexte clinique.',
    })
  },
}

// ============================================
// EXÉCUTION D'UN TOOL CALL
// ============================================

/**
 * Exécute un appel d'outil et retourne le résultat formaté
 */
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: argsString } = toolCall.function
  const executor = toolExecutors[name]

  if (!executor) {
    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      content: JSON.stringify({
        success: false,
        error: `Outil inconnu: ${name}`,
        available_tools: AGENT_TOOLS.map((t) => t.function.name),
      }),
    }
  }

  try {
    // Parser les arguments JSON
    const args = JSON.parse(argsString)

    // Exécuter l'outil
    const startTime = Date.now()
    const result = await executor(args)
    const duration = Date.now() - startTime

    console.log(`[AgentTools] ${name} exécuté en ${duration}ms`)

    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      content: result,
    }
  } catch (error) {
    console.error(`[AgentTools] Erreur exécution ${name}:`, error)

    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      content: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
    }
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Formate un produit BDPM pour être lisible par le LLM
 */
function formatProductForLLM(product: BDPMProduct): Record<string, unknown> {
  const presentations = product.productData.presentations || []
  const prixMin = Math.min(...presentations.filter((p) => p.prix).map((p) => p.prix!))
  const prixMax = Math.max(...presentations.filter((p) => p.prix).map((p) => p.prix!))

  return {
    nom: product.productName,
    code_cis: product.codeCis,
    dci: product.dci,
    laboratoire: product.laboratory,
    forme: product.formePharmaceutique,
    substances_actives: product.productData.substances_actives?.map((s) => ({
      substance: s.substance,
      dosage: s.dosage,
    })),
    presentations: presentations.slice(0, 3).map((p) => ({
      cip13: p.cip13,
      libelle: p.libelle,
      prix_euro: p.prix,
      remboursement: p.remboursement,
      commercialise: p.commercialise,
    })),
    prix: {
      min: isFinite(prixMin) ? prixMin : null,
      max: isFinite(prixMax) ? prixMax : null,
    },
    conditions_delivrance: product.productData.conditions_delivrance,
    generique: product.isGenerique
      ? {
          type: product.productData.info_generique?.type,
          groupe: product.productData.info_generique?.libelle,
        }
      : null,
    statut: {
      en_rupture: product.hasRupture,
      alerte_securite: product.hasAlerte,
      surveillance_renforcee: product.productData.surveillance_renforcee,
    },
    avis_has: product.productData.avis_smr
      ? {
          smr: product.productData.avis_smr.valeur,
          asmr: product.productData.avis_asmr?.valeur,
        }
      : null,
  }
}

/**
 * Retourne les outils sous forme de liste pour l'API
 */
export function getToolsForAPI(): Tool[] {
  return AGENT_TOOLS
}

/**
 * Retourne les noms des outils disponibles
 */
export function getAvailableToolNames(): string[] {
  return AGENT_TOOLS.map((t) => t.function.name)
}
