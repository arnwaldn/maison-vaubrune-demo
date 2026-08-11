/**
 * LE MARBRE DE LA MAISON — outil de poste (`npm run preparer-marbre`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE SCRIPT REMPLACE `preuves/c19/marbre-coquille.mjs`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première mouture visait un plancher de 236 sur 255 — dix-neuf niveaux de
 * marge pour toute la matière. Elle a rendu, MESURÉ SUR LES OCTETS LIVRÉS, un
 * pixel le plus sombre à #e8e2d6, c'est-à-dire un plancher EFFECTIF de 244 :
 * un écart de dix points de luminance là où on en avait demandé dix-neuf.
 * Le client n'a rien vu, et il avait raison de ne rien voir.
 *
 * DEUX CAUSES, ET LES DEUX SONT ÉVITABLES :
 *
 *   1. L'AFFINE PARTAIT DE L'EXTRÊME. `a·min + b = plancher` cale la droite
 *      sur le pixel le PLUS SOMBRE de la source — un point isolé, souvent un
 *      seul pixel. Tout le reste des veines se retrouve écrasé bien au-dessus
 *      du plancher : la marge est dépensée par un pixel que personne ne voit.
 *      Ici la droite est calée sur des PERCENTILES (0,4 % et 99,6 %), et ce qui
 *      dépasse est écrêté. Le plancher est alors atteint par une POPULATION de
 *      pixels, pas par un accident.
 *
 *   2. L'ENCODEUR MANGE UNE AMPLITUDE ÉTROITE. Un AVIF avec pertes quantifie ;
 *      sur dix-neuf niveaux utiles, sa marche de quantification est du même
 *      ordre que le signal, et il aplatit. C'est la cause du 244 mesuré.
 *      La parade est structurelle : ON STOCKE LE MARBRE À FORTE AMPLITUDE
 *      (plancher 145, soit cent dix niveaux) et on le RAMÈNE à l'amplitude
 *      voulue DANS LA FEUILLE DE STYLE, par un voile de coquille. Le bruit de
 *      quantification est divisé par la même chose que le signal.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE LE VOILE FAIT, EN UNE LIGNE D'ALGÈBRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La tuile est un PRODUIT du gris `g` par la coquille : pixel = coquille·g/255.
 * La feuille pose par-dessus un aplat de coquille d'opacité (1 − o) :
 *
 *     rendu = (1−o)·coquille + o·coquille·g/255 = coquille·(255 − o·(255−g))/255
 *
 * autrement dit un gris effectif  g' = 255 − o·(255 − g). L'écart au champ est
 * donc EXACTEMENT proportionnel à `o` : `--marbre-opacite` est un vrai curseur
 * linéaire, et ±30 % dessus vaut ±30 % d'écart, sans retoucher l'image.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE RACCORD — DEUX FONDUS, AUCUN MIROIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première mouture se raccordait par MIROIR : quatre quartiers symétriques,
 * bords identiques par construction. C'est imparable et ça se paie — un losange
 * apparaît au centre, et il se voit d'autant plus que la matière est visible.
 * L'écart était déclaré ; il n'est plus tenable maintenant qu'on veut voir la
 * matière.
 *
 * Ici, le raccord se fait par FONDU ENROULÉ, sur les deux axes. Pour l'axe des
 * ordonnées, avec une bande de recouvrement B et une tuile de hauteur
 * Ht = H − B :
 *
 *     tuile(y) = I(y)                                        pour y ≥ B
 *     tuile(y) = mélange( I(y + Ht) , I(y) , lissage(y/B) )   pour y < B
 *
 * La ligne du bas de la tuile est I(Ht−1) et la ligne du haut de la suivante
 * vaut I(Ht) : deux lignes VOISINES DANS LA SOURCE, donc continues. Aucune
 * symétrie n'est introduite, et le prix se limite à une bande de mélange.
 * La continuité est VÉRIFIÉE sur les octets produits, jamais supposée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI BORNE LE PLANCHER — ET CE QUI A CESSÉ DE LE BORNER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pendant trois moutures, le plancher du marbre était borné par L'OCRE DES
 * ÉTIQUETTES (#7A5714) à 4,50 : il fallait un fond de luminance ≥ 0,670 sous
 * le moindre mot de douze pixels, donc une veine la plus sombre autour de
 * #E2DCD2, donc un marbre qu'on ne voit pas. LA CONTRAINTE N'ÉTAIT PAS DANS LA
 * MATIÈRE, ELLE ÉTAIT DANS CE QU'ON POSAIT DESSUS — et c'est là qu'elle a été
 * levée : plus aucun petit texte du site ne repose sur le marbre autrement
 * qu'en `--color-encre`. Les étiquettes, les chapeaux, les fils d'Ariane et
 * les lignes de registre sont passés à l'encre ou sur un panneau ; le
 * recensement qui le prouve, page par page, est celui de
 * `preuves/c19/marbre-in-vivo.mjs`, et il porte sur DIX-HUIT pages.
 *
 * CHAQUE ENCRE PORTE DÉSORMAIS LE SEUIL DE CE QU'ELLE PORTE, et c'est la
 * doctrine de ce fichier. Un seuil unique pour toute la palette disait
 * forcément faux d'un côté ou de l'autre : trop dur pour une encre qui ne
 * paraît qu'en grand sur la matière, trop mou pour celle qui y écrit en douze
 * pixels. Le drapeau `petitSurMarbre` de chaque encre décide donc :
 *
 *   · 4,50 pour celles qui posent du PETIT texte sur le marbre — aujourd'hui
 *     l'encre (chapeaux, fils d'Ariane, registres) et l'ocre (étiquettes
 *     d'ouverture) ;
 *   · 3,00 pour celles qui n'y paraissent qu'en grand ou sur un panneau —
 *     l'encre douce et le bleu.
 *
 * Le script REFUSE de rendre vert si l'une des quatre passe sous SON seuil, et
 * il refuse aussi si le réglage livré dépasse la butée qu'il vient de calculer.
 *
 * LA BUTÉE DU CURSEUR EST CALCULÉE, PAS RELEVÉE. Pour chaque encre, une
 * dichotomie cherche le voile où son contraste passe exactement sous son
 * seuil ; la butée du fichier est le minimum des quatre, et l'encre qui la
 * tient est NOMMÉE — c'est elle qu'il faudrait reprendre le jour où le client
 * voudrait aller plus loin. Un tableau à cinq crans dit « entre 0,50 et
 * 0,60 » ; la dichotomie dit 0,55. Dans cette plage, le client règle la
 * matière comme il l'entend sans qu'aucune vérification d'accessibilité soit à
 * refaire — c'est exactement ce qu'on lui doit après quatre allers-retours.
 *
 * Emploi :  npm run preparer-marbre
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

const SOURCE = 'travaux-images/marbre/marbre-source.png';
const DOSSIER = 'public/fond';
const SORTIE_AVIF = `${DOSSIER}/marbre-coquille.avif`;
const SORTIE_JPEG = `${DOSSIER}/marbre-coquille.jpg`;
const RELEVE = 'preuves/c19/marbre-matiere.txt';

/* ------------------------------------------------------------------------- */
/* LES RÉGLAGES, ET LE MOTIF DE CHACUN                                        */
/* ------------------------------------------------------------------------- */

