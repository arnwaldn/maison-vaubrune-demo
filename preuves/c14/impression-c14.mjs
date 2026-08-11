/* IMPRESSION — LA COQUILLE SORT, LE CONTENU RESTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CE SCRIPT A LAISSÉ PASSER, ET POURQUOI IL A CHANGÉ DE CRITÈRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Première rédaction (C14) : elle comptait les nœuds dont
 * `getComputedStyle(n).display` valait autre chose que `none`. Ce critère est
 * AVEUGLE AUX ANCÊTRES — le style calculé d'un enfant ne dit rien du parent qui
 * le masque. La feuille d'impression masquait alors `header, footer` au
 * sélecteur nu, donc aussi le `<header>` du bloc titre + prix + photographies
 * de la fiche produit ; les deux `<img>` étaient dans un ancêtre invisible,
 * leur `display` restait `block`, et le contrôle rendait « 2 photographies
 * visibles » sur un PDF qui n'avait NI titre, NI prix, NI silhouette.
 *
 * Un contrôle qui ne peut pas rendre faux n'est pas un contrôle. Le critère est
 * désormais `Element.checkVisibility({ checkVisibilityCSS: true })`, qui remonte
 * la chaîne des ancêtres, tient compte de `visibility` et de `content-visibility`
 * — c'est-à-dire qui répond à la question posée : cet élément fera-t-il de
 * l'encre ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL VÉRIFIE MAINTENANT, EN TROIS PAGES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FICHE PILOTE — à l'écran : deux photographies, aucune silhouette, l'en-tête
 * et le pied du site présents. Sous `print` : aucune photographie, UNE
 * silhouette (arbitrage du round 1 : les deux vues partagent le même dessin de
 * repli, l'imprimer deux fois sur une A4 n'est pas l'intention de D35), aucun
 * organe de coquille — ET le bloc titre + prix de la fiche TOUJOURS LÀ. Cette
 * dernière assertion est le contrôle qui manquait : c'est elle qui tombe si
 * quelqu'un rétablit un jour un `header { display: none }` nu.
 *
 * PAGES LÉGALES — `/retractation` et les CGV avaient été validées en C13 SOUS
 * LA RÈGLE NUE. Elles sont donc rejouées ici : leur en-tête et leur pied
 * doivent rester absents (elles n'ont pas de `<header>` de contenu, la nouvelle
 * règle ne change rien pour elles), et leur contenu rester intact —
 * l'avertissement de gabarit, les emplacements `<mark>` et le titre.
 *
 * Usage : node preuves/c14/impression-c14.mjs [--sortie preuves/c16/]
 * Sortie : 0 si tout est conforme, 1 sinon. Trois PDF écrits dans le dossier
 * demandé, à défaut dans preuves/c14/.
 *
 * L'OPTION `--sortie` EST ARRIVÉE EN C16, et pour la même raison que celle de
 * `captures.mjs` en C11 : ce contrôle est REJOUÉ à chaque tranche qui touche à
 * l'impression, et écrire toujours dans le dossier de la tranche qui l'a écrit
 * mélangerait les preuves de C14 et celles de ses successeurs sous le même nom
 * de fichier. Un PDF écrasé est une preuve perdue.
 */

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const demandee = process.argv[process.argv.indexOf('--sortie') + 1];

const SORTIE =
  process.argv.includes('--sortie') && demandee !== undefined
    ? `${isAbsolute(demandee) ? demandee : join(RACINE, demandee)}/`.replaceAll('//', '/')
    : fileURLToPath(new URL('.', import.meta.url));

mkdirSync(resolve(SORTIE), { recursive: true });

const FICHE = '/boutique/huile-olive-premiere-pression';
const RETRACTATION = '/retractation';
const CGV = '/conditions-generales-de-vente';

const port = 3996;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});
const page = await navigateur.newPage();

/**
 * LE RELEVÉ D'UNE PAGE, dans le média courant.
 *
 * Tout passe par `checkVisibility` — y compris le comptage des photographies,
 * qui était le seul à ne pas le faire et le seul à s'être trompé.
 */
