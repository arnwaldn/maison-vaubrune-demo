import type { CodeZone } from '@/lib/types';

/**
 * Du code postal à la zone d'expédition.
 *
 * Une seule fonction, et beaucoup de précautions — parce que c'est le genre de
 * conversion qu'on croit écrire en une ligne et qui se casse sur les cas
 * réels. Les pièges, dans l'ordre où ils se présentent :
 *
 * 1. LA SAISIE EST SALE. Un client tape « 75011 », « 75 011 » ou colle
 *    « 75011 » avec une espace de part et d'autre. Les espaces de bordure sont
 *    donc retirées avant tout examen ; celles du milieu, en revanche, sont
 *    rédhibitoires — « 75 011 » n'est pas un code postal, c'est une saisie à
 *    corriger, et prétendre le comprendre serait deviner à la place du client.
 *
 * 2. « 2A » ET « 2B » N'EXISTENT PAS EN CODE POSTAL. C'est l'erreur que fait
 *    presque tout le monde : la Corse-du-Sud et la Haute-Corse s'écrivent 2A
 *    et 2B en numéro de DÉPARTEMENT, mais leurs codes postaux sont numériques
 *    et commencent tous par 20 — 20000 Ajaccio, 20200 Bastia, 20620 Biguglia.
 *    Une expression régulière qui accepterait des lettres pour « couvrir la
 *    Corse » ouvrirait la porte à n'importe quelle chaîne.
 *
 * 3. LA CHAÎNE VIDE N'EST PAS UN CODE POSTAL. Elle vaut `null`, comme tout ce
 *    qui n'a pas exactement cinq chiffres. Le type de retour dit `CodeZone |
 *    null` précisément pour que l'appelant traite le cas au lieu de recevoir
 *    une zone par défaut qui aurait l'air d'une réponse.
 *
 * 4. LES CHIFFRES SONT ASCII. `\d` sans le drapeau Unicode ne reconnaît que
 *    0-9 : des chiffres arabo-indiens collés depuis un traitement de texte
 *    sont rejetés, ce qui est le comportement voulu.
 *
 * ---------------------------------------------------------------------------
 * Limite assumée de la démonstration
 * ---------------------------------------------------------------------------
 *
 * Les préfixes 971 à 978 couvrent la Guadeloupe, la Martinique, la Guyane, La
 * Réunion, Saint-Pierre-et-Miquelon, Mayotte, Saint-Barthélemy et
 * Saint-Martin. Les collectivités du Pacifique (988xx Nouvelle-Calédonie,
 * 987xx Polynésie française, 986xx Wallis-et-Futuna) et Monaco (980xx) NE
 * SONT PAS distinguées : elles retombent sur « métropole » par la règle
 * générale. Ce n'est pas une bonne règle commerciale, c'est le périmètre
 * arrêté pour la démonstration (décision D9, trois zones). Une boutique
 * livrée ajouterait ces préfixes ici, en une ligne, et le moteur n'aurait rien
 * à apprendre : c'est tout l'intérêt d'avoir isolé la conversion.
 */

/** Exactement cinq chiffres ASCII, rien d'autre. */
const FORME_CODE_POSTAL = /^\d{5}$/;

/** Les codes postaux corses commencent tous par 20 (voir le piège 2 ci-dessus). */
const PREFIXE_CORSE = '20';

/** Départements et collectivités d'outre-mer couverts par la démonstration. */
const PREFIXES_OUTRE_MER = [
  '971',
  '972',
  '973',
  '974',
  '975',
  '976',
  '977',
  '978',
] as const;

/**
 * La zone d'expédition d'un code postal, ou `null` si la saisie n'en est pas un.
 */
export function zoneDepuisCodePostal(codePostal: string): CodeZone | null {
  const normalise = codePostal.trim();

  if (!FORME_CODE_POSTAL.test(normalise)) {
    return null;
  }

  if (normalise.startsWith(PREFIXE_CORSE)) {
    return 'corse';
  }

  if (PREFIXES_OUTRE_MER.some((prefixe) => normalise.startsWith(prefixe))) {
    return 'outre-mer';
  }

  return 'metropole';
}
