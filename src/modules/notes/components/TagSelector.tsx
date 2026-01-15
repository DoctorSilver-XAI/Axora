import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import { DEFAULT_TAGS } from '../constants/tags'
import { TAG_COLORS } from '../types'
import type { NoteTag } from '../types'

interface TagSelectorProps {
  selectedTags: string[]
  onTagToggle: (tagId: string) => void
  mode?: 'filter' | 'edit'
  size?: 'sm' | 'md'
}

export function TagSelector({
  selectedTags,
  onTagToggle,
  mode = 'edit',
  size = 'md',
}: TagSelectorProps) {
  const isSelected = (tagId: string) => selectedTags.includes(tagId)

  return (
    <div className="flex flex-wrap gap-2">
      {DEFAULT_TAGS.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          selected={isSelected(tag.id)}
          onClick={() => onTagToggle(tag.id)}
          mode={mode}
          size={size}
        />
      ))}
    </div>
  )
}

interface TagChipProps {
  tag: NoteTag
  selected: boolean
  onClick: () => void
  mode: 'filter' | 'edit'
  size: 'sm' | 'md'
  showRemove?: boolean
}

export function TagChip({ tag, selected, onClick, mode, size, showRemove = false }: TagChipProps) {
  const colors = TAG_COLORS[tag.color]

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        selected
          ? cn(colors.bg, colors.text, colors.border)
          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
      <span>{tag.label}</span>
      {mode === 'edit' && selected && showRemove && (
        <X className="w-3 h-3 ml-0.5" />
      )}
    </motion.button>
  )
}

// Small dot indicator for note list items
interface TagDotsProps {
  tagIds: string[]
  max?: number
}

export function TagDots({ tagIds, max = 3 }: TagDotsProps) {
  const visibleTags = tagIds.slice(0, max)
  const extraCount = tagIds.length - max

  return (
    <div className="flex items-center gap-1">
      {visibleTags.map((tagId) => {
        const tag = DEFAULT_TAGS.find((t) => t.id === tagId)
        if (!tag) return null
        const colors = TAG_COLORS[tag.color]
        return (
          <span
            key={tagId}
            className={cn('w-2 h-2 rounded-full', colors.dot)}
            title={tag.label}
          />
        )
      })}
      {extraCount > 0 && (
        <span className="text-[10px] text-white/40">+{extraCount}</span>
      )}
    </div>
  )
}
