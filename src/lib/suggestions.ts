import { estDisponible, type Produit } from '@/lib/types';

/**
 * LES PRODUITS QU'ON PROPOSE APRÈS UN AJOUT AU PANIER (tranche C23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE MODULE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un professionnel du commerce en ligne a relu la boutique : « ce qui pourrait
 * être intéressant, c'est de pousser des produits complémentaires sur la fiche
 * produit pour augmenter les paniers moyens ». Le catalogue n'a AUCUN champ de
 * relation générique — pas d'`id` lié, pas d'étiquettes, pas de « souvent
 * achetés ensemble ». Les seuls liens entre produits sont la `famille` et les
 * deux champs propres aux coffrets. La règle doit donc se tirer de ce qui
 * existe, sans inventer une table de correspondances que personne ne tiendrait
 * à jour.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA ROUE — et pourquoi ce n'est pas « l'ordre du catalogue »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le catalogue est lu comme un ANNEAU, à partir du produit qui suit celui de la
 * fiche. Deux propriétés en découlent, et la première vaut à elle seule le
 * détour :
 *
 * 1. LE PRODUIT COURANT EST EXCLU PAR CONSTRUCTION. Il n'y a pas de test
 *    d'égalité de slug à écrire, donc pas de test d'égalité à oublier le jour
 *    où quelqu'un ajoutera un filtre. C'est la leçon de C20 prise à l'endroit :
 *    on ne répare pas le seizième cas, on retire la possibilité qu'il existe.
 *
 * 2. LE REPLI REND DES VOISINS D'ÉTAL. Il est le cas DOMINANT et non
 *    l'exception : sur les sept familles du catalogue, QUATRE n'ont pas de quoi
 *    remplir deux places — épicerie sèche (1 produit), infusions (1), frais (2,
 *    donc un seul voisin), coffrets (2). Un repli « les premiers du catalogue »
 *    donnerait la MÊME paire d'huiles à toutes les familles solitaires. La roue
 *    donne à chaque fiche des voisins différents, et de façon déterministe.
 *
 * Le rang est ensuite simple : les candidats de la même famille d'abord, dans
 * l'ordre de la roue ; les autres ensuite, dans l'ordre de la roue.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CE MODULE NE VOIT PAS, ET IL FAUT LE DIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il tourne sur le catalogue VERSIONNÉ, côté serveur. Il ne voit donc pas la
 * surcouche marchand du visiteur (décision D24) : un produit rendu indisponible
 * depuis l'espace de gestion peut encore apparaître en suggestion. Deux choses
 * atténuent l'écart, et la seconde est gratuite — le PRIX affiché dans la carte
 * honore la surcouche (les feuilles de vitrine sont clientes), et une
 * suggestion est un LIEN, pas un achat : la fiche visée dit elle-même « retiré
 * de la vente » et éteint son bouton. Rien de faux n'est vendu.
 *
 * Masquer la carte demanderait une feuille qui RETIRE une boîte, ce que
 * l'invariant de C6 interdit explicitement. L'écart est assumé et écrit.
 */

/**
 * Les produits à proposer à côté de `slug`, au plus `combien`.
 *
 * La fonction est TOTALE : elle rend moins que `combien` si le catalogue ne
 * peut pas fournir, et un tableau vide si le slug lui est inconnu. Mieux vaut
 * rien qu'un faux — c'est déjà la doctrine de `rangInventaire()` dans
 * `vitrine.ts`.
 */
export function suggestionsPourProduit(
  catalogue: readonly Produit[],
  slug: string,
  combien: number,
): readonly Produit[] {
  const position = catalogue.findIndex((produit) => produit.slug === slug);

  if (position === -1) {
    return [];
  }

  /* L'anneau, ouvert juste après le produit courant. Il n'y figure donc pas. */
  const roue = [...catalogue.slice(position + 1), ...catalogue.slice(0, position)];

  const candidats = roue.filter(
    (produit) =>
      estDisponible(produit) && produit.variantes.some((variante) => variante.stock > 0),
  );

  const famille = catalogue[position]?.famille;
  const memeFamille = candidats.filter((produit) => produit.famille === famille);
  const autres = candidats.filter((produit) => produit.famille !== famille);

  return [...memeFamille, ...autres].slice(0, Math.max(0, combien));
}
