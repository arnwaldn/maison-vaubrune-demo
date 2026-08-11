/**
 * LE SOUS-ENSEMBLAGE DE LA MONO — `npm run preparer-police-mono`
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE SCRIPT EXISTE (recommandation ferme du relecteur de C13, item C4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C13 a fait entrer la troisième voix du trio sur le chemin critique : le
 * registre et les étiquettes rendent de la Spline Sans Mono, que personne ne
 * téléchargeait avant. Le coût a été mesuré, pas estimé — **36 476 octets par
 * page**, et la note de rapidité est tombée de 98 à 96 sur les trois pages
 * mesurées (FCP 1,5 → 1,7 s, LCP 2,2-2,4 → 2,6 s).
 *
 * Six points au-dessus du seuil D36, c'est tenable. Ce qui ne l'est pas, c'est
 * que C14 pose les IMAGES sur ce même chemin critique. La marge se referme par
 * les deux bouts, et le relecteur de C13 a nommé ce fichier comme « le seul
 * gisement d'un ordre de grandeur restant sur ce socle ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DEUX LEVIERS, ET C'EST LE SECOND QUI PAIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mesuré sur le fichier réel, à répertoire constant (160 glyphes) :
 *
 * | Fichier                                   | Octets | Écart    |
 * |-------------------------------------------|--------|----------|
 * | @fontsource-variable, latin, wght 300-700 | 36 476 | référence|
 * | sous-ensemblé, axe 300-700 CONSERVÉ       | 24 048 | −34 %    |
 * | sous-ensemblé, axe RESTREINT à 400-500    | 13 176 | −64 %    |
 * | sous-ensemblé, instance statique 400      |  7 988 | −78 %    |
 *
 * Le sous-ensemblage seul ne rend qu'un tiers : la table `gvar` d'une police
 * variable porte les deltas de TOUTE la plage de graisse, et cette plage pèse
 * plus que les glyphes qu'on retire. Restreindre l'axe à ce que le site emploie
 * réellement — 400 pour le registre, 500 pour l'étiquette — divise le fichier
 * par près de trois.
 *
 * **L'instance statique n'est PAS retenue**, bien qu'elle soit la plus légère.
 * Il en faudrait DEUX (400 et 500) : 15 908 octets à elles deux, soit plus que
 * le fichier variable à axe restreint, ET une requête de plus sur le chemin
 * critique. Un axe de cent unités coûte moins cher que le doublon.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'AXE N'EST PAS ÉCRIT ICI : IL EST LU DANS LA FEUILLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la leçon de C13, appliquée : *contrôler la propriété, pas son indice.*
 * Écrire « 400 500 » en dur dans ce script ferait de la plage une CONSTANTE DE
 * PLUS à tenir à jour — et le jour où une tranche donnerait une troisième
 * graisse à la mono, personne ne penserait à revenir ici. La police se
 * recomposerait alors sans erreur, à la graisse la plus proche, silencieusement.
 *
 * Le script lit donc `src/app/globals.css`, retient les blocs `@utility` dont le
 * corps pose `font-family: var(--font-mono)`, résout leur `font-weight` dans les
 * jetons `--text-*--font-weight`, et instancie l'axe sur l'intervalle ainsi
 * TROUVÉ. Il vérifie ensuite que `src/app/polices.ts` déclare exactement cette
 * plage — sans quoi la déclaration CSS mentirait sur le fichier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE RÉPERTOIRE EST DÉCLARÉ, PAS MESURÉ — ET C'EST UN ARBITRAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La commande de tranche demandait « ~80 glyphes réellement employés par la
 * coquille ». Le relevé au navigateur (`preuves/c14/releve-c14.mjs`, qui
 * interroge la police EFFECTIVEMENT calculée nœud de texte par nœud de texte,
 * capitales fabriquées par `text-transform` comprises) en trouve 64 sur les
 * vingt-trois routes du site.
 *
 * **Et ce relevé de 64 caractères ne contient ni 7, ni 8, ni 9.** C'est le
 * meilleur argument possible contre le sous-ensemble mesuré, et il n'a pas eu
 * besoin d'être imaginé : les chiffres qui rendent ce jour-là sont ceux des
 * dates, des références et des compteurs du jeu d'essai. Une police taillée sur
 * ce relevé afficherait un carré blanc — ou pire, un repli à une autre chasse —
 * le premier jour où une commande porterait un 7.
 *
 * Le motif est celui de toutes les gardes de ce dépôt : **un sous-ensemble calé
 * sur le rendu du jour est une mine posée sous les tranches suivantes.** C15
 * rebrandit quinze fiches, C16 le tunnel et les pages légales, C19 réécrit des
 * textes ; un glyphe manquant ne casse pas la page, il la recompose dans le
 * repli à des largeurs différentes — c'est-à-dire exactement le défaut de
 * décalage cumulé que C13 a payé 0,0089 pour comprendre.
 *
 * Le répertoire retenu est donc FERMÉ et DÉCLARATIF : tout ce que la
 * convention D11 autorise ce projet à écrire — 143 points de code, 160 glyphes
 * une fois les composés comptés. Il coûte quelques kilooctets de plus que le
 * strict nécessaire du jour, sur vingt-deux économisés, et il ne dépend
 * d'aucun texte particulier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI GARANTIT QUE LE DÉCALAGE CUMULÉ NE BOUGE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `adjustFontFallback` engendre un repli dont `size-adjust`,
 * `ascent-override`, `descent-override` et `line-gap-override` sont calculés à
 * partir des métriques du fichier. Sous-ensembler un fichier peut donc, en
 * principe, DÉPLACER le repli et rouvrir le décalage que C12 avait fermé.
 *
 * Ici, il ne le peut pas, et la raison est structurelle plutôt que chanceuse :
 * `size-adjust` dépend de la CHASSE MOYENNE, calculée sur un échantillon de
 * lettres latines minuscules et de l'espace, pondéré par leur fréquence. Sur
 * une police à CHASSE FIXE, toutes ces lettres ont la même avance — 1200 sur
 * 2000 unités —, et l'échantillon entier appartient au répertoire déclaré.
 * Vérifié aux tables : les 27 caractères de l'échantillon sont présents dans
 * les deux fichiers, tous à 1200, `unitsPerEm` 2000 et instance par défaut
 * wght=400 de part et d'autre. Les autres métriques (ascender 1927, descender
 * −473, gap 0, hauteur d'œil 1091, hauteur de capitale 1454) traversent le
 * sous-ensemblage inchangées.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  OUTIL DE POSTE, JAMAIS RUNTIME NI CI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `pyftsubset` (fontTools) est appelé par ce script, à la main, quand la
 * police ou les graisses changent. Le RÉSULTAT est versionné — comme les
 * images de C14, et pour la même raison : la construction et l'intégration
 * continue ne doivent dépendre ni de Python, ni de fontTools, ni du réseau.
 * `npm run controle` n'appelle jamais ce fichier.
 *
 * Usage : `npm run preparer-police-mono` (ajouter `--verifier` pour contrôler
 * sans réécrire — c'est ce que fait la relecture d'une tranche).
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));

const SOURCE = join(
  RACINE,
  'node_modules',
  '@fontsource-variable',
  'spline-sans-mono',
  'files',
  'spline-sans-mono-latin-wght-normal.woff2',
);

const DESTINATION = join(RACINE, 'src', 'polices', 'spline-sans-mono-registre.woff2');

const GLOBALS = join(RACINE, 'src', 'app', 'globals.css');
const POLICES = join(RACINE, 'src', 'app', 'polices.ts');

/* -------------------------------------------------------------------------- */
/* Le répertoire de caractères, énuméré et motivé                              */
/* -------------------------------------------------------------------------- */

