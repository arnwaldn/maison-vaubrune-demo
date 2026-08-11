import { marchand } from '@/donnees/marchand';
import { eurosDepuisCentimes } from '@/lib/argent';
import { estDisponible, type Produit, type Variante } from '@/lib/types';

/**
 * LES DONNÉES STRUCTURÉES — ce que le site dit aux robots, et rien de plus.
 *
 * ---------------------------------------------------------------------------
 * La règle qui gouverne ce fichier : ON NE DÉCLARE QUE CE QU'ON A
 * ---------------------------------------------------------------------------
 *
 * Le vocabulaire schema.org propose des dizaines de champs, et un générateur
 * de balisage en remplit volontiers vingt. Ce module en remplit six, parce que
 * le projet n'a que six informations vraies à donner. Trois absences sont
 * DÉLIBÉRÉES et chacune a son motif :
 *
 * - AUCUN `aggregateRating`, AUCUN `review`. Cette boutique n'a pas d'avis
 *   clients (ils sont hors périmètre, et le `.claude/CLAUDE.md` le dit). Une
 *   note moyenne inventée serait affichée en étoiles dans les résultats de
 *   recherche : c'est la donnée fausse la plus rentable à écrire, donc celle
 *   qu'il faut refuser en premier. La garde d'honnêteté du projet interdit
 *   d'inventer une adresse ; inventer une réputation serait pire.
 * - AUCUNE `PostalAddress`, AUCUN `telephone`, AUCUN `logo` sur
 *   l'organisation. Le marchand n'a ni adresse ni téléphone (`marchand.ts`
 *   les laisse à `null` et l'interface les affiche en emplacements à
 *   compléter) ; le balisage suit la même règle que l'affichage, sans quoi le
 *   site tiendrait deux discours — un pour l'humain, un pour le robot.
 * - AUCUN `sku`, `gtin`, `brand` ou `image` sur le produit. Le SKU est un
 *   identifiant interne de démonstration, il n'a d'existence dans aucun
 *   catalogue commercial ; les illustrations sont des silhouettes dessinées
 *   (décision D6) et non des photographies du produit.
 *
 * ---------------------------------------------------------------------------
 * LES DONNÉES DE BASE, PAS LA SURCOUCHE (corollaire de la décision D24)
 * ---------------------------------------------------------------------------
 *
 * Les prix, stocks et résumés balisés ici sont ceux du CATALOGUE VERSIONNÉ, et
 * jamais ceux de la surcouche marchand. Ce n'est pas un oubli : la surcouche
 * vit dans le `localStorage` du visiteur (décision D2), un robot d'indexation
 * n'en a aucune et n'en aura jamais. Baliser une valeur que seul le navigateur
 * du visiteur connaît reviendrait à publier un prix que personne d'autre ne
 * voit. Ces fonctions sont donc appelées côté SERVEUR, à la construction, et
 * le HTML servi porte les mêmes chiffres pour tout le monde.
 *
 * ---------------------------------------------------------------------------
 * Le prix s'écrit par entiers, avec un POINT décimal
 * ---------------------------------------------------------------------------
 *
 * `eurosDepuisCentimes()` compose « 22,50 » par quotient et reste, sans jamais
 * construire un flottant (décision D4). Le vocabulaire schema.org attend en
 * revanche un séparateur décimal ANGLAIS : « 22,50 » y serait lu comme deux
 * mille deux cent cinquante par certains analyseurs. La virgule est donc
 * remplacée après coup, sur une chaîne déjà juste — c'est un changement
 * d'écriture, pas un second calcul.
 */

const CONTEXTE = 'https://schema.org';

/** Les deux seules disponibilités que ce catalogue sait dire. */
const EN_STOCK = 'https://schema.org/InStock';
const EPUISE = 'https://schema.org/OutOfStock';

/**
 * Les types sont déclarés en ALIAS et non en interfaces, et c'est technique :
 * seul un alias d'objet reçoit une signature d'index implicite, donc seul lui
 * s'accepte là où `<DonneesStructurees>` attend un objet sérialisable.
 */
export type OffreJsonLd = {
  readonly '@type': 'Offer';
  readonly price: string;
  readonly priceCurrency: 'EUR';
  readonly availability: string;
  readonly url: string;
};

export type ProduitJsonLd = {
  readonly '@context': typeof CONTEXTE;
  readonly '@type': 'Product';
  readonly name: string;
  readonly description: string;
  readonly url: string;
  /**
   * LES IMAGES DU PRODUIT (C15), en adresses ABSOLUES.
   *
   * Absentes tant qu'un produit n'a pas de visuel — et le champ l'est encore
   * pour tout produit qu'on ajouterait sans photographie. Publier `image: []`
   * ou une adresse relative serait pire que de se taire : schema.org attend une
   * URL déréférençable par un tiers, et un moteur qui reçoit `/produits/…`
   * n'a aucun moyen de la résoudre.
   *
   * Les DEUX vues sont publiées, dans l'ordre de la fiche. Le vocabulaire le
   * permet et le recommande : plusieurs images d'un même produit valent mieux
   * qu'une, et celle du partage — composée pour un rapport 40:21 — n'est pas la
   * bonne à donner ici, où c'est le produit qu'on décrit et non l'aperçu d'un
   * lien.
   */
  readonly image?: readonly string[];
  readonly offers: OffreJsonLd;
};

export type EtapeFilAriane = {
  readonly '@type': 'ListItem';
  readonly position: number;
  readonly name: string;
  readonly item: string;
};

