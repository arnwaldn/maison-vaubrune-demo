import { CATALOGUE } from '@/donnees/catalogue';
import type {
  Commande,
  CoordonneesCommande,
  EntreeJournal,
  EtatCommande,
  TotauxCommande,
} from '@/lib/commandes/etats';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';
import type { LignePanier } from '@/lib/panier/reducteur';
import { calculerTotaux } from '@/lib/panier/totaux';
import type { CodeZone } from '@/lib/types';

/**
 * LE JEU D'ESSAI — six commandes qui se disent jeu d'essai.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi un jeu d'essai, et pourquoi il s'annonce
 * ---------------------------------------------------------------------------
 *
 * Un espace de gestion vide ne démontre rien. Le visiteur qui ouvre
 * `/gestion/commandes` doit y trouver des commandes dans les quatre états, avec
 * leurs journaux, leurs montants et leurs destinations — sinon il lui faudrait
 * passer six commandes lui-même avant de voir à quoi ressemble un tableau de
 * bord.
 *
 * Ces six commandes sont donc fabriquées, et elles le DISENT partout où elles
 * s'affichent : « jeu d'essai du 6 août 2026 ». C'est la différence entre une
 * donnée de démonstration et une donnée inventée qui se fait passer pour vraie.
 * Le projet interdit la seconde (règle du projet, garde
 * `verifier-aucune-donnee-inventee.mjs` en C7) ; la première est légitime à la
 * condition exacte d'être nommée.
 *
 * Les coordonnées suivent la même règle, jusqu'au bout :
 *
 * - le destinataire s'appelle « Client d'essai n° 1 », pas un prénom-nom
 *   plausible qu'on pourrait recopier dans une capture d'écran commerciale ;
 * - l'adresse est « 1, rue de l'Exemple, Ville d'essai » ;
 * - les codes postaux sont structurellement valides — ils DOIVENT l'être, la
 *   zone d'expédition s'en déduit (`zoneDepuisCodePostal`) — mais choisis hors
 *   des plages réellement attribuées : `00000`, `20999`, `97899` ;
 * - les courriels sont en `.invalid`, domaine de premier niveau réservé par la
 *   RFC 2606 précisément pour cet usage : il ne peut appartenir à personne et
 *   ne résoudra jamais.
 *
 * ---------------------------------------------------------------------------
 * DATES ABSOLUES, jamais relatives à aujourd'hui
 * ---------------------------------------------------------------------------
 *
 * Aucun `Date.now()`, aucun « il y a trois jours ». Les horodatages sont écrits
 * en clair, en juillet et août 2026, et ils ne bougeront plus. Deux raisons :
 * une capture d'écran de la démonstration reste lisible dans six mois, et
 * surtout la garde peut vérifier l'ORDRE du journal — ce qu'aucune date
 * calculée à l'exécution ne permettrait de figer.
 *
 * ---------------------------------------------------------------------------
 * LES TOTAUX SONT ÉCRITS, PUIS RECALCULÉS PAR LA GARDE
 * ---------------------------------------------------------------------------
 *
 * Les trois montants de chaque commande sont saisis en dur ci-dessous, et non
 * dérivés à la construction. Ce n'est pas de la duplication, c'est la
 * SÉMANTIQUE du type : `Commande.totaux` porte « les trois montants, figés au
 * moment du paiement » (voir `commandes/etats.ts`). Une commande passée le
 * 18 juillet garde ses montants du 18 juillet, quoi que devienne le catalogue.
 *
 * Un contrôle de `verifier-catalogue.mjs` et un test unitaire refont le calcul
 * avec `calculerTotaux()` et exigent l'égalité au centime près. La garde est
 * donc utile dans les deux sens : elle attrape une faute de frappe ici, et
 * elle signale le jour où un prix du catalogue change sous une commande figée —
 * moment où il faut décider, sciemment, si le jeu d'essai suit ou non.
 *
 * Les LIGNES, elles, sont bien dérivées : `LigneCalculee` embarque l'article
 * projeté entier (nom, format, poids, allergènes, régime de rétractation), et
 * recopier vingt-trois champs six fois n'aurait produit qu'une divergence de
 * plus à surveiller. Ce qui compte — le prix unitaire et le sous-total de
 * ligne — est vérifié par l'égalité des trois montants.
 */

