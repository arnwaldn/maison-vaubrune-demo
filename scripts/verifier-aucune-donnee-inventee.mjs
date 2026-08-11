/**
 * Garde d'honnêteté — `npm run verifier-donnees`
 *
 * ===========================================================================
 * CE QUE CETTE GARDE PROTÈGE
 * ===========================================================================
 *
 * La promesse la plus engageante de cette démonstration n'est pas technique :
 * c'est « aucune donnée d'entreprise ou personnelle n'a été inventée ». Elle
 * est écrite dans les mentions légales, dans le pied de page, sur la page
 * « À propos », et un prospect attentif ira la vérifier — c'est même
 * exactement le genre de promesse qu'on vérifie. Une promesse de ce type ne
 * peut pas reposer sur la discipline : elle repose sur un contrôle qui échoue.
 *
 * Deux façons de la trahir, deux contrôles :
 *
 * (a) BOUCHER UN TROU. Un jour, quelqu'un trouve qu'un gabarit « fait vide »
 *     et remplace un emplacement par une valeur plausible. Le symptôme
 *     mesurable : une page légale qui ne contient plus AUCUN `<AComplete>`.
 *     Le contrôle (a) l'attrape.
 *
 * (b) LAISSER FUIR UNE DONNÉE RÉELLE. Un SIREN copié d'un vrai Kbis pour
 *     « tester l'affichage », un numéro de téléphone dans un commentaire, un
 *     IBAN dans un fichier d'exemple. Le contrôle (b) parcourt le dépôt à la
 *     recherche des formes que prennent ces données.
 *
 * ===========================================================================
 * CE QU'ELLE NE FAIT PAS, ET POURQUOI
 * ===========================================================================
 *
 * Elle ne cherche pas à dire si un identifiant est VALIDE (clé de Luhn d'un
 * SIREN, clé de contrôle d'un IBAN). Le but n'est pas d'attraper une fraude,
 * c'est d'attraper une négligence : un numéro faux mais de la bonne FORME est
 * tout aussi indésirable ici, parce qu'il a toutes les chances d'être recopié
 * dans un vrai site par un marchand pressé. On cherche donc la forme.
 *
 * Elle ne lit pas `tests/`. C'est délibéré et c'est écrit ici pour qu'on ne
 * l'oublie pas : `tests/fixtures/donnees-inventees/` contient, par
 * construction, un faux SIREN, un faux téléphone et un faux IBAN — ce sont
 * les pièces qui prouvent que cette garde échoue quand elle doit échouer. Les
 * scanner reviendrait à écrire une garde qui se déclenche sur son propre
 * banc d'essai.
 *
 * ===========================================================================
 * COMMENT ON EXEMPTE, ET COMMENT ON NE PEUT PAS EXEMPTER SILENCIEUSEMENT
 * ===========================================================================
 *
 * Trois mécanismes, du plus étroit au plus large, tous VISIBLES dans le
 * rapport final :
 *
 * 1. Les MOTIFS eux-mêmes ignorent ce qui n'est pas une donnée réelle : un
 *    horodatage ISO n'a jamais neuf chiffres d'affilée, un prix en centimes
 *    non plus, et un code postal SEUL (cinq chiffres) n'est reconnu par aucun
 *    motif — `src/lib/zones.ts` en manipule par construction, et il n'avait
 *    pas à être exempté pour autant.
 *
 * 2. Les ZONES DE TEXTE RÉGLEMENTAIRE. Le rédacteur juridique a signalé le
 *    risque (00-NOTES-INTEGRATION.md, § 5.7) : l'encadré de l'article
 *    D. 211-2 contient « 300 000 euros » et « 10 % », et les documents citent
 *    des lois par leur numéro. Il proposait deux voies — une liste
 *    d'exceptions, ou un contrôle qui ignore les blocs marqués comme texte
 *    réglementaire — et jugeait la seconde plus sûre « parce qu'elle ne se
 *    périme pas à chaque nouvelle citation ». C'est celle-ci. Un bloc encadré
 *    par `texte-reglementaire:debut` / `texte-reglementaire:fin` est retiré
 *    du texte avant analyse, en commentaire de code comme en commentaire
 *    HTML. Les balises non refermées sont une ANOMALIE : on ne neutralise pas
 *    la fin d'un fichier par accident.
 *
 * 3. La LISTE BLANCHE de fichiers, ci-dessous, courte et commentée un par un.
 *    Elle ne dispense d'AUCUN contrôle en bloc : chaque entrée nomme les
 *    motifs qu'elle neutralise, et le jeu d'essai des commandes doit en outre
 *    PROUVER qu'il est un jeu d'essai (ses marqueurs) pour y avoir droit.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/* -------------------------------------------------------------------------- */
/* Périmètre                                                                   */
/* -------------------------------------------------------------------------- */

/** Les racines parcourues. `tests/` en est absent — voir l'en-tête. */
const RACINES = ['src', 'contenu', 'public'];

/**
 * Extensions lues COMME DU TEXTE. Tout le reste est ignoré.
 *
 * C'est une liste blanche, et elle le reste : un format inconnu n'est jamais
 * décodé en UTF-8 par défaut. Un binaire passé au décodeur de texte rendrait
 * une suite de caractères de remplacement dans laquelle les motifs de cette
 * garde — un groupe de neuf chiffres, un numéro à dix chiffres — pourraient
 * autant se former par hasard que disparaître. Le contrôle aurait l'air d'avoir
 * eu lieu ; c'est pire que de ne pas avoir eu lieu.
 */
const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.mjs',
  '.js',
  '.jsx',
  '.css',
  '.md',
  '.txt',
  '.json',
  '.svg',
  '.html',
];

