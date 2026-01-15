import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { MarkdownPreview } from './MarkdownPreview'
import { TagSelector } from './TagSelector'
import type { Note } from '../types'

interface NoteEditorProps {
  note: Note
  onUpdate: (updates: Partial<Note>) => void
}

export function NoteEditor({ note, onUpdate }: NoteEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Insert markdown syntax at cursor position
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = note.content.substring(start, end)
      const textToInsert = selectedText || placeholder

      const newContent =
        note.content.substring(0, start) +
        prefix +
        textToInsert +
        suffix +
        note.content.substring(end)

      onUpdate({ content: newContent })

      // Restore cursor position after update
      setTimeout(() => {
        textarea.focus()
        const newPosition = start + prefix.length + textToInsert.length
        textarea.setSelectionRange(
          selectedText ? newPosition + suffix.length : start + prefix.length,
          selectedText ? newPosition + suffix.length : start + prefix.length + placeholder.length
        )
      }, 0)
    },
    [note.content, onUpdate]
  )

  const toolbarActions = [
    { icon: Bold, label: 'Gras', action: () => insertMarkdown('**', '**', 'texte') },
    { icon: Italic, label: 'Italique', action: () => insertMarkdown('*', '*', 'texte') },
    { type: 'separator' },
    { icon: Heading1, label: 'Titre 1', action: () => insertMarkdown('\n## ', '\n', 'Titre') },
    { icon: Heading2, label: 'Titre 2', action: () => insertMarkdown('\n### ', '\n', 'Titre') },
    { type: 'separator' },
    { icon: List, label: 'Liste', action: () => insertMarkdown('\n- ', '', 'élément') },
    { icon: ListOrdered, label: 'Liste numérotée', action: () => insertMarkdown('\n1. ', '', 'élément') },
    { icon: CheckSquare, label: 'Checkbox', action: () => insertMarkdown('\n- [ ] ', '', 'tâche') },
    { type: 'separator' },
    { icon: Link2, label: 'Lien', action: () => insertMarkdown('[', '](url)', 'texte du lien') },
  ]

  const handleTagToggle = (tagId: string) => {
    const newTags = note.tags.includes(tagId)
      ? note.tags.filter((t) => t !== tagId)
      : [...note.tags, tagId]
    onUpdate({ tags: newTags })
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header with title and actions */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 text-xl font-semibold text-white bg-transparent border-none focus:outline-none"
          placeholder="Titre de la note"
        />
        <motion.button
          onClick={() => onUpdate({ isFavorite: !note.isFavorite })}
          className={cn(
            'p-2 rounded-lg transition-colors',
            note.isFavorite
              ? 'text-yellow-400 bg-yellow-500/20'
              : 'text-white/40 hover:text-yellow-400 hover:bg-white/5'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={note.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className={cn('w-5 h-5', note.isFavorite && 'fill-current')} />
        </motion.button>
        <motion.button
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            showPreview
              ? 'text-axora-400 bg-axora-500/20'
              : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={showPreview ? 'Éditer' : 'Aperçu'}
        >
          {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </motion.button>
      </div>

      {/* Toolbar */}
      <AnimatePresence>
        {!showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 p-2 mb-3 rounded-lg bg-white/5 border border-white/10"
          >
            {toolbarActions.map((action, index) =>
              action.type === 'separator' ? (
                <div key={index} className="w-px h-5 bg-white/10 mx-1" />
              ) : (
                <motion.button
                  key={index}
                  onClick={action.action}
                  className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title={action.label}
                >
                  {action.icon && <action.icon className="w-4 h-4" />}
                </motion.button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor / Preview */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {showPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-4 rounded-xl bg-white/5 border border-white/10 overflow-auto"
            >
              <MarkdownPreview content={note.content} />
            </motion.div>
          ) : (
            <motion.textarea
              key="editor"
              ref={textareaRef}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              value={note.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Écrivez votre note en Markdown..."
              className="absolute inset-0 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none resize-none font-mono text-sm scrollbar-thin"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Tags */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 mb-2">Tags</p>
        <TagSelector selectedTags={note.tags} onTagToggle={handleTagToggle} mode="edit" size="sm" />
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between mt-4 text-xs text-white/40">
        <span>
          Créé le {note.createdAt.toLocaleDateString('fr-FR')} à{' '}
          {note.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span>
          Modifié le {note.updatedAt.toLocaleDateString('fr-FR')} à{' '}
          {note.updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
