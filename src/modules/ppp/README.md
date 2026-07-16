# Module PPP — Plan Personnalisé de Prévention

Génère un **bilan de prévention** personnalisé, imprimable au format A4 paysage, à partir
d'un dossier pharmaceutique (capture d'écran) et/ou de notes d'entretien, via l'IA (OpenAI GPT-4o).

Le document produit reprend la trame officielle du bilan de prévention (« Mon Bilan Prévention ») :
priorités en santé, freins, conseils, ressources, modalités de suivi — le tout éditable en ligne
avant impression et partageable avec le médecin traitant.

> Point d'entrée du module : [`index.tsx`](./index.tsx) — s'auto-enregistre dans le `ModuleRegistry`
> à l'import (voir `src/modules/index.ts`). Catégorie `tools`, statut `available`.

---

## Flux de données

```
┌─────────────────────────────────────────────────────────────────────┐
│ PPPGenerator.tsx  (orchestrateur — tout l'état du formulaire)         │
│                                                                       │
│  Saisie :  patient · pharmacien · tranche d'âge · image DP · notes    │
│  Aides   : détection d'âge auto · thématiques cliquables · import audio│
└───────────────────────────────┬───────────────────────────────────────┘
                                │  PPPGenerationRequest
                                ▼
                   PPPService.generatePPP()
                                │   → OpenAI GPT-4o (vision) + PPP_SYSTEM_PROMPT
                                ▼
                   JSON strict { insights, priorities, freins,
                                 conseils, ressources, suivi }
                                │
                                ▼
                   PPPData  ───────────────►  PPPDocumentV2.tsx
                                │                (document A4 éditable inline)
                                │                     │
                    PPPStorageService.create()        ├─► Impression A4 paysage
                    (Supabase, best-effort)           │    (IPC ppp:print)
                                                       └─► Édition contentEditable
```

Le champ `insights` (« Synthèse clinique ») est généré par l'IA **mais n'est pas affiché
au patient** — il documente le raisonnement clinique (voir `types.ts`).

---

## Rôle de chaque fichier

### Entrée & types
| Fichier | Rôle |
|---|---|
| `index.tsx` | Définition + enregistrement du module dans le registry |
| `types.ts` | `PPPData` (le modèle central), `AgeRange`, requêtes/réponses IA |

