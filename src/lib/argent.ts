/**
 * Affichage des prix.
 *
 * Règle du projet (décision D4) : un prix est un entier de centimes TTC. Il
 * n'est jamais stocké en euros, jamais obtenu par multiplication flottante,
 * jamais écrit en dur dans une page. Cette fonction est le seul endroit du
 * code qui transforme des centimes en texte affichable.
 *
 * Sur le flottant : la division par 100 est la seule opération à virgule du
 * projet, et elle ne sert qu'à l'affichage. `Intl` arrondit ensuite à deux
 * décimales, si bien que 1290 donne « 12,90 € » sans dérive possible. Ce qui
 * est proscrit, c'est le chemin inverse — obtenir 1290 depuis 12.90, qui vaut
 * 1289,999… en JavaScript et qu'un `Math.round` masquerait sans le corriger.
 * Le garde-fou est ici : un prix non entier est une erreur, pas un arrondi.
 *
 * Sur les espaces : `Intl` en français produit une espace fine insécable
 * (U+202F) devant le symbole monétaire et, selon la version d'ICU, une espace
 * insécable ou fine comme séparateur de milliers. Le projet n'admet qu'une
 * seule forme d'espace insécable, U+00A0, pour que les contrôles typographiques
 * n'aient qu'un caractère à chercher. Toutes les espaces produites par `Intl`
 * sont donc normalisées.
 *
 * Aucun caractère invisible n'est écrit en littéral dans ce fichier : ni la
 * classe de caractères ni le remplacement. Une espace insécable posée telle
 * quelle dans un source est illisible à la relecture et disparaît au premier
 * copier-coller — c'est la même raison qui fait écrire `&nbsp;` dans le JSX.
 */

const FORMAT_EUROS = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** U+00A0, écrite par son point de code plutôt qu'en littéral. */
const INSECABLE = String.fromCodePoint(0x00a0);

/** Toute espace, ordinaire ou fine, insécable ou non. */
const TOUTE_ESPACE = /\p{White_Space}/gu;

export function formaterEuros(centimes: number): string {
  if (!Number.isInteger(centimes)) {
    throw new TypeError(
      `Un prix se compte en centimes entiers ; reçu : ${String(centimes)}`,
    );
  }

  return FORMAT_EUROS.format(centimes / 100).replace(TOUTE_ESPACE, INSECABLE);
}
