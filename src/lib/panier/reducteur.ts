import { CODES_ZONE, type CodeZone } from '@/lib/types';

/**
 * L'ÉTAT DU PANIER ET SES TRANSITIONS. Fonctions pures, aucun React, aucun
 * navigateur, aucun catalogue importé.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce fichier n'importe pas le catalogue
 * ---------------------------------------------------------------------------
 *
 * Ce module est le premier du projet à finir dans le paquet JavaScript envoyé
 * au navigateur, et il y finit sur TOUTES les pages : la pastille du panier
 * vit dans l'en-tête, donc le fournisseur qui la nourrit vit dans la mise en
 * page racine. Tout ce qu'on importe ici est donc téléchargé par un visiteur
 * qui lit la page d'accueil et ne commandera jamais rien.
 *
 * Or le réducteur a besoin de DEUX informations du catalogue, et de deux
 * seulement : quels SKU existent, et quel stock chacun porte. Importer
 * `src/donnees/catalogue.ts` pour cela embarquerait dans le paquet les quinze
 * fiches complètes — descriptions, ingrédients, conseils de conservation —
 * soit des dizaines de kilo-octets de prose qu'aucune ligne de code ne lit.
 * Les deux informations utiles arrivent donc par un paramètre `stocks`, que
 * la mise en page racine calcule côté serveur et transmet au fournisseur.
 * Coût mesuré de ce parti pris : vingt-trois entrées `"SKU": nombre` dans la
 * charge utile RSC, contre un catalogue entier dans le paquet.
 *
 * ---------------------------------------------------------------------------
 * L'identité d'une ligne : le SKU, sauf pour le coffret composé
 * ---------------------------------------------------------------------------
 *
 * Deux exemplaires du même format d'huile forment UNE ligne de quantité deux.
 * Deux coffrets « Composez le vôtre » dont les pièces diffèrent forment DEUX
 * lignes, parce que ce ne sont pas les mêmes objets : ils portent le même SKU
 * et n'ont ni le même contenu, ni les mêmes allergènes, ni la même date de
 * durabilité. L'identité d'une ligne est donc la paire (SKU, composition), et
 * `cleLigne()` en donne la forme textuelle — utilisée comme clé React, comme
 * désignation dans les actions, et comme critère de fusion à l'ajout.
 *
 * La composition est comparée COMME UN ENSEMBLE : les mêmes trois pièces
 * cochées dans un autre ordre donnent la même clé, donc la même ligne. C'est
 * ce que l'acheteur comprend, et ce que des cases à cocher produisent
 * naturellement selon l'ordre où il clique.
 *
 * ---------------------------------------------------------------------------
 * Les quatre invariants, tenus ici et nulle part ailleurs
 * ---------------------------------------------------------------------------
 *
 * 1. La quantité d'une ligne ne dépasse JAMAIS le stock du SKU. Le bornage est
 *    SILENCIEUX : demander douze exemplaires d'un produit qui en a neuf pose
 *    neuf, sans erreur ni message d'échec. Un panier qui refuse une action est
 *    un panier qu'on quitte ; un panier qui prend ce qu'il peut et affiche le
 *    résultat se corrige d'un coup d'œil.
 * 2. Une quantité nulle ou négative n'existe pas : la ligne est retirée.
 * 3. Un SKU absent du catalogue n'entre pas dans le panier et n'y survit pas.
 * 4. `restaurer` ne lève jamais. Quoi qu'il trouve — du JSON valide mais faux,
 *    un état d'une version antérieure, un objet vide — il rend au pire le
 *    panier vide. Une exception ici casserait l'hydratation de toutes les
 *    pages du site, pour un panier abandonné dans un navigateur.
 */

/* -------------------------------------------------------------------------- */
/* L'état                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Une ligne de panier.
 *
 * Elle ne porte NI le prix, NI le poids, NI le nom du produit : uniquement de
 * quoi les retrouver dans le catalogue. C'est la règle qui empêche un panier
 * vieux de trois semaines d'afficher un prix qui n'a plus cours — le prix
 * affiché est toujours celui du catalogue courant, jamais celui qui a été
 * recopié au moment du clic.
 */
export interface LignePanier {
  readonly sku: string;
  /** Entier strictement positif ; une ligne à zéro est retirée, pas conservée. */
  readonly quantite: number;
  /** SKU des pièces choisies, pour le coffret « Composez le vôtre » seulement. */
  readonly composition?: readonly string[];
}

export interface EtatPanier {
  readonly lignes: readonly LignePanier[];
  readonly zone: CodeZone;
}

/**
 * Panier vide, métropole.
 *
 * La métropole est la zone par défaut parce que c'est la seule qui accepte
 * tous les produits du catalogue : ouvrir sur la Corse ferait afficher une
 * impossibilité d'expédition à qui n'a encore rien choisi.
 */
export const ETAT_INITIAL: EtatPanier = { lignes: [], zone: 'metropole' };

