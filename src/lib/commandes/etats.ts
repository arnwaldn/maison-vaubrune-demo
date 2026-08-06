import type { LigneCalculee } from '@/lib/panier/totaux';
import type { CodeZone } from '@/lib/types';

/**
 * LA COMMANDE ET SES ÉTATS. Types et transitions pures, aucun stockage.
 *
 * ---------------------------------------------------------------------------
 * Quatre états, et pas un « en attente »
 * ---------------------------------------------------------------------------
 *
 * Une commande n'existe QU'À PARTIR du paiement : `payee`, `preparee`,
 * `expediee`, `annulee`. Ce qui précède le paiement — le panier envoyé au
 * prestataire, les coordonnées saisies — n'est pas une commande mais une
 * COMMANDE EN ATTENTE, un type distinct (`CommandeEnAttente`) qui ne porte ni
 * état ni journal parce qu'il n'a encore rien à raconter. C'est ce qui donne
 * son sens à la promesse tenue par le dépôt : une commande promue a un journal
 * d'EXACTEMENT une entrée, `payee`, et cette entrée est vraie.
 *
 * Le contre-exemple, écarté : un cinquième état `en-attente` mêlé aux quatre
 * autres. Il aurait fallu l'exclure à la main de chaque liste de commandes
 * affichée, de chaque compteur, de chaque transition — et l'oubli d'un seul de
 * ces filtres aurait montré au marchand des commandes que personne n'a payées.
 *
 * ---------------------------------------------------------------------------
 * Le graphe, écrit une fois
 * ---------------------------------------------------------------------------
 *
 *   payee     → preparee | annulee
 *   preparee  → expediee | annulee
 *   expediee  → (rien)
 *   annulee   → (rien)
 *
 * Deux états terminaux, et ils le sont pour deux raisons opposées. `expediee`
 * est terminal parce que le colis est parti : ce qui arrive ensuite (un retour,
 * une rétractation) est un autre acte, avec ses propres pièces, pas un retour
 * en arrière de celui-ci. `annulee` est terminal parce qu'une commande annulée
 * qu'on pourrait « ré-ouvrir » ferait exister deux versions d'un même
 * engagement — celle que le client a lue et celle que le marchand a rétablie.
 *
 * ---------------------------------------------------------------------------
 * Le journal S'AJOUTE, il ne se remplace jamais
 * ---------------------------------------------------------------------------
 *
 * Chaque transition acceptée ajoute UNE entrée `{ etat, horodatage }`. Le
 * journal ne se réécrit pas, ne se compacte pas, ne se purge pas : c'est la
 * seule chose qui permette de répondre à « quand cette commande est-elle
 * passée en préparation ? » sans le deviner. L'horodatage est injecté, comme
 * la date de la référence et pour la même raison : une fonction qui lit
 * l'horloge ne se vérifie pas.
 */

/* -------------------------------------------------------------------------- */
/* Les états                                                                   */
/* -------------------------------------------------------------------------- */

export const ETATS_COMMANDE = ['payee', 'preparee', 'expediee', 'annulee'] as const;

export type EtatCommande = (typeof ETATS_COMMANDE)[number];

export const LIBELLE_ETAT: Record<EtatCommande, string> = {
  payee: 'Payée',
  preparee: 'Préparée',
  expediee: 'Expédiée',
  annulee: 'Annulée',
};

/** Le graphe, écrit une seule fois. Voir l'en-tête pour le raisonnement. */
const TRANSITIONS: Record<EtatCommande, readonly EtatCommande[]> = {
  payee: ['preparee', 'annulee'],
  preparee: ['expediee', 'annulee'],
  expediee: [],
  annulee: [],
};

/** Les états atteignables depuis celui-ci. Tableau vide sur un état terminal. */
export function transitionsAutorisees(etat: EtatCommande): readonly EtatCommande[] {
  return TRANSITIONS[etat];
}

/* -------------------------------------------------------------------------- */
/* La commande                                                                 */
/* -------------------------------------------------------------------------- */

