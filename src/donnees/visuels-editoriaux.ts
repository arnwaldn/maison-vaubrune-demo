import type { Famille, VueVisuel } from '@/lib/types';

/**
 * LES VISUELS QUI N'APPARTIENNENT À AUCUN PRODUIT (tranche C15).
 *
 * Le catalogue porte les visuels des quinze fiches ; celui-ci porte ce qui vit
 * dans `public/editorial/` — pour l'instant, le héros de l'accueil. Il est
 * séparé pour la même raison que les deux racines d'images le sont : un macro
 * de famille n'a pas de slug de produit, et la garde des images refuse tout
 * dossier qui n'en est pas un.
 *
 * LES SEPT MACROS ONT CHANGÉ DE NATURE EN C23, ET CE PARAGRAPHE AVEC.
 *
 * Elles étaient DÉCORATIVES au sens strict : elles montaient derrière un nom de
 * famille au survol, le nom était le contenu, et le cadre qui les accueillait
 * était `aria-hidden`. Elles n'avaient donc ni alternative ni dimensions à
 * déclarer — leur adresse se recomposait depuis le slug de la famille.
 *
 * Ce raisonnement tenait tant que le survol existait. Il ne tenait pas sur un
 * téléphone, et le défaut était plus large que « pas de survol » : le cadre
 * portait `hidden lg:block`, donc en deçà de 64 rem il était en `display: none`
 * et AUCUNE image n'était jamais demandée, quel que soit le geste du visiteur.
 * Sept familles, zéro image, sur tout écran sous 1 024 px. Un professionnel du
 * commerce en ligne l'a formulé sans pouvoir le nommer : « d'un œil on ne
 * comprend pas ce que fait la marque ».
 *
 * Elles deviennent donc du CONTENU : rendues d'emblée, à toute largeur, dans
 * une grille de tuiles. Ce qui leur donne ce que le héros avait déjà — un texte
 * alternatif et une couleur de réservation.
 *
 * CES DEUX CHAMPS NE SONT PAS INVENTÉS ICI. Ils étaient écrits depuis C15 dans
 * `travaux-images/manifeste.json`, à côté de chaque master, et personne ne les
 * avait branchés. C'est le motif de toute cette tranche, retrouvé une fois de
 * plus : la matière était là, l'aiguillage manquait.
 *
 * Les nombres viennent de `public/editorial/manifeste-livre.json`, écrit par le
 * pipeline : ce sont les dimensions RÉELLEMENT produites.
 */
export const HEROS_ACCUEIL: VueVisuel = {
  alt: 'Filet d’huile vert doré tombant dans un bain d’huile, en très gros plan ; la moitié droite du cadre est vide.',
  couleurDominante: '#d1c2ad',
  largeur: 1440,
  hauteur: 810,
  largeurs: [640, 1024, 1440],
};

/** La clef éditoriale du héros — le dossier qui le porte sous `public/editorial/`. */
export const CLEF_ACCUEIL = 'accueil';

/**
 * LES SEPT MACROS DE FAMILLE, une par famille du catalogue (C23).
 *
 * Le type `Record<Famille, …>` fait le travail d'une garde sans en écrire une :
 * il refuse la compilation si une famille manque ou si une clef inconnue entre.
 * Même mécanisme que `NOM_DE_SCHEME` dans `vitrine.ts` — quand le compilateur
 * peut tenir l'invariant, on ne demande pas à un test de le tenir.
 *
 * `alt` et `couleurDominante` sont RECOPIÉS de `travaux-images/manifeste.json`,
 * où le pipeline les a écrits à la génération. Ils ne sont ni choisis à l'œil,
 * ni reformulés : le texte alternatif décrit ce que le moteur a réellement
 * produit, et la couleur est la moyenne mesurée du cadre.
 *
 * Dimensions : 1024 × 576, du 16:9 exact. Ce format n'est pas négociable — le
 * recadrer en portrait coûterait PLUS cher qu'il ne rendrait, parce qu'un
 * `object-fit: cover` en 4:5 réclamerait une source de 750 points là où le 16:9
 * natif s'en tient à 320.
 */
