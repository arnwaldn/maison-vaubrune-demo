// Captures de C27 : panier, récapitulatif, tiroir, à 1280x551, 390 et 360.
// Usage : node preuves/c27/captures.mjs --base http://localhost:3127 --sortie preuves/c27/captures
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const arg = (nom, defaut) => {
  const i = process.argv.indexOf(nom);
  return i === -1 ? defaut : process.argv[i + 1];
};
const base = arg('--base', 'http://localhost:3127');
const sortie = arg('--sortie', 'preuves/c27/captures');
mkdirSync(sortie, { recursive: true });

const FORMATS = [
  ['1280x551', { width: 1280, height: 551 }, false],
  ['390', { width: 390, height: 844 }, true],
  ['360', { width: 360, height: 740 }, true],
];

const navigateur = await chromium.launch();
for (const [nom, viewport, mobile] of FORMATS) {
  const contexte = await navigateur.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: 'reduce',
    locale: 'fr-FR',
  });
  const page = await contexte.newPage();
  const attendre = () =>
    page.waitForFunction(
      () =>
        document.documentElement.dataset.hydratation === 'prete' &&
        document.querySelectorAll('[data-place-reservee]').length === 0,
    );

  for (const slug of ['huile-olive-premiere-pression', 'huile-noix-moulin']) {
    await page.goto(`${base}/boutique/${slug}`);
    await attendre();
    await page.getByRole('button', { name: 'Ajouter au panier' }).click();
    if (slug === 'huile-olive-premiere-pression') {
      await page.getByRole('dialog', { name: 'Ajouté au panier' }).waitFor();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${sortie}/tiroir-${nom}.png` });
    }
    await page.getByRole('button', { name: 'Continuer mes achats' }).click();
  }
  await page.goto(`${base}/panier`);
  await attendre();
  await page.waitForTimeout(600);
  await page.locator('li:has([data-miniature])').first().evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${sortie}/panier-${nom}.png` });

  await page.goto(`${base}/commande`);
  await attendre();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${sortie}/commande-${nom}.png`, fullPage: true });
  await contexte.close();
}
await navigateur.close();
