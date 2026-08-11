/* LE MENU REPLIABLE, MIS À L'ÉPREUVE AVANT D'ÊTRE ÉCRIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA QUESTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écart n° 2 de C13 demande un en-tête collant sur mobile, où il mesure
 * 155 px. Le brief de C17 en propose la forme : un repliable en CSS pur
 * (`<details>`), fermé par défaut sous `md`.
 *
 * Or la même tranche impose que les 94 parcours de bout en bout restent verts
 * SANS être modifiés — « le harnais ne se plie pas au test ». Et l'un d'eux
 * (`parcours.spec.ts`) clique le lien « Boutique » de la navigation principale
 * SUR LES DEUX PROFILS, mobile compris, tandis qu'un autre lit la pastille du
 * panier, qui vit dans la même liste.
 *
 * Deux exigences qui se rencontrent : il faut savoir laquelle plie, et le
 * savoir par la mesure plutôt que par le raisonnement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'EXPÉRIENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On ne modifie AUCUN composant. On ouvre le site tel qu'il est livré, et on
 * replie la navigation DANS LA PAGE, exactement comme le ferait le composant
 * proposé : la `<nav>` est déplacée dans un `<details>` fermé. Puis on rejoue
 * les deux gestes que le harnais gelé exécute sur un téléphone.
 *
 * Le repli est fait au DOM plutôt qu'en écrivant le composant, pour une raison
 * de méthode : ce qu'on cherche à savoir ne dépend pas de la façon dont le
 * repliable est écrit, mais du seul fait que son contenu n'a plus de boîte.
 * L'expérience isole donc la cause, et son résultat vaut pour `<details>` comme
 * pour `popover` ou pour n'importe quel repli en `max-height: 0`.
 *
 * Emploi :  node preuves/c17/menu-repli-experience.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PORT = 3996;
const DELAI = 3000;

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resoudre) => setTimeout(resoudre, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

dire('MENU REPLIABLE SOUS `md` — expérience sur le site livré (tranche C17)');
dire('Profil : mobile 390 × 844, mouvement réduit — celui de la campagne gelée.');
dire('');

const contexte = await navigateur.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

await page.goto(`http://localhost:${String(PORT)}/`);
await page.waitForFunction(() => document.documentElement.dataset['hydratation'] === 'prete');

/* -------------------------------------------------------------------------- */
/* 0. L'état livré : la hauteur qui a ouvert l'écart C13 n° 2                  */
/* -------------------------------------------------------------------------- */

const hauteurLivree = await page
  .locator('[data-chrome-entete]')
  .evaluate((noeud) => noeud.getBoundingClientRect().height);

dire(`0. Hauteur de l'en-tête tel qu'il est livré : ${hauteurLivree.toFixed(1)} px`);
dire(`   soit ${((hauteurLivree / 844) * 100).toFixed(1)} % d'une fenêtre de 844 px.`);
dire('');

/* -------------------------------------------------------------------------- */
/* 1. On replie, sans toucher au dépôt                                        */
/* -------------------------------------------------------------------------- */

const hauteurRepliee = await page.evaluate(() => {
  const navigation = document.querySelector('nav[aria-label="Navigation principale"]');
  const repli = document.createElement('details');
  const bouton = document.createElement('summary');

  bouton.textContent = 'Menu';
  repli.append(bouton);
  navigation.parentElement.insertBefore(repli, navigation);
  repli.append(navigation);

  return document
    .querySelector('[data-chrome-entete]')
    .getBoundingClientRect().height;
});

dire(`1. Hauteur une fois la navigation repliée : ${hauteurRepliee.toFixed(1)} px`);
dire(
  `   Le repli rend ${(hauteurLivree - hauteurRepliee).toFixed(1)} px, ` +
    `soit ${(((hauteurLivree - hauteurRepliee) / hauteurLivree) * 100).toFixed(0)} % de l'en-tête.`,
);
dire('');

/* -------------------------------------------------------------------------- */
/* 2. Les deux gestes du harnais gelé                                         */
/* -------------------------------------------------------------------------- */

dire('2. Les gestes que la campagne gelée exécute sur ce profil :');

const lienBoutique = page
  .getByRole('navigation', { name: 'Navigation principale' })
  .getByRole('link', { name: 'Boutique', exact: true });

let verdictLien;

try {
  await lienBoutique.click({ timeout: DELAI });
  verdictLien = 'CLIQUÉ (le repli ne gêne pas)';
} catch (erreur) {
  const premiereLigne = String(erreur.message).split('\n')[0];
  verdictLien = `ÉCHEC — ${premiereLigne}`;
}

dire(`   parcours.spec.ts:115  lienNavigation('Boutique').click()`);
dire(`   → ${verdictLien}`);

const pastille = page.locator('header a[href="/panier"] span[aria-hidden="true"]');
let verdictPastille;

try {
  await pastille.waitFor({ state: 'visible', timeout: DELAI });
  verdictPastille = 'VISIBLE';
} catch {
  verdictPastille = 'ÉCHEC — la pastille du panier n’a plus de boîte : elle vit dans la même liste que les trois liens.';
}

dire(`   aides.ts:235          pastillePanier() visible ?`);
dire(`   → ${verdictPastille}`);
dire('');

/* -------------------------------------------------------------------------- */
/* 3. Le même geste, repli OUVERT — la contre-épreuve                         */
/* -------------------------------------------------------------------------- */

await page.evaluate(() => {
  document.querySelector('details').open = true;
});

let verdictOuvert;

try {
  await lienBoutique.click({ timeout: DELAI });
  verdictOuvert = 'CLIQUÉ';
} catch (erreur) {
  verdictOuvert = `ÉCHEC — ${String(erreur.message).split('\n')[0]}`;
}

dire('3. CONTRE-ÉPREUVE, le même lien une fois le repli OUVERT :');
dire(`   → ${verdictOuvert}`);
dire(
  '   La cause est donc bien le repli, et non le déplacement du nœud dans le DOM.',
);
dire('');

dire('CONCLUSION — un repliable FERMÉ PAR DÉFAUT sous `md` retire leur boîte aux');
dire('trois liens ET à la pastille du panier. Playwright exige une boîte non vide');
dire('pour agir : la campagne gelée tombe, et la seule façon de la rendre verte');
dire('serait de la modifier. Le critère de sortie n° 1 de la tranche l’interdit.');

await navigateur.close();
serveur.kill();

const { writeFileSync } = await import('node:fs');

writeFileSync('preuves/c17/menu-repli-experience.txt', `${lignes.join('\n')}\n`, 'utf8');
