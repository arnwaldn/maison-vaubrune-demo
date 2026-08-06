import {
  appliquerTransition,
  ETATS_COMMANDE,
  type Commande,
  type CommandeEnAttente,
  type CoordonneesCommande,
  type EntreeJournal,
  type EtatCommande,
  type ResultatTransition,
  type TotauxCommande,
} from '@/lib/commandes/etats';
import type { LigneCalculee } from '@/lib/panier/totaux';
import { CODES_ZONE, type CodeZone } from '@/lib/types';

/**
 * LES COMMANDES, RANGÉES DANS LE NAVIGATEUR. Stockage INJECTÉ, lecture méfiante.
 *
 * ---------------------------------------------------------------------------
 * Deux clés, deux natures
 * ---------------------------------------------------------------------------
 *
 * `maison-vaubrune.commandes.v1` porte la LISTE des commandes payées. Elle
 * grossit, elle ne se réécrit qu'en entier, et c'est elle que la page de suivi
 * lira (tranche C6).
 *
 * `maison-vaubrune.commande-en-attente.v1` porte AU PLUS UNE commande, celle
 * qui vient de partir vers le paiement. Elle existe parce que le visiteur
 * quitte le site : entre le clic sur « Commander » et son retour, la page
 * courante est détruite, l'état React avec elle, et les coordonnées saisies
 * disparaîtraient si personne ne les avait écrites. Elle est effacée par le
 * retour — promue en commande payée, ou abandonnée.
 *
 * ---------------------------------------------------------------------------
 * Le même stockage injecté que le panier, et les mêmes raisons
 * ---------------------------------------------------------------------------
 *
 * Ni `window`, ni `localStorage` dans ce fichier (voir l'en-tête de
 * `panier/persistance.ts`, qui a posé la règle) : les tests couvrent le quota
 * dépassé, l'accès qui lève et le contenu corrompu avec trois lignes de faux
 * objet, et le module reste importable par un composant serveur.
 *
 * ---------------------------------------------------------------------------
 * Ce qui est relu et ce qui ne l'est pas — parti pris explicite
 * ---------------------------------------------------------------------------
 *
 * Toute la structure d'une commande est vérifiée : référence, zone, montants
 * entiers, état connu, journal bien formé, mode de paiement. Le CONTENU des
 * lignes chiffrées, lui, n'est pas re-vérifié pièce à pièce — on exige un
 * tableau, pas davantage. Ce n'est pas un oubli : ces objets ne servent qu'à
 * réafficher un récapitulatif déjà payé, aucun montant n'en est recalculé (les
 * trois totaux sont contrôlés, eux), et un contrôle exhaustif de chaque ligne
 * doublerait la surface de ce module sans protéger un centime.
 *
 * Comme pour le panier, une commande MALFORMÉE invalide TOUTE la liste : une
 * liste à moitié comprise ferait disparaître des commandes sans le dire, ce
 * qui est pire qu'une liste vide qu'on remarque.
 *
 * ---------------------------------------------------------------------------
 * AJOUT C6 — le jeu d'essai, et la COPIE À L'ÉCRITURE
 * ---------------------------------------------------------------------------
 *
 * Un espace de gestion vide ne démontre rien : six commandes d'amorce
 * (`src/donnees/commandes-amorce.ts`) peuplent le tableau de bord dès la
 * première visite. Elles ne sont PAS écrites dans le stockage — elles sont
 * FUSIONNÉES à la lecture. Deux conséquences qui valent d'être dites :
 *
 * - un visiteur qui n'a rien fait ne trouve rien dans son navigateur, ce qui
 *   est ce que la démonstration promet (« vos essais restent chez vous ») ;
 * - la réinitialisation n'a pas à reconstruire l'amorce, seulement à effacer
 *   ce que le visiteur a écrit.
 *
 * Faire avancer une commande d'amorce écrit donc une COPIE dans le stockage
 * local, et cette copie MASQUE l'originale à la lecture suivante. L'amorce
 * reste intacte, en mémoire, telle que le module la construit. C'est la seule
 * manière d'avoir à la fois des commandes d'exemple sur lesquelles agir et un
 * bouton « Réinitialiser » qui tienne sa promesse.
 *
 * L'AMORCE EST INJECTÉE, jamais importée ici. Deux raisons, et la seconde est
 * la vraie : ce module est déjà dans le paquet client du tunnel
 * (`IlotCommande`, `IlotConfirmation`), et un `import` du jeu d'essai y
 * embarquerait six commandes complètes — articles projetés compris — sur des
 * pages qui n'en ont aucun usage (décision D17). Le paramètre est optionnel et
 * vaut la liste vide : les appels du tunnel n'ont pas changé d'une lettre, et
 * ne coûtent pas un octet de plus.
 */

