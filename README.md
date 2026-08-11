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

## Voir la démonstration en ligne

### → https://maison-vaubrune-demo.vercel.app

En ligne depuis le **2026-08-06**. Rien à installer, rien à créer : le paiement
tourne sur l'adaptateur **simulé** (aucune clé de prestataire n'est branchée sur
ce déploiement), et le parcours va jusqu'au bout.

Le tour complet en cinq minutes, dans l'ordre :

| Étape | Adresse | Ce qu'il y a à voir |
|---|---|---|
| 1 | [`/boutique`](https://maison-vaubrune-demo.vercel.app/boutique) | quinze produits, vingt-trois formats, groupés par famille |
| 2 | [une fiche](https://maison-vaubrune-demo.vercel.app/boutique/fromage-fermier-brebis) | le fromage : périssable, donc **sans** droit de rétractation (L. 221-28, 4°) — la fiche le dit avant l'achat |
| 3 | [`/panier`](https://maison-vaubrune-demo.vercel.app/panier) | les frais de port calculés **avant** de payer : tranche de poids, supplément isotherme, franco, et la Corse qui refuse le produit frais |
| 4 | `/commande` | le libellé imposé par l'article L. 221-14 sur le bouton, éteint tant que les conditions ne sont pas acceptées |
| 5 | l'écran de paiement | il s'annonce comme simulé et n'affiche **aucun** champ de carte, pas même désactivé |
| 6 | [`/suivi`](https://maison-vaubrune-demo.vercel.app/suivi) | la frise d'états de votre commande — six commandes d'essai sont fournies pour ceux qui n'ont pas commandé |
| 7 | [`/gestion`](https://maison-vaubrune-demo.vercel.app/gestion) | le côté marchand : tableau de bord, commandes, catalogue modifiable, modèles de courriels |

Vos essais (panier, commandes, modifications du catalogue) restent **dans votre
navigateur** et n'atteignent aucun serveur. Vider les données du site remet la
démonstration à neuf.

Le dépôt est **public et relisible** :
[github.com/arnwaldn/maison-vaubrune-demo](https://github.com/arnwaldn/maison-vaubrune-demo).

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
npm run verifier-donnees    # 6 contrôles : aucune donnée d'entreprise inventée
npm run verifier-marques    # 8 contrôles : aucune marque réelle, aucune appellation
npm run verifier-images     # 12 contrôles : nommage, manifeste, poids, dimensions
npm run verifier-typographie # 1 contrôle : aucune didone sous 20 px
npm run verifier-poids-css  # 2 contrôles : poids gzip des feuilles construites
npm run test:unitaires      # Vitest, modules purs
npm run test:parcours       # Playwright, parcours de bout en bout (2 profils)
npm run mesurer-notes       # Lighthouse sur 4 URL, écrit un relevé daté
npm run controle            # toute la chaîne, dans cet ordre
```

`npm run controle` enchaîne DIX étapes, et s'arrête à la première anomalie :

```
typecheck → verifier-catalogue → verifier-donnees → verifier-marques
         → verifier-images → verifier-typographie → test:unitaires
         → build → verifier-poids-css → test:parcours
```

Les six gardes totalisent **47 contrôles** (18 + 6 + 8 + 12 + 1 + 2).
`verifier-poids-css` vient APRÈS `build` et non avant : il mesure un livrable,
il ne peut pas rendre vert sans construction.

Les parcours viennent EN DERNIER parce qu'ils s'exécutent sur la construction
de production que l'étape précédente vient de produire — jamais sur le serveur
de développement, qui rend les pages autrement. `npm run mesurer-notes` n'est
pas dans la chaîne : la mesure demande un Chrome et plusieurs minutes, et une
garde pénible finit désactivée. Son résultat est versionné, daté, et c'est lui
qui fait foi (voir `mesures/LISEZ-MOI.md`).

Aucune variable d'environnement n'est nécessaire pour construire ou lancer le
projet : `NEXT_PUBLIC_URL_SITE` sert uniquement à écrire des adresses absolues
dans les métadonnées, le plan du site et le fichier robots. Depuis C9, elle
retombe sur l'ADRESSE DE PRODUCTION quand elle n'est pas définie, et non sur
`http://localhost:3000` — une construction qui oublie la variable publie ainsi
un plan du site juste. L'environnement reprend toujours la main en développement.

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

**Activer le paiement de test sur le déploiement** (geste du titulaire du
compte Stripe, environ deux minutes) : tableau de bord Stripe en **mode test**
→ « Développeurs » → « Clés API » → copier la clé secrète de test (préfixe
`sk_test_`) ; puis tableau de bord Vercel → projet `maison-vaubrune-demo` →
« Settings » → « Environment Variables » → ajouter `STRIPE_SECRET_KEY` pour
l'environnement *Production* → redéployer. La clé ne se met **jamais** dans le
dépôt ni dans un fichier suivi. Au retrait de la variable, le site retombe de
lui-même sur l'écran simulé — c'est le même tunnel.

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
npm run test:parcours                      # les trois profils
npx playwright test --project=bureau-1280  # un seul
npx playwright test --project=mouvement    # le site qui bouge
npx playwright test --ui                   # en mode interactif
```

Playwright joue sept campagnes sur **trois profils**, et sur la **construction
de production**, servie par `scripts/servir-production.mjs`. Le serveur de
développement rend les pages autrement : une campagne verte sur `next dev` ne
dirait rien du site livré.

Deux des trois profils — un bureau à 1280 px et un mobile à 390 px, les deux
largeurs auxquelles ce projet a été dessiné — jouent sous **mouvement réduit**.
Ce n'est pas une commodité de test, c'est la séparation de deux questions qu'on
ne mélange pas : « le site fonctionne-t-il ? » se vérifie sur un site immobile,
où un élément est à sa place ou n'y est pas ; une campagne fonctionnelle qui
attend la fin d'un fondu avant chaque assertion mesure la patience de Playwright
et devient instable le jour où une durée change.

Le troisième profil, `mouvement`, est le seul où le site bouge — et il ne joue
qu'un fichier, `mouvement.spec.ts`. Les deux autres l'écartent explicitement :
joué sur un site immobile, il échouerait à tous les coups, puisque par doctrine
il ne s'y passe rien.

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

**`vitrine.spec.ts`** — le rayon lu au **style calculé**, jamais à la source.
Elle vérifie que la bascule grille/liste recompose vraiment les cartes, que le
bouton reste d'accord avec l'affichage après un aller-retour de navigation, que
la carte prend le trait de sa famille au survol, et qu'aucun cadre de galerie
n'est plus haut que l'image qu'il contient. Elle existe parce qu'une règle CSS
qui ne s'applique pas — parce qu'elle vit dans une couche qu'un utilitaire
bat — est **indiscernable d'une règle absente** quand on relit un fichier, et
parfaitement discernable dans `getComputedStyle`. Trois défauts d'affichage
livrés et invisibles ont été trouvés ainsi.

**`tunnel.spec.ts`** — les mêmes armes, tournées vers les pages où l'on paie.
Elle lit le **style calculé** et la géométrie, jamais la source. Parmi ce qu'elle
garde : les chiffres du panier sortent réellement en chasse fixe — en comparant
leur famille à celle d'une étiquette du registre **et** à celle de la prose, parce
que les deux moitiés comptent ; deux montants de même longueur occupent la même
place quels que soient leurs chiffres ; le fondu du total dure 320 ms sous
`no-preference` et ne dure plus rien sous mouvement réduit ; les libellés sériels
gardent une graisse **dans l'axe 400-500 de la mono sous-ensemblée** ; l'écran de
paiement simulé ne porte **aucun** organe de saisie (décision D22, qui n'était
gardée par aucun test avant elle) ; et depuis que le tunnel a reçu une image de
tête, celle-ci vient bien du dossier de **sa** page, elle porte son alternative
entière, elle n'est plus légendée, et le titre, lui, n'a toujours pas le droit de
se mettre en scène.

**Cette énumération n'est pas fermée, et c'est délibéré** : trois retours client
ont déjà ajouté des cas à cette campagne, et une liste qui se voudrait complète
aurait vieilli à chacun. Le décompte qui fait foi est celui que `npm run controle`
imprime, jamais celui qu'un fichier de documentation recopie.

Elle ne vérifie aucun montant : c'est le travail de `parcours.spec.ts`, aux
valeurs exactes, et deux campagnes qui affirment le même chiffre finissent par
diverger.

**`mouvement.spec.ts`** — la seule qui tourne sur un site qui bouge, et donc la
seule qui puisse voir ce que le mouvement casse. Elle vérifie qu'un bloc sous la
ligne de flottaison est bien masqué puis révélé au défilement **et que le
contrôleur cesse de l'observer** (prouvé en comptant les appels, pas en lisant
un attribut : l'attribut dit qu'un élément a été révélé, pas qu'on a cessé de le
surveiller) ; que le fondu d'arrivée de route joue à la navigation et **jamais
au premier chargement**, en laissant la page entière ; que le défilement adouci
vit sur ses trois routes, quitte le tunnel, descend une ancre en douceur pour
atterrir **au même endroit que le régime natif**, et n'est **pas téléchargé du
tout** sous mouvement réduit — avec sa contre-épreuve ; et que le parcours
d'achat rend les mêmes montants exacts là où les pages fondent et où les blocs
se révèlent.

Elle vérifie aussi, depuis la tranche suivante, que l'état masqué des
révélations **résiste aux couches CSS** — un bloc de chacune des trois zones,
lu au style calculé dans ses deux états ; et que le texte du héros **entre à
froid** en balayant ses quatre lignes, pendant que l'image, elle, ne bouge pas
d'une image.

Quatre défauts réels ont été trouvés par elle seule, et ils étaient invisibles
partout ailleurs : le tunnel gardait par intermittence le défilement adouci
(la bibliothèque retamponnait la racine depuis une minuterie que sa propre
destruction ne purge pas) ; les ancres atterrissaient cent pixels trop bas
(une compensation ajoutée pour un manque qui n'existait pas) ; les quinze
vignettes du rayon **surgissaient au lieu de se révéler** depuis que le socle de
mouvement existait, parce qu'une règle de `@layer components` battait l'état
masqué ; et le monument de l'accueil **passait sous la photographie** au-delà de
1 472 px de fenêtre — celui-là, c'est le client qui l'a vu le premier.

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

## Les visuels

**Toutes les images de ce site, et toutes ses vidéos, ont été ENGENDRÉES PAR UNE
INTELLIGENCE ARTIFICIELLE.** C'est écrit ici, sur
`/a-propos-de-cette-demonstration` et dans les mentions légales, parce qu'une
démonstration qui montre des images engendrées sans le dire ferait exactement
ce qu'elle reproche aux autres : maquiller. La décision et son raisonnement
complet sont dans
[`contenu/decisions/007-visuels-generes.md`](contenu/decisions/007-visuels-generes.md)
(D35, qui amende D6).

Ce que cela recouvre, et ce que cela ne recouvre pas :

- **les masters**, engendrés à partir de consignes écrites et relus un par un à
  trois contrôles — l'étiquette au caractère près, le cadrage, et la signature
  décorative que le moteur pose dans un coin. **Certains ne sont plus livrés**
  sans avoir quitté le manifeste : ce sont les natures mortes qui ont engendré
  les boucles vidéo, et leur empreinte trace cette filiation. La liste fait foi
  dans [`travaux-images/manifeste.json`](travaux-images/manifeste.json), qui est
  la SOURCE du pipeline et non sa sortie ;
- **leurs dérivés**, produits par `npm run preparer-images` : recadrage sur des
  boîtes déclarées, deux formats (AVIF et son repli JPEG), plusieurs largeurs,
  métadonnées ARRACHÉES et re-vérifiées après coup. Le pipeline les énumère
  lui-même, un par un et avec le hachage du master dont chacun descend, dans les
  deux relevés de livraison
  ([`public/produits/manifeste-livre.json`](public/produits/manifeste-livre.json)
  et
  [`public/editorial/manifeste-livre.json`](public/editorial/manifeste-livre.json)) ;
- **les boucles vidéo**, produites par `npm run preparer-video` depuis des
  séquences montées à part — deux rendus par boucle, un AV1 et son repli H.264.
  Le détail par boucle n'est PAS recopié ici : il est écrit par le pipeline dans
  [`public/editorial/videos-livrees.json`](public/editorial/videos-livrees.json),
  avec le poids, les dimensions, la durée et l'empreinte de chaque fichier — une
  liste tenue à la main dans ce README aurait vieilli à chaque vidéo ajoutée, et
  elle avait déjà vieilli deux fois. Le plafond est de 1,2 Mo **par rendu
  réellement téléchargé**, quel que soit le codec (ADR 009 amendé), et c'est la
  garde des images qui le tient, fichier par fichier ;
- **aucune photographie de banque d'images**, **aucune personne**, **aucune
  marque ni signe officiel** — trois interdits fermés par D35 et tenus par deux
  gardes, l'une sur le texte, l'autre sur les octets des binaires ;
- **les silhouettes SVG** dessinées à la main en C2 n'ont pas disparu : elles
  sont devenues la structure de REPLI (produit sans visuel, impression, espace
  marchand, états vides).

Sur une boutique livrée, ces images sont remplacées par les photographies du
marchand. C'est le seul poste de ce site qui change d'ORIGINE et non de nature :
le pipeline, les plafonds de poids, les gardes et les formats restent les mêmes.

## Le fond : une matière, et un contraste qui ne se négocie pas

Le fond du site n'est pas une couleur, c'est une **matière** — un marbre clair
sous un voile, plus un grain de papier très fin. Elle est arrivée en C19, sur
trois retours successifs du client (« trop monochrome, trop vide », puis « le
fond est toujours blanc uni », puis la proposition du marbre lui-même).

Ce qu'elle coûte et ce qu'elle tient, en chiffres mesurés sur les octets
réellement servis :

| | valeur | référence |
|---|---|---|
| tuile de marbre | **35,8 Ko** en AVIF (repli JPEG 54,2 Ko) | fond de `body` : payé sur **toutes** les pages |
| écart champ → veine | **37,9** points de luminance sur 255 | cible 35-45 ; la référence du client en porte 40 à 60 |
| surface en relief | **63,4 %** de la tuile | — |
| voile appliqué | `--marbre-opacite: 0.45` | **curseur libre de 0 à 0,55** |
| grain de papier | amplitude **5,5 à 7,4** points de luminance | SVG en ligne, ≤ 2 Ko, aucune animation |

**La butée de 0,55 n'est pas un chiffre rond, elle est calculée.** Le voile
éclaircit la matière ; le baisser la fonce, et une veine plus sombre finit par
manger le contraste d'une encre. La butée a donc été trouvée par dichotomie,
encre par encre, contre la veine la plus sombre de la tuile : **c'est l'ocre des
étiquettes qui borne le curseur**, à 5,08 pour un seuil de 4,50. Les valeurs
sont lues dans la feuille de style et jamais recopiées — un curseur dont la
limite serait écrite à la main dans un commentaire mentirait à la première
retouche.

Deux conséquences qui ont demandé du travail plutôt qu'un réglage :

- **trente recolorations** : tout ce qui se pose sur la matière passe de l'encre
  douce à l'encre pleine. La règle tient en une ligne — *sur la matière, tout
  est encre, sauf l'étiquette d'ouverture qui reste ocre* — et la nuance tonale
  y disparaît : la hiérarchie s'y lit par la taille et par la famille, plus par
  la densité du gris. C'est un écart assumé avec le système de C12 ;
- **l'ocre a changé de valeur**, `#7A5714` → `#5B3E0C`. Il passait de 3,40 à
  5,08 sur la pire veine, et il s'améliore partout ailleurs. Il n'est jamais un
  fond.

À l'impression, rien de tout cela n'existe : la feuille `print` rend un **blanc
pur**, et la matière n'y laisse aucune trace.

## Le mouvement

Le site bouge, et il est parfait immobile. La doctrine complète — cinq durées,
trois courbes, vingt-et-un anti-patterns — est dans
[`contenu/decisions/009-doctrine-mouvement.md`](contenu/decisions/009-doctrine-mouvement.md)
(D37). Ce qu'il faut en retenir tient en quatre points :

- **Sans JavaScript, tout est visible.** L'état masqué des révélations n'existe
  que sous une classe posée après hydratation. Un paquet qui échoue donne un
  site complet, jamais un site vide.
- **Sous `prefers-reduced-motion: reduce`, rien ne bouge — et rien ne se
  télécharge non plus.** Le défilement adouci n'est pas chargé, et **aucune
  vidéo n'est demandée, sur aucune page** — y compris après une navigation
  cliente, mesuré au réseau. La différence entre « ne pas jouer » et « ne pas
  télécharger » se prouve au réseau, et la campagne du mouvement la prouve.
- **Deux propriétés animées, `opacity` et `transform`**, plus `clip-path` sur
  une boîte fixe. Aucune géométrie de mise en page ne bouge, donc aucun
  décalage n'est ajouté.
- **L'entrée de l'accueil joue À FROID**, sans préchargeur et sans script :
  chaque ligne du monument monte de sa propre hauteur derrière un masque
  INVISIBLE — une boîte fixe qui découpe ce qui dépasse par le bas. Aucun bloc
  coloré n'apparaît à aucun instant. Les quatre lignes sont étagées de 70 ms
  sur des rangs espacés, soit 420 ms entre la première et la dernière : on voit
  quatre gestes, pas un seul épais.

  > La première version de cette entrée faisait entrer un bloc plein qui
  > recouvrait la ligne puis se retirait en la découvrant (le patron classique
  > du « rideau »). Le client l'a refusée de ses yeux, et il avait raison : à
  > mi-course les quatre blocs se chevauchaient en une masse sombre sur le
  > héros. Le masque a remplacé le bloc, l'énergie du geste est restée, et la
  > courbe du plan directeur a pu revenir — sous un bloc, la montée se
  > terminait derrière lui, donc invisible.

## Le décalage cumulé, page par page

Ce projet a longtemps annoncé « décalage cumulé ≤ 0,002 » sans autre précision.
La tranche C19 a tranché en faveur de l'exactitude : **voici les chiffres des
quatre URL publiées, mesurés par Lighthouse au profil mobile bridé**, qui est
l'instrument dont ce README publie toutes les autres valeurs. Quatre tirages du
11/08 ; le tableau garde le PIRE de chaque page.

| Page | décalage cumulé (pire des 4 tirages) | plafond |
|---|---|---|
| accueil | 0,00000 | 0,002 |
| rayon (`/boutique`) | 0,00077 | 0,002 |
| fiche produit | 0,00000 | 0,002 |
| panier | 0,00006 | 0,002 |

**Les quatre tiennent le plafond**, et trois d'entre elles n'enregistrent aucun
décalage du tout sur les quatre tirages. Le rayon relève 0,00063 sur trois
tirages et 0,00077 sur le quatrième — c'est ce dernier qui est publié.

**La cause du rayon est connue et nommée** : un échange de police. Les polices de
repli ont des métriques ajustées (c'est ce qui a fait tomber le décalage de 0,220
à 0,002 en C1), mais leurs LARGEURS ne coïncident pas au caractère près — et une
mise en page dont le NOMBRE DE RANGS dépend de la largeur du texte se décale à
l'instant de l'échange. Trois endroits de ce type ont été trouvés et corrigés :
la ligne de garde des cartes et la liste des sept familles en C19, puis le
bandeau des sept familles repris en RANG FLEX à la racine en C19-ter — un rang
flex ne se replie jamais, donc le nombre de rangs cesse de dépendre du texte.
Cette dernière reprise a fait tomber la mesure de l'outil maison sur le rayon de
**0,0047 à 0,0018**.

**Deux instruments, deux chiffres, et le rapport s'est INVERSÉ.** L'outil de
diagnostic du dépôt mesure sous bridage RÉSEAU et relève 0,0018 sur le rayon ;
Lighthouse mesure sous bridage PROCESSEUR et relève 0,00077. Jusqu'en C19,
Lighthouse était de loin la lecture la plus sévère des deux (0,0073 contre
0,0011) et l'ordre s'est retourné avec la reprise du bandeau. **Lighthouse
continue de faire foi, et ce n'est pas parce qu'il alarme le plus** : c'est
l'instrument que ce projet publie, et un engagement énoncé dans les termes d'un
instrument ne peut pas être vérifié par un autre. Les deux valeurs sont sous le
plafond, elles sont publiées toutes les deux, et le raisonnement complet est dans
`mesures/LISEZ-MOI.md`.

**UNE PAGE ÉTAIT AU-DESSUS, ET CE N'EST PLUS SA MESURE QUI LE DIT — C'EST SA MISE
EN PAGE.** Hors des quatre URL publiées, `/commande` mesurait **0,00204 sous
mouvement réduit** à l'outil maison, pour un plafond qui vaut lui-même cinquante
fois celui de Google. Elle mesure **0,0001** depuis que le retour client n° 21 lui
a donné une image de tête, et plus aucune page du site ne dépasse le plafond
maison.

**Ce nombre est tombé, le mouvement n'a pas disparu.** Les deux mouvements réels
ont été retrouvés et nommés : sur le panneau « il n'y a rien à commander », le
chapeau et le bouton descendent ENSEMBLE de seize pixels, une fois, après
hydratation — c'est donc ce qui les précède qui grandit d'une ligne. Ils
descendent toujours des mêmes seize pixels. Ce qui a changé est leur PLACE : le
héros illustré pousse le panneau sous la ligne de flottaison, et un décalage qui
se produit hors de la fenêtre ne compte pas dans la mesure. **La cause reste donc
ouverte**, et elle est écrite ici plutôt que soldée : une page qui rendrait ce
panneau plus haut le ferait remonter dans la fenêtre, avec son décalage. Sous
Lighthouse, la même page n'est pas mesurée (D19/D21 la laissent hors des URL
publiées).

## Refaire les mesures

Les quatre notes (rapidité, accessibilité, bonnes pratiques, référencement)
sont mesurées, datées et versionnées dans `mesures/`. **Une seule commande**,
depuis la tranche C8 :

```bash
npm run mesurer-notes                                             # hors ligne
node scripts/mesurer-notes.mjs --base https://maison-vaubrune-demo.vercel.app   # en ligne
```

Elle construit le site si `.next/` est absent, le sert en production sur un
port libre, mesure **quatre URL** au profil **mobile bridé** — l'accueil, le
rayon, la fiche de l'huile d'olive et le panier —, compare chaque note à son seuil
(rapidité 90, accessibilité 100, bonnes pratiques 100, référencement 96), écrit
`mesures/lighthouse-<date>.json` et **sort en erreur** si une note passe sous
son seuil. Le mode d'emploi complet, le choix des quatre URL et ce que « hors
ligne » signifie exactement sont dans `mesures/LISEZ-MOI.md`.

Avec **`--base https://…`**, le script ne construit rien et ne sert rien : il
mesure le **déploiement réel**, avec son réseau de diffusion, sa compression et
les en-têtes réellement servis. Le relevé part alors dans un fichier distinct,
`mesures/lighthouse-en-ligne-<date>.json`, parce que confondre les deux
reviendrait à publier la note d'un site pour celle d'un autre. Les seuils sont
les mêmes : une mesure en ligne plus indulgente ne serait pas une mesure.

### Les douze notes EN LIGNE — 2026-08-06

**C'est ce relevé qui engage.** Lighthouse 13.4.1, profil mobile bridé, mesuré
depuis Internet sur `https://maison-vaubrune-demo.vercel.app`
(`mesures/lighthouse-en-ligne-2026-08-06.json`) :

| URL | Rapidité | Accessibilité | Bonnes pratiques | Référencement |
|---|---|---|---|---|
| `/` | **98** | **100** | **100** | **100** |
| `/boutique/huile-olive-premiere-pression` | **98** | **100** | **100** | **100** |
| `/panier` | **99** | **100** | **100** | **100** |

Décalage cumulé de mise en page **nul sur les trois** ; premier affichage de
contenu 0,8 à 0,9 s ; plus grand affichage 2,1 à 2,2 s ; temps de blocage 60 à
130 ms.

**Aucune note ne baisse en passant en ligne**, et le panier en gagne une
(98 → 99). L'écart se lit dans les métriques : le premier affichage tombe de
1,5 s à 0,8 s — c'est le réseau de diffusion qui sert un fichier déjà écrit,
là où la mesure locale attendait un `next start` sur une machine de bureau. Le
temps de blocage, lui, monte (50-60 ms → 60-130 ms) : c'est le même JavaScript,
analysé sur un processeur émulé quatre fois plus lent une fois le réseau cessé
d'être le facteur limitant. Il reste très en dessous du seuil de l'outil
(200 ms), et la note de rapidité ne bouge pas.

### Le relevé hors ligne, pour mémoire

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
donnent la santé du socle, pas la performance servie aux visiteurs. La mesure
qui engage commercialement a été refaite sur le déploiement réel le 2026-08-06 :
c'est le tableau « Les douze notes EN LIGNE » ci-dessus. Les deux relevés sont
conservés, et ils sont conservés SÉPARÉMENT — le premier attrape une régression
le jour où on l'introduit, sans réseau ni hébergeur ; le second est celui qu'on
montre.

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

Le dépôt étant **public**, cette chaîne est gratuite et son résultat est
visible de tous — y compris quand elle échoue, ce qui est le seul état dans
lequel un badge vert veut dire quelque chose.

## Le déploiement

Hébergé sur **Vercel**, projet `maison-vaubrune-demo`, **branché sur la branche
`main` du dépôt GitHub** : une poussée sur `main` construit et publie. Il n'y a
donc qu'une seule façon de mettre en ligne, et c'est celle que tout le monde
peut relire.

**Aucune variable d'environnement n'est définie sur le déploiement**, et c'est
la même raison qu'en intégration continue (décision D3) : sans clé de
prestataire, l'adaptateur simulé prend le relais et le tunnel va jusqu'au bout.
Un visiteur voit donc exactement ce que voit un contributeur.

Le repli de `NEXT_PUBLIC_URL_SITE` est l'adresse de **production**
(`src/donnees/site.ts`) : une construction qui oublierait la variable publie un
plan du site juste, et non l'adresse de la machine du développeur. Le
développement local reprend la main en la définissant (voir `.env.example`).

Vérifié en ligne le 2026-08-06 : `/robots.txt` (`Disallow: /gestion`, plan du
site en adresse absolue), `/sitemap.xml` (**24 adresses**, toutes sur le domaine
de production), `/formulaire-retractation.txt` servi en `text/plain`. Les
24 adresses sont la vitrine complète — quinze fiches, le rayon, l'accueil,
`/livraison`, `/suivi` et les cinq documents légaux. `/panier`, `/commande` et
le tunnel de paiement n'y figurent pas (ils restent indexables, décision D19),
et `/gestion` en est écarté deux fois : par le plan du site et par `robots.txt`.

**La campagne de bout en bout a été rejouée sur l'URL publique** — les mêmes
74 tests, les mêmes montants exacts, les deux mêmes profils : 74 verts, dont le
parcours d'achat entier jusqu'au 69,80 € et au changement d'état côté marchand.

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

**`script-src 'self' 'unsafe-inline'` — tranché le 2026-08-06 (décision D34,
[`contenu/decisions/006-csp-script-src.md`](contenu/decisions/006-csp-script-src.md)).**
L'alerte laissée ouverte par la tranche C1 est fermée. L'App Router de Next
dépose le contenu de la page dans des balises `<script>` sans `src` : 15 sur
l'accueil, 41 sur `/gestion/modeles-de-courriels`, **740 occurrences et 445
empreintes distinctes** sur les 41 pages prérendues. Sous `script-src 'self'`,
aucun ne s'exécute — le site s'affiche et reste mort.

Les trois autres voies ont été écartées, chiffres à l'appui :

- **les jetons à usage unique** exigeraient un rendu **dynamique de toutes les
  pages** (un jeton mis en cache n'est plus un jeton) : c'est la perte du
  statique, donc des notes mesurées — c'est-à-dire du produit vendu ;
- **les empreintes `sha256`** feraient un en-tête de **23,5 Ko sur chacune des
  46 routes**, et ne peuvent pas être posées par page depuis `vercel.json`, qui
  est statique : **396 des 445 empreintes n'apparaissent que sur une seule
  page**, parce que les charges utiles RSC contiennent le contenu de la page ;
- **l'export entièrement statique** n'enlève **pas** les scripts en ligne
  (`output: 'export'` change l'écriture des fichiers, pas l'hydratation de
  React — le comptage ci-dessus est fait sur des pages déjà prérendues) et
  supprimerait la route de paiement, donc la preuve centrale du projet.

**Ce que la concession ne coûte pas, et pourquoi.** `'unsafe-inline'` ne vaut que
s'il existe un chemin par lequel un tiers fait écrire quelque chose dans le HTML
rendu. Il n'y en a aucun : **aucun contenu saisi par un tiers n'est jamais
rendu** — pas de commentaire, pas d'avis, pas de recherche, pas de compte —,
**aucun script tiers** (ni régie, ni mesure d'audience, ni police distante), et
ce que le visiteur saisit vit dans **son** navigateur sans jamais voyager vers un
autre. Le seul `dangerouslySetInnerHTML` du projet est le JSON-LD, engendré
depuis le catalogue versionné et le chevron ouvrant échappé. **La surface
d'injection est nulle en amont de la politique.**

Et les autres directives ne bougent pas : `connect-src 'self'` — qui interdit
l'exfiltration, donc vide de son intérêt le scénario que `'unsafe-inline'` rend
théoriquement possible —, `object-src 'none'`, `frame-src 'none'`,
`frame-ancestors 'none'`, `base-uri 'none'` (plus strict que le `'self'` qui
aurait suffi), `form-action 'self'`, `img-src 'self' data:`,
`upgrade-insecure-requests`.

> **L'en-tête cesse d'être une preuve de plus, les huit autres le restent.**

La décision D34 écrit aussi le chemin du retour en arrière — jeton posé par un
`middleware.ts` et `'strict-dynamic'` — pour le jour où ce socle servira une
boutique qui rend, elle, du contenu saisi par des tiers.

**Validée en ligne, pas sur relecture.** Le parcours d'achat entier a été rejoué
sur l'URL publique avec la console sous surveillance — messages de console,
exceptions non rattrapées et, surtout, l'événement `securitypolicyviolation`
que le navigateur émet dans la page à chaque directive enfreinte. Résultat :
**0 message, 0 exception, 0 violation**.

Les neuf en-têtes réellement servis, relevés au `curl` le 2026-08-06 :

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
  connect-src 'self'; form-action 'self'; frame-ancestors 'none';
  base-uri 'none'; object-src 'none'; frame-src 'none';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(),
  browsing-topics=(), usb=(), serial=(), bluetooth=(), display-capture=(),
  idle-detection=(), screen-wake-lock=(), midi=(), xr-spatial-tracking=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Permitted-Cross-Domain-Policies: none
```

## Les décisions et pourquoi

Chaque décision structurante est consignée dans `contenu/decisions/`, datée
et argumentée. La première est le choix du nom ; les dix décisions techniques
fondatrices (stack, absence de base de données, adaptateur de paiement,
illustrations dessinées, zones d'expédition…) sont résumées dans
`.claude/CLAUDE.md` et détaillées au fil des tranches.