/**
 * Le plancher de STOCKAGE, en niveaux de gris. Il n'est pas le plancher rendu :
 * la feuille divise l'amplitude par `--marbre-opacite`. Cent dix niveaux
 * donnent à l'encodeur largement de quoi travailler.
 *
 * QUATRIÈME ÉCRITURE — 176 → 145, ET LE MOTIF EST LA RÉFÉRENCE DU CLIENT.
 * La mouture précédente rendait 13,2 points d'écart veine-champ ; la référence
 * qu'il a fournie en porte 40 à 60 sur fond blanc, et il a dit une quatrième
 * fois « le marbre se devine à peine ». Le plancher de stockage et l'opacité
 * de la feuille se sont donc déplacés ENSEMBLE, sur la table mesurée qui suit
 * (source réelle, encodage réel, voile appliqué — jamais une extrapolation) :
 *
 *   plancher · opacité → écart 0,5ᵉ centile / pixel le plus sombre · ocre
 *       176   ·  0,50  →  30,1 / 40,2  ·  3,73
 *       160   ·  0,42  →  30,5 / 40,1  ·  3,73
 *       145   ·  0,42  →  35,4 / 45,4  ·  3,52
 *       145   ·  0,45  →  37,3 / 47,6  ·  3,44      ← RETENU
 *       130   ·  0,42  →  40,1 / 52,3  ·  3,26
 *       118   ·  0,36  →  38,1 / 49,0  ·  3,39
 *
 * Deux lignes donnent le même écart pour deux plancher/opacité différents
 * (176·0,50 et 160·0,42) : c'est la démonstration expérimentale de l'algèbre
 * ci-dessus — SEUL LE PRODUIT COMPTE. Le couple a donc été choisi sur les deux
 * critères qui les départagent : le poids de la tuile (il croît avec
 * l'amplitude stockée) et la MARGE DE CURSEUR qu'on laisse au client au-dessus
 * du réglage retenu. 145 laisse le curseur monter jusqu'à 0,50 en gardant les
 * quatre encres au-dessus du seuil GRAND TEXTE.
 */
