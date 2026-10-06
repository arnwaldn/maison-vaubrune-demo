import {
  estDisponibleAffiche,
  prixAffiche,
  stockAffiche,
} from '@/lib/catalogue-navigateur';
import type { SurcoucheCatalogue } from '@/lib/catalogue';
import { cleLigne, type ActionPanier, type LignePanier } from '@/lib/panier/reducteur';

/**
 * CE QU'UNE VIGNETTE MONTRE DE LA LIGNE D'ACHAT, DÉCIDÉ ICI ET NULLE PART AILLEURS (C26).
 *
 * Le composant client `AchatVignette` ne décide de rien : il lit ce module et
 * dessine. La raison de son entrée au périmètre de couverture (D16) est la
 * même que pour `suggestions.ts` : il décide d'un CHIFFRE montré — le prix du
 * format choisi, la quantité au panier, le plafond du « + » — et une branche
 * perdue montrerait un prix ou un plafond que la fiche contredit.
 *
 * ---------------------------------------------------------------------------
 * LES CINQ MODES
 * ---------------------------------------------------------------------------
 *
 * - `ajouter` : le format choisi n'est pas au panier, il est vendable.
 * - `quantite` : il y est ; la ligne devient `[ − ] N [ + ]`.
 * - `composer` : coffret dont le format exige un choix de pièces
 *   (`piecesRequises`) — impossible depuis une vignette, on renvoie à la fiche.
 * - `indisponible` : le marchand a retiré le produit de la vente (D24).
 * - `epuise` : plus de stock pour ce format, ni au catalogue ni en surcouche.
 *
 * L'ORDRE DES TESTS EST CELUI DE LEUR PORTÉE, comme dans `BoutonAjouter` : un
 * produit retiré ne se commande d'aucun format ; un coffret se compose sur sa
 * fiche, quel que soit son stock ; un format épuisé n'empêche pas les autres.
 * Une quantité déjà au panier l'emporte sur « épuisé » : le visiteur doit
 * pouvoir la RETIRER même si le marchand a baissé le stock sous elle.
 *
 * ---------------------------------------------------------------------------
 * LA SURCOUCHE PASSE PAR LES MÊMES FONCTIONS QUE LA FICHE (D24)
 * ---------------------------------------------------------------------------
 *
 * `prixAffiche`, `stockAffiche`, `estDisponibleAffiche` : jamais le
 * `prixCentimes` brut de la projection, sinon un prix corrigé dans `/gestion`
 * s'afficherait sur la fiche et pas sur la vignette. Le plafond de la quantité
 * est le plus petit des deux stocks (celui de la surcouche et celui du
 * catalogue livré), parce que le réducteur ne connaît que le second : augmenter
 * un stock n'élargit rien, le baisser contraint réellement l'ajout.
 */

/** Un format de la vignette — la projection ÉTROITE qui traverse la frontière cliente (D17). */
export interface FormatVignette {
  readonly sku: string;
  readonly format: string;
  readonly prixCentimes: number;
  readonly stock: number;
  readonly piecesRequises: number | null;
}

export type ModeAchat = 'ajouter' | 'quantite' | 'composer' | 'indisponible' | 'epuise';

export interface DecisionAchat {
  readonly mode: ModeAchat;
  readonly sku: string;
  readonly format: string;
  /** Le prix affiché, surcouche appliquée. */
  readonly prixCentimes: number;
  /** La quantité de CE format au panier ; zéro s'il n'y est pas. */
  readonly quantite: number;
  /** Le plafond de la quantité : le plus petit des deux stocks. */
  readonly max: number;
}

type LigneLue = Pick<LignePanier, 'sku' | 'quantite' | 'composition'>;

/**
 * La pastille cochée tant que le visiteur n'en a pas choisi une.
 *
 * Le format déjà au panier — le PREMIER DANS L'ORDRE DU CATALOGUE s'il y en a
 * plusieurs —, sinon le premier du produit. Jamais par prix : le catalogue
 * range les formats du plus petit au plus grand, et un prix de surcouche qui
 * rendrait le grand format moins cher ne doit pas déplacer la pastille. Sans
 * la règle du panier, le visiteur qui a mis 50 cl puis rechargé verrait
 * « Ajouter » sur 25 cl et croirait son panier vidé.
 */
export function formatParDefaut(
  formats: readonly [FormatVignette, ...FormatVignette[]],
  lignes: readonly LigneLue[],
): FormatVignette {
  return formats.find((format) => quantiteAuPanier(lignes, format.sku) > 0) ?? formats[0];
}

/** La quantité d'un SKU sans composition — la seule ligne d'une vignette. */
function quantiteAuPanier(lignes: readonly LigneLue[], sku: string): number {
  return lignes.find((ligne) => cleLigne(ligne) === sku)?.quantite ?? 0;
}

export function decrireAchat({
  slug,
  formats,
  skuChoisi,
  lignes,
  surcouche,
}: {
  readonly slug: string;
  readonly formats: readonly [FormatVignette, ...FormatVignette[]];
  /** Le choix explicite du visiteur ; `null` tant qu'il n'a rien coché. */
  readonly skuChoisi: string | null;
  readonly lignes: readonly LigneLue[];
  readonly surcouche: SurcoucheCatalogue;
}): DecisionAchat {
  const format =
    formats.find((candidat) => candidat.sku === skuChoisi) ?? formatParDefaut(formats, lignes);

  const prixCentimes = prixAffiche(surcouche, slug, format.sku, format.prixCentimes);
  const max = Math.min(stockAffiche(surcouche, slug, format.sku, format.stock), format.stock);
  const quantite = quantiteAuPanier(lignes, format.sku);
  const base = { sku: format.sku, format: format.format, prixCentimes, quantite, max };

  if (!estDisponibleAffiche(surcouche, slug)) {
    return { ...base, mode: 'indisponible' };
  }

  if (format.piecesRequises !== null) {
    return { ...base, mode: 'composer' };
  }

  if (quantite > 0) {
    return { ...base, mode: 'quantite' };
  }

  return { ...base, mode: max <= 0 ? 'epuise' : 'ajouter' };
}

/** L'action du bouton « Ajouter » ; `null` hors du mode `ajouter`. */
export function actionAjouter(decision: DecisionAchat): ActionPanier | null {
  return decision.mode === 'ajouter'
    ? { type: 'ajouter', sku: decision.sku, quantite: 1 }
    : null;
}

/** L'action de « + » ; `null` hors du mode `quantite` ou au plafond. */
export function actionPlus(decision: DecisionAchat): ActionPanier | null {
  return decision.mode === 'quantite' && decision.quantite < decision.max
    ? { type: 'changerQuantite', cle: decision.sku, quantite: decision.quantite + 1 }
    : null;
}

/** L'action de « − » : la ligne disparaît à un, c'est `retirer`. */
export function actionMoins(decision: DecisionAchat): ActionPanier | null {
  if (decision.mode !== 'quantite') {
    return null;
  }

  return decision.quantite > 1
    ? { type: 'changerQuantite', cle: decision.sku, quantite: decision.quantite - 1 }
    : { type: 'retirer', cle: decision.sku };
}
