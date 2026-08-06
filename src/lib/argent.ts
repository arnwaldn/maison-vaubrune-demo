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

/* -------------------------------------------------------------------------- */
/* La saisie d'un prix (tranche C6)                                            */
/* -------------------------------------------------------------------------- */

/**
 * LE CHEMIN INVERSE, celui que l'en-tête de ce fichier déclarait proscrit — et
 * la seule manière de le prendre sans se tromper.
 *
 * L'espace de gestion laisse le marchand saisir un prix en euros, parce que
 * c'est ce qu'un marchand a dans la tête. Il faut donc bien passer de « 12,90 »
 * à 1290. Ce qui est proscrit, c'est de le faire PAR MULTIPLICATION :
 * `Number('12.90') * 100` vaut 1289,9999999999998, et le `Math.round` qu'on
 * ajoute ensuite masque le problème au lieu de le supprimer — il donne le bon
 * résultat sur les cas qu'on essaie, et un centime de moins sur ceux qu'on
 * n'essaie pas.
 *
 * La conversion se fait donc EN TEXTE, sur des entiers, sans jamais construire
 * un flottant :
 *
 *   1. on normalise la saisie (espaces de toute nature et symbole monétaire
 *      retirés, virgule et point acceptés indifféremment) ;
 *   2. on VALIDE la forme avant de lire quoi que ce soit — un à sept chiffres,
 *      éventuellement suivis d'un séparateur et d'une ou deux décimales ;
 *   3. on coupe la chaîne au séparateur et on lit deux entiers, la partie
 *      décimale complétée à deux chiffres à droite («&nbsp;12,9&nbsp;» vaut
 *      12,90 et non 12,09) ;
 *   4. on compose `entier × 100 + décimales`, deux entiers, une addition.
 *
 * Ce qui est REFUSÉ l'est délibérément : trois décimales (un prix au dixième de
 * centime n'existe pas dans ce projet, décision D4), un signe négatif (un prix
 * négatif n'est pas une remise, c'est une faute de saisie), une notation
 * exponentielle, une chaîne vide. Le retour est `null` et non une exception :
 * l'appelant est un champ de formulaire, il affiche une aide et attend.
 *
 * La borne de sept chiffres tient à distance le débordement sans avoir à en
 * parler : 9 999 999,99 € valent 999 999 999 centimes, très en deçà de
 * `Number.MAX_SAFE_INTEGER`.
 */

/** Un à sept chiffres, puis une décimale optionnelle d'un ou deux chiffres. */
const FORME_PRIX_SAISI = /^\d{1,7}(?:[.,]\d{1,2})?$/;

/** Le séparateur décimal, dans ses deux écritures. */
const SEPARATEUR_DECIMAL = /[.,]/;

/** Tout ce qu'on retire d'une saisie avant de la lire : espaces et symbole. */
const BRUIT_DE_SAISIE = /[\p{White_Space}€]/gu;

export function centimesDepuisEuros(saisie: string): number | null {
  const normalise = saisie.replace(BRUIT_DE_SAISIE, '');

  if (!FORME_PRIX_SAISI.test(normalise)) {
    return null;
  }

  const separateur = normalise.search(SEPARATEUR_DECIMAL);
  const entier = separateur === -1 ? normalise : normalise.slice(0, separateur);
  const decimales = separateur === -1 ? '' : normalise.slice(separateur + 1);

  return Number.parseInt(entier, 10) * 100 + Number.parseInt(decimales.padEnd(2, '0'), 10);
}

/**
 * Le prix, tel qu'il se met dans un champ de saisie : « 12,90 », sans symbole
 * ni espace insécable.
 *
 * `formaterEuros()` ne convient pas pour cet usage — elle produit
 * « 12,90 € » avec une insécable, que le navigateur recopierait telle quelle
 * dans le champ et que le marchand devrait effacer avant de taper. La
 * composition se fait ici encore par entiers : quotient et reste, jamais une
 * division à virgule.
 */
export function eurosDepuisCentimes(centimes: number): string {
  if (!Number.isInteger(centimes) || centimes < 0) {
    throw new TypeError(
      `Un prix se compte en centimes entiers positifs ; reçu : ${String(centimes)}`,
    );
  }

  const unites = Math.trunc(centimes / 100);
  const reste = centimes % 100;

  return `${String(unites)},${String(reste).padStart(2, '0')}`;
}
