# 19 alertes acoustiques réellement utilisées — examen comparatif

Données : `audio-active-verdicts-379`, [GitHub Actions #43968260507](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43968260507).

**Tous les 19 fichiers sont présents dans les parcours visibles.** 18 sont signalés « mostly_silent », 1 est « boundary_close ». Ces indicateurs n'établissent pas un défaut sonore en eux-mêmes.

## Priorité d'écoute spécialisée

Les incohérences entre la référence, la reconnaissance Vosk et la sortie Cnam peuvent provenir de limitations des modèles sur des sons isolés. **Aucune erreur n'est démontrée à ce stade.**

- `diagramme/diagramme_025.mp3` — référence : "gn" ; Vosk : "mieux" ; Cnam : "njø"
- `diagramme/diagramme_029.mp3` — référence : "lle" ; Vosk : "yeux" ; Cnam : "jø"
- `sons_restants/sons_restants_025.mp3` — référence : "wa we wi" ; Vosk : "vingt veux vie" ; Cnam : "va vø vi"
- `sons_restants/sons_restants_041.mp3` — référence : "the tha tho" ; Vosk : "t'as tout" ; Cnam : "tø ta tu"
- `sons_restants/sons_restants_049.mp3` — référence : "gu gua gui" ; Vosk : "deux gars guy" ; Cnam : "ɡø ɡa ɡi"
- `sons_restants/sons_restants_065.mp3` — référence : "im ym" ; Vosk : "un" ; Cnam : "œ̃ k"

## Concordance automatique encourageante (non certifiée)

- `complement/complement_010.mp3` — référence : "ballon melon non" ; Vosk : "ballon melon non" ; Cnam : "balɔ̃ məlɔ̃ nɔ̃"
- `complement/complement_038.mp3` — référence : "heureux chanceux peureux" ; Vosk : "heureux chanceux peureux" ; Cnam : "øʁø ʃɑ̃sø øʁø"
- `diagramme/diagramme_018.mp3` — référence : "lapin vin sapin" ; Vosk : "lapin vingt sapin" ; Cnam : "lapɛ̃ vɛ̃ sa pɛ̃"
- `quiz/ba.mp3` — référence : "ba" ; Vosk : "pas" ; Cnam : "ba"
- `sons_restants/sons_restants_017.mp3` — référence : "qu que qui quoi" ; Vosk : "que que qui quoi" ; Cnam : "kə kə ki kwa"

## Autres fichiers à éclaircir

- `complement/complement_013.mp3` — référence : "oi" ; Vosk : "owen" ; Cnam : "wa"
- `complement/complement_017.mp3` — référence : "ouille" ; Vosk : "ouille" ; Cnam : "ui"
- `complement/complement_021.mp3` — référence : "ail" ; Vosk : "aïe aïe" ; Cnam : "paj aj"
- `complement/complement_025.mp3` — référence : "eille aille" ; Vosk : "aïe aïe" ; Cnam : "ɛj aj"
- `diagramme/diagramme_013.mp3` — référence : "an" ; Vosk : "un" ; Cnam : "ɑ̃"
- `diagramme/diagramme_017.mp3` — référence : "in" ; Vosk : "un" ; Cnam : "œ̃"
- `diagramme/diagramme_021.mp3` — référence : "oi" ; Vosk : "quoi" ; Cnam : "u a"
- `sons_restants/sons_restants_053.mp3` — référence : "ge gi" ; Vosk : "je j" ; Cnam : "ʒjø ʒi"

## Décision de correction

- **Pas de suppression automatique des silences :** ils peuvent être pédagogiquement voulus.
- **Pas de remplacement des fichiers sans preuve auditive.**
- Pour `quiz/ba.mp3`, la sortie Cnam « ba » concorde avec l'attendu ; l'alerte de bord porte sur sa courte durée (0,37 s) et nécessite un contrôle de la fin du signal seulement.
- Si les écoutes ciblées confirment un défaut, créer un enregistrement de remplacement distinct, comparer avec l'original et demander validation avant fusion.

Cette revue est **automatique**, elle ne constitue pas une certification orthophonique.