const PLANCHER_STOCK = 145;

/**
 * L'opacité que la FEUILLE appliquera. Elle est écrite ici pour que le relevé
 * mesure ce que le visiteur verra, et elle doit rester d'accord avec le jeton
 * `--marbre-opacite` de `globals.css` — le contrôle de fin de script le dit.
 */
const OPACITE_FEUILLE = 0.45;

/** Les percentiles qui calent la droite. L'extrême est écrêté, pas suivi. */
const PERCENTILE_BAS = 0.004;
const PERCENTILE_HAUT = 0.996;

/** La bande de fondu, en fraction de la dimension. */
const BANDE = 0.16;

/** L'aplat que le marbre multiplie — jeton `--color-coquille`. */
const COQUILLE = [0xf2, 0xec, 0xe1];

const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

/* ------------------------------------------------------------------------- */
/* COLORIMÉTRIE                                                               */
/* ------------------------------------------------------------------------- */

const canal = (valeur) => {
  const v = valeur / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, v, b]) => 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
const contraste = (a, b) => {
  const [c, s] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
  return (luminance(c) + 0.05) / (luminance(s) + 0.05);
};
/** La luminance PERÇUE en niveaux 0-255 — c'est en ces points que l'écart se dit. */
const luma = ([r, v, b]) => 0.2126 * r + 0.7152 * v + 0.0722 * b;
const hex = (p) => `#${p.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/*
 * LES QUATRE ENCRES, ET CE QU'ELLES ONT LE DROIT DE PORTER SUR LA MATIÈRE.
 *
 * `petitSurMarbre` dit si le site pose du PETIT texte de cette encre-là
 * directement sur le marbre — c'est ce drapeau, et non un seuil unique, qui
 * décide de la butée du curseur.
 *
 * LES VALEURS SONT LUES DANS `globals.css`, JAMAIS RECOPIÉES ICI. Une copie
 * aurait tenu le temps d'une tranche : ce script existe pour dire quel écart
 * de matière une palette autorise, et une palette recopiée finit toujours par
 * décrire la palette d'avant. Le jour où quelqu'un descend l'ocre d'un cran de
 * plus, la butée se recalcule seule ; s'il retire un jeton, le script s'arrête
 * au lieu de mesurer une couleur qui n'existe plus. C'est la même règle que
 * `preparer-police-mono.mjs`, qui lit ses graisses dans la feuille depuis C14.
 */
const FEUILLE = readFileSync('src/app/globals.css', 'utf8');

const jeton = (nom) => {
  const trouve = new RegExp(`--color-${nom}:\\s*#([0-9a-fA-F]{6})\\s*;`).exec(FEUILLE);
  if (trouve === null) {
    throw new Error(`Le jeton --color-${nom} est introuvable dans globals.css.`);
  }
  return [0, 2, 4].map((rang) => Number.parseInt(trouve[1].slice(rang, rang + 2), 16));
};

