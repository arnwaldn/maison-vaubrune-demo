# Décision 011 — Bilan de la refonte « calibre Awwwards » (C11 → C19)

- **Date** : 2026-08-10
- **Tranche** : C19 (dernière tranche de code)
- **Statut** : gravé
- **Objet** : ce qui a été **adopté**, **rejeté** et **écarté** au cours des neuf
  tranches de la refonte, et pourquoi. Ce document n'est pas un compte rendu :
  les comptes rendus décrivent ce qui a été fait, celui-ci décrit ce qui a été
  DÉCIDÉ, y compris — et surtout — ce qui ne se voit pas dans le produit.

---

## Pourquoi ce document existe

Une refonte visuelle laisse deux traces : le site, et la liste des choses qu'on
n'y a pas mises. La seconde disparaît toujours, et c'est elle qui coûte le plus
cher à reconstituer — la tranche suivante rouvre une question déjà tranchée,
refait la mesure, et arrive à la même conclusion trois heures plus tard.

Cinq rejets de cette refonte ont été **mesurés avant d'être prononcés**. Ils
valent chacun une demi-journée à qui reprendra ce socle.

---

## 1. ADOPTÉ

| Ce qui entre | Tranche | Ce qui l'a fait entrer |
|---|---|---|
| **Trio typographique** Bodoni Moda / Schibsted Grotesk / Spline Sans Mono | C12 | Le trio pèse **15,0 Ko de MOINS** que le duo qu'il remplace : la mono et l'italique ne sont téléchargées par personne tant qu'aucun élément rendu ne les emploie. |
| **Registre mono sous-ensemblé** | C14 | 36 476 → **13 176 octets** par page. Deux leviers mesurés séparément : le sous-ensemblage seul n'en rend qu'un tiers, la restriction de l'axe de graisse fait le reste. |
| **Pipeline d'images hors ligne** (sharp, outil de poste) | C14 | Aucune image traitée à l'exécution, `next/image` écarté pour ne pas remettre sharp dans le graphe d'exécution. 230 dérivés, 5,40 Mo au dépôt. |
| **`<Visuel>` serveur** | C14 | Zéro octet de JavaScript, premier chargement identique à l'octet. |
| **Fondu croisé des cartes en CSS pur** | C15, revu C19 | La vue d'ambiance n'est demandée qu'au survol : quinze de plus auraient porté le rayon de 129 à ~250 Ko pour un plafond de 180. |
| **Socle de mouvement** (fournisseur unique, révélations à attributs) | C17 | **+0,991 Ko gzip** sur les vingt-deux routes pour un budget de 2,5. Lenis dans un morceau à la demande de 5,4 Ko qu'aucune entrée ne déclare. |
| **Défilement adouci sur trois routes** | C17 | Jamais le tunnel — on n'adoucit pas le défilement de quelqu'un qui vérifie un montant avant de payer. |
| **Entrée à froid par `@starting-style`** | C18 | La quatrième voie : elle ne pose aucun état persistant, donc la dégradation est « pas d'animation », jamais « invisible ». |
| **Bloc de balayage du héros** | C19 | Retour client (« beaucoup trop discrète ») sur un geste qui FONCTIONNAIT. Réponse : un geste d'une autre nature, pas le même en plus long. |
| **Vidéo du héros** | C19 | Décision client. L'interdit n° 17 de D37 est LEVÉ, ses cinq conditions tenues, une sixième ajoutée à l'usage. |
| **Matière de papier** (grain + lavis) | C19 | Retour client (« trop monochrome »). Coût mesuré sur les pixels : le pire couple de texte garde +0,88 au-dessus d'AA. |

### L'inspiration du balayage, créditée

Le patron de la révélation par blocs vient de **Codrops, « Text Block
Transitions »** (licence MIT, donc réutilisable). Il n'est PAS importé : leurs
démonstrations orchestrent en JavaScript, la nôtre n'a pas un octet de script —
deux animations CSS, un pseudo-élément, et le vocabulaire fermé de D37. Ce qui
est repris est l'IDÉE (un bloc plein qui balaie une ligne et la découvre), pas
le code. Le site ne cite pas ses inspirations ; cette décision, si.

