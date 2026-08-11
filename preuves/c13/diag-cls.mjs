/* Diagnostic de decalage cumule sous BRIDAGE — profil proche de Lighthouse mobile.
   Sans bridage, la fenetre d'echange de police est trop courte pour se voir. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 3999;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

for (const chemin of process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ['/', '/boutique/huile-olive-premiere-pression', '/panier']) {
  const contexte = await navigateur.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
  });
  const page = await contexte.newPage();
  const cdp = await contexte.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.addInitScript(() => {
    window.__decalages = [];
    new PerformanceObserver((liste) => {
      for (const e of liste.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__decalages.push({
          valeur: e.value,
          sources: (e.sources ?? []).map((s) => ({
            balise: s.node ? s.node.tagName : '?',
            classe:
              s.node && s.node.className ? String(s.node.className).slice(0, 100) : '',
            texte: s.node && s.node.textContent ? s.node.textContent.slice(0, 45) : '',
            avant: s.previousRect ? Math.round(s.previousRect.y) : '',
            apres: s.currentRect ? Math.round(s.currentRect.y) : '',
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(`http://localhost:${port}${chemin}`, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const d = await page.evaluate(() => window.__decalages);
  const total = d.reduce((s, x) => s + x.valeur, 0);
  console.log(`\n===== ${chemin} — CLS ${total.toFixed(4)} (${d.length} decalages) =====`);
  for (const x of d) {
    console.log(`  ${x.valeur.toFixed(5)}`);
    for (const s of x.sources) {
      console.log(`     <${s.balise}> y ${s.avant} -> ${s.apres} | ${s.classe}`);
      console.log(`        « ${s.texte.replace(/\s+/g, ' ')} »`);
    }
  }
  await contexte.close();
}
await navigateur.close();
serveur.kill();
process.exit(0);
