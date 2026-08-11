#!/usr/bin/env node
/**
 * LE FIRST LOAD, À L'OCTET — parce que « 106 kB » ne prouve pas « +2,5 Ko max ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE PROBLÈME QUE CET OUTIL RÉSOUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le tableau de `next build` arrondit à trois chiffres significatifs : une page
 * annoncée « 106 kB » l'est encore après avoir gagné neuf cents octets, et elle
 * l'était déjà avant en avoir perdu six cents. Le budget de la tranche C17 est
 * de DEUX KILOOCTETS ET DEMI sur toutes les routes — c'est-à-dire une grandeur
 * que la colonne du tableau ne sait pas distinguer de zéro sur la moitié de sa
 * plage.
 *
 * C13 avait résolu la même question en RECONSTRUISANT le sommet de la tranche
 * précédente dans le même arbre, puis en comparant les deux tableaux. La méthode
 * est juste et coûte deux constructions complètes ; celle-ci lit ce que la
 * construction courante a déjà écrit, et donne la même précision pour rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL LIT, ET POURQUOI C'EST LA BONNE SOURCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `.next/app-build-manifest.json` associe à chaque route la LISTE EXACTE des
 * morceaux JavaScript que le navigateur télécharge pour l'afficher — c'est
 * précisément la définition du « First Load JS ». On mesure chaque fichier une
 * fois, on somme, et on gzippe au niveau 9 comme `verifier-poids-css.mjs`.
 *
 * PIÈGE PAYÉ À L'ÉCRITURE, ET IL VAUT D'ÊTRE ÉCRIT : les entrées `…/page` NE
 * CONTIENNENT PAS les morceaux des MISES EN PAGE. Le manifeste range celles-ci
 * sous leurs propres clefs (`/layout`, `/gestion/layout`), et le navigateur
 * charge évidemment les deux. La première rédaction de cet outil ne sommait que
 * les pages : elle a annoncé « +20 octets » sur les vingt-deux routes d'une
 * tranche qui venait d'ajouter un fournisseur, un contrôleur de révélation et
 * une transition — c'est-à-dire exactement le chiffre qu'on espérait lire, ce
 * qui est la meilleure raison de s'en méfier. Tout le code client de C17 vit
 * dans la mise en page racine (décision D26 : une seule frontière cliente), donc
 * dans le seul morceau que le relevé ne regardait pas.
 *
 * On réunit donc, pour chaque route, le morceau de la page ET ceux de toutes
 * les mises en page qui la couvrent.
 *
 * Les deux chiffres sont publiés : le BRUT (ce que la machine parse, donc le
 * coût processeur) et le GZIP (ce que le réseau porte). Le budget de D36
 * s'exprime en gzip ; le tableau de Next, lui, publie du brut — les deux
 * colonnes permettent de rattacher ce relevé à l'un comme à l'autre sans
 * conversion de tête.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EMPLOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   node preuves/c17/first-load-precis.mjs                 → relevé à l'écran
 *   node preuves/c17/first-load-precis.mjs --sortie f.txt  → et dans un fichier
 *   node preuves/c17/first-load-precis.mjs --contre a.json → écart contre un relevé
 *   node preuves/c17/first-load-precis.mjs --json f.json   → relevé rejouable
 *
 * Le format `--json` existe pour que l'écart se calcule d'une commande plutôt
 * qu'à l'œil sur deux colonnes de nombres : c'est la leçon de C16, où un PDF
 * écrasé avait failli faire passer un défaut de neuf tranches pour une nouveauté.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = process.cwd();
const MANIFESTE = join(RACINE, '.next', 'app-build-manifest.json');

/** Un argument nommé de la ligne de commande, ou `null`. */
function option(nom) {
  const position = process.argv.indexOf(`--${nom}`);

  return position === -1 ? null : (process.argv[position + 1] ?? null);
}

/**
 * La taille d'un morceau, mesurée UNE FOIS et retenue.
 *
 * Les morceaux partagés — les 103 Ko de socle — apparaissent dans les vingt-deux
 * listes de routes. Les relire vingt-deux fois coûterait vingt-deux lectures de
 * disque et vingt-deux compressions pour un résultat identique.
 */
const cache = new Map();

function mesurer(chemin) {
  const connu = cache.get(chemin);

  if (connu !== undefined) {
    return connu;
  }

  const octets = readFileSync(join(RACINE, '.next', chemin));
  const taille = { brut: octets.byteLength, gzip: gzipSync(octets, { level: 9 }).byteLength };

  cache.set(chemin, taille);

  return taille;
}

/**
 * La route telle qu'un visiteur l'écrit, depuis la clef du manifeste.
 *
 * `/boutique/[produit]/page` → `/boutique/[produit]`. Les entrées qui ne sont
 * pas des pages (les `route.ts`, la mise en page racine seule) sont écartées :
 * elles n'ont pas de First Load, personne ne les charge dans un navigateur.
 */
function routeDepuisClef(clef) {
  if (!clef.endsWith('/page')) {
    return null;
  }

  const chemin = clef.slice(0, -'/page'.length);

  return chemin === '' ? '/' : chemin;
}

