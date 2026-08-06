/**
 * Typographie française : les espaces insécables, posées par une règle.
 *
 * Le problème que ce module règle. Une espace insécable (U+00A0) écrite en
 * littéral dans un fichier source est invisible à la relecture, indiscernable
 * d'une espace ordinaire dans un diff, et se perd au premier copier-coller. La
 * tranche C1 avait déjà tranché pour le JSX : on y écrit l'entité `&nbsp;`,
 * jamais le caractère. Restait le cas des données — les fiches produits, les
 * mentions légales — qui ne passent par aucun JSX et où l'entité n'a pas cours.
 *
 * La réponse retenue : les textes du projet s'écrivent avec des espaces
 * ordinaires, et ce module pose les insécables d'après les règles de la
 * typographie française. Aucun caractère invisible n'est donc écrit à la main
 * nulle part dans `src/`. La transformation est déterministe, elle se relit en
 * dix lignes, et la garde `verifier-catalogue.mjs` vérifie son résultat.
 *
 * Les quatre règles, dans l'ordre d'application :
 *
 * 1. Guillemets français : une insécable après l'ouvrant, une avant le
 *    fermant. « La table du dimanche »
 * 2. Séparateur de milliers : 1 850 g, 2 200 g.
 * 3. Nombre suivi d'un symbole d'unité : 25 cl, 180 g, 100 %, 46,00 €, 4 °C.
 *    Les unités écrites en toutes lettres — « 4 pièces », « 18 mois » — ne
 *    sont PAS concernées : elles se coupent en fin de ligne sans dommage, et
 *    le rédacteur des fiches ne les a pas liées non plus.
 * 4. Ponctuation double : deux-points, point-virgule, point d'exclamation,
 *    point d'interrogation.
 *
 * Ce jeu de règles n'a pas été deviné : il a été calé sur les quinze fiches du
 * rédacteur, en vérifiant que la version ordinaire de chaque paragraphe,
 * repassée dans cette fonction, redonne le paragraphe original au caractère
 * près. C'est cette égalité qui autorise à recopier la prose sans ses
 * caractères invisibles.
 */

/** U+00A0, écrite par son point de code : rien d'invisible dans ce fichier. */
const INSECABLE = String.fromCodePoint(0x00a0);

/**
 * Symboles d'unité que le projet lie au nombre qui les précède. La liste est
 * fermée volontairement : lier « 4 pièces » ou « 18 mois » n'apporte rien et
 * produirait des lignes plus difficiles à justifier.
 */
const SYMBOLES_UNITE = ['cl', 'l', 'L', 'ml', 'g', 'kg', 'mg', '%', '€', '°C'];

const GUILLEMET_OUVRANT = /«[ ]/g;
const GUILLEMET_FERMANT = /[ ]»/g;
const MILLIERS = /(\d)[ ](?=\d{3}(?!\d))/g;
const NOMBRE_ET_UNITE = new RegExp(
  `(\\d)[ ](?=(?:${SYMBOLES_UNITE.map(echapper).join('|')})(?![\\p{L}\\d]))`,
  'gu',
);
const PONCTUATION_DOUBLE = /[ ](?=[:;!?])/g;

function echapper(motif: string): string {
  return motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pose les espaces insécables dans un texte écrit avec des espaces ordinaires.
 * Idempotente : appliquée deux fois, elle donne le même résultat.
 */
export function typographier(texte: string): string {
  return texte
    .replace(GUILLEMET_OUVRANT, `«${INSECABLE}`)
    .replace(GUILLEMET_FERMANT, `${INSECABLE}»`)
    .replace(MILLIERS, `$1${INSECABLE}`)
    .replace(NOMBRE_ET_UNITE, `$1${INSECABLE}`)
    .replace(PONCTUATION_DOUBLE, INSECABLE);
}
