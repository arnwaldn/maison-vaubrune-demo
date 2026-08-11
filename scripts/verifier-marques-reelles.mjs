#!/usr/bin/env node
/**
 * GARDE DES MARQUES RÉELLES — la maison est fictive, ses voisines aussi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CETTE GARDE PROTÈGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les mentions légales du site écrivent, noir sur blanc : « aucune marque
 * réelle, aucune appellation protégée et aucun producteur nommé ». C'est une
 * promesse juridique autant qu'éditoriale, et jusqu'à cette tranche elle
 * n'était tenue que par la vigilance de celui qui écrivait.
 *
 * Elle est maintenant tenue par un script. Une fiche produit qui gagnerait
 * « notre huile façon Nicolas Alziari », un modèle de courriel qui citerait
 * une enseigne, un fichier nommé `comparatif-bonne-maman.md` : la construction
 * s'arrête.
 *
 * DEUX RISQUES DISTINCTS, et ils n'ont pas le même remède :
 *
 * 1. LA MARQUE. Emprunter le nom d'une maison qui existe, c'est se placer sous
 *    son crédit sans lui demander — et, dans une démonstration commerciale,
 *    laisser croire à une référence client qu'on n'a pas. C'est le risque de
 *    réputation, et il est réciproque.
 * 2. L'APPELLATION PROTÉGÉE. Une AOP, une AOC, une IGP ou un Label Rouge ne
 *    sont pas des adjectifs : ce sont des signes officiels dont l'usage est
 *    RÉGLEMENTÉ, contrôlé par des organismes certificateurs, et dont l'emploi
 *    indu est sanctionné. Un catalogue fictif qui écrirait « miel de Corse
 *    AOP » commettrait une allégation fausse sur un produit qui n'existe pas —
 *    le fait qu'il n'existe pas n'est pas une excuse, c'est une circonstance.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA LISTE EST PUBLIQUE, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le site portfolio garde une liste de termes qu'il ne publie pas — elle sert
 * à protéger des noms de clients, et la publier reviendrait à les nommer. Ici
 * c'est l'inverse exact : la liste EST la preuve. Elle dit ce qu'on a cherché
 * à ne pas emprunter, et quiconque relit ce fichier peut vérifier que la
 * recherche a été sérieuse plutôt que de nous croire sur parole.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE CHOIX DES TERMES : DISTINCTIFS D'ABORD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une garde qui se déclenche à tort est une garde qu'on désactive. Les marques
 * dont le nom est aussi un mot français courant, un prénom ou un patronyme
 * répandu ont donc été ÉCARTÉES, et la liste des écartées est écrite plus bas
 * avec son motif — c'est une information utile, pas un aveu.
 *
 * Le contrôle est INSENSIBLE À LA CASSE et borné par des frontières de mot
 * Unicode : « voyagent » ne déclenche pas « Agen », « appuyé » ne déclenche pas
 * « Puy », et « Hénaff » se trouve malgré son accent — ce que le `\b` d'une
 * expression régulière ASCII ne saurait pas faire.
 *
 * Usage : `node scripts/verifier-marques-reelles.mjs [--base <dossier>]`
 * Sortie : 0 si aucun emprunt, 1 sinon.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import {
  detecterMetadonnees,
  estBinaireExaminable,
  libelleMarqueur,
} from './metadonnees-binaires.mjs';

/* -------------------------------------------------------------------------- */
/* Périmètre                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Les racines parcourues. `tests/` en est absent pour la même raison que dans
 * la garde d'honnêteté : les dépôts miniatures qui prouvent que cette garde
 * fonctionne contiennent, par construction, de vraies marques — et, depuis la
 * tranche C11, de vrais binaires piégés.
 */
const RACINES = ['src', 'contenu', 'public'];

/**
 * Extensions lues COMME DU TEXTE, pour les contrôles 1 à 3.
 *
 * C'est une liste blanche : tout ce qui n'y figure pas n'est pas décodé en
 * UTF-8. Un fichier `.avif` passé au décodeur de texte rendrait une bouillie de
 * caractères de remplacement dans laquelle aucune expression régulière ne
 * trouverait rien — le pire des deux mondes, puisqu'il aurait l'air contrôlé.
 */