/**
 * Les clefs de mise en page qui couvrent une route.
 *
 * `/boutique/[produit]` est couverte par `/layout` (la racine) et le serait par
 * `/boutique/layout` s'il existait. On remonte donc tous les préfixes du chemin,
 * la racine comprise.
 */
function clefsDeMiseEnPage(route) {
  const segments = route === '/' ? [] : route.slice(1).split('/');
  const clefs = ['/layout'];

  let prefixe = '';

  for (const segment of segments) {
    prefixe += `/${segment}`;
    clefs.push(`${prefixe}/layout`);
  }

  return clefs;
}

const pages = JSON.parse(readFileSync(MANIFESTE, 'utf8')).pages;
const releve = {};

for (const [clef, morceauxDeLaPage] of Object.entries(pages)) {
  const route = routeDepuisClef(clef);

  if (route === null) {
    continue;
  }

  /* Un ensemble, parce que les mises en page et la page PARTAGENT des morceaux
     (le socle React, le runtime). Les compter deux fois gonflerait le relevé
     d'une centaine de kilooctets et le rendrait incomparable au tableau de
     `next build`, qui dédoublonne. */
  const morceaux = new Set(morceauxDeLaPage);

  for (const clefDeMiseEnPage of clefsDeMiseEnPage(route)) {
    for (const morceau of pages[clefDeMiseEnPage] ?? []) {
      morceaux.add(morceau);
    }
  }

  let brut = 0;
  let gzip = 0;

  for (const morceau of morceaux) {
    const taille = mesurer(morceau);

    brut += taille.brut;
    gzip += taille.gzip;
  }

  releve[route] = { brut, gzip, morceaux: morceaux.size };
}

/* -------------------------------------------------------------------------- */
/* Le rendu                                                                    */
/* -------------------------------------------------------------------------- */

const ko = (octets) => (octets / 1024).toFixed(2).padStart(8);
const signe = (octets) => `${octets >= 0 ? '+' : '−'}${(Math.abs(octets) / 1024).toFixed(3)}`;

const contre = option('contre');
const reference = contre === null ? null : JSON.parse(readFileSync(contre, 'utf8'));

const lignes = [];

lignes.push('FIRST LOAD JS, À L\'OCTET — somme des morceaux d\'entrée par route');
lignes.push(`Source : .next/app-build-manifest.json (${String(Object.keys(releve).length)} routes)`);
lignes.push('');

if (reference === null) {
  lignes.push('route                                    brut Ko   gzip Ko   morceaux');
  lignes.push('─'.repeat(72));

  for (const route of Object.keys(releve).sort()) {
    const { brut, gzip, morceaux } = releve[route];

    lignes.push(`${route.padEnd(38)}${ko(brut)}  ${ko(gzip)}   ${String(morceaux).padStart(4)}`);
  }
} else {
  lignes.push('route                                   gzip Ko    écart Ko   verdict');
  lignes.push('─'.repeat(76));

  let pire = { route: '(aucune)', ecart: Number.NEGATIVE_INFINITY };

  for (const route of Object.keys(releve).sort()) {
    const apres = releve[route].gzip;
    const avant = reference[route]?.gzip;

    if (avant === undefined) {
      lignes.push(`${route.padEnd(38)}${ko(apres)}   (route neuve)`);
      continue;
    }

    const ecart = apres - avant;

    if (ecart > pire.ecart) {
      pire = { route, ecart };
    }

    lignes.push(
      `${route.padEnd(38)}${ko(apres)}   ${signe(ecart).padStart(9)}   ${
        ecart <= 2560 ? 'dans le budget' : 'HORS BUDGET'
      }`,
    );
  }

  lignes.push('');
  lignes.push(
    `PIRE ÉCART : ${pire.route} — ${signe(pire.ecart)} Ko gzip ` +
      `(budget C17 : +2,50 Ko, soit 2560 octets)`,
  );
  lignes.push(pire.ecart <= 2560 ? 'VERDICT : budget TENU.' : 'VERDICT : budget DÉPASSÉ.');
}

const texte = `${lignes.join('\n')}\n`;

process.stdout.write(texte);

const sortie = option('sortie');

if (sortie !== null) {
  /* `--sortie` ÉCRIT UN TABLEAU DE TEXTE, ET REFUSE DE MENTIR SUR SA NATURE.
     C18 lui a passé deux noms en `.json` : les deux relevés versionnés de la
     tranche portaient donc une extension qu'aucun analyseur ne pouvait lire, et
     personne ne s'en est aperçu avant C19 — un fichier qu'on ne relit pas ment
     tranquillement. `--json` existe et rend, lui, du JSON rejouable ; le trou
     n'était pas dans l'outil mais dans le fait qu'il acceptait tout. */
  if (sortie.toLowerCase().endsWith('.json')) {
    console.error('');
    console.error(`  ${sortie} : --sortie écrit un TABLEAU DE TEXTE, pas du JSON.`);
    console.error('  Employez une extension .txt, ou --json pour un relevé rejouable.');
    console.error('');
    process.exit(1);
  }

  writeFileSync(sortie, texte, 'utf8');
}

const json = option('json');

if (json !== null) {
  writeFileSync(json, `${JSON.stringify(releve, null, 1)}\n`, 'utf8');
}
