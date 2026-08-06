/**
 * LA RÉFÉRENCE DE COMMANDE. Une fonction, deux paramètres, aucun état.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi la date ET le hasard sont INJECTÉS
 * ---------------------------------------------------------------------------
 *
 * Ni `new Date()`, ni `Math.random()` dans ce fichier. Les deux entrées non
 * déterministes d'un générateur de référence arrivent en paramètre, et cela
 * change tout pour la vérification : on peut exiger que le 6 août 2026 avec un
 * tirage constant donne exactement `MVB-20260806-2222`, ce qu'aucun test ne
 * peut faire d'une fonction qui lit l'horloge elle-même. L'appelant, lui,
 * passe `new Date()` et `Math.random` — deux mots à l'endroit unique où le
 * hasard entre vraiment dans le système.
 *
 * ---------------------------------------------------------------------------
 * L'ALPHABET, et ce qu'il retire
 * ---------------------------------------------------------------------------
 *
 * Une référence de commande se lit au téléphone, se recopie d'un écran vers un
 * courriel, se dicte à un préparateur. Quatre caractères sont donc pris dans un
 * alphabet privé de ses paires ambiguës : ni `O` ni `0`, ni `I` ni `1`. Il
 * reste trente-deux signes — les chiffres 2 à 9 et vingt-quatre lettres — soit
 * 32⁴ = 1 048 576 combinaisons par jour, ce qui suffit très largement à une
 * boutique et n'est de toute façon PAS un identifiant secret : la référence
 * désigne une commande, elle ne l'autorise pas.
 *
 * ---------------------------------------------------------------------------
 * Le jour est celui de PARIS, pas celui de la machine
 * ---------------------------------------------------------------------------
 *
 * `getFullYear()` rend le jour du fuseau où tourne le code — c'est-à-dire, sur
 * une plateforme d'hébergement, UTC. Une commande passée le 1er janvier à
 * 00 h 30 heure de Paris porterait alors la date du 31 décembre, et le
 * marchand chercherait sa commande la veille de son existence. La date est
 * donc formatée explicitement en `Europe/Paris`, ce qui a l'avantage second
 * d'être déterministe quelle que soit la machine qui exécute les tests.
 */

/** Trente-deux signes : ni O, ni 0, ni I, ni 1. Voir l'en-tête. */
export const ALPHABET_REFERENCE = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Le préfixe de la maison. Il ne varie pas : c'est lui qui rend la référence reconnaissable. */
export const PREFIXE_REFERENCE = 'MVB';

/** Longueur de la partie tirée au sort. */
export const LONGUEUR_SUFFIXE = 4;

/**
 * La forme exacte d'une référence bien construite.
 *
 * Exportée parce qu'elle sert de contrat aux tests ET à toute lecture méfiante
 * d'une référence venue d'une URL : la classe de caractères y est écrite en
 * dur plutôt que dérivée d'`ALPHABET_REFERENCE`, pour qu'une expression
 * régulière fabriquée par concaténation ne puisse pas devenir permissive
 * pendant qu'on ajoute une lettre à l'alphabet.
 */
export const MOTIF_REFERENCE = /^MVB-\d{8}-[2-9A-HJ-NP-Z]{4}$/;

/**
 * Le jour civil français, en `AAAAMMJJ`.
 *
 * `fr-CA` est le raccourci le plus court vers l'ordre `AAAA-MM-JJ` — c'est la
 * convention canadienne francophone, et elle est stable d'une version d'ICU à
 * l'autre. Les tirets sont ensuite retirés.
 */
const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TIRETS = /-/g;

/**
 * Un tirage dans `[0, 1[` ramené à un index d'alphabet.
 *
 * Le bornage n'est pas de la coquetterie : `Math.random()` promet `[0, 1[`,
 * mais `alea` est un PARAMÈTRE — un générateur de test, une source
 * cryptographique mal convertie, une valeur qui déborde. Sans bornage, un
 * tirage à 1 donnerait `charAt(32)`, c'est-à-dire la chaîne vide, et une
 * référence de trois caractères au lieu de quatre. `charAt` est préféré à
 * l'indexation parce qu'il rend toujours une chaîne : aucune branche morte à
 * couvrir pour rassurer le compilateur.
 */
function signe(tirage: number): string {
  const brut = Math.floor(tirage * ALPHABET_REFERENCE.length);
  const index = Math.min(ALPHABET_REFERENCE.length - 1, Math.max(0, brut));

  return ALPHABET_REFERENCE.charAt(index);
}

/**
 * `MVB-AAAAMMJJ-XXXX` — la date de Paris, puis quatre signes tirés au sort.
 *
 * @param date  L'instant de la commande. Seul son jour civil français compte.
 * @param alea  Une source de nombres dans `[0, 1[`. `Math.random` en production.
 */
export function genererReference(date: Date, alea: () => number): string {
  const jour = JOUR_PARIS.format(date).replace(TIRETS, '');

  let suffixe = '';

  for (let rang = 0; rang < LONGUEUR_SUFFIXE; rang += 1) {
    suffixe += signe(alea());
  }

  return `${PREFIXE_REFERENCE}-${jour}-${suffixe}`;
}

/* -------------------------------------------------------------------------- */
/* La lecture d'une référence saisie à la main (tranche C6)                    */
/* -------------------------------------------------------------------------- */

/**
 * La même référence, sans ses tirets ni ses espaces, en capitales.
 *
 * Les tirets sont retirés de la SAISIE et remis à la sortie : ils appartiennent
 * à l'affichage, pas à l'identité. C'est ce qui permet d'accepter les trois
 * formes qu'un client produit réellement — celle qu'il recopie de son écran de
 * confirmation, celle qu'il tape de mémoire sans tirets, celle qu'un
 * correcteur automatique lui a mise en minuscules.
 */
const MOTIF_REFERENCE_COMPACTE = /^MVB\d{8}[2-9A-HJ-NP-Z]{4}$/;

const SEPARATEURS_SAISIS = /[\s-]/g;

/** Longueurs des trois segments : préfixe, jour, suffixe. */
const FIN_PREFIXE = PREFIXE_REFERENCE.length;
const FIN_JOUR = FIN_PREFIXE + 8;

/**
 * Une référence saisie à la main, ramenée à sa forme canonique — ou `null`.
 *
 * Sert à la page de suivi, où le visiteur tape ce qu'il a noté. La tolérance
 * s'arrête exactement là où l'ambiguïté commencerait : on accepte la casse et
 * les séparateurs, on refuse tout le reste. En particulier, on ne « corrige »
 * ni un `O` en `0` ni un `1` en `L` — l'alphabet a précisément été privé de ces
 * paires pour que la question ne se pose jamais (voir l'en-tête), et deviner
 * ici rouvrirait la porte qu'il ferme.
 *
 * La reconstruction se fait par découpage plutôt que par groupes capturés :
 * `slice()` rend toujours une chaîne, là où un groupe d'expression régulière
 * rend `string | undefined` et imposerait une branche que rien ne peut
 * atteindre — donc une branche que la couverture ne pourrait jamais montrer.
 */
export function normaliserReferenceSaisie(saisie: string): string | null {
  const compacte = saisie.replace(SEPARATEURS_SAISIS, '').toUpperCase();

  if (!MOTIF_REFERENCE_COMPACTE.test(compacte)) {
    return null;
  }

  return [
    compacte.slice(0, FIN_PREFIXE),
    compacte.slice(FIN_PREFIXE, FIN_JOUR),
    compacte.slice(FIN_JOUR),
  ].join('-');
}
