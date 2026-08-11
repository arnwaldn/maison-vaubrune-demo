/* RELEVÉ DE LA TRANCHE C14 — ce que la fiche pilote pèse et montre RÉELLEMENT.
 *
 * Trois mesures, un seul démarrage de serveur et de navigateur, parce que les
 * trois portent sur le même rendu et qu'un relevé pris à trois moments
 * différents n'est pas un relevé, c'est trois anecdotes.
 *
 *   1. LE POIDS TRANSFÉRÉ DES IMAGES de la fiche pilote (plafond D36 : 120 Ko)
 *      et celui de la police mono, mesurés au `transferSize` réel — jamais à la
 *      taille du fichier sur le disque : ce sont deux nombres différents dès
 *      qu'une compression entre en jeu, et c'est le premier qui coûte au
 *      visiteur.
 *   2. LES CARACTÈRES RÉELLEMENT RENDUS EN MONO sur toutes les routes
 *      publiques. C'est la pièce qui justifie (ou contredit) le répertoire
 *      déclaré de `scripts/preparer-police-mono.mjs` : le répertoire embarqué
 *      doit être un SUR-ensemble de ce relevé, sans quoi un glyphe manque et la
 *      page se recompose dans le repli.
 *   3. LES CAPTURES de la fiche pilote, bureau et mobile.
 *
 * Usage : node preuves/c14/releve-c14.mjs --suffixe avant|apres
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const SORTIE = fileURLToPath(new URL('.', import.meta.url));
const rang = process.argv.indexOf('--suffixe');
const SUFFIXE = rang === -1 ? 'releve' : (process.argv[rang + 1] ?? 'releve');

const FICHE = '/boutique/huile-olive-premiere-pression';

/* Les routes publiques, celles où la mono peut rendre un caractère. */
const ROUTES = [
  '/',
  '/boutique',
  FICHE,
  '/boutique/beurre-baratte-demi-sel',
  '/boutique/coffret-composez-le-votre',
  '/panier',
  '/commande',
  '/commande/confirmation',
  '/commande/annulee',
  '/livraison',
  '/suivi',
  '/mentions-legales',
  '/conditions-generales-de-vente',
  '/donnees-personnelles',
  '/retractation',
  '/a-propos-de-cette-demonstration',
  '/gestion',
  '/gestion/catalogue',
  '/gestion/commandes',
  '/gestion/prise-en-main',
  '/gestion/modeles-de-courriels',
  '/paiement/simulation',
  '/introuvable-pour-la-404',
];

const port = 3997;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

mkdirSync(SORTIE, { recursive: true });

/* -------------------------------------------------------------------------- */
/* 1. Poids transférés sur la fiche pilote                                     */
/* -------------------------------------------------------------------------- */

/* LE MÊME PROFIL QUE LIGHTHOUSE MOBILE ET QUE `diag-cls.mjs` — 412 points de
   large, mais un rapport de pixels de 1,75. Mesurer à 1 aurait fait choisir au
   navigateur la plus petite largeur du srcset et rendu un chiffre flatteur qui
   ne correspond à aucun téléphone réel. */
const contextePoids = await navigateur.newContext({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 1.75,
  isMobile: true,
  hasTouch: true,
});
const pagePoids = await contextePoids.newPage();

await pagePoids.goto(`http://localhost:${port}${FICHE}`, { waitUntil: 'networkidle' });
/* Le chargement paresseux d'une image hors du premier écran ne se déclenche
   qu'au défilement : on descend, sinon on mesurerait une fiche à moitié
   chargée et le nombre serait flatteur pour la mauvaise raison. */
await pagePoids.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
await pagePoids.waitForTimeout(3000);

const ressources = await pagePoids.evaluate(() =>
  performance.getEntriesByType('resource').map((e) => ({
    url: e.name,
    type: e.initiatorType,
    transfere: e.transferSize,
    decode: e.decodedBodySize,
  })),
);

const images = ressources.filter((r) => /\.(avif|jpg|jpeg|png|webp)(\?|$)/i.test(r.url));
const polices = ressources.filter((r) => /\.woff2(\?|$)/i.test(r.url));

const totalImages = images.reduce((s, r) => s + r.transfere, 0);
const totalPolices = polices.reduce((s, r) => s + r.transfere, 0);
const totalTout = ressources.reduce((s, r) => s + r.transfere, 0);

