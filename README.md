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
  simulation qui s'annonce comme tel — écran qui n'affiche aucun champ de
  carte, pas même désactivé. Une clé de production est refusée par le code
  lui-même (voir « Le paiement »).
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

npm run verifier-catalogue  # 18 contrôles de cohérence du catalogue
npm run verifier-donnees    # 4 contrôles : aucune donnée d'entreprise inventée
npm run verifier-marques    # 6 contrôles : aucune marque réelle, aucune appellation
npm run test:unitaires      # Vitest, modules purs
npm run test:parcours       # Playwright, parcours de bout en bout (2 profils)
npm run mesurer-notes       # Lighthouse sur 3 URL, écrit un relevé daté
npm run controle            # toute la chaîne, dans cet ordre
```

`npm run controle` enchaîne, et s'arrête à la première anomalie :

```
typecheck → verifier-catalogue → verifier-donnees → verifier-marques
         → test:unitaires → build → test:parcours
```

Les parcours viennent EN DERNIER parce qu'ils s'exécutent sur la construction
de production que l'étape précédente vient de produire — jamais sur le serveur
de développement, qui rend les pages autrement. `npm run mesurer-notes` n'est
pas dans la chaîne : la mesure demande un Chrome et plusieurs minutes, et une
garde pénible finit désactivée. Son résultat est versionné, daté, et c'est lui
qui fait foi (voir `mesures/LISEZ-MOI.md`).

Aucune variable d'environnement n'est nécessaire pour construire ou lancer le
projet : `NEXT_PUBLIC_URL_SITE` sert uniquement à écrire des adresses absolues
dans les métadonnées, le plan du site et le fichier robots, et retombe sur
`http://localhost:3000` quand elle n'est pas définie.

## Le paiement

**Le serveur recalcule, il ne croit jamais un prix venu du navigateur. C'est la
différence entre une boutique et un formulaire.**

Cette phrase est la règle de `src/lib/paiement/validation.ts`, et tout le reste
en découle. Le bouton « Commander avec obligation de paiement » envoie à
`/api/paiement/session` un corps qui ne contient que trois choses — les lignes
réduites à `{ sku, quantite, composition? }`, la destination, et le total
qu'affiche la page. Le serveur relit le catalogue versionné, refait le calcul
complet (prix, poids, tranche de port, franco), et **refuse la demande si le
total diffère d'un centime** : réponse 422, message en français, aucune session
de paiement ouverte. Onze contrôles s'enchaînent avant, du SKU inexistant à la
composition de coffret hors liste blanche.

**Aucune coordonnée ne transite.** Le nom, l'adresse, le code postal et le
courriel saisis sur `/commande` restent dans le navigateur et rejoignent la
commande rangée dans son stockage local. Le prestataire de paiement collecte sa
propre adresse de livraison sur sa page hébergée. C'est vérifiable en trois
secondes dans l'onglet réseau du navigateur, et c'est la décision D2 traduite
en code.

**Deux modes, un seul tunnel.** Sans variable `STRIPE_SECRET_KEY`, le paiement
passe par un écran de simulation du site, qui s'annonce comme tel en première
ligne et n'affiche **aucun champ de carte, pas même décoratif**. Avec une clé,
le paiement passe par la page hébergée du prestataire. Les pages de retour —
confirmation et annulation — sont les mêmes dans les deux cas.

```bash
npm run start   # sans clé : écran de paiement simulé
```

**Une clé qui ne commence pas par `sk_test_` est refusée à la construction de
l'adaptateur**, avant tout appel réseau : cette démonstration ne doit jamais
encaisser un centime réel. Le visiteur reçoit alors la même réponse honnête
qu'une panne du prestataire (502, « aucun montant n'a été engagé »), et le motif
exact part au journal du serveur.

## L'espace marchand et le suivi client

**Le catalogue est tenu par le marchand, et la démonstration le prouve sans
demander d'accès.** `/gestion` est ouvert volontairement — pas de compte, pas
de mot de passe — et la page le dit en toutes lettres : une boutique livrée met
cet espace derrière une authentification, la démonstration l'ouvre pour qu'on
puisse regarder. Il n'y a rien à y protéger : le catalogue est public, les six
commandes affichées sont un jeu d'essai qui se dit tel, et rien ne quitte le
navigateur.

