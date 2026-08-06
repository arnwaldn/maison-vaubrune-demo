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
  readonly illustration: Illustration;
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
