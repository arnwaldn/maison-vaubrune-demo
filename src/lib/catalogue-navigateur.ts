import {
  appliquerSurcouche,
  type DepotCatalogue,
  type ModificationProduit,
  type SurcoucheCatalogue,
  type VarianteModifiee,
} from '@/lib/catalogue';
import type { Produit } from '@/lib/types';

/**
 * LA SURCOUCHE MARCHAND, RANGÉE DANS LE NAVIGATEUR.
 *
 * ---------------------------------------------------------------------------
 * Ce que la tranche C2 avait promis, et que celle-ci livre
 * ---------------------------------------------------------------------------
 *
 * `src/lib/catalogue.ts` a posé en C2 l'interface `DepotCatalogue` et la
 * fonction pure `appliquerSurcouche()`, sans implémentation : « la tranche C6
 * livre le dépôt qui s'y branche ». Le voici. Il tient la même promesse qu'un
 * `DepotServeur` — lire, modifier, réinitialiser, exporter — avec une seule
 * chose de changé : la persistance. Les modifications vivent dans le
 * `localStorage` du visiteur, le catalogue versionné restant la référence
 * immuable que rien n'écrase jamais.
 *
 * ---------------------------------------------------------------------------
 * LES CINQ CHAMPS MODIFIABLES, et pourquoi la liste est fermée (décision D24)
 * ---------------------------------------------------------------------------
 *
 * Le marchand peut toucher CINQ choses, et pas une de plus :
 *
 *   sur le produit   : `resume`, `miseEnAvant`, `disponible`
 *   sur la variante  : `prixCentimes`, `stock`
 *
 * Tout le reste est ignoré CHAMP PAR CHAMP, sans que la modification entière
 * soit rejetée : un patch qui corrige un prix et tente au passage de réécrire
 * un poids d'expédition applique le prix et laisse le poids. Le refus en bloc
 * aurait été plus simple à écrire et pire à vivre — le marchand verrait sa
 * correction de prix disparaître sans savoir pourquoi.
 *
 * Trois familles de champs sont hors de portée, chacune pour une raison qui
 * lui est propre :
 *
 * - `slug` et `sku` sont des CLÉS. Le premier est une adresse publique, le
 *   second relie une variante à une ligne de panier, à la composition d'un
 *   coffret et à la liste blanche du coffret personnalisable. Ils sont déjà
 *   protégés par `appliquerSurcouche()` ; ils le sont une seconde fois ici,
 *   parce qu'une clé qu'on laisse écrire est une clé qui finit écrite.
 * - `poidsGrammes` et `format` sont des ENTRÉES DE CALCUL. Le poids décide de
 *   la tranche de frais de port ; le format porte, pour les coffrets
 *   personnalisables, le nombre de pièces à choisir (convention gardée par
 *   `verifier-catalogue.mjs`). Les laisser modifier depuis un écran de
 *   démonstration ferait diverger un colis de son prix de transport.
 * - `description`, `ingredients`, `allergenes`, `conservation`,
 *   `conseilConservation`, `composition`, `piecesEligibles` sont de la PROSE
 *   ET DU DROIT. Le régime de rétractation se calcule à partir d'eux
 *   (`src/lib/retractation.ts`, décision D12) ; une mention légale modifiable
 *   depuis un champ de saisie n'est plus une mention légale. Une boutique
 *   livrée les ouvre, avec un éditeur, une relecture et un historique — trois
 *   choses que cette démonstration n'a pas.
 *
 * ---------------------------------------------------------------------------
 * Lecture méfiante, comme partout ailleurs
 * ---------------------------------------------------------------------------
 *
 * Le contenu de la clé est du JSON écrit par une version antérieure du site,
 * recopié à la main, ou corrompu. Il est donc RELU champ par champ et non
 * `JSON.parse` puis affecté : un prix qui serait une chaîne, un stock
 * fractionnaire, une variante sans SKU, un slug dont la valeur n'est pas un
 * objet — tout cela est écarté sans lever. Une surcouche illisible rend une
 * surcouche VIDE, c'est-à-dire le catalogue livré, qui est toujours une
 * réponse juste.
 *
 * ---------------------------------------------------------------------------
 * Stockage INJECTÉ, ni `window` ni `localStorage` dans ce fichier
 * ---------------------------------------------------------------------------
 *
 * Même règle que `panier/persistance.ts` et `commandes/depot-local.ts`, et
 * mêmes trois raisons : les tests tournent sous Node avec trois lignes de faux
 * objet, le module reste importable par un composant serveur, et le jour où la
 * surcouche voudra voyager autrement (un lien partageable, par exemple), c'est
 * le seul argument qui change.
 */

