/* Captures des zones corrigées au round 1 de revue :
   - le pied de page, dont les cinq liens légaux sont désormais soulignés au
     repos (bureau et mobile) ;
   - les trois titres qui rendaient la Bodoni à 12 px et sont passés au
     registre (encadré des CGV, modèle de formulaire, aide de /suivi). */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 3995;
const sortie = 'preuves/c13';

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({ channel: 'chromium' });

/* 1. Le pied de page, aux deux formats. */
for (const [nom, viewport, mobile] of [
  ['bureau', { width: 1280, height: 900 }, false],
  ['mobile', { width: 390, height: 844 }, true],
]) {
  const contexte = await navigateur.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await contexte.newPage();
  await page.goto(`http://localhost:${port}/boutique/huile-olive-premiere-pression`, {
    waitUntil: 'load',
  });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page
    .locator('footer')
    .screenshot({ path: `${sortie}/round1-pied-liens-soulignes-${nom}.png` });
  await contexte.close();
}

/* 2. Les trois titres corrigés, dans leur cadre. */
const contexte = await navigateur.newContext({ viewport: { width: 1024, height: 900 } });
const page = await contexte.newPage();

for (const [nom, chemin, selecteur] of [
  ['cgv-encadre', '/conditions-generales-de-vente', '#titre-encadre-d211'],
  ['retractation-modele', '/retractation', '#titre-modele'],
  ['suivi-exemples', '/suivi', '#titre-exemples'],
]) {
  await page.goto(`http://localhost:${port}${chemin}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const cible = page.locator(selecteur);
  await cible.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const cadre = await cible.boundingBox();
  if (cadre !== null) {
    await page.screenshot({
      path: `${sortie}/round1-titre-${nom}.png`,
      clip: {
        x: Math.max(0, cadre.x - 24),
        y: Math.max(0, cadre.y - 24),
        width: Math.min(1024, cadre.width + 48),
        height: cadre.height + 160,
      },
    });
  }
}

await contexte.close();
await navigateur.close();
serveur.kill();
console.log('captures round 1 écrites dans', sortie);
process.exit(0);
