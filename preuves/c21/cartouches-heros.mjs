/**
 * LES CARTOUCHES DES HÉROS, VUS AVANT ET APRÈS LEUR RETRAIT (retour client 22).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CET OUTIL PROUVE, ET POURQUOI IL FALLAIT L'ÉCRIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Les légendes sous les images font bizarre pour un visiteur. » Le retrait est
 * mécanique ; ce qui ne l'est pas, c'est de prouver qu'il s'arrête où il doit :
 *
 *   1. LES HÉROS des huit pages n'ont plus de cartouche — compté dans le DOM
 *      rendu, aux deux profils du harnais, jamais dans la source ;
 *   2. LES FIGURES PRODUITS des fiches gardent le leur — rang d'inventaire,
 *      référence, poids : information de fiche, autre organe, hors du périmètre
 *      du client. Un retrait qui les emporterait serait un dégât collatéral
 *      invisible en revue de code (la classe `etiquette` est la même) ;
 *   3. LES ALTERNATIVES TEXTUELLES sont INTACTES — l'accessibilité ne passait
 *      pas par le cartouche, et le dire ne suffit pas : on relit les `alt`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA QUATRIÈME MESURE EST LA SEULE QUI DEMANDAIT UNE CONTRE-ÉPREUVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La règle d'impression `:has()` de C21a a été écrite pour un cartouche
 * ORPHELIN — une légende restée seule sur le papier au-dessus du récapitulatif
 * d'une commande. Les cartouches de héros partent aujourd'hui : la question
 * « cette règle sert-elle encore ? » ne se répond pas en la relisant.
 *
 * On la NEUTRALISE donc à l'exécution, et le PREMIER JET DE CET OUTIL S'EST
 * TROMPÉ DE GESTE : il injectait une feuille `display: block !important`, qui
 * ne retire pas la règle visée — elle écrase AUSSI le `print:hidden` que la vue
 * d'ambiance d'une fiche porte depuis C15. La contre-épreuve accusait donc la
 * règle d'un travail qu'un autre sélecteur faisait déjà. La règle est désormais
 * RETIRÉE de la feuille par le CSSOM (`deleteRule`), et rien d'autre ne bouge.
 * La différence entre les deux passes EST la réponse, et elle est écrite au
 * relevé plutôt que déduite.
 *
 * Le critère de visibilité est `checkVisibility({ checkVisibilityCSS: true })`,
 * leçon C1 du round 1 de C14 : `getComputedStyle(n).display` est AVEUGLE AUX
 * ANCÊTRES, et un contrôle qui le lit ne peut pas rendre faux.
 *
 * Emploi : node preuves/c21/cartouches-heros.mjs [--sortie <fichier>]
 *                                                [--etiquette avant|apres]
 */
import { chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));

function option(nom, defaut) {
  const rang = process.argv.indexOf(`--${nom}`);

  if (rang === -1) {
    return defaut;
  }

  const valeur = process.argv[rang + 1];

  return valeur === undefined || valeur.startsWith('--') ? defaut : valeur;
}

/* `--etiquette` nomme les captures. Sans elle, la seconde campagne écraserait la
   première et il n'y aurait plus rien à comparer — c'est le motif qui a donné
   `--sortie` aux outils de C17 en C18, et `--suffixe` à `mesurer-notes` en C14. */
const ETIQUETTE = option('etiquette', 'apres');
const SORTIE = option('sortie', null);

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

/** Les HUIT pages à héros — le périmètre exact du retour client n° 22. */
const PAGES_A_HEROS = [
  ['/', 'accueil'],
  ['/boutique', 'boutique'],
  ['/livraison', 'livraison'],
  ['/suivi', 'suivi'],
  ['/panier', 'panier'],
  ['/commande', 'commande'],
  ['/paiement/simulation?reference=MVB-20260810-4F2B&total=6980', 'paiement-simulation'],
  ['/commande/confirmation', 'commande-confirmation'],
];

/** Les deux pages CAPTURÉES avant et après, aux deux profils. */
const PAGES_CAPTUREES = new Set(['commande', 'livraison']);

/** La fiche témoin : ses deux figures produits ne doivent RIEN perdre. */
const FICHE = '/boutique/huile-olive-premiere-pression';

const attendreHydratation = async (page) => {
  await page.waitForFunction(() => document.documentElement.dataset['hydratation'] === 'prete');
  await page.waitForTimeout(1200);
};

const releverFigures = () =>
  [...document.querySelectorAll('figure.cadre-photo')].map((figure) => {
    const image = figure.querySelector('img');
    const cartouche = figure.querySelector('figcaption');

    return {
      cartouche: cartouche === null ? null : (cartouche.textContent ?? '').trim(),
      alt: image === null ? '(aucune image)' : image.alt,
      hauteurCartouche:
        cartouche === null ? 0 : Math.round(cartouche.getBoundingClientRect().height),
    };
  });

