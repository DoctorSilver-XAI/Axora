# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start Electron in dev mode with hot reload

# Build & Package
npm run build            # Build the app
npm run dist:mac         # Package for macOS
npm run dist:win         # Package for Windows

# Code Quality
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run typecheck        # TypeScript check (renderer)
npm run typecheck:node   # TypeScript check (main/preload)
```

## Architecture

**Axora** est une application Electron pour pharmaciens d'officine, avec une architecture dual-window :

### Fenêtres
- **Dynamic Island** (`src/apps/island/`) - Mini-fenêtre flottante toujours visible en haut de l'écran (style macOS). Point d'entrée : `island.html`
- **Hub** (`src/apps/hub/`) - Fenêtre principale avec navigation, pages et modules. Point d'entrée : `index.html`

### Process Electron
- **Main** (`electron/main/`) - Process principal
  - `index.ts` : Point d'entrée, initialise `WindowManager` et `GlobalShortcuts`
  - `windows/WindowManager.ts` : Singleton gérant les deux fenêtres et leur communication
  - `ipc/channels.ts` : Constantes des canaux IPC
  - `ipc/handlers.ts` : Handlers IPC
  - `database/SQLiteDatabase.ts` : SQLite via sql.js pour stockage local
- **Preload** (`electron/preload/`) - Scripts preload exposant l'API `window.axora` au renderer
  - `index.ts` : Pour le Hub
  - `island.ts` : Pour l'Island

### Features (`src/features/`)
Structure type d'une feature :
```
src/features/ma-feature/
├── components/     # Composants React spécifiques
├── services/       # Logique métier (API calls, transformations)
└── types.ts        # Types TypeScript
```

Features existantes :
- **PhiVision** - Capture d'écran + OCR + analyse AI (Mistral Vision)
- **Assistant** - Chat AI multi-provider avec dual storage (cloud/local)

### Modules (`src/modules/`)
Système de plugins avec registry dynamique. Chaque module s'auto-enregistre à l'import.

### Stockage
- **Supabase** : Auth, conversations cloud, captures PhiVision
- **SQLite local** : Conversations en mode local (via sql.js)

## Path Aliases

```typescript
@/         -> src/
@apps/     -> src/apps/
@features/ -> src/features/
@shared/   -> src/shared/
@modules/  -> src/modules/
@config/   -> config/
@main/     -> electron/main/
```

## Raccourcis Globaux

- `Cmd+Shift+P` / `Ctrl+Shift+P` : Déclenche PhiVision (capture écran)
- `Cmd+Shift+H` / `Ctrl+Shift+H` : Toggle le Hub

## Variables d'environnement

Copier `.env.example` vers `.env` et configurer :
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` : Credentials Supabase
- `VITE_MISTRAL_API_KEY` : Pour PhiVision OCR et AI
- `VITE_OPENAI_API_KEY` : Provider OpenAI optionnel
- `VITE_LOCAL_AI_ENDPOINT` : Endpoint Ollama/LM Studio local

---

## Conventions

### Nommage des fichiers
- **Composants** : PascalCase → `Sidebar.tsx`, `NewConversationModal.tsx`
- **Services** : camelCase → `ConversationService.ts`, `OCRService.ts`
- **Types** : `types.ts` dans chaque feature/module

### Exports
- Composants : export nommé direct `export function MonComposant() {}`
- Modules : `registerModule()` + `export default`
- Services : objet singleton `export const MonService = { ... }`

### Utilitaire `cn()`
Combiner les classes Tailwind sans conflits (`src/shared/utils/cn.ts`) :
```typescript
import { cn } from '@shared/utils/cn'

className={cn(
  'base-classes',
  condition && 'conditional-classes',
  isActive ? 'active-classes' : 'inactive-classes'
)}
```

---

## Workflows

### Créer un nouveau Module

