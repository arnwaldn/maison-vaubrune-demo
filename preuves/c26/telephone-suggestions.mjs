/** Recette tactile des cartes de suggestion sur le téléphone de l'agence (Chrome Android, CDP). */
import { chromium } from '@playwright/test';
const port = process.argv[2] ?? '9334';
const BASE = 'https://maison-vaubrune-demo.vercel.app';
const b = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const ctx = b.contexts()[0];
let p = null;
for (const c of ctx.pages()) {
  if (!c.url().includes('maison-vaubrune')) continue;
  const v = await Promise.race([c.evaluate(() => document.visibilityState === 'visible'), new Promise((r) => setTimeout(() => r(false), 3000))]);
  if (v) { p = c; break; }
}
if (p === null) throw new Error('aucun onglet visible');
const cdp = await ctx.newCDPSession(p);
const tap = async (loc) => {
  await loc.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(400);
  const bx = await loc.boundingBox();
  const pt = { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
};
const compteur = () => p.locator('header a[href="/panier"] span[aria-hidden="true"]').innerText();
await p.evaluate(() => localStorage.removeItem('maison-vaubrune.panier.v1'));
await p.goto(BASE + '/boutique/huile-olive-premiere-pression');
await p.waitForSelector('html[data-hydratation="prete"]');
await tap(p.getByRole('button', { name: 'Ajouter au panier', exact: true }));
const tiroir = p.getByRole('dialog', { name: 'Ajouté au panier' });
console.log('tiroir ouvert =', await tiroir.isVisible(), '| compteur', await compteur());
const carteTiroir = tiroir.locator('li', { has: p.locator('[data-suggestion]') }).first();
await tap(carteTiroir.locator('.vignette-bouton'));
console.log('suggestion du tiroir ajoutee : compteur', await compteur(), '| pas =', (await carteTiroir.locator('.vignette-pas').innerText()).replace(/\s+/g, ' '), '| tiroir toujours ouvert =', await tiroir.isVisible());
await p.screenshot({ path: 'preuves/c26/telephone-4-tiroir.png' });
await p.goto(BASE + '/panier', { waitUntil: 'commit' }).catch(() => {});
await p.waitForURL(/panier/); await p.waitForSelector('html[data-hydratation="prete"]');
const lignes = p.locator('main ul.border-t > li');
const avant = await lignes.count();
const section = p.locator('section', { has: p.locator('[data-suggestion]') });
const carte = section.locator('li', { has: p.locator('[data-suggestion]') }).first();
const href = await carte.locator('[data-suggestion]').getAttribute('href');
await tap(carte.locator('.vignette-bouton'));
await tap(carte.locator('.vignette-pas').getByText(/\d/)); // second toucher au meme endroit
console.log('panier : lignes', avant, '->', await lignes.count(), '| carte toujours la =', await section.locator(`[data-suggestion][href="${href}"]`).count(), '| compteur', await compteur());
await p.screenshot({ path: 'preuves/c26/telephone-5-panier.png' });
await b.close();