const ENCRES = [
  { nom: 'encre', rvb: jeton('encre'), petitSurMarbre: true },
  { nom: 'encre douce', rvb: jeton('encre-douce'), petitSurMarbre: false },
  { nom: 'ocre (étiquettes)', rvb: jeton('ocre'), petitSurMarbre: true },
  { nom: 'bleu (chaîne du froid)', rvb: jeton('bleu'), petitSurMarbre: false },
];

dire('LE MARBRE DE LA MAISON — matière visible, contraste tenu');
dire('='.repeat(78));

/* ------------------------------------------------------------------------- */
/* 1. LA SOURCE, ET SES PERCENTILES                                           */
/* ------------------------------------------------------------------------- */

const gris = await sharp(SOURCE).greyscale().raw().toBuffer({ resolveWithObject: true });
const { width: LARGEUR_SOURCE, height: HAUTEUR_SOURCE } = gris.info;
const pixels = gris.data;

const histogramme = new Uint32Array(256);
for (const valeur of pixels) histogramme[valeur] += 1;

const percentile = (part) => {
  const cible = part * pixels.length;
  let cumul = 0;
  for (let niveau = 0; niveau < 256; niveau += 1) {
    cumul += histogramme[niveau];
    if (cumul >= cible) return niveau;
  }
  return 255;
};

const bas = percentile(PERCENTILE_BAS);
const haut = percentile(PERCENTILE_HAUT);

dire('');
dire(`  source : ${String(LARGEUR_SOURCE)} × ${String(HAUTEUR_SOURCE)}`);
dire(
  `  gris   : extrêmes ${String(percentile(0))} → ${String(percentile(1))}, ` +
    `percentiles ${(PERCENTILE_BAS * 100).toFixed(1)} % = ${String(bas)} ` +
    `et ${(PERCENTILE_HAUT * 100).toFixed(1)} % = ${String(haut)}`,
);
dire(
  `  L'ancienne mouture calait sur l'extrême (${String(percentile(0))}) : ` +
    `${String(bas - percentile(0))} niveaux de marge dépensés par une poignée de pixels.`,
);

/* ------------------------------------------------------------------------- */
/* 2. LA DROITE, ÉCRÊTÉE AUX DEUX BOUTS                                       */
/* ------------------------------------------------------------------------- */

const pente = (255 - PLANCHER_STOCK) / (haut - bas);
const ordonnee = 255 - haut * pente;

const etale = new Uint8Array(pixels.length);
for (let i = 0; i < pixels.length; i += 1) {
  const valeur = pixels[i] * pente + ordonnee;
  etale[i] = valeur < PLANCHER_STOCK ? PLANCHER_STOCK : valeur > 255 ? 255 : Math.round(valeur);
}

dire('');
dire(
  `  droite : a = ${pente.toFixed(4)}, b = ${ordonnee.toFixed(2)} ` +
    `→ stockage sur [${String(PLANCHER_STOCK)}, 255], soit ${String(255 - PLANCHER_STOCK)} niveaux`,
);

/* ------------------------------------------------------------------------- */
/* 3. LE FONDU ENROULÉ, SUR LES DEUX AXES                                     */
/* ------------------------------------------------------------------------- */

const lissage = (t) => t * t * (3 - 2 * t);

/** Enroule un plan mono-canal sur l'axe des abscisses. */
const enroulerX = (source, largeur, hauteur, bande) => {
  const largeurTuile = largeur - bande;
  const sortie = new Uint8Array(largeurTuile * hauteur);
  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeurTuile; x += 1) {
      const ici = source[y * largeur + x];
      if (x >= bande) {
        sortie[y * largeurTuile + x] = ici;
        continue;
      }
      const ailleurs = source[y * largeur + x + largeurTuile];
      const poids = lissage((x + 0.5) / bande);
      sortie[y * largeurTuile + x] = Math.round(ailleurs * (1 - poids) + ici * poids);
    }
  }
  return { data: sortie, largeur: largeurTuile, hauteur };
};

