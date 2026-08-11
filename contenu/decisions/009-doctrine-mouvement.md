# Décision 009 (D37) — La doctrine du mouvement : « la matière lente »

- **Date** : 2026-08-06
- **Tranche** : C11 (préparation de la refonte visuelle)
- **Statut** : gravé (le vocabulaire et l'architecture sont mis en œuvre à
  partir de C12 ; les interdits valent dès maintenant)
- **Amendement C19 (2026-08-10)** : **l'interdit n° 17 est LEVÉ** — le premier
  écran de l'accueil porte une vidéo. La décision vient du client, sur la
  prévisualisation de branche ; elle contredit le plan directeur, qui excluait
  la vidéo du héros. Ce n'est pas une entorse à la doctrine : c'est le
  fonctionnement prévu. L'interdit avait été écrit AVEC ses cinq conditions de
  retour, et c'est ce qui a permis de le lever en une tranche au lieu d'en
  débattre. **Les cinq sont tenues, et deux ont été reformulées à la mesure :**

  1. **Le plafond ne porte plus sur un codec mais sur CE QUI EST TÉLÉCHARGÉ.**
     La formule d'origine — « ≤ 1,2 Mo en AV1 » — laissait un repli grossir
     sans limite, alors que le visiteur qui reçoit le repli paie le repli et
     non la moyenne. Elle se lit désormais : **≤ 1,2 Mo pour le rendu
     réellement téléchargé, quel que soit le codec.** Mesurés sur les octets
     livrés de la boucle qui a décidé — celle du héros de l'accueil, la seule du
     site à cette date : **AV1 407,5 Ko, H.264 1 077,3 Ko**, un seul des deux
     part sur le réseau. Les poids des boucles ajoutées depuis ne sont pas
     recopiés ici : cette décision porte sa mesure, elle ne tient pas l'inventaire
     du site. La garde des images tient le plafond sur chaque fichier, avec la
     même valeur (`boucle-1280`, 1 200 Kio).
  2. **DEUX sources et non une.** AV1 seul laisserait une part notable du parc
     mobile devant l'affiche ; H.264 seul coûterait deux fois et demie le poids
     à tout le monde. Les deux sont déclarées, AV1 d'abord, chacune avec sa
     chaîne `codecs` complète — sans elle le repli ne fonctionne pas, le
     navigateur ne voyant que deux `video/mp4` identiques.
  3. **L'affiche est l'image qui est déjà là.** Le plus grand affichage de
     contenu reste la macro AVIF d'aujourd'hui, en priorité haute ; la vidéo
     est posée par-dessus, à l'opacité nulle, et ne se montre qu'à son
     événement `playing`. L'attribut `poster` n'est PAS employé, et c'est
     mieux ainsi : il aurait désigné une largeur fixe, donc déclenché un second
     téléchargement de la même image sur les écrans où le `sizes` en choisit
     une autre — pour une affiche que personne ne voit. Le raccord (la vidéo
     ouvre sur un creux d'impact, la macro montre une couronne pleine) se règle
     par le fondu d'entrée, sur `--ms-revele`.
  4. **`preload="none"`, chargement par `IntersectionObserver`**, dans la
     frontière cliente EXISTANTE (D26 tenue : aucun îlot de plus).
  5. **`media-src 'self'`** ajouté à la politique de sécurité du contenu, avec
     sa justification à la décision 006.

  **UNE SIXIÈME CONDITION S'EST AJOUTÉE À L'USAGE, et elle est la plus
  importante : sous `prefers-reduced-motion: reduce`, PAS UN OCTET ne part.**
  Ce n'est pas « la vidéo ne joue pas » — l'effet client sort avant même de
  chercher l'élément, donc `preload="none"` n'est jamais levé. La différence ne
  se lit ni dans le style calculé ni dans un attribut : elle se prouve au
  réseau, et la campagne du mouvement la prouve au réseau (WCAG 2.2.2).

  Ce que la vidéo NE FAIT PAS, et qui reste interdit : porter du texte. La
  décision a été confirmée trois fois, et la mesure de l'opérateur l'a
  renforcée — la moitié droite du cadre est calme mais PAS immobile (écart-type
  temporel de 2,8 sur 255 à 90-95 % de la largeur). Un texte y aurait un fond
  qui bouge, en plus de n'avoir aucun contraste mesurable.
- **Amendement C19-ter (2026-08-11)** : **l'entrée du BLOC-TITRE est généralisée
  à toutes les pages, et l'interdit n° 19 reçoit sa frontière.** Le client l'a
  demandé deux fois en une heure (« les textes manquent d'animation à
  l'ouverture et au défilement », puis « n'oublie pas les animations pour le
  texte, c'est une partie à améliorer »). Trois choses sont gravées ici.

  1. **CE QUE L'INTERDIT n° 19 FERME EST LA MISE EN SCÈNE DU CORPS, pas
     l'identité de la page.** Son motif est écrit à côté de lui : « un document
     juridique et un formulaire de paiement se LISENT ; une révélation au
     défilement sur des conditions générales est une gêne à la lecture d'un
     texte opposable ». Aucune section légale ne porte `data-revelation`, aucune
     étape du tunnel non plus, et l'écran de paiement simulé n'anime que son
     étiquette et son titre — son avertissement D22 se peint sans attendre. Le
     bloc-titre, lui, entre une fois, à l'arrivée, sans rien masquer de
     persistant et sans retarder d'une milliseconde la lecture du texte, peint
     entier dès la première image. **Ce qui reste fermé reste fermé ; ce qui
     s'ouvre est nommé.**

  2. **LA LOI DU PLUS GRAND AFFICHAGE DE CONTENU, découverte à la mesure et
     valable bien au-delà de cette tranche : il attend la FIN de l'animation qui
     le porte.** Cinq régimes, trois passes chacun, même construction, même
     serveur : retirer le masque ne rend pas une milliseconde ; une course NULLE
     coûte exactement autant qu'une course de cent quarante pixels ; seule la
     DURÉE compte. Chrome ré-émet un candidat à chaque image tant que l'élément
     est animé, et c'est le dernier qui est publié.

     | page | élément mesuré | sans entrée | avec entrée |
     |---|---|---|---|
     | fiche produit | `IMG` (la galerie) | 168 ms | 160 ms |
     | `/panier` | `IMG` (la cagette) | 112 ms | 124 ms |
     | `/gestion` | `SPAN` (le titre) | 148 ms | **1 152 ms** |
     | CGV | `SPAN` (le titre) | 188 ms | **1 212 ms** |

     **D'où la règle : le titre entre là où une IMAGE porte la mesure, et reste
     en place là où c'est lui.** Elle tombe exactement sur la frontière de
     l'interdit n° 19, ce qui est le meilleur signe qu'aucune des deux ne se
     trompe. Les pages concernées ne sont pas figées pour autant : leur
     étiquette, leur chapeau et leur note entrent normalement, et le coût mesuré
     de ces trois lignes est nul (148 ms contre 148). Le marqueur est
     STRUCTUREL — `data-titre-anime`, porté par celui qui APPORTE l'image de
     tête — de sorte qu'une page qui perdrait son image perdrait l'entrée de son
     titre le jour même, au lieu de la garder en silence.

     **CE QUE CELA EXPLIQUE RÉTROSPECTIVEMENT** : C18 avait adopté la quatrième
     voie en concluant que le geste était gratuit. Il l'était — mais parce qu'à
     l'accueil le plus grand affichage est la MACRO, pas le monument. Personne
     ne l'avait formulé ainsi, et la généralisation aurait donc coûté une
     seconde sur quatorze routes sans que rien ne le signale.

  3. **LES DURÉES SUIVENT L'EMPLOI, ET LE VOCABULAIRE NE BOUGE PAS.**
     `--ms-hero` (1400 ms) nomme « l'entrée en scène du premier écran, UNE SEULE
     FOIS PAR VISITE » : il n'y a qu'un premier écran par visite, celui de
     l'accueil, et sa colonne le déclare. Toutes les autres pages emploient
     `--ms-signature` (900 ms), dont la ligne du tableau se lit « révélation
     d'un bloc de tête, TRANSITION DE PAGE ». Aucune sixième durée n'est créée.

  **Renforcement des révélations au défilement** : la course passe de 24 à
  36 pixels. Vingt-quatre pixels sous `--ease-coule` — qui dépasse quatre-vingts
  pour cent de sa course au tiers du temps — se traduisent par une arrivée
  perçue de SEPT pixels ; trente-six en laissent voir onze, soit une hauteur
  d'x. La borne haute est tenue deux fois : au-delà d'une hauteur de ligne le
  bloc croise le précédent et le verbe cesse d'être « se poser » ; et une
  amplitude plus grande ferait entrer le bloc depuis l'EXTÉRIEUR de la fenêtre,
  donc rendrait le geste dépendant du seuil de l'observateur.

- **Amendement C17 (2026-08-10)** : un vingt-et-unième interdit — le piège des
  couches CSS — et sa règle opérationnelle. Il ne vient pas d'une refonte
  étrangère mais des rounds de revue C15 et C16 de ce dépôt : trois règles
  d'état y ont été livrées sans jamais s'appliquer, et aucune relecture de
  feuille de style ne pouvait les distinguer de règles justes.
- **Amendement C18 (2026-08-10)** : la **quatrième voie** pour animer un premier
  écran au chargement à froid — `@starting-style` sans la porte
  `html.mouvement`. C17 en avait fermé trois et en avait conclu qu'aucune ne
  restait ; la revue a nommé celle-ci, et C18 l'a mesurée avant de l'adopter.
  Voir la section « Animer un premier écran à froid » ci-dessous.
- **Objet** : une refonte visuelle sans doctrine d'animation produit vingt
  décisions locales prises vingt fois, incohérentes entre elles et
  irrattrapables une fois écrites. Ce document tranche AVANT.

## L'image directrice

**La matière lente.** Une épicerie fine, c'est de l'huile qui coule, du miel
qui prend son temps, un verre qu'on repose. Rien n'y rebondit, rien n'y
sursaute, rien n'y frétille. Toute animation de ce site doit pouvoir se décrire
par un verbe de cette famille : couler, se poser, se déposer, s'ouvrir.

Cette phrase n'est pas de la décoration : c'est le critère qui tranche les cas
que la liste d'interdits n'a pas prévus. Une animation qu'on ne peut pas
décrire ainsi n'entre pas.

## 1. Le vocabulaire — fermé

Une refonte s'écrit avec **cinq durées, un décalage, trois courbes**. Pas une
valeur de plus, et aucune valeur écrite à la main dans un composant.

### Durées

| Jeton | Valeur | Emploi |
|---|---|---|
| immédiat | 180 ms | retours d'interaction : survol, pression, bascule |
| bref | 320 ms | apparition d'un élément d'interface, changement d'état local |
| ample | 620 ms | révélation d'un bloc au défilement |
| long | 900 ms | révélation d'un bloc de tête, transition de page |
| ouverture | 1400 ms | l'entrée en scène du premier écran, une seule fois par visite |

### Cascade

Décalage de **70 ms** entre deux éléments d'une même série, **plafonné à six
éléments**. Le plafond n'est pas un détail : sans lui, une grille de quinze
vignettes fait attendre le dernier arrivant plus d'une seconde après le
premier, ce qui n'est plus une cascade mais une file d'attente.

### Courbes

| Variable | Valeur | Ce qu'elle fait |
|---|---|---|
| `--ease-coule` | `cubic-bezier(0.16, 1, 0.30, 1)` | départ franc, ralentissement très long — le geste par défaut, celui de la matière qui coule et met du temps à s'immobiliser |
| `--ease-verre` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | même famille, ralentissement plus court — pour ce qui se pose sans traîner : un survol, une bascule |
| `--ease-scelle` | `cubic-bezier(0.76, 0, 0.24, 1)` | lent aux deux bouts, rapide au milieu — pour ce qui part d'un état et arrive à un autre : un panneau qui se ferme |

Les trois sont des courbes de la même famille : **aucune ne sort de
l'intervalle [0, 1]**. C'est ce qui les distingue d'une courbe élastique, dont
la valeur dépasse son point d'arrivée avant d'y revenir — voir la règle
suivante.

**Aucune élasticité, aucun rebond, aucun dépassement.** Une courbe qui repasse
au-dessus de sa valeur d'arrivée fait sursauter la matière. Elle est hors
vocabulaire, quel que soit le contexte.

## 2. L'architecture — un provider, un observateur

### Un seul provider client

`FournisseurMouvement`, **imbriqué dans `src/lib/fournisseurs.tsx`**, avec les
deux fournisseurs existants. Ce n'est pas un rangement : c'est la décision D26
tenue. Chaque module `'use client'` référencé depuis la mise en page racine
ouvre un groupe de morceaux distinct chez l'empaqueteur, donc un fichier de
plus à télécharger sur **toutes** les routes. Un troisième fournisseur
référencé depuis le layout coûterait ce fichier ; imbriqué dans le fichier qui
porte déjà la frontière, il ne coûte que son propre poids.

Le provider fait deux choses, et rien d'autre :

1. lire le réglage système `prefers-reduced-motion` et **rester à l'écoute** de
   ses changements ;
2. poser la classe `mouvement` sur `<html>` après montage — **et seulement si le
   mouvement réduit n'est pas demandé**. Cette condition n'est pas un détail
   d'optimisation : voir « Le piège de la classe posée inconditionnellement »
   plus bas, c'est elle qui empêche le site de devenir blanc.

Il ne pose PAS `data-hydratation`. Ce signal appartient à `Fournisseurs`,
et il ne peut appartenir qu'à lui — voir juste en dessous.

### Le signal d'hydratation reste à `Fournisseurs`

`data-hydratation="prete"` est posé par un effet de **`Fournisseurs`**
lui-même (`src/lib/fournisseurs.tsx`), le composant qui ENVELOPPE les
fournisseurs, et non par l'un d'eux.

C'est un invariant d'ordre, pas une préférence de rangement. **L'effet d'un
composant React se déclenche APRÈS ceux de tous ses descendants** : quand
l'effet de `Fournisseurs` s'exécute, la surcouche, le panier et le mouvement
ont tous monté leur contexte. Déplacer le signal dans `FournisseurMouvement` —
qui est un enfant — l'avancerait avant le montage de ses frères, et la barrière
des campagnes de bout en bout rendrait la main trop tôt : elle annoncerait
« prête » à un moment où le panier n'a pas encore lu le stockage.

L'invariant est écrit en toutes lettres dans l'en-tête de
`src/lib/fournisseurs.tsx`. Un fournisseur ajouté plus tard le respecte
gratuitement, à une condition : être un ENFANT de `Fournisseurs`, jamais son
parent.

### Les révélations : un contrôleur global à attributs

Un élément à révéler porte `data-revelation`. Un **unique**
`IntersectionObserver`, monté par le provider, les observe tous et
**cesse d'observer** chaque élément après son passage.

L'anti-patron, ici, est le hook client par section : `useRevelation()` appelé
dans quinze composants, c'est quinze composants qui deviennent clients, quinze
observateurs instanciés, et la moitié de la vitrine qui repasse côté navigateur
pour un fondu. Un attribut sur un élément rendu par le serveur ne coûte rien :
le composant reste serveur, seul le contrôleur est client.

## 3. Les règles de sûreté — celles qui ne se négocient pas

### N'animer que `opacity` et `transform`

Une troisième propriété est admise, et une seule : **`clip-path`, sur un élément
à BOÎTE FIXE** — une figure dont les dimensions sont réservées par le rendu
serveur. Elle recadre ce qui est peint sans jamais changer la place occupée,
donc elle ne déclenche aucun recalcul de mise en page : c'est le critère de
cette section, pas la liste des noms. C'est ce qui permet à une macro de
s'ouvrir (`inset(12%)` → `inset(0)`) dans un cadre qui ne bouge pas. Vérifié en
C17 sous les deux régimes : décalage cumulé nul sur la page qui la porte.

Jamais `visibility`, jamais `height`, jamais `display`, jamais `top` ou `left`.
Ces propriétés déclenchent un recalcul de mise en page à chaque image : elles
coûtent cher, elles saccadent sur un téléphone, et elles décalent le contenu
autour — c'est-à-dire qu'elles fabriquent du décalage cumulé de mise en page,
la mesure que ce projet tient à zéro depuis C4.

### L'état masqué n'existe QUE sous `html.mouvement`

C'est la règle qui décide si le site est utilisable sans JavaScript, et elle
tient en une ligne de sélecteur :

```css
html.mouvement [data-revelation] { opacity: 0; transform: translateY(1rem); }
```

La classe est posée **par le provider, après montage, et seulement si le
mouvement réduit n'est pas demandé** — la condition fait partie de la règle,
elle n'en est pas un raffinement. Sans JavaScript, avant hydratation, si le
provider échoue, ou sous mouvement réduit : la classe est absente, la règle ne
s'applique pas, et **tout le contenu est visible**. Écrire l'état masqué en dur dans la feuille de
style produirait un site dont le contenu dépend d'un script — c'est-à-dire la
panne la plus grave qu'une refonte visuelle puisse introduire, et la plus
facile à ne pas voir depuis un poste de développement.

### Le piège de la classe posée inconditionnellement

Il faut l'écrire, parce que la première rédaction de cette décision est tombée
dedans et qu'elle est **la panne la plus grave que ce document puisse causer**.

Enchaînez les trois règles telles qu'elles se lisent naïvement : le provider
pose `mouvement` **après montage** ; l'état masqué s'applique **sous
`html.mouvement`** ; sous mouvement réduit, l'observateur **n'est pas
instancié**. Résultat : la classe est là, l'état masqué s'applique, et
**personne ne vient jamais le retirer**. Chaque `[data-revelation]` du site
reste à `opacity: 0` — pour toujours.

Et cet état n'est pas un cas rare : c'est celui d'un visiteur qui a demandé
moins d'animation dans son système d'exploitation, **et celui dans lequel
tournent les 74 campagnes de bout en bout** depuis C11
(`contextOptions: { reducedMotion: 'reduce' }`). Le site serait blanc pour les
personnes qui ont le plus besoin qu'il ne le soit pas.

**La règle, donc : sous mouvement réduit, `html.mouvement` N'EST PAS POSÉE.**
C'est la correction la plus simple et la plus sûre — pas de classe, pas d'état
masqué, pas de dépendance à un observateur qui n'existera pas. Le contenu est
visible pour la même raison qu'il l'est sans JavaScript, et par le même chemin.

Le niveau 1 (ci-dessous) porte en plus un filet **explicite sur l'opacité**. On
le prendrait volontiers pour une ceinture-bretelles contre une faute
d'implémentation ; c'est en réalité le seul organe qui couvre un cas
parfaitement **légitime** — celui du visiteur qui active le mouvement réduit
alors que la classe est **déjà posée**, c'est-à-dire en cours de visite. Il
coûte deux lignes et il évite un site blanc.

### Animer un premier écran à froid — la quatrième voie (amendement C18)

C17 a énuméré trois manières d'animer l'entrée d'un premier écran au
chargement, et les a fermées toutes les trois : le **préchargeur** (interdit
n° 7), le **script bloquant** qui poserait `html.mouvement` avant le premier
rendu (il masquerait le contenu même si le paquet échouait — la panne la plus
grave que ce document décrive), et l'**état masqué écrit en dur** dans la
feuille (même panne). Elle en concluait qu'aucune n'était praticable, et livrait
un premier écran immobile à l'arrivée depuis l'extérieur.

Il en existe une quatrième, et elle n'a aucun des trois défauts :

```css
@media (prefers-reduced-motion: no-preference) {
  [data-signature='ligne'] {
    transition:
      opacity var(--ms-hero) var(--ease-coule),
      transform var(--ms-hero) var(--ease-coule);
    transition-delay: calc(var(--decalage-cascade) * var(--rang-signature, 0));
  }

  @starting-style {
    [data-signature='ligne'] { opacity: 0; transform: translateY(0.75rem); }
  }
}
```

**Pourquoi elle échappe à la panne** : `@starting-style` ne décrit QUE le style
de départ d'une transition. Il ne pose aucun état persistant. Sans JavaScript,
avec un paquet qui échoue, sur un moteur qui ne connaît pas la règle : la
déclaration est ignorée et l'élément est simplement à son état d'arrivée. La
dégradation est **« pas d'animation », jamais « invisible »** — la promesse même
que ce document exige pour les révélations, obtenue ici sans une ligne de
script. C'est aussi pourquoi elle ne se substitue PAS au dispositif des
révélations : celles-ci dépendent d'un observateur, donc d'un script, donc de la
porte.

**CE QUI RESTE FERMÉ, et ce n'est pas négociable : le plus grand affichage de
contenu.** La voie est ouverte au TEXTE d'un premier écran, pas à son image. Une
image qui s'ouvre au chargement fait reculer l'indice de rapidité visuelle, qui
mesure la progression de l'affichage — c'est la mesure que ce projet publie. Sur
l'accueil, le texte joue et la macro reste immobile ; la ligne de partage est
tenue par un cas de campagne, pas par la relecture de la feuille.

**ELLE N'EST ADOPTÉE QUE PARCE QU'ELLE A ÉTÉ MESURÉE.** Quatre relevés Lighthouse
sur les quatre URL, dont deux passes sur la même construction
(`preuves/c18/cout-entree-froid.txt`) : premier affichage inchangé (1,54 s),
décalage cumulé inchangé (0,00006), et la note de l'accueil qui vaut 96 puis 97
**sur des octets identiques**. Les trois autres pages, qui ne portent pas une
ligne de la modification, bougent d'autant — le rayon perd un point puis le
regagne, le plus grand affichage du panier varie de 210 ms. **Un point d'écart
n'est pas un coût sur ce harnais ; c'est sa résolution.** Toute évaluation
future de ce genre doit se donner des pages témoins, faute de quoi elle
attribuera du bruit à son propre travail.

### Le décalage cumulé reste structurellement nul

Une révélation joue sur l'opacité et sur une translation de quelques
pixels — deux propriétés qui ne déplacent rien d'autre. **La place de
l'élément est réservée dès le rendu serveur**, avant qu'il apparaisse. Aucune
animation n'a le droit de faire pousser, apparaître ou disparaître un bloc qui
occupe de la place.

### Le réglage système est respecté à TROIS niveaux

Un seul niveau ne suffit pas, et c'est l'erreur courante :

1. **En CSS** — `@media (prefers-reduced-motion: reduce)` neutralise durées et
   translations, **et rend explicitement l'opacité** :

   ```css
   @media (prefers-reduced-motion: reduce) {
     html.mouvement [data-revelation] { opacity: 1 !important; transform: none !important; }
   }
   ```

   Les deux déclarations ne sont pas décoratives. Neutraliser la durée d'une
   transition ne fait pas apparaître un élément dont l'état de DÉPART est
   `opacity: 0` : cela le rend invisible instantanément au lieu de
   progressivement. Un filet qui ne rétablit que les durées laisse donc le site
   exactement aussi blanc, en plus rapide. Et ce bloc n'est pas un garde-fou
   contre une classe posée en dépit de cette page : **il s'applique pour de
   bon**, chaque fois que le réglage passe à « reduce » PENDANT la visite. La
   classe a alors été posée au chargement, en toute légitimité, et c'est ce
   bloc — et lui seul — qui rend instantanément visible ce qui attendait
   encore d'être révélé.
2. **En JavaScript** — le provider **ne pose pas la classe** et **n'instancie
   pas** l'observateur, et Lenis n'est **pas importé du tout**. Un site qui joue
   quand même l'animation avant de la neutraliser en CSS a déjà payé le code,
   l'observateur et la mémoire.
3. **En cours de session, et dans UN SEUL SENS** — la `MediaQueryList` est
   écoutée. Un visiteur qui active le réglage dans son système d'exploitation
   pendant sa visite voit le site s'immobiliser, sans rechargement : le
   provider débranche l'observateur et Lenis, et le bloc CSS du niveau 1
   ci-dessus rend immédiatement visible tout ce qui attendait sa révélation.
   C'est le niveau que presque personne n'implémente, et c'est celui qui
   distingue « case cochée » de « respecté ».

   **Le sens inverse est fermé, et il l'est exprès : `html.mouvement` n'est
   JAMAIS posée après coup.** Un visiteur qui DÉSACTIVE le mouvement réduit en
   cours de visite ne retrouve les animations qu'au prochain chargement de
   page. C'est la panne décrite plus haut, prise par l'autre bout : poser la
   classe à ce moment-là remettrait l'état masqué sur TOUS les
   `[data-revelation]` du document, y compris ceux que le visiteur a déjà
   dépassés en défilant — et l'observateur ne les révélerait jamais, puisqu'il
   ne notifie que les éléments dont l'intersection CHANGE et que son rappel
   initial ne porte que sur ceux qui intersectent. La moitié haute de la page
   s'effacerait sous les yeux de quelqu'un qui vient de demander PLUS
   d'animation. Un rechargement, lui, rend le mouvement entier et dans
   l'ordre ; c'est le prix, il est d'une touche, et il est payé par le réglage
   le plus rare des deux.

## 4. Lenis — hors First Load, trois routes

Le défilement adouci est un **import dynamique**, jamais un import de tête. Il
ne charge que sur **trois routes** : l'accueil, `/boutique` et les fiches
produit.

Il ne charge **jamais** :

- dans le tunnel (`/panier`, `/commande`, la simulation, la confirmation) — on
  n'adoucit pas le défilement de quelqu'un qui vérifie un montant avant de
  payer ;
- sur les pages légales — un document juridique se parcourt, se cherche, se
  compare ; un défilement qui a sa propre inertie gêne cette lecture ;
- sous réglage de mouvement réduit — voir ci-dessus, niveau 2.

## 5. Les transitions de page

**Autorisé** : `document.startViewTransition` en amélioration progressive, pour
les transitions **au sein d'un même document** — l'ouverture d'un panneau, le
passage d'un état de filtre à un autre. L'appel est conditionnel, le repli est
silencieux, et un navigateur qui ne connaît pas l'API affiche simplement le
résultat.

**Interdit hors évaluation** : la transition **entre deux pages**
(`experimental.viewTransition` de Next). C'est un drapeau expérimental sur un
socle qui vend sa stabilité, et il touche au routeur — c'est-à-dire à la pièce
dont dépendent les 74 campagnes de bout en bout et les notes mesurées. Son
évaluation est une tranche à elle seule (C18), sur branche, avec sa propre
décision et ses propres mesures avant/après.

## 6. Les vingt-et-un interdits, gravés

Chacun est un piège de refonte « primée », et chacun a coûté à quelqu'un. Les
vingt premiers ont été gravés en C11 sur l'expérience d'autres refontes ; le
vingt-et-unième a été gravé en C17 sur celle de CE dépôt, où il a coûté trois
défauts livrés et invisibles.

| # | Interdit | Motif |
|---|---|---|
| 1 | **GSAP**, sous toute forme | Décision D36 : rien ne lui reste à faire, et son poids vaut six fois le budget du socle de mouvement entier. |
| 2 | **WebGL, Three.js, shaders** | Une épicerie n'a pas de scène 3D. Coût processeur, batterie, et une surface de panne qu'aucune campagne ne couvre. |
| 3 | **Curseur personnalisé** | Il remplace un élément d'interface fourni par le système, cesse d'exister au doigt, et casse les repères d'accessibilité. |
| 4 | **`mix-blend-mode: difference` sur l'en-tête** | Le contraste devient une fonction de ce qui défile dessous : il n'est plus mesurable, donc plus garantissable. Le projet vend une note d'accessibilité de 100. |
| 5 | **Bandeau défilant auto-lu** | WCAG 2.2.2 : tout mouvement automatique de plus de cinq secondes doit pouvoir être arrêté. Un bandeau de ce site est **piloté par le défilement** — il ne bouge que si le visiteur bouge. |
| 6 | **Détournement du défilement, ancrage forcé** | Reprendre la main sur le défilement du visiteur, c'est lui retirer le seul geste qu'il maîtrise entièrement. |
| 7 | **Préchargeur à pourcentage** | Il fabrique une attente qui n'existait pas. Ce site rend du HTML statique : sa page est prête avant que le compteur ait atteint dix. |
| 8 | **Objet qui vole vers le panier** | Anime une position, donc la mise en page ; ne survit pas au défilement pendant le vol ; et fait attendre une seconde pour une information que la pastille donne instantanément. |
| 9 | **Parallaxe multi-couches sur un visuel produit** | Le produit et son ombre se désolidarisent : l'objet flotte. **L'ombre ne bouge pas.** |
| 10 | **Bodoni sous 20 px** | Une didone à fort contraste de graisse perd ses déliés en petit corps : illisible sur écran ordinaire, invisible sur écran à faible densité. |
| 11 | **Seconde nomenclature inventée** | Un numéro de lot ou un millésime affiché est une donnée qui n'existe pas, sur des produits qui n'existent pas — exactement ce que la garde d'honnêteté (D30) interdit ailleurs. |
| 12 | **Personne, main ou visage sur une image** | Décision D35. |
| 13 | **Marque réelle ou signe officiel sur une étiquette** | Décision D35 et D32. |
| 14 | **Note, étoile, avis** | Décision D33, sans exception : ni à l'écran, ni dans le balisage. |
| 15 | **Mode sombre** | La palette de ce site est celle d'un papier — crème, encre, olive, terre cuite. Un second jeu de couleurs, c'est doubler la surface de contrôle du contraste pour un gain nul sur une vitrine, et un `colorScheme: 'light'` déjà déclaré. |
| 16 | **Animer un prix, un total, des frais de port** | Un montant qui défile ou s'incrémente est illisible pendant qu'il bouge, et il bouge au moment exact où le visiteur le vérifie. **Fondu du nombre seul, `tabular-nums`**, largeur stable. |
| 17 | ~~**Vidéo en fond du premier écran**~~ — **LEVÉ EN C19 sur décision client, conditions tenues** (voir l'amendement en tête de ce document). L'interdit reste écrit ici parce qu'il a servi : ce sont ses conditions de retour, posées avant qu'on en ait besoin, qui ont fait de la levée une livraison en une tranche au lieu d'une discussion. |
| 18 | **Police tierce non auto-hébergée** | `default-src 'self'` l'interdit déjà (D34), et les deux polices sont servies depuis le domaine avec des replis à métriques ajustées — le réglage qui a fait tomber le décalage cumulé de 0,220 à 0,002. |
| 19 | **Animer les pages légales ou le tunnel** — **frontière posée en C19-ter** : ce qui est fermé est la mise en scène du CORPS (aucune révélation au défilement, nulle part) ; l'entrée du BLOC-TITRE est admise, et sur ces pages-là le TITRE lui-même reste en place parce qu'il porte le plus grand affichage de contenu (voir l'amendement en tête). | Un document juridique et un formulaire de paiement se lisent ; ils ne se mettent pas en scène. Une révélation au défilement sur des conditions générales est une gêne à la lecture d'un texte opposable. |
| 20 | **Texte dimensionné en `vw` seul** | WCAG 1.4.4 : le texte doit supporter un agrandissement à 200 %. Une taille en `vw` pure ignore le réglage du visiteur. **`clamp()` à dominante `rem`**, toujours. |
| 21 | **Règle d'état écrite dans une couche que son utilitaire concurrent domine** | Dans le modèle des couches CSS, **c'est la couche qui décide avant la spécificité** : un utilitaire Tailwind hors couche bat une règle de `@layer components`, si précise soit-elle. La règle est alors écrite, lisible, plausible — et n'est JAMAIS appliquée. Trois défauts livrés de cette famille (C15 : le trait de famille au survol ; C15 : la bascule grille/liste qui « marchait et ne faisait rien » ; C16 : les degrés recopiés à la main). **Règle opérationnelle : toute propriété qu'une règle d'état veut changer se pose dans la MÊME COUCHE que l'utilitaire concurrent, et un test lit le STYLE CALCULÉ.** Une règle qui ne s'applique pas est indiscernable d'une règle absente dans un fichier ; elle est parfaitement discernable dans `getComputedStyle`. |

## Ce que cette décision ne dit pas

Elle ne dit pas à quoi la refonte ressemblera. Elle dit avec quoi elle sera
écrite, ce qu'elle n'a pas le droit de faire, et où le chercher quand une
question se posera en C12 à C19. Les choix de composition, de rythme et de
mise en page appartiennent aux tranches qui les feront — et à leurs captures.
