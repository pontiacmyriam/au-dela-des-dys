# Verdicts exploitables — bibliothèque audio, 379 MP3

Campagne de référence : GitHub Actions [run 43960733155](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43960733155), complétée par les diagnostics détaillés [run 43963097125](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43963097125).

## Ce qui est VALIDÉ avec preuve

- **379/379 fichiers présents et décodables**, sans erreur d'exécution du décodeur audio.
- **379/379 analyses Vosk exécutées** sans erreur.
- **379/379 analyses Cnam exécutées** sans erreur.
- **379/379 fichiers inventoriés dans le tableau croisé CSV et JSON**.
- Ces quatre validations portent sur la **réalisation technique des contrôles**, non sur la justesse des phonèmes.

## Ce qui concorde partiellement

- **25/379** correspondent exactement au texte attendu après normalisation simple dans la sortie Vosk (« correspondance lexicale candidate »). Il ne s'agit **pas** d'une preuve indépendante d'exactitude phonétique.
- Ne pas confondre ces 25 candidats avec des audios « certifiés ».

## Ce qui reste ouvert, par ordre de classement automatique

- **63** : absence de texte attendu dans la référence pédagogique utilisée ; le fichier n'est pas nécessairement inutilisé dans l'application.
- **39** : avertissement acoustique (25 « mostly_silent », 14 « boundary_close »). Ces seuils ne démontrent ni défaut ni nécessité de retouche.
- **252** : interprétation vocale/phonétique automatiquement non concluante.
- **0 erreur sonore prouvée** par ces résultats, **0 validation humaine** documentée.

## Décision de validation

1. **VALIDER** le lot comme techniquement lisible (379/379). Aucun nouveau test général de décodage n'est requis à moins que les fichiers changent.
2. **NE PAS MODIFIER LES MP3** sur la seule base d'un avertissement de seuil ou de la transcription d'un modèle : couper les pauses d'apprentissage pourrait dégrader l'expérience des enfants.
3. **NE PAS PRÉTENDRE** à une certification phonétique des 379 sons. Pour l'établir, il manque une référence phonétique précise (son attendu, phonèmes, contexte), puis une validation adaptée des cas non concluants.
4. **PROCHAIN TRAVAIL CONCRET** : confronter les 63 fichiers sans texte retrouvé aux usages réels du produit, et faire écouter prioritairement les 39 alertes à une personne compétente si elles sont effectivement utilisées. Les autres audios passent en contrôle pédagogique basé sur l'attendu précis et les évidences individuelles.
5. Les fichiers MP3 ne sont pas modifiés dans cette PR. Seule la PR #8 avait corrigé `na.mp3`, déjà déployé.

## Tableau individuel

Le rapport [audio-consolidated-comparison-379](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43960733155) contient **379 décisions de tri**, leurs textes attendus quand connus, la sortie Vosk, la sortie Cnam et les mesures acoustiques. Il permet de mener la vérification ciblée **sans réécouter systématiquement les 379 fichiers**.

**Limite fondamentale :** aucune conversion honnête de sorties ASR/CTC en « prononciation correcte à 100 % » n'est possible pour des phonèmes isolés sans référence phonétique fiable et contrôle approprié.
