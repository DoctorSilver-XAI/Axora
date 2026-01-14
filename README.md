# Axora

[![GitHub](https://img.shields.io/badge/GitHub-DoctorSilver--XAI%2FAxora-blue?logo=github)](https://github.com/DoctorSilver-XAI/Axora)

Assistant intelligent pour pharmaciens d'officine.

Axora est une application desktop qui combine capture d'écran intelligente (PhiVision), assistant IA conversationnel, et modules métier spécialisés pour optimiser le quotidien des pharmaciens.

## Screenshots

<p align="center">
  <img src="./assets/dashboard.png" alt="Dashboard" width="45%">
  <img src="./assets/phivision-lab.png" alt="PhiVision Lab" width="45%">
</p>

## Fonctionnalités

### PhiVision
Capture et analyse instantanée de documents médicaux :
- **Capture écran** via raccourci global `Cmd+Shift+P`
- **OCR intelligent** avec Mistral Vision API
- **Extraction automatique** : médicaments, posologies, instructions
- **Historique** des captures avec favoris et recherche

### Assistant IA
Chat conversationnel multi-provider :
- **Mistral**, **OpenAI**, ou **Local** (Ollama/LM Studio)
- **Dual storage** : conversations cloud (Supabase) ou locales (SQLite)
- Contextes spécialisés : interactions médicamenteuses, posologie, conseil patient

### Dynamic Island
Mini-fenêtre flottante toujours visible :
- Accès rapide à PhiVision
- Indicateur de statut en temps réel
- Ouverture du Hub en un clic

### Nexus
Place de marché de modules extensibles :
- Calculateur de posologie
- Notes rapides
- Modules à venir : TROD, fiches médicaments...

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Setup

```bash
# Cloner le repository
git clone https://github.com/DoctorSilver-XAI/Axora.git
cd Axora

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
```

### Configuration

Éditer le fichier `.env` :

```env
# Supabase (authentification et stockage cloud)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key

# AI Providers
VITE_MISTRAL_API_KEY=votre-clé-mistral
VITE_OPENAI_API_KEY=votre-clé-openai        # Optionnel

# Local AI (Ollama/LM Studio)
VITE_LOCAL_AI_ENDPOINT=http://localhost:11434
```

## Développement

```bash
# Lancer en mode développement (hot reload)
npm run dev

# Vérifier le code
npm run lint          # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript
```

## Build

```bash
# Build de production
npm run build

# Packager l'application
npm run dist:mac      # macOS (.dmg)
npm run dist:win      # Windows (.exe)
```

## Architecture

```
axora/
├── electron/
│   ├── main/           # Process principal Electron
│   │   ├── windows/    # WindowManager, HubWindow, DynamicIslandWindow
│   │   ├── ipc/        # Canaux et handlers IPC
│   │   ├── database/   # SQLite local (sql.js)
│   │   └── services/   # GlobalShortcuts
│   └── preload/        # Scripts preload (API window.axora)
├── src/
│   ├── apps/
│   │   ├── hub/        # Application principale (React Router)
│   │   └── island/     # Mini-fenêtre flottante
│   ├── features/
│   │   ├── assistant/  # Chat IA
│   │   └── phivision/  # Capture + OCR
│   ├── modules/        # Plugins extensibles (Nexus)
│   └── shared/         # Composants, contexts, utils partagés
└── supabase/
    └── migrations/     # Schéma de base de données
```

### Dual-Window

Axora utilise deux fenêtres Electron :

| Fenêtre | Description | Fichier HTML |
|---------|-------------|--------------|
| **Dynamic Island** | Toujours visible, flottante | `island.html` |
| **Hub** | Application principale | `index.html` |

Les fenêtres communiquent via IPC à travers le `WindowManager`.

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Cmd+Shift+P` | Déclencher PhiVision (capture écran) |
| `Cmd+Shift+H` | Ouvrir/fermer le Hub |

## Stack technique

- **Electron** + **electron-vite** - Application desktop
- **React 18** + **TypeScript** - Interface utilisateur
- **Tailwind CSS** + **Framer Motion** - Styling et animations
- **Supabase** - Auth, base de données, stockage
- **sql.js** - SQLite embarqué pour mode local
- **Zustand** - State management
- **Lucide React** - Icônes

## Licence

MIT

---

Développé par Pierre
