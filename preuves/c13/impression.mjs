/* Controle d'impression : /retractation et les CGV en PDF, en-tete et pied
   doivent avoir disparu (feuille @media print de C7, etendue en C12 et C13). */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 3997;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({ channel: 'chromium' });
const page = await navigateur.newPage();

for (const [nom, chemin] of [
  ['retractation', '/retractation'],
  ['conditions-generales', '/conditions-generales-de-vente'],
]) {
  await page.goto(`http://localhost:${port}${chemin}`, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  const releve = await page.evaluate(() => {
    const visible = (s) => {
      const e = document.querySelector(s);
      if (e === null) return 'absent du DOM';
      return getComputedStyle(e).display === 'none' ? 'masqué' : 'VISIBLE';
    };
    return {
      entete: visible('header'),
      pied: visible('footer'),
      sentinelle: visible('[data-sentinelle-entete]'),
      lienSaut: visible('a[href="#contenu"]'),
      encadre: visible('[data-encadre-gabarit]'),
    };
  });
  console.log(chemin, JSON.stringify(releve));
  await page.emulateMedia({ media: null });
  await page.pdf({ path: `preuves/c13/impression-${nom}.pdf`, format: 'A4' });
}

await navigateur.close();
serveur.kill();
process.exit(0);
