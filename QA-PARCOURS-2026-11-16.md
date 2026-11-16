# QA du parcours Au-delà des Dys — 16 novembre 2026

**Statut de publication : NO-GO.** Travail limité à la branche
`fix/progression-orthophoniste-2026-11-16`. Aucun paiement effectué et aucune
modification de production.

## Vérifications exécutées

- 277 exercices du catalogue : consigne non vide et MP3 présent/lisible avec
  une durée plausible (outil `ffprobe`).
- 20 extraits audio utilisés pour les premières activités : présents, lisibles,
  durée inférieure à trois secondes.
- 22 exercices d'introduction et 14 exercices de consolidation : contrôles
  structurels et correspondances entre réponses et fichiers audio.
- 204 exercices des niveaux ultérieurs réordonnés sans en perdre ni dupliquer.
- API Premium : neuf tests avec réponses Stripe simulées, dont refus du mauvais
  prix, du paiement non réglé, de la résiliation et de la session invalide.
- Endpoint réel de la Preview : une session malformée reçoit une réponse
  `{ "active": false }`.
- Correction de la validation : les espaces ne peuvent plus être supprimés
  pour faire accepter une réponse incorrecte.

Commande reproductible :

```sh
node --test tests/exercise-catalog.test.js tests/subscription-status.test.js
```

## Limites — non validé

1. La **prononciation** de chaque MP3 n'a pas été contrôlée à l'oreille par
   un humain/orthophoniste : la seule lisibilité d'un fichier ne démontre pas
   sa justesse phonétique.
2. Les interactions de **chacun** des exercices Premium n'ont pas encore été
   jouées en navigateur. La vérification du catalogue n'est pas une preuve de
   qualité de toutes les interactions.
3. Le parcours **Checkout Stripe Test → abonnement → déverrouillage →
   restauration → résiliation** n'a pas encore été validé de bout en bout.
4. Les fichiers de contenu et d'audio Premium sont des ressources statiques
   servies par l'application ; la barrière actuelle contrôle l'interface,
   pas l'autorisation de chaque téléchargement. Une véritable protection
   commerciale des ressources nécessite un service authentifié.
5. Les décisions de progression sont des choix pédagogiques de travail et
   n'ont pas reçu de validation clinique de Madame Dujardin.

La publication n'est autorisable qu'après résolution des points bloquants,
notamment des essais humains et des essais de paiement fictif.
