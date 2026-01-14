/**
 * RAG Studio - Types TypeScript
 */

import { LucideIcon } from 'lucide-react'

// ============================================================================
// INDEX REGISTRY
// ============================================================================

export type IndexCategory = 'products' | 'interactions' | 'articles' | 'protocols' | 'custom'
export type IndexStatus = 'active' | 'maintenance' | 'disabled'

export interface SearchConfig {
  rpcFunctionName: string
  vectorWeight: number
  textWeight: number
  defaultMatchCount: number
}

export interface EmbeddingConfig {
  model: string
  dimensions: number
  prepareTextFn: string
}

export interface IndexDefinition {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: IndexCategory
  tableName: string
  schemaVersion: string
  searchConfig: SearchConfig
  embeddingConfig: EmbeddingConfig
  status: IndexStatus
  createdAt: Date
  updatedAt: Date
}

export interface IndexStats {
  indexId: string
  documentCount: number
  lastIngestion: Date | null
  health: 'healthy' | 'degraded' | 'error'
  errorMessage?: string
}

// ============================================================================
// INGESTION PIPELINE
// ============================================================================

export type IngestionMode = 'structured' | 'ai-enriched' | 'natural-language'

export type IngestionStatus =
  | 'pending'
  | 'validating'
  | 'enriching'
  | 'reviewing'
  | 'ingesting'
  | 'completed'
  | 'failed'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
  suggestion?: string
}

export type EnrichmentStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

export interface ProcessedDocument {
  id: string
  originalData: Record<string, unknown>
  processedData: Record<string, unknown>
  validationErrors: ValidationError[]
  enrichmentStatus: 'pending' | 'completed' | 'failed'
  enrichmentNotes?: string[]
  humanReviewRequired: boolean
  humanReviewCompleted?: boolean
  searchableText?: string
}

export interface IngestionJob {
  id: string
  indexId: string
  mode: IngestionMode
  status: IngestionStatus
  progress: number
  sourceType: 'json-file' | 'json-paste' | 'csv'
  rawData: unknown[]
  validatedData?: ProcessedDocument[]
  enrichedData?: ProcessedDocument[]
  results?: IngestionResult
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface IngestionResult {
  total: number
  success: number
  failed: number
  errors: Array<{ documentId: string; error: string }>
}

// ============================================================================
// AI ENRICHMENT
// ============================================================================

export interface EnrichmentConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  fieldPrompts?: Record<string, string>
}

export interface EnrichmentRequest {
  indexId: string
  document: Record<string, unknown>
  missingFields: string[]
  incompleteFields: string[]
}

export interface EnrichmentResponse {
  enrichedFields: Record<string, unknown>
  confidence: Record<string, number>
  reasoning: string[]
  reviewSuggestions: string[]
}

// ============================================================================
// UI STATE
// ============================================================================

export type RAGStudioView = 'dashboard' | 'explorer' | 'ingestion' | 'settings'

export interface RAGStudioState {
  currentView: RAGStudioView
  selectedIndexId: string | null
  ingestionJob: IngestionJob | null
}

// ============================================================================
// DOCUMENT VIEWER
// ============================================================================

export interface DocumentListItem {
  id: string
  productCode?: string
  productName?: string
  title?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}