---

## 2. REJETÉ — après mesure

### `experimental.viewTransition` (C18, décision 010)

**Le drapeau coûte 12,20 Ko gzip sur les vingt-deux routes et ne fait rien.**
Ce n'est pas la fonctionnalité qui pèse : c'est un CHANGEMENT DE CANAL.
`needsExperimentalReact()` de Next rend vrai dès que `viewTransition`, `ppr`,
`taint` ou `routerBFCache` est posé, et Next sert alors ses runtimes React
expérimentaux — d'où le coût sur le socle partagé. Deux routes publiques
passaient au-dessus du plafond de 125 Ko. Et zéro appel de
`startViewTransition` : le drapeau expose l'API ViewTransition **de React**, que
React 19.2.8 ne porte pas.

**Un rejet documenté vaut une adoption.** Trois conditions de ré-évaluation sont
écrites, dont une qui se calcule.

### L'italique de Bodoni (C18, et c'est le rejet le plus instructif)

Le plan directeur demandait le bandeau des familles « en italique ». Elle a été
écrite, mesurée, puis défaite — dans cet ordre, qui est le seul honnête.

    premier affichage de l'accueil   1,54 · 1,54 · 1,55 s   puis   1,83 s
    les trois autres pages           inchangées

Les 53,8 Ko du second fichier de police valent **285 ms** sous le bridage de la
mesure. **Une police n'entre dans AUCUN budget écrit de D36** — qui plafonne le
JavaScript, les images et le CSS. Elle aurait donc passé toutes les gardes.

**Ce qu'elle ne passe pas est la ligne rouge du projet : aucun effet n'est
conservé au prix d'une note.** C'est la seule règle de cette refonte qui ne
s'écrit pas en kilooctets, et c'est celle qui a tranché le plus de fois.

Le rejet n'avait pas eu de trace écrite à sa tranche, contrairement à celui des
transitions de vue — deux poids, deux mesures, relevé par la revue de C18. Il en
a une ici.

### Le texte posé sur l'image du héros (C15, confirmé trois fois)

Un texte sur une photographie n'a pas de contraste **mesurable** : il a celui du
pixel qui passe derrière, et ce projet vend des contrastes mesurés. Un voile
dégradé rendrait le contraste calculable au prix d'un voile sur la
photographie — c'est-à-dire en abîmant ce qu'on venait montrer. Le monument est
donc À CÔTÉ.

La vidéo de C19 a **renforcé** ce rejet au lieu de le rouvrir : la mesure de
l'opérateur montre que la moitié droite du cadre est calme mais PAS immobile
(écart-type temporel de 2,8 sur 255 à 90-95 % de la largeur). Un texte y aurait
en plus un fond qui bouge.

### L'en-tête transparent au sommet (C13)

Le plan le demandait. Trois raisons de l'écarter, dont une qui décide : le fond
du site EST la coquille, donc un en-tête transparent en est la copie exacte ; il
laisserait le fil d'Ariane d'une fiche traverser la navigation (48 px de
recouvrement mesurés) ; et **un fond transparent n'a pas de contraste
mesurable**, ce que le critère de sortie exige à tout moment du défilement.

### Le bandeau défilant des sept familles (C19)

Livré en C18 — `animation-timeline: view()`, zéro octet de JavaScript — et
**retiré sur verdict client** : « ne sert pas grand-chose ». Le motif se tient :
la rangée des familles, quinze lignes plus bas, porte les mêmes sept noms en
sept liens avec leurs macros. Le bandeau en était l'écho muet.

C'est le seul élément de cette refonte retiré pour une raison qui n'est ni une
mesure ni une doctrine, et c'est la bonne raison : **un ornement qui ne sert à
personne coûte toujours plus qu'il ne rapporte, quel que soit son poids.** La
démonstration technique reste écrite ici ; le site n'a pas à la porter.

---

## 3. ÉCARTÉ — sans être rejeté