const RELEVER = () => {
  const visible = (n) => n !== null && n.checkVisibility({ checkVisibilityCSS: true });
  const compter = (selecteur) => [...document.querySelectorAll(selecteur)].filter(visible).length;

  /* Le bloc titre de la fiche : un `<header>` de CONTENU, à ne pas confondre
     avec l'en-tête du site. On l'interroge par ce qu'il porte.

     LE PRIX A DÉMÉNAGÉ EN C15 : il vit dans le panneau d'achat collant, plus
     dans le bloc titre. On le cherche donc dans tout l'article — ce qui est de
     toute façon la bonne question (« un prix s'imprime-t-il ? ») et non
     l'ancienne (« le prix est-il resté à cet endroit ? »). */
  const article = document.querySelector('article');
  const blocFiche = document.querySelector('article > header');
  const titre = blocFiche?.querySelector('h1') ?? null;
  const prix =
    [...(article?.querySelectorAll('p') ?? [])].find((p) => p.textContent.includes('€')) ?? null;

  return {
    photographies: compter('.visuel-produit img'),
    silhouettes: compter('.visuel-produit [data-repli-silhouette]'),
    entete: compter('[data-chrome-entete]'),
    pied: compter('[data-chrome-pied]'),
    sentinelle: compter('[data-sentinelle-entete]'),
    /* LE BLOC D'ACHAT (C15) : sélecteur de format, quantité, bouton. Le PDF de
       C14 le sortait page 3 — un bon de commande apparent sur du papier. */
    blocAchat: compter('[data-bloc-achat]'),
    organesAchat: compter('[data-bloc-achat] select, [data-bloc-achat] input, [data-bloc-achat] button'),
    /* Le tableau des formats, lui, RESTE : il informe, il n'engage pas. */
    tableauFormats: compter('table'),
    blocFiche: visible(blocFiche) ? 1 : 0,
    titre: visible(titre) ? 1 : 0,
    texteTitre: titre?.textContent?.trim() ?? '',
    prix: visible(prix) ? 1 : 0,
    textePrix: prix?.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
    /* Pages légales : les emplacements à remplir DOIVENT survivre à
       l'impression — un gabarit imprimé sans ses trous s'imprime rempli. */
    emplacements: compter('mark'),
    titresLegaux: compter('h1'),
    /* CE QUI DÉPASSE D'UN CADRE À DÉFILEMENT (contrôle ajouté en C16).
     *
     * Un `overflow-x: auto` montre une barre sur un écran ; sur du papier il
     * COUPE, sans rien dire. Le tableau des quinze régimes de rétractation
     * portait `min-w-3xl` (768 points) pour rester lisible à 390 px, et la
     * largeur imprimable d'une A4 vaut environ 700 : la colonne des mentions
     * légales sortait du cadre et le PDF publiait des phrases de droit
     * tronquées — « susceptible de se détériorer o », « articles L. 221-18 et
     * suiv ». Le défaut a traversé C7 à C15 sans être vu, parce que le contrôle
     * comptait des organes et ne mesurait aucune largeur.
     *
     * On relève ici le débordement réel — le contenu moins le cadre —, en
     * points. Zéro est la seule valeur acceptable sous `print`. */
    debordementCadres: [...document.querySelectorAll('[data-cadre-defilant]')].reduce(
      (pire, cadre) => Math.max(pire, cadre.scrollWidth - cadre.clientWidth),
      0,
    ),
    cadresDefilants: compter('[data-cadre-defilant]'),
    /* LA MENTION DE RÉTRACTATION SUR UNE FICHE (contrôle ajouté en C19).
     *
     * Le retour client du 10/08 a demandé la SUPPRESSION TOTALE de l'encadré
     * sur les quinze fiches, sans ligne de remplacement : l'information
     * pré-contractuelle reste portée par les CGV, par `/retractation` et par le
     * tunnel, et `regimeRetractation()` reste leur source unique (D12).
     *
     * Ce contrôle regarde le TEXTE RENDU de l'article, pas la source — c'est la
     * leçon de C13 (« contrôler la propriété, pas son indice ») : une fiche qui
     * réintroduirait la mention par un autre composant, ou par un `<T>` d'une
     * prose reprise, ne porterait plus le nom du composant retiré et un grep ne
     * la verrait pas. On compte donc les occurrences dans ce qui fait de
     * l'encre, à l'écran ET sous `print`.
     *
     * La portée s'arrête à l'article : le pied du site porte légitimement un
     * lien « Rétractation » vers le document, et c'est très bien. */
    mentionsRetractation: [
      ...(article?.textContent ?? '').matchAll(/r[ée]tractation/giu),
    ].length,
  };
};

