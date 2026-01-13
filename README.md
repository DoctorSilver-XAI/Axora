# Axora

<div align="center">

**Assistant Intelligent pour Pharmacies d'Officine**

[![Node](https://img.shields.io/badge/Node-v22.21.1-green?logo=node.js)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-28+-blue?logo=electron)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://typescriptlang.org/)

[Fonctionnalités](#-fonctionnalités) • [Installation](#-installation) • [Développement](#-développement) • [Architecture](#-architecture)

</div>

---

## 🎯 Présentation

Axora est un **cockpit augmenté** non-intrusif pour pharmaciens. Il fonctionne comme un compagnon "Sidecar" aux côtés des logiciels de gestion officinale (LGO), offrant :

- 🧠 **PhiVision** : Analyse intelligente des écrans LGO via OCR et IA
- 💊 **PosoCalc** : Calculateur posologique de précision
- 📋 **PPP** : Générateur de Plans de Prévention Personnalisés
- 🤖 **Assistant** : Copilote IA avec contexte pharmaceutique

---

## 🚀 Installation

### Prérequis

| Outil | Version | Installation |
|-------|---------|--------------|
| Node.js | **v22.21.1** (obligatoire) | `nvm install 22` |
| npm | 10+ | Inclus avec Node |
| Git | 2.x | [git-scm.com](https://git-scm.com) |

### Quick Start

```bash
# 1. Cloner le repo
git clone https://github.com/DoctorSilver-XAI/Axora.git
cd Axora

# 2. Activer Node 22 (OBLIGATOIRE)
nvm use 22

# 3. Installer les dépendances
npm install

# 4. Lancer l'application
npm start
```

> ⚠️ **Important** : Node v16/v20 causent des freezes silencieux. Toujours utiliser v22+.

---

## 🔧 Développement

### Commandes Principales

| Commande | Description |
|----------|-------------|
| `npm start` | Lancer en mode développement |
| `npm run start:clean` | Lancer avec reset du cache DLL |
| `npm run package` | Construire le package de production |
| `npm run rebuild` | Recompiler les modules natifs |

### Résolution de Problèmes

```bash
# Port 1212 bloqué
lsof -ti :1212 | xargs kill -9 2>/dev/null

# Processus zombies
pkill -9 -f electron; pkill -9 -f webpack

# Reset complet
rm -rf .erb/dll node_modules/.cache && npm start
```

### Temps de Build Normaux

| Phase | Durée | Notes |
|-------|-------|-------|
| 10% building | 2-5 min | Mapping dépendances (normal) |
| 38% modules | 1-2 min | Traitement modules |
| 100% + DLL | 1-3 min | Première fois après clean |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ELECTRON                                │
├─────────────────────┬───────────────────────────────────────┤
│   Main Process      │          Renderer Process             │
│   (Node.js)         │          (React + TypeScript)         │
├─────────────────────┼───────────────────────────────────────┤
│ • DualModeController│  • Hub (interface complète)           │
│ • PhiVisionService  │  • Sidecar (mode compact)             │
│ • IPC Handlers      │  • Components (UI réutilisables)      │
│ • Providers (OCR,   │  • Services (Auth, AI, Settings)      │
│   LLM, Storage)     │  • Pages (/assistant, /ppp, /dosage)  │
└─────────────────────┴───────────────────────────────────────┘
           │                          ▲
           │      preload.ts          │
           └──────────────────────────┘
                  (IPC Bridge)
```

### Structure des Dossiers

```
src/
├── main/               # Process Electron principal
│   ├── services/       # Services backend (PhiVision, etc.)
│   └── DualModeController.ts
├── renderer/           # Interface React
│   ├── components/     # Composants UI
│   ├── pages/          # Routes
│   └── services/       # Contextes et managers
└── shared/             # Types partagés
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Contexte pour agents IA |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Guide de contribution |
| [CHANGELOG.md](./CHANGELOG.md) | Historique des versions |

---

## 🤖 Pour les Agents IA

Ce projet inclut un fichier `CLAUDE.md` qui fournit :
- Stack technique et commandes essentielles
- Patterns de code à suivre
- Pièges à éviter (lifecycle Electron, IPC, etc.)
- Contexte métier pharmaceutique

---

## 📄 Licence

Propriétaire - PhiGenix © 2026
