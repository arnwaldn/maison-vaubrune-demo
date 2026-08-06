# Décision 005 (D24) — La surcouche marchand s'applique à la vitrine, jamais au tunnel

- **Date** : 2026-08-06
- **Tranche** : C6 (espace marchand et suivi client)
- **Statut** : gravé (implémenté dans `src/lib/catalogue-navigateur.ts` et les
  feuilles de `src/composants/surcouche/` ; note pédagogique rendue par
  `src/composants/commande/IlotCommande.tsx`)
- **Objet** : jusqu'où portent les modifications que le visiteur saisit dans
  `/gestion/catalogue` — prix, stock, disponibilité, mise en avant, résumé ?

## Le choix

**La surcouche s'applique à la VITRINE et s'arrête là.**

Elle s'applique donc à `/boutique` et aux quinze fiches produit : prix affichés,
stocks affichés, disponibilité, mise en avant, résumé. Elle ne s'applique NI au
panier, NI au récapitulatif de commande, NI au contrôle d'intégrité du serveur.
Le passage en caisse se fait toujours aux prix du catalogue versionné.

Un visiteur qui baisse le prix de l'huile d'olive à 1,00 €, l'ajoute au panier
et va jusqu'à `/commande` voit donc son huile à 22,50 € au récapitulatif, et le
paiement s'ouvre à 22,50 €.

## Pourquoi, et pourquoi ce n'est pas une gêne

Parce que **le serveur ne fait jamais confiance au navigateur**. C'est la
doctrine posée en C5 et prouvée par les onze contrôles de
`src/lib/paiement/validation.ts` : le corps envoyé à `/api/paiement/session` ne
contient qu'un total ANNONCÉ, le serveur relit le catalogue versionné, refait le
calcul complet, et refuse la demande en 422 si un centime diffère.

Faire porter la surcouche jusqu'au tunnel demanderait l'une de ces deux choses,
et les deux sont indéfendables :

1. **Transmettre les prix modifiés au serveur** pour qu'il valide contre
   eux — c'est-à-dire faire confiance à un prix venu du navigateur, exactement
   ce que le contrôle d'intégrité existe pour interdire. La démonstration
   perdrait sa meilleure preuve de sérieux pour un confort d'essai.
2. **Désactiver le contrôle d'intégrité** quand une surcouche existe — une porte
   dérobée conditionnelle dans le seul endroit du projet qui arbitre un montant.

Le troisième chemin, celui d'une vraie boutique, serait de faire vivre les prix
côté serveur (base de données + espace de gestion authentifié). C'est
précisément ce que la démonstration ne peut pas faire (décision D2 : ni base de
données, ni compte), et ce qu'elle DIT plutôt que de le simuler.

## Ce que le visiteur lit

Quand le panier contient au moins un article dont le prix de vitrine a été
modifié, `/commande` affiche :

> Vos essais de prix marchand ne s'appliquent pas au paiement de démonstration :
> sur une boutique livrée, les prix vivent côté serveur — c'est précisément ce
> que le contrôle d'intégrité du paiement vérifie.

Cette note ne s'excuse pas d'une limite : elle transforme la contrainte en
démonstration. Le visiteur vient de faire, sans le vouloir, l'expérience de la
falsification de prix côté client — et de constater qu'elle ne passe pas.

## Conséquences de code

- `src/lib/catalogue-navigateur.ts` ne connaît que la LECTURE de la vitrine :
  `prixAffiche()`, `stockAffiche()`, `estDisponibleAffiche()`,
  `resumeAffiche()`, `miseEnAvantAffichee()`. Aucune de ces fonctions n'est
  appelée depuis `src/lib/panier/`, `src/lib/commandes/` ou
  `src/lib/paiement/`.
- Les îlots du tunnel (`IlotPanier`, `IlotCommande`, `IlotConfirmation`)
  continuent de recevoir la PROJECTION du catalogue versionné (décision D17) et
  de la lire telle quelle.
- **Le stock fait exception dans un seul sens.** Baisser un stock dans
  `/gestion/catalogue` borne réellement la quantité ajoutable depuis la fiche
  (`Math.min` du stock affiché et du stock d'origine) : c'est une restriction,
  elle ne peut rien casser. L'augmenter n'élargit rien — le réducteur du panier
  reste borné par le stock du catalogue versionné, comme les prix, et pour la
  même raison.
- **Rendre un produit indisponible éteint le bouton d'ajout**, avec son motif.
  C'est la seule modification de vitrine qui INTERDIT quelque chose au lieu de
  l'afficher, et elle est sûre pour la même raison que la baisse de stock :
  elle retranche.

## Portée

La décision vaut pour la surcouche de CATALOGUE. Le barème d'expédition
(`src/donnees/bareme-expedition.ts`) n'est pas modifiable depuis l'espace de
gestion de cette tranche ; `calculerFraisPort()` accepte pourtant un barème
injecté, et le jour où la démonstration l'ouvrira au marchand, la même règle
s'appliquera — vitrine oui, tunnel non.
