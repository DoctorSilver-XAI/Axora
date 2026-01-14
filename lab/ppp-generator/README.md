# PPP Pharmacie

Application statique pour générer un Plan Personnalisé de Prévention (PPP) imprimable en A4 paysage. Le code du fichier unique a été découpé en CSS/JS modulaires pour préparer l'ajout des prochaines fonctionnalités (upload, notes, appel Claude, impression).

## Structure
- index.html
- css/
  - variables.css (couleurs, ombres, bg)
  - components.css (boutons, typographies, colonnes, footer...)
  - layout.css (structure, grille, responsive)
  - print.css (règles A4 paysage)
- js/
  - config.js (thèmes par tranche d'âge)
  - api/openai.js (appel GPT-4o)
  - components/
    - imageUpload.js (upload + preview)
    - notesInput.js (récupération des notes)
    - pppGenerator.js (logique UI + injection IA)
  - data/
    - prompts.js (prompt système)
    - templates.js (exemples par tranche d'âge)
  - main.js (point d'entrée)

## Utilisation
1. Ouvrir `index.html` dans un navigateur.
2. Ajouter une capture du dossier pharmaceutique et des notes d'entretien, puis cliquer sur "Générer le PPP" (clé OpenAI requise dans `js/config.js`).
3. Choisir la tranche d'âge pour appliquer le thème.
4. Bouton "Remplir l'exemple" charge des exemples par âge, "Effacer" nettoie les colonnes.
5. Les lignes sont éditables directement avant impression.

### Démarrage simple sans python -m http.server
- Prérequis : Node.js installé.
- Option 1 (double-clic) :
  - macOS : double-clique sur `launch-mac.command`.
  - Windows : double-clique sur `launch-windows.bat` (essaie Node, sinon bascule sur Python si Node absent).
- Option 2 (terminal) : lancer `node local-server.js` puis le navigateur s'ouvre automatiquement sur `http://localhost:4173`.

### Mode application desktop (Electron)
- Prérequis : Node.js.
- Installation des dépendances : `npm install`.
- Lancement en mode app : `npm start` (ouvre une fenêtre native avec l'app chargée).
- Build d'un exécutable : `npm run build:win` (ou `build:mac`/`build:linux`) nécessite `electron-builder` et les outils système adéquats.

## Prochaines étapes suggérées
- Gérer la persistance des images/notes en local (localStorage ou backend).
- Ajouter une gestion d'état/alertes plus fine qu'un simple `alert`.
- Brancher un sélecteur de modèle ou des paramètres (température, max tokens) via l'UI si besoin.

## Documentation interne
- `docs/architecture.md` : flux et modules.
- `docs/dom-map.md` : mapping des IDs/classes manipulés.
- `docs/ai-contract.md` : contrat d'appel OpenAI et format JSON.
- `docs/runbook.md` : modes de lancement et dépannage.