/**
 * Extensions BINAIRES, écrites en toutes lettres (tranche C11).
 *
 * Elles ne sont pas lues, et la liste blanche ci-dessus y suffisait déjà. Elle
 * est écrite pour deux raisons qui ne relèvent pas du filtrage :
 *
 * - le NOM d'un binaire reste analysé, lui (un « kbis-812345678.pdf » se
 *   trahit par son nom) : cette liste dit lesquels le dépôt s'autorise à
 *   porter, depuis que la décision D35 y fait entrer des images ;
 * - le contenu de ces fichiers-là est sous la garde d'un AUTRE contrôle —
 *   celui des métadonnées, dans `verifier-marques-reelles.mjs`. Écrire ici
 *   qu'ils sont binaires, c'est écrire qu'ils ne sont pas oubliés, seulement
 *   gardés ailleurs.
 */
const EXTENSIONS_BINAIRES = [
  '.jpg',
  '.jpeg',
  '.png',
  '.avif',
  '.webp',
  '.woff2',
  '.mp4',
];

/**
 * Les cinq pages légales de la tranche C7, avec l'exigence d'emplacement.
 *
 * Quatre d'entre elles sont des GABARITS : elles décrivent un marchand qu'on
 * ne connaît pas, elles ne peuvent donc pas être complètes, et une page de ce
 * lot qui ne contiendrait plus un seul `<AComplete>` serait une page dont
 * quelqu'un a bouché les trous.
 *
 * La cinquième, « À propos de cette démonstration », en est DISPENSÉE et c'est
 * un fait, pas une facilité : elle ne décrit pas le marchand, elle décrit le
 * site. Son brouillon le dit dans son en-tête (« famille-jetons : aucun jeton
 * dans cette page ») et ses notes d'intégration le répètent. Lui imposer un
 * emplacement reviendrait à inventer un manque pour satisfaire une règle —
 * l'exact contraire de ce que cette garde protège. Son décompte est tout de
 * même relevé et affiché : si des emplacements y apparaissaient un jour, on le
 * verrait dans le rapport plutôt que de le découvrir en relisant la page.
 */
const PAGES_LEGALES = [
  { chemin: 'src/app/mentions-legales/page.tsx', exigeEmplacement: true },
  {
    chemin: 'src/app/conditions-generales-de-vente/page.tsx',
    exigeEmplacement: true,
  },
  { chemin: 'src/app/donnees-personnelles/page.tsx', exigeEmplacement: true },
  { chemin: 'src/app/retractation/page.tsx', exigeEmplacement: true },
  {
    chemin: 'src/app/a-propos-de-cette-demonstration/page.tsx',
    exigeEmplacement: false,
    motifDispense:
      'page descriptive du site et non gabarit du marchand — aucun jeton dans son brouillon',
  },
];

/** Le formulaire téléchargeable, et la marque qui prouve qu'il est resté un gabarit. */
const FORMULAIRE = 'public/formulaire-retractation.txt';
const MARQUEUR_FORMULAIRE = '[À COMPLÉTER';

/* -------------------------------------------------------------------------- */
/* Les motifs de donnée réelle                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Chaque motif porte son intitulé, son expression et une NOTE qui dit ce qu'il
 * ne prend PAS — c'est cette note qui permet de relire la garde sans la
 * réécrire.
 *
 * Note commune sur les espaces : les expressions acceptent l'espace ordinaire
 * ET l'insécable (U+00A0). Le dépôt n'écrit jamais d'insécable à la main
 * (décision D11), mais un identifiant collé depuis un document en contient
 * souvent une — et c'est précisément le collé-depuis-ailleurs qu'on cherche.
 */
const ESPACE = '[ \\u00a0]';

/**
 * UN IDENTIFIANT N'A PAS D'UNITÉ.
 *
 * C'est la seule règle qui distingue « 999 999 999 » suivi de « centimes »
 * — une borne de débordement expliquée dans un commentaire de `argent.ts`, et
 * elle y était avant cette garde — d'un numéro SIREN. La distinction n'est pas
 * une commodité pour faire passer un fichier : elle est vraie, et elle vaut
 * pour tous les nombres à venir. La garde ne doit pas obliger à réécrire une
 * phrase juste pour ne pas la déclencher, sinon c'est la phrase qui perd.
 */
const UNITES =
  'centimes?|euros?|€|grammes?|kg|g|mg|cl|ml|l|%|octets?|o|Ko|Mo|Go|jours?|mois|ans?';
const PAS_UNE_QUANTITE = `(?!${ESPACE}?(?:${UNITES})(?![\\p{L}\\d]))`;

