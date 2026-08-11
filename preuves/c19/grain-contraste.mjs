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
import { execFileSync } from 'node:child_process';

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

/* LES COUPLES DE TEXTE DU PROJET, encres seules — ce sont eux que WCAG 1.4.3
   contraint. `--color-filet-fort` est absent volontairement : C12 l'a déclaré
   NON TEXTUEL (filets et bordures), son seuil est 3:1 et il ne vit pas sur la
   coquille.
   ═══════════════════════════════════════════════════════════════════════════
    LES ENCRES SONT NOMMÉES, PLUS JAMAIS RECOPIÉES — correction C22
   ═══════════════════════════════════════════════════════════════════════════
   Cette liste portait des valeurs hexadécimales ÉCRITES À LA MAIN. Elle a donc
   vieilli en silence : la quatrième écriture du fond (C19) a fait descendre
   `--color-ocre` de #7A5714 à #5B3E0C, et cette liste est restée sur l'ANCIENNE
   valeur. L'outil a continué de rendre un verdict — parfaitement calculé, sur
   une couleur que le site n'emploie plus nulle part. Il a fini par annoncer
   4,49 contre la pire veine du marbre, c'est-à-dire un défaut d'accessibilité
   IMAGINAIRE, tenu pour un arbitrage ouvert pendant toute la publication.
   L'encre réelle vaut 6,72 au même endroit.
   C'est le défaut que ce dépôt connaît sous son nom depuis C13 — *contrôler la
   propriété, pas son indice* —, retourné contre un outil de PREUVE : une sonde
   qui recopie ce qu'elle mesure ne mesure plus rien le jour où la source bouge.
   Les encres sont donc désignées par leur JETON, lu dans la page rendue au
   moment de la mesure. Une valeur qui change dans `globals.css` change ici
   toute seule, et un jeton disparu fait ÉCHOUER la sonde au lieu de la laisser
   mesurer du vide. */
const ENCRES = [
  { nom: 'encre', jeton: '--color-encre', seuil: 4.5 },
  { nom: 'encre douce', jeton: '--color-encre-douce', seuil: 4.5 },
  { nom: 'ocre (étiquettes)', jeton: '--color-ocre', seuil: 4.5 },
  { nom: 'bleu (chaîne du froid)', jeton: '--color-bleu', seuil: 4.5 },
];

/**
 * LIT LES JETONS DANS LA PAGE RENDUE, et refuse de deviner.
 *
 * La sonde pose `color: var(--jeton)` sur un élément neuf dont la couleur a
 * d'abord été forcée à une SENTINELLE improbable. Si le jeton n'existe pas, la
 * déclaration est invalide à l'analyse et la sentinelle reste : on le voit, et
 * on s'arrête. Sans elle, un jeton renommé rendrait la couleur héritée — du
 * noir, la plus contrastée des encres — et la sonde passerait au vert en
 * mesurant une couleur que personne n'affiche.
 */
async function lireJetons(page, jetons) {
  const lus = await page.evaluate((noms) => {
    /* UN ÉLÉMENT NEUF PAR JETON, et c'est une correction payée à l'écriture :
       en réutilisant une seule sonde et en lui réassignant sa couleur, les
       quatre lectures rendaient la PREMIÈRE valeur, quatre fois. Une seule
       déclaration `color` par élément, lue une seule fois, ne peut pas mentir. */
    const SENTINELLE = 'rgb(1, 2, 3)';

    return noms.map((nom) => {
      const sonde = document.createElement('span');
      sonde.style.position = 'absolute';
      sonde.style.visibility = 'hidden';
      sonde.style.color = SENTINELLE;
      sonde.style.color = `var(${nom})`;
      sonde.textContent = '.';
      document.body.append(sonde);

      const calcule = getComputedStyle(sonde).color;
      sonde.remove();

      return { nom, calcule };
    });
  }, jetons);

  return lus.map(({ nom, calcule }) => {
    const nombres = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(calcule);

    if (nombres === null) {
      throw new Error(`Le jeton ${nom} ne rend pas une couleur lisible : « ${calcule} »`);
    }

    const rvb = [Number(nombres[1]), Number(nombres[2]), Number(nombres[3])];

    if (rvb[0] === 1 && rvb[1] === 2 && rvb[2] === 3) {
      throw new Error(`Le jeton ${nom} n'existe pas dans la page — sonde arrêtée.`);
    }

    return { nom, rvb };
  });
}

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

/* LES ENCRES SONT LUES AVANT TOUTE MESURE — si un jeton manque, rien ne sert
   de relever des pixels : la sonde s'arrête ici plutôt que de rendre un
   verdict sur une couleur qu'elle aurait inventée. */
await page.goto(`${BASE}/`, { waitUntil: 'load' });
const ENCRES_LUES = await lireJetons(
  page,
  ENCRES.map((encre) => encre.jeton),
);
/* La coquille est lue elle aussi : c'est le fond de référence du système, et
   le recopier ici rouvrirait exactement la dérive que cette passe corrige. */
const [{ rvb: COQUILLE }] = await lireJetons(page, ['--color-coquille']);

/* LES QUATRE ENCRES SONT QUATRE COULEURS DIFFÉRENTES — la seule chose qu'on
   sache d'elles sans les recopier, et elle suffit à démasquer une lecture
   défaillante. La première rédaction de `lireJetons` rendait quatre fois la
   même valeur ; ce contrôle l'a arrêtée avant qu'elle ne rende un vert. */
const distinctes = new Set(ENCRES_LUES.map(({ rvb }) => rvb.join(',')));

if (distinctes.size !== ENCRES.length) {
  throw new Error(
    `Lecture des jetons défaillante : ${String(ENCRES.length)} encres demandées, ` +
      `${String(distinctes.size)} couleur(s) distincte(s) lue(s).`,
  );
}

/* LA PROVENANCE EN TÊTE DU RELEVÉ — « chaque relevé porte le commit qu'il a
   mesuré » est une règle écrite de ce dépôt (C20), et elle manquait ici : deux
   relevés de contraste pris sur deux états du code étaient indiscernables. */
const commit = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
  } catch {
    return 'inconnu';
  }
};

const JOUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  dateStyle: 'long',
  timeStyle: 'short',
}).format(new Date());

dire('');
dire('LE GRAIN DE PAPIER, MESURÉ SUR LES PIXELS RENDUS (1280 × 900, densité 1)');
dire('='.repeat(78));
dire('');
dire(`Mesuré le ${JOUR} · commit ${commit()} · adresse ${BASE}`);
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
dire('encre                        valeur lue   jeton→coquille   pire pixel   seuil   marge');

let echec = 0;

for (const [rang, encre] of ENCRES.entries()) {
  const rvb = ENCRES_LUES[rang].rvb;
  const surJeton = ratio(rvb, COQUILLE);
  const surPire = ratio(rvb, fondLePlusSombre);
  const marge = surPire - encre.seuil;

  if (surPire < encre.seuil) echec += 1;

  dire(
    `${encre.nom.padEnd(28)} ${hex(rvb).padEnd(12)} ${surJeton.toFixed(2).padStart(8)}   ` +
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
