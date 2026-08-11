/* LE GRAIN DE PAPIER COÛTE-T-IL DU CONTRASTE ? — mesure sur les PIXELS (C19).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE MESURE N'EST PAS UN CALCUL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fond de la page n'est plus un aplat : c'est une couleur, plus un lavis de
 * trois tons, plus un bruit de `feTurbulence` composé par-dessus. Les ratios de
 * contraste du projet ont tous été calculés entre deux JETONS — et aucun jeton
 * ne décrit le pixel réellement peint sous une ligne de texte.
 *
 * Deux outils sont aveugles à ce changement, et il faut le dire :
 *
 * - `axe-core` lit `background-color` par la cascade. Il verra `--color-coquille`
 *   et rendra le même verdict qu'hier, que le grain existe ou non. Son « 0
 *   violation » reste vrai pour ce qu'il mesure, et ne dit rien du grain.
 * - Lighthouse ne mesure pas le contraste au pixel non plus.
 *
 * Cet outil-ci ouvre donc l'image rendue et REGARDE. Il relève, dans des bandes
 * de fond sans texte, le pixel le plus SOMBRE — c'est le pire cas pour une
 * encre foncée, puisqu'un fond qui s'assombrit se rapproche d'elle — puis
 * recalcule les ratios des couples de texte du projet contre CE pixel-là.
 *
 * Emploi :  node preuves/c19/grain-contraste.mjs [--sortie <fichier.txt>]
 */
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright-core';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3000';

function argument(nom, defaut) {
  const rang = process.argv.indexOf(nom);
  return rang === -1 ? defaut : (process.argv[rang + 1] ?? defaut);
}

const sortie = argument('--sortie', 'preuves/c19/grain-contraste.txt');
const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

/** Luminance relative WCAG d'un canal sRGB 0-255. */
function canal(valeur) {
  const v = valeur / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, v, b]) {
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
}

function ratio(a, b) {
  const [clair, sombre] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
  return (luminance(clair) + 0.05) / (luminance(sombre) + 0.05);
}

function hexEnRvb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* LES COUPLES DE TEXTE DU PROJET, encres seules — ce sont eux que WCAG 1.4.3
   contraint. `--color-filet-fort` est absent volontairement : C12 l'a déclaré
   NON TEXTUEL (filets et bordures), son seuil est 3:1 et il ne vit pas sur la
   coquille. */
const ENCRES = [
  { nom: 'encre', hex: '#1c211a', seuil: 4.5 },
  { nom: 'encre douce', hex: '#4f5347', seuil: 4.5 },
  { nom: 'ocre (étiquettes)', hex: '#7a5714', seuil: 4.5 },
  { nom: 'bleu (chaîne du froid)', hex: '#1f4ea8', seuil: 4.5 },
];

/* LES PAGES ET LES BANDES DE FOND. Les ordonnées sont choisies dans des zones
   que la mise en page laisse vides à ces largeurs — le relevé imprime le nombre
   de pixels retenus, ce qui permet de voir tout de suite si une bande a attrapé
   du texte (elle serait alors beaucoup plus sombre, et on le saurait). */
const SONDES = [
  { chemin: '/', intitule: 'accueil (haut, lavis de verre)', y: 140 },
  { chemin: '/', intitule: 'accueil (milieu, coquille)', y: 900 },
  { chemin: '/boutique', intitule: 'rayon (milieu)', y: 700 },
  { chemin: '/conditions-generales-de-vente', intitule: 'CGV (bas, lavis de papier)', y: 2400 },
];

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

dire('');
dire('LE GRAIN DE PAPIER, MESURÉ SUR LES PIXELS RENDUS (1280 × 900, densité 1)');
dire('='.repeat(78));
dire('');

let fondLePlusSombre = [255, 255, 255];
let ouSombre = '';
let fondLePlusClair = [0, 0, 0];

