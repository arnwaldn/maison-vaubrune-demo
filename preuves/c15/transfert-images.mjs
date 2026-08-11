/**
 * LES OCTETS D'IMAGE RÉELLEMENT TRANSFÉRÉS PAR UNE PAGE — plafonds D36.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce script existe alors que le pipeline sait déjà peser
 * ---------------------------------------------------------------------------
 *
 * `npm run preparer-images` additionne des FICHIERS ; une page télécharge des
 * RÉPONSES. Entre les deux il y a le `srcset` (le navigateur choisit UNE
 * largeur), le `<picture>` (il choisit UN format), le chargement paresseux (il
 * diffère ce qui est hors écran) et, depuis C15, les fonds CSS déclarés dans
 * une règle de survol, qu'il ne demande jamais tant que personne ne survole.
 * Aucun de ces quatre mécanismes ne se lit dans un total de dossier.
 *
 * Le relevé est fait DEUX FOIS par page, et c'est le point :
 *
 *   - AU CHARGEMENT, sans toucher à rien : ce que paie un visiteur qui arrive ;
 *   - APRÈS DÉFILEMENT jusqu'au bas : ce que paie celui qui lit tout. C'est
 *     celui-là que la décision D36 plafonne, parce que c'est le pire cas
 *     honnête. Se contenter du premier reviendrait à mesurer le chargement
 *     paresseux au lieu du poids de la page.
 *
 * ---------------------------------------------------------------------------
 * DEUX PROFILS DEPUIS LE ROUND 1, ET C'EST LE FOND DE L'AFFAIRE
 * ---------------------------------------------------------------------------
 *
 * La livraison ne mesurait qu'un profil — celui de `mesurer-notes`, 412 × 823 à
 * la densité 1,75 — et concluait « /boutique 129,1 Ko sur 180 ». La revue a
 * mesuré le même rayon sur un bureau à la densité 2 : 387 Ko. Le plafond D36
 * n'était pas tenu, il était HORS DE PORTÉE DE LA MESURE.
 *
 * C'est une faute de méthode, pas d'arithmétique : la densité et la largeur de
 * fenêtre décident ENSEMBLE de la largeur choisie dans le `srcset`, et un
 * plafond qui ne vaut que sur un profil n'est pas un plafond. Les deux profils
 * sont donc joués, et le pire des deux tranche.
 *
 * Le profil bureau est 1440 × 900 à la densité 2 : c'est un portable à écran
 * dense, la machine la plus banale du public de cette démonstration, et c'est
 * aussi la largeur à laquelle le rayon passe à trois colonnes.
 *
 * Usage : node preuves/c15/transfert-images.mjs [chemin…]
 */
import { spawn } from 'node:child_process';

import { chromium } from 'playwright-core';

const PORT = 3998;
const PLAFONDS = { '/boutique': 180, '/boutique/huile-olive-premiere-pression': 120 };

/**
 * Les deux profils, et le bridage réseau/processeur est commun aux deux : ce
 * qu'on compare, ce sont des OCTETS, et le bridage ne sert qu'à laisser au
 * chargement paresseux le temps de se déclencher comme il le ferait chez un
 * visiteur.
 */
const PROFILS = [
  {
    nom: 'mobile 412 x 823, densite 1,75',
    contexte: {
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    nom: 'bureau 1440 x 900, densite 2',
    contexte: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
    },
  },
];

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resolve) => setTimeout(resolve, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const chemins =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ['/', '/boutique', '/boutique/huile-olive-premiere-pression'];

let echecs = 0;

console.log('');
console.log('Octets d’image transférés — deux profils bridés, plafonds D36');
console.log('-'.repeat(78));

for (const profil of PROFILS) {
  console.log('');
  console.log(`PROFIL ${profil.nom}`);

  for (const chemin of chemins) {
    await releverUnePage(profil, chemin);
  }
}

async function releverUnePage(profil, chemin) {
  const contexte = await navigateur.newContext(profil.contexte);
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

  /** adresse -> octets transférés (en-têtes compris). */
  const images = new Map();

  page.on('response', async (reponse) => {
    const type = reponse.headers()['content-type'] ?? '';

    if (!type.startsWith('image/')) {
      return;
    }

    try {
      const corps = await reponse.body();
      images.set(new URL(reponse.url()).pathname, corps.length);
    } catch {
      /* Réponse disparue avant lecture : elle ne compte pas, et le dire vaut
         mieux que de fabriquer un zéro silencieux. */
      images.set(new URL(reponse.url()).pathname, 0);
    }
  });

  await page.goto(`http://localhost:${String(PORT)}${chemin}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const auChargement = [...images.values()].reduce((total, octets) => total + octets, 0);
  const nombreAuChargement = images.size;

  /* Défilement jusqu'au bas, par écrans : c'est ce qui déclenche le chargement
     paresseux, et un saut direct au bas en laisserait passer une partie. */
  const hauteur = await page.evaluate(() => document.body.scrollHeight);

  for (let y = 0; y < hauteur; y += 700) {
    await page.evaluate((position) => {
      window.scrollTo(0, position);
    }, y);
    await page.waitForTimeout(250);
  }

  await page.waitForTimeout(2500);

  const total = [...images.values()].reduce((somme, octets) => somme + octets, 0);
  const plafond = PLAFONDS[chemin];
  const ko = (octets) => `${(octets / 1024).toFixed(1)} Ko`;

  console.log(`${chemin}`);
  console.log(
    `          au chargement : ${ko(auChargement).padStart(9)} (${String(nombreAuChargement)} image(s))`,
  );
  console.log(
    `          après défilement : ${ko(total).padStart(9)} (${String(images.size)} image(s))` +
      (plafond === undefined ? '' : ` — plafond ${String(plafond)} Ko`),
  );

  for (const [adresse, octets] of [...images.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    console.log(`            ${adresse.padEnd(58)} ${ko(octets).padStart(9)}`);
  }

  if (plafond !== undefined && total > plafond * 1024) {
    console.log(`   -> DÉPASSEMENT : ${ko(total)} pour un plafond de ${String(plafond)} Ko`);
    echecs += 1;
  }

  await contexte.close();
}

console.log('-'.repeat(78));
console.log(echecs === 0 ? 'Tous les plafonds sont tenus.' : `${String(echecs)} dépassement(s).`);
console.log('');

await navigateur.close();
serveur.kill();
process.exit(echecs === 0 ? 0 : 1);
