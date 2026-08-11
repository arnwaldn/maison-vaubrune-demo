/* Captures de la coquille C13 — accueil, boutique, fiche, bureau et mobile.
   Deux vues par page et par format : le sommet, et l'en-tete SCELLE apres
   defilement (l'objet meme de la tranche). Plus le pied de page. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const port = 3998;
const sortie = 'preuves/c13';
mkdirSync(sortie, { recursive: true });

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const PAGES = [
  ['accueil', '/'],
  ['boutique', '/boutique'],
  ['fiche', '/boutique/huile-olive-premiere-pression'],
];
const FORMATS = [
  ['bureau', { width: 1280, height: 900 }, false],
  ['mobile', { width: 390, height: 844 }, true],
];

const navigateur = await chromium.launch({ channel: 'chromium' });

for (const [nomFormat, viewport, mobile] of FORMATS) {
  const contexte = await navigateur.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  for (const [nomPage, chemin] of PAGES) {
    await page.goto(`http://localhost:${port}${chemin}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);

    await page.screenshot({ path: `${sortie}/${nomPage}-${nomFormat}-sommet.png` });

    await page.evaluate(() => {
      window.scrollTo(0, 600);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${sortie}/${nomPage}-${nomFormat}-scelle.png` });

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${sortie}/${nomPage}-${nomFormat}-pied.png` });
  }

  await contexte.close();
}

await navigateur.close();
serveur.kill();
console.log('captures ecrites dans', sortie);
process.exit(0);
