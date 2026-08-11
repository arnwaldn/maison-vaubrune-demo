/**
 * Vocabulaire du catalogue.
 *
 * Ce fichier ne contient aucune donnée de produit : il dit ce qu'un produit a
 * le droit d'être. Il est le seul endroit où les familles, les zones de
 * livraison, les formes et les teintes d'illustration sont énumérées — tout le
 * reste (catalogue, pages, garde de cohérence) s'y réfère.
 *
 * Deux partis pris de typage, tous deux repris de la revue des fiches
 * (`contenu/fiches-brouillons/00-REVUE.md`, section 4) :
 *
 * 1. Les listes fermées sont écrites en tuples `as const` et le type en est
 *    dérivé, jamais l'inverse. Une union écrite à la main se désynchronise de
 *    la liste qu'un script parcourt ; ici, ajouter une famille se fait à un
 *    seul endroit et le compilateur réclame aussitôt son libellé.
 *
 * 2. `Conservation` est une union discriminée, pas un champ texte. Une DDM se
 *    compte en mois, une DLC en jours : les laisser cohabiter dans le même
 *    champ numérique finirait par les confondre. Le compilateur interdit de
 *    lire `dlcJours` sur une conserve stérilisée.
 */

/* -------------------------------------------------------------------------- */
/* Familles                                                                    */
/* -------------------------------------------------------------------------- */

/** Ordre d'affichage du rayon : du condiment au coffret, comme sur un étal. */
export const FAMILLES = [
  'huiles-et-vinaigres',
  'conserves-salees',
  'miels-et-confitures',
  'epicerie-seche',
  'infusions',
  'frais',
  'coffrets',
] as const;

export type Famille = (typeof FAMILLES)[number];

export const LIBELLE_FAMILLE: Record<Famille, string> = {
  'huiles-et-vinaigres': 'Huiles et vinaigres',
  'conserves-salees': 'Conserves salées',
  'miels-et-confitures': 'Miels et confitures',
  'epicerie-seche': 'Épicerie sèche',
  infusions: 'Infusions',
  frais: 'Frais',
  coffrets: 'Coffrets',
};

/* -------------------------------------------------------------------------- */
/* Zones de livraison (décision D9)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Les trois zones du moteur de frais de port (tranche C3).
 *
 * Le code est déclaré ici parce que c'est le catalogue qui décide, produit par
 * produit, si une zone est atteignable : la règle « pas d'expédition hors
 * métropole » se branche sur le drapeau `chaineDuFroid` du régime de
 * conservation, JAMAIS sur la famille `frais` (revue, point 3). Le jour où un
 * coffret contiendra du beurre, sa famille sera `coffrets` et une règle écrite
 * sur la famille laisserait passer l'envoi sans rien signaler.
 */
export const CODES_ZONE = ['metropole', 'corse', 'outre-mer'] as const;

export type CodeZone = (typeof CODES_ZONE)[number];

export const LIBELLE_ZONE: Record<CodeZone, string> = {
  metropole: 'France métropolitaine',
  corse: 'Corse',
  'outre-mer': 'Outre-mer',
};

/* -------------------------------------------------------------------------- */
/* Illustrations (décision D6)                                                 */
/* -------------------------------------------------------------------------- */

export const FORMES_ILLUSTRATION = [
  'bouteille',
  'bocal',
  'pot',
  'sachet',
  'coffret',
] as const;

export type FormeIllustration = (typeof FORMES_ILLUSTRATION)[number];

export const TEINTES_ILLUSTRATION = [
  'olive',
  'ocre',
  'terre-cuite',
  'encre',
  'creme',
] as const;

export type TeinteIllustration = (typeof TEINTES_ILLUSTRATION)[number];

/**
 * Cinq formes × cinq teintes = vingt-cinq vignettes possibles, quinze
 * occupées. La garde vérifie que les quinze combinaisons sont distinctes :
 * deux produits qui partagent la même silhouette colorée se confondent dans la
 * grille, et aucun texte alternatif ne rattrape ça.
 */
export interface Illustration {
  readonly forme: FormeIllustration;
  readonly teinte: TeinteIllustration;
}

/* -------------------------------------------------------------------------- */
/* Visuels engendrés (décision D35, tranche C14)                               */
/* -------------------------------------------------------------------------- */

