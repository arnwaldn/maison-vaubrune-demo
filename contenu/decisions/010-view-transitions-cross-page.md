# Décision 010 (D38) — La transition entre deux pages : REJET MOTIVÉ

- **Date** : 2026-08-10
- **Tranche** : C18 (« Signature ② & View Transitions cross-page, sous garde »)
- **Statut** : gravé — **rejet**, avec conditions de ré-évaluation
- **Porte sur** : `experimental.viewTransition` de Next 15.5.22, le drapeau qui
  devait porter la signature ② du plan directeur, « le passage à l'étal »
  (morph vignette du rayon → fiche produit).
- **Ce qui reste titulaire** : `TransitionPage` (C17) — un fondu d'arrivée de
  route de 900 ms, +0,991 Ko de premier chargement, décalage cumulé nul.

## Ce que la décision dit en une phrase

**Sur cette pile, le drapeau coûte 12,20 Ko de JavaScript sur les vingt-deux
routes du site et ne fait rien du tout.**

> **Le chiffre a été corrigé au round 1 de revue.** La première rédaction
> écrivait « 12,5 Ko » et attribuait au drapeau la totalité de l'écart mesuré
> contre `d55c520`. C'est un amalgame : sur les **12,507 Ko** relevés avec le
> drapeau, **0,307 appartient au reste de la tranche** (les composants et la
> feuille, mesurés seuls une fois le drapeau retiré). Le coût PROPRE du drapeau
> est la différence, **12,20 Ko**. Le rejet ne bouge pas d'un cheveu — il tenait
> déjà sur deux routes publiques hors budget — mais un coût d'arbitrage se cite
> net de ce qui ne lui revient pas, sans quoi la condition de ré-évaluation
> chiffrée du § 6 se compare à un nombre faux.

## 1. Le protocole, parce qu'un rejet sans protocole est un renoncement

Le plan directeur (risque R16) et la décision D37 disaient la même chose :
la transition entre deux pages est interdite **hors évaluation**, l'évaluation
est une tranche à elle seule, sur branche, et l'adoption n'a lieu que si toutes
les mesures restent intactes. Le brief de C18 en a tiré six critères.

Le drapeau a donc été **réellement posé**, la paire réellement nommée
(`view-transition-name` par slug sur la vignette et son titre, sur la vue
principale de la fiche et son `<h1>`), le harnais rejoué, les budgets rejoués,
et le comportement observé au navigateur. Puis le drapeau a été retiré **seul**,
tout le reste identique, et les mêmes budgets rejoués — c'est cette seconde
mesure qui attribue le coût au drapeau et non à la tranche.

Relevé complet : `preuves/c18/verdict-view-transition.txt` et
`preuves/c18/morphe-cross-page.txt`.

## 2. Le critère rompu : le premier chargement

Table de `npm run build`, colonne « First Load JS ». Budget de la décision D36 :
**125 Ko pour les pages publiques**, 140 pour `/gestion`.

| route | sans le drapeau | avec le drapeau | budget |
|---|---|---|---|
| socle partagé | 103 kB | **115 kB** | — |
| `/` | 106 kB | 119 kB | 125 |
| `/boutique` | 109 kB | 122 kB | 125 |
| `/boutique/[produit]` | 113 kB | **125 kB** | 125 — à la limite |
| `/panier` | 114 kB | **126 kB** | 125 — **dépassé** |
| `/commande` | 119 kB | **132 kB** | 125 — **dépassé** |
| `/commande/confirmation` | 113 kB | **125 kB** | 125 — à la limite |

Relevé à l'octet (`preuves/c17/first-load-precis.mjs`, gzip niveau 9, somme des
morceaux d'entrée de chaque route, mises en page comprises) :

- **avec** le drapeau : **+12,507 Ko** gzip au pire, sur les vingt-deux routes ;
- **sans** le drapeau : **+0,307 Ko** gzip au pire, sur les vingt-deux routes.

Le critère n° 4 du brief — « First Load ≤ 125 Ko public » — est rompu sur deux
routes publiques. La règle du plan ne laisse aucune marge d'interprétation :
**un critère rompu vaut retrait complet.**

## 3. Le motif de fond : le drapeau ne fait rien sur cette pile

C'est la partie qui rend le rejet définitif plutôt que provisoire, et elle a
demandé d'observer au lieu de supposer.

Un espion posé sur `document.startViewTransition` **avant le premier script de
la page**, sur une navigation vignette → fiche, dans les deux régimes :

```
startViewTransition disponible dans le navigateur   oui
appels du routeur                                     0
groupes ::view-transition-group appariés              0
```

**Zéro appel.** La cause a été vérifiée et non déduite : le drapeau de Next
expose l'API `ViewTransition` **de React** ; il n'enveloppe pas les navigations
de lui-même. Or la version installée ne porte pas cette API :

```
react 19.2.8
React.unstable_ViewTransition : undefined
```

Il faudrait une version **canari** de React pour que le composant existe. Sur la
pile de ce projet — Next 15.5.22 et React 19.2.8 stables, tous deux épinglés par
la décision D1 —, le drapeau est donc un **coût pur** : douze kilooctets et deux
dixièmes sur vingt-deux routes, y compris le tunnel où l'on paie, les cinq
documents légaux et l'espace marchand, pour un geste qui n'aurait concerné que
deux pages et qui n'a pas lieu.

**Une fonctionnalité qui coûte sans rendre n'est pas un arbitrage : c'est une
soustraction.**

### 3 bis. D'où sortent les 12,20 Ko — ce n'est pas la fonctionnalité qui pèse,
### c'est le CHANGEMENT DE CANAL

