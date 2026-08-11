/**
 * LA PREUVE DES TROIS CORRECTIFS VISUELS DU 10/08 (retours client 9, 10, 11).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ON NE PHOTOGRAPHIE PAS UN GESTE EN COURS, ON L'ARRÊTE D'ABORD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C18 a payé cette leçon : six captures de séquence rendues IDENTIQUES, parce
 * qu'une capture d'écran coûte plus cher que le geste ne dure. Trois parades
 * avaient été tentées, aucune ne suffisait, et la tranche s'était rabattue sur
 * un relevé image par image.
 *
 * La quatrième parade est la bonne, et elle ne demande aucune patience :
 * l'API Web Animations rend LES ANIMATIONS ET LES TRANSITIONS de la page comme
 * des objets qu'on met en pause et dont on écrit le temps courant.
 * `animation.currentTime = 450` place la page à quatre cent cinquante
 * millisecondes EXACTEMENT, et l'y laisse le temps qu'il faut pour la capturer.
 * Ce que montre l'image n'est plus « à peu près 450 ms », c'est 450 ms.
 *
 * Emploi :  node preuves/c19/verifier-correctifs-visuels.mjs
 *           BASE=http://127.0.0.1:3111 par défaut.
 */

import { writeFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3111';
const DOSSIER = 'preuves/c19';

const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

/** Luminance relative WCAG d'un canal sRGB 0-255. */
const canal = (valeur) => {
  const v = valeur / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, v, b]) => 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);

/**
 * Le script d'initialisation : il met en pause TOUT ce qui s'anime, dès la
 * première image où quelque chose s'anime.
 *
 * Il doit être posé avant le premier script de la page : la cascade du héros
 * part au premier calcul de style, c'est-à-dire avant tout ce qu'un outil
 * pourrait faire après `goto`.
 */
const GELER = () => {
  const attendre = () => {
    const gestes = document.getAnimations();

    if (gestes.length > 0) {
      for (const geste of gestes) {
        geste.pause();
        geste.currentTime = 0;
      }

      window.gestesGeles = true;

      return;
    }

    requestAnimationFrame(attendre);
  };

  requestAnimationFrame(attendre);
};

/** Place tous les gestes de la page à l'instant demandé. */
const AU_TEMPS = (millisecondes) => {
  for (const geste of document.getAnimations()) {
    geste.pause();
    geste.currentTime = millisecondes;
  }
};

const navigateur = await chromium.launch();

/* ========================================================================== */
/* A — LE TITRE : LES RECTANGLES ONT DISPARU                                  */
/* ========================================================================== */

dire('');
dire('A — LE TITRE, MONTÉE MASQUÉE (retour client 9)');
dire('='.repeat(78));

const contexteA = await navigateur.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'no-preference',
});
const pageA = await contexteA.newPage();

await pageA.addInitScript(GELER);
await pageA.goto(`${BASE}/`, { waitUntil: 'load' });
await pageA.waitForFunction(() => window.gestesGeles === true, undefined, { timeout: 10_000 });

/* LA ZONE DU HÉROS : la colonne de gauche, celle que la masse d'encre couvrait.
   Les captures sont recadrées dessus pour qu'on voie ce dont le client parle. */
const CADRE_HEROS = { x: 24, y: 90, width: 700, height: 560 };

/** Compte la part de pixels SOMBRES dans une capture — la mesure du reproche. */
const partSombre = async (page, cadre) => {
  const donnees = await page.screenshot({ clip: cadre, animations: 'allow' });

  return page.evaluate(async (base64) => {
    const image = new Image();
    await new Promise((r) => {
      image.addEventListener('load', r);
      image.src = `data:image/png;base64,${base64}`;
    });
    const toile = document.createElement('canvas');
    toile.width = image.width;
    toile.height = image.height;
    const contexte2d = toile.getContext('2d');
    contexte2d.drawImage(image, 0, 0);
    const brut = contexte2d.getImageData(0, 0, image.width, image.height).data;
    let sombres = 0;
    const total = brut.length / 4;
    for (let i = 0; i < brut.length; i += 4) {
      /* « Sombre » au sens du reproche : un pixel d'encre, pas une lettre grise.
         Le seuil est bas exprès — on cherche des aplats, pas de la typographie. */
      if (brut[i] < 90 && brut[i + 1] < 90 && brut[i + 2] < 90) sombres += 1;
    }
    return sombres / total;
  }, donnees.toString('base64'));
};

const INSTANTS = [250, 700, 1300];
const parts = [];