/* -------------------------------------------------------------------------- */
/* Clé, version, stockage                                                      */
/* -------------------------------------------------------------------------- */

export const CLE_SURCOUCHE = 'maison-vaubrune.catalogue-surcouche.v1';

/** La seule version d'enveloppe que ce code sait lire. */
export const VERSION_SURCOUCHE = 1;

/**
 * Le strict nécessaire de l'interface `Storage`, `removeItem` compris : la
 * réinitialisation doit faire DISPARAÎTRE la clé, et non y écrire un objet
 * vide qu'il faudrait ensuite savoir distinguer d'une surcouche.
 */
export interface StockageSurcouche {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/* -------------------------------------------------------------------------- */
/* La liste fermée des champs modifiables                                      */
/* -------------------------------------------------------------------------- */

/** Les trois champs de produit que le marchand peut toucher. Voir l'en-tête. */
export const CHAMPS_PRODUIT_MODIFIABLES = ['resume', 'miseEnAvant', 'disponible'] as const;

/** Les deux champs de variante que le marchand peut toucher. Voir l'en-tête. */
export const CHAMPS_VARIANTE_MODIFIABLES = ['prixCentimes', 'stock'] as const;

/* -------------------------------------------------------------------------- */
/* Assainissement — champ par champ, jamais en bloc                            */
/* -------------------------------------------------------------------------- */

function estChaine(valeur: unknown): valeur is string {
  return typeof valeur === 'string';
}

/** Un entier positif ou nul : un prix et un stock ne sont ni négatifs ni fractionnaires. */
function estEntierPositif(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/**
 * Une variante proposée, réduite à son SKU et aux deux champs autorisés.
 *
 * `null` quand le SKU manque ou n'est pas une chaîne non vide : sans clé, la
 * proposition ne désigne rien. `null` aussi quand aucun champ autorisé n'a
 * survécu — une variante qui ne modifie rien n'a pas à occuper la surcouche.
 */
export function assainirVariante(brut: unknown): VarianteModifiee | null {
  if (!estObjet(brut) || !estChaine(brut['sku']) || brut['sku'] === '') {
    return null;
  }

  const retenus: { prixCentimes?: number; stock?: number } = {};

  for (const champ of CHAMPS_VARIANTE_MODIFIABLES) {
    const valeur = brut[champ];

    if (estEntierPositif(valeur)) {
      retenus[champ] = valeur;
    }
  }

  if (Object.keys(retenus).length === 0) {
    return null;
  }

  return { sku: brut['sku'], ...retenus };
}

/**
 * Une modification de produit, réduite aux champs autorisés.
 *
 * `null` quand rien d'exploitable n'a survécu au filtre. L'appelant retire
 * alors le slug de la surcouche plutôt que d'y laisser un objet vide, qui
 * afficherait un indicateur « modifié » sur un produit intact.
 */
export function assainirModification(brut: unknown): ModificationProduit | null {
  if (!estObjet(brut)) {
    return null;
  }

  const retenus: { resume?: string; miseEnAvant?: boolean; disponible?: boolean } = {};

  if (estChaine(brut['resume']) && brut['resume'].trim() !== '') {
    retenus.resume = brut['resume'];
  }

  if (typeof brut['miseEnAvant'] === 'boolean') {
    retenus.miseEnAvant = brut['miseEnAvant'];
  }

  if (typeof brut['disponible'] === 'boolean') {
    retenus.disponible = brut['disponible'];
  }

  const variantes: VarianteModifiee[] = [];

  if (Array.isArray(brut['variantes'])) {
    for (const brute of brut['variantes'] as readonly unknown[]) {
      const variante = assainirVariante(brute);

      if (variante !== null) {
        variantes.push(variante);
      }
    }
  }

  if (Object.keys(retenus).length === 0 && variantes.length === 0) {
    return null;
  }

  return variantes.length === 0 ? retenus : { ...retenus, variantes };
}

/**
 * Une surcouche entière, assainie.
 *
 * Un slug dont la modification ne survit pas au filtre DISPARAÎT de la
 * surcouche ; les autres restent. C'est le même parti pris que
 * `assainirModification()` et l'inverse de celui du panier et des commandes,
 * où une seule entrée malformée invalide tout : là-bas une lecture partielle
 * ferait payer un contenu amputé, ici elle fait au pire réafficher un produit
 * tel que le catalogue le livre — la valeur juste.
 */
export function assainirSurcouche(brut: unknown): SurcoucheCatalogue {
  if (!estObjet(brut)) {
    return {};
  }

  const surcouche: Record<string, ModificationProduit> = {};

  for (const [slug, brute] of Object.entries(brut)) {
    if (slug === '') {
      continue;
    }

    const modification = assainirModification(brute);

    if (modification !== null) {
      surcouche[slug] = modification;
    }
  }

  return surcouche;
}

/* -------------------------------------------------------------------------- */
/* L'enveloppe versionnée                                                      */
/* -------------------------------------------------------------------------- */

/**
 * La surcouche rangée dans ce stockage. Surcouche VIDE dans les cinq manières
 * de ne rien trouver — clé absente, accès qui lève, JSON invalide, enveloppe
 * méconnaissable, contenu corrompu : l'appelant n'a qu'un cas à traiter.
 */
export function lireSurcouche(stockage: StockageSurcouche): SurcoucheCatalogue {
  let brut: string | null;

  try {
    brut = stockage.getItem(CLE_SURCOUCHE);
  } catch {
    return {};
  }

  if (brut === null) {
    return {};
  }

  let enveloppe: unknown;

  try {
    enveloppe = JSON.parse(brut);
  } catch {
    return {};
  }

  if (!estObjet(enveloppe) || enveloppe['version'] !== VERSION_SURCOUCHE) {
    return {};
  }

  return assainirSurcouche(enveloppe['contenu']);
}

/** Écrit la surcouche. `false` si le stockage a refusé. */
export function ecrireSurcouche(
  stockage: StockageSurcouche,
  surcouche: SurcoucheCatalogue,
): boolean {
  try {
    stockage.setItem(
      CLE_SURCOUCHE,
      JSON.stringify({ version: VERSION_SURCOUCHE, contenu: surcouche }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Efface la surcouche. `false` si le stockage a refusé. */
export function effacerSurcouche(stockage: StockageSurcouche): boolean {
  try {
    stockage.removeItem(CLE_SURCOUCHE);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Fusion d'un patch dans une surcouche existante                              */
/* -------------------------------------------------------------------------- */

/**
 * La surcouche obtenue en appliquant un patch au slug désigné.
 *
 * Fonction PURE : l'entrée n'est jamais modifiée. Les variantes sont fusionnées
 * SKU par SKU — corriger le stock du 25 cl ne doit pas effacer le prix du
 * 50 cl saisi une minute plus tôt. Un patch qui ne survit pas au filtre RETIRE
 * le slug de la surcouche : c'est ce qui permet à l'espace de gestion de rendre
 * un produit à son état d'origine sans un second chemin de code.
 */
export function fusionnerDansSurcouche(
  surcouche: SurcoucheCatalogue,
  slug: string,
  patch: unknown,
): SurcoucheCatalogue {
  const assaini = assainirModification(patch);
  const { [slug]: courante, ...autres } = surcouche;

  if (assaini === null) {
    return autres;
  }

  if (courante === undefined) {
    return { ...autres, [slug]: assaini };
  }

  const { variantes: variantesPatch, ...champsPatch } = assaini;
  const { variantes: variantesCourantes, ...champsCourants } = courante;

  const fusionnee: ModificationProduit = { ...champsCourants, ...champsPatch };
  const variantes = fusionnerListesDeVariantes(variantesCourantes, variantesPatch);

  return {
    ...autres,
    [slug]: variantes.length === 0 ? fusionnee : { ...fusionnee, variantes },
  };
}

function fusionnerListesDeVariantes(
  courantes: readonly VarianteModifiee[] | undefined,
  patch: readonly VarianteModifiee[] | undefined,
): readonly VarianteModifiee[] {
  const parSku = new Map<string, VarianteModifiee>();

  for (const variante of courantes ?? []) {
    parSku.set(variante.sku, variante);
  }

  for (const variante of patch ?? []) {
    const deja = parSku.get(variante.sku);
    parSku.set(variante.sku, deja === undefined ? variante : { ...deja, ...variante });
  }

  return [...parSku.values()];
}

/* -------------------------------------------------------------------------- */
/* Lectures de vitrine — décision D24                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ces cinq fonctions sont TOUT ce que la vitrine emprunte à la surcouche.
 *
 * Elles ne sont appelées ni par `src/lib/panier/`, ni par
 * `src/lib/commandes/`, ni par `src/lib/paiement/` : le passage en caisse se
 * fait aux prix du catalogue versionné, parce que le serveur ne fait jamais
 * confiance au navigateur (décision D24,
 * `contenu/decisions/005-surcouche-vitrine-seulement.md`).
 *
 * Chacune prend la valeur DE BASE en dernier paramètre et la rend telle quelle
 * en l'absence de surcouche. C'est ce qui permet aux feuilles clientes de
 * rendre exactement le HTML du serveur au premier rendu, puis de basculer
 * après montage sans aucun désaccord d'hydratation.
 */

function modificationDe(
  surcouche: SurcoucheCatalogue,
  slug: string,
): ModificationProduit | undefined {
  return surcouche[slug];
}

function varianteDe(
  surcouche: SurcoucheCatalogue,
  slug: string,
  sku: string,
): VarianteModifiee | undefined {
  return modificationDe(surcouche, slug)?.variantes?.find(
    (variante) => variante.sku === sku,
  );
}

/** Le prix affiché d'une variante, en centimes. */
export function prixAffiche(
  surcouche: SurcoucheCatalogue,
  slug: string,
  sku: string,
  base: number,
): number {
  return varianteDe(surcouche, slug, sku)?.prixCentimes ?? base;
}

/** Le stock affiché d'une variante. */
export function stockAffiche(
  surcouche: SurcoucheCatalogue,
  slug: string,
  sku: string,
  base: number,
): number {
  return varianteDe(surcouche, slug, sku)?.stock ?? base;
}

/** Le résumé affiché d'un produit. */
export function resumeAffiche(
  surcouche: SurcoucheCatalogue,
  slug: string,
  base: string,
): string {
  return modificationDe(surcouche, slug)?.resume ?? base;
}

/** La mise en avant affichée d'un produit. */
export function miseEnAvantAffichee(
  surcouche: SurcoucheCatalogue,
  slug: string,
  base: boolean,
): boolean {
  return modificationDe(surcouche, slug)?.miseEnAvant ?? base;
}

/** Le produit est-il présenté comme disponible ? */
export function estDisponibleAffiche(surcouche: SurcoucheCatalogue, slug: string): boolean {
  return modificationDe(surcouche, slug)?.disponible !== false;
}

/**
 * Le plus bas des prix affichés — le « à partir de » de la grille et de la
 * fiche. Les variantes arrivent réduites à leur SKU et à leur prix de base :
 * une feuille cliente n'a pas besoin de plus, et n'en reçoit pas plus.
 */
export function prixLePlusBasAffiche(
  surcouche: SurcoucheCatalogue,
  slug: string,
  variantes: readonly { readonly sku: string; readonly prixCentimes: number }[],
): number {
  let minimum: number | null = null;

  for (const variante of variantes) {
    const prix = prixAffiche(surcouche, slug, variante.sku, variante.prixCentimes);
    minimum = minimum === null ? prix : Math.min(minimum, prix);
  }

  return minimum ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Le dépôt                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * LE DÉPÔT NAVIGATEUR — l'implémentation que C2 annonçait.
 *
 * Il ne garde AUCUN état en mémoire : chaque appel relit le stockage. C'est
 * délibéré et c'est ce qui le rend juste à plusieurs onglets — le second onglet
 * qui lit après une modification du premier voit la modification, sans
 * invalidation de cache à écrire ni à oublier.
 *
 * Le catalogue de base lui est PASSÉ au lieu d'être importé : le dépôt vit
 * dans un îlot client (l'écran de gestion du catalogue), et un `import` du
 * catalogue depuis un composant client embarquerait les quinze fiches dans le
 * paquet JavaScript (décision D17). L'îlot le reçoit en propriété, calculé
 * côté serveur, et le transmet ici.
 */
export class DepotNavigateur implements DepotCatalogue {
  readonly #base: readonly Produit[];
  readonly #stockage: StockageSurcouche;

  constructor(base: readonly Produit[], stockage: StockageSurcouche) {
    this.#base = base;
    this.#stockage = stockage;
  }

  /** La surcouche courante, telle qu'elle est rangée. */
  surcouche(): SurcoucheCatalogue {
    return lireSurcouche(this.#stockage);
  }

  lire(): readonly Produit[] {
    return appliquerSurcouche(this.#base, this.surcouche());
  }

  enregistrerModification(slug: string, modification: ModificationProduit): void {
    ecrireSurcouche(
      this.#stockage,
      fusionnerDansSurcouche(this.surcouche(), slug, modification),
    );
  }

  reinitialiser(): void {
    effacerSurcouche(this.#stockage);
  }

  /**
   * Le catalogue surcouché, en JSON indenté.
   *
   * C'est EXACTEMENT ce qu'une boutique livrée enregistre dans sa base : les
   * quinze fiches entières, prose comprise, avec les valeurs du jour et non un
   * différentiel. Un export qui ne contiendrait que les modifications ne serait
   * pas un catalogue, ce serait une note de service — inexploitable pour
   * reprendre l'étal ailleurs, et impossible à relire dans six mois.
   *
   * Deux espaces d'indentation : le fichier est fait pour être ouvert et lu,
   * pas seulement réimporté.
   */
  exporter(): string {
    return JSON.stringify(this.lire(), null, 2);
  }
}
