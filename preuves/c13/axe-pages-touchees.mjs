/* axe-core sur les pages TOUCHÉES par le round 1 de revue qui ne sont pas
   couvertes par accessibilite.spec.ts — les CGV et /suivi. /retractation, la
   troisième, y est déjà (et repasse à chaque campagne).
   Deux profils, tous deux en mouvement réduit, comme la campagne. */
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';

const port = 3996;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const PAGES = [
  ['conditions générales de vente', '/conditions-generales-de-vente'],
  ['suivi de commande', '/suivi'],
];
const PROFILS = [
  ['bureau-1280', { width: 1280, height: 900 }, false],
  ['mobile-390', { width: 390, height: 844 }, true],
];

const navigateur = await chromium.launch({ channel: 'chromium' });
let graves = 0;

for (const [nomProfil, viewport, mobile] of PROFILS) {
  const contexte = await navigateur.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  for (const [intitule, chemin] of PAGES) {
    await page.goto(`http://localhost:${port}${chemin}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
      undefined,
      { timeout: 10_000 },
    );
    await page.evaluate(() => document.fonts.ready);

    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const bloquantes = resultat.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const mineures = resultat.violations.filter(
      (v) => v.impact !== 'serious' && v.impact !== 'critical',
    );
    graves += bloquantes.length;

    console.log(
      `  ${nomProfil.padEnd(12)} ${intitule.padEnd(30)} ` +
        `${String(bloquantes.length)} grave(s), ${String(mineures.length)} mineure(s)`,
    );
    for (const v of bloquantes) console.log(`      GRAVE ${v.id} — ${v.help}`);
    for (const v of mineures) console.log(`      mineure ${v.id} — ${v.help}`);
  }

  await contexte.close();
}

await navigateur.close();
serveur.kill();
console.log(`\n  TOTAL : ${String(graves)} violation(s) serious/critical`);
process.exit(graves === 0 ? 0 : 1);
