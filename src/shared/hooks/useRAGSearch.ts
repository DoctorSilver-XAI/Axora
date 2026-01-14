/**
 * Hook React pour la recherche RAG
 * Utilisable dans n'importe quel composant pour rechercher des produits
 */

import { useState, useCallback, useRef } from 'react'
import { ProductSearchService, RAGService, SearchResult, SearchOptions } from '@shared/services/rag'

interface UseRAGSearchReturn {
  /** Résultats de la recherche */
  results: SearchResult[]
  /** Indicateur de chargement */
  isLoading: boolean
  /** Message d'erreur éventuel */
  error: string | null
  /** Lance une recherche hybride */
  search: (query: string, options?: SearchOptions) => Promise<void>
  /** Lance une recherche sémantique pure */
  searchSemantic: (query: string, options?: Partial<SearchOptions>) => Promise<void>
  /** Lance une recherche full-text pure */
  searchFullText: (query: string, options?: Partial<SearchOptions>) => Promise<void>
  /** Efface les résultats */
  clearResults: () => void
  /** Dernière requête effectuée */
  lastQuery: string | null
}

/**
 * Hook pour la recherche de produits pharmaceutiques
 *
 * @example
 * ```tsx
 * function ProductSearch() {
 *   const { results, isLoading, search, clearResults } = useRAGSearch()
 *
 *   return (
 *     <div>
 *       <input
 *         onChange={(e) => search(e.target.value)}
 *         placeholder="Rechercher un médicament..."
 *       />
 *       {isLoading && <Spinner />}
 *       {results.map(product => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRAGSearch(): UseRAGSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)

  // Ref pour annuler les requêtes obsolètes
  const requestIdRef = useRef(0)

  /**
   * Recherche hybride (vector + full-text)
   */
  const search = useCallback(async (query: string, options?: SearchOptions) => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      setResults([])
      setLastQuery(null)
      return
    }

    // Incrémenter l'ID de requête pour ignorer les réponses obsolètes
    const currentRequestId = ++requestIdRef.current

    setIsLoading(true)
    setError(null)
    setLastQuery(trimmedQuery)

    try {
      const searchResults = await ProductSearchService.searchHybrid(trimmedQuery, options)

      // Vérifier que c'est toujours la requête en cours
      if (currentRequestId === requestIdRef.current) {
        setResults(searchResults)
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Erreur de recherche')
        setResults([])
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  /**
   * Recherche sémantique pure
   */
  const searchSemantic = useCallback(
    async (query: string, options?: Partial<SearchOptions>) => {
      const trimmedQuery = query.trim()

      if (!trimmedQuery) {
        setResults([])
        return
      }

      const currentRequestId = ++requestIdRef.current

      setIsLoading(true)
      setError(null)
      setLastQuery(trimmedQuery)

      try {
        const searchResults = await ProductSearchService.searchSemantic(trimmedQuery, options)

        if (currentRequestId === requestIdRef.current) {
          setResults(searchResults)
        }
      } catch (err) {
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Erreur de recherche')
          setResults([])
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  /**
   * Recherche full-text pure
   */
  const searchFullText = useCallback(
    async (query: string, options?: Partial<SearchOptions>) => {
      const trimmedQuery = query.trim()

      if (!trimmedQuery) {
        setResults([])
        return
      }

      const currentRequestId = ++requestIdRef.current

      setIsLoading(true)
      setError(null)
      setLastQuery(trimmedQuery)

      try {
        const searchResults = await ProductSearchService.searchFullText(trimmedQuery, options)

        if (currentRequestId === requestIdRef.current) {
          setResults(searchResults)
        }
      } catch (err) {
        if (currentRequestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Erreur de recherche')
          setResults([])
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  /**
   * Efface les résultats
   */
  const clearResults = useCallback(() => {
    requestIdRef.current++ // Annule toute requête en cours
    setResults([])
    setError(null)
    setLastQuery(null)
  }, [])

  return {
    results,
    isLoading,
    error,
    search,
    searchSemantic,
    searchFullText,
    clearResults,
    lastQuery,
  }
}

// ===========================================
// HOOKS UTILITAIRES SUPPLÉMENTAIRES
// ===========================================

/**
 * Hook pour vérifier si une requête devrait utiliser le RAG
 */
export function useRAGDetection() {
  const shouldUseRAG = useCallback((query: string): boolean => {
    return RAGService.shouldUseRAG(query)
  }, [])

  const extractTerms = useCallback((query: string): string[] => {
    return RAGService.extractPharmaceuticalTerms(query)
  }, [])

  return { shouldUseRAG, extractTerms }
}