async function relever(adresse) {
  await page.goto(`http://localhost:${port}${adresse}`, { waitUntil: 'networkidle' });

  await page.emulateMedia({ media: 'screen' });
  const ecran = await page.evaluate(RELEVER);

  /* LA LARGEUR DU PAPIER, ET PAS SEULEMENT SA FEUILLE DE STYLE (C16).
   *
   * `emulateMedia({ media: 'print' })` applique les règles `@media print` et ne
   * touche PAS à la largeur de la fenêtre. Tout ce qui dépend de la place —
   * un tableau plus large que la page, une grille qui se recompose — se mesurait
   * donc à 1280 points alors que le PDF se compose à 794, et le contrôle rendait
   * « débordement 0 » sur un document que Chrome coupait ensuite. Première
   * rédaction du contrôle de C16 : verte alors qu'elle aurait dû être rouge, ce
   * qui est le pire des deux échecs.
   *
   * 794 points = 210 mm à 96 points par pouce, c'est-à-dire la largeur exacte
   * d'une A4 sans marge — le réglage que `page.pdf({ format: 'A4' })` emploie
   * par défaut dans Playwright. La fenêtre est remise à sa largeur d'écran
   * ensuite : les deux relevés doivent rester comparables. */
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: 'print' });
  const impression = await page.evaluate(RELEVER);

  await page.setViewportSize({ width: 1280, height: 900 });

  return { ecran, impression };
}

async function pdf(nom) {
  await page.pdf({ path: `${SORTIE}${nom}`, format: 'A4', printBackground: true });
}

const anomalies = [];

const exiger = (condition, message) => {
  if (!condition) {
    anomalies.push(message);
  }
};

console.log('');
console.log('Impression — la coquille sort, le contenu reste (D35 / feuille de C12)');
console.log('-'.repeat(76));

/* ------------------------------------------------------------------------- */
/* 1. La fiche pilote                                                         */
/* ------------------------------------------------------------------------- */

const fiche = await relever(FICHE);
await pdf('impression-fiche-huile-olive.pdf');

/* LE CONTRÔLE DE C19 : la fiche ne parle plus de rétractation, nulle part. */
exiger(
  fiche.ecran.mentionsRetractation === 0,
  `écran : ${String(fiche.ecran.mentionsRetractation)} mention(s) de rétractation sur la fiche — ` +
    `le retour client du 10/08 les a toutes retirées des quinze fiches`,
);
exiger(
  fiche.impression.mentionsRetractation === 0,
  `impression : ${String(fiche.impression.mentionsRetractation)} mention(s) de rétractation ` +
    `s’impriment encore sur la fiche`,
);

console.log('  FICHE PILOTE');
console.log(
  `    écran      : ${String(fiche.ecran.photographies)} photo(s), ${String(fiche.ecran.silhouettes)} silhouette(s), ` +
    `en-tête ${String(fiche.ecran.entete)}, pied ${String(fiche.ecran.pied)}, titre « ${fiche.ecran.texteTitre} »`,
);
console.log(
  `    impression : ${String(fiche.impression.photographies)} photo(s), ${String(fiche.impression.silhouettes)} silhouette(s), ` +
    `en-tête ${String(fiche.impression.entete)}, pied ${String(fiche.impression.pied)}, sentinelle ${String(fiche.impression.sentinelle)}`,
);
console.log(
  `    bloc d’achat : écran ${String(fiche.ecran.blocAchat)} (${String(fiche.ecran.organesAchat)} organes), ` +
    `impression ${String(fiche.impression.blocAchat)} (${String(fiche.impression.organesAchat)} organes) ; ` +
    `tableau des formats à l’impression ${String(fiche.impression.tableauFormats)}`,
);
console.log(
  `    impression : titre « ${fiche.impression.texteTitre} » ${fiche.impression.titre === 1 ? 'VISIBLE' : 'ABSENT'}, ` +
    `prix « ${fiche.impression.textePrix} » ${fiche.impression.prix === 1 ? 'VISIBLE' : 'ABSENT'}`,
);
console.log(
  `    mentions de rétractation dans l’article : écran ${String(fiche.ecran.mentionsRetractation)}, ` +
    `impression ${String(fiche.impression.mentionsRetractation)} (attendu 0 / 0)`,
);

exiger(fiche.ecran.photographies === 2, 'écran : on attend deux photographies sur la fiche');
exiger(fiche.ecran.silhouettes === 0, 'écran : aucune silhouette ne doit se voir');
exiger(fiche.ecran.entete === 1 && fiche.ecran.pied === 1, 'écran : la coquille doit être là');
exiger(fiche.ecran.blocAchat === 1, 'écran : le bloc d’achat doit être là');
exiger(
  fiche.ecran.organesAchat >= 2,
  'écran : le bloc d’achat doit porter ses organes (sélecteur, quantité, bouton)',
);

