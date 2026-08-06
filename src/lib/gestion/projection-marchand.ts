import { LIBELLE_FAMILLE, type Produit } from '@/lib/types';

/**
 * LE CATALOGUE, VU PAR L'ESPACE DE GESTION. Une seconde projection, et pourquoi.
 *
 * `panier/catalogue-panier.ts` en livre déjà une (décision D17) : vingt-trois
 * articles aplatis, chacun portant ce dont le PANIER a besoin — prix, poids,
 * stock, régime de rétractation, allergènes. Elle ne convient pas ici, dans les
 * deux sens à la fois :
 *
 * - il lui MANQUE ce que l'écran marchand édite — le résumé, la mise en avant,
 *   la disponibilité — et surtout la STRUCTURE : le marchand tient un tableau
 *   de quinze produits portant leurs formats, pas une liste de vingt-trois
 *   articles où le même produit revient trois fois ;
 * - elle porte EN TROP les phrases de rétractation et les allergènes, soit
 *   plusieurs centaines de signes par article qu'aucun écran de gestion
 *   n'affiche, et qui voyageraient dans la charge utile de chaque page.
 *
 * Deux projections valent mieux qu'une projection élargie jusqu'à contenir les
 * besoins des deux : la seconde aurait fini par tout porter, ce qui est
 * exactement la situation que D17 évite.
 *
 * Cette projection est PURE et calculée côté serveur. Elle ne connaît pas la
 * surcouche : les écrans lui superposent les valeurs du marchand au moment de
 * l'affichage, comme le fait la vitrine.
 */

export interface VarianteMarchand {
  readonly sku: string;
  readonly format: string;
  readonly prixCentimes: number;
  readonly poidsGrammes: number;
  readonly stock: number;
}

export interface ProduitMarchand {
  readonly slug: string;
  readonly nom: string;
  /** Libellé de famille, déjà résolu : l'écran n'a pas à connaître la table. */
  readonly famille: string;
  readonly resume: string;
  readonly miseEnAvant: boolean;
  readonly variantes: readonly VarianteMarchand[];
}

export function projeterPourMarchand(
  produits: readonly Produit[],
): readonly ProduitMarchand[] {
  return produits.map((produit) => ({
    slug: produit.slug,
    nom: produit.nom,
    famille: LIBELLE_FAMILLE[produit.famille],
    resume: produit.resume,
    miseEnAvant: produit.miseEnAvant,
    variantes: produit.variantes.map((variante) => ({
      sku: variante.sku,
      format: variante.format,
      prixCentimes: variante.prixCentimes,
      poidsGrammes: variante.poidsGrammes,
      stock: variante.stock,
    })),
  }));
}
