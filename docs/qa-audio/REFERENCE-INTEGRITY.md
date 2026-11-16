# Vérification des références audio — résultat du 16 novembre 2026

Contrôle autonome GitHub Actions : [exécution n° 43967135394](https://github.com/pontiacmyriam/au-dela-des-dys/actions/runs/43967135394).

## Résultats vérifiés

- **379 fichiers MP3 présents.**
- **277 entrées audio** dans `public/prototype_vfinal.json`.
- **0 lien cassé parmi ces 277 entrées** : tous les chemins du catalogue mènent à un fichier existant.
- **103 fichiers** sans mention littérale trouvée dans le catalogue ou les sources analysées, dont **23 fichiers du quiz** qui peuvent être construits dynamiquement. Ce nombre **n'est pas** un nombre de fichiers inutilisés.
- **1 fichier** possède une mention littérale dans les autres sources scannées.
- Le diagnostic initial de **63 références textuelles manquantes** signalait une absence de texte attendu dans les sources analysées, pas nécessairement une erreur de fonctionnement.

## Décision de correction

**Aucun lien de catalogue ne nécessite de correction de chemin sur la base de cet audit.**

Ne pas supprimer ou renommer les 103 fichiers sans mention statique : les chemins peuvent être créés dynamiquement et les données peuvent venir d'autres sources.

Une validation de la **prononciation** reste distincte : ce contrôle porte sur l'intégrité des références, et non sur les phonèmes prononcés.

Artefact disponible : `audio-reference-integrity-379` (CSV détaillé, JSON des liens cassés, synthèse).
