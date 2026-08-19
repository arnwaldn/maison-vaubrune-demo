import { calculerFraisPort, type LigneExpediable, type ResultatExpedition } from '@/lib/expedition';
import { trouverArticle, type ArticlePanier } from '@/lib/panier/catalogue-panier';
import { cleLigne, type LignePanier } from '@/lib/panier/reducteur';
import type { Fondement } from '@/lib/retractation';
import type { CodeZone } from '@/lib/types';

/**
 * LE CALCUL DU PANIER. Une seule fonction, une seule source de vérité.
 *
 * ---------------------------------------------------------------------------
 * La règle qui gouverne ce fichier
 * ---------------------------------------------------------------------------
 *
 * TOUT montant affiché dans le tunnel sort de `calculerTotaux()`. Pas un
 * sous-total recalculé dans un composant, pas un total additionné dans le
 * gabarit de la page commande, pas un « frais de port » recopié d'un écran à
 * l'autre. La raison est celle qu'on vend au client : le récapitulatif avant
 * paiement doit être, au centime près, ce que le panier annonçait — et la
 * seule manière d'en être certain est qu'il n'existe qu'un endroit où le
 * chiffre naisse. La page `/commande` rappelle donc cette même fonction avec
 * le même état, et n'additionne rien elle-même.
 *
 * Corollaire : LES PRIX VIENNENT DU CATALOGUE, JAMAIS DE L'ÉTAT DU PANIER. Une
 * ligne ne porte qu'un SKU et une quantité (voir `reducteur.ts`) ; le prix est
 * relu à chaque calcul. Un panier laissé trois semaines dans un navigateur
 * affiche donc le prix du jour, pas celui du jour où l'on a cliqué.
 *
 * ---------------------------------------------------------------------------
 * LE POIDS DU COFFRET COMPOSÉ — décision, à ne pas « corriger »
 * ---------------------------------------------------------------------------
 *
 * Le coffret « Composez le vôtre » pèse le poids SAISI de son format : 1 400 g
 * pour trois pièces, 2 200 g pour cinq, quelles que soient les pièces
 * retenues. La composition sert à l'AFFICHAGE et à l'UNION DES ALLERGÈNES,
 * jamais au poids.
 *
 * Ce n'est pas un raccourci. C'est ce que la fiche annonce noir sur blanc
 * (« le coffret de trois pèse environ 1 400 g à l'expédition, celui de cinq
 * environ 2 200 g ») et ce qu'un préparateur de commande constate : le poids
 * d'un coffret, c'est l'écrin, la frisure de calage et le carton, plus des
 * pièces choisies dans une liste blanche de petits formats dont les écarts se
 * comptent en dizaines de grammes. Sommer les pièces donnerait un poids
 * différent du poids annoncé sur la fiche, donc deux vérités pour un même
 * colis — et c'est la fiche que le client a lue.
 *
 * ---------------------------------------------------------------------------
 * Une ligne dont le SKU n'existe plus est IGNORÉE
 * ---------------------------------------------------------------------------
 *
 * Le réducteur purge déjà ces lignes à la restauration. La garde est reprise
 * ici parce que `calculerTotaux()` est aussi appelée sur des états construits
 * ailleurs (tests, et demain un panier reçu par lien) : facturer une ligne
 * dont on ne connaît pas le prix serait la pire réponse possible.
 */

/* -------------------------------------------------------------------------- */
/* Sorties                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Une ligne du panier, rapprochée de son article et chiffrée.
 *
 * Ce champ n'était pas demandé, il est ajouté DÉLIBÉRÉMENT : sans lui, chaque
 * composant d'affichage referait le rapprochement SKU → article et la
 * multiplication prix × quantité de son côté, ce qui rouvrirait exactement la
 * porte que l'en-tête de ce fichier ferme. Les composants reçoivent des lignes
 * déjà chiffrées et n'ont plus qu'à les mettre en forme.
 */
export interface LigneCalculee {
  /** `cleLigne()` de la ligne : clé React, et désignation dans les actions. */
  readonly cle: string;
  readonly ligne: LignePanier;
  readonly article: ArticlePanier;
  readonly sousTotalCentimes: number;
}

/** Un produit du panier qui n'ouvre pas droit à rétractation, et pourquoi. */
export interface ArticleSansRetractation {
  readonly slug: string;
  readonly nom: string;
  readonly fondement: Fondement;
  /** La phrase de `regimeRetractation()` — aucune reformulation (décision D12). */
  readonly phrase: string;
}