Cinq écrans : tableau de bord (compteurs par état, chiffre d'affaires, stocks
bas), commandes (liste filtrable et détail avec les boutons de changement
d'état), catalogue (édition en ligne et export JSON), modèles de courriels (les
cinq messages, lus au moment de la construction), prise en main (le mode
d'emploi écrit).

**La surcouche s'applique à la vitrine, jamais au tunnel** (décision D24,
`contenu/decisions/005-surcouche-vitrine-seulement.md`). Modifier un prix dans
`/gestion/catalogue` change `/boutique` et les fiches ; le panier et le paiement
restent aux prix du catalogue versionné, parce que **le serveur ne fait jamais
confiance au navigateur**. Quand le panier contient un article dont le prix de
vitrine a été modifié, `/commande` affiche la note qui l'explique. C'est un
moment pédagogique et non une gêne : le visiteur vient de tenter, sans le
vouloir, une falsification de prix côté client, et il constate qu'elle ne passe
pas.

Cinq champs sont modifiables, et pas un de plus : le résumé, la mise en avant et
la disponibilité d'une référence, le prix et le stock de chaque format. Les
poids et les formats sont des entrées de calcul (frais de port, nombre de pièces
d'un coffret) ; la prose et les mentions légales relèvent de
`src/lib/retractation.ts`. Un patch qui tenterait autre chose est ignoré **champ
par champ** — il applique ce qu'il a le droit d'appliquer et laisse le reste.

**Le suivi client** (`/suivi`) est public et indexable : un client cherche
« suivi commande » suivi du nom d'une boutique, il ne cherche jamais son propre
panier. Il y saisit sa référence — les tirets et la casse n'ont pas
d'importance — et voit la frise payée → préparée → expédiée avec les
horodatages du journal. Six références d'exemple sont affichées pour essayer
immédiatement. Aucune référence saisie ne part sur le réseau.

**Le jeu d'essai** (`src/donnees/commandes-amorce.ts`) : six commandes à dates
absolues figées, quatre états, trois zones. Elles ne sont pas écrites dans le
stockage, elles sont fusionnées à la lecture ; les faire avancer écrit une
**copie locale** qui les masque, et « Réinitialiser le jeu d'essai » efface les
copies, les commandes réellement passées et la surcouche du catalogue. Leurs
coordonnées se disent jeu d'essai jusqu'au bout — « Client d'essai n° 1 »,
« 1, rue de l'Exemple », courriels en `.invalid` (domaine réservé par la
RFC 2606). Leurs trois montants sont écrits en dur et **recalculés par la
garde** : si un prix du catalogue bouge sous une commande figée,
`npm run verifier-catalogue` échoue.

## Les documents légaux

Cinq pages, toutes statiques et indexables, toutes reliées depuis le pied de
page : `/mentions-legales`, `/conditions-generales-de-vente`,
`/donnees-personnelles`, `/retractation` et
`/a-propos-de-cette-demonstration`.

**Ce sont des gabarits, et ils le disent.** Chacun des quatre documents de
vente s'ouvre sur un encadré en deux temps : ce document est un gabarit, la
relecture par un juriste reste celle du marchand ; et la maison est fictive.
Partout où un marchand réel inscrirait une donnée qui lui appartient, la page
affiche un emplacement surligné qui nomme en français ce qui manque —
**vingt-deux** sur les mentions légales, **onze** sur les conditions
générales, **quarante et un** sur les données personnelles, **sept** sur la
rétractation. La page « À propos » n'en porte aucun : elle décrit le site, pas
le marchand.

**Le tableau des exceptions de rétractation est ENGENDRÉ.** La page
`/retractation` publie le régime des quinze références du catalogue — onze à
droit ouvert, deux au titre du 4° de l'article L. 221-28, une au titre du 5°,
une au titre du 3° — et ces lignes sortent de `regimeRetractation()`, la même
fonction qui écrit la mention de chaque fiche produit (décision D12). Une
référence ne peut pas être annoncée dans un régime ici et vendue dans un autre
là-bas.

