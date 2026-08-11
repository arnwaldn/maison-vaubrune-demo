#!/usr/bin/env node
/**
 * LES PREUVES IN VIVO DE C19-ter — un retour client, une mesure, une image.
 *
 * ---------------------------------------------------------------------------
 * Ce que cet outil regarde, et pourquoi il regarde CELA
 * ---------------------------------------------------------------------------
 *
 * (13) LA MACRO DES FAMILLES SUIT LE REGARD. Le défaut se voyait EN BAS de la
 *      liste, pas en haut : on descend jusqu'à la dernière famille et on relève
 *      la position du cadre. Mesurer en haut de page n'aurait rien dit.
 *
 * (15) LE BANDEAU NE RECOUVRE PLUS RIEN. Deux nombres, et le second est le
 *      critère : la HAUTEUR du bandeau, et le CHEVAUCHEMENT de son rectangle
 *      avec celui de la première carte de la rangée visée — après un vrai clic
 *      d'ancre, jamais après un `scrollIntoView` de convenance, qui n'applique
 *      ni `scroll-padding-top` ni `scroll-margin`.
 *
 * (16) LES COFFRETS FONDENT. Le survol est ARRÊTÉ à 450 ms par l'API Web
 *      Animations (parade de C19 au piège des captures de séquence : on ne
 *      photographie pas un geste en cours, on l'arrête). Ce que l'image montre
 *      n'est plus « à peu près 450 ms », c'est 450 ms.
 *
 * (18) L'ENTRÉE DES BLOCS-TITRES et son COÛT. Le coût se mesure sur le plus
 *      grand affichage de contenu, avant et après, sur la MÊME construction :
 *      la seule différence entre les deux passes est une feuille de style
 *      injectée qui neutralise l'animation. Comparer deux constructions aurait
 *      mêlé au geste tout ce qui a changé autour de lui.
 *
 * (14/17) LES QUATRE PAGES REMPLIES. Une capture par page, en haut de page, à
 *      l'état d'arrivée — c'est-à-dire ce que le client verra.
 *
 * Usage : node preuves/c19/c19ter-in-vivo.mjs [--base http://localhost:3000]
 *                                             [--sortie preuves/c19]
 */
import { mkdirSync } from 'node:fs';

import { chromium } from 'playwright';

const arguments_ = process.argv.slice(2);
const lire = (nom, defaut) => {
  const rang = arguments_.indexOf(nom);

  return rang === -1 ? defaut : (arguments_[rang + 1] ?? defaut);
};

const BASE = lire('--base', 'http://localhost:3000');
const SORTIE = lire('--sortie', 'preuves/c19');

mkdirSync(SORTIE, { recursive: true });

const navigateur = await chromium.launch();
const dire = (ligne) => {
  console.log(ligne);
};

/** Attend un signal de la page sans dépendre du rythme de `waitForFunction`. */
async function attendre(page, condition, essais = 60) {
  for (let essai = 0; essai < essais; essai += 1) {
    if (await page.evaluate(condition)) return true;
    await page.waitForTimeout(250);
  }

  return false;
}

async function ouvrir(largeur, hauteur, options = {}) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: hauteur },
    deviceScaleFactor: options.densite ?? 1,
    reducedMotion: options.reduce === true ? 'reduce' : 'no-preference',
  });

  return { contexte, page: await contexte.newPage() };
}

/* ═══════════════════════════════════════════════ (13) LA MACRO COLLANTE ═══ */

dire('');
dire('(13) LA MACRO DES SEPT FAMILLES — visible EN BAS de la liste');
dire('-'.repeat(74));

