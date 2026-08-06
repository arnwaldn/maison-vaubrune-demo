import { typographier } from '@/lib/typographie';
import type { Produit } from '@/lib/types';

/**
 * Droit de rétractation : une seule source de vérité.
 *
 * Ce module est le SEUL endroit du projet où une phrase de rétractation est
 * écrite. Aucune page, aucun gabarit, aucun document légal ne recopie ces
 * mentions à la main : ils appellent `regimeRetractation()`. La raison est
 * moins la factorisation que la sécurité juridique — une mention recopiée dans
 * douze fiches se corrige onze fois sur douze, et c'est la douzième qui se
 * retrouve devant un client.
 *
 * Les trois exceptions retenues sont celles du code de la consommation :
 *
 * - 3° : bien confectionné selon les spécifications du consommateur
 *   (le coffret « Composez le vôtre ») ;
 * - 4° : bien susceptible de se détériorer ou de se périmer rapidement
 *   (le beurre et le fromage) ;
 * - 5° : bien scellé, descellé après la livraison, non renvoyable pour des
 *   raisons de protection de la santé ou d'hygiène (l'infusion).
 *
 * Le 4° est un ajout de la revue des fiches (00-REVUE.md, point 3) : le
 * cadrage initial ne nommait que le 3° et le 5°, et annoncer quatorze jours de
 * rétractation sur deux denrées périssables expédiées sous isotherme aurait
 * été une faute — la première qu'un prospect attentif serait allé vérifier.
 *
 * Ordre de priorité, quand plusieurs motifs coexistent : la personnalisation
 * d'abord, parce qu'elle porte sur la confection même du bien et vaut quel que
 * soit son régime de conservation ; le périssable ensuite ; le scellé enfin.
 * Un coffret personnalisable qui contiendrait un jour du beurre relèverait
 * donc du 3° et resterait, en outre, non expédiable hors métropole.
 */

export type Fondement = 'L221-28-3' | 'L221-28-4' | 'L221-28-5';

export interface RegimeRetractation {
  /** Vrai quand les quatorze jours s'appliquent. */
  readonly ouvreDroit: boolean;
  /** L'exception invoquée, ou `null` quand le droit est ouvert. */
  readonly fondement: Fondement | null;
  /** Phrase affichable, prête à poser dans une page. */
  readonly phrase: string;
}

/**
 * Les quatre phrases françaises du projet.
 *
 * Typographie : elles s'écrivent avec des espaces ordinaires et passent par
 * `typographier()`, qui pose les insécables — rien d'invisible n'est saisi à
 * la main. La garde `verifier-catalogue.mjs` contrôle ces quatre phrases au
 * même titre que la prose du catalogue ; elle a d'ailleurs attrapé cette
 * étourderie-là au premier passage.
 */
const PHRASE_DROIT_OUVERT = typographier(
  'Ce produit ouvre droit à rétractation : vous disposez de quatorze jours à ' +
    'compter de la réception de la commande pour changer d’avis, sans avoir à ' +
    'motiver votre décision (articles L. 221-18 et suivants du code de la ' +
    'consommation).',
);

const PHRASE_PAR_FONDEMENT: Record<Fondement, string> = {
  'L221-28-3': typographier(
    'Ce produit est confectionné selon les spécifications que vous choisissez : ' +
      'nettement personnalisé, il n’ouvre pas droit à rétractation (article ' +
      'L. 221-28, 3° du code de la consommation).',
  ),
  'L221-28-4': typographier(
    'Cette denrée est susceptible de se détériorer ou de se périmer ' +
      'rapidement : elle n’ouvre pas droit à rétractation (article L. 221-28, 4° ' +
      'du code de la consommation).',
  ),
  'L221-28-5': typographier(
    'Ce produit est scellé pour des raisons de protection de la santé ou ' +
      'd’hygiène : une fois descellé après la livraison, il ne peut pas être ' +
      'renvoyé et le droit de rétractation de quatorze jours ne s’y applique plus ' +
      '(article L. 221-28, 5° du code de la consommation). Tant que le scellé est ' +
      'intact, il s’applique normalement.',
  ),
};

/**
 * Le régime applicable à un produit, déduit de ses seules caractéristiques.
 *
 * Le paramètre est réduit aux deux champs qui décident : rien d'autre n'entre
 * dans le raisonnement, et un appelant peut donc l'interroger sans construire
 * un produit complet.
 */
export function regimeRetractation(
  produit: Pick<Produit, 'personnalisable' | 'conservation'>,
): RegimeRetractation {
  if (produit.personnalisable) {
    return regime('L221-28-3');
  }

  if (produit.conservation.type === 'perissable') {
    return regime('L221-28-4');
  }

  if (produit.conservation.type === 'scelle-hygiene') {
    return regime('L221-28-5');
  }

  return { ouvreDroit: true, fondement: null, phrase: PHRASE_DROIT_OUVERT };
}

function regime(fondement: Fondement): RegimeRetractation {
  return { ouvreDroit: false, fondement, phrase: PHRASE_PAR_FONDEMENT[fondement] };
}

/** Toutes les phrases du module, pour les contrôles typographiques. */
export const PHRASES_RETRACTATION: readonly string[] = [
  PHRASE_DROIT_OUVERT,
  ...Object.values(PHRASE_PAR_FONDEMENT),
];
