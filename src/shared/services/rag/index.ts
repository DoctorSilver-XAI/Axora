/**
 * Module RAG - Exports centralisés
 */

// Types
export * from './types'

// Services
export { EmbeddingService } from './EmbeddingService'
export { ProductSearchService } from './ProductSearchService'
export { BDPMSearchService } from './BDPMSearchService'
export type {
  BDPMProduct,
  BDPMProductData,
  BDPMSearchOptions,
  BDPMPresentation,
  BDPMSubstance,
  BDPMAlerte,
  BDPMDisponibilite,
} from './BDPMSearchService'
export { RAGService } from './RAGService'
export { ProductIngestionService } from './ProductIngestionService'
export { RAGAdmin } from './RAGAdmin'
export { ProductFactory, type QuickProductInput } from './ProductFactory'
export { MultiIndexService } from './MultiIndexService'

// Données de test
export { TEST_PRODUCTS, DOLIPRANE_500, NUROFEN_400, SPASFON_LYOC } from './testData'