/* -------------------------------------------------------------------------- */
/* Clés, version, stockage                                                     */
/* -------------------------------------------------------------------------- */

export const CLE_COMMANDES = 'maison-vaubrune.commandes.v1';
export const CLE_ATTENTE = 'maison-vaubrune.commande-en-attente.v1';

/** La seule version d'enveloppe que ce code sait lire. */
export const VERSION_COMMANDES = 1;

/**
 * Le strict nécessaire de l'interface `Storage`, `removeItem` compris — la
 * commande en attente doit pouvoir DISPARAÎTRE, et écrire `null` à sa place
 * laisserait une clé qu'il faudrait ensuite savoir distinguer d'une commande.
 */
export interface StockageCommandes {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/* -------------------------------------------------------------------------- */
/* L'enveloppe versionnée                                                      */
/* -------------------------------------------------------------------------- */

/** La charge utile rangée sous cette clé, ou `undefined` si rien d'exploitable. */
function lireCharge(stockage: StockageCommandes, cle: string): unknown {
  let brut: string | null;

  try {
    brut = stockage.getItem(cle);
  } catch {
    return undefined;
  }

  if (brut === null) {
    return undefined;
  }

  let enveloppe: unknown;

  try {
    enveloppe = JSON.parse(brut);
  } catch {
    return undefined;
  }

  if (typeof enveloppe !== 'object' || enveloppe === null) {
    return undefined;
  }

  const { version, contenu } = enveloppe as {
    readonly version?: unknown;
    readonly contenu?: unknown;
  };

  if (version !== VERSION_COMMANDES) {
    return undefined;
  }

  return contenu;
}

/** Écrit une charge sous son enveloppe. `false` si le stockage a refusé. */
function ecrireCharge(stockage: StockageCommandes, cle: string, contenu: unknown): boolean {
  try {
    stockage.setItem(cle, JSON.stringify({ version: VERSION_COMMANDES, contenu }));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Lecture méfiante                                                            */
/* -------------------------------------------------------------------------- */

function estChaine(valeur: unknown): valeur is string {
  return typeof valeur === 'string';
}

function estEntier(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur);
}

function estEtat(valeur: unknown): valeur is EtatCommande {
  return estChaine(valeur) && (ETATS_COMMANDE as readonly string[]).includes(valeur);
}

function estZone(valeur: unknown): valeur is CodeZone {
  return estChaine(valeur) && (CODES_ZONE as readonly string[]).includes(valeur);
}

function estMode(valeur: unknown): valeur is Commande['modePaiement'] {
  return valeur === 'test' || valeur === 'simule';
}

function analyserTotaux(brut: unknown): TotauxCommande | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }

  const { sousTotal, port, total } = brut as {
    readonly sousTotal?: unknown;
    readonly port?: unknown;
    readonly total?: unknown;
  };

  if (![sousTotal, port, total].every(estEntier)) {
    return null;
  }

  return { sousTotal, port, total } as TotauxCommande;
}

/**
 * `null` est une valeur ACCEPTÉE ici : une commande sans coordonnées est
 * légitime (une reprise, un export réimporté), une commande dont les
 * coordonnées sont à moitié lisibles ne l'est pas.
 */
function analyserCoordonnees(brut: unknown): {
  readonly ok: boolean;
  readonly valeur: CoordonneesCommande | null;
} {
  if (brut === null) {
    return { ok: true, valeur: null };
  }

  if (typeof brut !== 'object') {
    return { ok: false, valeur: null };
  }

  const { prenomNom, adresse, codePostal, courriel } = brut as {
    readonly prenomNom?: unknown;
    readonly adresse?: unknown;
    readonly codePostal?: unknown;
    readonly courriel?: unknown;
  };

  if (![prenomNom, adresse, codePostal, courriel].every(estChaine)) {
    return { ok: false, valeur: null };
  }

  return {
    ok: true,
    valeur: { prenomNom, adresse, codePostal, courriel } as CoordonneesCommande,
  };
}

function estEntreeJournal(brut: unknown): brut is EntreeJournal {
  if (typeof brut !== 'object' || brut === null) {
    return false;
  }

  const { etat, horodatage } = brut as {
    readonly etat?: unknown;
    readonly horodatage?: unknown;
  };

  return estEtat(etat) && estChaine(horodatage);
}