await contextePoids.close();

/* -------------------------------------------------------------------------- */
/* 2. Les caractères rendus en mono, sur toutes les routes                     */
/* -------------------------------------------------------------------------- */

const caracteres = new Set();
const parRoute = {};

const contexteMono = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
const pageMono = await contexteMono.newPage();

for (const route of ROUTES) {
  await pageMono.goto(`http://localhost:${port}${route}`, { waitUntil: 'load' });
  await pageMono.waitForTimeout(300);

  const vus = await pageMono.evaluate(() => {
    const trouves = new Set();

    /* On ne cherche pas la CLASSE `registre` ou `etiquette` — c'est l'erreur
       que C13 a payée : un contrôle qui cherche la marque d'une propriété ne
       voit que ce qui la porte. On interroge la police EFFECTIVEMENT calculée,
       nœud de texte par nœud de texte. */
    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    for (let noeud = parcours.nextNode(); noeud !== null; noeud = parcours.nextNode()) {
      const texte = noeud.nodeValue ?? '';

      if (texte.trim() === '') {
        continue;
      }

      const parent = noeud.parentElement;

      if (parent === null) {
        continue;
      }

      const famille = getComputedStyle(parent).fontFamily;

      if (!/mono/i.test(famille)) {
        continue;
      }

      /* Les capitales fabriquées par `text-transform` ne sont pas dans le
         texte source : c'est la mise en forme qui les crée, et ce sont ELLES
         qu'il faut au sous-ensemble. */
      const transforme = getComputedStyle(parent).textTransform;
      const rendu = transforme === 'uppercase' ? texte.toUpperCase() : texte;

      for (const caractere of rendu) {
        trouves.add(caractere);
      }
    }

    return [...trouves];
  });

  parRoute[route] = vus.length;

  for (const caractere of vus) {
    caracteres.add(caractere);
  }
}

await contexteMono.close();

/* -------------------------------------------------------------------------- */
/* 3. Captures de la fiche pilote                                              */
/* -------------------------------------------------------------------------- */

for (const [nom, largeur, hauteur] of [
  ['bureau', 1280, 900],
  ['mobile', 390, 844],
]) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur } });
  const page = await contexte.newPage();
  await page.goto(`http://localhost:${port}${FICHE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `${SORTIE}fiche-${nom}-${SUFFIXE}.png`,
    fullPage: true,
  });
  await contexte.close();
}

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

const ko = (o) => `${(o / 1024).toFixed(1)} Ko`;
const points = [...caracteres].sort();

const rapport = {
  suffixe: SUFFIXE,
  fiche: FICHE,
  imagesTransferees: totalImages,
  imagesDetail: images.map((r) => ({ url: r.url.split('/').pop(), transfere: r.transfere })),
  policesTransferees: totalPolices,
  policesDetail: polices.map((r) => ({ url: r.url.split('/').pop(), transfere: r.transfere })),
  totalTransfere: totalTout,
  monoCaracteresDistincts: points.length,
  monoCaracteres: points.join(''),
  monoPointsDeCode: points.map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`),
  monoParRoute: parRoute,
};

writeFileSync(`${SORTIE}releve-${SUFFIXE}.json`, `${JSON.stringify(rapport, null, 2)}\n`, 'utf8');

console.log('');
console.log(`RELEVÉ C14 — ${SUFFIXE}`);
console.log('-'.repeat(72));
console.log(`Fiche pilote      : ${FICHE}`);
console.log(`Images            : ${ko(totalImages)} sur un plafond de 120 Ko (${String(images.length)} fichier(s))`);

for (const image of images) {
  console.log(`   ${image.url.split('/').pop()} — ${ko(image.transfere)}`);
}

console.log(`Polices           : ${ko(totalPolices)} (${String(polices.length)} fichier(s))`);

for (const police of polices) {
  console.log(`   ${police.url.split('/').pop()} — ${ko(police.transfere)}`);
}

console.log(`Total transféré   : ${ko(totalTout)}`);
console.log(`Mono, caractères  : ${String(points.length)} distincts sur ${String(ROUTES.length)} routes`);
console.log(`   ${points.join('')}`);
console.log('-'.repeat(72));
console.log('');

await navigateur.close();
serveur.kill();
process.exit(0);
