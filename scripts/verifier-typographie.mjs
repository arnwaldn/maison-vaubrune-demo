#!/usr/bin/env node
/**
 * LA GARDE DU PLANCHER TYPOGRAPHIQUE — aucune didone en dessous de 20 px.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi une garde, et pourquoi celle-ci existe après coup
 * ---------------------------------------------------------------------------
 *
 * L'interdit n° 10 de la décision D37 dit qu'aucun texte n'est rendu en Bodoni
 * sous 20 px : une didone à petit corps perd ses déliés, et ce qui reste à
 * l'écran est un titre gris qui ne se lit plus. C12 a ouvert la brèche en
 * remplaçant Newsreader par Bodoni ; C13 devait la refermer.
 *
 * Le contrôle de sortie de C13 était un `grep` : « `font-titre` voisin d'une
 * taille inférieure à `text-xl` ». Il a rendu zéro ligne, et il avait tort.
 * Un `grep` qui cherche `font-titre` ne peut pas voir les titres qui n'écrivent
 * PAS `font-titre` — ceux qui l'héritent de la règle
 * `h1, h2, h3, h4 { font-family: var(--font-titre) }` de `@layer base`. Trois
 * titres du site rendaient ainsi la Bodoni à 12 px, et le même angle mort avait
 * déjà fait manquer le compte au recensement de C12.
 *
 * D'où ce script. Il ne cherche pas une chaîne de caractères : il PARCOURT les
 * titres, résout leurs classes — y compris quand elles vivent dans une
 * constante partagée —, en déduit une famille et une taille EFFECTIVES, et
 * refuse le dépôt si l'une des deux combinaisons interdites apparaît.
 *
 * ---------------------------------------------------------------------------
 * Les deux chemins qui mènent à une didone, et il n'y en a que deux
 * ---------------------------------------------------------------------------
 *
 * 1. LE CHEMIN EXPLICITE — un élément, quel qu'il soit, écrit `font-titre`.
 *    C'est celui que le `grep` de C13 voyait.
 * 2. LE CHEMIN HÉRITÉ — un `<h1>` à `<h4>` qui n'écrit AUCUNE famille. La règle
 *    de `@layer base` s'applique, et l'élément rend la didone à la taille qu'il
 *    porte, ou à celle de son parent s'il n'en porte pas. C'est celui que le
 *    `grep` ne pouvait pas voir.
 *
 * Un élément qui écrit explicitement `font-texte`, `font-mono`, ou l'une des
 * classes composées de C13 (`etiquette`, `registre`, `sous-titre` — qui posent
 * leur propre famille dans la couche `utilities`, donc au-dessus de
 * `@layer base`) n'est pas une didone, et sort du contrôle.
 *
 * ---------------------------------------------------------------------------
 * La taille effective, et la seule hypothèse de ce script
 * ---------------------------------------------------------------------------
 *
 * Les degrés de l'échelle sont des `clamp()` : c'est leur BORNE BASSE qui
 * compte, puisque c'est la taille rendue sur l'écran le plus étroit. Les
 * classes de Tailwind sont lues à leur valeur. Quand plusieurs tailles sont
 * écrites — `text-3xl sm:text-4xl` —, c'est la PLUS PETITE qui décide : la
 * classe sans préfixe est celle du plus petit écran.
 *
 * Un titre sans aucune classe de taille hérite de son parent. Le script ne
 * remonte pas l'arbre — il n'a pas de rendu, il a du texte —, et prend alors
 * 16 px : la borne basse de `--text-corps`, c'est-à-dire la taille du texte
 * courant, donc celle d'à peu près tous les parents possibles. L'hypothèse est
 * PESSIMISTE au bon sens : elle signale, elle ne dispense pas.
 *
 * Exemption unique : `sr-only`. Un titre réservé aux lecteurs d'écran n'est pas
 * rendu, et sa police n'existe pas. Il en reste deux dans le projet.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ici et pas dans un test d'apparence
 * ---------------------------------------------------------------------------
 *
 * Un contrôle au navigateur — lire `getComputedStyle` sur chaque titre des
 * pages — serait plus exact. Il serait aussi limité aux pages VISITÉES par la
 * campagne, alors que le défaut se cache par définition dans celles qu'on ne
 * regarde pas : les trois titres manqués vivaient dans un encadré réglementaire
 * des CGV, un modèle de formulaire de rétractation, et une aide de la page de
 * suivi. Ce script lit le dépôt entier, y compris les composants qu'aucune
 * campagne n'atteint.
 *
 * Il est branché comme les quatre autres gardes : un code de sortie non nul
 * arrête `npm run controle`, et un cas de test le lance sur des dépôts
 * miniatures pour prouver qu'il refuse ce qu'il doit refuser. C15 et C16 vont
 * re-skiner en masse ; ce contrôle doit survivre à la tranche qui l'écrit.
 *
 * Usage : `node scripts/verifier-typographie.mjs [--racine <dossier>]`
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE_PROJET = fileURLToPath(new URL('..', import.meta.url));

/** Le plancher de l'interdit n° 10 de D37, en pixels. */
const PLANCHER = 20;

