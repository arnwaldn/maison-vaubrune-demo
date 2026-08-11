/**
 * LA COLONNE DROITE DE LA FICHE NE SE VIDE PLUS — mesuré, pas affirmé.
 *
 * La revue de C14 a relevé cinq cent cinquante pixels de vide dans la colonne
 * droite de la fiche de bureau. La réponse de C15 est double : la colonne porte
 * désormais tout ce qui sert à acheter, et elle COLLE. Une capture pleine page
 * ne peut pas montrer la seconde moitié — elle aplatit le défilement, et le
 * panneau y apparaît immobile en haut d'une colonne longue.
 *
 * Ce script mesure ce qu'un visiteur voit : à quatre hauteurs de défilement, le
 * panneau d'achat est-il DANS la fenêtre, et le bouton « Ajouter au panier »
 * avec lui ? Il vérifie aussi que la barre des familles du rayon s'arrête bien
 * sous l'en-tête plutôt que dessous ou dessus.
 *
 * Usage : node preuves/c15/panneau-collant.mjs
 * Sortie : 0 si conforme, 1 sinon.
 */
import { spawn } from 'node:child_process';

import { chromium } from 'playwright-core';

const PORT = 3994;
const FICHE = '/boutique/huile-olive-premiere-pression';

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resolve) => setTimeout(resolve, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 } });
const page = await contexte.newPage();
const anomalies = [];

console.log('');
console.log('Le panneau d’achat colle — fiche de bureau, 1440 × 900');
console.log('-'.repeat(76));

await page.goto(`http://localhost:${String(PORT)}${FICHE}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const panneau = page.locator('aside[aria-label="Achat"]');
const bouton = page.getByRole('button', { name: /Ajouter au panier/u });

for (const y of [0, 600, 1200, 1800]) {
  await page.evaluate((position) => {
    window.scrollTo(0, position);
  }, y);
  await page.waitForTimeout(350);

  const cadre = await panneau.boundingBox();
  const cadreBouton = await bouton.boundingBox();
  const hauteurFenetre = 900;

  const visible =
    cadre !== null && cadre.y < hauteurFenetre && cadre.y + cadre.height > 0 ? 'oui' : 'NON';
  const boutonVisible =
    cadreBouton !== null && cadreBouton.y >= 0 && cadreBouton.y + cadreBouton.height <= hauteurFenetre
      ? 'oui'
      : 'NON';

  console.log(
    `  défilement ${String(y).padStart(4)} px : panneau visible ${visible}, ` +
      `bouton d’ajout entièrement visible ${boutonVisible} ` +
      `(haut du panneau à y=${cadre === null ? '?' : String(Math.round(cadre.y))})`,
  );

  if (visible !== 'oui') {
    anomalies.push(`à ${String(y)} px de défilement, le panneau d’achat a quitté la fenêtre`);
  }

  /* AU SOMMET, LE BOUTON EST SOUS LA LIGNE DE FLOTTAISON, ET C'EST NORMAL : le
     panneau commence après le titre et la galerie. Ce qu'on vérifie est qu'il
     REMONTE dès qu'on défile — c'est cela, coller — et non qu'il soit visible
     avant qu'on ait rien fait. */
  if (y > 0 && boutonVisible !== 'oui') {
    anomalies.push(`à ${String(y)} px de défilement, le bouton d’ajout n’est plus entièrement visible`);
  }
}

/* La barre des familles du rayon s'arrête-t-elle SOUS l'en-tête ? */
await page.goto(`http://localhost:${String(PORT)}/boutique`, { waitUntil: 'load' });
await page.evaluate(() => {
  window.scrollTo(0, 1400);
});
await page.waitForTimeout(400);

const entete = await page.locator('[data-chrome-entete]').boundingBox();
const barre = await page.locator('nav[aria-labelledby="titre-familles"]').boundingBox();

console.log(
  `  rayon défilé : en-tête ${entete === null ? '?' : `${String(Math.round(entete.y))}–${String(Math.round(entete.y + entete.height))}`}, ` +
    `barre des familles ${barre === null ? '?' : `${String(Math.round(barre.y))}–${String(Math.round(barre.y + barre.height))}`}`,
);

if (entete !== null && barre !== null) {
  const chevauche = barre.y < entete.y + entete.height - 1;

  if (chevauche) {
    anomalies.push(
      `la barre des familles passe SOUS l’en-tête (barre à ${String(Math.round(barre.y))}, ` +
        `en-tête jusqu’à ${String(Math.round(entete.y + entete.height))})`,
    );
  }
}

await navigateur.close();
serveur.kill();

console.log('-'.repeat(76));

for (const anomalie of anomalies) {
  console.log(`   -> ${anomalie}`);
}

console.log(anomalies.length === 0 ? 'Conforme.' : `${String(anomalies.length)} anomalie(s).`);
console.log('');
process.exit(anomalies.length === 0 ? 0 : 1);
