/**
 * LE MARBRE DU CLIENT, RETRAVAILLÉ POUR LE SYSTÈME (addendum du 10/08).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ON NE PEUT PAS POSER TEL QUEL, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le client a engendré un marbre blanc (conforme à D35 : image ENGENDRÉE,
 * jamais une banque d'images). Posé brut, il ne va pas — et pas par goût :
 *
 * 1. IL EST FROID. Le marbre est un gris bleuté ; toute la maison est chaude
 *    (coquille #F2ECE1, papier des photographies #ECE5D8). Deux tons voisins
 *    de TEMPÉRATURES opposées se lisent comme une erreur de calibrage — c'est
 *    exactement le reproche que le grain de papier avait été posé pour régler
 *    en C19, entre le fond de page et le papier des photos.
 * 2. SES VEINES SONT TROP CONTRASTÉES. Une veine sombre qui passe sous une
 *    ligne de texte fait tomber le contraste de ce texte-là, et de lui seul :
 *    ni axe ni Lighthouse ne le verraient (ils lisent `background-color`, pas
 *    le pixel). Le seul contrôle qui vaille est celui du grain — on relève le
 *    pixel le plus SOMBRE réellement peint et on recalcule les ratios contre
 *    lui.
 * 3. IL NE SE RACCORDE PAS. Une image de fond posée sur un document long se
 *    répète ; si ses bords ne se raccordent pas, la couture se voit en bande.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES QUATRE GESTES, DANS CET ORDRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (a) DÉSATURATION. Le marbre est ramené au gris avant d'être reteint : sans
 *     cela, sa dominante froide survivrait sous la teinte chaude et donnerait
 *     un mélange sale.
 *
 * (b) COMPRESSION DES VEINES. Une transformation affine `a·x + b` remonte le
 *     point noir sans toucher au blanc : la texture reste, son amplitude
 *     tombe. Le coefficient est CALCULÉ à partir du plancher visé, lui-même
 *     déduit du contraste — pas choisi à l'œil (voir PLANCHER ci-dessous).
 *
 * (c) TEINTE COQUILLE PAR PRODUIT, ET C'EST UNE CORRECTION DE MESURE.
 *     La première écriture employait `tint()` de sharp, qui applique la CHROMA
 *     d'une couleur en préservant la luminance. Résultat mesuré : blanc le plus
 *     clair #fffefc, veine la plus sombre #dedddb — c'est-à-dire un marbre
 *     resté BLANC et resté FROID, exactement les deux défauts qu'on voulait
 *     corriger. La coquille est une couleur de faible chroma : lui emprunter sa
 *     seule chroma ne réchauffe rien.
 *
 *     Le geste juste est un PRODUIT : le gris du marbre multiplie un aplat de
 *     coquille. Le blanc du marbre rend alors la coquille exacte (#F2ECE1) et
 *     ses veines rendent une coquille assombrie — la matière devient un marbre
 *     DE cette maison au lieu d'un marbre posé dessus. La conséquence pour le
 *     contraste est directe et calculable : le fond le plus sombre vaut
 *     coquille × plancher / 255, et c'est cette valeur-là qu'on vérifie.
 *
 * (d) RACCORD PAR MIROIR. Une tuile qui se raccorde à coup sûr est une tuile
 *     symétrique : on réduit la source de moitié, puis on la recompose en
 *     quatre quartiers miroir. Les bords opposés sont alors identiques par
 *     construction, quelle que soit l'image d'origine. Le prix est une symétrie
 *     visible si on la cherche ; sur une matière aussi peu contrastée, et à la
 *     taille où elle est posée, elle ne se voit pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE PLANCHER, ET C'EST LUI QUI DÉCIDE DE TOUT LE RESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le pire couple de texte du site est l'ocre des étiquettes (#7A5714), de
 * luminance relative 0,110. Pour tenir AA (4,5) il faut un fond de luminance
 * ≥ 0,686 ; en produit sur la coquille, cela impose une veine la plus sombre
 * autour de #E0DBD1, donc un plancher de gris de 236 sur 255 avant produit.
 *
 * LE PLANCHER EST DONC LE PARAMÈTRE MAÎTRE : il fixe l'amplitude des veines,
 * et l'amplitude des veines est tout ce qu'on voit. Le baisser rendrait le
 * marbre plus spectaculaire et le texte moins lisible ; ce projet vend quatre
 * notes mesurées, l'arbitrage est écrit d'avance. Il est vérifié SUR LES
 * OCTETS produits, après encodage, jamais supposé — un encodeur avec perte
 * peut descendre sous le plancher qu'on lui a donné.
 *
 * Emploi :  node preuves/c19/marbre-coquille.mjs
 */

