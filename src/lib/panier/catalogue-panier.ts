import type { StocksParSku } from '@/lib/panier/reducteur';
import { regimeRetractation, type Fondement } from '@/lib/retractation';
import { exigeChaineDuFroid, type Produit, type Variante } from '@/lib/types';

/**
 * LE CATALOGUE, VU PAR LE PANIER. Une projection, calculée côté serveur.
 *
 * ---------------------------------------------------------------------------
 * Le problème que ce module règle
 * ---------------------------------------------------------------------------
 *
 * Le panier travaille par SKU : il a besoin d'un prix, d'un poids, d'un stock,
 * d'un drapeau « frais » et de quelques libellés. Le catalogue, lui, porte
 * quinze fiches complètes — descriptions, ingrédients, conseils de
 * conservation — soit l'essentiel du poids de `src/donnees/catalogue.ts`.
 *
 * Or les composants du panier sont des ÎLOTS CLIENTS. Si l'un d'eux importait
 * `CATALOGUE`, l'empaqueteur suivrait l'import et enverrait la prose entière
 * au navigateur : aucune élimination de code mort ne sait retirer des champs
 * d'un objet littéral. La page panier paierait des dizaines de kilo-octets de
 * texte que personne n'y lit.
 *
 * La projection ci-dessous est la réponse. Elle est calculée dans les
 * composants SERVEUR (mise en page racine, page panier, page commande, fiche
 * produit) et transmise en propriété aux îlots clients : les octets voyagent
 * alors dans la charge utile RSC, aplatie dans le HTML et compressée avec lui,
 * au lieu de gonfler le paquet JavaScript. Le budget annoncé au client — la
 * note de rapidité est un engagement de ce projet — s'en trouve tenu.
 *
 * ---------------------------------------------------------------------------
 * Un article = une VARIANTE, pas un produit
 * ---------------------------------------------------------------------------
 *
 * Le catalogue s'organise en produits qui portent des variantes ; le panier
 * s'organise en SKU. La projection aplatit donc : quinze produits et
 * vingt-trois formats donnent vingt-trois articles, chacun portant ce que son
 * produit lui prête (nom, slug, allergènes, régime de rétractation) et ce qui
 * lui est propre (format, prix, poids, stock).
 *
 * Ce qu'elle ne contient pas est aussi important : ni description, ni
 * ingrédients, ni conseil de conservation, ni illustration. Un champ ajouté
 * ici est un champ envoyé sur chaque page qui affiche un panier.
 */

/* -------------------------------------------------------------------------- */
/* L'article                                                                   */
/* -------------------------------------------------------------------------- */

export interface ArticlePanier {
  readonly sku: string;
  /** Slug du produit porteur : sert aux liens et au regroupement des mentions. */
  readonly slug: string;
  readonly nomProduit: string;
  readonly format: string;
  readonly prixCentimes: number;
  /** Poids du COLIS, emballage compris — entrée du moteur de frais de port. */
  readonly poidsGrammes: number;
  readonly stock: number;
  /** Dérivé de `exigeChaineDuFroid()`, jamais de la famille (voir `types.ts`). */
  readonly perissable: boolean;
  readonly personnalisable: boolean;
  /** `null` quand le produit ouvre droit à rétractation. */
  readonly fondementRetractation: Fondement | null;
  /** La phrase de `regimeRetractation()`, jamais réécrite (décision D12). */
  readonly phraseRetractation: string;
  readonly allergenes: readonly string[];
  /**
   * Nombre de pièces à choisir pour un coffret personnalisable ; `null` pour
   * tout le reste. Voir `nombreDePiecesAChoisir()` ci-dessous.
   */
  readonly piecesRequises: number | null;
}

/* -------------------------------------------------------------------------- */
/* La projection                                                               */
/* -------------------------------------------------------------------------- */

/** Le nombre de pièces se lit en tête du format : « 3 pièces », « 5 pièces ». */
const NOMBRE_EN_TETE = /^(\d+)/;