exiger(fiche.impression.photographies === 0, 'impression : une photographie reste visible');
exiger(
  fiche.impression.silhouettes === 1,
  `impression : on attend UNE silhouette (arbitrage round 1), pas ${String(fiche.impression.silhouettes)}`,
);
exiger(fiche.impression.entete === 0, 'impression : l’en-tête du site reste visible');
exiger(fiche.impression.pied === 0, 'impression : le pied du site reste visible');
exiger(fiche.impression.sentinelle === 0, 'impression : la sentinelle reste dans le flux');
exiger(
  fiche.impression.blocFiche === 1,
  'impression : LE BLOC TITRE + PRIX DE LA FICHE A DISPARU — c’est le défaut C1 du round 1',
);
exiger(fiche.impression.titre === 1, 'impression : le nom du produit ne s’imprime pas');
exiger(
  fiche.impression.texteTitre.includes('Huile d’olive'),
  `impression : le titre imprimé n’est pas celui de la fiche (« ${fiche.impression.texteTitre} »)`,
);
exiger(fiche.impression.prix === 1, 'impression : le prix ne s’imprime pas');
exiger(
  fiche.impression.blocAchat === 0,
  'impression : LE BLOC D’ACHAT S’IMPRIME — c’est l’écart « page 3 » du PDF de C14',
);
exiger(
  fiche.impression.organesAchat === 0,
  `impression : ${String(fiche.impression.organesAchat)} organe(s) de formulaire s’impriment encore`,
);
exiger(
  fiche.impression.tableauFormats >= 1,
  'impression : le tableau des formats a disparu — il informe, il n’engage pas, il reste',
);
exiger(
  fiche.impression.textePrix.includes('€'),
  `impression : la ligne de prix ne porte pas d’euros (« ${fiche.impression.textePrix} »)`,
);

/* ------------------------------------------------------------------------- */
/* 2. Les deux pages légales validées en C13 SOUS LA RÈGLE NUE                */
/* ------------------------------------------------------------------------- */

for (const [intitule, adresse, fichier] of [
  ['RÉTRACTATION', RETRACTATION, 'impression-retractation.pdf'],
  ['CGV', CGV, 'impression-cgv.pdf'],
]) {
  const releve = await relever(adresse);
  await pdf(fichier);

  console.log(`  ${intitule}`);
  console.log(
    `    impression : en-tête ${String(releve.impression.entete)}, pied ${String(releve.impression.pied)}, ` +
      `sentinelle ${String(releve.impression.sentinelle)}, titre ${String(releve.impression.titresLegaux)}, ` +
      `emplacements <mark> ${String(releve.impression.emplacements)}`,
  );
  console.log(
    `    cadres à défilement : ${String(releve.impression.cadresDefilants)} — débordement ` +
      `écran ${String(releve.ecran.debordementCadres)} pt, impression ` +
      `${String(releve.impression.debordementCadres)} pt`,
  );

  exiger(releve.ecran.entete === 1, `${intitule} : écran sans en-tête`);
  exiger(releve.impression.entete === 0, `${intitule} : l’en-tête du site s’imprime`);
  exiger(releve.impression.pied === 0, `${intitule} : le pied du site s’imprime`);
  exiger(releve.impression.sentinelle === 0, `${intitule} : la sentinelle s’imprime`);
  exiger(releve.impression.titresLegaux >= 1, `${intitule} : le titre du document ne s’imprime pas`);
  exiger(
    releve.impression.emplacements >= 1,
    `${intitule} : plus aucun emplacement <mark> à l’impression — le gabarit s’imprimerait rempli`,
  );
  /* Le contrôle de C16. Il porte sur l'IMPRESSION seulement : à l'écran, un
     débordement est la raison d'être du cadre (D27/C8 — trois conteneurs
     débordent réellement à 390 px, et c'est pour eux qu'il existe). */
  exiger(
    releve.impression.debordementCadres === 0,
    `${intitule} : un cadre à défilement COUPE ${String(releve.impression.debordementCadres)} ` +
      `point(s) de contenu à l’impression — une phrase de droit tronquée sur du papier ` +
      `qui circule a l’air complète`,
  );
}

await navigateur.close();
serveur.kill();

console.log('-'.repeat(76));
console.log('  PDF : impression-fiche-huile-olive.pdf, impression-retractation.pdf, impression-cgv.pdf');

for (const anomalie of anomalies) {
  console.log(`   -> ${anomalie}`);
}

console.log(anomalies.length === 0 ? 'Conforme.' : `${String(anomalies.length)} anomalie(s).`);
console.log('');
process.exit(anomalies.length === 0 ? 0 : 1);
