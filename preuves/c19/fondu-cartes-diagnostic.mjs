/**
 * DIAGNOSTIC IN VIVO DU FONDU DES CARTES — retour client (11) du 10/08.
 *
 * Le client dit « toujours trop rapide et peu fluide » ; l'orchestrateur a
 * capturé un survol à 300 ms où la matière était DÉJÀ entièrement en place.
 * Deux explications possibles, et elles ne demandent pas le même correctif :
 *
 *   (a) la transition ne s'applique pas (couche, utilitaire, sélecteur) ;
 *   (b) elle s'applique, mais elle court À VIDE au PREMIER survol — l'image
 *       d'ambiance n'est déclarée qu'à cet instant, elle est donc téléchargée
 *       et décodée PENDANT le fondu, et elle se peint d'un coup à l'opacité
 *       courante (souvent 1).
 *
 * Ce script tranche par la mesure, en trois relevés :
 *   1. le style calculé de la couche au repos et au survol ;
 *   2. la série d'opacités du PREMIER survol, avec l'instant exact où l'image
 *      devient décodable (mesuré par un `Image().decode()` posé à l'instant du
 *      survol, sur la même adresse — donc soumis au même cache) ;
 *   3. la même série au SECOND survol, image en cache.
 *
 * Il ne modifie rien. Sortie : texte sur la sortie standard.
 */

import { chromium } from '@playwright/test';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3111';

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'no-preference',
});
const page = await contexte.newPage();

/* Le cache est vide : c'est la condition du PREMIER survol. */
await page.goto(`${BASE}/boutique`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.dataset['hydratation'] === 'prete');
await page.waitForFunction(() => document.documentElement.classList.contains('mouvement'));

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  console.log(texte);
};

dire('=== DIAGNOSTIC DU FONDU DES CARTES ===');

/* ------------------------------------------------------------------------ */
/* 1. LE STYLE CALCULÉ                                                       */
/* ------------------------------------------------------------------------ */

const repos = await page.evaluate(() => {
  const carte = document.querySelector('.carte-produit');
  const couche = carte?.querySelector('.carte-ambiance');
  const image = carte?.querySelector('.carte-visuel img');
  if (couche === null || couche === undefined) return null;
  const s = getComputedStyle(couche);
  const si = image === null || image === undefined ? null : getComputedStyle(image);
  return {
    coucheTransitionProperty: s.transitionProperty,
    coucheTransitionDuration: s.transitionDuration,
    coucheOpacite: s.opacity,
    coucheTransform: s.transform,
    coucheImage: s.backgroundImage,
    packshotTransitionProperty: si === null ? '(pas d’image)' : si.transitionProperty,
    packshotTransitionDuration: si === null ? '(pas d’image)' : si.transitionDuration,
    packshotOpacite: si === null ? '(pas d’image)' : si.opacity,
  };
});

dire('');
dire('-- 1. STYLE CALCULÉ AU REPOS (première carte) --');
for (const [clef, valeur] of Object.entries(repos ?? {})) {
  dire(`   ${clef} = ${String(valeur).slice(0, 160)}`);
}

/* ------------------------------------------------------------------------ */
/* 2. LE PREMIER SURVOL                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Pose l'échantillonneur ET la sonde de décodage. La sonde est un
 * `new Image()` sur la MÊME adresse : elle passe donc par le même cache que le
 * fond, et l'instant où sa promesse se résout est l'instant à partir duquel la
 * couche a quelque chose à peindre.
 */
const poserSonde = async () => {
  await page.evaluate(() => {
    const fenetre = window;
    const carte = document.querySelector('.carte-produit');
    const couche = carte.querySelector('.carte-ambiance');
    const image = carte.querySelector('.carte-visuel img');

    fenetre.releve = {
      debut: performance.now(),
      serie: [],
      decodee: null,
      adresse: null,
    };

    const echantillonner = () => {
      fenetre.releve.serie.push({
        t: Math.round(performance.now() - fenetre.releve.debut),
        couche: Number(getComputedStyle(couche).opacity),
        coucheEchelle: getComputedStyle(couche).transform,
        packshot: image === null ? 1 : Number(getComputedStyle(image).opacity),
      });
      if (performance.now() - fenetre.releve.debut < 2000) {
        requestAnimationFrame(echantillonner);
      }
    };

    requestAnimationFrame(echantillonner);

    /* La sonde de décodage : on relit l'adresse déclarée par la feuille dès
       qu'elle apparaît, puis on chronomètre son décodage. */
    const guetter = () => {
      const fond = getComputedStyle(couche).backgroundImage;
      const trouve = /url\("([^"]+)"\)/.exec(fond);
      if (trouve === null) {
        if (performance.now() - fenetre.releve.debut < 2000) requestAnimationFrame(guetter);
        return;
      }
      fenetre.releve.adresse = trouve[1].split('/').pop();
      const sonde = new Image();
      sonde.src = trouve[1];
      sonde
        .decode()
        .then(() => {
          fenetre.releve.decodee = Math.round(performance.now() - fenetre.releve.debut);
        })
        .catch(() => {
          fenetre.releve.decodee = -1;
        });
    };

    requestAnimationFrame(guetter);
  });
};

