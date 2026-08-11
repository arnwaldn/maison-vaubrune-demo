#!/usr/bin/env node
/**
 * LE PLAFOND DE FEUILLE DE STYLE — 12 Ko gzip, décision D36.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE GARDE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La décision D36 fixe cinq plafonds nouveaux pour la refonte. Quatre se
 * mesurent sur des images ou sur un parcours de navigateur ; le cinquième —
 * « CSS ≤ 12 Ko gzip » — se mesure sur un fichier, et c'est justement celui
 * dont D36 dit à quoi il sert : empêcher « qu'une refonte visuelle se paie en
 * feuilles de style plutôt qu'en scripts, et passe donc sous le radar du
 * budget JS ».
 *
 * C'est un angle mort réel. La colonne « First Load JS » de `next build`, qui
 * tient le budget public depuis C6, ne compte PAS le CSS. Une refonte peut
 * doubler le poids de sa feuille de style sans qu'aucun chiffre publié ne
 * bouge. Cette garde ferme ce trou, et elle le ferme là où le budget se
 * dépasse : à la construction, pas à la relecture.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI EST MESURÉ, ET POURQUOI CE CHOIX EST LE STRICT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le TOTAL des feuilles écrites dans `.next/static/css`, chacune compressée en
 * gzip niveau 9.
 *
 * Trois décisions de méthode, écrites plutôt que sous-entendues :
 *
 * 1. LE TOTAL, ET NON LE PLUS GROS FICHIER. Next n'émet aujourd'hui qu'une
 *    seule feuille, partagée par les quarante-six routes : total et poids par
 *    page sont donc le même nombre. Le jour où l'empaqueteur découperait par
 *    route, le total resterait un MAJORANT de ce qu'une page télécharge —
 *    jamais un minorant. Un plafond doit se tromper dans ce sens-là.
 * 2. GZIP ET NON BROTLI, bien que Vercel serve du brotli. Brotli rendrait un
 *    nombre PLUS PETIT sur le même fichier : mesurer en gzip, c'est mesurer
 *    plus sévèrement que la réalité servie. Le plafond de D36 est écrit « Ko
 *    gzip », et la garde le lit à la lettre.
 * 3. NIVEAU 9, c'est-à-dire le meilleur taux. Un niveau plus bas gonflerait le
 *    chiffre pour une raison qui ne regarde pas le livrable — la garde
 *    échouerait sur le réglage d'un compresseur au lieu d'échouer sur une
 *    feuille de style trop lourde.
 *
 * 1 Ko = 1024 octets, comme dans `scripts/verifier-images.mjs`. Le plafond de
 * 12 Ko vaut donc 12 288 octets.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PLACE DANS LA CHAÎNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `npm run controle` l'enchaîne APRÈS `build` et avant `test:parcours` — elle
 * mesure un livrable, elle ne peut donc pas passer avant qu'il existe. C'est
 * la seule garde du projet dans ce cas, et c'est pour cela qu'elle refuse de
 * s'exécuter sans construction plutôt que de « passer en le disant » : une
 * garde de poids qui rend vert sur un dossier vide est un mensonge, et il
 * serait invisible.
 *
 * Usage : `node scripts/verifier-poids-css.mjs`
 */

import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const TEMOIN_DE_CONSTRUCTION = join(RACINE, '.next', 'BUILD_ID');
const DOSSIER_CSS = join(RACINE, '.next', 'static', 'css');

/** Le plafond de D36, en kibioctets. */
const PLAFOND_KO = 12;
const PLAFOND_OCTETS = PLAFOND_KO * 1024;

let echecs = 0;

function noter(ligne) {
  console.log(`  ${ligne}`);
}

function exiger(condition, message) {
  if (condition) {
    noter(`OK   ${message}`);
    return;
  }

  echecs += 1;
  noter(`ÉCHEC ${message}`);
}

/** Toutes les feuilles écrites sous `.next/static/css`, sous-dossiers compris. */
function feuilles(dossier) {
  const trouvees = [];

  for (const entree of readdirSync(dossier)) {
    const absolu = join(dossier, entree);

    if (statSync(absolu).isDirectory()) {
      trouvees.push(...feuilles(absolu));
      continue;
    }

    if (entree.endsWith('.css')) {
      trouvees.push(absolu);
    }
  }

  return trouvees;
}

console.log('');
console.log('Poids de la feuille de style — plafond D36');
console.log('-'.repeat(72));

if (!existsSync(TEMOIN_DE_CONSTRUCTION)) {
  console.log('');
  console.log('  ÉCHEC — aucune construction dans .next/ : il n’y a rien à peser.');
  console.log('  Cette garde mesure un LIVRABLE. Lancez « npm run build » d’abord,');
  console.log('  ou « npm run controle », qui construit une ligne plus haut.');
  console.log('');
  process.exit(1);
}

if (!existsSync(DOSSIER_CSS)) {
  console.log('');
  console.log('  ÉCHEC — .next/static/css est absent alors que la construction existe.');
  console.log('  Une construction sans feuille de style n’est pas ce projet : le');
  console.log('  fichier globals.css est importé par la mise en page racine.');
  console.log('');
  process.exit(1);
}

const fichiers = feuilles(DOSSIER_CSS);

exiger(fichiers.length > 0, `au moins une feuille produite (${String(fichiers.length)} trouvée(s))`);

let total = 0;

for (const absolu of fichiers) {
  const brut = readFileSync(absolu);
  const compresse = gzipSync(brut, { level: 9 }).length;
  total += compresse;

  noter(
    `     ${absolu.slice(RACINE.length).replaceAll('\\', '/')} — ` +
      `${(brut.length / 1024).toFixed(2)} Ko brut, ${(compresse / 1024).toFixed(2)} Ko gzip`,
  );
}

exiger(
  total <= PLAFOND_OCTETS,
  `total gzip ${(total / 1024).toFixed(2)} Ko pour un plafond de ${String(PLAFOND_KO)} Ko ` +
    `(${((total / PLAFOND_OCTETS) * 100).toFixed(0)} % du budget)`,
);

console.log('-'.repeat(72));

if (echecs > 0) {
  console.log(`${String(echecs)} contrôle(s) en échec.`);
  console.log('');
  process.exit(1);
}

console.log('2 contrôles, tous verts.');
console.log('');