export interface Totaux {
  /** Somme des quantités, pas nombre de lignes. */
  readonly nbArticles: number;
  readonly sousTotalCentimes: number;
  readonly expedition: ResultatExpedition;
  /** `null` quand l'expédition est impossible : il n'y a alors pas de total. */
  readonly totalCentimes: number | null;
  readonly contientPerissable: boolean;
  readonly contientPersonnalise: boolean;
  /** Dédupliqué par produit : deux formats du même fromage ne se disent qu'une fois. */
  readonly articlesSansRetractation: readonly ArticleSansRetractation[];
  readonly lignes: readonly LigneCalculee[];
}

/* -------------------------------------------------------------------------- */
/* Le calcul                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * LA SOMME DES LIGNES — et il n'y en a qu'UNE dans tout le projet (C23).
 *
 * Le tiroir d'ajout au panier doit afficher un sous-total. Il aurait pu
 * refaire l'addition de son côté : elle tient en une ligne, et c'est
 * exactement pour cela qu'elle aurait divergé un jour. `totaux.ts` porte
 * depuis C4 la doctrine « TOUT montant affiché sort de `calculerTotaux()` » ;
 * ce module extrait donc l'addition plutôt que de la laisser recopier, et
 * `calculerTotaux` en devient le premier appelant.
 *
 * Une ligne dont la référence est INCONNUE du catalogue est ignorée, jamais
 * comptée à zéro ni cause d'erreur — c'est déjà ce que faisait `calculerTotaux`
 * (un panier restauré peut porter une référence qu'une livraison a retirée), et
 * la branche reste couverte à l'identique.
 */
export function sousTotalDesLignes(
  lignes: readonly LignePanier[],
  prixParSku: Readonly<Record<string, number>>,
): number {
  let total = 0;

  for (const ligne of lignes) {
    const prix = prixParSku[ligne.sku];

    if (prix !== undefined) {
      total += prix * ligne.quantite;
    }
  }

  return total;
}

export function calculerTotaux(
  lignes: readonly LignePanier[],
  catalogue: readonly ArticlePanier[],
  zone: CodeZone,
): Totaux {
  const calculees: LigneCalculee[] = [];

  for (const ligne of lignes) {
    const article = trouverArticle(catalogue, ligne.sku);

    if (article === undefined) {
      continue;
    }

    calculees.push({
      cle: cleLigne(ligne),
      ligne,
      article,
      sousTotalCentimes: article.prixCentimes * ligne.quantite,
    });
  }

  const nbArticles = calculees.reduce((total, calculee) => total + calculee.ligne.quantite, 0);
  const sousTotalCentimes = sousTotalDesLignes(
    lignes,
    Object.fromEntries(catalogue.map((article) => [article.sku, article.prixCentimes])),
  );

  /* Le moteur d'expédition ne connaît ni le catalogue ni le panier : il reçoit
     quatre nombres et un drapeau par ligne (voir `LigneExpediable`). Le poids
     est celui de la VARIANTE — pour le coffret composé, celui de son format
     saisi : voir la décision en tête de fichier. */
  const expediables: readonly LigneExpediable[] = calculees.map((calculee) => ({
    sku: calculee.article.sku,
    quantite: calculee.ligne.quantite,
    poidsUnitaireGrammes: calculee.article.poidsGrammes,
    perissable: calculee.article.perissable,
  }));

  const expedition = calculerFraisPort(expediables, zone, sousTotalCentimes);

  return {
    nbArticles,
    sousTotalCentimes,
    expedition,
    totalCentimes:
      expedition.statut === 'calcule' ? sousTotalCentimes + expedition.fraisCentimes : null,
    contientPerissable: calculees.some((calculee) => calculee.article.perissable),
    contientPersonnalise: calculees.some((calculee) => calculee.article.personnalisable),
    articlesSansRetractation: sansRetractation(calculees),
    lignes: calculees,
  };
}

/**
 * Les produits du panier privés de rétractation, un par produit.
 *
 * La déduplication se fait par SLUG et non par SKU : commander la terrine en
 * 180 g et en 350 g ne doit pas afficher deux fois la même phrase. Le `Map`
 * conserve l'ordre d'insertion, donc l'ordre du panier.
 */
function sansRetractation(
  calculees: readonly LigneCalculee[],
): readonly ArticleSansRetractation[] {
  const parSlug = new Map<string, ArticleSansRetractation>();

  for (const { article } of calculees) {
    if (article.fondementRetractation === null) {
      continue;
    }

    parSlug.set(article.slug, {
      slug: article.slug,
      nom: article.nomProduit,
      fondement: article.fondementRetractation,
      phrase: article.phraseRetractation,
    });
  }

  return [...parSlug.values()];
}
