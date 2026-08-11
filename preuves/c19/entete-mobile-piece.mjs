/* L'EN-TÊTE MOBILE — LA PIÈCE DE DÉCISION, ET RIEN D'AUTRE (C19).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CET OUTIL EST, ET CE QU'IL N'EST PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce n'est PAS une implémentation. La consigne de la tranche est explicite :
 * l'en-tête repliable est un POINT PRODUIT, il appartient au client, et rien
 * n'est livré tant qu'il n'a pas tranché. Cet outil prépare la pièce sur
 * laquelle il tranchera — les deux états, côte à côte, avec leurs chiffres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'HISTOIRE, EN QUATRE LIGNES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C13 a livré un en-tête qui se scelle au défilement — mais seulement à partir
 * de 48 rem. Sous cette largeur il ne colle pas, parce qu'il mesure 160,9 px,
 * soit dix-neuf pour cent d'un écran de 844. Le commentaire du composant
 * affirmait alors qu'un menu repliable « demanderait du JavaScript ».
 *
 * C17 l'a vérifié EN REPLIANT LA NAVIGATION DANS LA PAGE plutôt qu'en écrivant
 * le composant, et l'affirmation est tombée sur trois points :
 *
 *   1. `<details>` replie en CSS pur — l'obstacle n'était pas technique ;
 *   2. replier la seule navigation ne rend que 38,6 px sur 160,9, soit 24 % :
 *      CE QUI PÈSE EST LE BLOC DE MARQUE (122,2 px, le nom sur deux lignes
 *      plus sa ligne d'accroche) ;
 *   3. fermé par défaut, il retire leur boîte aux trois liens ET à la pastille
 *      du panier — or la campagne gelée clique l'un et lit l'autre sur ce
 *      profil-là.
 *
 * Le conflit est donc de PÉRIMÈTRE et non de technique : il faut décider que
 * le menu se replie, et mettre le harnais d'accord. C'est une décision de
 * produit, pas d'ingénierie.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES TROIS ÉTATS CAPTURÉS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. L'ÉTAT ACTUEL, en haut de page.
 * 2. L'ÉTAT ACTUEL APRÈS DÉFILEMENT : c'est lui qui montre le vrai sujet —
 *    l'en-tête est parti, il n'y a plus ni navigation ni panier accessibles
 *    sans remonter.
 * 3. UNE MAQUETTE REPLIÉE, simulée DANS LA PAGE (aucun code n'est livré) : le
 *    bloc de marque réduit à une ligne, la navigation repliée. Elle montre ce
 *    qu'on gagnerait — et ce qu'on perdrait.
 *
 * Emploi :  node preuves/c19/entete-mobile-piece.mjs
 */
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright-core';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3000';
const LARGEUR = 390;
const HAUTEUR = 844;

const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: LARGEUR, height: HAUTEUR },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

await page.goto(`${BASE}/boutique`, { waitUntil: 'load' });
await page.waitForTimeout(900);

/** La géométrie réelle, relevée et non recopiée du rapport de C17. */
const mesures = await page.evaluate(() => {
  const entete = document.querySelector('header[data-chrome-entete]') ?? document.querySelector('header');
  const nav = entete?.querySelector('nav');
  const marque = entete?.querySelector('a[href="/"]');

  const h = (noeud) => (noeud === null || noeud === undefined ? null : Math.round(noeud.getBoundingClientRect().height * 10) / 10);

  return {
    entete: h(entete),
    navigation: h(nav),
    marque: h(marque),
    fenetre: window.innerHeight,
  };
});

dire('');
dire(`L'EN-TÊTE MOBILE — PIÈCE DE DÉCISION (${String(LARGEUR)} × ${String(HAUTEUR)}, densité 2)`);
dire('='.repeat(74));
dire('');
dire('CE QUE L\'EN-TÊTE OCCUPE AUJOURD\'HUI');
dire('-'.repeat(74));
dire(`  hauteur totale de l'en-tête       ${String(mesures.entete)} px`);
dire(`  dont le bloc de marque            ${String(mesures.marque)} px`);
dire(`  dont la navigation                ${String(mesures.navigation)} px`);
dire(`  hauteur de la fenêtre             ${String(mesures.fenetre)} px`);
dire(
  `  part de l'écran                   ${((mesures.entete / mesures.fenetre) * 100).toFixed(1)} %`,
);
dire('');

