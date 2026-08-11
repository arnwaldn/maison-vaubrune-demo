/* LES PIÈCES VISUELLES DE LA TRANCHE C17.
 *
 * Trois séries, et chacune répond à une question qu'un texte ne peut pas
 * fermer :
 *
 * 1. LA SÉQUENCE DE RÉVÉLATION de l'accueil — six vues échelonnées pendant le
 *    fondu d'un bloc qui entre dans la fenêtre. C'est la seule façon de montrer
 *    qu'une révélation RÉVÈLE au lieu de pousser : le cadre ne bouge pas d'une
 *    vue à l'autre, seul le contenu se pose.
 * 2. LA SÉQUENCE DU FONDU DE ROUTE — la même méthode sur une navigation
 *    cliente, pour montrer que la page arrive entière et non par morceaux.
 * 3. L'EN-TÊTE MOBILE, AVANT ET APRÈS — c'est-à-dire deux fois la même image,
 *    puisque la tranche a mesuré puis renoncé (voir `menu-repli-experience.mjs`
 *    et le commentaire de `.entete` dans `globals.css`). La capture est prise
 *    quand même : une décision de ne rien changer se documente comme une autre,
 *    et la hauteur qu'elle laisse au prochain qui rouvrira le sujet est écrite
 *    dans le nom du fichier.
 *
 * Emploi :  node preuves/c17/captures-c17.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 3992;
const SORTIE = 'preuves/c17';

mkdirSync(SORTIE, { recursive: true });

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const adresse = (chemin) => `http://localhost:${String(PORT)}${chemin}`;

/** Attend l'hydratation ET la pose de la classe de mouvement. */
async function prete(page) {
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('mouvement'),
  );
  await page.evaluate(() => document.fonts.ready);
}

/* ------------------------------------------------------------------------ */
/* 1. La séquence de révélation                                             */
/* ------------------------------------------------------------------------ */

{
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  await page.goto(adresse('/'));
  await prete(page);

  /* On se place JUSTE AU-DESSUS de la rangée des familles, dont les sept lignes
     portent la cascade. Le défilement qui suit les fait entrer toutes ensemble,
     et les six vues attrapent la cascade en train de se dérouler. */
  await page.evaluate(() => {
    const cible = document.querySelector('.familles');

    window.scrollTo(0, (cible?.getBoundingClientRect().top ?? 0) + window.scrollY - 760);
  });
  await page.waitForTimeout(900);

  /* Le déclencheur : un défilement d'un demi-écran, qui amène la rangée dans la
     fenêtre. Les captures partent immédiatement après. */
  await page.evaluate(() => {
    window.scrollBy(0, 620);
  });

  for (const [rang, attente] of [
    [0, 0],
    [1, 90],
    [2, 90],
    [3, 120],
    [4, 150],
    [5, 400],
  ]) {
    await page.waitForTimeout(attente);
    await page.screenshot({
      path: `${SORTIE}/revelation-accueil-${String(rang)}.png`,
    });
  }

  await contexte.close();
}

/* ------------------------------------------------------------------------ */
/* 2. La séquence du fondu de route                                          */
/* ------------------------------------------------------------------------ */

{
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  await page.goto(adresse('/'));
  await prete(page);

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();

  for (const [rang, attente] of [
    [0, 0],
    [1, 120],
    [2, 180],
    [3, 300],
    [4, 900],
  ]) {
    await page.waitForTimeout(attente);
    await page.screenshot({ path: `${SORTIE}/transition-route-${String(rang)}.png` });
  }

  await contexte.close();
}

/* ------------------------------------------------------------------------ */
/* 3. L'en-tête mobile, et la hauteur qu'il garde                            */
/* ------------------------------------------------------------------------ */

{
  const contexte = await navigateur.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(adresse('/'));
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.evaluate(() => document.fonts.ready);

  const hauteur = await page
    .locator('[data-chrome-entete]')
    .evaluate((noeud) => noeud.getBoundingClientRect().height);

  await page.screenshot({
    path: `${SORTIE}/entete-mobile-inchange-${hauteur.toFixed(0)}px.png`,
    clip: { x: 0, y: 0, width: 390, height: Math.ceil(hauteur) + 40 },
  });

  await contexte.close();
}

await navigateur.close();
serveur.kill();

process.stdout.write(`Captures écrites dans ${SORTIE}/\n`);
process.exit(0);