**Le formulaire type de l'annexe R. 221-1** est reproduit sur la même page,
imprimable (une feuille de style d'impression retire la navigation, le pied de
page et les sommaires) et téléchargeable en texte brut
(`public/formulaire-retractation.txt`, UTF-8, fins de ligne CRLF pour être
lisible dans n'importe quel éditeur).

### La garde d'honnêteté

```bash
npm run verifier-donnees
```

Quatre contrôles, intégrés à `npm run controle` :

1. **Les pages gabarits portent encore leurs emplacements.** Une page légale
   qui ne contiendrait plus un seul `<AComplete>` serait une page dont
   quelqu'un a bouché les trous en inventant. La page « À propos » en est
   dispensée, avec son motif écrit dans le script.
2. **Le formulaire téléchargeable est resté un gabarit** — il doit encore
   porter ses `[À COMPLÉTER : …]`.
3. **Le jeu d'essai porte ses marqueurs d'irréalité.** Ses six adresses ne
   sont exemptées du contrôle suivant que parce qu'elles PROUVENT qu'elles
   sont fictives (« rue de l'Exemple », « Client d'essai »). Remplacer ces
   marqueurs par une vraie voie fait tomber l'exemption avec eux.
4. **Aucun motif de donnée réelle** dans `src/`, `contenu/`, `public/` ni dans
   les noms de fichiers : SIREN, SIRET, TVA intracommunautaire, IBAN, numéro
   de téléphone français, adresse postale (numéro + type de voie + code postal
   à proximité).

Ce que la garde ne prend PAS, et pourquoi : un horodatage ISO n'aligne jamais
neuf chiffres, un code postal seul n'en fait que cinq (`src/lib/zones.ts` en
manipule par construction), et un nombre suivi d'une unité est une quantité,
pas un identifiant — c'est ce qui laisse passer les « 300 000 euros » de
l'encadré réglementaire de l'article D. 211-2. Un bloc peut en outre être
déclaré texte réglementaire (`texte-reglementaire:debut` /
`texte-reglementaire:fin`) et sortir de l'analyse ; les balises non refermées
sont une anomalie.

`tests/` est hors périmètre, délibérément :
`tests/fixtures/donnees-inventees/` contient par construction un faux numéro à
neuf chiffres, un faux téléphone et un faux identifiant bancaire — ce sont les
pièces qui prouvent que la garde échoue quand elle doit échouer
(`tests/unitaires/garde-donnees-inventees.spec.ts`, six cas).

## Les parcours de bout en bout

```bash
npm run test:parcours                      # les deux profils
npx playwright test --project=bureau-1280  # un seul
npx playwright test --ui                   # en mode interactif
```

Playwright joue quatre campagnes sur **deux profils** — un bureau à 1280 px et
un mobile à 390 px, les deux largeurs auxquelles ce projet a été dessiné — et
sur la **construction de production**, servie par
`scripts/servir-production.mjs`. Le serveur de développement rend les pages
autrement : une campagne verte sur `next dev` ne dirait rien du site livré.

**`parcours.spec.ts` — l'histoire entière, en un seul test.** Accueil, rayon,
fiche de l'huile d'olive, deux flacons de 50 cl au panier, un fromage, puis le
panier qui chiffre **56,90 € + 12,90 € de port = 69,80 €** aux montants exacts ;
la Corse qui refuse le produit frais et éteint le bouton ; le retour en
métropole ; le récapitulatif, les coordonnées, les conditions générales ;
« Commander avec obligation de paiement » ; l'écran de paiement simulé qui
s'annonce comme tel ; « Payer » ; la référence `MVB-…` et le panier vidé ; le
suivi arrêté à « payée » ; l'espace marchand qui marque la commande préparée ;
le suivi à deux états. Plus deux tests courts : l'annulation qui laisse le
panier intact, et le coffret « Composez le vôtre » qui exige trois pièces
exactes et fait **deux lignes** pour deux compositions différentes.

**`accessibilite.spec.ts`** — axe-core sur sept pages, zéro violation
« serious » ou « critical ». Les violations mineures sont listées dans le
rapport sans bloquer.

