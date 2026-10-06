/** Captures des cartes de suggestion à ligne d'achat : tiroir de la fiche et panier plein. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:3200';
const b = await chromium.launch();
for (const [w, h] of [[1280, 551], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await p.goto(base + '/boutique/huile-olive-premiere-pression');
  await p.waitForSelector('html[data-hydratation="prete"]');
  await p.getByRole('button', { name: 'Ajouter au panier', exact: true }).click();
  const tiroir = p.getByRole('dialog', { name: 'Ajouté au panier' });
  await tiroir.waitFor();
  const sugg = tiroir.locator('[data-suggestion]').first();
  await sugg.scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `preuves/c26/sugg-${w}-tiroir.png` });
  const debord = await tiroir.evaluate((d) => [...d.querySelectorAll('.vignette-achat')].map((a) => Math.round(a.scrollWidth - a.clientWidth)));
  console.log(w, 'tiroir : debordement des lignes d achat', debord.join(','));
  await p.goto(base + '/panier');
  await p.waitForSelector('html[data-hydratation="prete"]');
  const sec = p.locator('[data-suggestion]').first();
  await sec.scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `preuves/c26/sugg-${w}-panier.png` });
  console.log(w, 'document deborde de', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'px');
  await p.close();
}
await b.close();
