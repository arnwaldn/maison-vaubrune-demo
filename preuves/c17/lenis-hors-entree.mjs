#!/usr/bin/env node
/**
 * LENIS EST-IL HORS DU GRAPHE D'ENTRÉE ? — la preuve, pas la parole.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CE CONTRÔLE VÉRIFIE, ET CE QU'IL A FAILLI DIRE À TORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La décision D37 exige que le défilement adouci soit un import DYNAMIQUE :
 * jamais dans le premier chargement, jamais téléchargé sous mouvement réduit.
 * La première affirmation se prouve dans `.next/static`, la seconde au réseau
 * (`tests/e2e/mouvement.spec.ts`). Celui-ci fait la première.
 *
 * PREMIÈRE RÉDACTION, PREMIER FAUX POSITIF, ET IL EST INSTRUCTIF : en cherchant
 * la chaîne « lenis » dans TOUS les fichiers d'entrée, le contrôle a rendu
 * ÉCHEC — sur la feuille de style. `globals.css` contient les deux règles
 * `html.lenis` recopiées de la bibliothèque, et une règle CSS n'est pas du code
 * chargé : c'est un sélecteur qui ne s'applique que si la classe existe, donc
 * seulement si la bibliothèque a été chargée par ailleurs.
 *
 * Le contrôle regarde donc les morceaux JAVASCRIPT, et il cherche un marqueur
 * qui ne peut pas venir d'ailleurs : `lenis-smooth`, la classe que la
 * bibliothèque pose sur la racine. La leçon est la même qu'en C16 avec la
 * preuve rouge qui ne rougissait pas — un contrôle qui échoue pour la mauvaise
 * raison ne vaut pas mieux qu'un contrôle qui passe pour la mauvaise raison.
 */

import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARQUEUR = 'lenis-smooth';
const lignes = [];

const pages = JSON.parse(
  readFileSync(join('.next', 'app-build-manifest.json'), 'utf8'),
).pages;

/** Tous les fichiers que le manifeste déclare, quelle que soit la route. */
const entree = new Set();

for (const morceaux of Object.values(pages)) {
  for (const morceau of morceaux) {
    entree.add(morceau);
  }
}

const entreeJs = [...entree].filter((morceau) => morceau.endsWith('.js'));

lignes.push("LENIS HORS DU GRAPHE D'ENTRÉE — preuve .next/static (tranche C17)");
lignes.push('');
lignes.push(
  `1. Morceaux déclarés par app-build-manifest.json : ${String(entree.size)} ` +
    `(dont ${String(entreeJs.length)} de JavaScript)`,
);

const coupables = entreeJs.filter((morceau) =>
  readFileSync(join('.next', morceau), 'utf8').includes(MARQUEUR),
);

lignes.push(
  `2. Morceaux d'entrée portant le marqueur « ${MARQUEUR} » : ` +
    `${String(coupables.length)} ${coupables.length === 0 ? '(aucun)' : JSON.stringify(coupables)}`,
);

/* La feuille de style est citée exprès : elle CONTIENT le mot « lenis » et ce
   n'est pas une anomalie. Le dire ici évite qu'un lecteur pressé refasse le
   faux positif de la première rédaction. */
const feuilles = [...entree].filter((morceau) => morceau.endsWith('.css'));
const feuillesAvecLenis = feuilles.filter((morceau) =>
  readFileSync(join('.next', morceau), 'utf8').includes('.lenis'),
);

lignes.push(
  `3. Feuilles d'entrée citant le sélecteur « .lenis » : ` +
    `${String(feuillesAvecLenis.length)} — ATTENDU, ce sont les deux règles de ` +
    `globals.css, qui ne s'appliquent que si la classe existe.`,
);
lignes.push('');
lignes.push('4. Le morceau qui PORTE réellement la bibliothèque :');

const porteurs = readdirSync(join('.next', 'static', 'chunks'))
  .filter((nom) => nom.endsWith('.js'))
  .filter((nom) =>
    readFileSync(join('.next', 'static', 'chunks', nom), 'utf8').includes(MARQUEUR),
  );

let porteurDansEntree = false;

for (const nom of porteurs) {
  const octets = readFileSync(join('.next', 'static', 'chunks', nom));
  const declare = entree.has(`static/chunks/${nom}`);

  porteurDansEntree ||= declare;

  lignes.push(
    `   ${nom} — ${String(octets.byteLength)} octets bruts, ` +
      `${String(gzipSync(octets, { level: 9 }).byteLength)} gzip`,
  );
  lignes.push(`   déclaré au manifeste d'entrée ? ${declare ? 'OUI (ÉCHEC)' : 'NON'}`);
}

const reussi = coupables.length === 0 && porteurs.length === 1 && !porteurDansEntree;

lignes.push('');
lignes.push(
  reussi
    ? 'VERDICT : Lenis vit dans UN morceau à la demande, qu\'aucune route ne ' +
        'déclare au premier chargement.'
    : 'VERDICT : ÉCHEC — la bibliothèque est entrée dans le premier chargement.',
);

const texte = `${lignes.join('\n')}\n`;

process.stdout.write(texte);
writeFileSync(join('preuves', 'c17', 'lenis-hors-entree.txt'), texte, 'utf8');

process.exitCode = reussi ? 0 : 1;
