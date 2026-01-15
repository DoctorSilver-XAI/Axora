import type { NoteTemplate } from '../types'

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'patient-suivi',
    name: 'Suivi Patient',
    icon: '👤',
    description: 'Suivi et observations patient',
    defaultTitle: 'Suivi - ',
    content: `## Informations Patient

**Nom :**
**Date :** ${new Date().toLocaleDateString('fr-FR')}

---

## Traitement actuel

-

---

## Observations

>

---

## Actions à mener

- [ ]
- [ ]
`,
  },
  {
    id: 'todo-journee',
    name: 'Todo Journée',
    icon: '📋',
    description: 'Checklist pour la journée',
    defaultTitle: `Todo - ${new Date().toLocaleDateString('fr-FR')}`,
    content: `## Matin

- [ ] Ouverture officine
- [ ] Vérification stocks
- [ ]

---

## Après-midi

- [ ]
- [ ]

---

## Fin de journée

- [ ] Clôture caisse
- [ ] Vérification commandes
- [ ]
`,
  },
  {
    id: 'incident-qualite',
    name: 'Incident Qualité',
    icon: '⚠️',
    description: 'Rapport incident qualité',
    defaultTitle: 'Incident - ',
    content: `## Incident Qualité

**Date :** ${new Date().toLocaleDateString('fr-FR')}
**Heure :**
**Déclarant :**

---

## Description de l'incident

>

---

## Cause identifiée



---

## Action corrective

- [ ]

---

## Suivi

| Date | Action | Statut |
|------|--------|--------|
|      |        |        |
`,
  },
  {
    id: 'commande',
    name: 'Commande',
    icon: '📦',
    description: 'Liste de commande fournisseur',
    defaultTitle: 'Commande - ',
    content: `## Commande Fournisseur

**Fournisseur :**
**Date :** ${new Date().toLocaleDateString('fr-FR')}
**Urgence :** Normal / Urgent

---

## Produits à commander

| Produit | Référence | Quantité |
|---------|-----------|----------|
|         |           |          |
|         |           |          |
|         |           |          |

---

## Notes


`,
  },
  {
    id: 'formation',
    name: 'Note Formation',
    icon: '📚',
    description: 'Notes de formation',
    defaultTitle: 'Formation - ',
    content: `## Formation

**Titre :**
**Date :** ${new Date().toLocaleDateString('fr-FR')}
**Formateur :**

---

## Points clés

1.
2.
3.

---

## À retenir

>

---

## Ressources

-
`,
  },
  {
    id: 'memo-rapide',
    name: 'Mémo Rapide',
    icon: '💡',
    description: 'Note rapide sans structure',
    defaultTitle: 'Mémo',
    content: '',
  },
]
