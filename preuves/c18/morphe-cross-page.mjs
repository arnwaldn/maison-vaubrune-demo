/* LE MORPH CARTE → FICHE, OBSERVÉ POUR DE VRAI (évaluation C18).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ON NE REJETTE PAS UNE FONCTIONNALITÉ SANS AVOIR VU CE QU'ELLE FAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le budget de premier chargement suffit à trancher : `experimental.viewTransition`
 * coûte 12,5 Ko gzip sur les vingt-deux routes, et deux routes publiques
 * passent au-dessus du plafond de 125 Ko de la décision D36. Le verdict est donc
 * arithmétique, et il est acquis avant ce script.
 *
 * Ce script sert à autre chose, et c'est ce qui fait la différence entre un
 * rejet motivé et un renoncement : il établit CE QU'ON ABANDONNE. Un morph qui
 * ne fonctionnait pas et un morph superbe ne se rejettent pas avec les mêmes
 * conditions de ré-évaluation, et l'ADR doit pouvoir le dire.
 *
 * TROIS OBSERVATIONS :
 *
 * 1. La transition démarre-t-elle ? On espionne `document.startViewTransition`
 *    AVANT le premier script de la page — le routeur de Next l'appelle, ou ne
 *    l'appelle pas, et rien dans le DOM n'en garde la trace.
 * 2. Les paires sont-elles APPARIÉES ? On relève les animations du document
 *    pendant la transition : un nom qui apparaît des deux côtés produit un
 *    groupe `::view-transition-group(...)`, un nom orphelin n'en produit pas.
 * 3. Que devient le fondu de route de C17 ? Les deux mécanismes visent le même
 *    instant. S'ils jouent ensemble, le morph se fait sur un contenu qui fond
 *    en même temps — c'est-à-dire deux gestes qui se gênent.
 *
 * Emploi :  node preuves/c18/morphe-cross-page.mjs [--sortie <fichier.txt>]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 4001;
const SAUT = String.fromCharCode(10);
const SLUG = 'huile-olive-premiere-pression';

const argument = (nom, defaut) => {
  const rang = process.argv.indexOf(nom);

  return rang === -1 ? defaut : process.argv[rang + 1];
};

const sortie = argument('--sortie', 'preuves/c18/morphe-cross-page.txt');

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}${SAUT}`);
};

dire('LE MORPH CARTE → FICHE — ce que le drapeau expérimental fait réellement');
dire('');

for (const reduit of [false, true]) {
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: reduit ? 'reduce' : 'no-preference',
  });
  const page = await contexte.newPage();

  await page.addInitScript(() => {
    const fenetre = window;

    fenetre.__vt = { appels: 0, groupes: [], opacitesTransitionPage: [] };

    const origine = document.startViewTransition?.bind(document);

    if (origine !== undefined) {
      document.startViewTransition = (rappel) => {
        fenetre.__vt.appels += 1;

        const transition = origine(rappel);

        /* LES ANIMATIONS N'EXISTENT QU'UNE FOIS LE DOM ÉCHANGÉ. On attend donc
           `ready`, puis on relève les pseudo-éléments engendrés — c'est la seule
           trace observable de l'appariement. */
        transition.ready
          .then(() => {
            for (const animation of document.getAnimations()) {
              const effet = animation.effect;
              const cible = effet?.target;
              const pseudo = effet?.pseudoElement ?? '';

              if (pseudo.includes('view-transition')) {
                fenetre.__vt.groupes.push(pseudo);
              } else if (cible?.hasAttribute?.('data-transition-page') === true) {
                fenetre.__vt.groupes.push('[fondu de route de C17]');
              }
            }
          })
          .catch(() => undefined);

        return transition;
      };
    }

    const echantillonner = () => {
      const contenu = document.querySelector('[data-transition-page]');

      if (contenu !== null) {
        fenetre.__vt.opacitesTransitionPage.push(
          Number(getComputedStyle(contenu).opacity),
        );
      }

      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await page.goto(`http://localhost:${String(PORT)}/boutique`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForTimeout(1200);

  const disponible = await page.evaluate(
    () => typeof document.startViewTransition === 'function',
  );

  await page.getByRole('link', { name: /^Huile d’olive de première pression/ }).click();
  await page.waitForURL(`**/boutique/${SLUG}`);
  await page.waitForTimeout(1600);

  const releve = await page.evaluate(() => {
    const vt = window.__vt;

    return {
      appels: vt.appels,
      groupes: [...new Set(vt.groupes)],
      opaciteMinimale: Math.min(...vt.opacitesTransitionPage, 1),
    };
  });

  await contexte.close();

  const morphVisuel = releve.groupes.some((g) => g.includes(`visuel-${SLUG}`));
  const morphTitre = releve.groupes.some((g) => g.includes(`titre-${SLUG}`));

  dire(`RÉGIME : ${reduit ? 'mouvement réduit' : 'mouvement'}`);
  dire(`   startViewTransition disponible          ${disponible ? 'oui' : 'non'}`);
  dire(`   appels du routeur                       ${String(releve.appels)}`);
  dire(`   groupe du visuel apparié                ${morphVisuel ? 'OUI' : 'non'}`);
  dire(`   groupe du titre apparié                 ${morphTitre ? 'OUI' : 'non'}`);
  dire(`   pseudo-éléments relevés                 ${String(releve.groupes.length)}`);

  for (const groupe of releve.groupes.slice(0, 24)) {
    dire(`      ${groupe}`);
  }

  dire(
    `   opacité minimale du fondu de route      ${releve.opaciteMinimale.toFixed(3)}`,
  );
  dire('');
}

dire('CE QUE CE RELEVÉ ÉTABLIT');
dire('');
dire("Il ne décide de rien : le verdict est arithmétique et il est ailleurs (le");
dire('premier chargement). Il établit ce que le rejet abandonne, pour que les');
dire('conditions de ré-évaluation de la décision 010 portent sur un fait et non');
dire('sur une supposition.');

writeFileSync(sortie, `${lignes.join(SAUT)}${SAUT}`, 'utf8');

await navigateur.close();
serveur.kill();
