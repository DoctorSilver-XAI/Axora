/**
 * MarkdownPreview - Rendu Markdown amélioré avec support LaTeX et coloration syntaxique
 */

import { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'
import { cn } from '@shared/utils/cn'

// Import KaTeX CSS pour le rendu des formules
import 'katex/dist/katex.min.css'

/**
 * Normalise la syntaxe LaTeX des LLM vers le format standard
 * Les LLM utilisent souvent:
 * - `\[ ... \]` ou `[ ... ]` pour les blocs → converti en `$$ ... $$`
 * - `\( ... \)` pour inline → converti en `$ ... $`
 */
function normalizeLatexSyntax(content: string): string {
  let normalized = content

  // Bloc: \[ ... \] → $$ ... $$
  normalized = normalized.replace(/\\\[(.+?)\\\]/gs, (_, formula) => `$$${formula.trim()}$$`)

  // Bloc: [ \text{...} ] ou [ ... ] contenant du LaTeX sur une ligne seule
  // Pattern: ligne commençant par [ et finissant par ] avec du contenu LaTeX
  normalized = normalized.replace(
    /^\s*\[\s*(\\(?:text|frac|sqrt|times|left|right|approx|sum|int|prod|lim|infty|alpha|beta|gamma|delta|pi|theta|sigma|omega|partial|nabla|cdot|ldots|cdots|ddots|vdots|quad|qquad|,|;|!|\s|[a-zA-Z0-9{}()^_=+\-*/<>|.,]+)+)\s*\]\s*$/gm,
    (_, formula) => `$$${formula.trim()}$$`
  )

  // Inline: \( ... \) → $ ... $
  normalized = normalized.replace(/\\\((.+?)\\\)/gs, (_, formula) => `$${formula.trim()}$`)

  return normalized
}

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  // Normaliser la syntaxe LaTeX une seule fois (mémoïsé)
  const normalizedContent = useMemo(() => normalizeLatexSyntax(content), [content])

  if (!content) {
    return (
      <div className={cn('text-white/40 italic', className)}>
        Aucun contenu à afficher...
      </div>
    )
  }

  return (
    <div className={cn('markdown-preview', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-white/10">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-white mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-white mt-3 mb-1.5">{children}</h4>
          ),

          // Paragraphs
          p: ({ children }) => <p className="text-white/80 mb-3 leading-relaxed">{children}</p>,

          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children, className: liClassName }) => {
            // Handle GFM task list items
            const isTaskItem = liClassName?.includes('task-list-item')
            return (
              <li className={cn('text-white/80', isTaskItem && 'list-none flex items-start gap-2')}>
                {children}
              </li>
            )
          },

          // Task list checkboxes
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded border mr-2',
                    checked
                      ? 'bg-axora-500 border-axora-500 text-white'
                      : 'bg-white/5 border-white/20'
                  )}
                >
                  {checked && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              )
            }
            return null
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-axora-500 pl-4 my-4 text-white/60 italic bg-axora-500/5 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Code blocks with copy button
          pre: ({ children }) => {
            return <CodeBlock>{children}</CodeBlock>
          },

          // Inline code
          code: ({ className: codeClassName, children, ...props }) => {
            // Check if it's inside a pre (block code) - rehype-highlight adds language class
            const isBlock = codeClassName?.includes('hljs') || codeClassName?.includes('language-')

            if (isBlock) {
              // Block code - rendered inside pre, just return the code with classes
              return (
                <code className={cn(codeClassName, 'text-sm font-mono')} {...props}>
                  {children}
                </code>
              )
            }

            // Inline code
            return (
              <code className="bg-white/10 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            )
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-axora-400 hover:text-axora-300 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),

          // Strong/Bold
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,

          // Emphasis/Italic
          em: ({ children }) => <em className="italic text-white/90">{children}</em>,

          // Horizontal rule
          hr: () => <hr className="border-white/10 my-6" />,

          // Tables (GFM)
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-white/10">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-sm font-medium text-white border-b border-white/10">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 text-sm text-white/70">{children}</td>,
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}

/**
 * CodeBlock - Bloc de code avec bouton copier
 */
function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    // Extract text content from children
    const codeElement = children as React.ReactElement
    const codeContent = extractTextContent(codeElement)

    try {
      await navigator.clipboard.writeText(codeContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [children])

  return (
    <div className="relative group mb-4">
      <pre className="bg-surface-100 p-4 rounded-xl text-sm font-mono text-white/80 overflow-x-auto border border-white/5">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200',
          'opacity-0 group-hover:opacity-100',
          copied
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20'
        )}
        title={copied ? 'Copié !' : 'Copier le code'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}

/**
 * Extrait le contenu texte d'un élément React (pour la copie)
 */
function extractTextContent(element: React.ReactNode): string {
  if (typeof element === 'string') {
    return element
  }

  if (typeof element === 'number') {
    return String(element)
  }

  if (Array.isArray(element)) {
    return element.map(extractTextContent).join('')
  }

  if (element && typeof element === 'object' && 'props' in element) {
    const { children } = element.props as { children?: React.ReactNode }
    return extractTextContent(children)
  }

  return ''
}
