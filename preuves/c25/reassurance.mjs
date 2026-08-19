/**
 * C25 — LA REASSURANCE SE LIT-ELLE AUX DEUX ENDROITS QUE LE PROFESSIONNEL A
 * NOMMES ? « dans le panier ou au niveau de la fiche produit ».
 *
 * On ne lit pas la source : on lit le TEXTE RENDU, tiroir FERME sur la fiche,
 * panier REMPLI sur /panier — c'est-a-dire les deux etats ou un client hesite.
 * L'audit du 19/08 a montre que la source ne dit rien de ce qui est peint.
 *
 * Usage : node preuves/c25/reassurance.mjs [base]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const attendus = { retour14j: /Quatorze jours/i, portOffert: /Port offert/i, paiement: /Paiement s.curis/i };

const lire = (texte) =>
  Object.fromEntries(Object.entries(attendus).map(([clef, motif]) => [clef, motif.test(texte)]));

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(base + '/boutique/huile-olive-premiere-pression', { waitUntil: 'networkidle' });
const fiche = lire(await page.locator('main').innerText());

await page.getByRole('button', { name: /Ajouter au panier/i }).first().click();
await page.waitForTimeout(600);
await page.keyboard.press('Escape');
await page.goto(base + '/panier', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const panier = lire(await page.locator('main').innerText());

console.log('FICHE PRODUIT (tiroir ferme) :', JSON.stringify(fiche));
console.log('PAGE PANIER (un article)    :', JSON.stringify(panier));

await navigateur.close();
const complet = [...Object.values(fiche), ...Object.values(panier)].every(Boolean);
console.log(complet ? 'OK — les trois garanties se lisent aux deux endroits' : 'MANQUE');
process.exit(complet ? 0 : 1);