/** SKU → stock disponible. Un SKU absent de cet objet n'existe pas. */
export type StocksParSku = Readonly<Record<string, number>>;

/* -------------------------------------------------------------------------- */
/* Les actions                                                                 */
/* -------------------------------------------------------------------------- */

export type ActionPanier =
  | {
      readonly type: 'ajouter';
      readonly sku: string;
      /** Un si absent. */
      readonly quantite?: number;
      /** Coffret « Composez le vôtre » uniquement. */
      readonly composition?: readonly string[];
    }
  | { readonly type: 'changerQuantite'; readonly cle: string; readonly quantite: number }
  | { readonly type: 'retirer'; readonly cle: string }
  | { readonly type: 'vider' }
  | { readonly type: 'choisirZone'; readonly zone: CodeZone }
  /** La charge est `unknown` À DESSEIN : elle vient d'un stockage non fiable. */
  | { readonly type: 'restaurer'; readonly etat: unknown };

/* -------------------------------------------------------------------------- */
/* Identité d'une ligne                                                        */
/* -------------------------------------------------------------------------- */

/**
 * La clé d'une ligne : son SKU seul, ou son SKU suivi de sa composition triée.
 *
 * Le tri sert à l'IDENTITÉ, pas à l'affichage : la ligne conserve la
 * composition dans l'ordre où elle a été construite, seule sa clé est
 * normalisée. Sans cela, cocher les mêmes trois pièces dans un autre ordre
 * créerait une seconde ligne indiscernable de la première à l'écran.
 */
export function cleLigne(ligne: Pick<LignePanier, 'sku' | 'composition'>): string {
  if (ligne.composition === undefined || ligne.composition.length === 0) {
    return ligne.sku;
  }

  return `${ligne.sku}#${[...ligne.composition].sort().join('+')}`;
}

/**
 * Construit une ligne sans jamais poser un `composition: undefined` explicite.
 *
 * `exactOptionalPropertyTypes` distingue « champ absent » de « champ présent
 * valant `undefined` », et `JSON.stringify` ne les distingue pas : écrire
 * `{ sku, quantite, composition: undefined }` produirait un objet qui ne se
 * relit pas comme il s'écrit.
 */
function creerLigne(
  sku: string,
  quantite: number,
  composition: readonly string[] | undefined,
): LignePanier {
  return composition === undefined ? { sku, quantite } : { sku, quantite, composition };
}

/* -------------------------------------------------------------------------- */
/* Lecture défensive d'un état venu d'ailleurs                                 */
/* -------------------------------------------------------------------------- */

function estCodeZone(valeur: unknown): valeur is CodeZone {
  return typeof valeur === 'string' && (CODES_ZONE as readonly string[]).includes(valeur);
}

/**
 * Un état de panier reconnu, ou `null`.
 *
 * Parti pris : UNE seule ligne malformée invalide TOUT l'état. Un panier à
 * moitié compris est plus dangereux qu'un panier vide — le client croirait
 * retrouver sa sélection et paierait un contenu amputé sans le voir. Le rejet
 * en bloc, lui, se remarque et se refait en trois clics.
 *
 * Ce qui relève au contraire d'une purge ligne à ligne — un SKU retiré du
 * catalogue, un stock descendu sous la quantité gardée — est traité par
 * `restaurer` plus bas : ce n'est pas une donnée corrompue, c'est un étal qui
 * a bougé depuis la dernière visite.
 */
export function analyserEtatPanier(brut: unknown): EtatPanier | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }

  const candidat = brut as { readonly lignes?: unknown; readonly zone?: unknown };

  if (!Array.isArray(candidat.lignes) || !estCodeZone(candidat.zone)) {
    return null;
  }

  const lignes: LignePanier[] = [];

  for (const brute of candidat.lignes as readonly unknown[]) {
    const ligne = analyserLigne(brute);

    if (ligne === null) {
      return null;
    }

    lignes.push(ligne);
  }

  return { lignes, zone: candidat.zone };
}

function analyserLigne(brut: unknown): LignePanier | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }

  const candidat = brut as {
    readonly sku?: unknown;
    readonly quantite?: unknown;
    readonly composition?: unknown;
  };

  if (typeof candidat.sku !== 'string' || candidat.sku === '') {
    return null;
  }

  if (
    typeof candidat.quantite !== 'number' ||
    !Number.isInteger(candidat.quantite) ||
    candidat.quantite <= 0
  ) {
    return null;
  }

  if (candidat.composition === undefined) {
    return creerLigne(candidat.sku, candidat.quantite, undefined);
  }

  if (
    !Array.isArray(candidat.composition) ||
    !(candidat.composition as readonly unknown[]).every((piece) => typeof piece === 'string')
  ) {
    return null;
  }

  return creerLigne(
    candidat.sku,
    candidat.quantite,
    candidat.composition as readonly string[],
  );
}

/* -------------------------------------------------------------------------- */
/* Le réducteur                                                                */
/* -------------------------------------------------------------------------- */