1. Créer `src/modules/mon-module/index.tsx` :
```typescript
import { ModuleDefinition, registerModule } from '../core/ModuleRegistry'
import { MonIcon } from 'lucide-react'

function MonModuleComponent() {
  return <div>Contenu du module</div>
}

const monModule: ModuleDefinition = {
  id: 'mon-module',
  name: 'Mon Module',
  description: 'Description courte',
  version: '1.0.0',
  category: 'tools',        // tools | documents | trod | reference | productivity
  status: 'available',      // available | coming_soon | beta | disabled
  icon: MonIcon,
  keywords: ['mot', 'clé'],
  component: MonModuleComponent,
}

registerModule(monModule)
export default monModule
```

2. Importer dans `src/modules/index.ts` :
```typescript
import './mon-module'
```

### Ajouter un canal IPC

**1. Déclarer le canal** (`electron/main/ipc/channels.ts`) :
```typescript
MON_SERVICE: {
  ACTION: 'mon-service:action',
  RESULT: 'mon-service:result',
}
```

**2. Implémenter le handler** (`electron/main/ipc/handlers.ts`) :
```typescript
// Avec réponse (invoke)
ipcMain.handle(IPC_CHANNELS.MON_SERVICE.ACTION, async (_event, data) => {
  return { success: true, result: data }
})

// Sans réponse (listener)
ipcMain.on(IPC_CHANNELS.MON_SERVICE.ACTION, (_event, data) => {
  windowManager.broadcast(IPC_CHANNELS.MON_SERVICE.RESULT, data)
})
```

**3. Exposer l'API** (`electron/preload/index.ts`) :
```typescript
monService: {
  action: (data: string) => ipcRenderer.invoke(IPC_CHANNELS.MON_SERVICE.ACTION, data),
  onResult: (callback: (result: unknown) => void) => {
    const handler = (_: Electron.IpcRendererEvent, result: unknown) => callback(result)
    ipcRenderer.on(IPC_CHANNELS.MON_SERVICE.RESULT, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MON_SERVICE.RESULT, handler)
  },
}
```

**4. Utiliser dans React** :
```typescript
const result = await window.axora.monService.action('data')

useEffect(() => {
  const unsubscribe = window.axora.monService.onResult((result) => {
    console.log(result)
  })
  return unsubscribe
}, [])
```

### Ajouter un Context global

Pattern utilisé pour `AuthContext`, `PhiVisionContext` :
```typescript
// src/shared/contexts/MonContext.tsx
interface MonState { /* état */ }
interface MonContextType extends MonState { /* + actions */ }

const MonContext = createContext<MonContextType | undefined>(undefined)

export function MonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MonState>({ ... })

  // Actions
  const monAction = useCallback(async () => { ... }, [])

  return (
    <MonContext.Provider value={{ ...state, monAction }}>
      {children}
    </MonContext.Provider>
  )
}

export function useMon() {
  const context = useContext(MonContext)
  if (!context) throw new Error('useMon must be used within MonProvider')
  return context
}
```

---

## Communication Island ↔ Hub

### Broadcast (toutes les fenêtres)
```typescript
windowManager.broadcast(IPC_CHANNELS.MON_SERVICE.RESULT, data)
```

### SendTo (fenêtre spécifique)
```typescript
windowManager.sendTo('hub', IPC_CHANNELS.MON_SERVICE.RESULT, data)
windowManager.sendTo('island', IPC_CHANNELS.MON_SERVICE.STATUS, status)
```

### Pending Result Pattern
Quand Island capture une image mais Hub n'est pas ouvert :
1. `WindowManager.setPendingPhiVisionResult(image)` stocke le résultat
2. À l'ouverture du Hub, `sendPendingPhiVisionResult()` envoie automatiquement
3. Hub vérifie via `window.axora.phivision.getPending()` au montage

---

## Conventions UI

### Palette Tailwind
- **Principal** : `bg-axora-500`, `text-axora-400`
- **Surfaces** : `bg-surface-50` (sidebar), `bg-surface-100` (cards)
- **Texte** : `text-white`, `text-white/60`, `text-white/40`
- **Borders** : `border-white/5`, `border-white/10`

### Glass Effects
```typescript
className="bg-surface-50/50 backdrop-blur-xl border border-white/5"
```

### Animations Framer Motion

**Modal** :
```typescript
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div  // Backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50"
      />
      <motion.div  // Content
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {/* ... */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Liste avec stagger** :
```typescript
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.05 }}
  />
))}
```
