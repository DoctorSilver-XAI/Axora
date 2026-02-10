# Design: Thematiques de Prevention par Age

**Date**: 2026-02-10
**Scope**: presentation/index.html + liens avec module PPP app

## Objectif

Ajouter une section interactive dans la page de presentation qui affiche les 16 thematiques officielles Ameli de "Mon Bilan Prevention", priorisees dynamiquement par tranche d'age, avec liaison couleur au document A4.

## Architecture

### Emplacement
Nouvelle section entre `#a4-document` et `#wf-step-14` (edit demo).

### Composants
1. **Age Selector** : 4 pills avec couleurs Ameli officielles
   - 18-25: `#E8A317` (or)
   - 45-50: `#009689` (teal)
   - 60-65: `#C2458A` (magenta)
   - 70-75: `#E2703A` (corail)

2. **Tags Grid** : 4x4, 16 themes officiels avec badges priorite

3. **Dynamic A4 Link** : Changement de couleur du document A4 en fonction de l'age selectionne

### Les 16 themes officiels Ameli
1. Alimentation
2. Activite physique et sedentarite
3. Tabac
4. Alcool et autres addictions
5. Bien-etre mental et social
6. Sommeil
7. Prevention des cancers
8. Prevention des maladies chroniques
9. Prevention de la perte d'autonomie
10. Sante bucco-dentaire
11. Vaccinations
12. Sante sexuelle
13. Menopause
14. Violences
15. Sante et environnement
16. Acces aux droits

### Priorites par age (source: Ameli + rapport expert)
- **18-25**: Sante mentale, addictions, sante sexuelle, alimentation, vaccination
- **45-50**: Depistage cancers, risques cardiovasculaires, activite physique, alimentation
- **60-65**: Perte d'autonomie, vaccination, depistage, equilibre alimentaire
- **70-75**: Autonomie (ICOPE), chutes, nutrition, vaccination grippe/pneumo

## Bugfixes A4
1. Couleur dynamique par age (pas fixe teal)
2. overflow: hidden sur .ppp-a4-wrapper
3. min-width: 0 sur .ppp-a4-column
4. Scaling JS padding fix

## Sources
- ameli.fr/pharmacien
- Gabarits officiels PPP par tranche d'age
- Rapport expert interne (fevrier 2026)