/**
 * La transition d'état. Pure : mêmes entrées, même sortie, aucun effet.
 *
 * Les stocks arrivent en troisième paramètre plutôt que par un import (voir
 * l'en-tête du fichier). Le fournisseur React referme dessus pour obtenir la
 * signature à deux arguments qu'attend `useReducer`.
 */
export function reduirePanier(
  etat: EtatPanier,
  action: ActionPanier,
  stocks: StocksParSku,
): EtatPanier {
  switch (action.type) {
    case 'ajouter':
      return ajouter(etat, action.sku, action.quantite ?? 1, action.composition, stocks);

    case 'changerQuantite':
      return fixerQuantite(etat, action.cle, action.quantite, stocks);

    case 'retirer':
      return { ...etat, lignes: etat.lignes.filter((ligne) => cleLigne(ligne) !== action.cle) };

    case 'vider':
      return { ...etat, lignes: [] };

    case 'choisirZone':
      return { ...etat, zone: action.zone };

    case 'restaurer':
      return restaurer(action.etat, stocks);
  }
}

function ajouter(
  etat: EtatPanier,
  sku: string,
  demande: number,
  composition: readonly string[] | undefined,
  stocks: StocksParSku,
): EtatPanier {
  const stock = stocks[sku];

  /* SKU inconnu ou épuisé : le panier ne bouge pas. On ne lève pas — l'appelant
     est une case cliquée dans une page, et une exception y coûterait l'écran
     entier pour un bouton qui n'aurait pas dû être actif. */
  if (stock === undefined || stock <= 0 || demande <= 0) {
    return etat;
  }

  const cle = cleLigne({ sku, ...(composition === undefined ? {} : { composition }) });
  const existante = etat.lignes.find((ligne) => cleLigne(ligne) === cle);

  if (existante === undefined) {
    return {
      ...etat,
      lignes: [...etat.lignes, creerLigne(sku, Math.min(demande, stock), composition)],
    };
  }

  return {
    ...etat,
    lignes: etat.lignes.map((ligne) =>
      cleLigne(ligne) === cle
        ? { ...ligne, quantite: Math.min(ligne.quantite + demande, stock) }
        : ligne,
    ),
  };
}

function fixerQuantite(
  etat: EtatPanier,
  cle: string,
  quantite: number,
  stocks: StocksParSku,
): EtatPanier {
  /* Une saisie inexploitable ne touche à rien. Le cas se produit vraiment : un
     champ numérique vidé au clavier rend `NaN` à `parseInt`, et `NaN` traversé
     par `Math.min` puis comparé à zéro ferait DISPARAÎTRE la ligne — l'article
     s'effacerait du panier parce qu'on a appuyé sur « effacement arrière ». */
  if (!Number.isInteger(quantite)) {
    return etat;
  }

  if (quantite <= 0) {
    return { ...etat, lignes: etat.lignes.filter((ligne) => cleLigne(ligne) !== cle) };
  }

  const lignes = etat.lignes
    .map((ligne) =>
      cleLigne(ligne) === cle
        ? { ...ligne, quantite: Math.min(quantite, stocks[ligne.sku] ?? 0) }
        : ligne,
    )
    .filter((ligne) => ligne.quantite > 0);

  return { ...etat, lignes };
}

/**
 * Reprend un état venu du stockage, en le confrontant au catalogue du jour.
 *
 * Deux traitements bien distincts, et c'est le cœur de cette fonction :
 * l'état MALFORMÉ est rejeté en bloc (panier vide, zone par défaut), tandis
 * qu'un état BIEN FORMÉ mais devenu faux est purgé ligne à ligne. Une
 * référence retirée du catalogue disparaît sans emporter le reste du panier ;
 * une quantité supérieure au stock du jour est ramenée au stock.
 */
function restaurer(brut: unknown, stocks: StocksParSku): EtatPanier {
  const etat = analyserEtatPanier(brut);

  if (etat === null) {
    return ETAT_INITIAL;
  }

  const lignes: LignePanier[] = [];

  for (const ligne of etat.lignes) {
    const stock = stocks[ligne.sku];

    if (stock === undefined || stock <= 0) {
      continue;
    }

    const cle = cleLigne(ligne);

    if (lignes.some((deja) => cleLigne(deja) === cle)) {
      continue;
    }

    lignes.push(creerLigne(ligne.sku, Math.min(ligne.quantite, stock), ligne.composition));
  }

  return { lignes, zone: etat.zone };
}

/* -------------------------------------------------------------------------- */
/* Lectures dérivées                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Le nombre d'articles du panier — la somme des quantités, pas le nombre de
 * lignes. C'est la seule valeur dont la pastille de l'en-tête a besoin, et
 * elle ne demande aucun accès au catalogue : la pastille reste donc le plus
 * petit îlot client possible.
 */
export function nombreArticles(etat: EtatPanier): number {
  return etat.lignes.reduce((total, ligne) => total + ligne.quantite, 0);
}
