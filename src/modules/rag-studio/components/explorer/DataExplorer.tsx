/**
 * DataExplorer - Two-pane viewer pour explorer les données d'un index
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, X } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { IndexRegistry, CATEGORY_LABELS } from '../../services/IndexRegistry'
import { IndexDefinition, PaginationState } from '../../types'
import { DocumentList } from './DocumentList'
import { DocumentDetail } from './DocumentDetail'
import { MultiIndexService } from '@shared/services/rag/MultiIndexService'

interface DataExplorerProps {
  indexId: string | null
  onChangeIndex: (indexId: string | null) => void
}

export function DataExplorer({ indexId, onChangeIndex }: DataExplorerProps) {
  const [indexes] = useState<IndexDefinition[]>(() => IndexRegistry.getAll())
  const [selectedIndex, setSelectedIndex] = useState<IndexDefinition | null>(
    indexId ? IndexRegistry.get(indexId) || null : indexes[0] || null
  )
  const [showIndexSelector, setShowIndexSelector] = useState(false)

  // Documents state
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    limit: 20,
    total: 0,
    hasMore: false,
  })

  // Charger l'index depuis indexId
  useEffect(() => {
    if (indexId) {
      const index = IndexRegistry.get(indexId)
      if (index) setSelectedIndex(index)
    }
  }, [indexId])

  // Charger les documents quand l'index change
  useEffect(() => {
    if (selectedIndex) {
      loadDocuments(0)
    }
  }, [selectedIndex])

  const loadDocuments = async (page: number) => {
    if (!selectedIndex) return

    setIsLoading(true)
    try {
      const { documents: docs, total, hasMore } = await MultiIndexService.getDocuments(
        selectedIndex.id,
        { page, limit: pagination.limit, search: searchQuery || undefined }
      )

      setDocuments(docs)
      setPagination((p) => ({ ...p, page, total, hasMore }))

      // Sélectionner le premier document par défaut
      if (docs.length > 0 && !selectedDoc) {
        setSelectedDoc(docs[0])
      }
    } catch (err) {
      console.error('[DataExplorer] Erreur chargement:', err)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(() => {
    loadDocuments(0)
  }, [selectedIndex, searchQuery])

  const handleSelectIndex = (index: IndexDefinition) => {
    setSelectedIndex(index)
    onChangeIndex(index.id)
    setShowIndexSelector(false)
    setSelectedDoc(null)
    setDocuments([])
    setPagination((p) => ({ ...p, page: 0, total: 0 }))
  }

  const handleNextPage = () => {
    if (pagination.hasMore) {
      loadDocuments(pagination.page + 1)
    }
  }

  const handlePrevPage = () => {
    if (pagination.page > 0) {
      loadDocuments(pagination.page - 1)
    }
  }

  if (!selectedIndex) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-white/50">Sélectionnez un index à explorer</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left pane - Document list */}
      <div className="w-80 flex flex-col border-r border-white/5 bg-surface-50/50">
        {/* Index selector */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <button
              onClick={() => setShowIndexSelector(!showIndexSelector)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl',
                'bg-surface-100 border border-white/10 hover:border-white/20 transition-colors'
              )}
            >
              <div className="flex items-center gap-3">
                <selectedIndex.icon className="w-5 h-5 text-axora-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{selectedIndex.name}</p>
                  <p className="text-xs text-white/40">{CATEGORY_LABELS[selectedIndex.category]}</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-white/40 transition-transform',
                  showIndexSelector && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showIndexSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface-100 rounded-xl border border-white/10 shadow-xl overflow-hidden"
                >
                  {indexes.map((index) => (
                    <button
                      key={index.id}
                      onClick={() => handleSelectIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        index.id === selectedIndex.id
                          ? 'bg-axora-500/10 text-axora-400'
                          : 'hover:bg-white/5 text-white/80'
                      )}
                    >
                      <index.icon className="w-4 h-4" />
                      <span className="text-sm">{index.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher..."
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-lg',
                'bg-white/5 border border-white/10 text-white text-sm',
                'placeholder-white/40 focus:border-axora-500/50 focus:outline-none'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  loadDocuments(0)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Document list */}
        <DocumentList
          documents={documents}
          selectedId={selectedDoc?.id as string | undefined}
          onSelect={setSelectedDoc}
          isLoading={isLoading}
          pagination={pagination}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
        />
      </div>

      {/* Right pane - Document detail */}
      <div className="flex-1 flex flex-col bg-surface/50">
        <DocumentDetail document={selectedDoc} indexName={selectedIndex.name} />
      </div>
    </div>
  )
}