/**
 * LES PLAGES RETENUES, chacune avec ce qu'elle sert.
 *
 * Écrites en plages Unicode et non en caractères : une liste de caractères
 * dans un fichier source finit par se faire normaliser, réencoder ou tronquer
 * par un outil qui passe. Des points de code traversent tout.
 */
const REPERTOIRE = [
  {
    plage: 'U+0020-007E',
    sert: 'l’ASCII imprimable — lettres, chiffres, ponctuation, symboles du registre',
  },
  { plage: 'U+00A0', sert: 'l’espace insécable, posée par `typographier()` (D11)' },
  { plage: 'U+00A9', sert: 'le symbole de copyright du pied de page' },
  { plage: 'U+00AB,U+00BB', sert: 'les guillemets français (D11)' },
  { plage: 'U+00B0', sert: 'le degré — températures de conservation' },
  {
    plage:
      'U+00C0,U+00C2,U+00C4,U+00C6,U+00C7,U+00C8,U+00C9,U+00CA,U+00CB,U+00CE,U+00CF,U+00D4,U+00D6,U+00D9,U+00DB,U+00DC,U+0178',
    sert: 'les CAPITALES accentuées — `etiquette` pose `text-transform: uppercase`, c’est elle qui les fabrique',
  },
  {
    plage:
      'U+00E0,U+00E2,U+00E4,U+00E6,U+00E7,U+00E8,U+00E9,U+00EA,U+00EB,U+00EE,U+00EF,U+00F4,U+00F6,U+00F9,U+00FB,U+00FC,U+00FF',
    sert: 'les minuscules accentuées du français',
  },
  { plage: 'U+0152,U+0153', sert: 'la ligature œ (D11)' },
  { plage: 'U+2013,U+2014', sert: 'les tirets demi-cadratin et cadratin' },
  {
    plage: 'U+2018,U+2019,U+201C,U+201D',
    sert: 'l’apostrophe typographique et les guillemets anglais (D11)',
  },
  { plage: 'U+2026', sert: 'les points de suspension' },
  { plage: 'U+202F', sert: 'l’espace fine insécable' },
  { plage: 'U+20AC', sert: 'l’euro — le registre écrit des prix' },
];

