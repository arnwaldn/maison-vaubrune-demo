# Décision 008 (D36) — Les budgets révisés, poste par poste

- **Date** : 2026-08-06
- **Tranche** : C11 (préparation de la refonte visuelle)
- **Statut** : gravé (les plafonds s'appliquent à partir de C12 ; le seuil de
  rapidité est appliqué dans `scripts/mesurer-notes.mjs` dès cette tranche)
- **Objet** : la refonte introduit un socle de mouvement, des images produit et
  une transition de page. Le budget public de 120 Ko de First Load JS tenait
  depuis C6 avec 1 à 2,4 Ko de marge. Faut-il le tenir, et à quel prix ?

## Le principe qui ne change pas

Un budget se fixe **en absolu**, il se **mesure**, et on le révise **par
écrit** — jamais en silence, jamais après coup pour couvrir un dépassement. Ce
document est cette révision-là, écrite AVANT la première ligne de la refonte.

## First Load JS : 120 → 125 Ko sur les pages publiques

`/gestion` reste à **140 Ko**, inchangé : la refonte ne touche pas l'espace
marchand.

Les cinq kilooctets ne sont pas une marge de confort demandée en bloc. Ils sont
la somme d'un devis poste par poste, et chaque poste est nommé pour qu'on
puisse le contredire à la mesure :

| Poste | Coût estimé (gzip) |
|---|---|
| Provider de mouvement (montage, classe `html.mouvement`, écoute du réglage système) | ~0,4 Ko |
| Contrôleur de révélation (un `IntersectionObserver` global, à attributs) | ~0,8 Ko |
| Transition de page (appel conditionnel, repli silencieux) | ~0,3 Ko |
| Sentinelles (en-tête compact, bandeau piloté par le défilement) | 0,3 à 0,8 Ko |
| **Sous-total** | **1,8 à 2,3 Ko** |
| Marge de regroupement de l'empaqueteur, CONSTATÉE en C6 | 1 à 2,4 Ko |
| **Total** | **2,8 à 4,7 Ko** |

La dernière ligne est celle qu'on oublie toujours et qui a déjà mordu une fois.
En C6, l'objectif « +2 Ko par tranche » a été dépassé de 1 à 2,4 Ko **sans
qu'une seule ligne de code supplémentaire soit écrite** : l'empaqueteur avait
redécoupé ses groupes de morceaux. C'est un coût réel, reproductible, et le
budget doit le porter au lieu de le découvrir.

Cinq kilooctets couvrent donc le devis haut avec quelques centaines d'octets
d'écart. C'est étroit, et c'est voulu : un budget qu'on ne risque pas de
toucher n'est pas un budget.

## Les plafonds nouveaux

Le First Load JS ne dit pas tout — c'est une colonne du tableau de `next build`,
qui ignore ce qu'un import dynamique télécharge ensuite et ce que pèsent les
images. Quatre plafonds nouveaux ferment ces angles morts :

| Grandeur | Plafond | Ce qu'elle empêche |
|---|---|---|
| JS total transféré **au chargement** | ≤ 145 Ko | qu'un import dynamique déclenché à la première image d'animation contourne le budget de First Load |
| JS total transféré **après parcours complet** | ≤ 190 Ko | la même chose, étalée sur la visite : accueil → rayon → fiche → panier |
| Poids image sur `/boutique` | ≤ 180 Ko | quinze vignettes qui coûteraient plus cher que tout le JavaScript du site |
| Poids image sur une fiche | ≤ 120 Ko | un visuel principal servi en pleine résolution à un téléphone |
| CSS | ≤ 12 Ko gzip | qu'une refonte visuelle se paie en feuilles de style plutôt qu'en scripts, et passe donc sous le radar du budget JS |

Les deux plafonds d'image sont ceux qui décideront de la refonte : ils
imposent l'`avif`, les tailles multiples et le chargement paresseux hors du
premier écran. C'est `scripts/verifier-images.mjs` qui tient les plafonds par
fichier ; ceux-ci sont les plafonds par PAGE, qui se mesurent au parcours.

## Le seuil de rapidité : 92 → 90

`scripts/mesurer-notes.mjs` refuse une campagne dont une note tombe sous son
seuil. Les quatre seuils étaient 92 / 100 / 100 / 96 ; le premier passe à
**90**, les trois autres ne bougent pas d'un point.

Ce point mérite d'être dit franchement, parce que c'est le seul endroit de
cette décision où l'exigence BAISSE. Trois éléments :

1. **La marge mesurée est de huit points, pas de six.** Les relevés du 06/08
   donnent 98 et 99 en rapidité, en local comme en ligne. Le seuil à 92 laissait
   six points ; à 90 il en laisse huit. Ce n'est pas la note qui baisse, c'est le
   plancher.
2. **Les images sont le poste le plus volatil d'une note de rapidité.** Le plus
   grand affichage de contenu d'une fiche deviendra une image et non plus un
   titre — un poste qui dépend du réseau du visiteur bien plus que du code.
3. **L'offre vend « 4 notes ≥ 90 mesurées et datées ».** C'est le chiffre du
   site portfolio ; le seuil de la garde s'aligne dessus au lieu de vivre sa
   vie deux points au-dessus. Arbitrage validé par le client le 06/08.

Ce que la baisse ne fait PAS : autoriser une note à baisser sans qu'on le voie.
Les relevés restent versionnés et datés dans `mesures/`, et une note qui
passerait de 98 à 91 tiendrait le seuil tout en étant une régression de sept
points, visible dans le fichier. Le seuil est un plancher, pas un objectif.

## GSAP n'entre jamais dans le First Load — et, en l'état, n'entre pas du tout

La règle a deux étages, et il faut les tenir séparés.

**La règle permanente** : GSAP, s'il entrait un jour, n'entrerait **jamais**
dans le First Load. Une bibliothèque d'animation est du confort visuel ; la
payer sur la première page d'un visiteur qui n'a peut-être pas d'animation
activée est le contraire d'un arbitrage.

**Le constat de la conception actuelle** : GSAP **n'entre pas du tout**. Non
par principe esthétique, mais parce qu'il ne reste rien à lui faire faire. Ce
que la refonte demande est couvert, poste pour poste, par ce que le navigateur
sait déjà :

| Besoin | Ce qui le couvre |
|---|---|
| Révélations au défilement | `IntersectionObserver` + transition CSS |
| Cascades, courbes, durées | variables CSS et `transition-delay` |
| Effets liés à la position de défilement | `animation-timeline: scroll()` là où il est disponible, repli statique sinon |
| Transition entre deux pages | `document.startViewTransition` en amélioration progressive |
| Défilement adouci | Lenis, en import dynamique et hors First Load |

Le poids évité est de l'ordre de trente kilooctets compressés pour le noyau
seul — soit six fois le budget que cette décision vient d'accorder à
l'ensemble du socle de mouvement. Le jour où un besoin réel résisterait à cette
liste, il faudra une décision, un chiffre et un import dynamique. Pas un
`import gsap` en tête de fichier.
