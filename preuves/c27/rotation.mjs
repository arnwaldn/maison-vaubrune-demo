/** Rotation réelle du téléphone de l'agence sans rechargement : débordement horizontal de /panier et /commande. */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const ADB = process.argv[2];
const BASE = 'https://maison-vaubrune-demo.vercel.app';
const adb = (...a) => execFileSync(ADB, ['-s', 'a2ecbed4', ...a]).toString();
const b = await chromium.connectOverCDP('http://127.0.0.1:9334');
const ctx = b.contexts()[0];
let p = null;
for (const c of ctx.pages()) {
  if (!c.url().includes('maison-vaubrune')) continue;
  const v = await Promise.race([c.evaluate(() => document.visibilityState === 'visible'), new Promise((r) => setTimeout(() => r(false), 3000))]);
  if (v) { p = c; break; }
}
if (p === null) throw new Error('aucun onglet visible');
const charger = async (chemin) => { await p.goto(BASE + chemin, { waitUntil: 'commit' }).catch(() => {}); await p.waitForURL(new RegExp(chemin.replace(/\//g, '\/') + '$')); await p.waitForSelector('html[data-hydratation="prete"]'); };
const releve = () => p.evaluate(() => {
  const fenetre = document.documentElement.clientWidth;
  const coupables = [...document.querySelectorAll('body *')].map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.right > fenetre + 0.5).sort((a, b) => b.r.right - a.r.right).slice(0, 3)
    .map(({ e, r }) => `${e.tagName.toLowerCase()}.${String(e.getAttribute('class') ?? '').slice(0, 40)} droite=${Math.round(r.right)}`);
  return { fenetre, ecart: document.documentElement.scrollWidth - fenetre, coupables };
});
await p.evaluate(() => localStorage.setItem('maison-vaubrune.panier.v1', JSON.stringify({ version: 1, panier: { lignes: [{ sku: 'MV-HV-OLI-25CL', quantite: 1 }, { sku: 'MV-HV-NOI-50CL', quantite: 2 }], zone: 'metropole' } })));
adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
adb('shell', 'settings', 'put', 'system', 'user_rotation', '0');
for (const chemin of ['/panier', '/commande']) {
  await charger(chemin);
  await p.waitForTimeout(1000);
  console.log(chemin, 'portrait au chargement', JSON.stringify(await releve()));
  adb('shell', 'settings', 'put', 'system', 'user_rotation', '1');
  await p.waitForTimeout(2500);
  console.log(chemin, 'paysage sans rechargement', JSON.stringify(await releve()));
  adb('shell', 'settings', 'put', 'system', 'user_rotation', '0');
  await p.waitForTimeout(2500);
  console.log(chemin, 'retour portrait sans rechargement', JSON.stringify(await releve()));
}
await b.close();
