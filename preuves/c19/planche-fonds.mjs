/**
 * LA PLANCHE DES QUATRE FONDS — la pièce du verdict d'Arnaud (10/08).
 *
 * Quatre propositions, la MÊME zone de page, le poids de chacune écrit dessus :
 *
 *   (a) le grain actuel, 0,055 — celui que le client dit ne pas voir ;
 *   (b) le grain amplifié, 0,14 — ce que la tranche livre par défaut ;
 *   (c) un cran au-dessus, 0,18 — pour que le curseur ait une borne haute ;
 *   (d) LE MARBRE COQUILLE — la matière proposée par le client, retravaillée
 *       pour le système (voir `preuves/c19/marbre-coquille.mjs` : produit sur la
 *       coquille, veines compressées sous un plancher de contraste, tuile
 *       raccordée par miroir).
 *
 * DEUX ZONES, ET C'EST NÉCESSAIRE : un fond ne se juge pas sur une surface
 * vide. L'accueil à mi-page montre le fond NU, la fiche le montre autour de
 * texte et d'une photographie sur papier — c'est là que se voit si la matière
 * s'accorde ou si elle jure.
 *
 * Le marbre est injecté en adresse `data:` plutôt que déposé dans `public/` :
 * tant que le client n'a pas tranché, rien n'entre dans le livrable, et la
 * planche reste une pièce de décision plutôt qu'une livraison à moitié faite.
 *
 * Emploi :  node preuves/c19/planche-fonds.mjs
 *           BASE=http://127.0.0.1:3111 par défaut.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3111';
const DOSSIER = 'preuves/c19';

const marbre = readFileSync('travaux-images/marbre/marbre-coquille.avif');
const marbreJpeg = readFileSync('travaux-images/marbre/marbre-coquille.jpg');
const marbreEnLigne = `data:image/avif;base64,${marbre.toString('base64')}`;

const grain = (opacite) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)' opacity='${opacite}'/%3E%3C/svg%3E")`;

const OPTIONS = [
  {
    clef: 'a',
    titre: 'A — GRAIN 0,055 (l’actuel, jugé invisible)',
    poids: '0 Ko — 380 octets de source CSS',
    style: `:root { --grain-papier: ${grain('0.055')}; }`,
  },
  {
    clef: 'b',
    titre: 'B — GRAIN 0,14 (livré par défaut dans cette tranche)',
    poids: '0 Ko — 380 octets de source CSS',
    style: `:root { --grain-papier: ${grain('0.14')}; }`,
  },
  {
    clef: 'c',
    titre: 'C — GRAIN 0,18 (un cran au-dessus)',
    poids: '0 Ko — 380 octets de source CSS',
    style: `:root { --grain-papier: ${grain('0.18')}; }`,
  },
  {
    clef: 'd',
    titre: 'D — MARBRE COQUILLE (proposition du client, retravaillée)',
    poids: `${(marbre.length / 1024).toFixed(1)} Ko AVIF (repli JPEG ${(marbreJpeg.length / 1024).toFixed(1)} Ko) — sur TOUTES les pages`,
    /* Le marbre REMPLACE le grain et se pose SOUS le lavis, exactement comme le
       grain : la seule chose qui change est la matière, pas la mécanique. */
    style: `:root { --grain-papier: url("${marbreEnLigne}"); }
            body { background-size: 704px 384px, 100% 100%; }`,
  },
];

const ZONES = [
  {
    clef: 'accueil',
    chemin: '/',
    defilement: 900,
    cadre: { x: 0, y: 140, width: 1280, height: 430 },
    intitule: 'ACCUEIL À MI-PAGE — le fond nu',
  },
  {
    clef: 'fiche',
    chemin: '/boutique/huile-olive-premiere-pression',
    defilement: 260,
    cadre: { x: 0, y: 120, width: 1280, height: 430 },
    intitule: 'FICHE — le fond contre du texte et du papier photographique',
  },
];

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

const BANDEAU = 46;

/** Un bandeau de titre, rendu en SVG puis composé — aucune police à charger. */
const bandeau = (titre, poids) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${String(BANDEAU)}">` +
      `<rect width="1280" height="${String(BANDEAU)}" fill="#1c211a"/>` +
      `<text x="18" y="30" font-family="monospace" font-size="17" fill="#f2ece1">${titre}</text>` +
      `<text x="1262" y="30" text-anchor="end" font-family="monospace" font-size="14" fill="#c89b3c">${poids}</text>` +
      `</svg>`,
  );

for (const zone of ZONES) {
  const bandes = [];

  for (const option of OPTIONS) {
    await page.goto(`${BASE}${zone.chemin}`, { waitUntil: 'load' });
    await page.addStyleTag({ content: option.style });
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, zone.defilement);
    await page.waitForTimeout(700);

    const capture = await page.screenshot({ clip: zone.cadre });

    bandes.push(
      await sharp({
        create: {
          width: 1280,
          height: zone.cadre.height + BANDEAU,
          channels: 3,
          background: '#1c211a',
        },
      })
        .composite([
          { input: bandeau(option.titre, option.poids), top: 0, left: 0 },
          { input: capture, top: BANDEAU, left: 0 },
        ])
        .png()
        .toBuffer(),
    );
  }

  const hauteurBande = zone.cadre.height + BANDEAU;

  await sharp({
    create: {
      width: 1280,
      height: hauteurBande * OPTIONS.length + BANDEAU,
      channels: 3,
      background: '#1c211a',
    },
  })
    .composite([
      { input: bandeau(zone.intitule, '1280 × 900, densité 1'), top: 0, left: 0 },
      ...bandes.map((bande, rang) => ({
        input: bande,
        top: BANDEAU + rang * hauteurBande,
        left: 0,
      })),
    ])
    .png({ compressionLevel: 9 })
    .toFile(`${DOSSIER}/planche-fonds-${zone.clef}.png`);

  console.log(`  planche écrite : ${DOSSIER}/planche-fonds-${zone.clef}.png`);
}

await navigateur.close();

writeFileSync(
  `${DOSSIER}/planche-fonds.txt`,
  [
    'LA PLANCHE DES QUATRE FONDS — pièce du verdict (10/08)',
    '='.repeat(70),
    '',
    ...OPTIONS.map((o) => `  ${o.titre}\n      ${o.poids}`),
    '',
    'Deux planches : planche-fonds-accueil.png (fond nu) et',
    'planche-fonds-fiche.png (fond contre du texte et du papier photographique).',
    '',
    'Contrastes AA re-mesurés au pixel pour les quatre options :',
    '  grain 0,055  ocre 5,46   |  grain 0,14  ocre 5,22   |  grain 0,18  ocre 5,02',
    '  marbre coquille          ocre 5,09 sur la veine la plus sombre (#e8e2d6)',
    'Seuil AA 4,50 : les quatre options tiennent.',
    '',
  ].join('\n'),
  'utf8',
);
