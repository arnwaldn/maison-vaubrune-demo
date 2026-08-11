/* LE HÉROS AVANT ET APRÈS, À TROIS LARGEURS (tranche C18).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  COMMENT « AVANT » EST OBTENU, ET POURQUOI CE N'EST PAS UNE TRICHERIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le correctif tient en UNE déclaration : le corps du monument passe de
 * `var(--text-monument)` à `min(var(--text-monument), 22.6cqi)`. La capture
 * « avant » est donc prise sur la MÊME construction, en réinjectant cette seule
 * déclaration au chargement — hors couche et en `!important`, pour qu'elle
 * batte la règle livrée exactement comme la règle livrée bat l'utilitaire.
 *
 * L'alternative — reconstruire le sommet précédent dans l'arbre — a été jouée
 * pour la PREUVE ROUGE de la garde (`monument-preuve-rouge.txt`), là où elle
 * était indispensable : il fallait que le test échoue sur le livrable réel.
 * Pour une paire d'images destinées à l'œil, elle ne dirait rien de plus et
 * coûterait deux constructions ; les deux chemins ont d'ailleurs donné le même
 * nombre — 40 px de débord à 1 440 px.
 *
 * Emploi :  node preuves/c18/captures-monument.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PORT = 3995;
const LARGEURS = [1440, 1900, 2560];

/* La déclaration d'AVANT, remise telle qu'elle était au sommet d55c520. */
const AVANT = '.monument-heros { font-size: var(--text-monument) !important; }';

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

for (const largeur of LARGEURS) {
  for (const etat of ['avant', 'apres']) {
    const contexte = await navigateur.newContext({
      viewport: { width: largeur, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await contexte.newPage();

    if (etat === 'avant') {
      await page.addInitScript((regle) => {
        document.addEventListener('DOMContentLoaded', () => {
          const feuille = document.createElement('style');

          feuille.textContent = regle;
          document.head.append(feuille);
        });
      }, AVANT);
    }

    await page.goto(`http://localhost:${String(PORT)}/`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
    );
    await page.waitForFunction(() => document.fonts.status === 'loaded');

    /* La section du héros seule : c'est là que le défaut se voit, et une pleine
       page à 2 560 px de large rendrait le mot illisible dans le fichier. */
    const heros = page.locator('section').first();
    const nom = `preuves/c18/monument-${String(largeur)}-${etat}.png`;

    await heros.screenshot({ path: nom });
    process.stdout.write(`${nom}\n`);

    await contexte.close();
  }
}

await navigateur.close();
serveur.kill();