dire(`LES CARTOUCHES DES HÉROS — RELEVÉ « ${ETIQUETTE.toUpperCase()} » (retour client 22)`);
/* UN RELEVÉ SANS SA DATE ET SON COMMIT NE PROUVE RIEN : il dit ce qu'un site
   valait, sans dire lequel ni quand. Les deux sont donc écrits par l'outil et
   non ajoutés à la main. */
dire(`date   : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (Paris)`);
dire(
  `commit : ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RACINE })
    .toString()
    .trim()} + arbre de travail`,
);
dire(`base   : ${base}`);
dire('');

/* ========================================================================== */
/* 1. LES HUIT HÉROS                                                           */
/* ========================================================================== */

dire('1. LES HUIT PAGES À HÉROS — un cartouche, ou aucun');
dire('─'.repeat(78));

let cartouchesDeHeros = 0;

for (const profil of PROFILS) {
  for (const [chemin, nom] of PAGES_A_HEROS) {
    const contexte = await navigateur.newContext({
      viewport: profil.viewport,
      reducedMotion: 'reduce',
    });
    const page = await contexte.newPage();

    await page.goto(`${base}${chemin}`);
    await attendreHydratation(page);

    const figures = await page.evaluate(releverFigures);
    const heros = figures[0];

    if (heros === undefined) {
      dire(`${profil.nom.padEnd(7)} ${nom.padEnd(22)} AUCUNE FIGURE — la page a perdu son héros`);
      await contexte.close();
      continue;
    }

    if (heros.cartouche !== null) {
      cartouchesDeHeros += 1;
    }

    dire(
      `${profil.nom.padEnd(7)} ${nom.padEnd(22)} cartouche : ` +
        (heros.cartouche === null
          ? '(aucun)'
          : `« ${heros.cartouche} » — ${String(heros.hauteurCartouche)} px`),
    );
    dire(`${' '.repeat(8)}alt (${String(heros.alt.length)} car.) « ${heros.alt.slice(0, 64)}… »`);

    if (PAGES_CAPTUREES.has(nom)) {
      await page
        .locator('figure.cadre-photo')
        .first()
        .screenshot({ path: `preuves/c21/cartouche-${nom}-${profil.nom}-${ETIQUETTE}.png` });
    }

    await contexte.close();
  }
  dire('');
}

dire(`TOTAL des cartouches de héros rendus : ${String(cartouchesDeHeros)} (16 relevés = 8 × 2)`);
dire('');

/* ========================================================================== */
/* 2. LA FICHE PRODUIT — CE QUI NE DOIT PAS PARTIR                             */
/* ========================================================================== */

dire('2. LA FICHE TÉMOIN — les cartouches de registre des figures produits');
dire('─'.repeat(78));