for (const instant of INSTANTS) {
  await pageA.evaluate(AU_TEMPS, instant);
  await pageA.screenshot({
    path: `${DOSSIER}/titre-masque-${String(instant).padStart(4, '0')}ms.png`,
    clip: CADRE_HEROS,
    animations: 'allow',
  });
  const part = await partSombre(pageA, CADRE_HEROS);
  parts.push(part);
  dire(`  ${String(instant).padStart(5)} ms — pixels d’encre dans le héros : ${(part * 100).toFixed(2)} %`);
}

/* AU REPOS : la cascade est finie (1400 ms + 6 × 70 de retard). */
await pageA.evaluate(AU_TEMPS, 3000);
await pageA.screenshot({
  path: `${DOSSIER}/titre-masque-repos.png`,
  clip: CADRE_HEROS,
  animations: 'allow',
});
const partRepos = await partSombre(pageA, CADRE_HEROS);
dire(`  au repos — pixels d’encre dans le héros : ${(partRepos * 100).toFixed(2)} %`);

/* LE VERDICT DU CLIENT, RENDU CHIFFRABLE : à aucun instant de l'entrée le héros
   ne porte plus d'encre qu'au repos. La masse noire de la version rejetée
   couvrait, elle, la moitié du cadre. */
const pire = Math.max(...parts);
dire('');
dire(
  `  PIRE INSTANT ${(pire * 100).toFixed(2)} % contre ${(partRepos * 100).toFixed(2)} % au repos — ` +
    (pire <= partRepos + 0.005 ? 'AUCUNE MATIÈRE AJOUTÉE ✓' : 'DE LA MATIÈRE SE POSE ✗'),
);

/* ---------------------------------------------------------------------------
   LE MASQUE NE ROGNE RIEN AU REPOS — preuve par différence, pas par l'œil
   ---------------------------------------------------------------------------
   On capture le héros au repos, puis on RETIRE le masque et on recapture. Si
   le découpage rognait un jambage, un accent ou un débord de didone, les deux
   images différeraient. Elles doivent être identiques à l'octet.
   ------------------------------------------------------------------------- */
/*
 * LA COMPARAISON SE FAIT SOUS MOUVEMENT RÉDUIT, ET C'EST LA LEÇON DE C17
 * RÉAPPRISE POUR LA TROISIÈME FOIS : « toute mesure sur un site animé mesure
 * d'abord le hasard de l'ordonnanceur ».
 *
 * Première rédaction : la comparaison se faisait dans le contexte animé
 * ci-dessus, gestes gelés. Elle a rendu 823 pixels différents à 150 niveaux —
 * et pas un seul n'était une lettre : le cadre du héros contient la VIDÉO, que
 * `pause()` sur les animations CSS ne fige évidemment pas, et qui avait avancé
 * de deux images entre les deux captures. Sous `reduce`, la vidéo n'est pas
 * même téléchargée et aucune animation n'existe : ce qui bouge entre les deux
 * images ne peut alors être QUE le masque.
 */
const contexteMasque = await navigateur.newContext({
  viewport: { width: 1280, height: 800 },
  reducedMotion: 'reduce',
});
const pageMasque = await contexteMasque.newPage();

await pageMasque.goto(`${BASE}/`, { waitUntil: 'load' });
await pageMasque.waitForTimeout(900);

const avecMasque = await pageMasque.screenshot({ clip: CADRE_HEROS });

await pageMasque.addStyleTag({
  content: '[data-signature="ligne"] { clip-path: none !important; }',
});
await pageMasque.waitForTimeout(200);

const sansMasque = await pageMasque.screenshot({ clip: CADRE_HEROS });

/* ON COMPARE LES PIXELS, PAS LES OCTETS — et c'est une correction de mesure.
   Un `clip-path` place l'élément sur sa propre couche de rastérisation : le
   lissage des lettres passe du sous-pixel au niveau de gris, et DEUX IMAGES
   IDENTIQUES À L'ŒIL diffèrent alors sur tous les bords de glyphe, de quelques
   niveaux. Une comparaison d'octets rendrait donc « différentes » sur une page
   parfaitement juste. Ce qu'on cherche est un JAMBAGE ROGNÉ, c'est-à-dire un
   groupe de pixels qui passe de l'encre au fond : on compte les pixels dont un
   canal bouge de plus de soixante niveaux. */