export type FilArianeJsonLd = {
  readonly '@context': typeof CONTEXTE;
  readonly '@type': 'BreadcrumbList';
  readonly itemListElement: readonly EtapeFilAriane[];
};

export type OrganisationJsonLd = {
  readonly '@context': typeof CONTEXTE;
  readonly '@type': 'Organization';
  readonly name: string;
  readonly url: string;
  readonly description: string;
};

/** Une adresse absolue, seule forme acceptée par le vocabulaire. */
function absolue(chemin: string, urlSite: string): string {
  return new URL(chemin, urlSite).toString();
}

/** Le prix schema.org : les centimes du projet, en écriture anglaise. */
export function prixSchemaOrg(centimes: number): string {
  return eurosDepuisCentimes(centimes).replace(',', '.');
}

/**
 * La variante la MOINS CHÈRE, celle que la vitrine annonce en « à partir de ».
 *
 * Un produit sans variante n'existe pas — le type `Produit` porte un tuple non
 * vide —, la réduction part donc de la première sans repli à inventer.
 */
export function varianteLaMoinsChere(produit: Produit): Variante {
  const [premiere, ...suivantes] = produit.variantes;

  return suivantes.reduce(
    (moinsChere, candidate) =>
      candidate.prixCentimes < moinsChere.prixCentimes ? candidate : moinsChere,
    premiere,
  );
}

/**
 * LES ADRESSES ABSOLUES DES VUES D'UN PRODUIT, dans l'ordre de la fiche.
 *
 * La plus GRANDE largeur livrée pour chaque vue : un moteur qui reprend
 * l'image la redimensionnera lui-même, et lui donner un dérivé de 320 points
 * reviendrait à lui interdire d'en faire quoi que ce soit. La largeur est lue
 * dans `largeurs`, jamais écrite ici — le pipeline décide de ce qu'il produit,
 * et une constante recopiée finirait par désigner un fichier absent.
 *
 * Rend un tableau vide pour un produit sans visuel, ce qui fait taire le champ
 * plutôt que de publier une liste vide.
 */
function imagesProduit(produit: Produit, urlSite: string): readonly string[] {
  const visuel = produit.visuel;

  if (visuel === undefined) {
    return [];
  }

  const vues = [
    { nom: 'principal', donnees: visuel.principal },
    { nom: 'ambiance', donnees: visuel.ambiance },
  ];

  return vues.flatMap(({ nom, donnees }) => {
    if (donnees === undefined) {
      return [];
    }

    const plusGrande = donnees.largeurs[donnees.largeurs.length - 1] ?? donnees.largeur;

    return [absolue(`/produits/${produit.slug}/${nom}-${String(plusGrande)}.jpg`, urlSite)];
  });
}

/**
 * Le balisage d'une fiche produit : `Product` et son unique `Offer`.
 *
 * L'offre porte le prix du plus petit format et sa disponibilité. Deux
 * conditions, et il faut les deux : le produit doit être en vente
 * (`estDisponible`, décision D24) et le format doit avoir du stock. Un produit
 * retiré de la vente dont le stock resterait à quarante-deux serait annoncé
 * disponible à un robot alors que son bouton d'ajout est éteint à l'écran.
 */
export function donneesProduit(produit: Produit, urlSite: string): ProduitJsonLd {
  const variante = varianteLaMoinsChere(produit);
  const adresse = absolue(`/boutique/${produit.slug}`, urlSite);
  const disponible = estDisponible(produit) && variante.stock > 0;
  const images = imagesProduit(produit, urlSite);

  return {
    '@context': CONTEXTE,
    '@type': 'Product',
    name: produit.nom,
    description: produit.resume,
    url: adresse,
    ...(images.length === 0 ? {} : { image: images }),
    offers: {
      '@type': 'Offer',
      price: prixSchemaOrg(variante.prixCentimes),
      priceCurrency: 'EUR',
      availability: disponible ? EN_STOCK : EPUISE,
      url: adresse,
    },
  };
}

/**
 * Le fil d'Ariane d'une fiche : Accueil, Boutique, le produit.
 *
 * Il reproduit EXACTEMENT la navigation visible en haut de la fiche, à une
 * marche près : le fil affiché part de « Boutique » puisque l'en-tête porte
 * déjà le retour à l'accueil, tandis que le balisage doit remonter jusqu'à la
 * racine pour que le chemin ait un début.
 */
export function filArianeProduit(produit: Produit, urlSite: string): FilArianeJsonLd {
  return {
    '@context': CONTEXTE,
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: absolue('/', urlSite) },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Boutique',
        item: absolue('/boutique', urlSite),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: produit.nom,
        item: absolue(`/boutique/${produit.slug}`, urlSite),
      },
    ],
  };
}

/**
 * L'organisation, en trois champs.
 *
 * La description porte le mot « démonstration » VOLONTAIREMENT : c'est le seul
 * texte de ce balisage qu'un moteur est susceptible de reprendre tel quel, et
 * il ne doit pas laisser croire à une maison qui vend.
 */
export function donneesOrganisation(urlSite: string): OrganisationJsonLd {
  return {
    '@context': CONTEXTE,
    '@type': 'Organization',
    name: marchand.nom,
    url: absolue('/', urlSite),
    description:
      `${marchand.nom} est une épicerie fine régionale fictive. Ce site est une ` +
      'boutique en ligne de démonstration : aucune commande n’est expédiée, ' +
      'aucun paiement n’est encaissé.',
  };
}
