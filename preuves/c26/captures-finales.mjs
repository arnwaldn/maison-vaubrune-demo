import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [w,h] of [[1280,551],[390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await p.goto('http://localhost:3200/boutique');
  await p.waitForSelector('html[data-hydratation="prete"]');
  const huile = p.locator('li.carte-produit', { has: p.locator('a[href="/boutique/huile-olive-premiere-pression"]') });
  await huile.getByRole('button', { name: /^Ajouter au panier/ }).click();
  await huile.locator('.vignette-achat').scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, 120));
  await p.screenshot({ path: `preuves/c26/final-${w}-boutique.png` });
  const coffret = p.locator('li.carte-produit', { has: p.locator('a[href="/boutique/coffret-composez-le-votre"]') });
  if (await coffret.count()) { await coffret.scrollIntoViewIfNeeded(); await p.screenshot({ path: `preuves/c26/final-${w}-coffret.png` }); }
  await p.close();
}
await b.close();