/**
 * Combien de pièces ce format demande-t-il de choisir ?
 *
 * ÉCART ASSUMÉ. Le catalogue livré en C2 ne porte aucun champ dédié : le
 * coffret « Composez le vôtre » distingue ses deux formats par leur libellé,
 * « 3 pièces » et « 5 pièces ». Plutôt que d'ajouter un champ au catalogue
 * arrêté — donc de rouvrir la garde et les quinze fiches — le nombre est lu en
 * tête du format, et UNIQUEMENT pour un produit personnalisable. Un contrôle
 * de `verifier-catalogue.mjs` ajouté en C4 refuse désormais tout format de
 * coffret personnalisable qui ne commencerait pas par un entier : la lecture
 * n'est donc pas une supposition, c'est une convention gardée.
 */
export function nombreDePiecesAChoisir(
  produit: Pick<Produit, 'personnalisable'>,
  variante: Pick<Variante, 'format'>,
): number | null {
  if (!produit.personnalisable) {
    return null;
  }

  const chiffres = NOMBRE_EN_TETE.exec(variante.format)?.[1];

  return chiffres === undefined ? null : Number.parseInt(chiffres, 10);
}

/** Le catalogue aplati en articles. Fonction pure, appelée côté serveur. */
export function projeterCatalogue(produits: readonly Produit[]): readonly ArticlePanier[] {
  const articles: ArticlePanier[] = [];

  for (const produit of produits) {
    const retractation = regimeRetractation(produit);

    for (const variante of produit.variantes) {
      articles.push({
        sku: variante.sku,
        slug: produit.slug,
        nomProduit: produit.nom,
        format: variante.format,
        prixCentimes: variante.prixCentimes,
        poidsGrammes: variante.poidsGrammes,
        stock: variante.stock,
        perissable: exigeChaineDuFroid(produit.conservation),
        personnalisable: produit.personnalisable,
        fondementRetractation: retractation.fondement,
        phraseRetractation: retractation.phrase,
        allergenes: produit.allergenes,
        piecesRequises: nombreDePiecesAChoisir(produit, variante),
      });
    }
  }

  return articles;
}

/** L'article portant ce SKU, ou `undefined`. */
export function trouverArticle(
  catalogue: readonly ArticlePanier[],
  sku: string,
): ArticlePanier | undefined {
  return catalogue.find((article) => article.sku === sku);
}

/**
 * Les stocks, seule chose que le réducteur emprunte au catalogue. C'est cet
 * objet-là — vingt-trois paires — que la mise en page racine transmet au
 * fournisseur, et non le catalogue.
 */
export function stocksDepuisCatalogue(catalogue: readonly ArticlePanier[]): StocksParSku {
  const stocks: Record<string, number> = {};

  for (const article of catalogue) {
    stocks[article.sku] = article.stock;
  }

  return stocks;
}

/* -------------------------------------------------------------------------- */
/* Allergènes d'une composition                                                */
/* -------------------------------------------------------------------------- */

/** La valeur que le catalogue emploie pour « rien à signaler ». */
const MENTION_AUCUN = 'aucun';

/**
 * L'union des allergènes des pièces choisies.
 *
 * Trois règles, toutes tirées de ce que le catalogue écrit réellement :
 * « aucun » n'entre jamais dans une union qui contient autre chose (dire
 * « aucun, lait » n'a pas de sens) ; les doublons sont écartés, deux pièces
 * pouvant porter le même allergène ; et une union restée vide se dit
 * « aucun », qui est l'information juste et non l'absence d'information.
 *
 * L'ordre est celui des pièces choisies : il se relit à côté de la liste
 * cochée, ce qu'un ordre alphabétique ne permettrait pas.
 */
export function unionAllergenes(
  skus: readonly string[],
  catalogue: readonly ArticlePanier[],
): readonly string[] {
  const union: string[] = [];

  for (const sku of skus) {
    const article = trouverArticle(catalogue, sku);

    if (article === undefined) {
      continue;
    }

    for (const allergene of article.allergenes) {
      if (allergene !== MENTION_AUCUN && !union.includes(allergene)) {
        union.push(allergene);
      }
    }
  }

  return union.length === 0 ? [MENTION_AUCUN] : union;
}