const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.txt',
  '.css',
  '.svg',
  '.html',
];

/**
 * Extensions BINAIRES, écrites en toutes lettres (tranche C11).
 *
 * Elles ne sont jamais lues comme du texte — c'est déjà l'effet de la liste
 * blanche ci-dessus, et ce serait donc redondant si cette liste ne servait
 * qu'à ça. Elle sert à deux autres choses :
 *
 * - dire ce que le dépôt s'autorise à porter en binaire, pour qu'un `.pdf` ou
 *   un `.zip` apparu un jour se remarque au lieu d'être ignoré en silence ;
 * - garantir, par le contrôle 8, qu'aucune extension n'est déclarée dans les
 *   DEUX listes — une extension qui serait à la fois texte et binaire ferait
 *   dire à cette garde deux choses contradictoires sur le même fichier.
 *
 * Les images sont en outre examinées par le contrôle 7 (métadonnées) ; les
 * polices et les vidéos ne le sont pas, faute de format de métadonnées commun
 * à surveiller — mais elles restent, comme tout le reste, sous le contrôle 4,
 * qui lit leur NOM.
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

/* -------------------------------------------------------------------------- */
/* Les termes surveillés                                                       */
/* -------------------------------------------------------------------------- */

/**
 * CINQUANTE-HUIT MARQUES d'épicerie fine et d'agroalimentaire français.
 *
 * Le critère de présence est le même pour toutes : le nom doit être
 * DISTINCTIF, c'est-à-dire ne pas exister par ailleurs comme mot courant,
 * prénom ou patronyme fréquent. Les marques écartées pour ce motif sont
 * listées dans `ECARTEES` ci-dessous.
 */
const MARQUES = [
  // Confitures, épicerie sucrée
  'Bonne Maman',
  'Andros',
  'Materne',
  'St Dalfour',
  'Christine Ferber',
  'Alain Milliat',
  // Épiceries fines et maisons de détail
  'Fauchon',
  'Hédiard',
  'Comtesse du Barry',
  'Terre Exotique',
  'Maison Bremond',
  // Condiments
  'Maille',
  'Amora',
  'Bénédicta',
  'Edmond Fallot',
  'Martin Pouret',
  'Melfor',
  'Beaufor',
  // Huiles
  'Lesieur',
  'Puget',
  'Nicolas Alziari',
  'Huilerie Beaujolaise',
  'Huilerie Leblanc',
  // Conserves, charcuterie, traiteur
  'Hénaff',
  'Bordeau Chesnel',
  'Labeyrie',
  'Delpeyrat',
  'Fleury Michon',
  'Herta',
  'La Belle-Iloise',
  'Petit Navire',
  'Saupiquet',
  'Cassegrain',
  'Bonduelle',
  // Épicerie sèche
  'Panzani',
  'Lustucru',
  'Tipiak',
  'Sabarot',
  // Crèmerie
  'Isigny Sainte-Mère',
  'Échiré',
  'Beurre Bordier',
  'Paysan Breton',
  'Elle & Vire',
  'Entremont',
  // Thés et infusions
  'Kusmi Tea',
  'Dammann Frères',
  'Mariage Frères',
  'Palais des Thés',
  // Bio et équitable
  'Bjorg',
  'Alter Eco',
  'Ethiquable',
  // Enseignes et marques de distributeur
  'Reflets de France',
  'Monoprix',
  'Picard Surgelés',
  'Grand Frais',
  'Carrefour',
  'Intermarché',
  'Auchan',
];