const UNICODES = REPERTOIRE.map((entree) => entree.plage).join(',');

/**
 * LES ABSENCES CONNUES — et le contrôle qui les empêche de devenir des excuses.
 *
 * Le round 1 de C14 a trouvé l'écart : le répertoire ci-dessus DÉCLARE 145
 * points de code, le fichier produit en porte 143. Deux manquaient, en silence,
 * parce que `pyftsubset` n'invente pas ce que la source n'a pas — il garde ce
 * qu'on lui demande ET qui existe.
 *
 * Les deux sont ici, avec leur motif, et ce ne sont pas les mêmes cas :
 *
 *   - U+0178 (Ÿ) est dans le fichier `latin-ext` de @fontsource, pas dans le
 *     `latin` d'où l'on part. Le prendre supposerait de fusionner deux sources
 *     pour une capitale que le français n'écrit guère qu'à Aÿ et L'Haÿ ;
 *   - U+202F (espace fine insécable) n'est dans AUCUN des deux. La famille ne
 *     l'a pas, et ne l'avait pas davantage avant le sous-ensemblage : ce n'est
 *     pas une perte de cette tranche, c'est un fait de la police. Là où une
 *     fine insécable tombe dans du texte en mono, le navigateur va la chercher
 *     ailleurs — une chasse de plus dans une ligne à chasse fixe.
 *
 * Ce qui rend cette liste honnête, c'est qu'elle est VÉRIFIÉE : le contrôle
 * relit la SOURCE, et une absence déclarée dont la source porte pourtant le
 * glyphe fait échouer la préparation. L'exemption est accordée à un fait, pas à
 * un nom — c'est la règle de la décision D30, transposée aux polices.
 */
const ABSENCES_CONNUES = [
  {
    point: 0x0178,
    nom: 'Ÿ',
    motif: 'absent du fichier « latin » de @fontsource (il est dans « latin-ext »)',
  },
  {
    point: 0x202f,
    nom: 'espace fine insécable',
    motif: 'absent de TOUS les fichiers de la famille — la police ne le dessine pas',
  },
];

/* -------------------------------------------------------------------------- */
/* La plage de graisse, LUE dans la feuille                                    */
/* -------------------------------------------------------------------------- */

/**
 * Les graisses auxquelles la mono est réellement rendue.
 *
 * On lit les blocs `@utility` de `globals.css`, on ne garde que ceux qui posent
 * `font-family: var(--font-mono)`, et on résout leur `font-weight` : soit un
 * nombre écrit tel quel, soit une référence `var(--text-X--font-weight)` qu'on
 * va chercher dans le bloc `@theme`.
 *
 * @returns {{ graisses: number[], utilitaires: string[] }}
 */