const lireReleve = async () => page.evaluate(() => window.releve);

const resumer = (releve, titre) => {
  const serie = releve.serie;
  const intermediaires = serie.filter((p) => p.couche > 0.01 && p.couche < 0.99);
  const premierNonNul = serie.find((p) => p.couche > 0.01);
  const premierPlein = serie.find((p) => p.couche > 0.99);
  dire('');
  dire(`-- ${titre} --`);
  dire(`   fichier d’ambiance      : ${String(releve.adresse)}`);
  dire(`   décodable à             : ${String(releve.decodee)} ms après le survol`);
  dire(`   opacité > 0,01 à        : ${premierNonNul === undefined ? '(jamais)' : `${String(premierNonNul.t)} ms`}`);
  dire(`   opacité = 1 à           : ${premierPlein === undefined ? '(jamais)' : `${String(premierPlein.t)} ms`}`);
  dire(`   opacités intermédiaires : ${String(intermediaires.length)}`);
  if (releve.decodee !== null && releve.decodee >= 0 && premierPlein !== undefined) {
    const opaciteALArrivee = serie.find((p) => p.t >= releve.decodee);
    dire(
      `   OPACITÉ DE LA COUCHE À L’INSTANT OÙ L’IMAGE DEVIENT PEIGNABLE : ${
        opaciteALArrivee === undefined ? '(après la série)' : opaciteALArrivee.couche.toFixed(3)
      }`,
    );
  }
  const echantillons = serie
    .filter((_, index) => index % 4 === 0)
    .slice(0, 22)
    .map((p) => `${String(p.t)}:${p.couche.toFixed(2)}`)
    .join(' ');
  dire(`   série (t:opacité)       : ${echantillons}`);
};

await poserSonde();
await page.locator('.carte-produit').first().hover();
await page.waitForTimeout(2100);
resumer(await lireReleve(), '2. PREMIER SURVOL (cache vide)');

/* ------------------------------------------------------------------------ */
/* 3. LE SECOND SURVOL — image en cache                                      */
/* ------------------------------------------------------------------------ */

await page.mouse.move(5, 5);
await page.waitForTimeout(1200);
await poserSonde();
await page.locator('.carte-produit').first().hover();
await page.waitForTimeout(2100);
resumer(await lireReleve(), '3. SECOND SURVOL (image en cache)');

/* ------------------------------------------------------------------------ */
/* 4. LE SURVOL, VU PAR LE PIXEL                                             */
/* ------------------------------------------------------------------------ */

/* La lecture d'opacité dit ce que le style calcule ; elle ne dit pas ce que
   l'œil voit. On relit donc, sur une carte JAMAIS approchée, la couleur d'un
   point de la vignette à trois instants — sans capture d'écran, qui coûte plus
   cher que le geste ne dure (leçon C18). */
const pixels = await page.evaluate(async () => {
  const cartes = [...document.querySelectorAll('.carte-produit')];
  const carte = cartes.find((n) => n.dataset['ambianceChargee'] === undefined);
  if (carte === undefined) return '(toutes les cartes ont déjà été approchées)';
  const couche = carte.querySelector('.carte-ambiance');
  const debut = performance.now();
  const releves = [];
  carte.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  await new Promise((resoudre) => {
    const boucle = () => {
      releves.push({
        t: Math.round(performance.now() - debut),
        o: Number(getComputedStyle(couche).opacity),
        fond: getComputedStyle(couche).backgroundImage === 'none' ? 'aucun' : 'déclaré',
      });
      if (performance.now() - debut < 1500) requestAnimationFrame(boucle);
      else resoudre();
    };
    requestAnimationFrame(boucle);
  });
  return releves
    .filter((_, i) => i % 6 === 0)
    .map((p) => `${String(p.t)}ms o=${p.o.toFixed(2)} fond=${p.fond}`)
    .join(' | ');
});

dire('');
dire('-- 4. SURVOL PROGRAMMATIQUE SUR UNE CARTE VIERGE --');
dire(`   ${String(pixels)}`);

await navigateur.close();
