import type { CommandePrepareeSansReference } from '@/lib/paiement/adaptateur';
import {
  projeterCatalogue,
  trouverArticle,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { cleLigne, type LignePanier } from '@/lib/panier/reducteur';
import { calculerTotaux } from '@/lib/panier/totaux';
import { typographier } from '@/lib/typographie';
import { CODES_ZONE, type CodeZone, type Produit } from '@/lib/types';

/**
 * LA VALIDATION DU CORPS REÇU. Fonction pure, sans réseau, sans horloge.
 *
 * ---------------------------------------------------------------------------
 * La doctrine, en une phrase
 * ---------------------------------------------------------------------------
 *
 * LE SERVEUR RECALCULE ; IL NE CROIT JAMAIS UN PRIX VENU DU NAVIGATEUR. C'est
 * la différence entre une boutique et un formulaire. Le corps de la requête
 * porte un `totalAnnonceCentimes`, et ce nombre ne sert QU'À ÊTRE COMPARÉ :
 * le catalogue est relu depuis le fichier versionné, les lignes sont
 * rapprochées de leurs SKU, les frais de port sont recalculés par le moteur, et
 * si la somme obtenue diffère d'un centime de celle annoncée, la requête est
 * refusée avec un message qui le dit. Un `curl` qui annoncerait 1 € pour un
 * panier à 90 € n'obtient pas de session de paiement.
 *
 * Le total annoncé n'est donc pas de la confiance : c'est un CONTRÔLE DE
 * COHÉRENCE, et il attrape aussi le cas honnête — un onglet resté ouvert
 * pendant qu'un prix ou un stock a changé. Le visiteur préfère lire « le prix a
 * changé, revoyez votre panier » que payer un montant qu'il n'a pas vu.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi cette fonction est ISOLÉE de la route
 * ---------------------------------------------------------------------------
 *
 * Une route Next se teste mal : il faut lui fabriquer une `Request`, un
 * environnement, un contexte. Toute la décision est donc ici, dans une
 * fonction qui prend deux valeurs et en rend une troisième — le reste de la
 * route n'est plus que de la plomberie HTTP (méthode, en-têtes, codes). C'est
 * ce découpage qui permet d'exiger 100 % de lignes ET de branches sur le seul
 * endroit du projet où un montant est arbitré côté serveur.
 *
 * ---------------------------------------------------------------------------
 * Ce qui est contrôlé, dans l'ordre
 * ---------------------------------------------------------------------------
 *
 *  1. Le corps est un objet.
 *  2. La zone est l'une des trois.
 *  3. Le total annoncé est un entier positif ou nul.
 *  4. `lignes` est un tableau non vide.
 *  5. Chaque ligne : SKU non vide, quantité entière strictement positive,
 *     composition absente ou tableau de chaînes.
 *  6. Chaque SKU existe au catalogue du jour.
 *  7. La composition : imposée et EXACTE pour un coffret personnalisable,
 *     interdite ailleurs, sans doublon, prise dans la liste blanche du produit.
 *  8. Aucune ligne en double (même SKU, même composition) — sans quoi le
 *     contrôle de stock se contournerait en découpant la quantité.
 *  9. La quantité CUMULÉE par SKU tient dans le stock.
 * 10. L'expédition est possible vers cette zone.
 * 11. Le total recalculé égale le total annoncé.
 */

/* -------------------------------------------------------------------------- */
/* Le catalogue vu par la validation                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ce que la validation emprunte au catalogue : la projection du panier, plus
 * les listes blanches des coffrets personnalisables.
 *
 * Les listes blanches ne sont PAS dans `ArticlePanier` et n'y entreront pas :
 * cette projection voyage vers le navigateur sur chaque page qui affiche un
 * panier (décision D17), et onze SKU supplémentaires par article coûteraient
 * des octets à quinze pages pour un contrôle qui n'a lieu que sur le serveur.
 * Elles sont donc jointes ici, dans un objet que seule la route construit.
 */
export interface CatalogueValidation {
  readonly articles: readonly ArticlePanier[];
  /** SKU de coffret personnalisable → SKU choisissables. */
  readonly piecesEligibles: Readonly<Record<string, readonly string[]>>;
}

export function catalogueDeValidation(produits: readonly Produit[]): CatalogueValidation {
  const piecesEligibles: Record<string, readonly string[]> = {};

  for (const produit of produits) {
    if (produit.piecesEligibles === undefined) {
      continue;
    }

    for (const variante of produit.variantes) {
      piecesEligibles[variante.sku] = produit.piecesEligibles;
    }
  }

  return { articles: projeterCatalogue(produits), piecesEligibles };
}

/* -------------------------------------------------------------------------- */
/* Le verdict                                                                  */
/* -------------------------------------------------------------------------- */

export type CodeRefus =
  | 'corps-illisible'
  | 'zone-inconnue'
  | 'total-illisible'
  | 'panier-vide'
  | 'ligne-illisible'
  | 'sku-inconnu'
  | 'composition-invalide'
  | 'ligne-en-double'
  | 'stock-insuffisant'
  | 'expedition-impossible'
  | 'total-different';

export type ResultatValidation =
  | { readonly ok: true; readonly commandePreparee: CommandePrepareeSansReference }
  | { readonly ok: false; readonly code: CodeRefus; readonly message: string };

function refus(code: CodeRefus, message: string): ResultatValidation {
  return { ok: false, code, message: typographier(message) };
}

/* -------------------------------------------------------------------------- */
/* Lecture méfiante du corps                                                   */
/* -------------------------------------------------------------------------- */

function estZone(valeur: unknown): valeur is CodeZone {
  return typeof valeur === 'string' && (CODES_ZONE as readonly string[]).includes(valeur);
}

function estEntierPositif(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0;
}

/** Une ligne reconnue dans sa FORME, avant tout rapprochement au catalogue. */
function analyserLigneRecue(brut: unknown): LignePanier | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }

  const { sku, quantite, composition } = brut as {
    readonly sku?: unknown;
    readonly quantite?: unknown;
    readonly composition?: unknown;
  };

  if (typeof sku !== 'string' || sku === '') {
    return null;
  }

  if (typeof quantite !== 'number' || !Number.isInteger(quantite) || quantite <= 0) {
    return null;
  }

  if (composition === undefined) {
    return { sku, quantite };
  }

  if (
    !Array.isArray(composition) ||
    !(composition as readonly unknown[]).every((piece) => typeof piece === 'string')
  ) {
    return null;
  }

  return { sku, quantite, composition: composition as readonly string[] };
}

