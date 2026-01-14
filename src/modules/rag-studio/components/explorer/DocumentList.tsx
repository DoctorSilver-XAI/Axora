/**
 * DocumentList - Liste paginée des documents
 */

import { motion, AnimatePresence } from 'framer-motion'
import { FileJson, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { PaginationState } from '../../types'

interface DocumentListProps {
  documents: Record<string, unknown>[]
  selectedId: string | undefined
  onSelect: (doc: Record<string, unknown>) => void
  isLoading: boolean
  pagination: PaginationState
  onNextPage: () => void
  onPrevPage: () => void
}

export function DocumentList({
  documents,
  selectedId,
  onSelect,
  isLoading,
  pagination,
  onNextPage,
  onPrevPage,
}: DocumentListProps) {
  // Extraire un titre lisible du document
  const getDocumentTitle = (doc: Record<string, unknown>): string => {
    // Essayer différents champs courants
    if (doc.product_name) return doc.product_name as string
    if (doc.productName) return doc.productName as string
    if (doc.name) return doc.name as string
    if (doc.title) return doc.title as string
    if (doc.product_code) return doc.product_code as string
    if (doc.id) return `#${(doc.id as string).slice(0, 8)}`
    return 'Document sans titre'
  }

  // Extraire un sous-titre/description
  const getDocumentSubtitle = (doc: Record<string, unknown>): string => {
    if (doc.dci) return doc.dci as string
    if (doc.category) return doc.category as string
    if (doc.description) return (doc.description as string).slice(0, 50)
    return ''
  }

  // Formater la date
  const formatDate = (dateStr: unknown): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr as string)
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Liste scrollable */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-axora-400 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <FileJson className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-sm text-white/50">Aucun document trouvé</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {documents.map((doc, i) => {
              const id = doc.id as string
              const isSelected = id === selectedId
              const createdAt = doc.created_at as string | undefined

              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onSelect(doc)}
                  className={cn(
                    'w-full p-4 text-left border-b border-white/5 transition-colors',
                    isSelected
                      ? 'bg-axora-500/10 border-l-2 border-l-axora-500'
                      : 'hover:bg-white/5 border-l-2 border-l-transparent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg flex-shrink-0',
                        isSelected ? 'bg-axora-500/20' : 'bg-white/5'
                      )}
                    >
                      <FileJson
                        className={cn('w-4 h-4', isSelected ? 'text-axora-400' : 'text-white/40')}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-axora-300' : 'text-white'
                        )}
                      >
                        {getDocumentTitle(doc)}
                      </p>
                      {getDocumentSubtitle(doc) && (
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {getDocumentSubtitle(doc)}
                        </p>
                      )}
                    </div>

                    {createdAt && (
                      <span className="text-[10px] text-white/30 flex-shrink-0">
                        {formatDate(createdAt)}
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-surface-50/50">
          <span className="text-xs text-white/40">
            {pagination.page * pagination.limit + 1}-
            {Math.min((pagination.page + 1) * pagination.limit, pagination.total)} sur{' '}
            {pagination.total}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={onPrevPage}
              disabled={pagination.page === 0}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                pagination.page === 0
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextPage}
              disabled={!pagination.hasMore}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                !pagination.hasMore
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