/**
 * UN IDENTIFIANT N'EST PAS UN MORCEAU DE HACHAGE.
 *
 * Règle sœur de la précédente, ajoutée en C14 par un ÉCHEC RÉEL de la garde et
 * non par prudence : `public/produits/manifeste-livre.json` porte des empreintes
 * SHA-256, et dix-neuf d'entre elles contiennent, quelque part dans leurs
 * soixante-quatre caractères, une suite de neuf chiffres bornée par des lettres
 * hexadécimales. La garde y voyait dix-neuf SIREN.
 *
 * La correction ne pouvait pas être une exemption de fichier : la décision D30
 * dit que cette garde n'exempte pas des FICHIERS mais des PREUVES, sans quoi la
 * liste d'exceptions s'allonge jusqu'à ne plus rien garder. Elle est donc une
 * règle sur le CONTEXTE, exactement comme l'unité : neuf chiffres pris à
 * l'intérieur d'une suite hexadécimale ne sont pas un identifiant, parce qu'un
 * SIREN écrit par un humain n'est jamais collé à une lettre a-f.
 *
 * Ce qu'elle ne relâche PAS : un SIREN précédé ou suivi d'une espace, d'une
 * ponctuation, d'un guillemet, d'un deux-points ou d'un retour à la ligne — donc
 * toutes les façons dont un identifiant réel arrive dans un fichier — reste
 * attrapé. Trois cas de test le fixent.
 *
 * ---------------------------------------------------------------------------
 * RESSERRÉE AU ROUND 1 : UN CARACTÈRE NE FAIT PAS UN HACHAGE
 * ---------------------------------------------------------------------------
 *
 * La première rédaction regardait UN SEUL caractère de chaque côté :
 * `(?<![\da-fA-F])\d{9}(?![\da-fA-F])`. Elle éteignait donc le motif dès qu'une
 * lettre a-f touchait les neuf chiffres — et il y a des façons parfaitement
 * banales d'écrire un vrai identifiant à côté d'une de ces six lettres :
 * `ref552100554`, `siren=552100554e`, une clef d'objet, un nom de fichier. La
 * garde se taisait alors sur la donnée exacte qu'elle existe pour trouver.
 *
 * Le critère porte désormais sur le JETON ENTIER : on étend l'occurrence à
 * gauche et à droite tant que les caractères sont hexadécimaux, et on n'écarte
 * le motif que si le jeton obtenu a la taille et la forme d'un hachage — au
 * moins douze caractères, ET au moins une lettre a-f. Douze parce que c'est la
 * plus courte abréviation d'empreinte que ce dépôt écrive (les messages du
 * pipeline d'images tronquent à douze) ; une lettre parce qu'une suite de
 * chiffres seuls n'est pas un hachage, c'est un nombre — et un nombre de
 * treize chiffres est déjà traité par le motif SIRET.
 */
const LONGUEUR_MINIMALE_HACHAGE = 12;

/** Le jeton hexadécimal MAXIMAL qui contient l'intervalle donné. */
function jetonHexadecimal(texte, debut, fin) {
  const estHexadecimal = (caractere) =>
    caractere !== undefined && /[\da-fA-F]/u.test(caractere);

  let gauche = debut;
  while (gauche > 0 && estHexadecimal(texte[gauche - 1])) gauche -= 1;

  let droite = fin;
  while (droite < texte.length && estHexadecimal(texte[droite])) droite += 1;

  return texte.slice(gauche, droite);
}

/** `true` si l'occurrence est un morceau d'empreinte, et non un identifiant. */
function prisDansUnHachage(texte, occurrence) {
  const jeton = jetonHexadecimal(
    texte,
    occurrence.index ?? 0,
    (occurrence.index ?? 0) + occurrence[0].length,
  );

  return jeton.length >= LONGUEUR_MINIMALE_HACHAGE && /[a-fA-F]/u.test(jeton);
}

const MOTIFS = [
  {
    intitule: 'SIREN (neuf chiffres en groupe isolé)',
    /* Les deux écritures d'un SIREN : d'affilée, ou en trois groupes de trois.
       Un horodatage ISO n'aligne jamais neuf chiffres (ses groupes font deux ou
       quatre), un prix en centimes non plus, et « 300 000 euros » ne fait que
       DEUX groupes de trois — l'encadré de l'article D. 211-2 passe donc sans
       avoir besoin d'être exempté. */
    expression: new RegExp(
      `(?<!\\d)\\d{9}(?!\\d)${PAS_UNE_QUANTITE}` +
        `|(?<!\\d)\\d{3}${ESPACE}\\d{3}${ESPACE}\\d{3}(?!${ESPACE}?\\d)${PAS_UNE_QUANTITE}`,
      'gu',
    ),
    /* Le contexte se juge sur le JETON ENTIER, pas sur le caractère voisin —
       voir l'en-tête de `prisDansUnHachage`. Une expression régulière ne sait
       pas remonter une suite de longueur inconnue ; une fonction, si. */
    ecarter: prisDansUnHachage,
  },
  {
    intitule: 'SIRET (quatorze chiffres)',
    expression: new RegExp(
      `(?<!\\d)\\d{14}(?!\\d)|(?<!\\d)\\d{3}${ESPACE}\\d{3}${ESPACE}\\d{3}${ESPACE}\\d{5}(?!\\d)`,
      'gu',
    ),
    /* MÊME RÈGLE, ET C'EST LE ROUND 1 QUI L'A EXIGÉE. Le SIREN avait sa parade
       depuis la livraison ; le SIRET n'en avait aucune, et le premier relevé
       d'images produit après le round 1 a aligné deux suites de quatorze
       chiffres au milieu de deux empreintes. La garde a échoué pour de vrai,
       une seconde fois, sur la même cause — la parade appartenait donc au
       CONTEXTE et non à un motif. */
    ecarter: prisDansUnHachage,
  },
  {
    intitule: 'TVA intracommunautaire française (FR + onze chiffres)',
    /* La clé est faite de deux caractères alphanumériques, le SIREN des neuf
       chiffres qui suivent. */
    expression: new RegExp(`\\bFR${ESPACE}?[0-9A-Z]{2}${ESPACE}?\\d{9}\\b`, 'gu'),
  },
  {
    intitule: 'IBAN français (FR + clé + vingt-trois caractères)',
    expression: new RegExp(
      `\\bFR\\d{2}(?:${ESPACE}?[0-9A-Z]{4}){5}${ESPACE}?[0-9A-Z]{3}\\b`,
      'gu',
    ),
  },
  {
    intitule: 'Numéro de téléphone français (dix chiffres, séparé ou non)',
    /* `0` suivi d'un chiffre non nul, puis quatre paires. Les deux-points ne
       sont PAS un séparateur accepté : sans cela, « 09:12:00 » dans un
       horodatage aurait la forme d'un numéro. Le tiret l'est, parce que c'est
       une écriture courante — d'où l'importance du garde-fou de longueur, qui
       évite qu'une date « 2026-08-06 » soit lue comme un début de numéro. */
    expression: new RegExp(`(?<!\\d)0[1-9](?:[ .\\u00a0-]?\\d{2}){4}(?!\\d)`, 'gu'),
    /* Dix chiffres d'affilée tiennent aussi dans une empreinte : même parade,
       posée avant qu'un relevé ne la réclame. */
    ecarter: prisDansUnHachage,
  },
];

