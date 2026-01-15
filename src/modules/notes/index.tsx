import { useState, useEffect, useCallback } from 'react'
import { FileText } from 'lucide-react'
import { registerModule } from '../core/ModuleRegistry'
import type { ModuleDefinition } from '../core/types'
import { NotesList } from './components/NotesList'
import { NoteEditor } from './components/NoteEditor'
import { TemplateModal } from './components/TemplateModal'
import type { Note, NoteTemplate } from './types'

const STORAGE_KEY = 'axora_notes'

// Migrate old notes format to new format (add tags and isFavorite)
interface LegacyNote {
  id: string
  title: string
  content: string
  createdAt: Date | string
  updatedAt: Date | string
  tags?: string[]
  isFavorite?: boolean
}

function migrateNote(note: LegacyNote): Note {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags || [],
    isFavorite: note.isFavorite || false,
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt),
  }
}

function NotesModule() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

  // Load notes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LegacyNote[]
        setNotes(parsed.map(migrateNote))
      } catch (e) {
        console.error('Failed to load notes:', e)
      }
    }
  }, [])

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const createNote = useCallback((template?: NoteTemplate) => {
    const now = new Date()
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: template?.defaultTitle || 'Nouvelle note',
      content: template?.content || '',
      tags: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedNote(newNote)
  }, [])

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const now = new Date()
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: now } : n))
    )
    setSelectedNote((prev) =>
      prev?.id === id ? { ...prev, ...updates, updatedAt: now } : prev
    )
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setSelectedNote((prev) => (prev?.id === id ? null : prev))
  }, [])

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note)
  }, [])

  const handleFilterTagToggle = useCallback((tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }, [])

  const handleNewNote = useCallback(() => {
    setIsTemplateModalOpen(true)
  }, [])

  const handleSelectTemplate = useCallback(
    (template: NoteTemplate) => {
      createNote(template)
    },
    [createNote]
  )

  return (
    <>
      <div className="flex gap-6 h-[500px] -mx-6">
        {/* Notes list sidebar */}
        <NotesList
          notes={notes}
          selectedNote={selectedNote}
          searchQuery={searchQuery}
          filterTags={filterTags}
          onSelectNote={handleSelectNote}
          onDeleteNote={deleteNote}
          onSearchChange={setSearchQuery}
          onFilterTagToggle={handleFilterTagToggle}
          onNewNote={handleNewNote}
        />

        {/* Note editor */}
        <div className="flex-1 flex flex-col pr-6">
          {selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onUpdate={(updates) => updateNote(selectedNote.id, updates)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40">Sélectionnez une note ou créez-en une nouvelle</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template selection modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  )
}

// Module definition
const notesModule: ModuleDefinition = {
  id: 'notes',
  name: 'Notes',
  description: 'Prendre des notes rapides avec Markdown',
  version: '2.0.0',
  category: 'productivity',
  status: 'available',
  icon: FileText,
  keywords: ['notes', 'mémo', 'rappel', 'texte', 'markdown', 'todo'],
  component: NotesModule,
}

// Register the module
registerModule(notesModule)

export default notesModule