Trouvé par la revue de C18, et vérifiable en trois lignes dans les dépendances
installées plutôt que déduit d'un raisonnement. La question restait ouverte :
comment une fonctionnalité qui ne s'exécute jamais peut-elle coûter douze
kilooctets ? Réponse : **le drapeau ne fait pas entrer du code de transition,
il fait basculer Next sur ses runtimes React EXPÉRIMENTAUX.**

`node_modules/next/dist/lib/needs-experimental-react.js` :

```js
function needsExperimentalReact(config) {
  const { ppr, taint, viewTransition, routerBFCache } = config.experimental || {};
  return Boolean(ppr || taint || viewTransition || routerBFCache);
}
```

Dès que ce prédicat rend vrai, Next sert `app-page-experimental.runtime.prod.js`
au lieu de `app-page.runtime.prod.js` (les deux familles cohabitent dans
`next/dist/compiled/next-server/`). Le surcoût est celui d'une build de React
compilée avec ses drapeaux expérimentaux actifs — payé sur **toutes** les routes,
qu'elles portent un `view-transition-name` ou non, ce qui explique le socle
partagé et non les seules deux pages concernées.

**Trois conséquences à garder :**

1. Le coût **ne diminuera pas** en réduisant le nombre de paires nommées : il ne
   dépend pas d'elles. Une évaluation future qui essaierait « juste une paire,
   pour voir » paierait le même prix.
2. Le prédicat est un **OU** sur quatre drapeaux. `ppr`, `taint` et
   `routerBFCache` basculent le même interrupteur : si l'un d'eux est adopté un
   jour pour un autre motif, le canal expérimental est déjà payé et le coût
   MARGINAL de `viewTransition` retombe à ~0. **C'est une quatrième condition de
   ré-évaluation**, et elle ne dépend pas de React.
3. Inversement, aucun de ces quatre drapeaux ne doit être posé sans rejouer
   `first-load-precis.mjs` : le budget D36 se franchit ici sans qu'une seule
   ligne de `src/` ait changé.

## 4. Ce que le rejet abandonne, et ce qu'il ne coûte pas

Il abandonne la signature ② dans sa forme cross-page. Il n'abandonne **pas** :

- **les View Transitions same-document**, qui n'ont jamais eu besoin du drapeau
  et qui tournent depuis C15 sur la bascule grille/liste du rayon. Elles sont
  l'API du navigateur, en amélioration progressive, et D37 les autorise
  d'emblée ;
- **la transition d'arrivée de route**, que `TransitionPage` assure depuis C17 —
  c'est très exactement le titulaire que le plan directeur avait prévu en repli,
  et il est mesuré : 900 ms, +0,991 Ko, décalage cumulé nul.

Le site perd donc un morph qu'il n'a jamais eu, et garde tout ce qu'il avait.

## 5. Un effet de bord du protocole, qui vaut d'être gravé

Poser un `view-transition-name` sur les quinze vignettes du rayon n'est pas
neutre **même sans le drapeau** : ces noms entrent dans les transitions
**same-document**, donc dans la bascule grille/liste de C15, où ils feraient
animer chaque vignette séparément au lieu du rayon d'un seul tenant.

C'est pourquoi le retrait porte aussi sur les noms, et pas seulement sur le
drapeau. **Un retrait partiel aurait laissé un effet de bord sur une
fonctionnalité livrée** — le genre de reliquat qu'on retrouve deux tranches plus
tard sans savoir d'où il vient.

## 6. Conditions de ré-évaluation

La question se rouvre quand **les trois** conditions suivantes sont réunies, et
pas avant — **ou** quand la quatrième, ajoutée au round 1 par le mécanisme du
§ 3 bis, rend la troisième sans objet :

1. **React expose `ViewTransition` dans une version stable**, et la pile du
   projet l'atteint sans passer par une version canari. C'est la condition
   bloquante : tout le reste est sans objet tant qu'elle n'est pas remplie.
2. **Next branche le drapeau sur le routeur** de façon documentée et non
   expérimentale, ou expose un point d'accroche qui ne coûte rien aux routes qui
   ne s'en servent pas.
3. **Le surcoût de premier chargement redescend sous la marge disponible.** Elle
   se calcule, elle ne s'estime pas : au sommet de C18, la route publique la plus
   chargée est `/commande` à 119 Ko pour un plafond de 125, soit **6 Ko**. Un
   drapeau qui coûterait douze kilooctets et deux dixièmes resterait refusé même
   s'il fonctionnait parfaitement.
4. **OU BIEN le canal expérimental est DÉJÀ payé** — c'est-à-dire que `ppr`,
   `taint` ou `routerBFCache` a été adopté pour un motif propre, avec sa propre
   décision et sa propre mesure. Le prédicat de Next étant un OU sur les quatre
   drapeaux (§ 3 bis), le coût marginal de `viewTransition` retombe alors à
   presque rien, et la condition n° 3 devient sans objet. Les conditions n° 1 et
   n° 2 restent, elles, entières : un drapeau gratuit qui ne fait rien reste un
   drapeau qui ne fait rien.

Le chemin de retour est d'une ligne : le drapeau dans `next.config.ts`, le
module `src/lib/morphe.ts` (retiré ici, retrouvable à
`git show` du commit d'activation de C18) et deux attributs de style. La tranche
qui rouvrira le dossier n'aura pas à refaire le raisonnement — seulement à
rejouer les mesures.

## Ce que cette décision n'est pas

Elle n'est pas un jugement sur les View Transitions, qui sont une bonne API et
que ce site emploie déjà. Elle porte sur **un drapeau expérimental, sur une pile
donnée, à une date donnée**, et elle dit les trois chiffres qui l'ont décidée.