**`typographie.spec.ts`** — les quatre familles de règles de la typographie
française (groupes de milliers, unités, ponctuation haute, guillemets) et
l'absence d'apostrophe droite, appliquées au `innerText` de douze pages, donc
au texte réellement rendu et non à la source.

**`liens.spec.ts`** — un parcours en largeur depuis l'accueil : tous les liens
internes répondent 200, toutes les ancres ont une cible dans le DOM de leur
page, et chaque description de page porte le mot « démonstration ». Ce filet
est **obligatoire** : `typedRoutes` ne garde pas les `<Link>` morts (vérifié
deux fois, le motif est écrit dans `next.config.ts`).

## La garde des marques réelles

```bash
npm run verifier-marques
```

Les mentions légales écrivent « aucune marque réelle, aucune appellation
protégée et aucun producteur nommé ». Six contrôles rendent la phrase vraie :
le texte de `src/`, `contenu/` et `public/`, puis les **noms de fichiers**,
sont cherchés — insensible à la casse, frontières de mot Unicode — contre
**cinquante-huit marques** d'épicerie fine et d'agroalimentaire français,
**vingt appellations protégées** et **neuf signes officiels** (AOP, AOC, IGP,
STG, Label Rouge et leurs formes en toutes lettres).

**La liste est publique**, dans `scripts/verifier-marques-reelles.mjs`, et
c'est tout l'intérêt : elle dit ce qu'on a cherché à ne pas emprunter, et
quiconque relit le fichier peut vérifier que la recherche a été sérieuse. Les
marques ÉCARTÉES y figurent aussi, avec leur motif — un nom qui est aussi un
mot courant, un prénom ou un patronyme répandu ferait échouer la construction
sur une phrase française ordinaire.

Une seule exemption est accordée à ce jour, et elle vise une **citation**, pas
un fichier : « Fauchon » apparaît dans `contenu/decisions/000-choix-du-nom.md`
où le nom sert de MESURE de densité de marques déposées. Si la phrase change,
l'exemption tombe — et une exemption qui ne sert plus fait échouer la garde,
pour qu'une liste d'exceptions ne s'allonge pas en silence.

## Refaire les mesures

Les quatre notes (rapidité, accessibilité, bonnes pratiques, référencement)
sont mesurées, datées et versionnées dans `mesures/`. **Une seule commande**,
depuis la tranche C8 :

```bash
npm run mesurer-notes
```

Elle construit le site si `.next/` est absent, le sert en production sur un
port libre, mesure **trois URL** au profil **mobile bridé** — l'accueil, la
fiche de l'huile d'olive et le panier —, compare chaque note à son seuil
(rapidité 92, accessibilité 100, bonnes pratiques 100, référencement 96), écrit
`mesures/lighthouse-<date>.json` et **sort en erreur** si une note passe sous
son seuil. Le mode d'emploi complet, le choix des trois URL et ce que « hors
ligne » signifie exactement sont dans `mesures/LISEZ-MOI.md`.

Relevé du **2026-08-06** (Lighthouse 13.4.1, profil mobile, construction de
production servie en local) — les douze notes :

| URL | Rapidité | Accessibilité | Bonnes pratiques | Référencement |
|---|---|---|---|---|
| `/` | 98 | 100 | 100 | 100 |
| `/boutique/huile-olive-premiere-pression` | 98 | 100 | 100 | 100 |
| `/panier` | 98 | 100 | 100 | 100 |

Décalage cumulé de mise en page nul sur les trois ; premier affichage de
contenu 1,5 à 1,6 s ; plus grand affichage 2,3 à 2,4 s ; temps de blocage
50 à 60 ms.

