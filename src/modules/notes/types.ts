// Types for the Notes module

export type TagColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink'

export interface NoteTag {
  id: string
  label: string
  color: TagColor
}

export interface Note {
  id: string
  title: string
  content: string // Markdown content
  tags: string[] // Tag IDs
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NoteTemplate {
  id: string
  name: string
  icon: string // Emoji
  description: string
  defaultTitle: string
  content: string // Markdown template
}

// Color mapping for Tailwind classes
export const TAG_COLORS: Record<TagColor, { bg: string; text: string; border: string; dot: string }> = {
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-500',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
  },
  pink: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    dot: 'bg-pink-500',
  },
}
