# Maison Vaubrune — boutique en ligne de démonstration

Maison Vaubrune est une épicerie fine régionale **fictive**. Ce projet est une
démonstration : il sert à montrer, en conditions réelles, ce que contient une
boutique en ligne livrée dans les règles — catalogue tenu par le marchand,
panier qui va jusqu'au paiement, frais de port calculés et affichés avant de
payer, commandes suivies d'un état à l'autre, et les documents que la vente à
distance impose d'avoir avant d'ouvrir.

Le nom, les produits et les lieux d'origine sont inventés, et le site le dit
sur sa page d'accueil. Le choix du nom et sa vérification (marques déposées,
entreprises actives, web) sont documentés dans
[`contenu/decisions/000-choix-du-nom.md`](contenu/decisions/000-choix-du-nom.md).

## Ce que cette démonstration ne fait pas

- **Aucune commande n'est expédiée, aucun paiement n'est encaissé.** Le
  paiement passe par un prestataire agréé en mode test, ou par un écran de
  simulation qui s'annonce comme tel.
- **Aucun courriel ne part.** Les modèles de courriels d'une boutique livrée
  sont fournis en lecture.
- **Rien n'est enregistré sur un serveur.** Les essais du visiteur (commandes,
  modifications du catalogue) restent dans son navigateur et disparaissent
  s'il en vide le cache. Une boutique livrée met une base de données et des
  comptes à la place — la page « À propos de cette démonstration » détaille
  point par point ce qui change.
- **Aucune donnée personnelle n'est inventée.** Les pages légales sont des
  gabarits : les emplacements que remplit le marchand sont surlignés, et une
  garde de construction échoue si le dépôt contient un numéro d'entreprise,
  un IBAN, un téléphone ou une adresse plausibles.

## Lancer en local

Le socle applicatif arrive à la tranche C1 — cette section sera complétée
avec les commandes exactes (`npm install`, `npm run dev`, `npm run controle`).

## Refaire les mesures

Les quatre notes (rapidité, accessibilité, bonnes pratiques, référencement)
sont mesurées, datées et versionnées dans `mesures/`. La commande exacte pour
les refaire sera documentée ici à la tranche C8.

## Les décisions et pourquoi

Chaque décision structurante est consignée dans `contenu/decisions/`, datée
et argumentée. La première est le choix du nom ; les dix décisions techniques
fondatrices (stack, absence de base de données, adaptateur de paiement,
illustrations dessinées, zones d'expédition…) sont résumées dans
`.claude/CLAUDE.md` et détaillées au fil des tranches.