{
  /* 1280 × 720, la fenêtre de portable où le défaut se voit le mieux. */
  const { contexte, page } = await ouvrir(1280, 720);

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await attendre(page, () => document.fonts.status === 'loaded');
  await page.waitForTimeout(1800);

  /* On descend jusqu'à la DERNIÈRE famille et on la survole : c'est le geste
     exact du client, et c'est là que le fondu se jouait hors de vue. */
  await page.evaluate(() => {
    const items = document.querySelectorAll('.familles li');
    items[items.length - 1]?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.locator('.familles li').last().hover();
  await page.waitForTimeout(900);

  const releve = await page.evaluate(() => {
    const cadre = document.querySelector('.apercu-cadre');
    const dernier = document.querySelector('.familles li:last-child');
    const boite = cadre?.getBoundingClientRect();
    const entete = document.querySelector('header')?.getBoundingClientRect();

    return {
      position: cadre === null ? null : getComputedStyle(cadre).position,
      cadre:
        boite === undefined
          ? null
          : { haut: Math.round(boite.top), bas: Math.round(boite.bottom) },
      basEntete: entete === undefined ? null : Math.round(entete.bottom),
      hauteurFenetre: window.innerHeight,
      dernierSurvole: dernier === null ? null : Math.round(dernier.getBoundingClientRect().top),
      /* La couche visible est celle de la famille survolée : son opacité dit que
         le crossfade a bien lieu, et le cadre dit qu'on le voit. */
      couchesVisibles: [...document.querySelectorAll('.apercu-famille')].filter(
        (n) => Number(getComputedStyle(n).opacity) > 0.5,
      ).length,
    };
  });

  const entierementVisible =
    releve.cadre !== null &&
    releve.basEntete !== null &&
    releve.cadre.haut >= releve.basEntete &&
    releve.cadre.bas <= releve.hauteurFenetre;

  dire(`   position calculée ............ ${String(releve.position)}`);
  dire(
    `   cadre dans la fenêtre ....... haut ${String(releve.cadre?.haut)}, ` +
      `bas ${String(releve.cadre?.bas)} (fenêtre ${String(releve.hauteurFenetre)}, ` +
      `en-tête jusqu’à ${String(releve.basEntete)})`,
  );
  dire(`   dernière famille survolée ... y = ${String(releve.dernierSurvole)}`);
  dire(`   couches d’aperçu visibles ... ${String(releve.couchesVisibles)}`);
  dire(
    `   ${entierementVisible ? 'OK  ' : 'ÉCHEC'} le cadre est ENTIER sous l’en-tête pendant le survol du dernier nom`,
  );

  await page.screenshot({ path: `${SORTIE}/c19ter-13-macro-bas-de-liste.png` });
  await contexte.close();
}

/* ═════════════════════════════════════════════ (15) LE BANDEAU COMPACTÉ ═══ */

dire('');
dire('(15) LE BANDEAU DES FAMILLES — hauteur et chevauchement');
dire('-'.repeat(74));

for (const largeur of [1440, 1280]) {
  const { contexte, page } = await ouvrir(largeur, 900);

  await page.goto(`${BASE}/boutique`, { waitUntil: 'domcontentloaded' });
  await attendre(page, () => document.fonts.status === 'loaded');
  await page.waitForTimeout(1200);

  const hauteur = await page.evaluate(() => {
    const bandeau = document.querySelector('nav[aria-labelledby="titre-familles"]');
    const liens = [...document.querySelectorAll('.lien-famille')];

    return {
      hauteur: Math.round((bandeau?.getBoundingClientRect().height ?? 0) * 10) / 10,
      rangs: new Set(liens.map((n) => Math.round(n.getBoundingClientRect().top))).size,
      replies: liens.filter((n) => n.getBoundingClientRect().height > 30).length,
    };
  });

  /* UN VRAI CLIC D'ANCRE, et non un `scrollIntoView` : lui seul applique
     `scroll-padding-top` et le `scroll-mt` des sections, c'est-à-dire ce que le
     visiteur subit réellement. */
  await page.locator('.lien-famille').nth(2).click();
  await page.waitForTimeout(1200);

  const chevauchement = await page.evaluate(() => {
    const bandeau = document
      .querySelector('nav[aria-labelledby="titre-familles"]')
      ?.getBoundingClientRect();
    const section = document.querySelector('#rayon-miels-et-confitures');
    const titre = section?.querySelector('h2')?.getBoundingClientRect();
    const carte = section?.querySelector('.carte-produit')?.getBoundingClientRect();

    const croise = (boite) =>
      bandeau === undefined || boite === undefined
        ? null
        : Math.round(Math.max(0, bandeau.bottom - boite.top));

    return {
      basBandeau: bandeau === undefined ? null : Math.round(bandeau.bottom),
      hautTitre: titre === undefined ? null : Math.round(titre.top),
      hautCarte: carte === undefined ? null : Math.round(carte.top),
      surTitre: croise(titre),
      surCarte: croise(carte),
    };
  });

  dire(`   ── fenêtre ${String(largeur)}`);
  dire(
    `      hauteur du bandeau ....... ${String(hauteur.hauteur)} px ` +
      `(était 140,5 avant C19-ter)`,
  );
  dire(`      rangs de liens ........... ${String(hauteur.rangs)}`);
  dire(`      liens repliés sur 2 lignes ${String(hauteur.replies)}`);
  dire(
    `      après clic d’ancre ....... bandeau jusqu’à ${String(chevauchement.basBandeau)}, ` +
      `titre à ${String(chevauchement.hautTitre)}, carte à ${String(chevauchement.hautCarte)}`,
  );
  dire(
    `      ${chevauchement.surTitre === 0 && chevauchement.surCarte === 0 ? 'OK  ' : 'ÉCHEC'} ` +
      `chevauchement : ${String(chevauchement.surTitre)} px sur le titre, ` +
      `${String(chevauchement.surCarte)} px sur la première carte`,
  );

  if (largeur === 1280) {
    await page.screenshot({ path: `${SORTIE}/c19ter-15-bandeau-sans-chevauchement.png` });
  }

  await contexte.close();
}

/* ═══════════════════════════════════════════ (16) LE COFFRET À MI-FONDU ═══ */

dire('');
dire('(16) LE COFFRET — le fondu croisé, ARRÊTÉ à 450 ms');
dire('-'.repeat(74));

{
  const { contexte, page } = await ouvrir(1280, 900, { densite: 2 });

  await page.goto(`${BASE}/boutique`, { waitUntil: 'domcontentloaded' });
  await attendre(page, () => document.fonts.status === 'loaded');
  await attendre(
    page,
    () => document.documentElement.getAttribute('data-hydratation') === 'prete',
  );

  const carte = page.locator('#rayon-coffrets .carte-produit').first();
  await carte.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.mouse.move(5, 5);
  await carte.hover();

  /* Le fondu n'ouvre QUE sur une image décodée (correctif C19) : on attend
     l'attribut, puis on relance le survol depuis zéro. */
  const prete = await attendre(
    page,
    () =>
      document
        .querySelector('#rayon-coffrets .carte-produit')
        ?.hasAttribute('data-ambiance-chargee') === true,
  );

  await page.mouse.move(5, 5);
  await page.waitForTimeout(1200);
  await carte.hover();
  await page.waitForTimeout(60);

  const releve = await page.evaluate((instant) => {
    const noeud = document.querySelector('#rayon-coffrets .carte-produit');
    if (noeud === null) return null;

    for (const animation of noeud.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = instant;
    }

    const ambiance = noeud.querySelector('.carte-ambiance');
    const packshot = noeud.querySelector('.visuel-produit');

    return {
      opacite: ambiance === null ? null : Number(getComputedStyle(ambiance).opacity),
      echelleMatiere: ambiance === null ? null : getComputedStyle(ambiance).transform,
      echellePackshot: packshot === null ? null : getComputedStyle(packshot).transform,
      ancrage: ambiance === null ? null : getComputedStyle(ambiance).backgroundPosition,
    };
  }, 450);

  dire(`   vue d’ambiance décodée ...... ${prete ? 'oui' : 'NON'}`);
  dire(`   opacité à 450 ms ............ ${String(releve?.opacite)}`);
  dire(`   échelle de la matière ....... ${String(releve?.echelleMatiere)}`);
  dire(`   échelle du packshot ......... ${String(releve?.echellePackshot)}`);
  dire(`   ancrage du recadrage ........ ${String(releve?.ancrage)}`);
  dire(
    `   ${prete && releve !== null && releve.opacite > 0.1 && releve.opacite < 0.99 ? 'OK  ' : 'ÉCHEC'} le coffret est bien À MI-FONDU`,
  );

  await carte.screenshot({ path: `${SORTIE}/c19ter-16-coffret-mi-fondu.png` });
  await contexte.close();
}

/* ══════════════════════════ (18) LE COÛT DE L'ENTRÉE SUR LE PLUS GRAND ═══ */

dire('');
dire('(18) LE PLUS GRAND AFFICHAGE DE CONTENU — avant/après, MÊME construction');
dire('-'.repeat(74));

/**
 * MESURE DU LCP, avec et sans l'entrée.
 *
 * « Sans » n'est pas une autre construction : c'est la MÊME page, servie par le
 * même serveur, avec une feuille injectée qui neutralise l'animation. Toute
 * autre méthode mêlerait au geste ce qui a changé autour de lui — la leçon que
 * l'amendement C18 de D37 tire de ses quatre relevés Lighthouse.
 */
async function mesurerLcp(chemin, neutraliser) {
  const { contexte, page } = await ouvrir(1280, 900);

  if (neutraliser) {
    await page.addInitScript(() => {
      const feuille = document.createElement('style');
      feuille.textContent = '[data-signature="texte"] { animation: none !important; }';
      const poser = () => {
        document.head.append(feuille);
      };
      if (document.head === null) {
        document.addEventListener('DOMContentLoaded', poser);
      } else {
        poser();
      }
    });
  }

  await page.addInitScript(() => {
    window.releveLcp = { valeur: 0, element: '' };
    new PerformanceObserver((liste) => {
      for (const entree of liste.getEntries()) {
        window.releveLcp = {
          valeur: Math.round(entree.startTime),
          element: entree.element?.tagName ?? '(sans élément)',
        };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  /* Le LCP se fige au premier geste du visiteur — on en fait un. */
  await page.mouse.click(2, 2);
  await page.waitForTimeout(200);

  const releve = await page.evaluate(() => window.releveLcp);
  await contexte.close();

  return releve;
}

for (const chemin of ['/livraison', '/conditions-generales-de-vente']) {
  const sans = [];
  const avec = [];

  /* TROIS PASSES CHACUNE : sur ce harnais, une passe unique mesure le hasard de
     l'ordonnanceur. On publie la MÉDIANE et l'étendue. */
  for (let passe = 0; passe < 3; passe += 1) {
    sans.push((await mesurerLcp(chemin, true)).valeur);
    avec.push((await mesurerLcp(chemin, false)).valeur);
  }

  const mediane = (serie) => [...serie].sort((a, b) => a - b)[1];

  dire(`   ── ${chemin}`);
  dire(`      sans entrée (3 passes) ... ${sans.join(' / ')} ms → médiane ${String(mediane(sans))}`);
  dire(`      avec entrée (3 passes) ... ${avec.join(' / ')} ms → médiane ${String(mediane(avec))}`);
  dire(`      écart des médianes ....... ${String(mediane(avec) - mediane(sans))} ms`);
}

/* ════════════════════════════════ (14/17) LES QUATRE PAGES REMPLIES ═══════ */

dire('');
dire('(14/17) LES QUATRE PAGES — le vide à droite du titre est comblé');
dire('-'.repeat(74));

for (const [chemin, nom] of [
  ['/boutique', 'boutique'],
  ['/livraison', 'livraison'],
  ['/suivi', 'suivi'],
  ['/panier', 'panier'],
]) {
  const { contexte, page } = await ouvrir(1440, 900, { densite: 2 });

  await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await attendre(page, () => document.fonts.status === 'loaded');
  await page.waitForTimeout(2600);

  const releve = await page.evaluate(() => {
    const figure = document.querySelector('figure.cadre-photo');
    const image = figure?.querySelector('img');
    const video = document.querySelector('[data-video-heros]');

    return {
      figure:
        figure === null
          ? null
          : {
              largeur: Math.round(figure.getBoundingClientRect().width),
              hauteur: Math.round(figure.getBoundingClientRect().height),
              gauche: Math.round(figure.getBoundingClientRect().left),
            },
      source: image?.currentSrc.split('/').slice(-2).join('/') ?? null,
      alternative: image?.alt ?? null,
      video: video === null ? null : video.getAttribute('data-video-heros'),
    };
  });

  dire(`   ── ${chemin}`);
  dire(
    `      figure ................... ${String(releve.figure?.largeur)} × ` +
      `${String(releve.figure?.hauteur)} points, bord gauche à ${String(releve.figure?.gauche)}`,
  );
  dire(`      source servie ............ ${String(releve.source)}`);
  dire(`      alternative .............. ${String(releve.alternative).slice(0, 64)}…`);
  dire(`      vidéo .................... ${releve.video === null ? 'aucune' : releve.video}`);

  await page.screenshot({ path: `${SORTIE}/c19ter-17-${nom}.png` });
  await contexte.close();
}

await navigateur.close();

dire('');
dire('-'.repeat(74));
dire('Relevé terminé — les captures sont dans ' + SORTIE);
dire('');