/**
 * LES APPELLATIONS PROTÉGÉES, par leur dénomination.
 *
 * Plusieurs sont aussi des noms de communes — Roquefort, Munster, Époisses,
 * Saint-Nectaire. Ce n'est pas un défaut du filtre : une épicerie fictive n'a
 * aucune raison de situer un produit dans une commune dont le nom EST une
 * appellation, et si elle le fait, c'est très exactement l'emprunt qu'on
 * cherche à empêcher. Le jour où une fiche voudra parler de l'une d'elles, la
 * garde le dira et il faudra le décider, plutôt que de le laisser passer.
 */
const APPELLATIONS = [
  'Roquefort',
  'Reblochon',
  'Camembert de Normandie',
  'Ossau-Iraty',
  'Brocciu',
  'Munster',
  'Époisses',
  'Saint-Nectaire',
  'Bleu d’Auvergne',
  'Fourme d’Ambert',
  'Crottin de Chavignol',
  'Piment d’Espelette',
  'Noix de Grenoble',
  'Lentille verte du Puy',
  'Pruneau d’Agen',
  'Jambon de Bayonne',
  'Volaille de Bresse',
  'Huile d’olive de Nyons',
  'Fleur de sel de Guérande',
  'Beurre Charentes-Poitou',
];

/**
 * LES SIGNES OFFICIELS, en sigle ET en toutes lettres.
 *
 * Les sigles seuls ne suffisent pas : « appellation d'origine protégée » écrit
 * en entier engage autant que « AOP », et c'est même la forme qu'un rédacteur
 * emploie quand il veut faire sérieux sans y penser.
 *
 * « appellation protégée » sans « d'origine » n'y figure PAS, et c'est
 * délibéré : c'est la formule qu'emploient les mentions légales du site pour
 * dire qu'il n'en utilise aucune. Une garde qui se déclencherait sur la phrase
 * par laquelle le site promet de ne pas le faire serait une garde absurde.
 */
const MENTIONS_OFFICIELLES = [
  'AOP',
  'AOC',
  'IGP',
  'STG',
  'Label Rouge',
  'appellation d’origine protégée',
  'appellation d’origine contrôlée',
  'indication géographique protégée',
  'spécialité traditionnelle garantie',
];

/**
 * LES MARQUES ÉCARTÉES, et le motif de chacune.
 *
 * Aucune de ces maisons n'est moins réelle que les autres : elles portent
 * seulement un nom qui existe ailleurs, et les surveiller ferait échouer la
 * construction sur une phrase française ordinaire. Cette liste est publiée
 * parce qu'un trou dans un filet se dit ; on ne le découvre pas.
 */
const ECARTEES = [
  ['Casino', 'nom commun français — un casino est un établissement de jeux'],
  ['Président', 'nom commun, et déjà présent dans les mentions légales (« gérant ou président »)'],
  ['Société', 'nom commun, omniprésent dans un document juridique'],
  ['Papillon', 'nom commun'],
  ['Éléphant', 'nom commun'],
  ['À l’Olivier', 'l’olivier est l’arbre dont ce catalogue tire son huile'],
  ['Francine', 'prénom — un jeu d’essai de commandes en porterait un un jour'],
  ['Leclerc', 'patronyme répandu'],
  ['Picard', 'patronyme répandu — surveillé sous « Picard Surgelés »'],
  ['Bordier', 'patronyme — surveillé sous « Beurre Bordier »'],
  ['Leblanc', 'patronyme — surveillé sous « Huilerie Leblanc »'],
  ['Comté, Cantal, Beaufort, Banon', 'appellations dont le nom est aussi une région, un département, une commune ou un patronyme'],
];

/* -------------------------------------------------------------------------- */
/* Construction des expressions                                                */
/* -------------------------------------------------------------------------- */