/* -------------------------------------------------------------------------- */
/* L'étiquette, écrite une fois                                                */
/* -------------------------------------------------------------------------- */

/**
 * Le nom du jeu d'essai, tel qu'il s'affiche partout : tableau de bord, liste
 * des commandes, détail, page de suivi. Une seule chaîne, pour qu'aucun écran
 * ne puisse l'oublier ni la reformuler.
 */
export const LIBELLE_JEU_ESSAI = 'jeu d’essai du 6 août 2026';

/* -------------------------------------------------------------------------- */
/* La forme saisie                                                             */
/* -------------------------------------------------------------------------- */

interface AmorceSaisie {
  readonly reference: string;
  readonly lignes: readonly LignePanier[];
  readonly zone: CodeZone;
  readonly coordonnees: CoordonneesCommande;
  readonly etat: EtatCommande;
  /** Une entrée par état atteint, dans l'ordre chronologique. */
  readonly journal: readonly EntreeJournal[];
  /** Figés au paiement. Recalculés et vérifiés par la garde. */
  readonly totaux: TotauxCommande;
  readonly modePaiement: 'test' | 'simule';
}

function clientDEssai(numero: number, codePostal: string): CoordonneesCommande {
  return {
    prenomNom: `Client d’essai n° ${String(numero)}`,
    adresse: '1, rue de l’Exemple, Ville d’essai',
    codePostal,
    courriel: `client-essai-${String(numero)}@exemple.invalid`,
  };
}

/* -------------------------------------------------------------------------- */
/* Les six commandes                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Six commandes, quatre états, trois zones, les deux modes de paiement.
 *
 * La répartition n'est pas décorative — chacune existe pour montrer un cas que
 * les autres ne montrent pas :
 *
 *   1. expédiée   · métropole  · parcours complet, trois horodatages
 *   2. annulée    · Corse      · annulation depuis l'état payée
 *   3. expédiée   · métropole  · franco de port atteint ET coffret composé
 *   4. préparée   · métropole  · produits frais, donc supplément isotherme
 *   5. préparée   · outre-mer  · zone sans franco, tarif le plus élevé
 *   6. payée      · métropole  · la seule qui attende encore un geste du marchand
 */
