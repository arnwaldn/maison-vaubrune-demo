import { LIBELLE_ZONE, type CodeZone } from '@/lib/types';

/**
 * LE BARÈME D'EXPÉDITION. Trois zones, quatre tranches de poids au plus.
 *
 * ---------------------------------------------------------------------------
 * AVERTISSEMENT — ces montants sont des DONNÉES DE DÉMONSTRATION
 * ---------------------------------------------------------------------------
 *
 * Les prix, les seuils et les délais écrits ici sont plausibles pour une
 * petite maison qui expédie des colis alimentaires depuis la France, et rien
 * de plus. Ils ne reproduisent le tarif d'AUCUN transporteur réel, ils n'ont
 * été négociés avec personne, et ils ne valent aucune promesse commerciale.
 * Ils sont là pour que le moteur ait des chiffres à faire tourner et que la
 * page « Livraison » ait quelque chose à publier.
 *
 * Un marchand qui reprendrait cette boutique remplacerait ce fichier — et
 * uniquement ce fichier — par ses propres conditions négociées. C'est
 * exactement la raison pour laquelle le barème est SÉPARÉ du moteur : aucun
 * montant n'est écrit dans `src/lib/expedition.ts`, aucun montant n'est écrit
 * dans la page. Changer de transporteur, ici, c'est éditer un tableau de
 * nombres, pas relire du code.
 *
 * ---------------------------------------------------------------------------
 * Conventions de lecture
 * ---------------------------------------------------------------------------
 *
 * 1. TOUT EST EN ENTIERS. Les poids en grammes, les prix en centimes TTC
 *    (décision D4). Aucun flottant n'entre dans un calcul de frais de port.
 *
 * 2. LES BORNES HAUTES SONT INCLUSES. `jusquAGrammes: 1000` signifie « de 0 à
 *    1 000 grammes, borne comprise ». Un colis de 1 000 g exactement paie la
 *    première tranche ; c'est à 1 001 g qu'il bascule. Cette convention est
 *    testée aux deux grammes qui l'encadrent, parce qu'un barème dont on se
 *    demande de quel côté tombe la borne est un barème qu'on n'ose pas
 *    publier.
 *
 * 3. LES TRANCHES SONT TRIÉES par borne croissante. Le moteur retient la
 *    PREMIÈRE dont la borne couvre le poids : l'ordre porte donc du sens et
 *    n'est pas cosmétique.
 *
 * 4. AU-DELÀ DE LA DERNIÈRE TRANCHE, il n'y a pas de tarif — il y a un devis.
 *    Le moteur répond « expédition impossible » plutôt que d'extrapoler un
 *    prix que personne n'a fixé.
 *
 * ---------------------------------------------------------------------------
 * Les trois zones (décision D9)
 * ---------------------------------------------------------------------------
 *
 * MÉTROPOLE — la zone de référence. Quatre tranches jusqu'à 30 kg, franco de
 * port à 69,00 €, produits frais acceptés sous emballage isotherme.
 *
 * CORSE — même découpage de poids, trois euros de plus par tranche, franco
 * relevé à 89,00 €, délai allongé. Les produits frais y sont REFUSÉS : la
 * chaîne du froid ne tient pas sur quatre à six jours ouvrés, et une maison
 * sérieuse préfère refuser la commande que livrer une denrée douteuse.
 *
 * OUTRE-MER — trois tranches seulement (le barème s'arrête à 10 kg), aucun
 * franco de port, produits frais refusés pour la même raison, en pire. Ne pas
 * accorder de franco de port sur cette zone est un choix assumé et non un
 * oubli : offrir 39,00 € de transport au-delà de 69,00 € de commande n'a pas
 * de sens économique, et un franco affiché puis rattrapé par des exclusions
 * en petits caractères vaut moins qu'un franco absent.
 *
 * Le supplément isotherme est renseigné sur les trois zones, mais il reste
 * INERTE là où `acceptePerissable` vaut faux : la question ne se pose jamais,
 * puisque le panier est refusé avant. Il n'est pas mis à zéro pour autant —
 * zéro se lirait « isotherme offert », ce qui serait faux.
 */

export interface Tranche {
  /** Borne haute INCLUSE, en grammes. */
  readonly jusquAGrammes: number;
  /** Prix de la tranche, en centimes TTC. */
  readonly prixCentimes: number;
}

export interface BaremeZone {
  readonly zone: CodeZone;
  /** Libellé affichable, repris du vocabulaire des zones (source unique). */
  readonly libelle: string;
  /** Triées par borne croissante, bornes hautes incluses. Jamais vide. */
  readonly tranches: readonly [Tranche, ...Tranche[]];
  /** Montant de commande à partir duquel le port est offert ; `null` = pas de franco. */
  readonly seuilFrancoCentimes: number | null;
  /** Supplément facturé quand le panier contient au moins un produit frais. */
  readonly supplementIsothermeCentimes: number;
  /** Faux quand la zone refuse les produits sous chaîne du froid. */
  readonly acceptePerissable: boolean;
  /** Délai annoncé au client, en toutes lettres. */
  readonly delaiIndicatif: string;
}

const METROPOLE: BaremeZone = {
  zone: 'metropole',
  libelle: LIBELLE_ZONE.metropole,
  tranches: [
    { jusquAGrammes: 1000, prixCentimes: 490 },
    { jusquAGrammes: 3000, prixCentimes: 690 },
    { jusquAGrammes: 10000, prixCentimes: 950 },
    { jusquAGrammes: 30000, prixCentimes: 1490 },
  ],
  seuilFrancoCentimes: 6900,
  supplementIsothermeCentimes: 600,
  acceptePerissable: true,
  delaiIndicatif: '2 à 3 jours ouvrés',
};

const CORSE: BaremeZone = {
  zone: 'corse',
  libelle: LIBELLE_ZONE.corse,
  tranches: [
    { jusquAGrammes: 1000, prixCentimes: 790 },
    { jusquAGrammes: 3000, prixCentimes: 990 },
    { jusquAGrammes: 10000, prixCentimes: 1250 },
    { jusquAGrammes: 30000, prixCentimes: 1790 },
  ],
  seuilFrancoCentimes: 8900,
  supplementIsothermeCentimes: 600,
  acceptePerissable: false,
  delaiIndicatif: '4 à 6 jours ouvrés',
};

const OUTRE_MER: BaremeZone = {
  zone: 'outre-mer',
  libelle: LIBELLE_ZONE['outre-mer'],
  tranches: [
    { jusquAGrammes: 1000, prixCentimes: 1890 },
    { jusquAGrammes: 3000, prixCentimes: 2690 },
    { jusquAGrammes: 10000, prixCentimes: 3900 },
  ],
  seuilFrancoCentimes: null,
  supplementIsothermeCentimes: 600,
  acceptePerissable: false,
  delaiIndicatif: '6 à 12 jours ouvrés',
};

/** Le barème, indexé par zone. Seule porte d'entrée du moteur. */
export const BAREMES: Record<CodeZone, BaremeZone> = {
  metropole: METROPOLE,
  corse: CORSE,
  'outre-mer': OUTRE_MER,
};
