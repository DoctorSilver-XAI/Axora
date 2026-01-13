# CLAUDE.md - Axora AI Context

> Ce fichier fournit le contexte nécessaire aux agents IA (Claude, Antigravity, Cursor, GitHub Copilot) pour comprendre et travailler efficacement sur le projet Axora.

## 🎯 Résumé du Projet

**Axora** est un assistant intelligent pour pharmacies d'officine, fonctionnant comme un "cockpit augmenté" non-intrusif (Sidecar) aux côtés des logiciels de gestion officinale (LGO).

### Stack Technique
- **Framework** : Electron 28+ (Main/Renderer/Preload architecture)
- **Frontend** : React 19 + TypeScript + Tailwind CSS + Framer Motion
- **Backend** : Node.js dans le Main Process
- **IA** : Mistral (OCR, Large), OpenAI (fallback), Ollama (local)
- **Base de données** : IndexedDB (local) + Supabase (cloud)
- **Build** : Webpack 5, Electron React Boilerplate (ERB)

---

## 🚀 Commandes Essentielles

```bash
# Lancement développement (TOUJOURS utiliser Node v22+)
nvm use 22 && npm start

# Lancement propre (recommandé après problèmes)
npm run start:clean

# Si port 1212 bloqué
lsof -ti :1212 | xargs kill -9 2>/dev/null && npm start

# Reset complet (après changement de dépendances majeur)
rm -rf .erb/dll node_modules/.cache && npm start

# Type-check sans build
npx tsc --noEmit
```

---

## 📁 Structure Clé

```
src/
├── main/                    # Process Electron principal
│   ├── main.ts             # Point d'entrée, lifecycle Electron
│   ├── preload.ts          # Bridge IPC sécurisé
│   ├── DualModeController.ts   # Gestion fenêtres Hub/Sidecar
│   └── services/
│       └── phivision/      # 🧠 Pipeline vision IA
│           ├── PhiVisionService.ts  # Orchestrateur central
│           ├── providers/           # OCR, LLM, Storage
│           └── enrichment/          # Agents d'enrichissement
│
├── renderer/               # UI React
│   ├── App.tsx            # Router principal
│   ├── components/        # Composants réutilisables
│   ├── pages/             # Routes (/assistant, /ppp, /dosage, etc.)
│   └── services/          # Contexts React, AI managers
│
└── shared/                # Types partagés Main/Renderer
```

---

## ⚠️ Pièges à Éviter

### 1. Version Node
```bash
# TOUJOURS vérifier avant de travailler
node -v  # Doit être v22.x

# Si v16 ou v20, le build va freeze silencieusement
nvm use 22
```

### 2. Lifecycle Electron
```typescript
// ❌ MAUVAIS : Accès app.getPath avant ready
const dataDir = app.getPath('userData');  // Crash!

// ✅ BON : Utiliser un getter
get paths() { return { dataDir: app.getPath('userData') }; }
```

### 3. IPC Registration
```typescript
// ❌ MAUVAIS : Registration au top-level
ipcMain.handle('channel', handler);  // Peut être undefined

// ✅ BON : Dans app.whenReady()
app.whenReady().then(() => {
  ipcMain.handle('channel', handler);
});
```

### 4. Imports Webpack
```typescript
// ❌ Problématique dans certains contextes bundlés
const { app } = require('electron');  // Peut retourner un string!

// ✅ Toujours utiliser ESM imports
import { app } from 'electron';
```

---

## 🔧 Patterns de Code

### Composant React (Standard)
```tsx
interface Props {
  // Props typées obligatoires
}

export function ComponentName({ prop }: Props) {
  // Hooks en premier
  const [state, setState] = useState();
  
  // Handlers
  const handleAction = useCallback(() => {}, []);
  
  // Render
  return <div className="...">...</div>;
}
```

### Service Main Process
```typescript
// Toujours singleton, lazy initialization
class ServiceName {
  private static instance: ServiceName;
  
  static getInstance() {
    if (!this.instance) this.instance = new ServiceName();
    return this.instance;
  }
}
```

### IPC Handler
```typescript
// Dans registerHandlers() appelé après app.whenReady()
ipcMain.handle('phivision:capture', async (_, options) => {
  try {
    return await PhiVisionService.capture(options);
  } catch (error) {
    console.error('[PhiVision] Error:', error);
    throw error;  // Propagé au renderer
  }
});
```

---

## 🏥 Contexte Métier (Pharmacie)

### Terminologie
- **LGO** : Logiciel de Gestion Officinale (Pharmagest LGPI, Winpharma, etc.)
- **DCI** : Dénomination Commune Internationale (nom générique du médicament)
- **PhiVision** : Notre système de vision par IA pour analyser les écrans LGO
- **Sidecar** : Interface compacte flottante à côté du LGO
- **Hub** : Interface complète avec tous les outils

### Modules Fonctionnels
1. **PhiVision** : Capture écran → OCR → Analyse clinique
2. **PPP** : Plan de Prévention Personnalisé (document A4)
3. **PosoCalc** : Calculateur posologique pédiatrique/adulte
4. **Assistant** : Chat IA avec contexte pharmaceutique

---

## 📋 Checklist Avant Modification

- [ ] Node v22+ actif (`node -v`)
- [ ] Comprendre si c'est Main ou Renderer process
- [ ] Vérifier les imports Electron (lifecycle-aware)
- [ ] Tester avec `npx tsc --noEmit` avant commit
- [ ] Si modif IPC : vérifier registration dans `whenReady()`

---

## 🔗 Fichiers Critiques

| Fichier | Rôle | Attention |
|---------|------|-----------|
| `main.ts` | Entry point Electron | Lifecycle-sensitive |
| `preload.ts` | Bridge IPC | Context isolation |
| `DualModeController.ts` | Fenêtres Hub/Sidecar | Opacity, bounds |
| `PhiVisionService.ts` | Orchestrateur IA | Service central |
| `webpack.config.main.dev.ts` | Build main process | Externals: electron |
