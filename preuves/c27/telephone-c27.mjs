/** Recette tactile de C27 sur le téléphone de l'agence (Chrome Android, CDP) : miniatures, champ de quantité, « Retirer ». */
import { chromium } from '@playwright/test';
const BASE = 'https://maison-vaubrune-demo.vercel.app';
const b = await chromium.connectOverCDP(`http://127.0.0.1:${process.argv[2] ?? '9334'}`);
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
  await p.waitForTimeout(700);
};
const mini = (racine) => racine.locator('[data-miniature] img').evaluateAll((imgs) => imgs.map((i) => ({ src: i.currentSrc.split('/').slice(-2).join('/'), w: i.naturalWidth, h: i.naturalHeight, ok: i.complete })));
const charger = async (url) => { await p.goto(url, { waitUntil: 'commit' }).catch(() => {}); await p.waitForURL(new RegExp(url.split('.app')[1].replace(/\//g, '\/') + '$')); await p.waitForSelector('html[data-hydratation="prete"]'); };
await p.evaluate(() => localStorage.removeItem('maison-vaubrune.panier.v1'));
await charger(BASE + '/boutique/huile-olive-premiere-pression');
await tap(p.getByRole('button', { name: 'Ajouter au panier', exact: true }));
const tiroir = p.getByRole('dialog', { name: 'Ajouté au panier' });
console.log('tiroir : miniature', JSON.stringify(await mini(tiroir)));
await charger(BASE + '/panier');
const ligne = p.locator('main ul.border-t > li').first();
await ligne.evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
await p.waitForTimeout(800);
console.log('panier : miniatures', JSON.stringify(await mini(p.locator('main'))));
const champ = ligne.getByRole('spinbutton', { name: 'Qté', exact: true });
await tap(champ);
/* Le doigt pose le curseur après le « 1 » : on tape « 2 », comme un client qui
   ajoute un chiffre, et la quantité devient 12. */
await cdp.send('Input.insertText', { text: '2' });
await p.waitForTimeout(600);
const geo = await ligne.evaluate((li) => {
  const r = li.getBoundingClientRect();
  const prix = li.querySelector('[data-chiffre]').getBoundingClientRect();
  const retirer = [...li.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith('Retirer') && !x.getAttribute('aria-label')).getBoundingClientRect();
  return { prixDroite: Math.round(prix.right), ligneDroite: Math.round(r.right), retirerSousPrix: retirer.top >= prix.bottom - 1 };
});
console.log('saisie clavier (1 puis 2) : champ =', await champ.inputValue(), '| sous-total =', await ligne.locator('[data-chiffre]').innerText(), '| geometrie', JSON.stringify(geo));
await p.screenshot({ path: 'preuves/c27/telephone-panier.png', timeout: 10000 }).catch(() => console.log('capture CDP indisponible'));
await charger(BASE + '/commande');
/* Le récapitulatif est sous la ligne de flottaison : ses miniatures sont
   paresseuses, on les fait entrer dans la fenêtre avant de les lire. */
await p.locator('[data-miniature]').first().evaluate((n) => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
await p.waitForTimeout(1500);
console.log('recapitulatif : miniatures', JSON.stringify(await mini(p.locator('main'))));
await b.close();