function graissesDeLaMono() {
  const feuille = readFileSync(GLOBALS, 'utf8');

  /* Les jetons de graisse du thème, par nom complet. */
  const jetons = new Map();

  for (const trouve of feuille.matchAll(/(--text-[\w-]+--font-weight)\s*:\s*(\d+)/g)) {
    jetons.set(trouve[1], Number(trouve[2]));
  }

  const graisses = new Set();
  const utilitaires = [];

  /* Un bloc `@utility <nom> { … }` : le corps ne contient pas d'accolade
     imbriquée dans ce fichier, ce qui rend la lecture non ambiguë. Le jour où
     il en contiendrait une, ce script échouerait bruyamment en ne trouvant
     aucune graisse — et non silencieusement en en trouvant de mauvaises. */
  for (const bloc of feuille.matchAll(/@utility\s+([\w-]+)\s*\{([^{}]*)\}/g)) {
    const [, nom, corps] = bloc;

    if (!corps.includes('font-family: var(--font-mono)')) {
      continue;
    }

    utilitaires.push(nom);

    const direct = /font-weight\s*:\s*(\d+)/.exec(corps);

    if (direct !== null) {
      graisses.add(Number(direct[1]));
      continue;
    }

    const indirect = /font-weight\s*:\s*var\((--text-[\w-]+--font-weight)\)/.exec(corps);
    const valeur = indirect === null ? undefined : jetons.get(indirect[1]);

    if (valeur === undefined) {
      throw new Error(
        `l’utilitaire « ${nom} » pose la mono sans graisse résoluble — ` +
          'la plage de l’axe ne peut pas être déduite, et l’écrire en dur ici ' +
          'reviendrait à la laisser diverger de la feuille',
      );
    }

    graisses.add(valeur);
  }

  if (graisses.size === 0) {
    throw new Error(
      'aucun utilitaire de globals.css ne pose `font-family: var(--font-mono)` — ' +
        'soit la feuille a changé de forme, soit la mono n’est plus employée',
    );
  }

  return { graisses: [...graisses].sort((a, b) => a - b), utilitaires };
}

/* -------------------------------------------------------------------------- */
/* L'interpréteur Python et fontTools                                          */
/* -------------------------------------------------------------------------- */

/**
 * Le premier interpréteur qui répond ET qui porte fontTools.
 *
 * Trois noms possibles selon le système ; on ne se contente pas de trouver
 * Python, on vérifie que `fontTools` et `brotli` (l'encodeur woff2) y sont —
 * un `pyftsubset` sans brotli échoue au dernier moment, après tout le travail.
 */
function interpreteur() {
  for (const commande of ['python', 'python3', 'py']) {
    try {
      execFileSync(commande, ['-c', 'import fontTools, brotli'], { stdio: 'ignore' });
      return commande;
    } catch {
      /* Interpréteur absent ou dépourvu de fontTools : on essaie le suivant. */
    }
  }

  throw new Error(
    'fontTools est introuvable. Ce script est un OUTIL DE POSTE : installez-le\n' +
      '   sur la machine qui prépare la police, jamais dans le graphe du projet —\n' +
      '       python -m pip install "fontTools[woff]"\n' +
      '   La police sous-ensemblée est VERSIONNÉE : ni la construction ni\n' +
      '   l’intégration continue n’ont besoin de Python.',
  );
}

/* -------------------------------------------------------------------------- */
/* Fabrication                                                                 */
/* -------------------------------------------------------------------------- */

function octets(chemin) {
  return statSync(chemin).size;
}

function fabriquer(python, minimum, maximum) {
  const atelier = join(tmpdir(), `mono-vaubrune-${String(process.pid)}`);
  mkdirSync(atelier, { recursive: true });

  const intermediaire = join(atelier, 'axe-restreint.ttf');

  /* ÉTAPE 1 — restreindre l'axe de graisse. C'est le levier qui paie : la
     table `gvar` cesse de porter les deltas de 300 à 700 pour ne plus porter
     que ceux de la plage employée. */
  execFileSync(
    python,
    [
      '-m',
      'fontTools.varLib.instancer',
      SOURCE,
      `wght=${String(minimum)}:${String(maximum)}`,
      '-o',
      intermediaire,
    ],
    { stdio: 'ignore' },
  );

  /* ÉTAPE 2 — ne garder que le répertoire déclaré, et réencoder en woff2.
     `--layout-features=''` retire les fonctionnalités OpenType facultatives :
     sur une chasse fixe, ligatures et crénage n'ont pas d'emploi. */
  execFileSync(
    python,
    [
      '-m',
      'fontTools.subset',
      intermediaire,
      `--unicodes=${UNICODES}`,
      '--layout-features=',
      '--flavor=woff2',
      `--output-file=${DESTINATION}`,
    ],
    { stdio: 'ignore' },
  );

  return DESTINATION;
}

