# Scripts NPM à ajouter dans package.json

Ajouter ces scripts dans la section `"scripts"` du fichier `package.json` d'Axora :

```json
{
  "scripts": {
    // --- Alias pratiques ---
    "dev": "npm run start",
    "dev:clean": "npm run start:clean",
    
    // --- Maintenance ---
    "reset": "rimraf .erb/dll && rimraf node_modules/.cache",
    "reset:hard": "rimraf node_modules .erb/dll package-lock.json && npm install",
    "clean:ports": "lsof -ti :1212 | xargs kill -9 2>/dev/null || true",
    "clean:processes": "pkill -9 -f electron 2>/dev/null; pkill -9 -f webpack 2>/dev/null || true",
    "clean:all": "npm run clean:processes && npm run clean:ports && npm run reset",
    
    // --- Qualité ---
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    
    // --- Validation ---
    "validate": "npm run typecheck && npm run lint",
    "precommit": "npm run validate"
  }
}
```

## Utilisation

```bash
# Lancement standard
npm run dev

# Après crash ou problème
npm run dev:clean

# Reset complet après mise à jour Node
npm run reset:hard

# Avant commit
npm run validate
```