for (const profil of PROFILS) {
  const contexte = await navigateur.newContext({
    viewport: profil.viewport,
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(`${base}${FICHE}`);
  await attendreHydratation(page);

  const figures = await page.evaluate(releverFigures);

  dire(`${profil.nom.padEnd(7)} ${String(figures.length)} figure(s) de galerie`);

  for (const figure of figures) {
    dire(
      `${' '.repeat(8)}cartouche : ` +
        (figure.cartouche === null ? 'MANQUANT' : `« ${figure.cartouche} »`),
    );
  }

  await contexte.close();
}

dire('');

/* ========================================================================== */
/* 3. LE PAPIER, AVEC ET SANS LA RÈGLE `:has()` DE C21a                        */
/* ========================================================================== */

dire('3. SOUS `print` — ce que la règle `:has()` retire encore');
dire('─'.repeat(78));

const compterSurPapier = () => ({
  figures: [...document.querySelectorAll('figure.cadre-photo')].filter((n) =>
    n.checkVisibility({ checkVisibilityCSS: true }),
  ).length,
  images: [...document.querySelectorAll('figure.cadre-photo img')].filter((n) =>
    n.checkVisibility({ checkVisibilityCSS: true }),
  ).length,
  cartouches: [...document.querySelectorAll('figure.cadre-photo figcaption')].filter((n) =>
    n.checkVisibility({ checkVisibilityCSS: true }),
  ).length,
  videos: [...document.querySelectorAll('figure.cadre-photo video')].filter((n) =>
    n.checkVisibility({ checkVisibilityCSS: true }),
  ).length,
  hauteurDesFigures: [...document.querySelectorAll('figure.cadre-photo')]
    .filter((n) => n.checkVisibility({ checkVisibilityCSS: true }))
    .reduce((somme, n) => somme + Math.round(n.getBoundingClientRect().height), 0),
  /* LE CADRE EST-IL DÉSHABILLÉ ? Sans ce témoin, une passe qui ne « prend » pas
     est indiscernable d'une passe sans effet — le défaut que ce dépôt paie
     depuis C13 sous tous les déguisements. */
  cadre: (() => {
    const figure = document.querySelector('figure.cadre-photo');

    if (figure === null) {
      return '(aucune figure)';
    }

    const calcule = getComputedStyle(figure);

    return `remplissage ${calcule.paddingTop}, filet ${calcule.borderTopWidth}`;
  })(),
});

for (const [chemin, nom] of [
  ['/commande', 'commande'],
  ['/livraison', 'livraison'],
  [FICHE, 'fiche produit'],
]) {
  const contexte = await navigateur.newContext({
    /* LA LARGEUR IMPRIMABLE D'UNE A4, ET NON 1280 : `emulateMedia` ne touche pas
       à la fenêtre, leçon payée deux fois en C16. */
    viewport: { width: 794, height: 1123 },
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(`${base}${chemin}`);
  await attendreHydratation(page);
  await page.emulateMedia({ media: 'print' });
  /* LE PAPIER MET UN INSTANT À S'APPLIQUER. Sans cette pause, la première passe
     a mesuré une fois 267 px là où les deux suivantes en donnaient 248 — la
     feuille d'impression n'avait pas encore repris son remplissage. Une mesure
     prise pendant un recalcul mesure le hasard de l'ordonnanceur (leçon C17). */
  await page.waitForTimeout(400);

  const avecLaRegle = await page.evaluate(compterSurPapier);

  /* LA CONTRE-ÉPREUVE — la règle est RETIRÉE, pas recouverte, et RIEN d'autre
     avec elle. Recouvrir aurait défait au passage le `print:hidden` que la vue
     d'ambiance d'une fiche porte depuis C15, et prêté à cette règle-ci un effet
     qui ne lui appartient pas. Le retrait est SCOPÉ AU BLOC `@media print` :
     `.cadre-photo` existe aussi dans `@layer components`, et la supprimer là
     retirerait le cadre au lieu de le rendre. */
  const retirerSousPrint = () => {
    let compte = 0;

    const vise = (selecteur) =>
      selecteur.includes('cadre-photo') && selecteur.includes(':has(');

    const dansPrint = (regles) => {
      for (let rang = regles.length - 1; rang >= 0; rang -= 1) {
        const regle = regles[rang];

        if (typeof regle.selectorText === 'string' && vise(regle.selectorText)) {
          regle.parentRule === null
            ? regle.parentStyleSheet.deleteRule(rang)
            : regle.parentRule.deleteRule(rang);
          compte += 1;
          continue;
        }

        if (regle.cssRules !== undefined) {
          dansPrint([...regle.cssRules]);
        }
      }
    };

    const chercherPrint = (regles) => {
      for (const regle of regles) {
        if (regle.media !== undefined && String(regle.media.mediaText).includes('print')) {
          dansPrint([...regle.cssRules]);
          continue;
        }

        if (regle.cssRules !== undefined) {
          chercherPrint([...regle.cssRules]);
        }
      }
    };

    for (const feuille of [...document.styleSheets]) {
      try {
        chercherPrint([...feuille.cssRules]);
      } catch {
        /* feuille d'une autre origine — il n'y en a aucune sur ce site. */
      }
    }

    return compte;
  };

  const retirees = await page.evaluate(retirerSousPrint);

  const sansLaRegle = await page.evaluate(compterSurPapier);


  dire(
    `${nom.padEnd(16)} AVEC la règle  : ${String(avecLaRegle.figures)} figure(s), ` +
      `${String(avecLaRegle.images)} image(s), ${String(avecLaRegle.cartouches)} cartouche(s), ` +
      `${String(avecLaRegle.videos)} vidéo(s), ${String(avecLaRegle.hauteurDesFigures)} px de haut ` +
      `[${avecLaRegle.cadre}]`,
  );
  dire(
    `${' '.repeat(16)}SANS la règle  (${String(retirees)} retirée) : ` +
      `${String(sansLaRegle.figures)} figure(s), ` +
      `${String(sansLaRegle.images)} image(s), ${String(sansLaRegle.cartouches)} cartouche(s), ` +
      `${String(sansLaRegle.videos)} vidéo(s), ${String(sansLaRegle.hauteurDesFigures)} px de haut ` +
      `[${sansLaRegle.cadre}]`,
  );

  await page.emulateMedia({ media: 'screen' });
  await contexte.close();
}

dire('');
dire('Ce que la troisième section dit se lit dans l’ÉCART entre les deux passes,');
dire('jamais dans la relecture de la règle.');

if (SORTIE !== null) {
  writeFileSync(SORTIE, `${lignes.join('\n')}\n`, 'utf8');
}

await navigateur.close();
serveur.kill();
process.exit(0);
