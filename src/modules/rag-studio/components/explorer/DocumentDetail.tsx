/**
 * DocumentDetail - Affichage JSON d'un document sélectionné
 */

import { useState } from 'react'
import { Copy, Check, ChevronRight, ChevronDown, FileJson } from 'lucide-react'
import { cn } from '@shared/utils/cn'

interface DocumentDetailProps {
  document: Record<string, unknown> | null
  indexName: string
}

export function DocumentDetail({ document, indexName }: DocumentDetailProps) {
  const [copied, setCopied] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']))

  const handleCopy = async () => {
    if (!document) return

    await navigator.clipboard.writeText(JSON.stringify(document, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <FileJson className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/50">Sélectionnez un document pour voir son contenu</p>
      </div>
    )
  }

  // Extraire les métadonnées principales
  const metadata = {
    id: document.id as string | undefined,
    productName: (document.product_name || document.productName) as string | undefined,
    productCode: (document.product_code || document.productCode) as string | undefined,
    dci: document.dci as string | undefined,
    category: document.category as string | undefined,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
  }

  // Données principales (product_data ou le document entier)
  const mainData = document.product_data || document

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <h3 className="font-semibold text-white">
            {metadata.productName || `Document #${metadata.id?.slice(0, 8) || '?'}`}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">{indexName}</p>
        </div>

        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
            copied
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copié !' : 'Copier JSON'}
        </button>
      </div>

      {/* Metadata summary */}
      {(metadata.productCode || metadata.dci || metadata.category) && (
        <div className="px-6 py-3 border-b border-white/5 bg-surface-50/30">
          <div className="flex items-center gap-4 flex-wrap">
            {metadata.productCode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Code:</span>
                <span className="text-xs font-mono text-axora-400">{metadata.productCode}</span>
              </div>
            )}
            {metadata.dci && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">DCI:</span>
                <span className="text-xs text-white/80">{metadata.dci}</span>
              </div>
            )}
            {metadata.category && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Catégorie:</span>
                <span className="text-xs text-white/80">{metadata.category}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Tree Viewer */}
      <div className="flex-1 overflow-auto p-4">
        <div className="font-mono text-sm">
          <JSONNode
            data={mainData as Record<string, unknown>}
            path="root"
            expandedPaths={expandedPaths}
            onToggle={togglePath}
            depth={0}
          />
        </div>
      </div>
    </div>
  )
}

// Composant récursif pour afficher le JSON
interface JSONNodeProps {
  data: unknown
  path: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  depth: number
  keyName?: string
}

function JSONNode({ data, path, expandedPaths, onToggle, depth, keyName }: JSONNodeProps) {
  const isExpanded = expandedPaths.has(path)
  const indent = depth * 16

  // Null
  if (data === null) {
    return (
      <div style={{ marginLeft: indent }} className="py-0.5">
        {keyName && <span className="text-cyan-400">{keyName}: </span>}
        <span className="text-white/40">null</span>
      </div>
    )
  }

  // Primitives
  if (typeof data !== 'object') {
    const valueColor =
      typeof data === 'string'
        ? 'text-emerald-400'
        : typeof data === 'number'
          ? 'text-amber-400'
          : typeof data === 'boolean'
            ? 'text-purple-400'
            : 'text-white'

    const displayValue =
      typeof data === 'string' ? `"${data}"` : String(data)

    return (
      <div style={{ marginLeft: indent }} className="py-0.5">
        {keyName && <span className="text-cyan-400">{keyName}: </span>}
        <span className={cn(valueColor, 'break-all')}>{displayValue}</span>
      </div>
    )
  }

  // Arrays & Objects
  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data)
  const isEmpty = entries.length === 0

  return (
    <div style={{ marginLeft: indent }}>
      <button
        onClick={() => onToggle(path)}
        className="flex items-center gap-1 py-0.5 hover:bg-white/5 rounded -ml-4 pl-1 pr-2"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-white/40" />
        ) : (
          <ChevronRight className="w-3 h-3 text-white/40" />
        )}
        {keyName && <span className="text-cyan-400">{keyName}: </span>}
        <span className="text-white/60">
          {isArray ? `[${isEmpty ? '' : `${entries.length}`}]` : `{${isEmpty ? '' : `${entries.length}`}}`}
        </span>
      </button>

      {isExpanded && !isEmpty && (
        <div className="border-l border-white/10 ml-1.5">
          {entries.map(([key, value]) => (
            <JSONNode
              key={key}
              data={value}
              path={`${path}.${key}`}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              depth={1}
              keyName={String(key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
