# Au-delà des Dys — Décisions QA audio (16 novembre 2026)

## Conclusion

Les **379/379 MP3 décodent sans erreur** et les trois traitements GitHub Actions ont terminé avec succès. Cette réussite technique **ne prouve pas** la correction phonétique ni la conformité au texte attendu.

Le rapport consolidé indique : **63 fichiers sans référence textuelle trouvée dans le catalogue actuel**, **25 alertes de silence majoritaire**, **14 alertes de proximité de borne audio**, **25 correspondances lexicales candidates**, **252 autres fichiers nécessitant une vérification phonétique complémentaire**. Ces catégories sont exclusives par ordre de priorité dans le rapport ; l'acoustique peut aussi concerner des fichiers non référencés.

Une absence de référence dans le catalogue **ne prouve pas qu'un audio est inutilisé**, puisque l'application peut construire des chemins dynamiquement ou utiliser d'autres sources de données.

### Actions recommandées (sans altérer les MP3)

1. Pour les 63 non référencés, identifier le parcours/écran d'utilisation et le contenu attendu ; ajouter les références validées dans le catalogue seulement lorsqu'elles sont confirmées.
2. Pour les 25 alertes « mostly_silent », vérifier si les pauses sont intentionnelles : il peut s'agir d'un rythme didactique utile. **Ne pas couper automatiquement les silences.**
3. Pour les 14 alertes « boundary_close », écouter le début/la fin pour prouver une éventuelle coupure. **Ne pas rallonger ni retraiter le signal sans preuve.**
4. Pour les autres fichiers, comparer le son attendu et le son prononcé avec un contrôle adapté aux phonèmes isolés. La sortie de Vosk/Cnam est une aide au tri, pas une certification humaine.

**Corrections audio prouvées à ce jour : 0.** Aucun remplacement MP3 automatique n'est justifié par ces rapports. L'enregistrement `na.mp3` a déjà été corrigé par la PR n° 8 ; ne pas refaire cette correction.

## Fichiers sans référence textuelle trouvée (63)

- `challenge/challenge_007.mp3`
- `challenge/challenge_008.mp3`
- `challenge/challenge_009.mp3`
- `challenge/challenge_010.mp3`
- `challenge/challenge_011.mp3`
- `challenge/challenge_012.mp3`
- `challenge/challenge_014.mp3`
- `challenge/challenge_016.mp3`
- `challenge/challenge_018.mp3`
- `challenge/challenge_020.mp3`
- `challenge/challenge_021.mp3`
- `challenge/challenge_023.mp3`
- `challenge/challenge_024.mp3`
- `challenge/challenge_025.mp3`
- `complement/complement_031.mp3`
- `complement/complement_034.mp3`
- `complement/complement_037.mp3`
- `complement/complement_040.mp3`
- `complement/complement_042.mp3`
- `complement/complement_044.mp3`
- `complement/complement_046.mp3`
- `complement/complement_048.mp3`
- `complement/complement_050.mp3`
- `complement/complement_052.mp3`
- `complement/complement_054.mp3`
- `complement/complement_056.mp3`
- `complement/complement_058.mp3`
- `complement/complement_062.mp3`
- `complement/complement_064.mp3`
- `complement/complement_066.mp3`
- `complement/complement_068.mp3`
- `complement/complement_072.mp3`
- `complement/complement_074.mp3`
- `complement/complement_076.mp3`
- `complement/complement_078.mp3`
- `consonnes/consonnes_008.mp3`
- `consonnes/consonnes_012.mp3`
- `consonnes/consonnes_016.mp3`
- `consonnes/consonnes_020.mp3`
- `consonnes/consonnes_024.mp3`
- `consonnes/consonnes_039.mp3`
- `consonnes/consonnes_040.mp3`
- `consonnes/consonnes_041.mp3`
- `consonnes/consonnes_042.mp3`
- `consonnes/consonnes_043.mp3`
- `diagramme/diagramme_012.mp3`
- `diagramme/diagramme_024.mp3`
- `sons_restants/sons_restants_020.mp3`
- `sons_restants/sons_restants_029.mp3`
- `sons_restants/sons_restants_037.mp3`
- `sons_restants/sons_restants_044.mp3`
- `sons_restants/sons_restants_048.mp3`
- `sons_restants/sons_restants_052.mp3`
- `sons_restants/sons_restants_056.mp3`
- `sons_restants/sons_restants_060.mp3`
- `sons_restants/sons_restants_061.mp3`
- `sons_restants/sons_restants_064.mp3`
- `sons_restants/sons_restants_068.mp3`
- `sons_restants/sons_restants_073.mp3`
- `sons_restants/sons_restants_077.mp3`
- `voyelles/voyelles_026.mp3`
- `voyelles/voyelles_034.mp3`
- `voyelles/voyelles_044.mp3`

## Alertes « mostly_silent » (25)

- `complement/complement_001.mp3`
- `complement/complement_005.mp3`
- `complement/complement_009.mp3`
- `complement/complement_010.mp3`
- `complement/complement_013.mp3`
- `complement/complement_017.mp3`
- `complement/complement_021.mp3`
- `complement/complement_025.mp3`
- `complement/complement_038.mp3`
- `diagramme/diagramme_009.mp3`
- `diagramme/diagramme_013.mp3`
- `diagramme/diagramme_017.mp3`
- `diagramme/diagramme_018.mp3`
- `diagramme/diagramme_021.mp3`
- `diagramme/diagramme_025.mp3`
- `diagramme/diagramme_029.mp3`
- `sons_restants/sons_restants_017.mp3`
- `sons_restants/sons_restants_025.mp3`
- `sons_restants/sons_restants_041.mp3`
- `sons_restants/sons_restants_049.mp3`
- `sons_restants/sons_restants_053.mp3`
- `sons_restants/sons_restants_057.mp3`
- `sons_restants/sons_restants_065.mp3`
- `sons_restants/sons_restants_069.mp3`
- `voyelles/voyelles_021.mp3`

## Alertes « boundary_close » (14)

- `challenge/challenge_022.mp3`
- `challenge/challenge_026.mp3`
- `complement/complement_060.mp3`
- `complement/complement_070.mp3`
- `complement/complement_080.mp3`
- `consonnes/consonnes_004.mp3`
- `consonnes/consonnes_028.mp3`
- `consonnes/consonnes_032.mp3`
- `consonnes/consonnes_036.mp3`
- `consonnes/consonnes_044.mp3`
- `quiz/ba.mp3`
- `voyelles/voyelles_014.mp3`
- `voyelles/voyelles_040.mp3`
- `voyelles/voyelles_041.mp3`

## Preuves

- GitHub Actions, campagne #6, rapport individuel pour 379 fichiers.
- PR n° 11 : `scripts/audio-qa-evidence.py`, `scripts/audio-qa-compare.py`.
- Sorties disponibles dans les artefacts GitHub Actions (conservation limitée à 90 jours).

**État commercial de la phonétique : validation pédagogique encore ouverte.**
