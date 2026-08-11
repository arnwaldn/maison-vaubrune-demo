/* LA SIGNATURE DE L'ACCUEIL — CE QU'ON VOIT, IMAGE PAR IMAGE (C19).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CET OUTIL EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le client a jugé le geste de C18 « beaucoup trop discret », et l'orchestrateur
 * avait pris soin de vérifier D'ABORD qu'il fonctionnait — il fonctionnait. Le
 * défaut n'était donc pas dans le code mais dans une INTENSITÉ, c'est-à-dire
 * dans quelque chose qu'aucune garde ne mesure et qu'aucun test ne fixe.
 *
 * Ce qui se juge à l'œil doit au moins se MONTRER : cet outil échantillonne la
 * séquence d'ouverture à froid et en tire deux choses.
 *
 * 1. UN RELEVÉ CHIFFRÉ — pour chaque ligne, l'échelle horizontale du bloc et
 *    l'opacité du texte, relevées à intervalles réguliers. C'est la preuve que
 *    le balayage a lieu, qu'il couvre, qu'il se retire, et que le texte ne
 *    devient jamais visible AVANT d'être couvert (le seul état qui dégraderait
 *    le contraste).
 * 2. QUATRE CAPTURES ÉCHELONNÉES — la pièce que le client regarde.
 *
 * L'échantillonneur est posé AVANT le premier script de la page : la séquence
 * part au premier calcul de style, et une lecture faite après `goto` ne verrait
 * que l'état final — c'est-à-dire un site parfaitement immobile.
 *
 * Emploi :  node preuves/c19/signature-balayage.mjs [--sortie <fichier.txt>]
 */
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright-core';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3000';

function argument(nom, defaut) {
  const rang = process.argv.indexOf(nom);
  return rang === -1 ? defaut : (process.argv[rang + 1] ?? defaut);
}

const sortie = argument('--sortie', 'preuves/c19/signature-balayage.txt');
const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await contexte.newPage();

/* L'ÉCHANTILLONNEUR. Il lit l'échelle horizontale du pseudo-élément — que
   `getComputedStyle` sait rendre avec son second argument — et l'opacité du
   texte, à chaque image, pour les quatre lignes. */
await page.addInitScript(() => {
  const fenetre = window;
  fenetre.__serie = [];
  const depart = performance.now();

  const echantillonner = () => {
    const enveloppes = [...document.querySelectorAll('[data-signature="ligne"]')];

    if (enveloppes.length > 0) {
      fenetre.__serie.push({
        ms: Math.round(performance.now() - depart),
        blocs: enveloppes.map((noeud) => {
          const matrice = getComputedStyle(noeud, '::after').transform;
          if (matrice === 'none') return 1;
          /* L'EXPOSANT EST OBLIGATOIRE DANS CETTE EXPRESSION, et c'est une
             leçon payée : sans lui, `matrix(3.491e-05, …)` — l'écriture que
             Chrome donne à une échelle infinitésimale en fin de course — se
             lisait « 3,491 ». Le relevé annonçait alors un bloc à trois fois
             et demie sa largeur là où il n'en restait rien. Le rendu était
             juste ; c'est l'instrument qui mentait. */
          const nombres = matrice.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
          return nombres === null ? 1 : Number(Number(nombres[0]).toFixed(4));
        }),
        textes: enveloppes.map((noeud) => {
          const texte = noeud.querySelector('[data-signature="texte"]');
          return texte === null
            ? 1
            : Number(Number(getComputedStyle(texte).opacity).toFixed(3));
        }),
      });
    }

    if (performance.now() - depart < 2600) requestAnimationFrame(echantillonner);
  };

  requestAnimationFrame(echantillonner);
});

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

/* LES CAPTURES, PENDANT QUE LA SÉQUENCE JOUE. Quatre instants choisis sur la
   mécanique et non au hasard : le bloc qui entre, le bloc qui couvre, le bloc
   qui se retire, la page posée. */
