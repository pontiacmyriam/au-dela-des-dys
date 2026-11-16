# Audit des audios réellement sélectionnés par l'application — 16 novembre 2026

## Conclusion vérifiée

L'application React charge `public/prototype_vfinal.json`, affiche les **7 dossiers** définis dans `FOLDER_ORDER`, et utilise deux parcours construits dans `src/curatedProgression.js` : `buildIntroProgression` et `buildSimpleProgression`. Dans les quiz, l'application charge `/assets/audio/quiz/{correct}.mp3`, et non nécessairement le MP3 de l'entrée source.

Le contrôle de cette logique [GitHub Actions #43967742161](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43967742161) donne :

- **379 MP3 stockés**.
- **225 chemins MP3 distincts sélectionnés dans les parcours visibles actuels**.
- **154 MP3 non sélectionnés par ces parcours**.
- **0 chemin MP3 manquant parmi les 225 utilisés**.
- Méthode : reconstruction statique du code actuel (pas une session naviguée dans un navigateur). Un accès par anciennes données enregistrées ou une autre route non analysée reste possible.

### Impact sur les alertes précédentes

- Sur **39 alertes acoustiques**, **19 fichiers sont utilisés** dans les parcours visibles et **20 ne le sont pas**.
- Sur **63 fichiers sans texte attendu retrouvé**, **0 est utilisé** dans les parcours visibles actuels.
- Les alertes ne prouvent toujours pas une mauvaise prononciation ou une coupure.
- Le contrôle phonétique prioritaire doit porter sur les **225 audios appelés par l'application**, en commençant par les 19 alertes utilisées.

## 19 MP3 utilisés avec avertissement acoustique

- `complement/complement_010.mp3` — mostly_silent ; attendu : "ballon melon non"
- `complement/complement_013.mp3` — mostly_silent ; attendu : "oi"
- `complement/complement_017.mp3` — mostly_silent ; attendu : "ouille"
- `complement/complement_021.mp3` — mostly_silent ; attendu : "ail"
- `complement/complement_025.mp3` — mostly_silent ; attendu : "eille aille"
- `complement/complement_038.mp3` — mostly_silent ; attendu : "heureux chanceux peureux"
- `diagramme/diagramme_013.mp3` — mostly_silent ; attendu : "an"
- `diagramme/diagramme_017.mp3` — mostly_silent ; attendu : "in"
- `diagramme/diagramme_018.mp3` — mostly_silent ; attendu : "lapin vin sapin"
- `diagramme/diagramme_021.mp3` — mostly_silent ; attendu : "oi"
- `diagramme/diagramme_025.mp3` — mostly_silent ; attendu : "gn"
- `diagramme/diagramme_029.mp3` — mostly_silent ; attendu : "lle"
- `quiz/ba.mp3` — boundary_close ; attendu : "ba"
- `sons_restants/sons_restants_017.mp3` — mostly_silent ; attendu : "qu que qui quoi"
- `sons_restants/sons_restants_025.mp3` — mostly_silent ; attendu : "wa we wi"
- `sons_restants/sons_restants_041.mp3` — mostly_silent ; attendu : "the tha tho"
- `sons_restants/sons_restants_049.mp3` — mostly_silent ; attendu : "gu gua gui"
- `sons_restants/sons_restants_053.mp3` — mostly_silent ; attendu : "ge gi"
- `sons_restants/sons_restants_065.mp3` — mostly_silent ; attendu : "im ym"

## 20 MP3 non sélectionnés avec avertissement

- `challenge/challenge_022.mp3` — boundary_close
- `challenge/challenge_026.mp3` — boundary_close
- `complement/complement_001.mp3` — mostly_silent
- `complement/complement_005.mp3` — mostly_silent
- `complement/complement_009.mp3` — mostly_silent
- `complement/complement_060.mp3` — boundary_close
- `complement/complement_070.mp3` — boundary_close
- `complement/complement_080.mp3` — boundary_close
- `consonnes/consonnes_004.mp3` — boundary_close
- `consonnes/consonnes_028.mp3` — boundary_close
- `consonnes/consonnes_032.mp3` — boundary_close
- `consonnes/consonnes_036.mp3` — boundary_close
- `consonnes/consonnes_044.mp3` — boundary_close
- `diagramme/diagramme_009.mp3` — mostly_silent
- `sons_restants/sons_restants_057.mp3` — mostly_silent
- `sons_restants/sons_restants_069.mp3` — mostly_silent
- `voyelles/voyelles_014.mp3` — boundary_close
- `voyelles/voyelles_021.mp3` — mostly_silent
- `voyelles/voyelles_040.mp3` — boundary_close
- `voyelles/voyelles_041.mp3` — boundary_close

## Point important

Ne pas supprimer les **154 fichiers non sélectionnés** automatiquement : ils peuvent servir à de futurs exercices et leur présence ne pose pas de défaut fonctionnel. Ne pas convertir une alerte de seuil en correction audio sans écouter la portion réellement concernée.

## Preuve reproductible

- `scripts/audio-qa-active-usage.py`
- GitHub Actions : artefact `audio-reference-integrity-379`, fichier `audio-active-usage/all_379_usage.csv`, avec `current_visible_path=YES/NO` pour **379/379** fichiers.
