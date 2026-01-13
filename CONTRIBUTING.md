# Contribuer à Axora

Merci de votre intérêt pour Axora ! Ce guide vous aidera à contribuer efficacement.

## 🛠️ Setup Environnement

### 1. Prérequis

```bash
# Node v22 obligatoire
nvm install 22
nvm use 22

# Vérifier
node -v  # v22.x.x
```

### 2. Installation

```bash
git clone https://github.com/DoctorSilver-XAI/Axora.git
cd Axora
npm install
npm start
```

---

## 📋 Workflow Git

### Branches

| Branch | Usage |
|--------|-------|
| `main` | Production stable |
| `feat/*` | Nouvelles fonctionnalités |
| `fix/*` | Corrections de bugs |
| `refactor/*` | Refactoring |

### Commits Conventionnels

```bash
# Format
<type>: <description>

# Types
feat:     Nouvelle fonctionnalité
fix:      Correction de bug
refactor: Refactoring (pas de changement fonctionnel)
docs:     Documentation
chore:    Maintenance (deps, configs)
test:     Tests
```

**Exemples :**
```bash
feat: add PhiVision enrichment agents
fix: resolve port 1212 conflict on restart
refactor: extract OCR provider to separate class
docs: update README with architecture diagram
```

---

## ✅ Avant de Commit

```bash
# 1. Vérifier les types
npx tsc --noEmit

# 2. Tester le lancement
npm start

# 3. Formater (si Prettier configuré)
npm run format
```

---

## 🏗️ Structure à Respecter

### Main Process (`src/main/`)
- Services en singleton
- IPC handlers dans `whenReady()`
- Pas d'accès Electron au top-level

### Renderer (`src/renderer/`)
- Composants fonctionnels + hooks
- Tailwind pour le styling
- Context pour state global

---

## ❓ Questions

Ouvrez une issue ou contactez l'équipe PhiGenix.