/* -------------------------------------------------------------------------- */
/* Contrôle : le fichier porte-t-il les caractères qu'on a déclarés ?          */
/* -------------------------------------------------------------------------- */

/** Les points de code que déclare le répertoire, plages développées. */
function pointsDeclares() {
  const points = new Set();

  for (const { plage } of REPERTOIRE) {
    for (const morceau of plage.split(',')) {
      const bornes = morceau.replace(/^U\+/u, '').split('-');
      const debut = Number.parseInt(bornes[0], 16);
      const fin = bornes.length > 1 ? Number.parseInt(bornes[1], 16) : debut;

      for (let point = debut; point <= fin; point += 1) points.add(point);
    }
  }

  return points;
}

/** Les points de code réellement présents dans un woff2, lus par fontTools. */
function pointsDuFichier(python, chemin) {
  const sortie = execFileSync(
    python,
    [
      '-c',
      'import sys\n' +
        'from fontTools.ttLib import TTFont\n' +
        'print(" ".join(str(p) for p in sorted(TTFont(sys.argv[1]).getBestCmap())))',
      chemin,
    ],
    { encoding: 'utf8' },
  ).trim();

  return new Set(sortie === '' ? [] : sortie.split(' ').map(Number));
}

function enHexa(point) {
  return `U+${point.toString(16).toUpperCase().padStart(4, '0')}`;
}

/**
 * LE CONTRÔLE cmap — déclaré contre réel.
 *
 * Il existe parce que le compte ne tombait pas juste et que personne ne le
 * comptait : 145 points déclarés, 143 livrés. `pyftsubset` ne se plaint pas
 * d'un caractère qu'il ne trouve pas dans la source — il le laisse dehors, et
 * le fichier produit est parfaitement valide, simplement incomplet. C'est la
 * forme de panne la plus coûteuse : rien n'échoue, et un jour un glyphe
 * manquant fait basculer un mot dans la police de repli, à une autre chasse.
 *
 * Deux écarts, deux traitements :
 *
 *   - déclaré, absent du produit, ALORS QUE LA SOURCE L'A → ÉCHEC. C'est le
 *     sous-ensemblage qui a perdu quelque chose ;
 *   - déclaré, absent du produit ET de la source → l'absence doit figurer dans
 *     `ABSENCES_CONNUES`, sinon ÉCHEC. Et une absence déclarée que la source
 *     porte pourtant fait ÉCHEC elle aussi : une exemption qui ne sert plus
 *     doit tomber, sans quoi la liste s'allonge jusqu'à ne plus rien garder.
 *
 * @returns {string[]} les anomalies, vides si tout concorde
 */
