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

Il faut Node 20 ou plus (le socle est vérifié sur Node 24).

```bash
npm install     # installe les dépendances
npm run dev     # serveur de développement sur http://localhost:3000
npm run build   # construction de production
npm run start   # sert la construction de production sur le port 3000
npm run typecheck   # tsc --noEmit, zéro erreur attendue
```

Aucune variable d'environnement n'est nécessaire pour construire ou lancer le
projet : `NEXT_PUBLIC_URL_SITE` sert uniquement à écrire des adresses absolues
dans les métadonnées, le plan du site et le fichier robots, et retombe sur
`http://localhost:3000` quand elle n'est pas définie.

## Refaire les mesures

Les quatre notes (rapidité, accessibilité, bonnes pratiques, référencement)
sont mesurées, datées et versionnées dans `mesures/`. La mesure se fait sur la
construction de production, pas sur le serveur de développement :

```bash
npm run build
npm run start &                       # sert le site sur le port 3000
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./mesures/lighthouse-a-blanc-AAAA-MM-JJ.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags=--headless
```

Mesure de référence du socle (2026-08-06, Lighthouse 13.4.1, profil mobile,
page d'accueil) : **rapidité 98, accessibilité 100, bonnes pratiques 100,
référencement 100**. Décalage de mise en page cumulé 0,0001 ; premier affichage
de contenu 1,54 s ; plus grand affichage de contenu 2,29 s ; JavaScript de
premier chargement 103 ko.

Ces notes sont relevées **hors ligne, sur la machine de développement**. Elles
donnent la santé du socle, pas la performance servie aux visiteurs : la mesure
qui engage commercialement sera refaite sur le déploiement réel.

## En-têtes de sécurité

Ils vivent dans `vercel.json` et reprennent le jeu du site portfolio. Deux
points méritent d'être compris avant d'y toucher — `vercel.json` est du JSON
strict, il ne peut pas porter de commentaire, d'où cette section.

**`Permissions-Policy: payment=()` est conservé, volontairement** (décision
D8). L'encaissement passe par une page de paiement hébergée chez le
prestataire : le visiteur quitte le site, paie chez lui, revient. La boutique
n'a donc jamais besoin de l'API `PaymentRequest` du navigateur, et le dire
dans un en-tête est une preuve vérifiable de plus. Si un jour on veut le
formulaire de carte **embarqué dans la page** (les « Elements » de Stripe), il
faudra ouvrir trois choses : `payment=(self "https://js.stripe.com")` dans
`Permissions-Policy`, `frame-src https://js.stripe.com` et
`script-src https://js.stripe.com` dans la politique de sécurité du contenu.
Tant que la redirection suffit, on ne les ouvre pas.

**Alerte ouverte : `script-src 'self'` et Next.** La politique interdit tout
script en ligne. Or l'App Router de Next dépose le contenu de la page dans des
balises `<script>` sans `src` (15 sur l'accueil au 2026-08-06). Sur le
portfolio, écrit en Astro sans script en ligne, cette politique passe ; ici,
elle bloquerait l'hydratation dès le premier déploiement. La tranche C1 ne
déploie pas, donc rien n'est cassé aujourd'hui, mais **il faut trancher avant
la mise en ligne** entre trois voies : jetons à usage unique posés par un
intercepteur (correct, mais rend toutes les pages dynamiques), `'unsafe-inline'`
sur `script-src` (l'en-tête cesse d'être une preuve), ou export entièrement
statique. Le choix appartient à la tranche de déploiement.

## Les décisions et pourquoi

Chaque décision structurante est consignée dans `contenu/decisions/`, datée
et argumentée. La première est le choix du nom ; les dix décisions techniques
fondatrices (stack, absence de base de données, adaptateur de paiement,
illustrations dessinées, zones d'expédition…) sont résumées dans
`.claude/CLAUDE.md` et détaillées au fil des tranches.
