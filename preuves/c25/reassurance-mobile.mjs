/**
 * C25 — LA REASSURANCE SUR LES DEUX PROFILS, ET PAS SEULEMENT SUR UN BUREAU.
 *
 * `reassurance.mjs` n'a joue qu'en 1280 : sur un telephone la fiche et le
 * panier passent en UNE colonne, l'ordre des blocs change, et le tiroir occupe
 * presque tout l'ecran. Un bloc juste sur un bureau peut y etre pousse sous la
 * ligne de flottaison, deborder en largeur, ou passer derriere le tiroir.
 *
 * On mesure donc quatre choses par profil : le texte RENDU, la POSITION du bloc
 * (est-il avant ou apres le bouton qui engage ?), le DEBORDEMENT horizontal du
 * document, et la hauteur utile du tiroir. Captures a l'appui.
 *
 * Usage : node preuves/c25/reassurance-mobile.mjs [base]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'https://maison-vaubrune-demo.vercel.app';
const FICHE = base + '/boutique/huile-olive-premiere-pression';
const SORTIE = 'preuves/c25/captures';
mkdirSync(SORTIE, { recursive: true });

const PROFILS = [
  { nom: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true },
  { nom: 'bureau-1280', viewport: { width: 1280, height: 800 }, isMobile: false },
];

const GARANTIES = [/Quatorze jours/, /Port offert/, /Paiement s.curis/];
const navigateur = await chromium.launch();
let tout = true;
const dire = (profil, sujet, ok, detail) => {
  if (!ok) tout = false;
  console.log((ok ? 'OK  ' : 'NON ') + profil.padEnd(12) + sujet.padEnd(42) + ' — ' + detail);
};

for (const profil of PROFILS) {
  const page = await navigateur.newPage({ viewport: profil.viewport, deviceScaleFactor: 2 });

  /* ── LA FICHE ─────────────────────────────────────────────────────────── */
  await page.goto(FICHE, { waitUntil: 'networkidle' });
  const fiche = await page.locator('main').innerText();
  dire(profil.nom, 'fiche : les trois garanties', GARANTIES.every((g) => g.test(fiche)), 'texte rendu');
  dire(profil.nom, 'fiche : contact service client', /Contactez le service client/.test(fiche), '');

  /* Le bloc doit rester SOUS le bouton d'ajout — il rassure sur un geste qu'on
     s'apprete a faire, il ne le precede pas. */
  const ordre = await page.evaluate(() => {
    /* Le bouton d'ajout par son LIBELLE, et le bloc par son identifiant PROPRE.
       Premiere version : `[data-bloc-achat] button` et `#titre-reassurance` —
       tous deux attrapaient les organes du TIROIR, qui vit dans le meme bloc
       d'achat, d'ou un ecart de -2258 px sur les deux profils. La mesure etait
       fausse ; elle a revele que l'identifiant, lui, etait duplique pour de bon. */
    const boutons = [...document.querySelectorAll('[data-bloc-achat] button')];
    const bouton = boutons.find((n) => /Ajouter au panier/i.test(n.textContent ?? ''));
    const bloc = document.querySelector('#reassurance-fiche');
    if (!bouton || !bloc) return null;
    return { bouton: bouton.getBoundingClientRect().top, bloc: bloc.getBoundingClientRect().top };
  });
  dire(profil.nom, 'fiche : le bloc suit le bouton d’ajout',
    ordre !== null && ordre.bloc > ordre.bouton,
    ordre === null ? 'organe introuvable' : Math.round(ordre.bloc - ordre.bouton) + ' px sous le bouton');

  const debordFiche = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(profil.nom, 'fiche : aucun debordement horizontal', debordFiche === 0, debordFiche + ' px');
  await page.screenshot({ path: SORTIE + '/fiche-' + profil.nom + '.png', fullPage: false });

  /* ── LE TIROIR ────────────────────────────────────────────────────────── */
  await page.getByRole('button', { name: /Ajouter au panier/i }).first().click();
  await page.waitForTimeout(700);
  const tiroir = page.locator('[data-tiroir-ajout]');
  const boite = await tiroir.boundingBox();
  const dansEcran = boite !== null && boite.height <= profil.viewport.height;
  dire(profil.nom, 'tiroir : tient dans la hauteur d’ecran', dansEcran,
    boite === null ? 'absent' : Math.round(boite.height) + ' px sur ' + profil.viewport.height);
  const cartes = await tiroir.locator('[data-suggestion]').count();
  dire(profil.nom, 'tiroir : suggestions', cartes >= 2, cartes + ' cartes');
  await page.screenshot({ path: SORTIE + '/tiroir-' + profil.nom + '.png' });

  /* ── LE PANIER ────────────────────────────────────────────────────────── */
  await page.keyboard.press('Escape');
  await page.goto(base + '/panier', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const panier = await page.locator('main').innerText();
  dire(profil.nom, 'panier : les trois garanties', GARANTIES.every((g) => g.test(panier)), 'texte rendu');
  dire(profil.nom, 'panier : contact service client', /Contactez le service client/.test(panier), '');
  const debordPanier = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(profil.nom, 'panier : aucun debordement horizontal', debordPanier === 0, debordPanier + ' px');
  await page.screenshot({ path: SORTIE + '/panier-' + profil.nom + '.png', fullPage: true });

  await page.close();
}

await navigateur.close();
console.log(tout ? '\nLES DEUX PROFILS SONT CONFORMES.' : '\nAU MOINS UN ECART.');
process.exit(tout ? 0 : 1);
