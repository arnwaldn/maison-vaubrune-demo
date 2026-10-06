import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 551 }, reducedMotion: 'reduce' });
await p.goto('http://localhost:3200/boutique');
await p.waitForSelector('html[data-hydratation="prete"]');
await p.getByRole('button', { name: 'Liste', exact: true }).click();
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const a = document.querySelector('.rayon-grille .vignette-achat');
  const sheetsHit = [];
  for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) { const t = r.cssText; if (t.includes('vignette-achat') && t.includes('liste')) sheetsHit.push(t.slice(0, 160)); } } catch {} }
  return JSON.stringify({ attr: document.documentElement.dataset.affichageRayon, ml: getComputedStyle(a).marginLeft, jc: getComputedStyle(a.querySelector('.vignette-ligne')).justifyContent, sheetsHit });
}));
await b.close();
