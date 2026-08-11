/**
 * LE TUNNEL REGARDÉ, ET SES TROIS CONTRAINTES MESURÉES (tranche C21a).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CET OUTIL PROUVE, ET POURQUOI AUCUN AUTRE NE LE POUVAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les trois pages du tunnel gagnent un héros illustré. Chacune porte une
 * contrainte qui lui est PROPRE, et aucune des trois ne se lit dans un fichier :
 *
 *   1. `/paiement/simulation` — l'avertissement de D22 (« aucune carte n'est
 *      demandée ») doit rester PREMIER dans l'ordre de lecture et visible sans
 *      défiler. On mesure donc sa position dans le document ET son ordonnée à
 *      l'écran, aux deux largeurs ;
 *   2. `/commande/confirmation` — la RÉFÉRENCE de commande est l'information
 *      reine : on la fabrique par un achat réel (jamais par une écriture dans
 *      le stockage : la forme persistée est un détail versionné) puis on mesure
 *      son ordonnée contre la flottaison d'un téléphone de 390 × 844 ;
 *   3. `/commande` — la page imprimée ne doit pas gagner de visuel parasite.
 *      On compte, sous `print`, les images RÉELLEMENT visibles et les cartouches
 *      qui leur servent de légende. Un cartouche seul, sans son image, est
 *      exactement le parasite qu'on cherche.
 *
 * Le critère de visibilité est `checkVisibility({ checkVisibilityCSS: true })`,
 * et c'est la leçon C1 du round 1 de C14 : `getComputedStyle(n).display` est
 * AVEUGLE AUX ANCÊTRES — deux images dans un parent masqué rendent encore
 * `block`, et le contrôle qui les lisait ne pouvait pas rendre faux.
 *
 * Sortie : captures dans `preuves/c21/`, relevé sur la sortie standard.
 *
 * Emploi : node preuves/c21/vu-tunnel.mjs [--sortie <fichier>]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));

const sortieChoisie = () => {
  const rang = process.argv.indexOf('--sortie');

  return rang === -1 ? null : process.argv[rang + 1];
};

function portLibre() {
  return new Promise((resoudre, rejeter) => {
    const sonde = createServer();
    sonde.unref();
    sonde.on('error', rejeter);
    sonde.listen(0, '127.0.0.1', () => {
      const { port } = sonde.address();
      sonde.close(() => {
        resoudre(port);
      });
    });
  });
}

const port = await portLibre();
const base = `http://localhost:${String(port)}`;

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  cwd: RACINE,
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

const navigateur = await chromium.launch({ channel: 'chromium' });

/** Les deux profils du harnais, et rien d'autre : ce sont eux qui font foi. */
const PROFILS = [
  { nom: 'bureau', viewport: { width: 1280, height: 800 } },
  { nom: 'mobile', viewport: { width: 390, height: 844 } },
];

const attendreHydratation = async (page) => {
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForTimeout(1200);
};

dire('LE TUNNEL ILLUSTRÉ — RELEVÉ C21a');
dire(`base : ${base}`);
dire('');

/* ========================================================================== */
/* 1. LES TROIS HÉROS, VUS                                                     */
/* ========================================================================== */

dire('1. LES TROIS HÉROS — géométrie, image servie, cartouche');
dire('─'.repeat(78));

for (const profil of PROFILS) {
  for (const [chemin, nom] of [
    ['/commande', 'commande'],
    ['/paiement/simulation?reference=MVB-20260810-4F2B&total=6980', 'paiement-simulation'],
    ['/commande/confirmation', 'commande-confirmation'],
  ]) {
    const contexte = await navigateur.newContext({
      viewport: profil.viewport,
      reducedMotion: 'reduce',
    });
    const page = await contexte.newPage();

    await page.goto(`${base}${chemin}`);
    await attendreHydratation(page);

    const heros = page.locator('figure.cadre-photo').first();

    await heros.screenshot({ path: `preuves/c21/heros-${nom}-${profil.nom}.png` });

    const mesure = await heros.evaluate((figure) => {
      const image = figure.querySelector('img');
      const cartouche = figure.querySelector('figcaption');
      const boite = image.getBoundingClientRect();

      return {
        image: `${String(Math.round(boite.width))} × ${String(Math.round(boite.height))}`,
        rapport: (boite.width / boite.height).toFixed(3),
        servie: image.currentSrc.split('/').slice(-2).join('/'),
        alt: `${image.alt.slice(0, 48)}…`,
        cartouche: cartouche === null ? '(aucun)' : cartouche.textContent,
      };
    });

    dire(
      `${profil.nom.padEnd(7)} ${nom.padEnd(22)} ${mesure.image.padStart(11)}  ` +
        `rapport ${mesure.rapport}  ${mesure.servie}`,
    );
    dire(`${' '.repeat(8)}cartouche « ${mesure.cartouche} »`);
    dire(`${' '.repeat(8)}alt « ${mesure.alt} »`);

    await contexte.close();
  }
  dire('');
}