### UI
| Fichier | Rôle |
|---|---|
| `components/PPPGenerator.tsx` | **Orchestrateur.** Détient tout l'état du formulaire, la barre de progression simulée, les validations, et déclenche génération / impression / sauvegarde. |
| `components/ThematiquesSuggestions.tsx` | Panneau de thématiques cliquables (prioritaires / secondaires / toutes) qui s'ajoutent aux notes. Catégorise par score de pertinence pour l'âge. |
| `components/AudioTranscriptionModal.tsx` | Modale d'import d'un enregistrement d'entretien via QR code (voir « Flux audio »). |
| `components/PPPDocumentV2.tsx` | **Le document rendu.** A4 paysage, 4 colonnes + suivi, entièrement `contentEditable`. Applique le thème couleur de la tranche d'âge. |
| `styles/ppp-document.css` | Styles du document, dont les règles `@media print` (mise en page d'impression). |

### Données métier
| Fichier | Rôle |
|---|---|
| `data/thematiques.ts` | Référentiel de **50 thématiques** de prévention, chacune avec un **score de pertinence 1→5 par tranche d'âge**. Fournit `getThematiquesForAge`, `getPriorityThematiques`, `getScoreColor`. |
| `utils/templates.ts` | Contenu **« Exemple »** pré-rempli (priorités/freins/conseils/ressources/suivi) par tranche d'âge — pour le bouton « Exemple » et comme démonstration hors IA. |
| `utils/age.ts` | `AGE_RANGES` + `detectAgeBucket(notes)` : détecte automatiquement la tranche d'âge à partir d'un motif « XX ans » dans les notes. |
| `utils/themes.ts` | Une couleur d'accent par tranche d'âge (`PPP_THEMES`) + helpers `hexToRgb` / `withAlpha`. Injectées en variables CSS `--ppp-primary` / `--ppp-accent`. |
| `utils/prompts.ts` | `PPP_SYSTEM_PROMPT` (rôle « Pharmacien Clinicien Expert », format JSON strict) et `TRANSCRIPTION_SYNTHESIS_PROMPT` (synthèse d'entretien audio). |

### Services
| Fichier | Rôle |
|---|---|
| `services/PPPService.ts` | Appel OpenAI. Construit le message (texte + image data-URL), impose `response_format: json_object`, puis **parse défensivement** le JSON (`sanitizeJson` retire les code fences et le texte parasite). |
| `services/PPPStorageService.ts` | CRUD Supabase sur la table `ppp_bilans` (mapping snake_case ↔ camelCase via `toAppPPP`). |
| `services/AudioTranscriptionService.ts` | Cycle de vie d'une session de transcription audio : création, abonnement temps réel, statut, nettoyage. |

### Câblage Electron (hors dossier module)
| Emplacement | Rôle |
|---|---|
| `electron/main/ipc/channels.ts` → `PPP` | Canaux `ppp:print` et `ppp:capture-screen`. |
| `electron/main/ipc/handlers.ts` | `ppp:print` → impression A4 **paysage**. `ppp:capture-screen` → masque les fenêtres (hide → 300 ms → capture écran → show) pour capturer le LGO derrière l'app. |
| `electron/preload/index.ts` → `window.axora.ppp` | Expose `print()` et `captureScreen()` au renderer. |

---

## Dépendances externes & configuration

- **OpenAI GPT-4o** — `PPPService` lit `VITE_OPENAI_API_KEY` (fallback : `localStorage['openaiApiKey']`).
  ⚠️ La clé est utilisée **côté renderer** : acceptable pour un outil interne de bureau, à ne pas
  exposer dans une distribution publique.
- **Supabase** — table `ppp_bilans` (bilans) et `audio_sessions` (sessions audio). Auth requise
  pour la sauvegarde et la transcription.
- **GitHub Pages** — `AudioTranscriptionService.buildUploadUrl()` pointe vers
  `https://doctorsilver-xai.github.io/Axora/upload.html` (webapp d'upload scannée par QR code ;
  hébergée sur Pages pour contourner les restrictions CSP de Safari iOS).
- **Electron** — la capture d'écran et l'impression paysage ne fonctionnent que dans l'app de
  bureau ; en mode navigateur (`dev:web`), la capture est désactivée et l'impression retombe sur
  `window.print()`.

---

## Flux audio (import d'un entretien enregistré)

1. `AudioTranscriptionService.createSession()` crée une session (`audio_sessions`) + un token.
2. La modale affiche un **QR code** vers la webapp GitHub Pages (`upload.html?token=…`).
3. Le pharmacien scanne, enregistre/upload l'audio depuis son téléphone.
4. Une Edge Function Supabase transcrit (Whisper) puis synthétise (`TRANSCRIPTION_SYNTHESIS_PROMPT`).
5. `subscribeToSession()` reçoit le statut en **temps réel** ; à `completed`, la synthèse est
   injectée dans les notes du formulaire.

---

## Tranches d'âge

Quatre buckets pilotent à la fois le contenu suggéré, les scores de thématiques, le thème couleur
et le template d'exemple : **`18-25`**, **`45-50`**, **`60-65`**, **`70-75`** (voir `utils/age.ts`).

---

## Points d'attention pour faire évoluer le module

- **`PPPData` est le contrat central.** Tout ajout de champ doit être répercuté dans : `types.ts`,
  le mapping `PPPStorageService` (+ colonne SQL), le rendu `PPPDocumentV2`, et le prompt si l'IA
  doit le produire.
- **Le parsing IA est le point fragile.** `PPPService.sanitizeJson` encaisse les réponses
  non-strictement-JSON ; la seule validation structurelle est la présence de `priorities`. Un champ
  manquant côté IA n'est pas bloquant à l'affichage mais peut donner des colonnes vides.
- **Pas de stockage local (offline).** `PPPStorageService` est 100 % Supabase ; un fallback SQLite
  reste à implémenter (cf. commentaire en fin de fichier). La sauvegarde échoue silencieusement si
  hors-ligne — la génération et l'impression, elles, fonctionnent sans réseau une fois la réponse IA reçue.
- **La liste des pharmaciens est codée en dur** dans `PPPGenerator.tsx` (`PHARMACISTS`).
- **La barre de progression est simulée** (`simulateProgress`) : elle n'est pas corrélée à
  l'avancement réel de l'appel OpenAI, elle plafonne à 92 % puis saute à 100 % à la réponse.
