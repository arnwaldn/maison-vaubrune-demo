/**
 * LES CAPTURES DE LA TRANCHE C16 — bureau et mobile, pleine page.
 *
 * Six écrans, deux formats : le panier PLEIN, le récapitulatif de commande,
 * l'écran de paiement simulé, la confirmation, le tableau de bord marchand et
 * la page de rétractation.
 *
 * QUATRE DE CES SIX ÉCRANS N'EXISTENT PAS SANS ÉTAT. Un panier plein, une
 * commande à récapituler, une référence à confirmer : rien de tout cela ne se
 * capture par un `goto`. Le script les MONTE PAR L'INTERFACE — il ouvre une
 * fiche, ajoute au panier, passe commande, paie sur l'écran simulé — plutôt que
 * d'écrire dans le stockage. Écrire dans le stockage irait plus vite et
 * capturerait un écran que personne ne peut atteindre : la forme persistée est
 * un détail d'implémentation versionné, et une capture qui la connaît finit par
 * montrer un état que le parcours ne produit plus.
 *
 * Les montants ne sont pas contrôlés ici — c'est le travail de
 * `tests/e2e/parcours.spec.ts`, aux valeurs exactes. Ce script produit des
 * images, pas des verdicts.
 *
 * Les PNG restent hors du dépôt (doctrine de C9, reprise en C13 et C15) ; le
 * script, lui, entre — une capture qu'on ne peut pas refaire ne prouve rien.
 *
 * Usage : node preuves/c16/captures-c16.mjs
 */
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { chromium } from 'playwright-core';

const SORTIE = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3994;
const FICHE = '/boutique/huile-olive-premiere-pression';

const FORMATS = [
  { nom: 'bureau', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  {
    nom: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
];

/** Les coordonnées d'essai — mêmes marqueurs d'irréalité que le jeu de C8 (D30). */
const CLIENT = {
  nom: 'Client d’essai C16',
  adresse: '1, rue de l’Exemple',
  codePostal: '69001',
  courriel: 'client-essai@example.invalid',
};

mkdirSync(SORTIE, { recursive: true });

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resoudre) => setTimeout(resoudre, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

console.log('');
console.log('Captures de la tranche C16 — tunnel, gestion, légal');
console.log('-'.repeat(76));

for (const format of FORMATS) {
  const { nom: nomFormat, ...options } = format;
  const contexte = await navigateur.newContext({ ...options, reducedMotion: 'reduce' });
  const page = await contexte.newPage();

  const adresse = (chemin) => `http://localhost:${String(PORT)}${chemin}`;

  const prise = async (nom) => {
    /* `data-hydratation` suffit ici : on capture des écrans, et un îlot qui
       n'aurait pas fini de lire le stockage se verrait sur l'image. */
    await page.waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
    );
    await page.waitForFunction(
      () => document.querySelectorAll('[data-place-reservee]').length === 0,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${SORTIE}${nom}-${nomFormat}.png`, fullPage: true });
    console.log(`  ${nom}-${nomFormat}.png`);
  };

  /* 1. LE PANIER PLEIN — deux lignes, pour que le registre s'aligne en colonne. */
  await page.goto(adresse(FICHE));
  await page.getByLabel('Quantité').fill('2');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByText('Ajouté au panier.').waitFor();

  await page.goto(adresse('/boutique/fromage-fermier-brebis'));
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByText('Ajouté au panier.').waitFor();

  await page.goto(adresse('/panier'));
  await prise('panier-plein');

  /* 2. LE RÉCAPITULATIF DE COMMANDE, coordonnées saisies et conditions acceptées :
        c'est l'état dans lequel on clique, donc celui qu'il faut montrer. */
  await page.goto(adresse('/commande'));
  await page.waitForFunction(
    () => document.querySelectorAll('[data-place-reservee]').length === 0,
  );
  await page.getByLabel('Prénom et nom').fill(CLIENT.nom);
  await page.getByLabel('Adresse de livraison').fill(CLIENT.adresse);
  await page.getByLabel('Code postal').fill(CLIENT.codePostal);
  await page.getByLabel('Courriel').fill(CLIENT.courriel);
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
  await prise('commande');

  /* 3. L'ÉCRAN SIMULÉ, atteint par le bouton et non par son adresse : c'est le
        serveur qui fabrique la référence (D20), et une adresse écrite à la main
        montrerait un écran sans commande derrière. */
  await page.getByRole('button', { name: 'Commander avec obligation de paiement' }).click();
  await page.waitForURL((url) => url.pathname === '/paiement/simulation');
  await prise('simulation');

  /* 4. LA CONFIRMATION, et sa référence en mono capitales. */
  await page.getByRole('link', { name: 'Payer' }).click();
  await page.waitForURL((url) => url.pathname === '/commande/confirmation');
  await prise('confirmation');

  /* 5. LE TABLEAU DE BORD MARCHAND — la commande qu'on vient de passer s'y
        trouve, ajoutée aux six du jeu d'essai. */
  await page.goto(adresse('/gestion'));
  await prise('gestion-tableau-de-bord');

  /* 6. LA RÉTRACTATION, pour son tableau de quinze lignes et son formulaire. */
  await page.goto(adresse('/retractation'));
  await prise('retractation');

  await contexte.close();
}

await navigateur.close();
serveur.kill();

console.log('-'.repeat(76));
console.log(`  12 captures écrites dans ${SORTIE}`);
console.log('');