/**
 * L'adresse postale : deux indices, pas un.
 *
 * Un numéro suivi d'un type de voie ne suffit pas — « 6 place » peut être une
 * coïncidence, et « chemin » est un mot de code fréquent. On exige donc, à
 * proximité, un code postal à cinq chiffres. C'est ce qui permet de laisser
 * passer les codes postaux SEULS (`src/lib/zones.ts` en manipule par
 * construction, la démonstration en affiche) tout en attrapant l'adresse
 * complète, qui est la donnée réellement sensible.
 */
const TYPES_DE_VOIE =
  'rue|avenue|boulevard|impasse|all[ée]e|chemin|route|place|quai|cours|square|sentier|villa|passage|faubourg|lotissement|résidence';

const DEBUT_ADRESSE = new RegExp(
  `(?<!\\d)\\d{1,4}${ESPACE}*(?:bis|ter|quater)?${ESPACE}*,?${ESPACE}+(?:${TYPES_DE_VOIE})\\b`,
  'giu',
);

const CODE_POSTAL = /(?<!\d)\d{5}(?!\d)/u;

/** Fenêtre de voisinage, en caractères, entre la voie et le code postal. */
const VOISINAGE = 200;

/* -------------------------------------------------------------------------- */
/* La liste blanche — explicite, justifiée, et vérifiée                        */
/* -------------------------------------------------------------------------- */

/**
 * Le jeu d'essai des commandes (`src/donnees/commandes-amorce.ts`).
 *
 * Il contient SIX adresses complètes, code postal compris, et c'est
 * indispensable : sans adresse, le moteur de frais de port n'a pas de zone,
 * et le jeu d'essai ne montrerait pas les trois zones. Mais ces adresses ne
 * désignent personne — elles ont été écrites pour ne désigner personne, et
 * elles le DISENT : « 1, rue de l'Exemple, Ville d'essai », destinataires
 * « Client d'essai n° N », courriels en `.invalid` (domaine réservé par la
 * norme, qui ne peut pas exister).
 *
 * L'exemption n'est donc pas accordée au FICHIER, elle est accordée à la
 * PREUVE : les deux marqueurs doivent y être. Le jour où quelqu'un remplace
 * « rue de l'Exemple » par une vraie voie pour faire plus vrai, la preuve
 * tombe, l'exemption tombe avec elle, et le fichier est analysé comme les
 * autres — c'est-à-dire qu'il échoue.
 */
const JEU_ESSAI = {
  chemin: 'src/donnees/commandes-amorce.ts',
  marqueurs: ['rue de l’Exemple', 'Client d’essai'],
  motifsNeutralises: ['Adresse postale (voie + code postal à proximité)'],
  justification:
    'jeu d’essai à adresses irréelles, dont les marqueurs sont vérifiés ci-dessus',
};

/* -------------------------------------------------------------------------- */
/* Zones de texte réglementaire                                                */
/* -------------------------------------------------------------------------- */

const BALISE_DEBUT = /texte-reglementaire:debut/g;
const BALISE_FIN = /texte-reglementaire:fin/g;

/**
 * Remplace le contenu des zones déclarées « texte réglementaire » par des
 * espaces, en conservant la longueur et les retours à la ligne — de sorte que
 * les numéros de ligne du rapport restent ceux du fichier.
 *
 * Rend aussi le décompte des balises, pour que le rapport dise combien de
 * zones ont été neutralisées et que l'appelant puisse refuser un déséquilibre.
 */
function neutraliserTexteReglementaire(texte) {
  const debuts = [...texte.matchAll(BALISE_DEBUT)].map((m) => m.index ?? 0);
  const fins = [...texte.matchAll(BALISE_FIN)].map((m) => m.index ?? 0);

  if (debuts.length !== fins.length) {
    return { texte, zones: debuts.length, equilibre: false };
  }

  let resultat = texte;

  for (let rang = debuts.length - 1; rang >= 0; rang -= 1) {
    const depart = debuts[rang];
    const arrivee = fins[rang];

    if (arrivee === undefined || depart === undefined || arrivee < depart) {
      return { texte, zones: debuts.length, equilibre: false };
    }

    const bloc = resultat.slice(depart, arrivee);
    resultat =
      resultat.slice(0, depart) +
      bloc.replace(/[^\n]/g, ' ') +
      resultat.slice(arrivee);
  }

  return { texte: resultat, zones: debuts.length, equilibre: true };
}

/* -------------------------------------------------------------------------- */
/* Analyse d'un texte                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Retire les commentaires de bloc et de ligne, en conservant les retours à la
 * ligne pour ne pas décaler les numéros du rapport.
 *
 * Volontairement naïf — il ne comprend ni les chaînes de caractères, ni les
 * expressions régulières, et une occurrence de `//` dans une adresse en
 * couperait la fin de ligne. C'est sans conséquence pour ce qu'on en fait :
 * COMPTER des balises `<AComplete>`. Un analyseur syntaxique complet pour ce
 * service-là serait une pièce mobile de plus, à maintenir, pour un gain nul.
 */