/**
 * UNE VUE PHOTOGRAPHIQUE D'UN PRODUIT.
 *
 * Ce qui n'est PAS ici : les chemins des fichiers. Ils se RECOMPOSENT depuis le
 * slug, le nom de la vue et la largeur — `/produits/<slug>/<vue>-<largeur>.avif`.
 * Les écrire au catalogue reviendrait à tenir à la main quatre chaînes par vue
 * et par produit, soit une occasion de faute par ligne, et à laisser diverger le
 * catalogue du dossier. C'est aussi ce que la garde des images suppose : elle
 * refuse tout nom hors de ce vocabulaire fermé précisément parce qu'une fiche
 * calcule ses adresses au lieu de lire un dossier.
 *
 * Ce qui EST ici : ce qu'aucun chemin ne dit.
 */
export interface VueVisuel {
  /**
   * L'alternative textuelle, en français, descriptive et honnête.
   *
   * Non vide et DISTINCTE de celle des autres produits : les deux exigences
   * sont tenues par `scripts/regime-visuels.mjs` (écrit en C11, éprouvé sur
   * catalogue synthétique, branché ici). La seconde est la moins évidente et la
   * plus utile — quinze fiches portant « Photographie du produit » passent tous
   * les audits automatiques et ne disent rien à personne.
   */
  readonly alt: string;
  /**
   * La couleur moyenne du recadrage, en `#rrggbb`.
   *
   * Elle sert de RÉSERVATION : le composant la pose en fond de la boîte, à la
   * bonne taille, avant que le moindre octet d'image arrive. Le décalage cumulé
   * est déjà tenu par les dimensions intrinsèques ; ce que la couleur évite est
   * le rectangle blanc qui clignote sur un réseau lent.
   */
  readonly couleurDominante: string;
  /** Dimensions INTRINSÈQUES du plus grand dérivé — c'est le rapport qui compte. */
  readonly largeur: number;
  readonly hauteur: number;
  /**
   * Les largeurs livrées, pour le `srcset`. Croissantes, la dernière valant
   * `largeur` : le composant s'appuie dessus pour ne jamais proposer au
   * navigateur un fichier qui n'existe pas.
   */
  readonly largeurs: readonly number[];
}

/**
 * LE JEU DE VUES D'UN PRODUIT.
 *
 * `principal` est le paquet sur fond neutre, `ambiance` sa mise en situation.
 * `ambiance` est optionnelle et le restera : la série B ne couvre pas les
 * coffrets (leur vue « ouverte » est un zénithal, journal de génération du
 * 06/08), et une fiche doit s'afficher entière avec la seule vue principale.
 */
export interface Visuel {
  readonly principal: VueVisuel;
  readonly ambiance?: VueVisuel;
}

/** Les vues, dans l'ordre d'apparition sur une fiche. */
export const VUES_VISUEL = ['principal', 'ambiance'] as const;

export type NomVueVisuel = (typeof VUES_VISUEL)[number];

/* -------------------------------------------------------------------------- */
/* Variantes et conservation                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Un format vendable. Le SKU est la clé stable du projet : le panier, la
 * composition des coffrets et la liste blanche du coffret personnalisable ne
 * manipulent que des SKU, jamais des index de tableau.
 */
export interface Variante {
  readonly sku: string;
  /** Tel qu'il s'affiche : « 25 cl », « 180 g », « 4 pièces ». */
  readonly format: string;
  /** Entier TTC, recopié du frontmatter, JAMAIS obtenu par multiplication. */
  readonly prixCentimes: number;
  /** Poids expédié, emballage compris — donnée d'entrée du moteur C3. */
  readonly poidsGrammes: number;
  /** Démonstration : valeur plausible, sans mouvement de stock derrière. */
  readonly stock: number;
}

export type Conservation =
  | {
      readonly type: 'stable';
      /** Date de durabilité minimale, en mois. */
      readonly ddmMois: number;
      /** Présente quand la DDM affichée est dérivée et non saisie. */
      readonly note?: string;
    }
  | {
      readonly type: 'perissable';
      /** Date limite de consommation, en jours. */
      readonly dlcJours: number;
      /** Toujours vrai : un périssable de ce catalogue voyage sous isotherme. */
      readonly chaineDuFroid: true;
    }
  | { readonly type: 'scelle-hygiene' };

/**
 * Le seul prédicat autorisé pour décider d'une restriction d'expédition.
 * Voir `CODES_ZONE` ci-dessus : la règle est portée par le produit, pas par sa
 * famille.
 */
export function exigeChaineDuFroid(conservation: Conservation): boolean {
  return conservation.type === 'perissable' && conservation.chaineDuFroid;
}

/* -------------------------------------------------------------------------- */
/* Produit                                                                     */
/* -------------------------------------------------------------------------- */

