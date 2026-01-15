import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@shared/utils/cn'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
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
        remarkPlugins={[remarkGfm]}
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

          // Paragraphs
          p: ({ children }) => <p className="text-white/80 mb-3 leading-relaxed">{children}</p>,

          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children, className }) => {
            // Handle GFM task list items
            const isTaskItem = className?.includes('task-list-item')
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
            <blockquote className="border-l-4 border-axora-500 pl-4 my-4 text-white/60 italic">
              {children}
            </blockquote>
          ),

          // Code
          code: ({ className, children }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-white/10 text-cyan-400 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }
            return (
              <code className="block bg-surface-100 p-4 rounded-lg text-sm font-mono text-white/80 overflow-x-auto">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-4">{children}</pre>,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-axora-400 hover:text-axora-300 underline underline-offset-2"
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
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-white/10">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-medium text-white">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 text-sm text-white/70">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