import { writeFileSync } from 'node:fs';

import sharp from 'sharp';

const SOURCE = 'travaux-images/marbre/marbre-source.png';
const SORTIE = 'travaux-images/marbre/marbre-coquille.avif';
const SORTIE_JPG = 'travaux-images/marbre/marbre-coquille.jpg';

const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

const canal = (valeur) => {
  const v = valeur / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, v, b]) => 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
const contraste = (a, b) => {
  const [c, s] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
  return (luminance(c) + 0.05) / (luminance(s) + 0.05);
};
const hex = (p) => `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** Le plancher visé pour la veine la plus sombre, en niveau de gris 0-255. */
const PLANCHER = 236;

/** L'aplat que le marbre multiplie — la coquille, jeton `--color-coquille`. */
const COQUILLE = { r: 0xf2, g: 0xec, b: 0xe1 };

dire('LE MARBRE DU CLIENT, RETRAVAILLÉ POUR LA COQUILLE');
dire('='.repeat(78));

/* ------------------------------------------------------------------------ */
/* 1. CE QUE VAUT LA SOURCE                                                  */
/* ------------------------------------------------------------------------ */

const statistiques = await sharp(SOURCE).greyscale().stats();
const minimumSource = statistiques.channels[0].min;
const maximumSource = statistiques.channels[0].max;

dire('');
dire(`  source : ${String(minimumSource)} → ${String(maximumSource)} en niveaux de gris`);

/*
 * L'AFFINE QUI REMONTE LE POINT NOIR ET NORMALISE LE BLANC.
 *   sortie = a·entrée + b,  avec  a·min + b = PLANCHER  et  a·max + b = 255.
 *
 * Le blanc est calé sur le MAXIMUM RÉEL de la source et non sur 255 : ce
 * marbre-ci plafonne à 252, et sans cette normalisation son blanc rendrait une
 * coquille légèrement grisée — un fond qui ne serait le jeton de la maison
 * nulle part.
 */
const a = (255 - PLANCHER) / (maximumSource - minimumSource);
const b = 255 - maximumSource * a;

dire(`  affine : a = ${a.toFixed(4)}, b = ${b.toFixed(2)} (plancher visé ${String(PLANCHER)})`);

/* ------------------------------------------------------------------------ */
/* 2. LA TUILE MIROIR                                                        */
/* ------------------------------------------------------------------------ */

const metadonnees = await sharp(SOURCE).metadata();
const demiLargeur = Math.round(metadonnees.width / 2);
const demiHauteur = Math.round(metadonnees.height / 2);

const quartier = await sharp(SOURCE)
  .greyscale()
  .linear(a, b)
  .resize(demiLargeur, demiHauteur, { fit: 'fill' })
  .raw()
  .toBuffer({ resolveWithObject: true });

const enPng = async (transformation) =>
  transformation.png({ compressionLevel: 9 }).toBuffer();

const base = sharp(quartier.data, {
  raw: { width: quartier.info.width, height: quartier.info.height, channels: 1 },
});

const [hautGauche, hautDroit, basGauche, basDroit] = await Promise.all([
  enPng(base.clone()),
  enPng(base.clone().flop()),
  enPng(base.clone().flip()),
  enPng(base.clone().flip().flop()),
]);

/* LE GRIS MIROIR, d'abord — quatre quartiers, bords identiques par
   construction. */
const grisMiroir = await sharp({
  create: {
    width: demiLargeur * 2,
    height: demiHauteur * 2,
    channels: 3,
    background: '#ffffff',
  },
})
  .composite([
    { input: hautGauche, top: 0, left: 0 },
    { input: hautDroit, top: 0, left: demiLargeur },
    { input: basGauche, top: demiHauteur, left: 0 },
    { input: basDroit, top: demiHauteur, left: demiLargeur },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();

/* PUIS LE PRODUIT SUR LA COQUILLE. Le blanc du marbre rend le jeton exact, ses
   veines rendent une coquille assombrie : la matière appartient à la maison au
   lieu d'y être posée. */
const tuile = sharp({
  create: {
    width: demiLargeur * 2,
    height: demiHauteur * 2,
    channels: 3,
    background: COQUILLE,
  },
}).composite([{ input: grisMiroir, blend: 'multiply' }]);

/* ------------------------------------------------------------------------ */
/* 3. L'ENCODAGE, ET LE POIDS QU'IL COÛTE À TOUTES LES PAGES                 */
/* ------------------------------------------------------------------------ */

const avif = await tuile.clone().avif({ quality: 52, effort: 6 }).toBuffer();
const jpeg = await tuile.clone().jpeg({ quality: 78, mozjpeg: true }).toBuffer();

writeFileSync(SORTIE, avif);
writeFileSync(SORTIE_JPG, jpeg);

dire('');
dire(
  `  tuile  : ${String(demiLargeur * 2)} × ${String(demiHauteur * 2)}, ` +
    `AVIF ${(avif.length / 1024).toFixed(1)} Ko, repli JPEG ${(jpeg.length / 1024).toFixed(1)} Ko`,
);
dire('  (ce poids serait payé sur TOUTES les pages du site : c'.concat("'est un fond de `body`)"));

/* ------------------------------------------------------------------------ */
/* 4. LE CONTRÔLE DE CONTRASTE, SUR LES OCTETS PRODUITS                      */
/* ------------------------------------------------------------------------ */

const rendu = await sharp(avif).raw().toBuffer({ resolveWithObject: true });
const canaux = rendu.info.channels;
let plusSombre = [255, 255, 255];
let plusClair = [0, 0, 0];

for (let i = 0; i < rendu.data.length; i += canaux) {
  const pixel = [rendu.data[i], rendu.data[i + 1], rendu.data[i + 2]];
  if (luminance(pixel) < luminance(plusSombre)) plusSombre = pixel;
  if (luminance(pixel) > luminance(plusClair)) plusClair = pixel;
}

const ENCRES = [
  { nom: 'encre', rvb: [0x1c, 0x21, 0x1a] },
  { nom: 'encre douce', rvb: [0x4f, 0x53, 0x47] },
  { nom: 'ocre (étiquettes)', rvb: [0x7a, 0x57, 0x14] },
  { nom: 'bleu (chaîne du froid)', rvb: [0x1f, 0x4e, 0xa8] },
];

dire('');
dire(`  pixel le plus sombre du marbre livré : ${hex(plusSombre)}`);
dire(`  pixel le plus clair                  : ${hex(plusClair)}`);
dire('');
dire('  LES RATIOS CONTRE LA VEINE LA PLUS SOMBRE (seuil AA 4,50)');

let echec = 0;

for (const encre of ENCRES) {
  const valeur = contraste(encre.rvb, plusSombre);
  if (valeur < 4.5) echec += 1;
  dire(
    `    ${encre.nom.padEnd(24)} ${valeur.toFixed(2).padStart(6)}   ` +
      `marge ${(valeur - 4.5 >= 0 ? '+' : '') + (valeur - 4.5).toFixed(2)}`,
  );
}

dire('');
dire(
  echec === 0
    ? '  Les 4 encres tiennent AA sur la veine la plus sombre du marbre.'
    : `  ${String(echec)} encre(s) SOUS AA — le plancher doit remonter.`,
);

if (echec > 0) process.exitCode = 1;

dire('');
writeFileSync('preuves/c19/marbre-coquille.txt', `${lignes.join('\n')}\n`, 'utf8');
console.log('Relevé écrit dans preuves/c19/marbre-coquille.txt');