/** Une entrée du journal : un état, et l'instant où il a été atteint. */
export interface EntreeJournal {
  readonly etat: EtatCommande;
  /** ISO 8601, tel que `Date.prototype.toISOString()` l'écrit. */
  readonly horodatage: string;
}

/**
 * Les coordonnées de livraison, telles que le visiteur les a saisies.
 *
 * Elles ne quittent JAMAIS son navigateur (décision D2) : elles ne sont pas
 * dans le corps envoyé à la route de session, et le prestataire de paiement
 * collecte les siennes de son côté. Elles vivent ici parce qu'une commande
 * sans destinataire n'est pas un récapitulatif honnête.
 */
export interface CoordonneesCommande {
  readonly prenomNom: string;
  readonly adresse: string;
  readonly codePostal: string;
  readonly courriel: string;
}

/** Les trois montants, figés au moment du paiement. */
export interface TotauxCommande {
  readonly sousTotal: number;
  readonly port: number;
  readonly total: number;
}

/**
 * Ce qui est écrit AVANT la redirection vers le paiement.
 *
 * `Omit` plutôt qu'une seconde interface recopiée : les champs communs ne
 * peuvent pas diverger, et le compilateur réclamera la mise à jour des deux
 * usages le jour où `Commande` gagnera un champ.
 */
export type CommandeEnAttente = Omit<Commande, 'etat' | 'journal'>;

export interface Commande {
  readonly reference: string;
  /** Les lignes DÉJÀ CHIFFRÉES par `calculerTotaux()` : aucun recalcul ici. */
  readonly lignes: readonly LigneCalculee[];
  readonly zone: CodeZone;
  readonly totaux: TotauxCommande;
  /** `null` quand la commande a été reprise sans ses coordonnées. */
  readonly coordonnees: CoordonneesCommande | null;
  readonly etat: EtatCommande;
  /** Au moins une entrée : celle du paiement. Voir l'en-tête. */
  readonly journal: readonly EntreeJournal[];
  readonly modePaiement: 'test' | 'simule';
}

/* -------------------------------------------------------------------------- */
/* La transition                                                               */
/* -------------------------------------------------------------------------- */

export type ResultatTransition =
  | { readonly ok: true; readonly commande: Commande }
  | { readonly ok: false; readonly motif: string };

/**
 * Fait passer une commande d'un état à un autre, ou dit pourquoi elle ne peut
 * pas.
 *
 * Rend une NOUVELLE commande — l'entrée n'est jamais modifiée. Le refus porte
 * une phrase française prête à afficher plutôt qu'un code : c'est le même parti
 * pris que le moteur d'expédition (`ResultatExpedition`), et pour la même
 * raison — celui qui sait pourquoi il refuse est celui qui doit savoir le dire.
 */
export function appliquerTransition(
  commande: Commande,
  cible: EtatCommande,
  horodatage: string,
): ResultatTransition {
  const autorisees = transitionsAutorisees(commande.etat);

  if (!autorisees.includes(cible)) {
    return { ok: false, motif: motifRefus(commande.etat, cible, autorisees) };
  }

  return {
    ok: true,
    commande: {
      ...commande,
      etat: cible,
      journal: [...commande.journal, { etat: cible, horodatage }],
    },
  };
}

function motifRefus(
  depuis: EtatCommande,
  cible: EtatCommande,
  autorisees: readonly EtatCommande[],
): string {
  if (autorisees.length === 0) {
    return (
      `Une commande ${LIBELLE_ETAT[depuis].toLowerCase()} ne change plus d’état : ` +
      `le passage vers ${LIBELLE_ETAT[cible].toLowerCase()} est refusé.`
    );
  }

  const possibles = autorisees.map((etat) => LIBELLE_ETAT[etat].toLowerCase()).join(' ou ');

  return (
    `Une commande ${LIBELLE_ETAT[depuis].toLowerCase()} ne peut passer que vers ` +
    `${possibles} ; le passage vers ${LIBELLE_ETAT[cible].toLowerCase()} est refusé.`
  );
}