/** Une pièce d'un coffret composé d'avance (coffret « La table du dimanche »). */
export interface PieceCoffret {
  readonly sku: string;
  /** Nom lisible tel qu'il figure sur la notice du coffret. */
  readonly nom: string;
  /** Prix de la pièce achetée seule — sert à afficher l'écart, pas à le fixer. */
  readonly prixCentimes: number;
}

export interface Produit {
  /** Segment d'URL : /boutique/<slug>. Immuable, c'est une adresse publique. */
  readonly slug: string;
  readonly nom: string;
  readonly famille: Famille;
  /** Une phrase pour la grille. Plafond de 140 signes, tenu par la garde. */
  readonly resume: string;
  /** Un paragraphe par entrée, dans l'ordre de la fiche. */
  readonly description: readonly string[];
  readonly origine: string;
  /** Un paragraphe par entrée. */
  readonly ingredients: readonly string[];
  /** Repris tel quel de la fiche, « aucun » compris. */
  readonly allergenes: readonly string[];
  readonly conservation: Conservation;
  /**
   * Conseil de conservation, un paragraphe par entrée. La mention de
   * rétractation n'y figure PAS : elle est calculée par
   * `src/lib/retractation.ts`, source unique des phrases juridiques.
   */
  readonly conseilConservation: readonly string[];
  /** Bien confectionné selon les spécifications du consommateur (L221-28, 3°). */
  readonly personnalisable: boolean;
  /** Tuple non vide : un produit sans format vendable n'existe pas. */
  readonly variantes: readonly [Variante, ...Variante[]];
  readonly miseEnAvant: boolean;
  /**
   * La silhouette SVG. REQUISE, et elle le reste (décision D35).
   *
   * Elle n'est plus la vitrine, elle est la structure de REPLI : produit sans
   * `visuel`, impression, espace de gestion, états vides. La garder requise est
   * ce qui permet à `visuel` d'être optionnel sans qu'aucune page ne puisse se
   * retrouver sans rien à montrer — et ce qui n'a cassé aucune fixture.
   */
  readonly illustration: Illustration;
  /**
   * Les photographies engendrées (décision D35, livrées à partir de C14).
   *
   * OPTIONNEL, et c'est le point : le catalogue doit rester servable sans
   * image. Un produit ajouté sans son jeu de visuels s'affiche à la silhouette,
   * il ne casse pas. C14 ne le pose que sur la fiche pilote ; C15 le pose sur
   * les quatorze autres.
   *
   * HORS DES CHAMPS MODIFIABLES PAR LA SURCOUCHE MARCHAND (décision D25) : le
   * marchand règle un prix, un stock, une disponibilité, une mise en avant et
   * un résumé. Une image livrée n'est pas un réglage — la changer depuis un
   * navigateur ferait pointer la fiche vers un fichier qui n'a pas été produit
   * par le pipeline, donc jamais relu, jamais pesé et jamais déshabillé.
   */
  readonly visuel?: Visuel;
  /** Coffret composé d'avance : les pièces qu'il contient. */
  readonly composition?: readonly PieceCoffret[];
  /** Coffret personnalisable : liste blanche des SKU choisissables. */
  readonly piecesEligibles?: readonly string[];
  /**
   * Retrait de la vente sans suppression de la fiche (tranche C6).
   *
   * ABSENT du catalogue versionné, et c'est volontaire : les quinze références
   * sont en vente, un champ posé quinze fois à `true` n'apprendrait rien. Le
   * champ n'existe que lorsque la surcouche marchand l'a posé, et seul `false`
   * a un effet. Toute lecture passe donc par `estDisponible()` ci-dessous, qui
   * traite l'absence comme la valeur vraie.
   *
   * Pourquoi retirer plutôt que supprimer : le slug est une adresse publique
   * (voir `Produit.slug`). Une fiche effacée répond 404 à un lien partagé, à un
   * favori, à un résultat de moteur. Une fiche indisponible se lit encore, dit
   * qu'elle ne se commande pas, et redevient commandable d'un clic.
   */
  readonly disponible?: boolean;
}

/**
 * Ce produit est-il en vente ?
 *
 * Le seul prédicat autorisé pour lire `disponible` : l'absence du champ vaut
 * `true`, et écrire `produit.disponible === true` ferait disparaître les quinze
 * références du catalogue livré, qui ne le portent pas.
 */
export function estDisponible(produit: Pick<Produit, 'disponible'>): boolean {
  return produit.disponible !== false;
}