function sansCommentaires(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_, avant) => avant);
}

function numeroDeLigne(texte, position) {
  let ligne = 1;
  for (let index = 0; index < position; index += 1) {
    if (texte[index] === '\n') {
      ligne += 1;
    }
  }
  return ligne;
}

/** Les trouvailles d'un texte, motif par motif. */
function analyser(texte, motifsNeutralises) {
  const trouvailles = [];

  for (const motif of MOTIFS) {
    if (motifsNeutralises.includes(motif.intitule)) {
      continue;
    }

    motif.expression.lastIndex = 0;

    for (const occurrence of texte.matchAll(motif.expression)) {
      if (motif.ecarter !== undefined && motif.ecarter(texte, occurrence)) {
        continue;
      }

      trouvailles.push({
        intitule: motif.intitule,
        extrait: occurrence[0],
        ligne: numeroDeLigne(texte, occurrence.index ?? 0),
      });
    }
  }

  const intituleAdresse = 'Adresse postale (voie + code postal à proximité)';

  if (!motifsNeutralises.includes(intituleAdresse)) {
    DEBUT_ADRESSE.lastIndex = 0;

    for (const occurrence of texte.matchAll(DEBUT_ADRESSE)) {
      const position = occurrence.index ?? 0;
      const voisinage = texte.slice(
        Math.max(0, position - VOISINAGE),
        position + occurrence[0].length + VOISINAGE,
      );

      if (CODE_POSTAL.test(voisinage)) {
        trouvailles.push({
          intitule: intituleAdresse,
          extrait: occurrence[0].replace(/\s+/g, ' '),
          ligne: numeroDeLigne(texte, position),
        });
      }
    }
  }

  return trouvailles;
}

/* -------------------------------------------------------------------------- */
/* Parcours des fichiers                                                       */
/* -------------------------------------------------------------------------- */

function listerFichiers(dossier) {
  const trouves = [];

  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);

    if (entree.isDirectory()) {
      if (entree.name === 'node_modules' || entree.name.startsWith('.')) {
        continue;
      }
      trouves.push(...listerFichiers(chemin));
      continue;
    }

    if (entree.isFile()) {
      trouves.push(chemin);
    }
  }

  return trouves;
}

/* -------------------------------------------------------------------------- */
/* Harnais de contrôles — même forme que `verifier-catalogue.mjs`              */
/* -------------------------------------------------------------------------- */

const controles = [];