const AMORCES: readonly AmorceSaisie[] = [
  {
    reference: 'MVB-20260718-7F2B',
    lignes: [
      { sku: 'MV-HV-OLI-25CL', quantite: 2 },
      { sku: 'MV-MC-CHA-500G', quantite: 1 },
      { sku: 'MV-CS-OIG-220G', quantite: 1 },
    ],
    zone: 'metropole',
    coordonnees: clientDEssai(1, '00000'),
    etat: 'expediee',
    journal: [
      { etat: 'payee', horodatage: '2026-07-18T09:12:00.000Z' },
      { etat: 'preparee', horodatage: '2026-07-19T08:05:00.000Z' },
      { etat: 'expediee', horodatage: '2026-07-20T07:40:00.000Z' },
    ],
    totaux: { sousTotal: 5220, port: 690, total: 5910 },
    modePaiement: 'simule',
  },
  {
    reference: 'MVB-20260722-4D48',
    lignes: [{ sku: 'MV-CO-DIM-4P', quantite: 1 }],
    zone: 'corse',
    coordonnees: clientDEssai(2, '20999'),
    etat: 'annulee',
    journal: [
      { etat: 'payee', horodatage: '2026-07-22T14:31:00.000Z' },
      { etat: 'annulee', horodatage: '2026-07-23T09:15:00.000Z' },
    ],
    totaux: { sousTotal: 4600, port: 990, total: 5590 },
    modePaiement: 'simule',
  },
  {
    reference: 'MVB-20260727-9A56',
    lignes: [
      {
        sku: 'MV-CO-LIB-3P',
        quantite: 1,
        composition: ['MV-HV-OLI-25CL', 'MV-MC-BRU-250G', 'MV-CS-RIL-180G'],
      },
      { sku: 'MV-HV-NOI-50CL', quantite: 1 },
      { sku: 'MV-MC-ABR-370G', quantite: 1 },
    ],
    zone: 'metropole',
    coordonnees: clientDEssai(3, '00000'),
    etat: 'expediee',
    journal: [
      { etat: 'payee', horodatage: '2026-07-27T18:02:00.000Z' },
      { etat: 'preparee', horodatage: '2026-07-28T09:20:00.000Z' },
      { etat: 'expediee', horodatage: '2026-07-29T08:15:00.000Z' },
    ],
    totaux: { sousTotal: 7190, port: 0, total: 7190 },
    modePaiement: 'test',
  },
  {
    reference: 'MVB-20260803-3E77',
    lignes: [
      { sku: 'MV-FR-BEU-250G', quantite: 1 },
      { sku: 'MV-FR-BRE-250G', quantite: 1 },
      { sku: 'MV-ES-LEN-500G', quantite: 1 },
    ],
    zone: 'metropole',
    coordonnees: clientDEssai(4, '00000'),
    etat: 'preparee',
    journal: [
      { etat: 'payee', horodatage: '2026-08-03T11:46:00.000Z' },
      { etat: 'preparee', horodatage: '2026-08-04T08:30:00.000Z' },
    ],
    totaux: { sousTotal: 2490, port: 1290, total: 3780 },
    modePaiement: 'simule',
  },
  {
    reference: 'MVB-20260804-K2P9',
    lignes: [
      { sku: 'MV-HV-VIN-50CL', quantite: 1 },
      { sku: 'MV-IN-SOI-60G', quantite: 1 },
      { sku: 'MV-ES-LEN-500G', quantite: 2 },
    ],
    zone: 'outre-mer',
    coordonnees: clientDEssai(5, '97899'),
    etat: 'preparee',
    journal: [
      { etat: 'payee', horodatage: '2026-08-04T16:08:00.000Z' },
      { etat: 'preparee', horodatage: '2026-08-05T09:05:00.000Z' },
    ],
    totaux: { sousTotal: 2920, port: 2690, total: 5610 },
    modePaiement: 'simule',
  },
  {
    reference: 'MVB-20260805-B62T',
    lignes: [
      { sku: 'MV-CS-TER-350G', quantite: 1 },
      { sku: 'MV-CS-RIL-180G', quantite: 1 },
      { sku: 'MV-MC-ABR-230G', quantite: 1 },
    ],
    zone: 'metropole',
    coordonnees: clientDEssai(6, '00000'),
    etat: 'payee',
    journal: [{ etat: 'payee', horodatage: '2026-08-05T19:23:00.000Z' }],
    totaux: { sousTotal: 3480, port: 690, total: 4170 },
    modePaiement: 'test',
  },
];

/* -------------------------------------------------------------------------- */
/* Construction                                                                */
/* -------------------------------------------------------------------------- */

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

/**
 * Une commande complète, à partir de sa forme saisie.
 *
 * Les lignes passent par `calculerTotaux()` — la même fonction que le panier et
 * le récapitulatif, jamais une seconde — et seules les LIGNES en sont retenues.
 * Les trois montants viennent de la saisie, parce qu'ils sont figés (voir
 * l'en-tête).
 */
function construire(amorce: AmorceSaisie): Commande {
  const { lignes } = calculerTotaux(amorce.lignes, CATALOGUE_PANIER, amorce.zone);

  return {
    reference: amorce.reference,
    lignes,
    zone: amorce.zone,
    totaux: amorce.totaux,
    coordonnees: amorce.coordonnees,
    etat: amorce.etat,
    journal: amorce.journal,
    modePaiement: amorce.modePaiement,
  };
}

/**
 * Les six commandes du jeu d'essai, prêtes à fusionner avec celles du visiteur.
 *
 * Elles sont IMMUABLES : l'espace de gestion qui fait avancer l'une d'elles
 * écrit une COPIE dans le stockage local du navigateur et ne touche jamais à ce
 * tableau (voir `commandes/depot-local.ts`, section « copie à l'écriture »).
 * C'est ce qui permet à « Réinitialiser le jeu d'essai » de rendre l'état
 * d'origine sans avoir à le reconstruire.
 */
export const COMMANDES_AMORCE: readonly Commande[] = AMORCES.map(construire);

/**
 * Les références du jeu d'essai, dans l'ordre du tableau. La page de suivi les
 * affiche pour que le visiteur ait quelque chose à taper immédiatement, et
 * `generateStaticParams` s'en sert pour préengendrer les six pages de détail.
 */
export const REFERENCES_AMORCE: readonly string[] = AMORCES.map(
  (amorce) => amorce.reference,
);