/** Enroule un plan mono-canal sur l'axe des ordonnées. */
const enroulerY = (source, largeur, hauteur, bande) => {
  const hauteurTuile = hauteur - bande;
  const sortie = new Uint8Array(largeur * hauteurTuile);
  for (let y = 0; y < hauteurTuile; y += 1) {
    const poids = y >= bande ? 1 : lissage((y + 0.5) / bande);
    for (let x = 0; x < largeur; x += 1) {
      const ici = source[y * largeur + x];
      if (y >= bande) {
        sortie[y * largeur + x] = ici;
        continue;
      }
      const ailleurs = source[(y + hauteurTuile) * largeur + x];
      sortie[y * largeur + x] = Math.round(ailleurs * (1 - poids) + ici * poids);
    }
  }
  return { data: sortie, largeur, hauteur: hauteurTuile };
};

const apresX = enroulerX(
  etale,
  LARGEUR_SOURCE,
  HAUTEUR_SOURCE,
  Math.round(LARGEUR_SOURCE * BANDE),
);
const tuileGrise = enroulerY(
  apresX.data,
  apresX.largeur,
  apresX.hauteur,
  Math.round(apresX.hauteur * BANDE),
);

dire('');
dire(
  `  tuile  : ${String(tuileGrise.largeur)} × ${String(tuileGrise.hauteur)} ` +
    `(bandes de fondu ${String(Math.round(LARGEUR_SOURCE * BANDE))} × ` +
    `${String(Math.round(apresX.hauteur * BANDE))}, aucun miroir)`,
);

/* ------------------------------------------------------------------------- */
/* 4. LE PRODUIT SUR LA COQUILLE                                              */
/* ------------------------------------------------------------------------- */

const teinte = Buffer.allocUnsafe(tuileGrise.largeur * tuileGrise.hauteur * 3);
for (let i = 0; i < tuileGrise.data.length; i += 1) {
  const facteur = tuileGrise.data[i] / 255;
  teinte[i * 3] = Math.round(COQUILLE[0] * facteur);
  teinte[i * 3 + 1] = Math.round(COQUILLE[1] * facteur);
  teinte[i * 3 + 2] = Math.round(COQUILLE[2] * facteur);
}

const tuile = sharp(teinte, {
  raw: { width: tuileGrise.largeur, height: tuileGrise.hauteur, channels: 3 },
});

/* ------------------------------------------------------------------------- */
/* 5. L'ENCODAGE                                                              */
/* ------------------------------------------------------------------------- */

mkdirSync(DOSSIER, { recursive: true });

const avif = await tuile.clone().avif({ quality: 62, effort: 7, chromaSubsampling: '4:4:4' }).toBuffer();
const jpeg = await tuile.clone().jpeg({ quality: 84, mozjpeg: true }).toBuffer();

writeFileSync(SORTIE_AVIF, avif);
writeFileSync(SORTIE_JPEG, jpeg);

dire('');
dire(
  `  poids  : AVIF ${(avif.length / 1024).toFixed(1)} Ko, repli JPEG ${(jpeg.length / 1024).toFixed(1)} Ko` +
    ' (payés sur toutes les pages : c’est un fond de `body`)',
);

/* ------------------------------------------------------------------------- */
/* 6. CE QUE LE VISITEUR VERRA — MESURÉ SUR LES OCTETS, VOILE COMPRIS         */
/* ------------------------------------------------------------------------- */

const rendu = await sharp(avif).raw().toBuffer({ resolveWithObject: true });
const canaux = rendu.info.channels;
const nombre = rendu.info.width * rendu.info.height;

/** Le voile de la feuille, appliqué ici pour que la mesure soit celle de l'écran. */
const voiler = (pixel) =>
  pixel.map((composante, index) =>
    (1 - OPACITE_FEUILLE) * COQUILLE[index] + OPACITE_FEUILLE * composante,
  );

const lumas = new Float64Array(nombre);
let plusSombre = null;
let plusClair = null;