/* -------------------------------------------------------------------------- */
/* La validation                                                               */
/* -------------------------------------------------------------------------- */

export function validerCorps(
  corps: unknown,
  catalogue: CatalogueValidation,
): ResultatValidation {
  if (typeof corps !== 'object' || corps === null) {
    return refus(
      'corps-illisible',
      'La requête n’est pas un objet : elle ne peut pas décrire un panier.',
    );
  }

  const { lignes, zone, totalAnnonceCentimes } = corps as {
    readonly lignes?: unknown;
    readonly zone?: unknown;
    readonly totalAnnonceCentimes?: unknown;
  };

  if (!estZone(zone)) {
    return refus(
      'zone-inconnue',
      'La destination de livraison est inconnue. Trois destinations existent : ' +
        'France métropolitaine, Corse, outre-mer.',
    );
  }

  if (!estEntierPositif(totalAnnonceCentimes)) {
    return refus(
      'total-illisible',
      'Le total annoncé n’est pas un nombre entier de centimes.',
    );
  }

  if (!Array.isArray(lignes)) {
    return refus('corps-illisible', 'Le panier reçu n’est pas une liste de lignes.');
  }

  if (lignes.length === 0) {
    return refus(
      'panier-vide',
      'Le panier est vide : il n’y a rien à payer. Ajoutez un article avant de commander.',
    );
  }

  const reconnues: LignePanier[] = [];
  const cumulParSku = new Map<string, number>();
  const clesVues = new Set<string>();

  for (const brute of lignes as readonly unknown[]) {
    const ligne = analyserLigneRecue(brute);

    if (ligne === null) {
      return refus(
        'ligne-illisible',
        'Une ligne du panier est mal formée : il faut un SKU et une quantité ' +
          'entière strictement positive.',
      );
    }

    const article = trouverArticle(catalogue.articles, ligne.sku);

    if (article === undefined) {
      return refus(
        'sku-inconnu',
        `La référence ${ligne.sku} n’existe pas au catalogue. Le rayon a peut-être ` +
          'changé depuis que ce panier a été rempli : revenez au panier.',
      );
    }

    const empechement = verifierComposition(article, ligne, catalogue.piecesEligibles);

    if (empechement !== null) {
      return refus('composition-invalide', empechement);
    }

    const cle = cleLigne(ligne);

    if (clesVues.has(cle)) {
      return refus(
        'ligne-en-double',
        'Le même article figure deux fois dans le panier reçu. Une ligne porte ' +
          'une quantité, elle ne se répète pas.',
      );
    }

    clesVues.add(cle);

    const cumul = (cumulParSku.get(ligne.sku) ?? 0) + ligne.quantite;

    if (cumul > article.stock) {
      return refus(
        'stock-insuffisant',
        `Il ne reste pas ${String(cumul)} exemplaires de ${article.nomProduit} ` +
          `(${article.format}) : le stock est de ${String(article.stock)}.`,
      );
    }

    cumulParSku.set(ligne.sku, cumul);
    reconnues.push(ligne);
  }

  /* LE RECALCUL. Même fonction que le panier et que le récapitulatif, mêmes
     prix relus au catalogue, même moteur de frais de port. */
  const totaux = calculerTotaux(reconnues, catalogue.articles, zone);
  const { expedition } = totaux;

  if (expedition.statut === 'impossible') {
    return refus('expedition-impossible', expedition.message);
  }

  if (totaux.totalCentimes !== totalAnnonceCentimes) {
    return refus(
      'total-different',
      'Le total recalculé par le serveur ne correspond pas au total annoncé par ' +
        'la page. Aucun paiement n’a été engagé : c’est le serveur qui fixe le ' +
        'prix, jamais le navigateur. Revenez au panier, le montant y sera à jour.',
    );
  }

  return {
    ok: true,
    commandePreparee: {
      lignes: totaux.lignes,
      zone,
      fraisPortCentimes: expedition.fraisCentimes,
      /* Le total retenu est celui qui vient d'être VÉRIFIÉ égal au recalcul.
         L'écrire ainsi plutôt que `totaux.totalCentimes` évite d'avoir à
         convaincre le compilateur qu'un `null` impossible ne survient pas —
         et le nombre est, au centime près, le même. */
      totalCentimes: totalAnnonceCentimes,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* La composition du coffret personnalisable                                   */
/* -------------------------------------------------------------------------- */

/**
 * `null` si la composition est acceptable, sinon la phrase du refus.
 *
 * Trois règles, toutes vérifiables sans le navigateur : le COMPTE est exact
 * (trois ou cinq selon le format), les pièces sont DISTINCTES, et elles
 * appartiennent à la LISTE BLANCHE du produit. La troisième est la seule qui
 * protège vraiment : sans elle, on composerait un coffret à 34 € avec cinq
 * huiles 75 cl à 31 €.
 */
function verifierComposition(
  article: ArticlePanier,
  ligne: LignePanier,
  piecesEligibles: Readonly<Record<string, readonly string[]>>,
): string | null {
  const requises = article.piecesRequises;

  if (requises === null) {
    return ligne.composition === undefined
      ? null
      : `${article.nomProduit} (${article.format}) ne se compose pas : ce format ` +
          'est vendu tel quel.';
  }

  const choisies = ligne.composition ?? [];

  if (choisies.length !== requises) {
    return (
      `Un ${article.nomProduit} au format ${article.format} demande exactement ` +
      `${String(requises)} pièces ; ${String(choisies.length)} ont été reçues.`
    );
  }

  if (new Set(choisies).size !== choisies.length) {
    return 'Une même pièce a été choisie deux fois dans le coffret.';
  }

  const blanche = new Set(piecesEligibles[article.sku] ?? []);
  const intruse = choisies.find((piece) => !blanche.has(piece));

  return intruse === undefined
    ? null
    : `La référence ${intruse} ne fait pas partie des pièces que ce coffret ` +
        'accepte.';
}
