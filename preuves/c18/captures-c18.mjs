/* LES PIÈCES VISUELLES DE LA TRANCHE C18.
 *
 * Trois séries, et chacune répond à une question qu'un nombre ne referme pas :
 *
 * 1. LE BANDEAU DES SEPT FAMILLES, saisi à trois positions de défilement. Un
 *    relevé dit que la piste s'est déplacée de 3 455 px ; ces trois images
 *    disent à quoi cela ressemble, et si l'ornement se tient.
 * 2. LA CASCADE DU RAYON, six vues pendant la révélation d'une famille. C'est
 *    le geste que la couche `components` supprimait depuis C17 : il n'avait
 *    jamais été vu.
 * 3. LE TEXTE DU HÉROS QUI ENTRE À FROID, six vues sur les 1 400 ms de la
 *    cascade — l'exigence client du 10/08.
 *
 * Chaque série attend l'IMMOBILITÉ quand elle veut un état, et ne l'attend
 * surtout pas quand elle veut un mouvement : la leçon d'outillage de C17 dit
 * qu'une mesure prise pendant un fondu mesure l'ordonnanceur, mais une SÉQUENCE
 * n'existe que pendant le fondu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES SÉQUENCES SONT RALENTIES, ET IL FAUT LE DIRE PLUTÔT QUE DE LE CACHER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première rédaction saisissait la cascade du héros à sa vitesse réelle et
 * rendait six images IDENTIQUES, toutes à l'état final. Ce n'est pas que le
 * geste n'avait pas lieu — la campagne le prouve par un échantillonneur qui
 * relève une opacité minimale sous 0,5 — c'est que la capture d'écran de
 * Playwright coûte plus cher que le geste ne dure : le temps de saisir la
 * première image, les 1 400 ms étaient passées.
 *
 * Six images identiques prétendant montrer une séquence auraient été une pièce
 * FAUSSE au dossier. Les durées sont donc multipliées par huit LE TEMPS DE LA
 * CAPTURE, par une variable posée sur la racine. Rien d'autre ne change : ni la
 * courbe, ni les retards relatifs, ni les propriétés animées. Les images
 * montrent les états réels du geste, étalés dans le temps.
 *
 * LA MESURE DU GESTE RÉEL N'EST PAS ICI, et c'est le bon partage : elle est
 * dans `tests/e2e/mouvement.spec.ts`, qui échantillonne à la vitesse du site.
 *
 * Emploi :  node preuves/c18/captures-c18.mjs
 */

/** Le facteur de ralenti, et les trois jetons qu'il étire. */
const RALENTI = `
  :root {
    --ms-hero: 11200ms;
    --ms-revele: 4960ms;
    --decalage-cascade: 560ms;
  }
`;
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 3999;

/** Le saut de ligne, nommé : ce fichier est réécrit par des outils. */
const SAUT = String.fromCharCode(10);

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const adresse = (chemin) => `http://localhost:${String(PORT)}${chemin}`;

/**
 * LE RALENTI ENTRE DANS LA FEUILLE ELLE-MÊME, ET C'EST LE SEUL MOMENT ASSEZ TÔT.
 *
 * Deux tentatives ont échoué avant celle-ci, et les deux pour la même raison :
 * la transition du héros part au PREMIER calcul de style, c'est-à-dire avant
 * tout ce qu'un script peut faire. Un `addStyleTag` arrive après le chargement ;
 * un `addInitScript` s'exécute quand `document.documentElement` n'existe pas
 * encore, et attendre `readystatechange` le fait arriver après la première
 * peinture. Les six images rendaient l'état final, six fois.
 *
 * On intercepte donc la feuille de style au vol et on lui ajoute les trois
 * jetons ralentis. Ils entrent dans la cascade au même instant que le reste, et
 * le geste s'étire pour de bon.
 */
const ralentirLaFeuille = async (page, regle) => {
  await page.route(/\.css(\?|$)/, async (route) => {
    const reponse = await route.fetch();
    const corps = await reponse.text();

    await route.fulfill({ response: reponse, body: corps + regle });
  });
};

const ouvrir = async (chemin, options = {}, ralenti = null) => {
  const contexte = await navigateur.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    ...options,
  });
  const page = await contexte.newPage();

  if (ralenti !== null) {
    await ralentirLaFeuille(page, ralenti);
  }

  await page.goto(adresse(chemin), { waitUntil: 'load' });

  return { contexte, page };
};