/**
 * Les bornes BASSES des sept degrés de l'échelle, en pixels.
 * Recopiées de `@theme static` dans `src/app/globals.css` — si l'échelle
 * change, cette table change avec elle, et le cas de test qui la couvre le
 * dira.
 */
const DEGRES = {
  'text-monument': 56,
  'text-affiche': 36,
  'text-titre': 24,
  'text-chapeau': 18,
  'text-corps': 16,
  'text-meta': 12,
  'text-label': 11,
};

/** L'échelle par défaut de Tailwind, en pixels. */
const TAILWIND = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
  'text-7xl': 72,
  'text-8xl': 96,
  'text-9xl': 128,
};

/**
 * Les classes qui POSENT une famille autre que la didone. Les trois dernières
 * sont les `@utility` de C13 : elles vivent dans la couche `utilities`, donc
 * au-dessus de la règle `h1..h4` de `@layer base` qu'elles écrasent.
 */
const FAMILLES_NON_DIDONES = ['font-texte', 'font-mono', 'etiquette', 'registre', 'sous-titre'];

/** La taille supposée d'un titre qui n'en porte aucune (voir l'en-tête). */
const TAILLE_HERITEE = 16;

function lireOption(nom, defaut) {
  const index = process.argv.indexOf(nom);
  return index !== -1 && process.argv[index + 1] !== undefined
    ? process.argv[index + 1]
    : defaut;
}

/* `resolve` et non `join` : le cas de test passe un dossier temporaire en
   chemin ABSOLU, que `join` collerait derrière la racine du projet. */
const racine = resolve(RACINE_PROJET, lireOption('--racine', 'src'));

function fichiersTsx(dossier) {
  const trouves = [];

  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);

    if (statSync(chemin).isDirectory()) {
      trouves.push(...fichiersTsx(chemin));
    } else if (chemin.endsWith('.tsx')) {
      trouves.push(chemin);
    }
  }

  return trouves.sort();
}

/**
 * Les constantes de classes du projet, toutes fichiers confondus.
 *
 * Une seule table pour tout le dépôt, et non une par fichier : les deux
 * constantes qui portaient trente titres à elles seules en C12 — celle de
 * `PageLegale` et son homonyme de `prise-en-main` — sont l'une exportée et
 * consommée ailleurs, l'autre locale. Les résoudre par fichier aurait manqué la
 * première ; une table globale les attrape toutes les deux, au prix d'une
 * collision de noms qu'on accepte : deux constantes de même nom dans deux
 * fichiers différents désignent, dans ce projet, la même intention.
 */
