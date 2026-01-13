import { ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'

export type ModuleCategory = 'tools' | 'documents' | 'trod' | 'reference' | 'productivity'

export type ModuleStatus = 'available' | 'coming_soon' | 'beta' | 'disabled'

export interface ModuleManifest {
  id: string
  name: string
  description: string
  version: string
  category: ModuleCategory
  status: ModuleStatus
  author?: string
  icon: LucideIcon
  keywords?: string[]
  permissions?: string[]
}

export interface ModuleDefinition extends ModuleManifest {
  component: ComponentType
}

export interface ModuleContext {
  moduleId: string
  close: () => void
  // Future: access to shared services
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  tools: 'Outils',
  documents: 'Documents',
  trod: 'TROD',
  reference: 'Référence',
  productivity: 'Productivité',
}
