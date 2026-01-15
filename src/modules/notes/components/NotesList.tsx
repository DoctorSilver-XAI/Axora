import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Trash2, Star, ChevronDown } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { TagSelector, TagDots } from './TagSelector'
import type { Note } from '../types'

interface NotesListProps {
  notes: Note[]
  selectedNote: Note | null
  searchQuery: string
  filterTags: string[]
  onSelectNote: (note: Note) => void
  onDeleteNote: (id: string) => void
  onSearchChange: (query: string) => void
  onFilterTagToggle: (tagId: string) => void
  onNewNote: () => void
}

export function NotesList({
  notes,
  selectedNote,
  searchQuery,
  filterTags,
  onSelectNote,
  onDeleteNote,
  onSearchChange,
  onFilterTagToggle,
  onNewNote,
}: NotesListProps) {
  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = notes

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
      )
    }

    // Filter by tags
    if (filterTags.length > 0) {
      result = result.filter((n) => filterTags.some((tagId) => n.tags.includes(tagId)))
    }

    // Sort: favorites first, then by updatedAt
    return result.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
  }, [notes, searchQuery, filterTags])

  return (
    <div className="w-72 flex flex-col bg-surface-50 border-r border-white/5">
      {/* Search */}
      <div className="p-4 space-y-3 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:border-axora-500/50 focus:outline-none"
          />
        </div>

        {/* Filter tags */}
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
            Filtrer par tag
          </summary>
          <div className="mt-2">
            <TagSelector
              selectedTags={filterTags}
              onTagToggle={onFilterTagToggle}
              mode="filter"
              size="sm"
            />
          </div>
        </details>

        {/* New note button */}
        <button
          onClick={onNewNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-axora-500 text-white text-sm font-medium hover:bg-axora-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle note
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto p-2 space-y-1 scrollbar-thin">
        <AnimatePresence>
          {filteredNotes.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-white/40 text-center py-8 px-4"
            >
              {searchQuery || filterTags.length > 0 ? 'Aucun résultat' : 'Aucune note'}
            </motion.p>
          ) : (
            filteredNotes.map((note, index) => (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onSelectNote(note)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors group',
                  'hover:bg-white/5',
                  selectedNote?.id === note.id && 'bg-white/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {note.isFavorite && (
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium text-white truncate">{note.title}</p>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-1">
                      {note.content
                        ? note.content.replace(/[#*\-\[\]]/g, '').substring(0, 50)
                        : 'Note vide'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteNote(note.id)
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <TagDots tagIds={note.tags} max={3} />
                  <p className="text-[10px] text-white/30">
                    {note.updatedAt.toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