/**
 * Le tronc commun d'une commande et d'une commande en attente : tout sauf
 * l'état et le journal, que la seconde n'a pas encore.
 */
function analyserSocle(brut: unknown): CommandeEnAttente | null {
  if (typeof brut !== 'object' || brut === null) {
    return null;
  }

  const candidat = brut as {
    readonly reference?: unknown;
    readonly lignes?: unknown;
    readonly zone?: unknown;
    readonly totaux?: unknown;
    readonly coordonnees?: unknown;
    readonly modePaiement?: unknown;
  };

  if (!estChaine(candidat.reference) || candidat.reference === '') {
    return null;
  }

  if (!Array.isArray(candidat.lignes) || !estZone(candidat.zone)) {
    return null;
  }

  if (!estMode(candidat.modePaiement)) {
    return null;
  }

  const totaux = analyserTotaux(candidat.totaux);

  if (totaux === null) {
    return null;
  }

  const coordonnees = analyserCoordonnees(candidat.coordonnees);

  if (!coordonnees.ok) {
    return null;
  }

  return {
    reference: candidat.reference,
    lignes: candidat.lignes as readonly LigneCalculee[],
    zone: candidat.zone,
    totaux,
    coordonnees: coordonnees.valeur,
    modePaiement: candidat.modePaiement,
  };
}

function analyserCommande(brut: unknown): Commande | null {
  const socle = analyserSocle(brut);

  if (socle === null) {
    return null;
  }

  const { etat, journal } = brut as {
    readonly etat?: unknown;
    readonly journal?: unknown;
  };

  if (!estEtat(etat) || !Array.isArray(journal) || !journal.every(estEntreeJournal)) {
    return null;
  }

  return { ...socle, etat, journal: journal as readonly EntreeJournal[] };
}

/* -------------------------------------------------------------------------- */
/* La commande en attente                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Range la commande qui part vers le paiement. `false` si le stockage a
 * refusé — l'appelant redirige quand même : perdre le récapitulatif local est
 * fâcheux, empêcher un paiement le serait davantage.
 */
export function mettreEnAttente(
  stockage: StockageCommandes,
  commande: CommandeEnAttente,
): boolean {
  return ecrireCharge(stockage, CLE_ATTENTE, commande);
}

/** La commande en attente, ou `null` s'il n'y en a pas d'exploitable. */
export function lireAttente(stockage: StockageCommandes): CommandeEnAttente | null {
  return analyserSocle(lireCharge(stockage, CLE_ATTENTE));
}

