/**
 * LES CAPTURES DE LA TRANCHE C15 — bureau et mobile, pleine page.
 *
 * Cinq écrans, deux formats : l'accueil, le rayon en GRILLE, le rayon en LISTE,
 * la fiche pilote (celle que `mesurer-notes` mesure depuis C8) et une fiche de
 * COFFRET — la seule dont la seconde vue est un zénithal, donc la seule où la
 * galerie ne montre pas deux fois le même cadrage.
 *
 * Le rayon en liste demande un CLIC : la bascule vit dans un îlot client, et une
 * capture qui se contenterait de poser l'attribut à la main ne prouverait pas
 * que le bouton le pose. On clique, on attend la fin de la transition de vue, on
 * capture.
 *
 * Les PNG restent hors du dépôt (doctrine de C9, reprise en C13) ; le script,
 * lui, entre — une capture qu'on ne peut pas refaire ne prouve rien.
 *
 * Usage : node preuves/c15/captures-c15.mjs
 */
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const SORTIE = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3995;

const ECRANS = [
  { nom: 'accueil', chemin: '/', liste: false },
  { nom: 'boutique-grille', chemin: '/boutique', liste: false },
  { nom: 'boutique-liste', chemin: '/boutique', liste: true },
  { nom: 'fiche-huile-olive', chemin: '/boutique/huile-olive-premiere-pression', liste: false },
  { nom: 'fiche-coffret', chemin: '/boutique/coffret-table-du-dimanche', liste: false },
];

const FORMATS = [
  { nom: 'bureau', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  {
    nom: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
];

mkdirSync(SORTIE, { recursive: true });

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resolve) => setTimeout(resolve, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

console.log('');
console.log('Captures C15 — accueil, rayon (deux formes), fiche pilote, fiche coffret');
console.log('-'.repeat(76));

let ecrites = 0;

for (const format of FORMATS) {
  const contexte = await navigateur.newContext({
    viewport: format.viewport,
    deviceScaleFactor: format.deviceScaleFactor,
    ...(format.isMobile === undefined ? {} : { isMobile: format.isMobile }),
    ...(format.hasTouch === undefined ? {} : { hasTouch: format.hasTouch }),
    /* Les deux profils de la campagne jouent sous mouvement réduit depuis C11 ;
       les captures suivent, pour montrer l'état stable et non un entre-deux. */
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  for (const ecran of ECRANS) {
    await page.goto(`http://localhost:${String(PORT)}${ecran.chemin}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    if (ecran.liste) {
      await page.getByRole('button', { name: 'Liste' }).click();
      await page.waitForFunction(
        () => document.documentElement.dataset['affichageRayon'] === 'liste',
      );
    }

    /* Les images paresseuses n'existent qu'une fois traversées. */
    const hauteur = await page.evaluate(() => document.body.scrollHeight);

    for (let y = 0; y < hauteur; y += 600) {
      await page.evaluate((position) => {
        window.scrollTo(0, position);
      }, y);
      await page.waitForTimeout(120);
    }

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);

    const fichier = `${SORTIE}${ecran.nom}-${format.nom}.png`;
    await page.screenshot({ path: fichier, fullPage: true });
    ecrites += 1;
    console.log(`  ${ecran.nom.padEnd(22)} ${format.nom.padEnd(8)} → ${ecran.nom}-${format.nom}.png`);
  }

  await contexte.close();
}

await navigateur.close();
serveur.kill();

console.log('-'.repeat(76));
console.log(`${String(ecrites)} capture(s) écrite(s) dans preuves/c15/.`);
console.log('');
