import { analyserEtatPanier, type EtatPanier } from '@/lib/panier/reducteur';

/**
 * LE PANIER QUI SURVIT À LA FERMETURE DE L'ONGLET.
 *
 * ---------------------------------------------------------------------------
 * Un stockage INJECTÉ, et pourquoi ça compte
 * ---------------------------------------------------------------------------
 *
 * Ni `window`, ni `localStorage`, ni `typeof window !== 'undefined'` dans ce
 * fichier. Les deux fonctions reçoivent un objet compatible `Storage` en
 * paramètre. Trois conséquences, dans l'ordre où elles se sont imposées :
 *
 * 1. Les tests tournent sous Node, sans DOM et sans jsdom, et vérifient les
 *    cas qui comptent vraiment — du JSON invalide, une version inconnue, un
 *    stockage qui refuse d'écrire — en passant trois lignes de faux objet.
 * 2. Le module reste importable par un composant serveur sans exploser.
 * 3. Le jour où la démonstration voudra un panier partagé par lien (un
 *    stockage adossé à l'URL, par exemple), c'est le seul argument qui change.
 *
 * ---------------------------------------------------------------------------
 * L'enveloppe versionnée
 * ---------------------------------------------------------------------------
 *
 * Ce qui est écrit n'est pas l'état nu mais `{ version, panier }`. Le numéro
 * de version est la seule chose qui permettra, un jour, de reconnaître un
 * panier écrit par une version antérieure du site — et de le jeter proprement
 * plutôt que de le lire de travers. Ici, toute version différente de 1 est
 * REJETÉE : la démonstration n'a pas d'historique à migrer, et un panier
 * abandonné vaut moins qu'une lecture douteuse.
 *
 * La clé porte le même numéro (`…panier.v1`). C'est redondant avec le champ
 * `version`, volontairement : un jour où le format changera vraiment, la clé
 * v2 laissera la v1 intacte dans le navigateur du visiteur, et les deux
 * versions du site cohabiteront pendant un déploiement progressif sans se
 * marcher dessus.
 *
 * ---------------------------------------------------------------------------
 * Aucune lecture ne lève, aucune écriture ne lève
 * ---------------------------------------------------------------------------
 *
 * `localStorage` échoue pour de vrai : navigation privée sur certains
 * navigateurs, quota dépassé, stockage désactivé par une politique
 * d'entreprise. Une exception non rattrapée pendant l'hydratation casse la
 * page entière. Les deux fonctions rattrapent donc, et rendent une valeur qui
 * dit ce qui s'est passé : `null` pour une lecture qui n'a rien donné, `false`
 * pour une écriture qui n'a pas pris.
 */

/** La clé du stockage. Le numéro de version y figure : voir l'en-tête. */
export const CLE_PANIER = 'maison-vaubrune.panier.v1';

/** La seule version d'enveloppe que ce code sait lire. */
export const VERSION_PANIER = 1;

/**
 * Le strict nécessaire de l'interface `Storage` du navigateur.
 *
 * Déclarée ici plutôt qu'empruntée à la bibliothèque du DOM pour que le module
 * ne dépende d'aucun type global : `localStorage` la satisfait sans rien
 * ajouter, et un objet de trois lignes aussi.
 */
export interface StockageCompatible {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

/**
 * L'état de panier conservé dans ce stockage, ou `null` s'il n'y en a pas
 * d'exploitable. Les quatre manières de ne rien trouver — clé absente, JSON
 * invalide, enveloppe méconnaissable, contenu mal formé — rendent toutes la
 * même valeur : l'appelant n'a qu'un cas à traiter.
 */
export function lire(stockage: StockageCompatible): EtatPanier | null {
  let brut: string | null;

  try {
    brut = stockage.getItem(CLE_PANIER);
  } catch {
    return null;
  }

  if (brut === null) {
    return null;
  }

  let enveloppe: unknown;

  try {
    enveloppe = JSON.parse(brut);
  } catch {
    return null;
  }

  if (typeof enveloppe !== 'object' || enveloppe === null) {
    return null;
  }

  const { version, panier } = enveloppe as {
    readonly version?: unknown;
    readonly panier?: unknown;
  };

  if (version !== VERSION_PANIER) {
    return null;
  }

  return analyserEtatPanier(panier);
}

/**
 * Écrit l'état dans ce stockage. Rend `false` si l'écriture n'a pas pris —
 * l'application continue de fonctionner, le panier ne survivra simplement pas
 * à la fermeture de l'onglet.
 */
export function ecrire(stockage: StockageCompatible, etat: EtatPanier): boolean {
  try {
    stockage.setItem(CLE_PANIER, JSON.stringify({ version: VERSION_PANIER, panier: etat }));
    return true;
  } catch {
    return false;
  }
}