function verifierRepertoire(python) {
  const declares = pointsDeclares();
  const source = pointsDuFichier(python, SOURCE);
  const produit = pointsDuFichier(python, DESTINATION);
  const connues = new Map(ABSENCES_CONNUES.map((absence) => [absence.point, absence]));
  const anomalies = [];

  for (const point of [...declares].sort((a, b) => a - b)) {
    if (produit.has(point)) {
      continue;
    }

    if (source.has(point)) {
      anomalies.push(
        `${enHexa(point)} est déclaré au répertoire et présent dans la source, ` +
          'mais absent du fichier produit — le sous-ensemblage l’a perdu',
      );
      continue;
    }

    if (!connues.has(point)) {
      anomalies.push(
        `${enHexa(point)} est déclaré au répertoire et absent de la source : ` +
          'ajoutez-le à ABSENCES_CONNUES avec son motif, ou retirez-le du répertoire',
      );
    }
  }

  for (const absence of ABSENCES_CONNUES) {
    if (source.has(absence.point)) {
      anomalies.push(
        `${enHexa(absence.point)} (${absence.nom}) est inscrit aux absences connues ` +
          'alors que la source le porte désormais : l’exemption ne sert plus, retirez-la',
      );
    }
  }

  return {
    anomalies,
    declares: declares.size,
    produits: produit.size,
    absences: ABSENCES_CONNUES.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Contrôle : la déclaration doit dire la même chose que le fichier            */
/* -------------------------------------------------------------------------- */

/**
 * `polices.ts` déclare-t-il la bonne plage, et pointe-t-il le bon fichier ?
 *
 * Une @font-face qui annonce `font-weight: 300 700` au-dessus d'un fichier dont
 * l'axe s'arrête à 500 n'échoue nulle part : le navigateur borne la valeur et
 * rend un poids qui n'est pas celui demandé. C'est le genre de mensonge muet
 * qu'on ne trouve qu'en le cherchant, donc on le cherche.
 *
 * @returns {string[]} les anomalies, vides si tout concorde
 */
function verifierDeclaration(minimum, maximum) {
  const source = readFileSync(POLICES, 'utf8');
  const anomalies = [];

  const bloc = /export const policeMono = localFont\(\{([\s\S]*?)\}\);/.exec(source);

  if (bloc === null) {
    return ['src/app/polices.ts : bloc `policeMono` introuvable'];
  }

  const corps = bloc[1];
  const attendu = `${String(minimum)} ${String(maximum)}`;
  const graisse = /weight:\s*'([^']*)'/.exec(corps);

  if (graisse === null || graisse[1] !== attendu) {
    anomalies.push(
      `src/app/polices.ts : la mono déclare « ${graisse?.[1] ?? '(rien)'} » ` +
        `alors que le fichier porte l’axe « ${attendu} »`,
    );
  }

  if (!corps.includes('spline-sans-mono-registre.woff2')) {
    anomalies.push(
      'src/app/polices.ts : la mono ne pointe pas le fichier sous-ensemblé ' +
        '(`src/polices/spline-sans-mono-registre.woff2`)',
    );
  }

  return anomalies;
}

/* -------------------------------------------------------------------------- */
/* Exécution                                                                   */
/* -------------------------------------------------------------------------- */

const verifierSeulement = process.argv.includes('--verifier');

console.log('');
console.log('Préparation de la mono du registre — sous-ensemblage et axe restreint');
console.log('-'.repeat(72));

try {
  const { graisses, utilitaires } = graissesDeLaMono();
  const minimum = graisses[0];
  const maximum = graisses[graisses.length - 1];

  console.log(
    `          utilitaires en mono : ${utilitaires.join(', ')} ` +
      `→ graisses ${graisses.join(' et ')}`,
  );
  console.log(`          répertoire déclaré : ${String(REPERTOIRE.length)} plages`);

  const avant = octets(SOURCE);
  const python = interpreteur();

  if (!verifierSeulement) {
    mkdirSync(join(DESTINATION, '..'), { recursive: true });
    fabriquer(python, minimum, maximum);
  }

  const apres = octets(DESTINATION);
  const gain = avant - apres;

  console.log(
    `[ OK   ] ${String(avant)} octets → ${String(apres)} octets ` +
      `(${(gain / 1024).toFixed(1)} Ko de moins par page, ${((gain / avant) * 100).toFixed(0)} %)`,
  );
  console.log(`          ${DESTINATION.split(sep).join('/').replace(`${RACINE.split(sep).join('/')}/`, '')}`);

  const repertoire = verifierRepertoire(python);

  console.log(
    `${repertoire.anomalies.length === 0 ? '[ OK   ]' : '[ ÉCHEC]'} répertoire : ` +
      `${String(repertoire.declares)} points de code déclarés, ${String(repertoire.produits)} dans le ` +
      `fichier, ${String(repertoire.absences)} absence(s) connue(s) de la source`,
  );

  for (const absence of ABSENCES_CONNUES) {
    console.log(`          ${enHexa(absence.point)} ${absence.nom} — ${absence.motif}`);
  }

  const anomalies = [...repertoire.anomalies, ...verifierDeclaration(minimum, maximum)];

  for (const anomalie of anomalies) {
    console.log(`[ ÉCHEC] ${anomalie}`);
  }

  console.log('-'.repeat(72));

  if (anomalies.length > 0) {
    console.log(`${String(anomalies.length)} anomalie(s) de déclaration.`);
    console.log('');
    process.exit(1);
  }

  console.log('Déclaration et fichier concordent.');
  console.log('');
} catch (erreur) {
  console.log(`[ ÉCHEC] ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  console.log('-'.repeat(72));
  console.log('');
  process.exit(1);
}

/* Rien d'exporté : ce fichier est une commande, pas un module. */
export {};