/**
 * Un terme, en expression régulière tolérante à ce qui ne change pas le sens.
 *
 * Trois libertés, et pas une de plus :
 *
 * - LA CASSE est ignorée, parce qu'un emprunt en capitales reste un emprunt.
 * - LES ESPACES entre les mots acceptent le retour à la ligne et l'insécable :
 *   « Bonne\n   Maman » coupé par un formateur de code est le même nom.
 * - L'APOSTROPHE accepte ses deux formes, droite et typographique. Le projet
 *   n'écrit que la seconde (décision D11), mais un collé-depuis-ailleurs
 *   apporte souvent la première — et c'est précisément le collé-depuis-ailleurs
 *   qu'on cherche.
 *
 * Les FRONTIÈRES sont des classes Unicode et non le `\b` habituel : `\b` est
 * défini sur l'alphabet ASCII, si bien qu'il place une frontière au milieu de
 * « Hénaff » (entre le « H » et le « é ») et n'en place aucune avant « Échiré ».
 * Sur une liste de noms français, il serait faux dans les deux sens.
 */
function expressionDuTerme(terme) {
  const echappe = terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const souple = echappe
    .replace(/ /g, '[\\s\\u00a0]+')
    .replace(/['’]/g, '[\'’]');

  return new RegExp(`(?<![\\p{L}\\p{N}])${souple}(?![\\p{L}\\p{N}])`, 'giu');
}

/* -------------------------------------------------------------------------- */
/* Exemptions — accordées à une PREUVE, jamais à un fichier                    */
/* -------------------------------------------------------------------------- */

/**
 * Même doctrine que la garde d'honnêteté (décision D30) : on n'exempte pas un
 * fichier, on exempte une citation dont on peut vérifier qu'elle est bien ce
 * qu'elle prétend être.
 *
 * `contexte` est la portion de ligne qui doit accompagner le terme pour que
 * l'exemption tienne. Si la phrase change, l'exemption tombe avec elle.
 *
 * Une exemption qui ne sert plus fait ÉCHOUER la garde. C'est le seul moyen
 * d'éviter qu'une liste d'exceptions s'allonge et devienne, au fil des
 * tranches, une seconde garde qui ne garde rien.
 */
const EXEMPTIONS = [
  {
    chemin: 'contenu/decisions/000-choix-du-nom.md',
    terme: 'Fauchon',
    contexte: 'renvoie 10 marques',
    justification:
      'la décision du nom compte les marques déposées homonymes de chaque ' +
      'candidat ; « Fauchon » y est cité comme MESURE de densité de marques, ' +
      'et non comme une maison à laquelle la démonstration se compare',
  },
];

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

function numeroDeLigne(texte, position) {
  let ligne = 1;

  for (let rang = 0; rang < position; rang += 1) {
    if (texte.charAt(rang) === '\n') {
      ligne += 1;
    }
  }

  return ligne;
}

function ligneEntiere(texte, position) {
  const debut = texte.lastIndexOf('\n', position) + 1;
  const fin = texte.indexOf('\n', position);

  return texte.slice(debut, fin === -1 ? texte.length : fin);
}

/* -------------------------------------------------------------------------- */
/* Harnais de contrôles — même forme que les deux autres gardes                */
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

const RACINE_DU_DEPOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = lireBase(process.argv.slice(2));
const PERIMETRE_REEL = BASE === RACINE_DU_DEPOT;
const relatif = (chemin) => relative(BASE, chemin).split(sep).join('/');

/** Les trois familles, avec leur expression compilée une seule fois. */
const FAMILLES = [
  { article: 'Aucune', intitule: 'marque réelle', termes: MARQUES },
  { article: 'Aucune', intitule: 'appellation protégée', termes: APPELLATIONS },
  { article: 'Aucun', intitule: 'signe officiel de qualité', termes: MENTIONS_OFFICIELLES },
].map((famille) => ({
  ...famille,
  compiles: famille.termes.map((terme) => ({ terme, motif: expressionDuTerme(terme) })),
}));

/** Les fichiers du périmètre, lus une seule fois. */
const FICHIERS = [];
const racinesAbsentes = [];

for (const racine of RACINES) {
  const dossier = join(BASE, racine);

  try {
    if (!statSync(dossier).isDirectory()) {
      continue;
    }
  } catch {
    racinesAbsentes.push(racine);
    continue;
  }

  for (const chemin of listerFichiers(dossier)) {
    FICHIERS.push(chemin);
  }
}

/** Les exemptions réellement employées, pour le contrôle des exemptions mortes. */
const exemptionsUtilisees = new Set();

function estExempte(cheminRelatif, terme, ligne) {
  for (const exemption of EXEMPTIONS) {
    if (
      exemption.chemin === cheminRelatif &&
      exemption.terme.toLowerCase() === terme.toLowerCase() &&
      ligne.includes(exemption.contexte)
    ) {
      exemptionsUtilisees.add(`${exemption.chemin}::${exemption.terme}`);
      return true;
    }
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* Contrôles 1 à 3 — le contenu des fichiers, famille par famille              */
/* -------------------------------------------------------------------------- */

for (const famille of FAMILLES) {
  controle(`${famille.article} ${famille.intitule} dans le texte du dépôt`, (exiger, noter) => {
    let fichiersLus = 0;
    let exemptees = 0;

    for (const chemin of FICHIERS) {
      if (!EXTENSIONS.some((extension) => chemin.endsWith(extension))) {
        continue;
      }

      const texte = readFileSync(chemin, 'utf8');
      fichiersLus += 1;
      const cheminRelatif = relatif(chemin);

      for (const { terme, motif } of famille.compiles) {
        motif.lastIndex = 0;

        for (const trouve of texte.matchAll(motif)) {
          const ligne = ligneEntiere(texte, trouve.index);

          if (estExempte(cheminRelatif, terme, ligne)) {
            exemptees += 1;
            continue;
          }

          exiger(
            false,
            `${cheminRelatif}:${String(numeroDeLigne(texte, trouve.index))} — ` +
              `« ${trouve[0]} » (${famille.intitule} : ${terme})`,
          );
        }
      }
    }

    noter(
      `${String(famille.termes.length)} terme(s) cherché(s) dans ${String(fichiersLus)} fichier(s)`,
    );

    if (exemptees > 0) {
      noter(`${String(exemptees)} citation(s) exemptée(s), voir le contrôle des exemptions`);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Contrôle 4 — les NOMS DE FICHIERS                                           */
/* -------------------------------------------------------------------------- */

controle('Aucun nom de fichier ne porte de marque ni d’appellation', (exiger, noter) => {
  const tous = FAMILLES.flatMap((famille) =>
    famille.compiles.map((compile) => ({ ...compile, famille: famille.intitule })),
  );

  for (const chemin of FICHIERS) {
    /* Le chemin RELATIF en entier, et pas seulement le nom du fichier : un
       dossier `contenu/comparatif-bonne-maman/` est le même emprunt qu'un
       fichier. Les séparateurs, les tirets et les soulignés comptent comme des
       frontières de mot, ce que les classes Unicode donnent gratuitement. */
    const cheminRelatif = relatif(chemin);

    for (const { terme, motif, famille } of tous) {
      motif.lastIndex = 0;

      if (motif.test(cheminRelatif)) {
        exiger(false, `${cheminRelatif} — « ${terme} » (${famille}) dans le chemin`);
      }
    }
  }

  noter(`${String(FICHIERS.length)} chemin(s) examiné(s)`);
});

/* -------------------------------------------------------------------------- */
/* Contrôle 5 — la liste elle-même se tient                                    */
/* -------------------------------------------------------------------------- */

controle('La liste surveillée est cohérente', (exiger, noter) => {
  const tous = FAMILLES.flatMap((famille) => famille.termes);
  const vus = new Set();

  for (const terme of tous) {
    const clef = terme.toLowerCase();

    exiger(!vus.has(clef), `« ${terme} » est déclaré deux fois`);
    vus.add(clef);

    exiger(terme.trim().length >= 3, `« ${terme} » est trop court pour être distinctif`);
  }

  exiger(MARQUES.length >= 40, `la liste ne compte que ${String(MARQUES.length)} marques`);

  noter(
    `${String(MARQUES.length)} marques, ${String(APPELLATIONS.length)} appellations, ` +
      `${String(MENTIONS_OFFICIELLES.length)} signes officiels`,
  );
  noter(`${String(ECARTEES.length)} entrée(s) écartée(s), motif consigné dans le script`);
});

/* -------------------------------------------------------------------------- */
/* Contrôle 6 — aucune exemption morte                                         */
/* -------------------------------------------------------------------------- */

controle('Chaque exemption sert encore', (exiger, noter) => {
  /* Ce contrôle N'A DE SENS QUE sur le dépôt réel. Les exemptions désignent
     des fichiers de ce dépôt-ci ; les réclamer sur un dépôt miniature ferait
     échouer chaque pièce à conviction pour une raison qui n'est pas la sienne,
     et rendrait le banc d'essai illisible. Même parti pris que le premier
     contrôle de la garde d'honnêteté. */
  if (!PERIMETRE_REEL) {
    noter('périmètre d’essai : les exemptions du dépôt réel ne s’y appliquent pas');
    return;
  }

  for (const exemption of EXEMPTIONS) {
    const clef = `${exemption.chemin}::${exemption.terme}`;

    exiger(
      exemptionsUtilisees.has(clef),
      `exemption inutilisée : « ${exemption.terme} » dans ${exemption.chemin} — ` +
        'la citation a disparu ou son contexte a changé ; retirez l’exemption',
    );

    if (exemptionsUtilisees.has(clef)) {
      noter(`${exemption.terme} (${exemption.chemin}) — ${exemption.justification}`);
    }
  }

  if (EXEMPTIONS.length === 0) {
    noter('aucune exemption déclarée');
  }
});

/* -------------------------------------------------------------------------- */
/* Contrôle 7 — aucune métadonnée dans les binaires images (tranche C11)       */
/* -------------------------------------------------------------------------- */

/**
 * LA PORTE DÉROBÉE QUE LES SIX PREMIERS CONTRÔLES NE VOYAIENT PAS.
 *
 * Les contrôles 1 à 3 lisent du texte, le 4 lit des noms. Aucun ne regardait
 * l'intérieur d'un binaire — et il n'y en avait aucun à regarder jusqu'à la
 * décision D35, qui ouvre `public/produits/` aux visuels engendrés.
 *
 * Or les moteurs d'images écrivent le TEXTE DE LA CONSIGNE dans les
 * métadonnées du fichier produit. Une image parfaitement propre à l'œil peut
 * donc transporter, en clair, une phrase citant une maison réelle : la
 * promesse des mentions légales serait tenue sur tout le dépôt SAUF sur les
 * octets que personne ne relit.
 *
 * Le raisonnement complet, la liste des marqueurs et la raison des 64 Ko sont
 * en tête de `scripts/metadonnees-binaires.mjs`, partagé avec la garde des
 * images produit — un seul détecteur, donc un seul comportement à tenir.
 */
controle('Aucune métadonnée dans les binaires images', (exiger, noter) => {
  let examines = 0;

  for (const chemin of FICHIERS) {
    if (!estBinaireExaminable(chemin)) {
      continue;
    }

    examines += 1;
    const cheminRelatif = relatif(chemin);

    for (const { motif, trahit, position } of detecterMetadonnees(chemin)) {
      exiger(
        false,
        `${cheminRelatif} — marqueur « ${libelleMarqueur(motif)} » à l’octet ` +
          `${String(position)} : ${trahit}`,
      );
    }
  }

  noter(
    examines === 0
      ? 'aucun binaire image dans le périmètre'
      : `${String(examines)} binaire(s) examiné(s) sur leurs 64 Ko de tête et de queue`,
  );
});

/* -------------------------------------------------------------------------- */
/* Contrôle 8 — les deux listes d'extensions ne se recouvrent pas              */
/* -------------------------------------------------------------------------- */

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
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

const enEchec = controles.filter((c) => c.anomalies.length > 0);

console.log('');
console.log('Garde des marques réelles — aucune maison, aucune appellation empruntée');
console.log('-'.repeat(72));

if (racinesAbsentes.length > 0) {
  console.log(`          racines absentes de ce périmètre : ${racinesAbsentes.join(', ')}`);
}

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