const diff = await pageMasque.evaluate(
  async ([a, b]) => {
    const lire = async (base64) => {
      const image = new Image();
      await new Promise((r) => {
        image.addEventListener('load', r);
        image.src = `data:image/png;base64,${base64}`;
      });
      const toile = document.createElement('canvas');
      toile.width = image.width;
      toile.height = image.height;
      const contexte2d = toile.getContext('2d');
      contexte2d.drawImage(image, 0, 0);
      return contexte2d.getImageData(0, 0, image.width, image.height).data;
    };

    const un = await lire(a);
    const deux = await lire(b);
    let franches = 0;
    let ecartMaximal = 0;

    for (let i = 0; i < un.length; i += 4) {
      const ecart = Math.max(
        Math.abs(un[i] - deux[i]),
        Math.abs(un[i + 1] - deux[i + 1]),
        Math.abs(un[i + 2] - deux[i + 2]),
      );
      if (ecart > ecartMaximal) ecartMaximal = ecart;
      if (ecart > 60) franches += 1;
    }

    return { franches, ecartMaximal, total: un.length / 4 };
  },
  [avecMasque.toString('base64'), sansMasque.toString('base64')],
);

dire('');
dire(
  `  MASQUE AU REPOS : ${String(diff.franches)} pixel(s) franchement différent(s) sur ` +
    `${String(diff.total)} (écart maximal ${String(diff.ecartMaximal)} niveaux) — ` +
    (diff.franches === 0 ? 'AUCUN JAMBAGE ROGNÉ ✓' : 'LE DÉCOUPAGE MANGE DE L’ENCRE ✗'),
);

await contexteMasque.close();
await contexteA.close();

/* ========================================================================== */
/* B — LA CARTE : UN VRAI FONDU, PRIS EN FLAGRANT DÉLIT À 450 ms              */
/* ========================================================================== */

dire('');
dire('B — LE FONDU DES CARTES (retours client 11 et 11 bis)');
dire('='.repeat(78));

const contexteB = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'no-preference',
});
const pageB = await contexteB.newPage();

await pageB.goto(`${BASE}/boutique`, { waitUntil: 'load' });
await pageB.waitForFunction(() => document.documentElement.classList.contains('mouvement'));
await pageB.waitForTimeout(500);

const carte = pageB.locator('.carte-produit').first();

/* CAPTURE D'ÉLÉMENT ET NON DE RECTANGLE, et c'est une correction : `hover()`
   amène la cible dans la fenêtre, donc un cadre relevé AVANT le survol désigne
   une autre partie de la page après. La première rédaction a rendu trois
   captures d'un paragraphe de prose. */
await carte.screenshot({ path: `${DOSSIER}/carte-respiration-avant.png` });

await carte.hover();

/* On attend que le geste EXISTE — c'est-à-dire que l'image ait fini de se
   décoder et que la feuille ait ouvert le fondu. Puis on le fige à 450 ms. */
await pageB.waitForFunction(
  () => {
    const cible = document.querySelector('.carte-produit .carte-ambiance');
    return cible !== null && cible.getAnimations().length > 0;
  },
  undefined,
  { timeout: 8000 },
);

const etatIntermediaire = await pageB.evaluate(() => {
  const cible = document.querySelector('.carte-produit .carte-ambiance');
  const packshot = document.querySelector('.carte-produit .visuel-produit');

  for (const geste of [...cible.getAnimations(), ...packshot.getAnimations()]) {
    geste.pause();
    geste.currentTime = 450;
  }

  return {
    opaciteAmbiance: Number(getComputedStyle(cible).opacity),
    echelleAmbiance: getComputedStyle(cible).transform,
    echellePackshot: getComputedStyle(packshot).transform,
    duree: getComputedStyle(cible).transitionDuration,
  };
});

await carte.screenshot({ path: `${DOSSIER}/carte-respiration-450ms.png`, animations: 'allow' });

dire(`  durée déclarée              : ${etatIntermediaire.duree}`);
dire(`  À 450 ms — opacité ambiance : ${etatIntermediaire.opaciteAmbiance.toFixed(3)}`);
dire(`  À 450 ms — échelle ambiance : ${etatIntermediaire.echelleAmbiance}`);
dire(`  À 450 ms — échelle packshot : ${etatIntermediaire.echellePackshot}`);
dire(
  `  ÉTAT INTERMÉDIAIRE : ${
    etatIntermediaire.opaciteAmbiance > 0.05 && etatIntermediaire.opaciteAmbiance < 0.95
      ? 'LES DEUX IMAGES SONT MÊLÉES ✓'
      : 'LA BASCULE EST DÉJÀ FINIE ✗'
  }`,
);

/* Et l'état d'arrivée, pour la planche avant/pendant/après. */
await pageB.evaluate(() => {
  for (const geste of document.getAnimations()) {
    geste.finish();
  }
});
await pageB.waitForTimeout(150);
await carte.screenshot({ path: `${DOSSIER}/carte-respiration-apres.png`, animations: 'allow' });