const instants = [
  [260, 'le bloc entre'],
  [520, 'le bloc couvre'],
  [820, 'le bloc se retire'],
  [2200, 'la page est posee'],
];

let precedent = 0;
for (const [ms, intitule] of instants) {
  await page.waitForTimeout(ms - precedent);
  precedent = ms;
  const nom = `preuves/c19/signature-${String(ms).padStart(4, '0')}ms.png`;
  await page.screenshot({ path: nom, clip: { x: 0, y: 0, width: 1440, height: 760 } });
  dire(`   capture ${String(ms).padStart(4)} ms  ${intitule}  ->  ${nom}`);
}

await page.waitForTimeout(600);

const serie = await page.evaluate(() => window.__serie);

/* LES INTITULÉS SONT LUS DANS LA PAGE, jamais écrits ici. Le monument s'est
   scindé en deux mots au cours de cette tranche : une liste tenue à la main
   aurait décalé toutes les colonnes du relevé sans qu'aucune ligne ne paraisse
   fautive. */
const intitules = await page.evaluate(() =>
  [...document.querySelectorAll('[data-signature="ligne"]')].map((noeud) =>
    (noeud.textContent ?? '').trim().slice(0, 9).toLowerCase(),
  ),
);

await navigateur.close();

/* ------------------------------------------------------------------------- */

const entete = intitules.map((nom) => nom.padStart(7)).join('  ');

dire('');
dire(`LA SÉQUENCE, ÉCHANTILLONNÉE À FROID (1440 × 900, densité 2) — ${String(intitules.length)} lignes`);
dire('-'.repeat(96));
dire('');
dire('    ms  | bloc : échelle horizontale                | texte : opacité');
dire(`       | ${entete}  | ${entete}`);
dire('-'.repeat(96));

for (const point of serie) {
  if (point.ms % 100 > 20) continue;
  const blocs = point.blocs.map((v) => String(v).padStart(7)).join('  ');
  const textes = point.textes.map((v) => String(v).padStart(7)).join('  ');
  dire(`  ${String(point.ms).padStart(4)}  | ${blocs}  | ${textes}`);
}

dire('-'.repeat(96));
dire('');

/* LES TROIS AFFIRMATIONS QUE LE RELEVÉ DOIT SOUTENIR. */
for (const [rang, nom] of intitules.entries()) {
  const echelles = serie.map((p) => p.blocs[rang]);
  const opacites = serie.map((p) => p.textes[rang]);

  const maximum = Math.max(...echelles);
  const finalEchelle = echelles.at(-1);
  const finalOpacite = opacites.at(-1);

  /* L'instant où le texte devient visible, et celui où le bloc couvre tout. */
  const versVisible = serie.findIndex((p) => p.textes[rang] > 0.5);
  const versCouvert = serie.findIndex((p) => p.blocs[rang] > 0.99);

  dire(`${nom.padEnd(10)} bloc max ${String(maximum).padStart(5)} ` +
    `-> ${String(finalEchelle).padStart(5)} en fin ; ` +
    `texte visible à ${versVisible === -1 ? '—' : `${String(serie[versVisible].ms)} ms`}, ` +
    `bloc couvrant dès ${versCouvert === -1 ? '—' : `${String(serie[versCouvert].ms)} ms`} ; ` +
    `opacité finale ${String(finalOpacite)}`);
}

dire('');
dire('CE QUE CES TROIS COLONNES DOIVENT DIRE :');
dire('  1. le bloc atteint 1 (il couvre) puis revient à 0 (il s’est retiré) ;');
dire('  2. le texte devient visible APRÈS que le bloc couvre — jamais avant,');
dire('     sans quoi de l’encre passerait sur de l’encre pendant le balayage ;');
dire('  3. toutes les opacités finales valent 1.');
dire('');

writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');
console.log(`\nRelevé écrit dans ${sortie}`);