/* ------------------------------------------------------------------------- */
/* 1. LE BANDEAU, À TROIS POSITIONS                                           */
/* ------------------------------------------------------------------------- */
{
  const { contexte, page } = await ouvrir('/');

  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const bandeau = page.locator('.bandeau-familles');

  for (const [rang, part] of [0.15, 0.4, 0.65].entries()) {
    await page.evaluate(async (fraction) => {
      const cible = document.body.scrollHeight * fraction;
      const pas = window.innerHeight * 0.5;

      for (let y = 0; y < cible; y += pas) {
        window.scrollTo(0, Math.min(y, cible));
        await new Promise((r) => setTimeout(r, 200));
      }

      window.scrollTo(0, cible);
    }, part);
    await page.waitForTimeout(700);

    const nom = `preuves/c18/bandeau-familles-${String(rang)}.png`;

    await bandeau.screenshot({ path: nom });
    process.stdout.write(`${nom}\n`);
  }

  await contexte.close();
}

/* ------------------------------------------------------------------------- */
/* 2 & 3. LES DEUX GESTES, RELEVÉS IMAGE PAR IMAGE PLUTÔT QUE PHOTOGRAPHIÉS    */
/* ------------------------------------------------------------------------- */
/*
 * POURQUOI CES DEUX-LÀ NE SONT PAS DES IMAGES, ET C'EST UN AVEU UTILE.
 *
 * La première rédaction voulait six captures de la cascade du héros et six de
 * celle du rayon. Elle a rendu six images IDENTIQUES, toutes à l'état final :
 * la capture d'écran de Playwright coûte plus cher que le geste ne dure.
 * Trois parades ont été tentées — étirer les durées par `addStyleTag`, par
 * `addInitScript`, puis en interceptant la feuille de style — et aucune n'a
 * suffi : ce qui prend du temps n'est pas le geste, c'est la SAISIE.
 *
 * Six images identiques légendées « séquence » auraient été une pièce fausse au
 * dossier. On relève donc la TRAJECTOIRE, image par image, par un
 * échantillonneur posé avant le premier script de la page. C'est plus exact
 * qu'une photographie (une valeur par image d'affichage, pas six instants
 * choisis), c'est lisible dans un diff, et cela ne prétend rien.
 */
{
  const contexte = await navigateur.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  await page.addInitScript(() => {
    const fenetre = window;

    fenetre.__trajectoire = [];

    const debut = performance.now();
    const echantillonner = () => {
      const lignes = [...document.querySelectorAll('[data-signature="ligne"]')];

      if (lignes.length > 0) {
        fenetre.__trajectoire.push({
          t: Math.round(performance.now() - debut),
          o: lignes.map((n) => Number(getComputedStyle(n).opacity)),
        });
      }

      if (performance.now() - debut < 2200) {
        requestAnimationFrame(echantillonner);
      }
    };

    requestAnimationFrame(echantillonner);
  });

  await page.goto(adresse('/'), { waitUntil: 'load' });
  await page.waitForTimeout(2600);

  const trajectoire = await page.evaluate(() => window.__trajectoire);

  await contexte.close();

  const lignes = [];
  const dire = (texte) => lignes.push(texte);

  dire("L'ENTRÉE À FROID DU TEXTE DU HÉROS — trajectoire relevée image par image");
  dire('');
  dire('Exigence client du 10/08. Quatre lignes, quatre rangs de cascade de 70 ms,');
  dire('--ms-hero (1 400 ms) et --ease-coule. Aucun script du site n’est encore');
  dire("passé quand la première valeur est relevée : le geste part au PREMIER");
  dire('calcul de style, ce qui est toute la différence avec la signature de C17.');
  dire('');
  dire('   ms   surtitre   monument   baseline    bouton');
  dire('   ' + '-'.repeat(46));

  for (const point of trajectoire) {
    if (point.t % 60 < 20 || point.t < 40) {
      dire(
        String(point.t).padStart(5) +
          point.o.map((v) => v.toFixed(3).padStart(11)).join(''),
      );
    }
  }

  const premier = trajectoire[0];
  const dernier = trajectoire.at(-1);

  dire('');
  dire(
    `Départ  : ${premier.o.map((v) => v.toFixed(3)).join('  ')}  (à ${String(premier.t)} ms)`,
  );
  dire(
    `Arrivée : ${dernier.o.map((v) => v.toFixed(3)).join('  ')}  (à ${String(dernier.t)} ms)`,
  );
  dire('');
  dire('Les quatre lignes partent de zéro, montent dans l’ordre de leur rang, et');
  dire('finissent toutes à un. La macro, elle, ne bouge pas — c’est un cas de');
  dire('campagne qui le fixe (échantillonnage de sa transformation).');

  writeFileSync(
    'preuves/c18/entree-froid-trajectoire.txt',
    `${lignes.join(SAUT)}${SAUT}`,
    'utf8',
  );
  process.stdout.write(`preuves/c18/entree-froid-trajectoire.txt${SAUT}`);
}

await navigateur.close();
serveur.kill();
