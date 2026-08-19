/**
 * LA SUBSTITUTION DE `scroll-padding-top` NE CHANGE RIEN — MESURÉ (C23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ON VÉRIFIE, ET POURQUOI ÇA NE SE DÉDUIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `globals.css` portait `scroll-padding-top: 6.5rem` EN DUR, dans une requête
 * média `min-width: 48rem` — pendant que `--hauteur-entete` valait `6rem` sous
 * la MÊME requête, quinze lignes plus bas. Deux nombres pour une seule hauteur.
 * La variable avait justement été créée en C15 pour empêcher ça, et le
 * `scroll-padding-top` ne l'avait jamais lue : ils ont coexisté depuis, d'accord
 * par hasard, et rien n'aurait signalé le jour où l'un des deux bouge.
 *
 * L'arithmétique dit que `calc(6rem + 0.5rem)` vaut `6.5rem`. Elle ne dit pas
 * que le navigateur résout la variable au bon moment, ni que la cascade la voit
 * — `scroll-padding-top` est posé sur `html` et la variable sur `:root`, qui
 * sont le même élément, mais c'est une affirmation qu'on mesure au lieu de la
 * croire. La leçon de C16 s'applique telle quelle : *un test vert ne prouve rien
 * tant qu'on ne l'a pas vu rouge pour la raison qu'il annonce* — donc on relève
 * la valeur CALCULÉE, jamais la source.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI EST ATTENDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1280 px  →  104px   (6,5 rem : la règle s'applique, valeur inchangée)
 *    390 px  →  auto    (la requête média ne s'applique pas — état d'avant)
 *
 * Le second est aussi important que le premier : cette tranche ne rend PAS
 * encore l'en-tête collant sur mobile. Tant que la borne `md` est en place, le
 * comportement à 390 px doit rester exactement celui d'hier. C'est l'étape
 * suivante du lot qui la retirera, et ce script sera alors rejoué avec une
 * autre attente — d'où le fait qu'il imprime la valeur au lieu de la taire.
 */

import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 62791;
const ATTENDU_BUREAU = '104px';
const ATTENDU_MOBILE = 'auto';

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

/** Le serveur de production met un instant à répondre ; on l'attend au lieu de parier. */
async function attendreServeur() {
  for (let essai = 0; essai < 60; essai += 1) {
    try {
      const reponse = await fetch(`http://localhost:${String(PORT)}/`);
      if (reponse.ok) return;
    } catch {
      /* pas encore debout */
    }
    await new Promise((resoudre) => setTimeout(resoudre, 500));
  }
  throw new Error('le serveur de production n a pas repondu en 30 s');
}

/** La valeur CALCULÉE, à une largeur donnée. */
async function relever(navigateur, largeur) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: 844 } });
  const page = await contexte.newPage();
  await page.goto(`http://localhost:${String(PORT)}/retractation`, { waitUntil: 'networkidle' });
  const releve = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      scrollPaddingTop: style.scrollPaddingTop,
      hauteurEntete: style.getPropertyValue('--hauteur-entete').trim(),
      largeurReelle: window.innerWidth,
    };
  });
  await contexte.close();
  return releve;
}

let codeSortie = 0;

try {
  await attendreServeur();
  const navigateur = await chromium.launch();

  const bureau = await relever(navigateur, 1280);
  const mobile = await relever(navigateur, 390);

  await navigateur.close();

  console.log('Réserve des ancres — substitution de C23');
  console.log('-'.repeat(74));

  for (const [nom, releve, attendu] of [
    ['bureau', bureau, ATTENDU_BUREAU],
    ['mobile', mobile, ATTENDU_MOBILE],
  ]) {
    const vert = releve.scrollPaddingTop === attendu;
    if (!vert) codeSortie = 1;
    console.log(
      `  ${vert ? 'OK  ' : 'ÉCHEC'} ${nom} — largeur réelle ${String(releve.largeurReelle)} px, ` +
        `scroll-padding-top ${releve.scrollPaddingTop} (attendu ${attendu}), ` +
        `--hauteur-entete ${releve.hauteurEntete || '(vide)'}`,
    );
  }

  console.log('-'.repeat(74));
  console.log(
    codeSortie === 0
      ? 'Le rendu est identique à celui d avant la substitution.'
      : 'ÉCART — la substitution a changé le rendu, ce qu elle ne devait pas faire.',
  );
} finally {
  serveur.kill();
}

process.exit(codeSortie);
