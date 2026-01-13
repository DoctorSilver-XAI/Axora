import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, Save, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { registerModule } from '../core/ModuleRegistry'
import { ModuleDefinition } from '../core/types'
import { cn } from '@shared/utils/cn'

interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = 'axora_notes'

function NotesModule() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Load notes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotes(parsed.map((n: Note) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        })))
      } catch (e) {
        console.error('Failed to load notes:', e)
      }
    }
  }, [])

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Nouvelle note',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setNotes([newNote, ...notes])
    setSelectedNote(newNote)
    setIsEditing(true)
  }

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map((n) =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n
    ))
    if (selectedNote?.id === id) {
      setSelectedNote((prev) => prev ? { ...prev, ...updates, updatedAt: new Date() } : null)
    }
  }

  const deleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id))
    if (selectedNote?.id === id) {
      setSelectedNote(null)
    }
  }

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex gap-6 h-[500px] -mx-6">
      {/* Notes list */}
      <div className="w-72 flex flex-col bg-surface-50 border-r border-white/5">
        {/* Search & New */}
        <div className="p-4 space-y-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none"
            />
          </div>
          <button
            onClick={createNote}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-axora-500 text-white text-sm font-medium hover:bg-axora-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          <AnimatePresence>
            {filteredNotes.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8 px-4">
                {searchQuery ? 'Aucun résultat' : 'Aucune note. Créez-en une !'}
              </p>
            ) : (
              filteredNotes.map((note) => (
                <motion.button
                  key={note.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => {
                    setSelectedNote(note)
                    setIsEditing(false)
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-colors group',
                    'hover:bg-white/5',
                    selectedNote?.id === note.id && 'bg-white/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {note.title}
                      </p>
                      <p className="text-xs text-white/40 truncate mt-1">
                        {note.content || 'Note vide'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNote(note.id)
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30 mt-2">
                    {note.updatedAt.toLocaleDateString('fr-FR')}
                  </p>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col pr-6">
        {selectedNote ? (
          <>
            {/* Title */}
            <input
              type="text"
              value={selectedNote.title}
              onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
              className="text-xl font-semibold text-white bg-transparent border-none focus:outline-none mb-4"
              placeholder="Titre de la note"
            />

            {/* Content */}
            <textarea
              value={selectedNote.content}
              onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
              placeholder="Écrivez votre note ici..."
              className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none resize-none"
            />

            {/* Meta */}
            <div className="flex items-center justify-between mt-4 text-xs text-white/40">
              <span>
                Créé le {selectedNote.createdAt.toLocaleDateString('fr-FR')} à{' '}
                {selectedNote.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>
                Modifié le {selectedNote.updatedAt.toLocaleDateString('fr-FR')} à{' '}
                {selectedNote.updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40">
                Sélectionnez une note ou créez-en une nouvelle
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Module definition
const notesModule: ModuleDefinition = {
  id: 'notes',
  name: 'Notes',
  description: 'Prendre des notes rapides',
  version: '1.0.0',
  category: 'productivity',
  status: 'available',
  icon: FileText,
  keywords: ['notes', 'mémo', 'rappel', 'texte'],
  component: NotesModule,
}

// Register the module
registerModule(notesModule)

export default notesModule