for (let i = 0; i < nombre; i += 1) {
  const brut = [rendu.data[i * canaux], rendu.data[i * canaux + 1], rendu.data[i * canaux + 2]];
  const vu = voiler(brut);
  lumas[i] = luma(vu);
  if (plusSombre === null || lumas[i] < luma(plusSombre)) plusSombre = vu;
  if (plusClair === null || lumas[i] > luma(plusClair)) plusClair = vu;
}

const triees = Float64Array.from(lumas).sort();
const quantile = (part) => triees[Math.min(triees.length - 1, Math.floor(part * triees.length))];

const champ = quantile(0.97);
const veine = quantile(0.005);
const ecart = champ - veine;
const ecartExtreme = champ - luma(plusSombre);

dire('');
dire('  CE QUE VOIT L’ŒIL, VOILE DE LA FEUILLE APPLIQUÉ ' + `(--marbre-opacite: ${String(OPACITE_FEUILLE)})`);
dire(`    champ le plus clair          ${hex(plusClair)}  luma ${luma(plusClair).toFixed(1)}`);
dire(`    champ (97ᵉ centile)                    luma ${champ.toFixed(1)}`);
dire(`    veine (0,5ᵉ centile)                   luma ${veine.toFixed(1)}`);
dire(`    veine la plus sombre         ${hex(plusSombre)}  luma ${luma(plusSombre).toFixed(1)}`);
dire('');
dire(
  `    ÉCART CHAMP → VEINE          ${ecart.toFixed(1)} points sur 255   (cible 35 à 45 —` +
    ' la référence du client en porte 40 à 60 sur fond blanc)',
);
dire(`    écart au pixel le plus sombre ${ecartExtreme.toFixed(1)} points`);

/* La part de la surface qui porte réellement de la matière : un écart moyen ne
   dit rien si trois pixels le portent. */
const seuil = champ - 4;
let veines = 0;
for (let i = 0; i < nombre; i += 1) if (lumas[i] < seuil) veines += 1;
dire(
  `    surface à plus de 4 points sous le champ : ${((veines / nombre) * 100).toFixed(1)} %` +
    ' de la tuile',
);

/* ------------------------------------------------------------------------- */
/* 7. LES CONTRASTES, CONTRE LA VEINE LA PLUS SOMBRE RENDUE                   */
/* ------------------------------------------------------------------------- */

dire('');
dire('  LES QUATRE ENCRES CONTRE LA VEINE LA PLUS SOMBRE');
dire('    seuil 4,50 pour celles qui portent du PETIT texte sur la matière,');
dire('    3,00 pour celles qui n’y paraissent qu’en grand — voir l’en-tête du script.');

/** Le seuil que cette encre-là doit tenir sur le marbre, et rien d'autre. */
const seuilDe = (encre) => (encre.petitSurMarbre ? 4.5 : 3);

let echec = 0;
for (const encre of ENCRES) {
  const valeur = contraste(encre.rvb, plusSombre);
  const seuil = seuilDe(encre);
  if (valeur < seuil) echec += 1;
  const marge = valeur - seuil;
  dire(
    `    ${encre.nom.padEnd(26)} ${valeur.toFixed(2).padStart(6)}   ` +
      `seuil ${seuil.toFixed(2)}   ` +
      `marge ${(marge >= 0 ? '+' : '') + marge.toFixed(2)}   ` +
      `${encre.petitSurMarbre ? 'porte du petit texte sur le marbre' : 'jamais en petit sur le marbre'}`,
  );
}

dire('');
dire(
  echec === 0
    ? '  Les 4 encres tiennent leur seuil sur la veine la plus sombre.'
    : `  ${String(echec)} encre(s) sous son seuil — le plancher doit remonter.`,
);

/* ------------------------------------------------------------------------- */
/* 7 bis. LA BUTÉE DU CURSEUR, CALCULÉE PLUTÔT QUE RELEVÉE                    */
/* ------------------------------------------------------------------------- */

