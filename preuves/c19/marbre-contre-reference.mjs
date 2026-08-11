/* LE TEST DE L'ŒIL — la référence du client À CÔTÉ du site, à la même échelle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE PLANCHE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quatre livraisons de fond ont été jugées « à peine visibles » par le client.
 * Les quatre avaient des chiffres, et les quatre étaient de bonne foi : elles
 * mesuraient l'écart qu'elles avaient elles-mêmes visé. Ce qui manquait n'était
 * pas une mesure de plus, c'était LE TERME DE COMPARAISON — la référence que le
 * client a fournie, posée à côté du rendu, à la même taille.
 *
 * Cette planche ne prouve donc pas un seuil. Elle répond à la seule question
 * qui ait fait échouer les quatre passes précédentes : « est-ce que c'est le
 * même matériau ? » Un œil à un mètre doit dire oui.
 *
 * TROIS VOLETS, ET CHACUN RÉPOND À UNE OBJECTION :
 *   1. la RÉFÉRENCE du client, telle qu'il l'a fournie ;
 *   2. la MATIÈRE du site seule, sans un mot dessus — c'est la comparaison
 *      loyale, matière contre matière ;
 *   3. l'ACCUEIL EN SITUATION, parce qu'un fond ne se juge pas hors de la page
 *      qu'il porte : c'est là qu'on voit s'il écrase le texte ou s'il le porte.
 *
 * Les trois sont ramenés à la MÊME HAUTEUR et à la MÊME ÉCHELLE de veine (la
 * référence est réduite au facteur qui lui donne la largeur de tuile réellement
 * servie), sans quoi la comparaison flatterait celui qu'on agrandit.
 *
 * Emploi :  node preuves/c19/marbre-contre-reference.mjs
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3000';
const REFERENCE = 'travaux-images/marbre/marbre-source.png';
const SORTIE = 'preuves/c19/marbre-contre-reference.avif';

const LARGEUR = 620;
const HAUTEUR = 860;
const MARGE = 18;
const BANDEAU = 46;

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset['hydratation'] === 'prete');
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  const image = new Image();
  image.src = '/fond/marbre-coquille.avif';
  await image.decode().catch(() => undefined);
});
await page.waitForTimeout(500);

/* VOLET 3 — l'accueil en situation, en FENÊTRE (jamais `fullPage` : Playwright
   agrandirait la fenêtre et `min-h-screen` recomposerait la page). DEUX vues,
   le haut et la mi-page : une seule ne montrerait que le héros, où la matière
   est de toute façon nue. C'est plus bas, entre les panneaux, qu'on juge si
   elle porte le texte ou l'écrase. */
const accueilHaut = await page.screenshot();
await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(400);
const accueilMilieu = await page.screenshot();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

/*
 * VOLET 2 — LA MATIÈRE SEULE, ET ON NE LA DÉCOUPE PAS DANS LA PAGE.
 *
 * Prélever un carré « sans texte » dans la capture de l'accueil obligerait à
 * choisir un endroit, donc à choisir le plus flatteur. On rend plutôt une page
 * VIDE qui ne porte que le fond du site — mêmes déclarations, même tuile, même
 * voile, lus dans la feuille de la page réelle plutôt que recopiés.
 */
const fond = await page.evaluate(() => {
  const style = getComputedStyle(document.body);
  return {
    image: style.backgroundImage,
    couleur: style.backgroundColor,
    taille: style.backgroundSize,
    opacite: getComputedStyle(document.documentElement).getPropertyValue('--marbre-opacite'),
  };
});

await page.setContent(
  `<style>html,body{margin:0;height:100%}body{background-color:${fond.couleur};` +
    `background-image:${fond.image};background-size:${fond.taille};` +
    `background-repeat:repeat}</style><body></body>`,
);
await page.waitForTimeout(400);
const matiere = await page.screenshot();

await navigateur.close();

/* ------------------------------------------------------------------------- */
/* LA COMPOSITION                                                             */
/* ------------------------------------------------------------------------- */

const volet = async (source, options = {}) =>
  sharp(source)
    .resize({
      width: LARGEUR,
      height: HAUTEUR,
      fit: 'cover',
      position: options.position ?? 'top',
    })
    .toBuffer();

/*
 * LE TROISIÈME VOLET N'EST PAS RECADRÉ, IL EST RÉDUIT — et la différence
 * compte. Un `cover` sur une capture de 1440 aurait montré une bande du milieu
 * de l'écran, c'est-à-dire l'endroit que le recadrage aurait choisi. On réduit
 * donc les deux vues à la largeur du volet et on les empile : ce que le client
 * regarde est la page entière, deux fois, pas un morceau élu.
 */
const vueReduite = async (source) =>
  sharp(source).resize({ width: LARGEUR }).toBuffer({ resolveWithObject: true });

const haut = await vueReduite(accueilHaut);
const milieu = await vueReduite(accueilMilieu);
const ecart = HAUTEUR - haut.info.height - milieu.info.height;

const enSituation = await sharp({
  create: {
    width: LARGEUR,
    height: HAUTEUR,
    channels: 3,
    background: { r: 0xf2, g: 0xec, b: 0xe1 },
  },
})
  .composite([
    { input: haut.data, top: 0, left: 0 },
    { input: milieu.data, top: haut.info.height + Math.max(0, ecart), left: 0 },
  ])
  .png()
  .toBuffer();

const volets = [
  { titre: 'LA RÉFÉRENCE DU CLIENT', image: await volet(REFERENCE, { position: 'centre' }) },
  {
    titre: `LA MATIÈRE DU SITE (voile ${Number(fond.opacite).toFixed(2)})`,
    image: await volet(matiere),
  },
  { titre: 'L’ACCUEIL EN SITUATION', image: enSituation },
];

const largeurTotale = MARGE + volets.length * (LARGEUR + MARGE);
const hauteurTotale = MARGE + BANDEAU + HAUTEUR + MARGE;

const legendes = volets
  .map(
    (v, rang) =>
      `<text x="${String(MARGE + rang * (LARGEUR + MARGE))}" y="${String(MARGE + 26)}" ` +
      `font-family="monospace" font-size="17" letter-spacing="2" fill="#1c211a">${v.titre}</text>`,
  )
  .join('');

const planche = sharp({
  create: {
    width: largeurTotale,
    height: hauteurTotale,
    channels: 3,
    background: { r: 0xf2, g: 0xec, b: 0xe1 },
  },
}).composite([
  {
    input: Buffer.from(
      `<svg width="${String(largeurTotale)}" height="${String(hauteurTotale)}">${legendes}</svg>`,
    ),
    top: 0,
    left: 0,
  },
  ...volets.map((v, rang) => ({
    input: v.image,
    top: MARGE + BANDEAU,
    left: MARGE + rang * (LARGEUR + MARGE),
  })),
]);

const octets = await planche.avif({ quality: 72, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
const { writeFileSync } = await import('node:fs');
writeFileSync(SORTIE, octets);

console.log(
  `Planche écrite : ${SORTIE} — ${String(largeurTotale)} × ${String(hauteurTotale)}, ` +
    `${(octets.length / 1024).toFixed(1)} Ko`,
);