function tableDesConstantes(fichiers) {
  const table = new Map();
  const motif = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(['"`])([^'"`]*)\2/g;

  for (const fichier of fichiers) {
    for (const trouve of readFileSync(fichier, 'utf8').matchAll(motif)) {
      const [, nom, , valeur] = trouve;
      if (valeur.includes('-') || valeur.includes(' ')) {
        table.set(nom, `${table.get(nom) ?? ''} ${valeur}`);
      }
    }
  }

  return table;
}

/**
 * La « soupe de classes » d'un attribut `className`, constantes résolues.
 *
 * On ne cherche pas à interpréter l'expression — un ternaire, une
 * interpolation, une concaténation. On ramasse TOUT ce qu'elle contient :
 * chaque littéral de chaîne et chaque identifiant connu de la table. Une
 * branche de ternaire qui poserait une famille non didone exempte donc l'autre,
 * et c'est le seul relâchement de ce script. Il est assumé parce qu'il est
 * VÉRIFIABLE : le cas de test « ternaire » le fixe, et le projet n'écrit aucun
 * ternaire de famille sur un titre.
 */
function soupeDeClasses(expression, constantes) {
  const morceaux = [];

  for (const trouve of expression.matchAll(/['"`]([^'"`]*)['"`]/g)) {
    morceaux.push(trouve[1]);
  }

  for (const trouve of expression.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    const valeur = constantes.get(trouve[1]);
    if (valeur !== undefined) {
      morceaux.push(valeur);
    }
  }

  return morceaux.join(' ');
}

/** Les classes utiles d'une soupe, préfixes d'écran retirés. */
function classes(soupe) {
  return soupe
    .split(/[\s{}()]+/)
    .filter((mot) => mot !== '')
    .map((mot) => (mot.includes(':') ? mot.slice(mot.lastIndexOf(':') + 1) : mot));
}

/** La famille effective : `didone`, `autre`, ou `didone-heritee`. */
function famille(listeDeClasses, estUnTitre) {
  if (listeDeClasses.some((classe) => FAMILLES_NON_DIDONES.includes(classe))) {
    return 'autre';
  }

  if (listeDeClasses.includes('font-titre')) {
    return 'didone';
  }

  return estUnTitre ? 'didone-heritee' : 'autre';
}

/** La taille effective en pixels : la plus PETITE écrite, ou l'héritage. */
function taille(listeDeClasses) {
  const tailles = [];

  for (const classe of listeDeClasses) {
    if (classe in DEGRES) {
      tailles.push(DEGRES[classe]);
    } else if (classe in TAILWIND) {
      tailles.push(TAILWIND[classe]);
    } else {
      const arbitraire = /^text-\[(\d+(?:\.\d+)?)(rem|px)\]$/.exec(classe);
      if (arbitraire !== null) {
        tailles.push(
          arbitraire[2] === 'rem' ? Number(arbitraire[1]) * 16 : Number(arbitraire[1]),
        );
      }
    }
  }

  return tailles.length > 0
    ? { pixels: Math.min(...tailles), heritee: false }
    : { pixels: TAILLE_HERITEE, heritee: true };
}

/**
 * L'attribut `className` d'une balise ouvrante, expression comprise.
 *
 * Écrit à la main plutôt qu'en expression régulière : un `className={…}` peut
 * contenir des accolades imbriquées (`${identifiant}-titre`), qu'un motif non
 * récursif couperait au premier `}` venu.
 */
function extraireClassName(source, debut) {
  const marque = source.indexOf('className=', debut);
  if (marque === -1) {
    return '';
  }

  let index = marque + 'className='.length;

  if (source[index] === '"' || source[index] === "'") {
    const guillemet = source[index];
    const fin = source.indexOf(guillemet, index + 1);
    return fin === -1 ? '' : source.slice(index, fin + 1);
  }

  if (source[index] !== '{') {
    return '';
  }

  let profondeur = 0;
  const depart = index;

  for (; index < source.length; index += 1) {
    if (source[index] === '{') {
      profondeur += 1;
    } else if (source[index] === '}') {
      profondeur -= 1;
      if (profondeur === 0) {
        return source.slice(depart, index + 1);
      }
    }
  }

  return '';
}

/** Les éléments à examiner d'un fichier : les titres, et les didones écrites. */
function elementsDuFichier(fichier, source, constantes) {
  const releves = [];
  const lignes = source.split(/\r?\n/);
  const ligneDe = (position) => source.slice(0, position).split(/\r?\n/).length;

  /* 1. Les titres — chemin hérité compris. */
  for (const trouve of source.matchAll(/<(h[1-4])(\s)/g)) {
    const finDeBalise = source.indexOf('>', trouve.index);
    const attributs = source.slice(trouve.index, finDeBalise === -1 ? undefined : finDeBalise);
    const expression = attributs.includes('className=')
      ? extraireClassName(source, trouve.index)
      : '';

    releves.push({
      fichier,
      ligne: ligneDe(trouve.index),
      balise: trouve[1],
      estUnTitre: true,
      soupe: soupeDeClasses(expression, constantes),
    });
  }

  /* 2. Les didones ÉCRITES sur autre chose qu'un titre. */
  lignes.forEach((ligne, index) => {
    if (!ligne.includes('font-titre') || /<h[1-4][\s>]/.test(ligne)) {
      return;
    }

    releves.push({
      fichier,
      ligne: index + 1,
      balise: '(élément)',
      estUnTitre: false,
      soupe: soupeDeClasses(ligne, constantes),
    });
  });

  return releves;
}

/* -------------------------------------------------------------------------- */
/* Le contrôle                                                                 */
/* -------------------------------------------------------------------------- */

const fichiers = fichiersTsx(racine);
const constantes = tableDesConstantes(fichiers);

const examines = [];
const suspects = [];
let exemptes = 0;
let titresParcourus = 0;

for (const fichier of fichiers) {
  const source = readFileSync(fichier, 'utf8');

  for (const releve of elementsDuFichier(fichier, source, constantes)) {
    if (releve.estUnTitre) {
      titresParcourus += 1;
    }

    const listeDeClasses = classes(releve.soupe);

    if (listeDeClasses.includes('sr-only')) {
      exemptes += 1;
      continue;
    }

    const quelleFamille = famille(listeDeClasses, releve.estUnTitre);

    if (quelleFamille === 'autre') {
      continue;
    }

    const quelleTaille = taille(listeDeClasses);
    examines.push(releve);

    if (quelleTaille.pixels < PLANCHER) {
      suspects.push({ ...releve, famille: quelleFamille, taille: quelleTaille });
    }
  }
}

console.log('');
console.log('Plancher typographique — interdit n° 10 de D37 (Bodoni ≥ 20 px)');
console.log('-'.repeat(72));
console.log(
  `  ${String(titresParcourus)} titre(s) h1..h4 parcouru(s) — ` +
    `${String(examines.length)} élément(s) rendu(s) en didone examiné(s), ` +
    `${String(exemptes)} exempté(s) (sr-only)`,
);

if (suspects.length === 0) {
  console.log('  OK   aucune didone sous 20 px');
  console.log('-'.repeat(72));
  console.log('1 contrôle, aucune anomalie.');
  console.log('');
  process.exit(0);
}

for (const suspect of suspects) {
  const chemin = relative(RACINE_PROJET, suspect.fichier).replaceAll('\\', '/');
  const origine =
    suspect.famille === 'didone-heritee'
      ? 'didone HÉRITÉE de la règle h1..h4 de @layer base'
      : 'didone écrite (font-titre)';
  const mesure = suspect.taille.heritee
    ? `taille héritée, supposée ${String(TAILLE_HERITEE)} px`
    : `${String(suspect.taille.pixels)} px`;

  console.log(
    `  ÉCHEC  ${chemin}:${String(suspect.ligne)} <${suspect.balise}> — ${origine}, ${mesure}`,
  );
}

console.log('-'.repeat(72));
console.log(
  `1 contrôle, ${String(suspects.length)} anomalie(s).\n` +
    '  Une didone sous 20 px perd ses déliés : le titre devient gris et cesse\n' +
    '  de se lire. Corriger en posant la famille qui convient au rôle —\n' +
    '  `etiquette` pour un libellé sériel, `sous-titre` pour un sous-titre de\n' +
    '  prose — ou en montant la taille au-dessus du plancher.',
);
console.log('');
process.exit(1);