export const MACROS_FAMILLE: Record<Famille, VueVisuel> = {
  'huiles-et-vinaigres': {
    alt: 'Filet d’huile versé en gros plan, formant une couronne et des ondes concentriques à la surface d’un bain d’huile.',
    couleurDominante: '#a69368',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  'conserves-salees': {
    alt: 'Tranche de terrine de campagne en gros plan, sa chair rose piquée de poivre et d’herbes, sur un fond clair.',
    couleurDominante: '#c7aa9c',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  'miels-et-confitures': {
    alt: 'Miel sombre qui coule en ruban épais et s’enroule sur lui-même, en très gros plan.',
    couleurDominante: '#ad8b78',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  'epicerie-seche': {
    alt: 'Lentilles blondes répandues en vrac, vues de très près, quelques graines détachées au premier plan.',
    couleurDominante: '#d6ba9b',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  infusions: {
    alt: 'Feuilles et fleurs séchées répandues à plat — verveine, tilleul, camomille, lavande —, vues de très près.',
    couleurDominante: '#c0b7a4',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  frais: {
    alt: 'Motte de beurre en très gros plan, striée par le passage de la spatule, avec de fines gouttes de petit-lait.',
    couleurDominante: '#d9c19e',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
  coffrets: {
    alt: 'Angle d’un coffret de bois clair et papier kraft froissé, vus de très près, en lumière rasante.',
    couleurDominante: '#c6a991',
    largeur: 1024,
    hauteur: 576,
    largeurs: [320, 640, 1024],
  },
};

/**
 * LES HÉROS À DEUX COLONNES — une ENTRÉE PAR PAGE, et rien d'autre à écrire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE LE CLIENT A VU, ET CE QU'IL A DEMANDÉ (n° 14 et 17, puis n° 19)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « /boutique : grand vide à droite du titre » (n° 14) et « /livraison, /suivi,
 * /panier : vides à droite du titre » (n° 17) ont donné à ces quatre pages une
 * image de tête en C19-ter. Le retour n° 19 va plus loin : « TOUTES les images
 * à côté des titres de page deviennent des vidéos. »
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UNE PAGE QUI PORTE UNE VIDÉO PORTE L'IMAGE 0 DE SA BOUCLE. TOUJOURS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est l'invariant de ce fichier, et il est ENCODÉ plutôt que rappelé : le
 * champ `video` décide à lui seul de la vue servie par `<HerosIllustre>` —
 * `affiche` quand il est là, `illustration` quand il ne l'est pas. Personne n'a
 * donc de couple à tenir d'accord, et c'est voulu :
 *
 * - les illustrations de C19-ter sont des 3:2 ENTIERS (la boîte `illustration`
 *   du manifeste ne recadre rien, mesure à l'appui — un 16:9 aurait coupé la
 *   cagette d'un tiers de sa hauteur) ;
 * - les boucles, elles, sont des 16:9 recadrés par le centre.
 *
 * Une page qui garderait son illustration sous une vidéo verrait donc le
 * cadrage SAUTER à la première image jouée. Le défaut est invisible en revue de
 * code — deux propriétés justes chacune de son côté — et parfaitement visible à
 * l'écran. Il ne peut plus s'écrire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  AJOUTER UNE VIDÉO À UNE PAGE, C'EST TROIS GESTES ET PAS UN DE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. une entrée dans la liste `VIDEOS` de `scripts/preparer-video.mjs` ;
 *   2. une entrée d'affiche au manifeste d'images (`vue: 'affiche'`) ;
 *   3. ici : le champ `video`, et les nombres de la nouvelle affiche.
 *
 * La page elle-même ne change pas d'une ligne. La forme a été posée AVANT que la
 * cagette de `/panier` n'arrive, et la cagette l'a VÉRIFIÉE : son intégration n'a
 * touché ni `panier/page.tsx`, ni `HerosIllustre`, ni `VideoHeros`, ni le
 * contrôleur — trois gestes, pas un de plus. Le remplaçant du miel de `/boutique`
 * entrera par le même chemin.
 *
 * Toutes les étiquettes de ces images sont VIERGES, aucune main, aucune
 * marque : interdits 12 et 13 de D37, décision D35. Les nombres viennent de
 * `public/editorial/manifeste-livre.json` — ce sont les dimensions RÉELLEMENT
 * produites, jamais celles qu'on a demandées.
 */
export interface HerosEditorial {
  /** Le dossier de `public/editorial/` qui porte l'image — et la clef du relevé vidéo. */
  readonly clef: string;
  /**
   * La clef de la vidéo dans `public/editorial/videos-livrees.json`, quand la
   * page en porte une. Absent = la page ouvre sur une image immobile.
   */
  readonly video?: string;
  /** L'image de tête : l'affiche de la boucle, ou l'illustration à défaut. */
  readonly visuel: VueVisuel;
}

export const HEROS_BOUTIQUE: HerosEditorial = {
  clef: 'boutique',
  video: 'boutique',
  visuel: {
    alt: 'Filet de miel ambré tombant en ruban lent dans un pot de verre, en gros plan ; la droite du cadre est calme.',
    couleurDominante: '#e8d8c8',
    largeur: 1024,
    hauteur: 576,
    largeurs: [640, 1024],
  },
};

export const HEROS_LIVRAISON: HerosEditorial = {
  clef: 'livraison',
  video: 'livraison',
  visuel: {
    alt: 'Colis de papier kraft ficelé de cordelette écrue, fermé d’un cachet de cire rouge sombre, avec une étiquette de papier vierge ; la droite du cadre est calme.',
    couleurDominante: '#b8a090',
    largeur: 1024,
    hauteur: 576,
    largeurs: [640, 1024],
  },
};

export const HEROS_SUIVI: HerosEditorial = {
  clef: 'suivi',
  video: 'suivi',
  visuel: {
    alt: 'Registre ouvert aux pages vierges, un tampon de bois et sa boîte d’encre fermée posés au-dessus, une étiquette d’expédition vierge sur la page de droite ; la droite du cadre est calme.',
    couleurDominante: '#c8b8a8',
    largeur: 1024,
    hauteur: 576,
    largeurs: [640, 1024],
  },
};

/**
 * LA DERNIÈRE DES QUATRE À PASSER EN VIDÉO, ET ELLE A COÛTÉ CE QUI ÉTAIT ANNONCÉ.
 *
 * L'entrée qui vivait ici hier disait « la seule des quatre qui reste immobile,
 * et c'est daté » : la cagette animée n'avait pas été obtenue lors de la salve du
 * 11/08, la page gardait son illustration 3:2, et la promesse écrite au-dessus
 * était qu'un champ `video` et les nombres d'une affiche suffiraient. Ils ont
 * suffi. Ce commentaire est la seule chose de `/panier` qui ait changé de sens.
 *
 * L'ALTERNATIVE N'EST PAS RECOPIÉE DE L'ILLUSTRATION, et ce n'est pas une
 * précaution de forme : celle de C19-ter annonçait « une bouteille couchée »
 * alors que la bouteille est DEBOUT — dans la boucle comme dans la nature morte
 * qu'elle remplace. Le défaut datait de C19-ter, il a été trouvé en REGARDANT
 * l'image et non en relisant le texte, et il aurait survécu à un copier-coller.
 * L'affiche décrit donc ce qu'elle montre, la nature morte du manifeste a été
 * corrigée du même mot, et la mention « la droite du cadre est calme » dit
 * l'endroit où le bloc-titre vient se poser.
 */
export const HEROS_PANIER: HerosEditorial = {
  clef: 'panier',
  video: 'panier',
  visuel: {
    alt: 'Cagette de bois clair garnie de frisure de papier, une bouteille de verre sombre dressée, un bocal à joint et un pot de confiture, toutes étiquettes vierges ; la droite du cadre est calme.',
    couleurDominante: '#c8b8a8',
    largeur: 1024,
    hauteur: 576,
    largeurs: [640, 1024],
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   LES TROIS PAGES DU TUNNEL (retour client n° 21, tranche C21a)
   ══════════════════════════════════════════════════════════════════════════

   « Des visuels à côté des titres du tunnel — comme nous l'avons fait pour les
   autres. » `/commande`, `/paiement/simulation` et `/commande/confirmation`
   n'avaient AUCUNE image : la doctrine C16 (« la sobriété est le message »)
   tenait les révélations et les photographies hors du tunnel. Le client lève
   cette réserve, comme il avait levé l'exclusion des coffrets au retour n° 16.

   CE QUI RESTE DE C16, ET QUI N'EST PAS NÉGOCIÉ : le tunnel gagne une image,
   il ne gagne pas une mise en scène. L'entrée du TITRE n'y joue pas — c'est
   l'interdit n° 19 de D37, « un document juridique et un formulaire de paiement
   se lisent, ils ne se mettent pas en scène » —, et `<HerosIllustre>` le sait
   par sa propriété `titreAnime`. Le raisonnement est à l'endroit de la règle.

   ══════════════════════════════════════════════════════════════════════════
    CES TROIS-LÀ ATTENDENT LEUR VIDÉO, ET ELLES L'ATTENDENT MIEUX QUE LEURS
    AÎNÉES
   ══════════════════════════════════════════════════════════════════════════

   Les animations du tunnel sont écrites et prêtes (le crayon qui écrit, le
   sceau qui s'imprime, la ficelle qui se noue) ; la fenêtre de quota du moteur
   vidéo s'est refermée avant la salve. Ces entrées portent donc, aujourd'hui,
   l'illustration immobile — exactement le chemin qu'ont suivi `/livraison`,
   `/suivi` et `/panier` : image d'abord, vidéo à la bascule d'une ligne.

   ET LA BASCULE NE COÛTERA PAS CE QU'ELLE A COÛTÉ EN C20. Les natures mortes
   de C19-ter étaient des 3:2 ; leurs boucles sont des 16:9 ; il a donc fallu
   SORTIR les trois illustrations de la livraison au commit de la vidéo, sans
   quoi le cadrage aurait sauté à la première image jouée. Les trois masters du
   tunnel sont nés EN 16:9 — même rapport que leur future affiche. Le jour de la
   bascule, l'image de tête ne bougera pas d'un pixel, et les trois gestes se
   réduisent aux trois habituels : une entrée dans `VIDEOS` de
   `preparer-video.mjs`, une entrée d'affiche au manifeste d'images, le champ
   `video` ici. La page, elle, ne change toujours pas d'une ligne.

   Les nombres viennent de `public/editorial/manifeste-livre.json` : ce sont les
   dimensions RÉELLEMENT produites (1024 × 572, et non le 576 d'un 16:9 exact —
   5504/3072 vaut 1,7917, pas 1,7778). Les couleurs de réservation sont la
   MOYENNE MESURÉE du cadre arrondie au multiple de huit, méthode de C20, jamais
   une valeur choisie à l'œil. */

export const HEROS_COMMANDE: HerosEditorial = {
  clef: 'commande',
  visuel: {
    alt: 'Registre relié ouvert à deux pages entièrement vierges, un crayon de bois couché dans la pliure ; en retrait, deux bocaux fermés d’un couvercle doré, l’un d’ambre clair, l’autre d’un rouge sombre.',
    couleurDominante: '#d8c8b8',
    largeur: 1024,
    hauteur: 572,
    largeurs: [640, 1024],
  },
};

/**
 * L'IMAGE DE L'ÉCRAN DE PAIEMENT SIMULÉ — celle que D22 contraint.
 *
 * La page ne montre AUCUN organe de paiement, pas même décoratif ; son image ne
 * pouvait donc pas en montrer un non plus. Le sujet évite tout ce qui ressemble
 * à un encaissement — aucune carte, aucun chiffre, aucun clavier, aucun
 * terminal, aucune main —, et le cachet de cire est NU : un sceau gravé aurait
 * été une marque, c'est-à-dire un interdit de D35 doublé d'un interdit de D22.
 *
 * Ce que l'image dit à sa place est ce que la page dit en toutes lettres : un
 * engagement se scelle, il ne se saisit pas.
 */
export const HEROS_PAIEMENT_SIMULATION: HerosEditorial = {
  clef: 'paiement-simulation',
  visuel: {
    alt: 'Enveloppe de papier kraft fermée d’un cachet de cire bordeaux sans marque ; au-dessus, un sceau de laiton à manche de bois et un bâton de cire posés côte à côte ; la droite du cadre est calme.',
    couleurDominante: '#e0d0c0',
    largeur: 1024,
    hauteur: 572,
    largeurs: [640, 1024],
  },
};

export const HEROS_COMMANDE_CONFIRMATION: HerosEditorial = {
  clef: 'commande-confirmation',
  visuel: {
    alt: 'Colis de papier kraft ficelé d’une cordelette écrue nouée en boucle, une étiquette de papier vierge pendue au nœud et deux épis de blé séchés glissés dessous ; la droite du cadre est calme.',
    couleurDominante: '#d0c0b0',
    largeur: 1024,
    hauteur: 572,
    largeurs: [640, 1024],
  },
};
