/* Regard porté sur /panier après la cagette — le héros seul, sur un bureau.
   Deux instants : l'affiche seule (mouvement réduit, la vidéo ne part pas) et
   la boucle en lecture. Sortie hors dépôt. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 3997;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({ channel: 'chromium' });

for (const [nom, reducedMotion] of [
  ['affiche-seule', 'reduce'],
  ['boucle-en-lecture', 'no-preference'],
]) {
  const contexte = await navigateur.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion,
  });
  const page = await contexte.newPage();
  await page.goto(`http://localhost:${String(port)}/panier`);
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForTimeout(nom === 'affiche-seule' ? 2000 : 6000);

  const heros = page.locator('[data-titre-anime]');
  await heros.screenshot({ path: `travaux-images/vu-panier-${nom}.png` });

  const mesure = await page.locator('.scene-heros').evaluate((n) => {
    const image = n.querySelector('img');
    const video = n.querySelector('video');
    const b = n.getBoundingClientRect();
    return {
      scene: `${String(Math.round(b.width))} x ${String(Math.round(b.height))}`,
      rapport: (b.width / b.height).toFixed(3),
      imageServie: image?.currentSrc.split('/').slice(-2).join('/') ?? '(aucune)',
      opaciteVideo: video === null ? '(aucune)' : getComputedStyle(video).opacity,
      etatVideo: video?.dataset['videoHeros'] ?? '(aucun)',
    };
  });

  console.log(nom, JSON.stringify(mesure));
  await contexte.close();
}

await navigateur.close();
serveur.kill();
