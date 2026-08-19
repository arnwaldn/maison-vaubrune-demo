import { estDisponible, type Famille, type Produit } from '@/lib/types';

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

/**
 * CE QUE LE PANIER SAIT DE LUI-MÊME, RÉDUIT À CE QUI SERT À CHOISIR (C24).
 *
 * La page `/panier` est `force-static` : au moment où elle est rendue, le
 * panier n'existe pas encore — il vit dans le navigateur du visiteur. La
 * sélection des suggestions doit donc se faire APRÈS hydratation, côté client,
 * là où le catalogue n'a pas le droit d'aller (décision D17).
 *
 * Ce type est le strict minimum qui permet de choisir sans le catalogue : un
 * slug pour désigner, une famille pour ranger. Ni nom, ni prix, ni prose. Le
 * pool est filtré côté serveur (disponible, en stock), si bien que le client
 * n'a plus aucun jugement de vente à porter — seulement un tri.
 */
export interface CandidatSuggestion {
  readonly slug: string;
  readonly famille: Famille;
}

/**
 * Les produits à proposer à côté d'un PANIER, au plus `combien`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA MÊME ROUE, AMORCÉE AILLEURS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `suggestionsPourProduit` ouvre l'anneau après LE produit de la fiche. Ici il
 * n'y a pas un produit mais un panier, et l'anneau s'ouvre après le DERNIER
 * article ajouté — le signal d'intention le plus frais, celui qui dit le mieux
 * ce que le visiteur est en train de composer. Un anneau ouvert après le
 * premier article donnerait, sur un panier qui grandit, toujours les mêmes
 * voisins : le rayon cesserait de suivre le client.
 *
 * DEUX EXCLUSIONS, ET LA SECONDE EST CELLE QUI COMPTE. Le produit courant était
 * exclu par construction sur la fiche ; ici il faut exclure TOUT le panier, et
 * c'est un filtre explicite — un tableau ne s'exclut pas par la géométrie d'un
 * anneau. C'est le seul endroit où cette fonction est structurellement plus
 * fragile que sa sœur, donc le seul qui demande un cas de test dédié.
 *
 * LE RANG SUIT LE PANIER, PAS LA FICHE. On préfère les familles DÉJÀ
 * REPRÉSENTÉES au panier : quelqu'un qui a pris deux miels est en train de
 * faire une commande de miels. C'est l'inverse du réflexe « proposer autre
 * chose », et c'est ce que le professionnel décrivait — « des produits
 * complémentaires pour augmenter les paniers moyens », pas un catalogue au
 * hasard.
 *
 * TOTALE, comme sa sœur : elle rend moins que `combien` si le pool ne peut pas
 * fournir, et rien du tout si tout le catalogue est déjà au panier — auquel cas
 * l'appelant fait disparaître le bloc plutôt que d'afficher un titre vide.
 */
export function suggestionsPourEnsemble(
  pool: readonly CandidatSuggestion[],
  slugsAuPanier: readonly string[],
  combien: number,
): readonly CandidatSuggestion[] {
  const dernier = slugsAuPanier.at(-1);
  const position = dernier === undefined ? -1 : pool.findIndex((c) => c.slug === dernier);

  /* Panier vide, ou dernier article absent du pool (retiré de la vente depuis
     qu'il y est entré) : l'anneau s'ouvre au début, ce qui reste déterministe. */
  const roue =
    position === -1 ? [...pool] : [...pool.slice(position + 1), ...pool.slice(0, position + 1)];

  const candidats = roue.filter((c) => !slugsAuPanier.includes(c.slug));

  const famillesDuPanier = new Set(
    pool.filter((c) => slugsAuPanier.includes(c.slug)).map((c) => c.famille),
  );

  const memeFamille = candidats.filter((c) => famillesDuPanier.has(c.famille));
  const autres = candidats.filter((c) => !famillesDuPanier.has(c.famille));

  return [...memeFamille, ...autres].slice(0, Math.max(0, combien));
}