await page.screenshot({
  path: 'preuves/c19/entete-mobile-1-actuel.png',
  clip: { x: 0, y: 0, width: LARGEUR, height: 420 },
});
dire('  capture 1 : preuves/c19/entete-mobile-1-actuel.png  (état actuel, haut de page)');

/* ÉTAT 2 — après défilement. C'est la capture qui pose le problème : il n'y a
   plus d'en-tête du tout, donc plus de panier ni de navigation. */
await page.evaluate(() => {
  window.scrollTo(0, 1400);
});
await page.waitForTimeout(500);
await page.screenshot({
  path: 'preuves/c19/entete-mobile-2-apres-defilement.png',
  clip: { x: 0, y: 0, width: LARGEUR, height: 420 },
});
dire('  capture 2 : preuves/c19/entete-mobile-2-apres-defilement.png  (l’en-tête est parti)');

/* ÉTAT 3 — LA MAQUETTE. Elle est posée EN STYLE INLINE, dans la page, et rien
   n'en sort : ni fichier, ni classe, ni composant. C'est une simulation à coût
   nul, au sens propre — le dépôt ne garde que la capture. */
await page.evaluate(() => {
  window.scrollTo(0, 0);
  const entete = document.querySelector('header');
  if (entete === null) return;

  /* La marque passe sur UNE ligne, sa ligne d'accroche disparaît, la
     navigation se replie derrière un bouton. Tout est simulé au style. */
  const accroche = entete.querySelector('p');
  if (accroche !== null) accroche.style.display = 'none';

  const nav = entete.querySelector('nav');
  if (nav !== null) nav.style.display = 'none';

  const bouton = document.createElement('span');
  bouton.textContent = 'MENU';
  bouton.setAttribute(
    'style',
    'position:absolute;right:20px;top:50%;transform:translateY(-50%);' +
      'font:500 12px/1 monospace;letter-spacing:.14em;border:1px solid #8b8471;' +
      'padding:8px 12px;border-radius:2px;color:#1c211a',
  );
  entete.style.position = 'relative';
  entete.append(bouton);
});
await page.waitForTimeout(300);

const replie = await page.evaluate(() => {
  const entete = document.querySelector('header');
  return entete === null ? null : Math.round(entete.getBoundingClientRect().height * 10) / 10;
});

await page.screenshot({
  path: 'preuves/c19/entete-mobile-3-maquette-repliee.png',
  clip: { x: 0, y: 0, width: LARGEUR, height: 420 },
});
dire('  capture 3 : preuves/c19/entete-mobile-3-maquette-repliee.png  (maquette, NON livrée)');

dire('');
dire('CE QUE LE REPLI RENDRAIT');
dire('-'.repeat(74));
dire(`  en-tête actuel                    ${String(mesures.entete)} px`);
dire(`  en-tête replié (maquette)         ${String(replie)} px`);
dire(
  `  rendu à l'écran                   ${(mesures.entete - (replie ?? 0)).toFixed(1)} px, ` +
    `soit ${(((mesures.entete - (replie ?? 0)) / mesures.entete) * 100).toFixed(0)} % de sa hauteur`,
);
dire('');
dire('CE QUE LA DÉCISION COÛTE, ET C\'EST LÀ QUE LE CLIENT TRANCHE');
dire('-'.repeat(74));
dire('  POUR   l\'en-tête pourrait alors COLLER sous 48 rem : la navigation et le');
dire('         panier resteraient joignables sans remonter la page — c\'est le');
dire('         vrai sujet, visible sur la capture 2 ;');
dire('         `scroll-padding-top` redeviendrait juste au-dessus des ancres des');
dire('         pages légales (écart n° 2 de C13, ouvert depuis).');
dire('  CONTRE la ligne d\'accroche « ÉPICERIE FINE — DÉMONSTRATION » disparaît du');
dire('         premier écran mobile, or elle porte le mot « démonstration » et');
dire('         c\'est une promesse tenue partout ailleurs sur ce site ;');
dire('         fermé par défaut, le menu retire leur boîte aux trois liens ET à la');
dire('         pastille du panier : DEUX cas de la campagne gelée les cliquent et');
dire('         les lisent sur ce profil, ils devront être réécrits.');
dire('');
dire('  Aucune ligne de code n\'est livrée. La maquette ci-dessus est posée en');
dire('  style inline, dans le navigateur, et disparaît avec lui.');
dire('');

await navigateur.close();
writeFileSync('preuves/c19/entete-mobile-piece.txt', `${lignes.join('\n')}\n`, 'utf8');
console.log('Relevé écrit dans preuves/c19/entete-mobile-piece.txt');