/*
 * JUSQU'OÙ LE CLIENT PEUT-IL POUSSER `--marbre-opacite` SANS QU'AUCUNE
 * VÉRIFICATION D'ACCESSIBILITÉ SOIT À REFAIRE ?
 *
 * La question a une réponse exacte, et il vaut mieux la calculer que la lire
 * dans un tableau à cinq crans — un tableau dit « entre 0,50 et 0,60 », le
 * calcul dit 0,53. La luminance du rendu décroît continûment avec `o` ; pour
 * chaque encre on cherche donc, par dichotomie, le `o` où son contraste passe
 * exactement sous son seuil. La butée du fichier est le MINIMUM des quatre, et
 * l'encre qui la tient est nommée : c'est elle qu'il faudrait reprendre le jour
 * où le client voudrait aller plus loin.
 */
const contrasteA = (encre, o) => {
  let sombre = null;
  for (let i = 0; i < nombre; i += 1) {
    const vu = [0, 1, 2].map((c) => (1 - o) * COQUILLE[c] + o * rendu.data[i * canaux + c]);
    if (sombre === null || luma(vu) < luma(sombre)) sombre = vu;
  }
  return contraste(encre.rvb, sombre);
};

/** Le plus grand `o` de [0, 1] où l'encre tient encore son seuil. */
const buteeDe = (encre) => {
  const seuil = seuilDe(encre);
  if (contrasteA(encre, 1) >= seuil) return 1;
  let bas = 0;
  let haut = 1;
  for (let tour = 0; tour < 12; tour += 1) {
    const milieu = (bas + haut) / 2;
    if (contrasteA(encre, milieu) >= seuil) bas = milieu;
    else haut = milieu;
  }
  return bas;
};

dire('');
dire('  LA BUTÉE DU CURSEUR — le plus haut `--marbre-opacite` que chaque encre supporte');
let butee = null;
for (const encre of ENCRES) {
  const valeur = buteeDe(encre);
  if (butee === null || valeur < butee.valeur) butee = { valeur, nom: encre.nom };
  dire(
    `    ${encre.nom.padEnd(26)} tient son seuil de ${seuilDe(encre).toFixed(2)} ` +
      `jusqu’à ${valeur.toFixed(2)}`,
  );
}
dire('');
dire(
  `    BUTÉE = ${butee.valeur.toFixed(2)}, tenue par « ${butee.nom} ». ` +
    `Réglage livré : ${OPACITE_FEUILLE.toFixed(2)}.`,
);
dire(
  OPACITE_FEUILLE <= butee.valeur
    ? `    Le curseur est LIBRE de 0 à ${butee.valeur.toFixed(2)} : dans cette plage, aucune\n` +
        '    vérification d’accessibilité n’est à refaire, quel que soit le réglage.'
    : '    LE RÉGLAGE LIVRÉ EST AU-DESSUS DE LA BUTÉE — il ne doit pas partir ainsi.',
);
if (OPACITE_FEUILLE > butee.valeur) echec += 1;

/* ------------------------------------------------------------------------- */
/* 8. LE RACCORD, VÉRIFIÉ SUR LES OCTETS                                      */
/* ------------------------------------------------------------------------- */

const { width: L, height: H } = rendu.info;
const lire = (x, y, c) => rendu.data[(y * L + x) * canaux + c];

/**
 * L'écart MOYEN entre deux lignes (ou deux colonnes) qui se font face, ramené
 * en points d'écran — c'est-à-dire multiplié par le voile. Un maximum ne dit
 * rien : il est tenu par un pixel. Une couture se voit parce qu'elle est
 * CONTINUE, donc c'est la moyenne qui la décrit.
 */
const ecartMoyenLignes = (yA, yB) => {
  let cumul = 0;
  for (let x = 0; x < L; x += 1) {
    for (let c = 0; c < 3; c += 1) cumul += Math.abs(lire(x, yA, c) - lire(x, yB, c));
  }
  return (cumul / (L * 3)) * OPACITE_FEUILLE;
};
const ecartMoyenColonnes = (xA, xB) => {
  let cumul = 0;
  for (let y = 0; y < H; y += 1) {
    for (let c = 0; c < 3; c += 1) cumul += Math.abs(lire(xA, y, c) - lire(xB, y, c));
  }
  return (cumul / (H * 3)) * OPACITE_FEUILLE;
};