await contexteB.close();

/* ========================================================================== */
/* C — LE FOND : LA PLANCHE DES TROIS NIVEAUX                                 */
/* ========================================================================== */

dire('');
dire('C — LA MATIÈRE DU FOND (retour client 10)');
dire('='.repeat(78));

const grain = (opacite) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)' opacity='${opacite}'/%3E%3C/svg%3E")`;

const NIVEAUX = [
  { valeur: '0.055', nom: 'a-actuel-0055' },
  { valeur: '0.14', nom: 'b-retenu-0140' },
  { valeur: '0.18', nom: 'c-au-dessus-0180' },
];

const contexteC = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const pageC = await contexteC.newPage();

for (const niveau of NIVEAUX) {
  /* LA PLANCHE POUR L'ŒIL — l'accueil à mi-page, exactement le cadrage sur
     lequel le client a dit « toujours blanc uni ». */
  await pageC.goto(`${BASE}/`, { waitUntil: 'load' });
  await pageC.addStyleTag({
    content: `:root { --grain-papier: ${grain(niveau.valeur)}; }`,
  });
  await pageC.evaluate(() => {
    window.scrollTo(0, 900);
  });
  await pageC.waitForTimeout(700);

  await pageC.screenshot({
    path: `${DOSSIER}/fond-grain-${niveau.nom}.png`,
    clip: { x: 0, y: 110, width: 1280, height: 620 },
  });

  /*
   * LE PIRE PIXEL RÉELLEMENT PEINT — et la sonde est celle de
   * `grain-contraste.mjs`, pas une nouvelle.
   *
   * PREMIÈRE RÉDACTION FAUSSE, ET LA LEÇON EST TOUJOURS LA MÊME : elle lisait
   * l'accueil à mi-page dans la gouttière gauche, et rendait `#1c211a` aux
   * TROIS niveaux avec une amplitude de zéro — c'est-à-dire l'encre du pied de
   * page, lue avec application. Une sonde qui rend la même valeur quel que
   * soit le réglage qu'elle est censée mesurer ne mesure pas ce réglage. On
   * reprend donc le bas des CGV, page longue dont la gouttière est du fond et
   * rien d'autre.
   */
  await pageC.goto(`${BASE}/conditions-generales-de-vente`, { waitUntil: 'load' });
  await pageC.addStyleTag({
    content: `:root { --grain-papier: ${grain(niveau.valeur)}; }`,
  });
  await pageC.evaluate(() => {
    window.scrollTo(0, 2400);
  });
  await pageC.waitForTimeout(500);

  const bande = await pageC.screenshot({ clip: { x: 4, y: 400, width: 24, height: 24 } });
  const extremes = await pageC.evaluate(async (base64) => {
    const image = new Image();
    await new Promise((r) => {
      image.addEventListener('load', r);
      image.src = `data:image/png;base64,${base64}`;
    });
    const toile = document.createElement('canvas');
    toile.width = image.width;
    toile.height = image.height;
    const contexte2d = toile.getContext('2d');
    contexte2d.drawImage(image, 0, 0);
    const brut = contexte2d.getImageData(0, 0, image.width, image.height).data;
    const liste = [];
    for (let i = 0; i < brut.length; i += 4) liste.push([brut[i], brut[i + 1], brut[i + 2]]);
    return liste;
  }, bande.toString('base64'));

  const lum = extremes.map((p) => luminance(p));
  const sombre = extremes[lum.indexOf(Math.min(...lum))];
  const clair = extremes[lum.indexOf(Math.max(...lum))];
  const hex = (p) => `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const ocre = [0x7a, 0x57, 0x14];
  const contraste = (a, b) => {
    const [c, s] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
    return (luminance(c) + 0.05) / (luminance(s) + 0.05);
  };

  dire(
    `  grain ${niveau.valeur.padEnd(6)} — plus sombre ${hex(sombre)}, plus clair ${hex(clair)}, ` +
      `amplitude ${((Math.max(...lum) - Math.min(...lum)) * 100).toFixed(2)} pt — ` +
      `ocre sur le pire pixel : ${contraste(ocre, sombre).toFixed(2)} (AA 4,50)`,
  );
}

await contexteC.close();
await navigateur.close();

dire('');
writeFileSync(`${DOSSIER}/verifier-correctifs-visuels.txt`, `${lignes.join('\n')}\n`, 'utf8');
console.log(`Relevé écrit dans ${DOSSIER}/verifier-correctifs-visuels.txt`);
