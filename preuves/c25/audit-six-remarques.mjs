/**
 * LES SIX REMARQUES DU PROFESSIONNEL, RELUES SUR LE SITE PUBLIE.
 *
 * Un point n'est vert que si le comportement se CONSTATE dans le navigateur —
 * jamais parce qu'un composant existe dans le depot. L'audit du 19/08 a montre
 * ce que vaut la difference : la reassurance etait ecrite, livree, et invisible
 * la ou le client hesite.
 *
 * Usage : node preuves/c25/audit-six-remarques.mjs [base]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'https://maison-vaubrune-demo.vercel.app';
const FICHE = base + '/boutique/huile-olive-premiere-pression';
const navigateur = await chromium.launch();
const resultats = [];
const noter = (n, titre, ok, detail) => resultats.push({ n, titre, ok, detail });

/* 1, 2 et 4-fiche — le tiroir d'ajout et ce qu'il porte. */
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(FICHE, { waitUntil: 'networkidle' });

  const fiche = await page.locator('main').innerText();
  noter(4, 'reassurance sur la FICHE, tiroir ferme',
    /Quatorze jours/.test(fiche) && /Port offert/.test(fiche) && /Paiement s.curis/.test(fiche),
    'les trois garanties');
  noter(5, 'contact service client sur la FICHE',
    /Contactez le service client/.test(fiche), 'renvoi vers les mentions legales');

  await page.getByRole('button', { name: /Ajouter au panier/i }).first().click();
  await page.waitForTimeout(700);
  const tiroir = page.locator('[data-tiroir-ajout]');
  const ouvert = await tiroir.evaluate((n) => n.open);
  const texteTiroir = ouvert ? await tiroir.innerText() : '';
  noter(1, 'message d’ajout visible (tiroir modal)', ouvert && /ajout/i.test(texteTiroir),
    ouvert ? 'dialog open, confirmation lisible' : 'le tiroir ne s’ouvre pas');
  const suggestionsTiroir = await tiroir.locator('[data-suggestion]').count();
  noter(2, 'produits complementaires DANS le tiroir', suggestionsTiroir >= 2,
    suggestionsTiroir + ' cartes');
  await page.close();
}

/* 2-fiche — les suggestions vivent aussi sur la fiche elle-meme. */
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(FICHE, { waitUntil: 'networkidle' });
  const titre = await page.getByText(/Vous aimerez peut-.tre aussi/i).count();
  await page.close();
  noter(2, 'rayon « vous aimerez peut-etre aussi »', titre >= 1, titre + ' occurrence(s)');
}

/* 3 — le menu replie sur mobile. */
{
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  const bouton = page.locator('summary').first();
  const existe = await bouton.count();
  const avant = await page.getByRole('link', { name: 'Boutique', exact: true }).first().isVisible();
  if (existe) { await bouton.click(); await page.waitForTimeout(400); }
  const apres = await page.getByRole('link', { name: 'Boutique', exact: true }).first().isVisible();
  await page.close();
  noter(3, 'menu replie sur mobile (390 px)', existe > 0 && !avant && apres,
    'replie au repos : ' + !avant + ', deplie au clic : ' + apres);
}

/* 4-panier, 5-panier — le dernier ecran avant le paiement. */
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(FICHE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Ajouter au panier/i }).first().click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.goto(base + '/panier', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const texte = await page.locator('main').innerText();
  const cartes = await page.locator('[data-suggestion]').count();
  await page.close();
  noter(4, 'reassurance dans le PANIER',
    /Quatorze jours/.test(texte) && /Port offert/.test(texte) && /Paiement s.curis/.test(texte),
    'les trois garanties');
  noter(5, 'contact service client dans le PANIER',
    /Contactez le service client/.test(texte), 'sous le recapitulatif');
  noter(2, 'produits complementaires dans le PANIER', cartes >= 2, cartes + ' cartes');
}

/* 6 — l'accueil : categories en grandes images ET rail de produits. */
{
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  const tuiles = await page.locator('.tuile-famille').count();
  const grandeTuile = await page.locator('.tuile-famille').first().evaluate((n) => n.getBoundingClientRect().width);
  const rail = await page.locator('.rail-vitrine [data-produit-vitrine], .rail-vitrine a').count();
  await page.close();
  noter(6, 'categories en grandes images a l’accueil', tuiles >= 7 && grandeTuile >= 300,
    tuiles + ' tuiles, la premiere ' + Math.round(grandeTuile) + ' px de large');
  noter(6, 'carrousel produits a l’accueil', rail >= 4, rail + ' produits au rail');
}

await navigateur.close();

let tout = true;
for (const r of resultats) {
  if (!r.ok) tout = false;
  console.log((r.ok ? 'OK  ' : 'NON ') + '[' + r.n + '] ' + r.titre.padEnd(48) + ' — ' + r.detail);
}
console.log(tout ? '\nLES SIX REMARQUES SONT TRAITEES.' : '\nIL RESTE AU MOINS UN POINT.');
process.exit(tout ? 0 : 1);
