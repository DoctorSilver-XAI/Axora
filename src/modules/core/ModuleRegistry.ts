import { ModuleDefinition, ModuleCategory, ModuleStatus } from './types'

class ModuleRegistryClass {
  private modules: Map<string, ModuleDefinition> = new Map()

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module "${module.id}" is already registered. Overwriting.`)
    }
    this.modules.set(module.id, module)
  }

  unregister(moduleId: string): boolean {
    return this.modules.delete(moduleId)
  }

  get(moduleId: string): ModuleDefinition | undefined {
    return this.modules.get(moduleId)
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  getByCategory(category: ModuleCategory): ModuleDefinition[] {
    return this.getAll().filter((m) => m.category === category)
  }

  getByStatus(status: ModuleStatus): ModuleDefinition[] {
    return this.getAll().filter((m) => m.status === status)
  }

  getAvailable(): ModuleDefinition[] {
    return this.getAll().filter((m) => m.status === 'available' || m.status === 'beta')
  }

  search(query: string): ModuleDefinition[] {
    const normalizedQuery = query.toLowerCase()
    return this.getAll().filter((m) => {
      const searchText = [
        m.name,
        m.description,
        ...(m.keywords || []),
      ].join(' ').toLowerCase()
      return searchText.includes(normalizedQuery)
    })
  }

  isRegistered(moduleId: string): boolean {
    return this.modules.has(moduleId)
  }

  count(): number {
    return this.modules.size
  }
}

export const ModuleRegistry = new ModuleRegistryClass()

// Helper function to register a module
export function registerModule(module: ModuleDefinition): void {
  ModuleRegistry.register(module)
}
