# Contrôle phonétique des audios d’Au-delà des Dys

Périmètre analysé au commit `0d3bc491e499b85615f86ea67853a336cdf1e757`. Le [rapport par fichier](inventaire-379.csv) comprend tous les MP3 versionnés, y compris les 81 sans référence textuelle retrouvée.

## Bilan

| Indicateur | Résultat |
| --- | ---: |
| Fichiers inventoriés, avec chemin, taille et SHA du blob | 379 |
| Références issues du catalogue | 275 |
| Références issues du nom du clip de quiz | 23 |
| Fichiers sans référence textuelle retrouvée | 81 |
| Fichiers prioritaires dont les trames MPEG ont été examinées sur ce commit | 9 |
| Statut validé techniquement, sur mesures documentées dans la PR n° 8 | 1 |
| Statut forte concordance phonétique | 0 établi à partir des preuves récupérées |
| Statut incertain | 378 |
| Erreurs sonores démontrées sur la version actuelle | 0 établi à partir des preuves récupérées |
| Corrections nouvelles | 0 |

Le statut technique de `na` laisse son arbitrage phonétique ouvert. La décision phonétique reste donc ouverte pour les 379 fichiers. Les 81 fichiers sans référence retrouvée sont identifiés comme tels, sans déduire qu’ils sont inutilisés ailleurs.

## Contrôles

- L’arbre Git complet contient 379 chemins audio et autant d’empreintes distinctes. Les 277 lignes du catalogue pointent vers 275 fichiers existants. Les deux références réutilisées ont le même texte dans chaque occurrence. Le CSV relu sur la branche est identique au résultat généré et comporte une ligne par fichier.
- Les neuf fichiers prioritaires ont été récupérés sur le commit indiqué. Leurs tailles et identifiants Git correspondent à l’arbre. Le parcours des en-têtes MPEG Layer III couvre toutes les trames jusqu’à la fin du fichier. La durée brute inclut les trames d’en-tête et de bourrage selon l’encodage. Ce contrôle ne décode pas le signal et ne mesure ni le silence, ni le niveau, ni les phonèmes.
- La campagne précédente rapportait 379 fichiers lisibles, 40 alertes techniques et deux analyses couvrant les 379 fichiers, avec Cnam et Vosk, ainsi qu’un contrôle de provenance pour 19 extraits. Les résultats ligne par ligne et le commit exact de cette campagne n’ont pas été récupérés. Les alertes agrégées ne sont pas attribuées à des fichiers par supposition.
- Le dépôt contient `scripts/check-quiz-audio.cjs`, `scripts/extract-quiz-audio.cjs` et `scripts/verify-pedagogical-audio.cjs`. Les quatre scripts expérimentaux `strict-audio-qa.cjs`, `phoneme-qa.py`, `vosk-qa.py` et `verify-source-cuts.py` ne figuraient pas dans les dossiers de scripts inspectés. L’exécution de ffmpeg, ffprobe, Cnam et Vosk et la récupération de `/tmp` étaient indisponibles pendant cette reprise.
- Sur le commit de référence, [GitHub Actions](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43950458891/job/133591252712) indique 7/7 contrôles de lancement réussis. Le build de base échoue au contrôle ESLint sur `Environment key "jest/globals" is unknown`. Le workflow ne fournit pas de résultats de vérification phonétique.

## Cas prioritaires

| Fichier | Référence attendue | Preuve disponible |
| --- | --- | --- |
| `challenge_004.mp3` | Trouve les mots avec le son ou | Trames MPEG jusqu’à la fin, durée brute 2,304 s. Divergence signalée à arbitrer. |
| `challenge_005.mp3` | Trouve les mots avec le son m | Trames MPEG jusqu’à la fin, durée brute 2,832 s. Divergence signalée à arbitrer. |
| `challenge_006.mp3` | Trouve les mots avec le son an | Trames MPEG jusqu’à la fin, durée brute 2,904 s. Divergence signalée à arbitrer. |
| `quiz/mi.mp3`, `quiz/po.mp3`, `quiz/pa.mp3`, `quiz/ra.mp3`, `quiz/lu.mp3` | mi, po, pa, ra, lu | Trames contrôlées. Les références sources du script d’extraction figurent dans le CSV. Les limites des extraits restent à comparer au signal source. |
| `quiz/na.mp3` | na | Blob actuel `a896ae5557b532629445ff24c381be09cffeb4ce`. Mesures historiques ci-dessous. |

La [PR n° 8](https://github.com/pontiacmyriam/au-dela-des-dys/pull/8) documente le passage de 0 à −1,5 dB au pic et une durée ffprobe inchangée de 0,391837 s. Elle indique une corrélation de 99,99 % avec le début de `consonnes_025.mp3`, une première pause vers 0,298 s et le son suivant après 0,841 s. Les blobs avant et après correction ont des empreintes distinctes et contiennent chacun 16 trames MPEG. Ces mesures de provenance et de niveau proviennent de la PR n° 8.

## Fichiers ajoutés

- `docs/qa-audio/inventaire-379.csv`
- `docs/qa-audio/README.md`

La branche contient uniquement ces deux documents. La progression, les encouragements, les 22 exercices gratuits, les règles d’accès Premium, les MP3 et le catalogue sont hors diff. La certification reste ouverte jusqu’à récupération des preuves individuelles et contrôle ciblé des divergences et des coupes.
