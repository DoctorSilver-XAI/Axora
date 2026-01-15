import type { NoteTag } from '../types'

// Default tags for pharmacy work
export const DEFAULT_TAGS: NoteTag[] = [
  {
    id: 'urgent',
    label: 'Urgent',
    color: 'red',
  },
  {
    id: 'patient',
    label: 'Patient',
    color: 'green',
  },
  {
    id: 'formation',
    label: 'Formation',
    color: 'blue',
  },
  {
    id: 'admin',
    label: 'Admin',
    color: 'yellow',
  },
  {
    id: 'commande',
    label: 'Commande',
    color: 'purple',
  },
  {
    id: 'garde',
    label: 'Garde',
    color: 'orange',
  },
]

// Helper to get a tag by ID
export function getTagById(id: string): NoteTag | undefined {
  return DEFAULT_TAGS.find((tag) => tag.id === id)
}

// Helper to get multiple tags by IDs
export function getTagsByIds(ids: string[]): NoteTag[] {
  return ids.map((id) => getTagById(id)).filter((tag): tag is NoteTag => tag !== undefined)
}