- **GSAP**, jamais en premier chargement et en l'état pas du tout (D36).
- **LQIP sur le héros** (C15) : la couleur de réservation fait déjà le travail,
  et un aperçu en base64 aurait chargé le HTML de la page mesurée.
- **`principal-928`** (C14) : structurellement impossible — la signature du
  moteur d'images commence à x=781 sur un master de 928.
- **L'attribut `poster` de la vidéo** (C19) : il aurait désigné une largeur
  fixe, donc déclenché un second téléchargement de la même image sur les écrans
  où le `sizes` en choisit une autre. Le `<Visuel>` EST l'affiche.
- **L'en-tête mobile repliable** : point PRODUIT, pièce de décision préparée
  (`preuves/c19/entete-mobile-piece.*`), verdict au client.

---

## 4. LE DÉSACCORD D'INSTRUMENTS, TRANCHÉ (C19)

Deux mesureurs de décalage cumulé cohabitaient, et ils ne disaient pas la même
chose sur `/boutique` : **0,0073 chez Lighthouse, 0,0011 pour l'outil maison**.
L'écart a traversé trois tranches, et chaque résumé citait le chiffre qui
l'arrangeait.

**Ce n'est pas un désaccord, c'est un point de fonctionnement.** Le défaut est un
échange de police, et un échange de police ne décale que s'il arrive APRÈS le
premier affichage :

| régime | décalage cumulé de `/boutique` |
|---|---|
| sans bridage | **0,00000** — zéro décalage enregistré |
| bridage réseau (outil maison) | 0,00462 |
| bridage processeur (Lighthouse) | **0,00729** |

**LA RÈGLE EST LIGHTHOUSE** : c'est l'instrument que ce projet publie, c'est la
lecture pessimiste, et un engagement énoncé dans les termes d'un instrument ne
se vérifie pas avec un autre. L'outil maison reste, irremplaçable comme
**diagnostic** — lui seul rend les SOURCES de chaque décalage — et ne doit plus
jamais être cité comme un résultat publié.

Deux défauts réels de la même famille ont été trouvés et corrigés au passage (la
ligne de garde des cartes, la liste des sept familles), sans ramener la mesure
Lighthouse sous 0,002. **Le README dit donc les cinq chiffres, pas une
moyenne** — c'est la règle du plan directeur appliquée à la lettre : « CLS
≤ 0,002, ou l'engagement est retiré du README, pas de troisième voie ».

---

## 5. LES SIX LEÇONS QUI SURVIVRONT À CE PROJET

1. **Contrôler la propriété, pas son indice** (C13). Un contrôle qui cherche la
   MARQUE d'un défaut ne trouve que les défauts qui la portent.
2. **Mesurer l'effet, pas la propriété** (C15, C16). Une règle qui ne s'applique
   pas est indiscernable d'une règle absente dans un fichier ; elle est
   parfaitement discernable dans `getComputedStyle`.
3. **Toute règle d'état face à un utilitaire se pense en COUCHE** (D37,
   anti-patron n° 21). C'est la couche qui décide avant la spécificité.
4. **Tout poids publié se mesure sur construction FRAÎCHE** (C18 → C19). Le
   9,52 Ko annoncé valait 9,27 : personne n'a menti et le chiffre était faux.
5. **Une mise en page dont le NOMBRE DE RANGS dépend de la largeur du texte
   décale tout ce qui la suit** (C13, retrouvé deux fois en C19). Le correctif
   n'est jamais un délai : c'est le retrait de la dépendance.
6. **Preuve rouge d'abord, pour toute garde neuve.** Une garde qui ne s'est
   jamais déclenchée est une garde dont personne ne sait si elle fonctionne — et
   une preuve rouge qui ne rougit pas prouve seulement qu'on n'a pas retiré la
   bonne chose (C16).

---

## 6. CE QUE CETTE DÉCISION NE DIT PAS

Elle ne juge pas le résultat visuel : c'est au client de le faire, et la tranche
C19 s'arrête volontairement avant la publication pour qu'il le fasse. Elle ne
clôt pas non plus les arbitrages de produit restés ouverts — l'en-tête mobile,
l'intensité du balayage, le grain du papier — qui appellent un œil, pas une
mesure.
