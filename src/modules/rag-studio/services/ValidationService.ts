/**
 * ValidationService - Validation des documents avant ingestion
 * Valide les documents contre le schéma d'un index
 */

import { ValidationError, ProcessedDocument } from '../types'

// Schéma de validation pour les produits pharmaceutiques
// Définit les champs requis, optionnels et leurs types
interface FieldSchema {
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}

interface IndexSchema {
  fields: Record<string, FieldSchema>
  requiredOneOf?: string[][] // Au moins un de ces groupes doit être présent
}

// Schémas par index
const SCHEMAS: Record<string, IndexSchema> = {
  pharmaceutical_products: {
    fields: {
      product_code: {
        required: true,
        type: 'string',
        description: 'Code unique du produit (ex: doliprane_500mg)',
        minLength: 3,
        maxLength: 100,
        pattern: /^[a-z0-9_-]+$/i,
      },
      product_name: {
        required: true,
        type: 'string',
        description: 'Nom commercial du produit',
        minLength: 2,
        maxLength: 200,
      },
      dci: {
        required: true,
        type: 'string',
        description: 'Dénomination Commune Internationale',
        minLength: 2,
      },
      category: {
        required: false,
        type: 'string',
        description: 'Catégorie thérapeutique',
      },
      product_data: {
        required: false,
        type: 'object',
        description: 'Données structurées du produit (schéma complet)',
      },
    },
  },
}

/**
 * Valide un document contre le schéma d'un index
 */
function validateDocument(
  doc: Record<string, unknown>,
  indexId: string
): ValidationError[] {
  const schema = SCHEMAS[indexId]
  const errors: ValidationError[] = []

  if (!schema) {
    return [
      {
        field: '_schema',
        message: `Schéma non trouvé pour l'index "${indexId}"`,
        severity: 'error',
      },
    ]
  }

  // Vérifier les champs requis
  for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
    const value = doc[fieldName]

    // Champ requis manquant
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        message: `Champ requis "${fieldName}" manquant`,
        severity: 'error',
        suggestion: fieldSchema.description,
      })
      continue
    }

    // Si le champ est présent, valider son type et contraintes
    if (value !== undefined && value !== null) {
      // Vérifier le type
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== fieldSchema.type) {
        errors.push({
          field: fieldName,
          message: `Type invalide pour "${fieldName}": attendu ${fieldSchema.type}, reçu ${actualType}`,
          severity: 'error',
        })
        continue
      }

      // Vérifier les contraintes string
      if (fieldSchema.type === 'string' && typeof value === 'string') {
        if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
          errors.push({
            field: fieldName,
            message: `"${fieldName}" trop court (min: ${fieldSchema.minLength} caractères)`,
            severity: 'error',
          })
        }

        if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
          errors.push({
            field: fieldName,
            message: `"${fieldName}" trop long (max: ${fieldSchema.maxLength} caractères)`,
            severity: 'error',
          })
        }

        if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
          errors.push({
            field: fieldName,
            message: `"${fieldName}" ne respecte pas le format attendu`,
            severity: 'warning',
            suggestion: 'Utilisez uniquement des lettres, chiffres, tirets et underscores',
          })
        }
      }
    }
  }

  // Vérifier les warnings pour champs optionnels importants manquants
  const importantOptionalFields = ['category', 'product_data']
  for (const fieldName of importantOptionalFields) {
    if (
      schema.fields[fieldName] &&
      !schema.fields[fieldName].required &&
      (doc[fieldName] === undefined || doc[fieldName] === null)
    ) {
      errors.push({
        field: fieldName,
        message: `Champ "${fieldName}" recommandé mais absent`,
        severity: 'warning',
        suggestion: schema.fields[fieldName].description,
      })
    }
  }

  return errors
}

/**
 * Génère un texte de recherche à partir d'un document produit
 * Ce texte sera utilisé pour la recherche full-text et l'embedding
 */
function generateSearchableText(doc: Record<string, unknown>): string {
  const parts: string[] = []

  // Nom du produit
  if (doc.product_name) {
    parts.push(doc.product_name as string)
  }

  // DCI
  if (doc.dci) {
    parts.push(doc.dci as string)
  }

  // Catégorie
  if (doc.category) {
    parts.push(doc.category as string)
  }

  // Données structurées
  if (doc.product_data && typeof doc.product_data === 'object') {
    const data = doc.product_data as Record<string, unknown>

    // Identité produit
    if (data.product_identity) {
      const identity = data.product_identity as Record<string, unknown>
      if (identity.commercial_name) parts.push(identity.commercial_name as string)
      if (Array.isArray(identity.active_substances)) {
        parts.push(...(identity.active_substances as string[]))
      }
    }

    // Classification
    if (data.officinal_classification) {
      const classification = data.officinal_classification as Record<string, unknown>
      if (classification.therapeutic_family) parts.push(classification.therapeutic_family as string)
      if (Array.isArray(classification.main_symptoms)) {
        parts.push(...(classification.main_symptoms as string[]))
      }
    }

    // Indications cliniques
    if (data.clinical && typeof data.clinical === 'object') {
      const clinical = data.clinical as Record<string, unknown>
      if (Array.isArray(clinical.indications)) {
        parts.push(...(clinical.indications as string[]))
      }
    }

    // Metadata RAG
    if (data.rag_metadata) {
      const ragMeta = data.rag_metadata as Record<string, unknown>
      if (Array.isArray(ragMeta.semantic_tags)) {
        parts.push(...(ragMeta.semantic_tags as string[]))
      }
      if (Array.isArray(ragMeta.common_patient_queries)) {
        parts.push(...(ragMeta.common_patient_queries as string[]))
      }
    }
  }

  return parts.filter(Boolean).join(' | ')
}

/**
 * Service de validation
 */
export const ValidationService = {
  /**
   * Valide un document contre le schéma d'un index
   */
  validateDocument,

  /**
   * Valide un batch de documents et retourne des ProcessedDocument
   */
  validateBatch(
    documents: Record<string, unknown>[],
    indexId: string
  ): ProcessedDocument[] {
    return documents.map((doc, index) => {
      const errors = validateDocument(doc, indexId)
      const hasErrors = errors.some((e) => e.severity === 'error')
      const hasWarnings = errors.some((e) => e.severity === 'warning')

      return {
        id: `doc-${index}-${Date.now()}`,
        originalData: doc,
        processedData: doc, // Pour le mode structuré, pas de transformation
        validationErrors: errors,
        enrichmentStatus: 'pending' as const,
        humanReviewRequired: hasWarnings && !hasErrors,
        searchableText: hasErrors ? undefined : generateSearchableText(doc),
      }
    })
  },

  /**
   * Génère le texte de recherche pour un document
   */
  generateSearchableText,

  /**
   * Retourne le schéma d'un index (pour affichage)
   */
  getSchema(indexId: string): IndexSchema | null {
    return SCHEMAS[indexId] || null
  },

  /**
   * Retourne les champs requis d'un index
   */
  getRequiredFields(indexId: string): string[] {
    const schema = SCHEMAS[indexId]
    if (!schema) return []
    return Object.entries(schema.fields)
      .filter(([, field]) => field.required)
      .map(([name]) => name)
  },
}
