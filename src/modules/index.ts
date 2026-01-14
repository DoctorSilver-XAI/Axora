// Import all modules to trigger their registration
import './posology'
import './notes'
import './ppp'

// Re-export core utilities
export { ModuleRegistry, registerModule } from './core/ModuleRegistry'
export { ModuleLoaderProvider, ModuleViewer, useModuleLoader, useModuleContext } from './core/ModuleLoader'
export type { ModuleDefinition, ModuleManifest, ModuleCategory, ModuleStatus, ModuleContext } from './core/types'
export { CATEGORY_LABELS } from './core/types'
