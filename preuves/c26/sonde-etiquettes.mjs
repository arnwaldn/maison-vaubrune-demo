/** Rangée d'étiquettes : hauteur sur une carte SANS étiquette et AVEC, à deux largeurs. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:3200';
const b = await chromium.launch();
for (const [w, h] of [[1280, 551], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await p.goto(base + '/boutique');
  await p.waitForSelector('html[data-hydratation="prete"]');
  const r = await p.evaluate(() => [...document.querySelectorAll('.rayon-grille li.carte-produit')].map((li) => {
    const e = li.querySelector('.carte-etiquettes');
    return { slug: li.querySelector('a').getAttribute('href').split('/').pop(), etiquettes: e.childElementCount, hauteur: Math.round(e.getBoundingClientRect().height), affichage: getComputedStyle(e).display };
  }));
  const vides = r.filter((x) => x.etiquettes === 0), pleines = r.filter((x) => x.etiquettes > 0);
  console.log(w, 'sans etiquette:', vides.length, 'hauteurs', [...new Set(vides.map((x) => `${x.hauteur}/${x.affichage}`))].join(','), '| avec:', pleines.length, 'hauteurs', [...new Set(pleines.map((x) => x.hauteur))].join(','));
  await p.close();
}
await b.close();
