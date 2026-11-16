# Audios utilisés : croisement des verdicts — 16 novembre 2026

Vérification exécutée avec succès : [GitHub Actions #43967956444](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43967956444).

## Quels audios sont réellement dans les parcours actuels ?

La page principale choisit les sept dossiers visibles via `FOLDER_ORDER` dans `src/App.js`. Les deux premiers parcours sont reconstruits par `buildIntroProgression` et `buildSimpleProgression` de `src/curatedProgression.js`; pour les activités de quiz, `audioPath` utilise `quiz/{correct}.mp3`.

- **225 MP3 distincts** sélectionnés par les parcours visibles dans le code actuel.
- **154 MP3 distincts** stockés mais non sélectionnés par ces parcours.
- **0 fichier audio manquant parmi les 225 actifs.**

Ce sont des chemins *accessibles dans le parcours actuel*, pas des statistiques de lectures réelles par les visiteurs ; le nombre réel d'écoutes dépend de la progression et des abonnements. L'analyse est statique (pas un test navigateur).

## Résultats de la campagne phonétique *par usage actuel*

| Classe automatique | MP3 dans les parcours | MP3 hors parcours |
|---|---:|---:|
| Alerte acoustique | **19** | 20 |
| Correspondance lexicale candidate | **17** | 8 |
| Contrôle phonétique non concluant | **189** | 63 |
| Sans référence attendue retrouvée | **0** | 63 |
| **Total** | **225** | **154** |

Les catégories sont exclusives par priorité de tri ; un classement acoustique ne signifie pas que le son est incorrect.

**Décision opérationnelle :** ne pas chercher à corriger 379 MP3. Concentrer la vérification pédagogique sur **225 fichiers effectivement sélectionnés**, en commençant par les **19 alertes acoustiques actives**. Les **63 fichiers sans référence dans les analyses précédentes sont hors des parcours visibles actuels** : il n'y a donc aucune correction prioritaire à effectuer pour ces 63 fichiers au titre des parcours actuels.

## Prudence

- Les **17 concordances lexicales** ne prouvent pas une prononciation certifiée.
- Les **189 résultats phonétiques non concluants** ne prouvent pas 189 erreurs.
- Ne pas supprimer les 154 MP3 hors parcours, sans décision produit spécifique.
- Les anciens états sauvegardés, chemins saisis directement et nouveaux parcours futurs ne sont pas exclus par cette analyse statique.

## Preuves et fichiers

- `scripts/audio-qa-active-usage.py`
- `scripts/audio-qa-active-verdict.py`
- Artefact `audio-active-verdicts-379` sur le run ci-dessus, avec **379 lignes**, champ `used_in_current_visible_parcours` (true/false), statut et résultats Vosk/Cnam.
