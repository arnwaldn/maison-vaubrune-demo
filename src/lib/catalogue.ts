import type { Produit, Variante } from '@/lib/types';

/**
 * La surcouche de catalogue : ce qui rend la démonstration honnête.
 *
 * ---------------------------------------------------------------------------
 * Ce que ce module promet, et ce qu'il ne promet pas
 * ---------------------------------------------------------------------------
 *
 * L'offre « Boutique en ligne » inclut un catalogue TENU PAR LE MARCHAND :
 * modifier un prix, un stock, un texte, sans toucher au code ni rappeler le
 * développeur. Une boutique livrée le fait avec une base de données et un
 * espace de gestion — un `DepotServeur` : `lire()` interroge la base,
 * `enregistrerModification()` écrit une ligne et invalide le cache de la page,
 * `reinitialiser()` n'existe tout simplement pas, et `exporter()` sert aux
 * sauvegardes et aux migrations.
 *
 * Cette démonstration n'a ni base de données ni compte à créer (décision D2).
 * Elle branchera en tranche C6 un `DepotNavigateur` : les modifications
 * vivront dans le `localStorage` du visiteur, le catalogue livré restant la
 * référence immuable. Deux conséquences, dites par la démonstration elle-même
 * plutôt que découvertes par le visiteur : les modifications ne sortent pas de
 * son navigateur, et `reinitialiser()` rend l'étal d'origine.
 *
 * La forme est donc la même, la persistance seule change. C'est tout l'intérêt
 * de nommer l'interface maintenant : la page qui affichera un produit demain
 * appellera `depot.lire()` sans savoir d'où viennent les octets.
 *
 * ---------------------------------------------------------------------------
 * Aucune implémentation ici, et c'est volontaire
 * ---------------------------------------------------------------------------
 *
 * Ce fichier ne touche ni au `localStorage` ni à `window` : il est importé par
 * des composants serveur et par la garde en ligne de commande, deux contextes
 * sans navigateur. La tranche C2 livre le contrat et la fonction pure qui le
 * fera fonctionner ; la tranche C6 livre le dépôt qui s'y branche.
 */

/**
 * Un catalogue modifiable, quelle que soit la manière dont les modifications
 * survivent d'une visite à l'autre.
 */
export interface DepotCatalogue {
  /** Le catalogue tel qu'il doit s'afficher, surcouche comprise. */
  lire(): readonly Produit[];
  /**
   * Enregistre une modification partielle sur un produit désigné par son slug.
   * Les champs absents restent inchangés.
   */
  enregistrerModification(slug: string, modification: Partial<Produit>): void;
  /** Efface toutes les modifications et rend le catalogue livré. */
  reinitialiser(): void;
  /**
   * Le catalogue courant en JSON, pour que le visiteur reparte avec ce qu'il a
   * saisi — et pour qu'une reprise du projet n'ait pas à retaper l'étal.
   */
  exporter(): string;
}

/**
 * Les modifications en attente, indexées par slug de produit.
 * Un slug absent signifie « produit inchangé ».
 */
export type SurcoucheCatalogue = Readonly<Record<string, Partial<Produit>>>;

/**
 * Applique une surcouche à un catalogue et rend le résultat.
 *
 * Fonction PURE : ni l'un ni l'autre des arguments n'est modifié, et deux
 * appels avec les mêmes entrées rendent la même sortie. C'est ce qui la rend
 * testable sans navigateur et réutilisable par le dépôt de la tranche C6.
 *
 * Deux champs sont INTOUCHABLES, quoi que contienne la surcouche :
 *
 * - le `slug`, parce que c'est une adresse publique : la changer casserait un
 *   lien partagé et ferait répondre 404 à une page qui existe toujours ;
 * - le `sku`, parce que c'est la clé qui relie une variante à une ligne de
 *   panier, à la composition d'un coffret et à la liste blanche du coffret
 *   personnalisable. Un SKU réécrit orpheline tout cela d'un coup.
 *
 * Les variantes ne sont donc pas remplacées en bloc mais fusionnées SKU par
 * SKU : une variante proposée dont le SKU n'existe pas dans le catalogue livré
 * est ignorée, et aucune variante existante ne disparaît. Le marchand corrige
 * un prix ou un stock ; il n'invente pas un format depuis cet écran.
 */
export function appliquerSurcouche(
  base: readonly Produit[],
  surcouche: SurcoucheCatalogue,
): readonly Produit[] {
  return base.map((produit) => {
    const modification = surcouche[produit.slug];

    if (modification === undefined) {
      return produit;
    }

    const { slug: _slug, variantes: variantesProposees, ...champs } = modification;

    const fusion: Produit = { ...produit, ...champs };

    return variantesProposees === undefined
      ? fusion
      : { ...fusion, variantes: fusionnerVariantes(produit.variantes, variantesProposees) };
  });
}

function fusionnerVariantes(
  base: readonly [Variante, ...Variante[]],
  proposees: readonly Variante[],
): readonly [Variante, ...Variante[]] {
  const fusionner = (variante: Variante): Variante => {
    const proposee = proposees.find((candidate) => candidate.sku === variante.sku);
    return proposee === undefined ? variante : { ...variante, ...proposee, sku: variante.sku };
  };

  const [premiere, ...suivantes] = base;
  return [fusionner(premiere), ...suivantes.map(fusionner)];
}

/* -------------------------------------------------------------------------- */
/* Recherches                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Le produit portant ce slug, ou `undefined`. Les pages s'en servent pour
 * répondre 404 sur une adresse inventée plutôt que de rendre une fiche vide.
 */
export function trouverProduitParSlug(
  produits: readonly Produit[],
  slug: string,
): Produit | undefined {
  return produits.find((produit) => produit.slug === slug);
}

/** Une variante et le produit qui la porte, retrouvés par SKU. */
export interface Reference {
  readonly produit: Produit;
  readonly variante: Variante;
}

/**
 * La variante portant ce SKU, avec son produit. Sert partout où le catalogue
 * se cite lui-même : composition du coffret « La table du dimanche », liste
 * blanche du coffret personnalisable, et demain les lignes de panier.
 */
export function trouverReferenceParSku(
  produits: readonly Produit[],
  sku: string,
): Reference | undefined {
  for (const produit of produits) {
    const variante = produit.variantes.find((candidate) => candidate.sku === sku);
    if (variante !== undefined) {
      return { produit, variante };
    }
  }

  return undefined;
}

/** Le prix d'entrée d'un produit — « à partir de ». */
export function prixLePlusBas(produit: Produit): number {
  const [premiere, ...suivantes] = produit.variantes;
  return suivantes.reduce(
    (minimum, variante) => Math.min(minimum, variante.prixCentimes),
    premiere.prixCentimes,
  );
}