const coutureVerticale = ecartMoyenColonnes(0, L - 1);
const coutureHorizontale = ecartMoyenLignes(0, H - 1);
const temoinColonnes = ecartMoyenColonnes(Math.floor(L / 2), Math.floor(L / 2) + 1);
const temoinLignes = ecartMoyenLignes(Math.floor(H / 2), Math.floor(H / 2) + 1);

dire('');
dire('  LE RACCORD — écart MOYEN des bords qui se touchent, en points d’écran');
dire(
  `    couture verticale   ${coutureVerticale.toFixed(2)}   ` +
    `témoin (2 colonnes voisines) ${temoinColonnes.toFixed(2)}`,
);
dire(
  `    couture horizontale ${coutureHorizontale.toFixed(2)}   ` +
    `témoin (2 lignes voisines)   ${temoinLignes.toFixed(2)}`,
);
const coutureVue = coutureVerticale > temoinColonnes * 2 || coutureHorizontale > temoinLignes * 2;
dire(
  coutureVue
    ? '    ATTENTION : une couture dépasse le double du bruit interne.'
    : '    Les coutures restent dans le bruit interne : aucune bande ne se verra.',
);

/* ------------------------------------------------------------------------- */
/* 9. LE CURSEUR — CE QUE DONNENT LES CRANS VOISINS                           */
/* ------------------------------------------------------------------------- */

dire('');
dire('  LE CURSEUR `--marbre-opacite` — la plage entière, sans reproduire l’image');
dire('    (les deux encres qui portent du petit texte sur la matière, seuil 4,50)');

for (const essai of [0.3, 0.36, 0.42, OPACITE_FEUILLE, 0.5, 0.6, 0.75, 1]) {
  let sombre = null;
  let clair = null;
  for (let i = 0; i < nombre; i += 1) {
    const vu = [0, 1, 2].map(
      (c) => (1 - essai) * COQUILLE[c] + essai * rendu.data[i * canaux + c],
    );
    if (sombre === null || luma(vu) < luma(sombre)) sombre = vu;
    if (clair === null || luma(vu) > luma(clair)) clair = vu;
  }
  const encreIci = contraste(ENCRES[0].rvb, sombre);
  const ocre = contraste(ENCRES[2].rvb, sombre);
  const drapeau =
    essai === OPACITE_FEUILLE
      ? '  ← retenu'
      : encreIci < 4.5
        ? '  (l’ENCRE elle-même passerait sous AA petit texte)'
        : ocre < 3
          ? '  (l’ocre passerait sous AA grand texte)'
          : '';
  dire(
    `    ${essai.toFixed(2)}  écart extrême ${(luma(clair) - luma(sombre)).toFixed(1).padStart(5)} pts   ` +
      `encre ${encreIci.toFixed(2)}   ocre ${ocre.toFixed(2)}${drapeau}`,
  );
}

/* ------------------------------------------------------------------------- */
/* 10. LA PLANCHE DE L'ŒIL — la tuile telle qu'elle sera vue                  */
/* ------------------------------------------------------------------------- */

const vue = Buffer.allocUnsafe(nombre * 3);
for (let i = 0; i < nombre; i += 1) {
  for (let c = 0; c < 3; c += 1) {
    vue[i * 3 + c] = Math.round(
      (1 - OPACITE_FEUILLE) * COQUILLE[c] + OPACITE_FEUILLE * rendu.data[i * canaux + c],
    );
  }
}
await sharp(vue, { raw: { width: L, height: H, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile('travaux-images/marbre/apercu-rendu.png');
dire('');
dire('  Aperçu du rendu (voile compris) : travaux-images/marbre/apercu-rendu.png');

if (echec > 0) process.exitCode = 1;

dire('');
writeFileSync(RELEVE, `${lignes.join('\n')}\n`, 'utf8');
console.log(`Relevé écrit dans ${RELEVE}`);