/* ========================================================================== */
/* 2. D22 — L'AVERTISSEMENT RESTE PREMIER, ET IL SE VOIT                       */
/* ========================================================================== */

dire('2. `/paiement/simulation` — l’avertissement D22 devant l’image');
dire('─'.repeat(78));

for (const profil of PROFILS) {
  const contexte = await navigateur.newContext({
    viewport: profil.viewport,
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(`${base}/paiement/simulation?reference=MVB-20260810-4F2B&total=6980`);
  await attendreHydratation(page);

  const verdict = await page.evaluate(() => {
    const avertissement = [...document.querySelectorAll('p')].find((p) =>
      p.textContent.startsWith('Aucun prestataire n’est appelé'),
    );
    const image = document.querySelector('figure.cadre-photo img');
    const position = avertissement.compareDocumentPosition(image);

    return {
      /* 4 = DOCUMENT_POSITION_FOLLOWING : l’image vient APRÈS l’avertissement. */
      imageApresAvertissement: (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      basAvertissement: Math.round(avertissement.getBoundingClientRect().bottom),
      hautImage: Math.round(image.getBoundingClientRect().top),
      flottaison: window.innerHeight,
      organesDeSaisie: document.querySelectorAll('input, select, textarea').length,
    };
  });

  dire(
    `${profil.nom.padEnd(7)} l’image suit l’avertissement dans le document : ` +
      `${verdict.imageApresAvertissement ? 'OUI' : 'NON'}`,
  );
  dire(
    `${' '.repeat(8)}avertissement lu entièrement à ${String(verdict.basAvertissement)} px, ` +
      `flottaison ${String(verdict.flottaison)} px → ` +
      `${verdict.basAvertissement <= verdict.flottaison ? 'VISIBLE SANS DÉFILER' : 'SOUS LA FLOTTAISON'}`,
  );
  dire(`${' '.repeat(8)}haut de l’image à ${String(verdict.hautImage)} px`);
  dire(`${' '.repeat(8)}organes de saisie sur la page (D22) : ${String(verdict.organesDeSaisie)}`);

  await page.screenshot({ path: `preuves/c21/d22-premier-ecran-${profil.nom}.png` });

  await contexte.close();
}

dire('');

/* ========================================================================== */
/* 3. LA RÉFÉRENCE DE COMMANDE, APRÈS UN ACHAT RÉEL                            */
/* ========================================================================== */

dire('3. `/commande/confirmation` — la référence contre la flottaison');
dire('─'.repeat(78));

for (const profil of PROFILS) {
  const contexte = await navigateur.newContext({
    viewport: profil.viewport,
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  /* L'ACHAT SE JOUE PAR L'INTERFACE, jamais par une écriture dans le stockage :
     la forme persistée est un détail d'implémentation versionné, et un outil qui
     la connaît se met à mesurer autre chose que ce que vit le visiteur. */
  await page.goto(`${base}/boutique/huile-olive-premiere-pression`);
  await attendreHydratation(page);
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();

  await page.goto(`${base}/commande`);
  await attendreHydratation(page);
  await page.getByLabel('Prénom et nom').fill('Client d’essai');
  await page.getByLabel('Adresse de livraison').fill('12 rue de l’Exemple, Villeneuve');
  await page.getByLabel('Code postal').fill('34000');
  await page.getByLabel('Courriel').fill('client-essai@example.test');
  await page.getByRole('checkbox').first().check();
  await page
    .getByRole('button', { name: 'Commander avec obligation de paiement' })
    .click();

  await page.waitForURL(/\/paiement\/simulation/);
  await attendreHydratation(page);
  await page.getByRole('link', { name: 'Payer' }).click();

  await page.waitForURL(/\/commande\/confirmation/);
  await attendreHydratation(page);

  const mesure = await page.evaluate(() => {
    const titre = document.querySelector('#titre-reference');
    const valeur = titre.nextElementSibling;

    return {
      reference: valeur.textContent.trim(),
      hautDuTitre: Math.round(titre.getBoundingClientRect().top),
      basDeLaReference: Math.round(valeur.getBoundingClientRect().bottom),
      flottaison: window.innerHeight,
      hauteurDocument: Math.round(document.documentElement.scrollHeight),
    };
  });

  dire(
    `${profil.nom.padEnd(7)} référence ${mesure.reference} — ` +
      `« Votre référence de commande » commence à ${String(mesure.hautDuTitre)} px, ` +
      `la référence est lue entièrement à ${String(mesure.basDeLaReference)} px`,
  );
  dire(
    `${' '.repeat(8)}flottaison ${String(mesure.flottaison)} px → ` +
      `${
        mesure.basDeLaReference <= mesure.flottaison
          ? 'RÉFÉRENCE VISIBLE SANS DÉFILER'
          : `il faut défiler de ${String(mesure.basDeLaReference - mesure.flottaison)} px`
      }`,
  );

  await page.screenshot({ path: `preuves/c21/reference-premier-ecran-${profil.nom}.png` });

  await contexte.close();
}

dire('');

/* ========================================================================== */
/* 4. L'IMPRESSION — AUCUN VISUEL PARASITE                                     */
/* ========================================================================== */

dire('4. L’impression du tunnel — images et cartouches sous `print`');
dire('─'.repeat(78));

for (const [chemin, nom] of [
  ['/commande', 'commande'],
  ['/paiement/simulation?reference=MVB-20260810-4F2B&total=6980', 'paiement-simulation'],
  ['/commande/confirmation', 'commande-confirmation'],
]) {
  const contexte = await navigateur.newContext({
    /* LA LARGEUR IMPRIMABLE D'UNE A4, ET NON 1280 : `emulateMedia` ne touche
       pas à la fenêtre, leçon payée deux fois en C16. */
    viewport: { width: 794, height: 1123 },
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(`${base}${chemin}`);
  await attendreHydratation(page);

  const aLEcran = await page.evaluate(() => ({
    images: [...document.querySelectorAll('figure.cadre-photo img')].filter((n) =>
      n.checkVisibility({ checkVisibilityCSS: true }),
    ).length,
    cartouches: [...document.querySelectorAll('figure.cadre-photo figcaption')].filter(
      (n) => n.checkVisibility({ checkVisibilityCSS: true }),
    ).length,
  }));

  await page.emulateMedia({ media: 'print' });

  const surPapier = await page.evaluate(() => ({
    images: [...document.querySelectorAll('figure.cadre-photo img')].filter((n) =>
      n.checkVisibility({ checkVisibilityCSS: true }),
    ).length,
    cartouches: [...document.querySelectorAll('figure.cadre-photo figcaption')].filter(
      (n) => n.checkVisibility({ checkVisibilityCSS: true }),
    ).length,
    debordement: [...document.querySelectorAll('[data-cadre-defilant]')].reduce(
      (pire, n) => Math.max(pire, n.scrollWidth - n.clientWidth),
      0,
    ),
  }));

  dire(
    `${nom.padEnd(22)} écran : ${String(aLEcran.images)} image(s), ` +
      `${String(aLEcran.cartouches)} cartouche(s)  |  ` +
      `papier : ${String(surPapier.images)} image(s), ` +
      `${String(surPapier.cartouches)} cartouche(s), ` +
      `débordement ${String(surPapier.debordement)} px`,
  );

  await page.pdf({ path: `preuves/c21/impression-${nom}.pdf`, printBackground: false });
  await page.emulateMedia({ media: 'screen' });

  await contexte.close();
}

dire('');
dire('Un cartouche resté seul sur le papier, sans son image, EST le parasite.');

const sortie = sortieChoisie();

if (sortie !== null && sortie !== undefined) {
  writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');
}

await navigateur.close();
serveur.kill();
process.exit(0);