function controle(intitule, executer) {
  const anomalies = [];
  const observations = [];

  const exiger = (condition, message) => {
    if (!condition) {
      anomalies.push(message);
    }
  };
  const noter = (message) => observations.push(message);

  try {
    executer(exiger, noter);
  } catch (erreur) {
    anomalies.push(
      `contrôle interrompu : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
    );
  }

  controles.push({ intitule, anomalies, observations });
}

/* -------------------------------------------------------------------------- */
/* Base d'exécution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `--base <dossier>` déplace la racine analysée.
 *
 * Sert exclusivement aux tests de la garde : ils la lancent sur des dépôts
 * miniatures de `tests/fixtures/donnees-inventees/`, dont chacun porte un seul
 * défaut. Sans ce drapeau, une garde qui ne s'est jamais déclenchée est une
 * garde dont personne ne sait si elle fonctionne.
 */
function lireBase(arguments_) {
  const rang = arguments_.indexOf('--base');
  if (rang === -1) {
    return resolve(fileURLToPath(new URL('..', import.meta.url)));
  }
  const valeur = arguments_[rang + 1];
  if (valeur === undefined) {
    throw new Error('--base attend un dossier');
  }
  return resolve(valeur);
}

const BASE = lireBase(process.argv.slice(2));
const relatif = (chemin) => relative(BASE, chemin).split(sep).join('/');

/* -------------------------------------------------------------------------- */
/* Contrôle 1 — chaque page gabarit garde ses emplacements                     */
/* -------------------------------------------------------------------------- */

controle('Les pages gabarits portent encore leurs emplacements', (exiger, noter) => {
  /* Ce contrôle N'A DE SENS QUE sur un périmètre qui porte des pages. Les
     dépôts miniatures des tests n'en ont pas : ils n'existent que pour éprouver
     la recherche de motifs, et exiger d'eux cinq pages légales aurait fait
     échouer chacun d'eux pour trois raisons dont deux hors sujet. La condition
     porte sur le dossier `src/app` ENTIER, jamais sur une page en particulier :
     supprimer une page légale du vrai dépôt doit continuer d'échouer ici. */
  if (!existsSync(join(BASE, 'src', 'app'))) {
    noter('périmètre sans dossier src/app — contrôle sans objet');
    return;
  }

  for (const page of PAGES_LEGALES) {
    const chemin = join(BASE, page.chemin);

    if (!existsSync(chemin)) {
      exiger(false, `${page.chemin} : page introuvable`);
      continue;
    }

    /* Les commentaires sont retirés AVANT de compter. Ce fichier-ci en est la
       raison vivante : les en-têtes de ces pages parlent de leurs
       `<AComplete>`, et les compter aurait donné à une page vidée de ses
       emplacements un décompte rassurant tiré de sa propre documentation. */
    const source = sansCommentaires(readFileSync(chemin, 'utf8'));
    const occurrences = (source.match(/<AComplete\b/g) ?? []).length;

    if (page.exigeEmplacement) {
      exiger(
        occurrences > 0,
        `${page.chemin} : aucun <AComplete> — un gabarit sans emplacement est un gabarit qu’on a rempli`,
      );
      noter(`${page.chemin} : ${String(occurrences)} emplacements`);
    } else {
      noter(
        `${page.chemin} : ${String(occurrences)} emplacement(s), dispense assumée (${page.motifDispense})`,
      );
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Contrôle 2 — le formulaire téléchargeable est resté un gabarit              */
/* -------------------------------------------------------------------------- */

controle('Le formulaire téléchargeable est resté un gabarit', (exiger, noter) => {
  /* Le fichier est EXIGÉ dès lors que la page qui le propose au téléchargement
     existe. C'est l'invariant utile : un lien de téléchargement sans fichier
     derrière est un 404 servi à quelqu'un qui exerce un droit. */
  if (!existsSync(join(BASE, 'src', 'app', 'retractation', 'page.tsx'))) {
    noter('périmètre sans page de rétractation — contrôle sans objet');
    return;
  }

  const chemin = join(BASE, FORMULAIRE);

  if (!existsSync(chemin)) {
    exiger(
      false,
      `${FORMULAIRE} : fichier introuvable, alors que /retractation en propose le téléchargement`,
    );
    return;
  }

  const source = readFileSync(chemin, 'utf8');
  const occurrences = source.split(MARQUEUR_FORMULAIRE).length - 1;

  exiger(
    occurrences > 0,
    `${FORMULAIRE} : aucun « ${MARQUEUR_FORMULAIRE} » — le formulaire distribué a été rempli`,
  );
  noter(`${FORMULAIRE} : ${String(occurrences)} emplacements en clair`);
});

/* -------------------------------------------------------------------------- */
/* Contrôle 3 — le jeu d'essai prouve qu'il est un jeu d'essai                 */
/* -------------------------------------------------------------------------- */

let jeuEssaiProuve = false;

controle('Le jeu d’essai porte ses marqueurs d’irréalité', (exiger, noter) => {
  const chemin = join(BASE, JEU_ESSAI.chemin);

  if (!existsSync(chemin)) {
    noter(`${JEU_ESSAI.chemin} : absent de ce périmètre, contrôle sans objet`);
    return;
  }

  const source = readFileSync(chemin, 'utf8');
  const manquants = JEU_ESSAI.marqueurs.filter(
    (marqueur) => !source.includes(marqueur),
  );

  for (const marqueur of manquants) {
    exiger(
      false,
      `${JEU_ESSAI.chemin} : marqueur « ${marqueur} » absent — l’exemption d’adresse tombe avec lui`,
    );
  }

  jeuEssaiProuve = manquants.length === 0;

  if (jeuEssaiProuve) {
    noter(
      `${JEU_ESSAI.chemin} : marqueurs présents, exemption accordée (${JEU_ESSAI.justification})`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Contrôle 4 — aucun motif de donnée réelle dans le dépôt                     */
/* -------------------------------------------------------------------------- */

controle('Aucun motif de donnée réelle dans src, contenu et public', (exiger, noter) => {
  let fichiersLus = 0;
  let binairesEcartes = 0;
  let zonesReglementaires = 0;
  const racinesAbsentes = [];

  for (const racine of RACINES) {
    const dossier = join(BASE, racine);

    if (!existsSync(dossier) || !statSync(dossier).isDirectory()) {
      racinesAbsentes.push(racine);
      continue;
    }

    for (const chemin of listerFichiers(dossier)) {
      const nom = basename(chemin);
      const relative_ = relatif(chemin);

      /* Le NOM du fichier est analysé lui aussi : un « kbis-812345678.pdf »
         posé dans public/ dirait tout sans qu'on ait à l'ouvrir. */
      for (const trouvaille of analyser(nom, [])) {
        exiger(
          false,
          `${relative_} : ${trouvaille.intitule} dans le NOM du fichier (« ${trouvaille.extrait} »)`,
        );
      }

      if (!EXTENSIONS.some((extension) => nom.endsWith(extension))) {
        /* Un binaire DÉCLARÉ n'est pas un fichier oublié : on le compte, pour
           que le rapport distingue « rien à lire ici » de « rien vu ici ». Son
           contenu est gardé par le contrôle des métadonnées de la garde des
           marques ; son nom vient d'être analysé, quelques lignes plus haut. */
        if (EXTENSIONS_BINAIRES.some((extension) => nom.toLowerCase().endsWith(extension))) {
          binairesEcartes += 1;
        }

        continue;
      }

      fichiersLus += 1;

      const brut = readFileSync(chemin, 'utf8');
      const neutralise = neutraliserTexteReglementaire(brut);

      exiger(
        neutralise.equilibre,
        `${relative_} : balises « texte-reglementaire » déséquilibrées — une zone non refermée neutraliserait la fin du fichier`,
      );

      zonesReglementaires += neutralise.zones;

      const exemptions =
        relative_ === JEU_ESSAI.chemin && jeuEssaiProuve
          ? JEU_ESSAI.motifsNeutralises
          : [];

      for (const trouvaille of analyser(neutralise.texte, exemptions)) {
        exiger(
          false,
          `${relative_}:${String(trouvaille.ligne)} : ${trouvaille.intitule} — « ${trouvaille.extrait} »`,
        );
      }
    }
  }

  noter(`${String(fichiersLus)} fichiers lus dans ${RACINES.join(', ')}`);

  if (binairesEcartes > 0) {
    noter(
      `${String(binairesEcartes)} binaire(s) déclaré(s) non lu(s) comme du texte — ` +
        'leur nom a été analysé, leur contenu relève de la garde des métadonnées',
    );
  }
  noter(
    `${String(zonesReglementaires)} zone(s) de texte réglementaire neutralisée(s)`,
  );

  if (racinesAbsentes.length > 0) {
    noter(`racines absentes de ce périmètre : ${racinesAbsentes.join(', ')}`);
  }
});

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Contrôle 5 — texte et binaire restent deux catégories disjointes            */
/* -------------------------------------------------------------------------- */

/**
 * POURQUOI CE CONTRÔLE EXISTE, alors qu'il ne lit aucun fichier.
 *
 * `EXTENSIONS_BINAIRES` a été ajoutée en C11 pour dire, noir sur blanc, ce que
 * le dépôt s'autorise à porter en binaire. La revue de C11 a relevé qu'elle ne
 * servait alors qu'à un COMPTEUR D'AFFICHAGE : aucune assertion ne s'appuyait
 * dessus, donc rien n'aurait échoué si elle avait divergé de la réalité, donc
 * elle serait devenue fausse en silence — une liste que personne ne vérifie est
 * une liste que personne ne met à jour.
 *
 * Ce contrôle lui donne un moyen d'échouer. Une extension déclarée à la fois
 * texte et binaire ferait dire à cette garde deux choses contradictoires du
 * même fichier : qu'elle l'a lu et qu'elle ne l'a pas lu. C'est le même
 * contrôle, mot pour mot, que le huitième de la garde des marques — les deux
 * gardes portent chacune leur paire de listes, et chacune doit tenir la sienne.
 */
controle('Texte et binaire restent deux catégories disjointes', (exiger, noter) => {
  const texte = new Set(EXTENSIONS.map((extension) => extension.toLowerCase()));

  for (const extension of EXTENSIONS_BINAIRES) {
    exiger(
      !texte.has(extension.toLowerCase()),
      `« ${extension} » est déclarée à la fois texte et binaire : cette garde ` +
        'dirait alors deux choses contradictoires du même fichier',
    );
  }

  noter(
    `${String(EXTENSIONS.length)} extension(s) lue(s) comme du texte, ` +
      `${String(EXTENSIONS_BINAIRES.length)} tenue(s) pour binaires`,
  );
});

/* -------------------------------------------------------------------------- */
/* Contrôle 6 — aucun fichier de PILOTAGE PRIVÉ n'est suivi par git            */
/* -------------------------------------------------------------------------- */

/**
 * ===========================================================================
 * LA CLASSE DE DÉFAUT QUE CE CONTRÔLE FERME (tranche C19)
 * ===========================================================================
 *
 * Ce dépôt est PUBLIC. À côté du produit vivent des documents qui ont servi à
 * le FABRIQUER : le journal de génération des images, les briefs et comptes
 * rendus de tranche, des relevés de campagne. Ils portent l'adresse d'une
 * conversation privée avec le moteur d'images, des chemins de poste nominatifs
 * et des notes de séance. Rien de tout cela n'appartient au livrable, et
 * publier un chemin de poste publie le nom de session de quelqu'un.
 *
 * Le journal a franchi la frontière DEUX FOIS sans qu'aucune relecture ne
 * l'attrape — une fois à l'entrée (une exception `.gitignore` posée pour une
 * bonne raison : trois documents renvoyaient à un fichier absent), une fois à
 * la revue suivante, qui a d'ailleurs cru qu'il entrait alors qu'il était déjà
 * poussé. Deux relectures humaines, deux passages. Une promesse faite au
 * client ne peut pas tenir sur de la discipline : elle tient sur un contrôle
 * qui échoue.
 *
 * ---------------------------------------------------------------------------
 * IL INTERROGE GIT, ET NON LE DISQUE — c'est tout le sujet
 * ---------------------------------------------------------------------------
 *
 * Les quatre contrôles précédents parcourent des dossiers. Celui-ci ne peut
 * pas : le journal est TOUJOURS sur le poste, à sa place, et c'est très bien.
 * La question n'est pas « ce fichier existe-t-il ? » mais « ce fichier
 * est-il SUIVI ? ». Un `.gitignore` juste ne prouve rien non plus — une
 * exception peut y être ajoutée, et c'est exactement ce qui s'est produit ;
 * pire, un fichier déjà indexé reste suivi quoi qu'on écrive dans le
 * `.gitignore`. On demande donc à git son index, qui est la seule autorité sur
 * ce que le dépôt publie. Contrôler la propriété, pas son indice.
 *
 * ---------------------------------------------------------------------------
 * DEUX RÈGLES, DEUX NATURES
 * ---------------------------------------------------------------------------
 *
 * (a) Par le CHEMIN : `JOURNAL-GENERATION.md` où qu'il soit, et tout ce qui
 *     vit sous `.superpowers/`. Ce sont les deux emplacements nommés par la
 *     doctrine, et un nom de fichier se vérifie sans ouvrir le fichier.
 *
 * (b) Par le CONTENU : les trois empreintes du pilotage privé — l'adresse
 *     d'une conversation avec le moteur d'images, un chemin de poste Windows,
 *     un chemin de données d'application. Cette règle-ci attrape le cas que la
 *     première ne peut pas voir : un document RENOMMÉ, ou un extrait recopié
 *     dans un relevé de preuve.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI LES MOTIFS SONT ÉCRITS COMME ILS LE SONT
 * ---------------------------------------------------------------------------
 *
 * Ce fichier est lui-même suivi par git, donc analysé par la règle (b). Un
 * motif écrit en clair s'y trouverait et la garde se déclencherait sur sa
 * propre source — le défaut classique de la garde qui mord son banc d'essai.
 * Les trois expressions sont donc écrites avec les échappements et les classes
 * de caractères qui vont de soi en expression régulière (`\.` pour un point,
 * `[\\/]` pour un séparateur de chemin), et aucune de ces écritures ne
 * contient la chaîne qu'elle cherche. Ce n'est pas une ruse : `[\\/]` est en
 * outre PLUS JUSTE que le seul contre-oblique, puisque les mêmes chemins
 * s'écrivent des deux façons selon l'outil qui les imprime.
 *
 * ---------------------------------------------------------------------------
 * CE QU'IL NE LIT PAS
 * ---------------------------------------------------------------------------
 *
 * La règle (b) saute `tests/`, pour la raison déjà écrite en tête de ce
 * fichier à propos des fixtures : c'est là que vivent les pièces qui prouvent
 * qu'une garde échoue quand elle doit échouer. La règle (a), elle, s'applique
 * PARTOUT, `tests/` compris — un journal renommé n'a pas plus sa place dans un
 * dossier de test qu'ailleurs, et aucune pièce à conviction n'a besoin de
 * s'appeler `JOURNAL-GENERATION.md`.
 *
 * Elle ne lit pas non plus les binaires : même liste blanche d'extensions que
 * le contrôle 4, et pour la même raison.
 */

const CHEMINS_INTERDITS = [
  {
    intitule: 'journal de génération',
    correspond: (chemin) => basename(chemin) === 'JOURNAL-GENERATION.md',
    motif: 'documentation opératoire privée du moteur d’images',
  },
  {
    intitule: 'dossier de pilotage de tranche',
    correspond: (chemin) => chemin === '.superpowers' || chemin.startsWith('.superpowers/'),
    motif: 'briefs, comptes rendus et ledger — ils décrivent le travail, ils n’en font pas partie',
  },
];

const MOTIFS_PILOTAGE = [
  {
    intitule: 'adresse de conversation avec le moteur d’images',
    expression: /gemini\.google\.com\/app\//giu,
  },
  {
    intitule: 'chemin de poste Windows (profil utilisateur)',
    expression: /C:[\\/]Users[\\/]/giu,
  },
  {
    intitule: 'chemin de données d’application locales',
    expression: /AppData[\\/]/giu,
  },
];

controle('Aucun fichier de pilotage privé n’est suivi par git', (exiger, noter) => {
  let suivis;

  try {
    const sortie = execFileSync('git', ['ls-files', '-z'], {
      cwd: BASE,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    suivis = sortie.split('\0').filter((chemin) => chemin.length > 0);
  } catch (erreur) {
    /* Pas de verdict silencieux. Si git ne répond pas, ce contrôle n'a rien
       vérifié, et le dire est la seule conduite : un « OK » rendu sans avoir
       lu l'index vaudrait exactement zéro. */
    exiger(
      false,
      'git n’a pas rendu la liste des fichiers suivis, ce contrôle n’a donc ' +
        `rien vérifié (${erreur instanceof Error ? erreur.message.split('\n')[0] : String(erreur)})`,
    );
    return;
  }

  noter(`${String(suivis.length)} fichier(s) suivi(s) par git dans ce périmètre`);

  /* Règle (a) — le chemin, partout. */
  for (const chemin of suivis) {
    for (const interdit of CHEMINS_INTERDITS) {
      exiger(
        !interdit.correspond(chemin),
        `${chemin} : ${interdit.intitule} SUIVI par git — ${interdit.motif}`,
      );
    }
  }

  /* Règle (b) — le contenu, hors `tests/` et hors binaires. */
  let lus = 0;
  let sautesBanc = 0;
  let sautesBinaires = 0;

  for (const chemin of suivis) {
    if (chemin === 'tests' || chemin.startsWith('tests/')) {
      sautesBanc += 1;
      continue;
    }

    if (!EXTENSIONS.some((extension) => chemin.toLowerCase().endsWith(extension))) {
      sautesBinaires += 1;
      continue;
    }

    const absolu = join(BASE, chemin);

    if (!existsSync(absolu)) {
      /* Un fichier indexé mais absent du disque : la suppression n'est pas
         encore enregistrée. Rien à lire, et rien à taire non plus. */
      noter(`${chemin} : suivi mais absent du disque, contenu non lu`);
      continue;
    }

    lus += 1;
    const source = readFileSync(absolu, 'utf8');

    for (const motif of MOTIFS_PILOTAGE) {
      motif.expression.lastIndex = 0;

      for (const occurrence of source.matchAll(motif.expression)) {
        exiger(
          false,
          `${chemin}:${String(numeroDeLigne(source, occurrence.index ?? 0))} : ` +
            `${motif.intitule} — « ${occurrence[0]} »`,
        );
      }
    }
  }

  noter(
    `${String(lus)} suivi(s) relu(s) pour les empreintes de pilotage ` +
      `(${String(sautesBanc)} du banc d’essai et ${String(sautesBinaires)} binaire(s) écartés)`,
  );
});

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

const enEchec = controles.filter((c) => c.anomalies.length > 0);

console.log('');
console.log('Garde d’honnêteté — aucune donnée inventée');
console.log('-'.repeat(72));

for (const { intitule, anomalies, observations } of controles) {
  console.log(`${anomalies.length === 0 ? '[ OK   ]' : '[ ÉCHEC]'} ${intitule}`);

  for (const observation of observations) {
    console.log(`          ${observation}`);
  }

  for (const anomalie of anomalies) {
    console.log(`   -> ${anomalie}`);
  }
}

console.log('-'.repeat(72));

if (enEchec.length === 0) {
  console.log(`${String(controles.length)} contrôles, aucune anomalie.`);
  console.log('');
} else {
  console.log(
    `${String(controles.length)} contrôles, ${String(enEchec.length)} en échec : ${enEchec.map((c) => c.intitule).join(' ; ')}`,
  );
  console.log('');
  process.exitCode = 1;
}
