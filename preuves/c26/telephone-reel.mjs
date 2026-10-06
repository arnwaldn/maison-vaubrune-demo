/**
 * Recette de C26 sur un téléphone RÉEL (Chrome Android piloté par CDP, port
 * transféré par adb). Le toucher passe par `touchscreen.tap` : un vrai
 * évènement tactile, pas un clic de souris.
 *   node preuves/c26/telephone-reel.mjs <port> <dossier-captures>
 */
import { chromium } from '@playwright/test';
const port = process.argv[2] ?? '9334';
const sortie = process.argv[3] ?? 'preuves/c26/telephone';
const URL_BOUTIQUE = 'https://maison-vaubrune-demo.vercel.app/boutique';
const b = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const ctx = b.contexts()[0];
let p = null;
for (const candidate of ctx.pages()) {
  if (!candidate.url().includes('maison-vaubrune')) continue;
  const visible = await Promise.race([
    candidate.evaluate(() => document.visibilityState === 'visible'),
    new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
  ]);
  if (visible) { p = candidate; break; }
}
if (p === null) throw new Error('aucun onglet Maison Vaubrune visible sur le telephone');
await p.evaluate(() => localStorage.removeItem('maison-vaubrune.panier.v1')).catch(() => {});
await p.goto(URL_BOUTIQUE);
await p.waitForSelector('html[data-hydratation="prete"]');
const vue = await p.evaluate(() => ({ l: innerWidth, h: innerHeight, dpr: devicePixelRatio, ua: navigator.userAgent.match(/Android [^;]+; [^)]+/)?.[0] }));
console.log('fenetre', JSON.stringify(vue));
const carte = (slug) => p.locator('li.carte-produit', { has: p.locator(`a[href="/boutique/${slug}"]`) });
const pastillePanier = async () => (await p.locator('header').getByRole('link', { name: /panier/i }).first().innerText()).replace(/\s+/g, ' ');
const cdp = await ctx.newCDPSession(p);
const tap = async (loc) => {
  await loc.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(400);
  const bx = await loc.boundingBox();
  const point = { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(500);
};
const huile = carte('huile-olive-premiere-pression');
const ajout = (c) => c.locator('.vignette-bouton');
await tap(ajout(huile));
const pas = huile.locator('.vignette-pas');
const geo = await pas.evaluate((n) => { const r = n.getBoundingClientRect(); return { haut: r.top, bas: r.bottom, h: innerHeight }; });
console.log('apres ajout huile 25 cl : pas visible =', await pas.isVisible(), 'dans la fenetre =', geo.haut >= 0 && geo.bas <= geo.h, '| en-tete :', await pastillePanier(), '| adresse :', p.url());
await p.screenshot({ path: `${sortie}-1-ajout.png` });
await tap(huile.getByRole('button', { name: /^Ajouter un exemplaire/ }));
console.log('apres + :', (await pas.innerText()).replace(/\s+/g, ' '), '| en-tete :', await pastillePanier());
const noix = carte('huile-noix-moulin');
await tap(noix.locator('.vignette-pastille').nth(1));
await tap(ajout(noix));
console.log('noix 50 cl ajoutee | en-tete :', await pastillePanier());
await p.screenshot({ path: `${sortie}-2-noix.png` });
await tap(huile.getByRole('button', { name: /^Retirer un exemplaire/ }));
await tap(huile.getByRole('button', { name: /^Retirer un exemplaire/ }));
console.log('huile retiree : bouton revenu =', await ajout(huile).isVisible(), '| en-tete :', await pastillePanier());
await p.reload(); await p.waitForSelector('html[data-hydratation="prete"]');
console.log('apres rechargement : noix cochee =', await noix.locator('input[type=radio]:checked').evaluate((n) => n.closest('label').innerText), '| en-tete :', await pastillePanier());
await p.goto('https://maison-vaubrune-demo.vercel.app/panier', { waitUntil: 'commit' }).catch(() => {}); await p.waitForURL(/panier/); await p.waitForSelector('html[data-hydratation="prete"]');
console.log('panier :', (await p.locator('main').innerText()).split('\n').filter((l) => /noix|cl|€/i.test(l)).slice(0, 6).join(' | '));
await p.screenshot({ path: `${sortie}-3-panier.png` });
await b.close();