/** Efface la commande en attente. `false` si le stockage a refusé. */
export function abandonnerAttente(stockage: StockageCommandes): boolean {
  try {
    stockage.removeItem(CLE_ATTENTE);
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Les commandes payées                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Les commandes ÉCRITES DANS CE NAVIGATEUR, dans l'ordre où elles ont été
 * payées. Liste vide si la clé est absente, illisible, ou si UNE SEULE commande
 * est malformée (voir l'en-tête).
 *
 * C'est la lecture brute du stockage : elle ignore le jeu d'essai. L'espace de
 * gestion s'en sert pour distinguer, dans son tableau, les commandes que le
 * visiteur a réellement produites — les siennes et les copies qu'il a fait
 * avancer — de celles qui viennent de l'amorce.
 */
export function lireCommandesLocales(stockage: StockageCommandes): readonly Commande[] {
  const charge = lireCharge(stockage, CLE_COMMANDES);

  if (!Array.isArray(charge)) {
    return [];
  }

  const commandes: Commande[] = [];

  for (const brut of charge as readonly unknown[]) {
    const commande = analyserCommande(brut);

    if (commande === null) {
      return [];
    }

    commandes.push(commande);
  }

  return commandes;
}

/**
 * Toutes les commandes visibles : le jeu d'essai, puis celles du navigateur.
 *
 * Une commande LOCALE MASQUE l'amorce de même référence — c'est la copie à
 * l'écriture décrite en tête de fichier. L'ordre rend l'amorce d'abord (les
 * plus anciennes) puis les locales dans l'ordre d'écriture ; les écrans qui
 * veulent un autre tri le font eux-mêmes, sur une liste dont ils savent qu'elle
 * est complète.
 */
export function lireCommandes(
  stockage: StockageCommandes,
  amorce: readonly Commande[] = [],
): readonly Commande[] {
  const locales = lireCommandesLocales(stockage);

  if (amorce.length === 0) {
    return locales;
  }

  const masquees = new Set(locales.map((commande) => commande.reference));

  return [
    ...amorce.filter((commande) => !masquees.has(commande.reference)),
    ...locales,
  ];
}

/** La commande portant cette référence, ou `null`. Jeu d'essai compris. */
export function lireCommande(
  stockage: StockageCommandes,
  reference: string,
  amorce: readonly Commande[] = [],
): Commande | null {
  return (
    lireCommandes(stockage, amorce).find(
      (commande) => commande.reference === reference,
    ) ?? null
  );
}

/**
 * Efface TOUT ce que ce navigateur a écrit sur les commandes — la liste et la
 * commande en attente. Le jeu d'essai, lui, n'est pas dans le stockage : il
 * réapparaît intact à la lecture suivante, ce qui est précisément ce qu'on
 * attend d'une réinitialisation.
 *
 * `false` si l'une des deux suppressions a échoué. L'appelant le dit plutôt que
 * d'afficher un succès démenti par l'écran suivant.
 */
export function purgerCommandesLocales(stockage: StockageCommandes): boolean {
  let ok = true;

  for (const cle of [CLE_COMMANDES, CLE_ATTENTE]) {
    try {
      stockage.removeItem(cle);
    } catch {
      ok = false;
    }
  }

  return ok;
}

/**
 * LA PROMOTION : la commande en attente devient une commande payée.
 *
 * IDEMPOTENTE, et c'est sa raison d'être. La page de confirmation appelle
 * cette fonction à chaque montage — et un visiteur rafraîchit sa page de
 * confirmation, la met en favori, y revient par l'historique. La première
 * fois, l'attente est promue ; les suivantes, la commande est simplement
 * relue. Sans cette garantie, un rafraîchissement créerait un doublon ou, pire,
 * afficherait « commande introuvable » sur une commande payée.
 *
 * Le journal de la commande promue compte EXACTEMENT une entrée : `payee`,
 * horodatée par l'appelant.
 */
export function promouvoirEnPayee(
  stockage: StockageCommandes,
  reference: string,
  horodatage: string,
): Commande | null {
  const deja = lireCommande(stockage, reference);

  if (deja !== null) {
    return deja;
  }

  const attente = lireAttente(stockage);

  if (attente === null || attente.reference !== reference) {
    return null;
  }

  const commande: Commande = {
    ...attente,
    etat: 'payee',
    journal: [{ etat: 'payee', horodatage }],
  };

  /* L'attente n'est effacée QUE si la liste a bien été écrite. Un stockage
     plein effacerait sinon la seule trace de la commande. */
  if (
    ecrireCharge(stockage, CLE_COMMANDES, [...lireCommandesLocales(stockage), commande])
  ) {
    abandonnerAttente(stockage);
  }

  return commande;
}

/**
 * Applique une transition d'état et réécrit la liste locale.
 *
 * La décision reste dans `appliquerTransition()` — ce module ne connaît pas le
 * graphe, il ne fait que persister son verdict. C'est ce qui permet à l'espace
 * de gestion de faire avancer une commande sans dupliquer une seule règle.
 *
 * COPIE À L'ÉCRITURE. La commande à faire avancer est cherchée dans la vue
 * COMPLÈTE (jeu d'essai compris), mais l'écriture n'a lieu que dans la liste
 * LOCALE : une commande d'amorce y est AJOUTÉE dans son nouvel état, où elle
 * masquera l'originale à la lecture suivante ; une commande déjà locale y est
 * REMPLACÉE. L'amorce n'est jamais modifiée — c'est ce qui rend
 * « Réinitialiser le jeu d'essai » exact, et non approximatif.
 */
export function appliquerTransitionEnregistree(
  stockage: StockageCommandes,
  reference: string,
  cible: EtatCommande,
  horodatage: string,
  amorce: readonly Commande[] = [],
): ResultatTransition {
  const courante = lireCommande(stockage, reference, amorce);

  if (courante === null) {
    return { ok: false, motif: `Aucune commande ne porte la référence ${reference}.` };
  }

  const resultat = appliquerTransition(courante, cible, horodatage);

  if (!resultat.ok) {
    return resultat;
  }

  const locales = lireCommandesLocales(stockage);
  const dejaLocale = locales.some((commande) => commande.reference === reference);

  const suivantes = dejaLocale
    ? locales.map((commande) =>
        commande.reference === reference ? resultat.commande : commande,
      )
    : [...locales, resultat.commande];

  if (!ecrireCharge(stockage, CLE_COMMANDES, suivantes)) {
    return {
      ok: false,
      motif:
        'Le changement d’état n’a pas pu être enregistré : le stockage du ' +
        'navigateur a refusé l’écriture.',
    };
  }

  return resultat;
}