for (const sonde of SONDES) {
  await page.goto(`${BASE}${sonde.chemin}`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  /* On lit une bande de dix pixels de haut, dans la marge gauche de la page,
     là où le corps de texte ne va jamais. `canvas` n'est pas disponible sur la
     page (politique de sécurité du contenu) : on passe par une capture. */
  const hauteurDocument = await page.evaluate(() => document.body.scrollHeight);
  const y = Math.min(sonde.y, hauteurDocument - 40);

  await page.evaluate((cible) => {
    window.scrollTo(0, cible);
  }, y);
  await page.waitForTimeout(400);

  /* LA BANDE EST PRISE À MI-FENÊTRE, ET C'EST UNE CORRECTION DE MESURE.
     La première rédaction lisait les vingt premiers pixels sous le haut de la
     fenêtre : elle y trouvait l'en-tête SCELLÉ, qui porte son propre aplat de
     verre — quatre sondes sur quatre rendaient exactement #f8f4ea et une
     amplitude de zéro. L'outil mesurait donc, avec application, une surface
     qui n'a jamais porté de grain. On lit maintenant à mi-hauteur, dans la
     gouttière gauche que le conteneur de page laisse libre à 1280 points. */
  const bande = await page.screenshot({ clip: { x: 4, y: 400, width: 24, height: 24 } });

  /* Décodage PNG minimal : on relit les pixels par le navigateur, qui sait le
     faire, plutôt que d'écrire un décodeur. */
  const pixels = await page.evaluate(async (donnees) => {
    const image = new Image();
    await new Promise((r) => {
      image.addEventListener('load', r);
      image.src = `data:image/png;base64,${donnees}`;
    });
    const toile = document.createElement('canvas');
    toile.width = image.width;
    toile.height = image.height;
    const contexte2d = toile.getContext('2d');
    contexte2d.drawImage(image, 0, 0);
    const brut = contexte2d.getImageData(0, 0, image.width, image.height).data;
    const liste = [];
    for (let i = 0; i < brut.length; i += 4) liste.push([brut[i], brut[i + 1], brut[i + 2]]);
    return liste;
  }, bande.toString('base64'));

  const luminances = pixels.map((p) => luminance(p));
  const minimum = pixels[luminances.indexOf(Math.min(...luminances))];
  const maximum = pixels[luminances.indexOf(Math.max(...luminances))];

  if (luminance(minimum) < luminance(fondLePlusSombre)) {
    fondLePlusSombre = minimum;
    ouSombre = sonde.intitule;
  }
  if (luminance(maximum) > luminance(fondLePlusClair)) {
    fondLePlusClair = maximum;
  }

  const hex = (p) => `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

  dire(
    `${sonde.intitule.padEnd(34)} ${String(pixels.length).padStart(4)} px lus — ` +
      `plus sombre ${hex(minimum)}, plus clair ${hex(maximum)}, ` +
      `amplitude ${((luminance(maximum) - luminance(minimum)) * 100).toFixed(2)} pt de luminance`,
  );

}

await navigateur.close();

const hex = (p) => `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

dire('');
dire(`FOND LE PLUS SOMBRE DE TOUT LE SITE : ${hex(fondLePlusSombre)} (${ouSombre})`);
dire(`FOND LE PLUS CLAIR                  : ${hex(fondLePlusClair)}`);
dire('');
dire('LES RATIOS RECALCULÉS CONTRE LE PIRE FOND RÉELLEMENT PEINT');
dire('-'.repeat(78));
dire('');
dire('encre                        jeton→coquille   pire pixel   seuil   marge');

const COQUILLE = hexEnRvb('#f2ece1');
let echec = 0;

for (const encre of ENCRES) {
  const rvb = hexEnRvb(encre.hex);
  const surJeton = ratio(rvb, COQUILLE);
  const surPire = ratio(rvb, fondLePlusSombre);
  const marge = surPire - encre.seuil;

  if (surPire < encre.seuil) echec += 1;

  dire(
    `${encre.nom.padEnd(28)} ${surJeton.toFixed(2).padStart(8)}   ` +
      `${surPire.toFixed(2).padStart(10)}   ${encre.seuil.toFixed(1).padStart(5)}   ` +
      `${marge >= 0 ? '+' : ''}${marge.toFixed(2)}`,
  );
}

dire('-'.repeat(78));
dire('');

if (echec === 0) {
  dire(`Les ${String(ENCRES.length)} encres tiennent AA contre le pire fond réellement peint.`);
} else {
  dire(`${String(echec)} encre(s) sous AA contre le pire fond réellement peint.`);
  process.exitCode = 1;
}

dire('');
writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');
console.log(`Relevé écrit dans ${sortie}`);