Mesure de référence du socle (2026-08-06, Lighthouse 13.4.1, profil mobile,
page d'accueil) : **rapidité 98, accessibilité 100, bonnes pratiques 100,
référencement 100**. Décalage de mise en page cumulé 0,0001 ; premier affichage
de contenu 1,54 s ; plus grand affichage de contenu 2,29 s ; JavaScript de
premier chargement 103 ko.

Relevés de la tranche C7 (mêmes conditions, 2026-08-06) : `/mentions-legales`
**98 / 100 / 100 / 100**, `/conditions-generales-de-vente`
**97 / 100 / 100 / 100**, `/donnees-personnelles` **97 / 100 / 100 / 100**,
`/retractation` **97 / 100 / 100 / 100**,
`/a-propos-de-cette-demonstration` **98 / 100 / 100 / 100**. Décalage cumulé
0,001 partout, sauf `/donnees-personnelles` à **0,03** — la seule page du site
au-dessus de 0,002. La cause est identifiée et écrite plutôt que corrigée à la
main : c'est le chargement des deux polices qui refait la coupure du chapeau
le plus long des cinq pages, au-dessus de l'encadré d'ouverture. La valeur
reste dans la bande « bonne » de l'outil (seuil 0,1) et la note tient à 97 ; y
répondre par une hauteur minimale en dur reviendrait à graver une constante
juste pour une largeur d'écran et une paire de polices.

Relevés de la tranche C6 (mêmes conditions) : `/suivi` **98 / 100 / 100 / 100**,
décalage 0. `/gestion` **98 / 100 / 100 / 63** — la note de référencement est en
retrait parce que la page porte `noindex`, et c'est **voulu**. L'audit en échec
est `is-crawlable`, un seul, et il échoue parce qu'on le lui a demandé. C'est
l'application en sens inverse de la décision D19 : `/panier` et `/commande` sont
restées indexables parce que ce sont des pages de boutique et qu'une note
effondrée par une consigne y serait indiscernable d'une faute ; l'espace de
gestion, lui, est la coulisse du marchand, il n'a rien à faire dans un moteur.
**Cette note n'entre donc pas dans les quatre notes publiées** — elle est
relevée et expliquée, pas corrigée : la corriger reviendrait à ouvrir l'espace
de gestion aux robots pour faire un joli chiffre.

Ces notes sont relevées **hors ligne, sur la machine de développement**. Elles
donnent la santé du socle, pas la performance servie aux visiteurs : la mesure
qui engage commercialement sera refaite sur le déploiement réel.

## Les données structurées (JSON-LD)

Trois balisages, et rien de plus :

- **`Product` + `Offer`** sur les quinze fiches — nom, résumé, prix du format
  le moins cher, devise, disponibilité et adresse. Les données de **BASE**, pas
  celles de la surcouche marchand : un robot d’indexation n’a pas de
  `localStorage`, et baliser un prix que seul le navigateur du visiteur connaît
  reviendrait à publier un chiffre que personne d’autre ne voit.
- **`BreadcrumbList`** sur les mêmes fiches : Accueil → Boutique → Produit.
- **`Organization`** dans la mise en page racine : trois champs — nom, adresse
  du site, description portant le mot « démonstration ». **Sans adresse, sans
  téléphone, sans logo**, parce que le marchand n’en a pas (`marchand.ts` les
  laisse à `null`) et que le balisage doit dire la même chose que l’affichage.

**Aucune note moyenne, aucun avis.** Cette boutique n’a pas d’avis clients —
ils sont hors périmètre — et un `aggregateRating` inventé s’afficherait en
étoiles dans un résultat de recherche. C’est la donnée fausse la plus rentable
à écrire, donc la première à refuser.

Le poids ajouté est du **HTML**, pas du JavaScript : de 0,05 Ko gzip sur les
pages qui ne portent que l’organisation à 0,20 Ko sur une fiche, qui en porte
trois blocs. Le budget JavaScript des pages publiques est inchangé.

## L’intégration continue

`.github/workflows/verification.yml` — déclenché à chaque poussée sur `main` et
à chaque demande de fusion. Une seule étape utile : `npm run controle`, la même
commande qu’en local. Une chaîne d’intégration continue qui diverge de la
commande locale finit par attraper des défauts que personne ne peut reproduire.

**Aucun secret n’est requis**, et c’est la raison d’être de la décision D3 :
sans clé de prestataire, l’adaptateur simulé prend le relais et le tunnel va
jusqu’au bout. Le parcours fumigatoire traverse donc la totalité du parcours
d’achat sur un runner qui ne connaît aucun secret — et la campagne d’un
contributeur extérieur tourne exactement comme la nôtre.

Le rapport Playwright est publié en artefact **en cas d’échec seulement** : un
artefact de campagne verte n’est jamais ouvert.

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
