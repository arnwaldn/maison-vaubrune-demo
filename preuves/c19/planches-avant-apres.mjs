/**
 * LES PLANCHES AVANT / APRÈS — la pièce du verdict client.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ELLE MONTRE, ET POURQUOI ELLE EST COMPARABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux jeux de vingt-huit captures, SEPT pages × QUATRE formats :
 *
 *   AVANT — `preuves/avant-refonte/`, constitué en C11 (06/08) sur la
 *           construction de production d'avant la refonte, c'est-à-dire l'état
 *           encore EN LIGNE aujourd'hui.
 *   APRÈS — `preuves/c19/captures-apres/`, constitué cette nuit sur la
 *           construction fraîche du sommet de la branche.
 *
 * Les deux jeux sont comparables parce qu'ils sont produits par LE MÊME script
 * (`preuves/captures.mjs`), aux mêmes formats, sur les mêmes sept pages, et
 * qu'AUCUNE COMMANDE N'Y EST PASSÉE : la campagne capture le jeu d'essai à
 * dates figées (décision C6), donc les vingt-huit pièces sont reproductibles à
 * l'octet près. C'est la correction de C11 — huit captures sur vingt-huit
 * divergeaient d'un tirage à l'autre tant qu'une vraie commande était passée,
 * et un jeu de référence dont un tiers bouge tout seul ne compare rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE LA PAGE PRODUITE NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle ne redimensionne aucune image et n'en fabrique aucune : elle POINTE les
 * fichiers par des chemins RELATIFS, pour qu'elle s'ouvre d'un double-clic
 * depuis le dépôt, sans serveur, et qu'elle continue de marcher si le dossier
 * est déplacé en entier. Aucune ressource extérieure, aucune police
 * téléchargée : ce qui est jugé doit être visible hors ligne.
 *
 * Le balayage aligne les DEUX HAUTS DE PAGE. Les deux états n'ont pas la même
 * hauteur (la refonte allonge certaines pages), et prétendre superposer des
 * pages de hauteurs différentes sur toute leur longueur serait un trucage :
 * la vue côte à côte reste la vue de référence, le balayage sert au premier
 * écran, là où les hauteurs coïncident.
 *
 * Usage : node preuves/c19/planches-avant-apres.mjs
 *         [--avant <dossier>] [--apres <dossier>] [--sortie <fichier>]
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const ICI = fileURLToPath(new URL('.', import.meta.url));
const RACINE = fileURLToPath(new URL('../..', import.meta.url));

function option(nom, defaut) {
  const rang = process.argv.indexOf(`--${nom}`);

  if (rang === -1) {
    return defaut;
  }

  const valeur = process.argv[rang + 1];

  if (valeur === undefined || valeur.startsWith('--')) {
    throw new Error(`--${nom} attend une valeur`);
  }

  return valeur;
}

const DOSSIER_AVANT = option('avant', join(RACINE, 'preuves', 'avant-refonte'));
const DOSSIER_APRES = option('apres', join(ICI, 'captures-apres'));
const SORTIE = option('sortie', join(ICI, 'planches-avant-apres.html'));

/**
 * LES SEPT PAGES, dans l'ordre de la campagne — qui est aussi l'ordre d'un
 * parcours d'achat, et non l'ordre alphabétique. On regarde une boutique comme
 * on l'utilise.
 */
const PAGES = [
  {
    fichier: 'accueil',
    titre: 'Accueil',
    adresse: '/',
    regard:
      'Le héros, le monument « Maison Vaubrune », l’entrée du titre et le fond. C’est la page qui porte la refonte.',
  },
  {
    fichier: 'boutique',
    titre: 'Le rayon',
    adresse: '/boutique',
    regard:
      'Les quinze vignettes photographiques, leur cascade de révélation, la bascule grille/liste.',
  },
  {
    fichier: 'fiche-fromage',
    titre: 'Une fiche produit',
    adresse: '/boutique/…',
    regard:
      'La galerie à deux vues, le panneau d’achat collant, le registre en chasse fixe — et l’encadré de rétractation RETIRÉ (retour client du 10/08).',
  },
  {
    fichier: 'panier-plein',
    titre: 'Le panier',
    adresse: '/panier',
    regard:
      'Le tunnel : sobre par principe. Les chiffres y parlent la chasse fixe, les libellés l’étiquette.',
  },
  {
    fichier: 'gestion-commandes',
    titre: 'L’espace marchand',
    adresse: '/gestion/commandes',
    regard: 'Le back-office de démonstration : même système, sans photographie.',
  },
  {
    fichier: 'suivi',
    titre: 'Le suivi de commande',
    adresse: '/suivi',
    regard: 'La page publique de suivi, et sa frise d’états.',
  },
  {
    fichier: 'retractation',
    titre: 'Le droit de rétractation',
    adresse: '/retractation',
    regard:
      'Un document légal : la refonte ne doit rien y avoir abîmé. Le tableau des quinze régimes reste entier.',
  },
];

/** Les quatre formats du poste, du plus large au plus étroit. */
const FORMATS = [
  { nom: '1280x800', titre: 'Bureau', detail: '1280 × 800' },
  { nom: '768x1024', titre: 'Tablette', detail: '768 × 1024' },
  { nom: '390x844', titre: 'Téléphone', detail: '390 × 844' },
  { nom: '360x740', titre: 'Petit téléphone', detail: '360 × 740' },
];

/* -------------------------------------------------------------------------- */
/* Lecture des fichiers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * LES DIMENSIONS D'UN PNG, lues dans ses octets.
 *
 * `scripts/dimensions-image.mjs` ne lit ni PNG ni ce qui n'entre pas dans le
 * vocabulaire des images du site — il n'a jamais eu à le faire, les captures ne
 * sont pas un livrable. Le bloc IHDR d'un PNG est à un endroit FIXE : signature
 * de huit octets, longueur de quatre, type de quatre, puis largeur et hauteur
 * en gros-boutien. Huit lignes valent mieux qu'une dépendance.
 */
function dimensionsPng(chemin) {
  const octets = readFileSync(chemin);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (octets.length < 24 || !octets.subarray(0, 8).equals(signature)) {
    return null;
  }

  if (octets.subarray(12, 16).toString('latin1') !== 'IHDR') {
    return null;
  }

  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
}

function decrire(chemin) {
  if (!existsSync(chemin)) {
    return null;
  }

  const dimensions = dimensionsPng(chemin);
  const octets = statSync(chemin).size;

  return {
    dimensions,
    octets,
    poids: `${(octets / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Ko`,
    taille:
      dimensions === null
        ? 'dimensions illisibles'
        : `${String(dimensions.largeur)} × ${String(dimensions.hauteur)} px`,
  };
}

/** Le chemin RELATIF au fichier HTML, en séparateurs web. */
function versWeb(chemin) {
  return relative(join(SORTIE, '..'), chemin).replaceAll('\\', '/');
}

/* -------------------------------------------------------------------------- */
/* Assemblage                                                                  */
/* -------------------------------------------------------------------------- */

const manquants = [];
const planches = [];

for (const page of PAGES) {
  for (const format of FORMATS) {
    const nom = `${page.fichier}-${format.nom}.png`;
    const cheminAvant = join(DOSSIER_AVANT, nom);
    const cheminApres = join(DOSSIER_APRES, nom);
    const avant = decrire(cheminAvant);
    const apres = decrire(cheminApres);

    if (avant === null) {
      manquants.push(`avant : ${nom}`);
    }

    if (apres === null) {
      manquants.push(`après : ${nom}`);
    }

    planches.push({
      page: page.fichier,
      format: format.nom,
      avant: avant === null ? null : { ...avant, src: versWeb(cheminAvant) },
      apres: apres === null ? null : { ...apres, src: versWeb(cheminApres) },
    });
  }
}

function commit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RACINE })
      .toString()
      .trim();
  } catch {
    return 'inconnu';
  }
}

const JOUR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  dateStyle: 'long',
}).format(new Date());

/** Échappe ce qui part dans du HTML — la prose des regards contient des « & ». */
function texte(valeur) {
  return valeur
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const donnees = JSON.stringify(
  {
    pages: PAGES.map((page) => ({
      fichier: page.fichier,
      titre: page.titre,
      adresse: page.adresse,
      regard: page.regard,
    })),
    formats: FORMATS,
    planches,
  },
  null,
  0,
);

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maison Vaubrune — la refonte, avant et après</title>
<style>
  :root {
    --coquille: #f2ece1;
    --verre: #f8f4ea;
    --papier: #ede8dc;
    --encre: #1c211a;
    --encre-douce: #4f5347;
    --filet: #d8cfbe;
    --filet-fort: #8b8471;
    --ocre: #5b3e0c;
    --bleu: #1f4ea8;
  }

  * { box-sizing: border-box; }

  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    background: var(--coquille);
    color: var(--encre);
    font: 16px/1.6 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  }

  header.tete {
    padding: 2.5rem clamp(1rem, 4vw, 3rem) 1.75rem;
    border-bottom: 1px solid var(--filet-fort);
    background: var(--verre);
  }

  .surtitre {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--encre-douce);
    margin: 0 0 0.75rem;
  }

  h1 {
    font-size: clamp(1.75rem, 4.5vw, 2.75rem);
    line-height: 1.1;
    margin: 0 0 0.75rem;
    font-weight: 500;
  }

  .chapeau {
    max-width: 62ch;
    margin: 0;
    color: var(--encre-douce);
  }

  .chapeau + .chapeau { margin-top: 0.75rem; }

  nav.barre {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--coquille) 94%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--filet);
    padding: 0.75rem clamp(1rem, 4vw, 3rem);
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem 2rem;
    align-items: center;
  }

  .groupe { display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center; }

  .groupe > .intitule {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.625rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--encre-douce);
    margin-right: 0.25rem;
  }

  button {
    font: inherit;
    font-size: 0.8125rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--filet-fort);
    border-radius: 2px;
    background: transparent;
    color: var(--encre);
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease;
  }

  button:hover { background: var(--papier); }

  button[aria-pressed="true"] {
    background: var(--encre);
    color: var(--coquille);
    border-color: var(--encre);
  }

  button:focus-visible {
    outline: 2px solid var(--encre);
    outline-offset: 2px;
    box-shadow: 0 0 0 4px var(--coquille);
  }

  main { padding: 1.75rem clamp(1rem, 4vw, 3rem) 4rem; }

  .titre-planche {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.75rem 1.25rem;
    margin: 0 0 0.25rem;
  }

  .titre-planche h2 { font-size: 1.5rem; margin: 0; font-weight: 500; }

  .titre-planche .adresse {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.75rem;
    color: var(--ocre);
  }

  .regard { margin: 0 0 1.5rem; max-width: 76ch; color: var(--encre-douce); }

  .duo { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }

  @media (min-width: 60rem) { .duo { grid-template-columns: 1fr 1fr; } }

  body[data-vue="avant"] .volet-apres,
  body[data-vue="apres"] .volet-avant,
  body[data-vue="balayage"] .duo { display: none; }

  body[data-vue="avant"] .duo,
  body[data-vue="apres"] .duo { grid-template-columns: 1fr; }

  body:not([data-vue="balayage"]) .balayage { display: none; }

  figure { margin: 0; }

  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    padding: 0 0 0.5rem;
    border-bottom: 1px solid var(--filet-fort);
    margin-bottom: 0.75rem;
  }

  .etiquette {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .volet-avant .etiquette { color: var(--encre-douce); }
  .volet-apres .etiquette { color: var(--ocre); }

  .metrique {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.75rem;
    color: var(--encre-douce);
    font-variant-numeric: tabular-nums;
  }

  .cadre {
    background: var(--verre);
    border: 1px solid var(--filet);
    padding: 0.5rem;
    max-height: 78vh;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .cadre img { display: block; width: 100%; height: auto; }

  .absent {
    padding: 2rem;
    text-align: center;
    color: var(--ocre);
    background: var(--papier);
    border: 1px dashed var(--filet-fort);
  }

  /* LE BALAYAGE — les deux états superposés, coupés par un curseur. Les hauts
     de page sont alignés ; les hauteurs, elles, diffèrent, et c'est dit. */
  .balayage { max-width: 68rem; }

  .balayage-scene {
    position: relative;
    background: var(--verre);
    border: 1px solid var(--filet);
    overflow: hidden;
    max-height: 78vh;
  }

  .balayage-scene img { display: block; width: 100%; height: auto; }

  .balayage-scene .dessus {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .balayage-scene .dessus img { position: absolute; inset: 0; width: 100%; }

  .balayage-trait {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--encre);
    pointer-events: none;
  }

  .balayage-commande { display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; }

  .balayage-commande input { flex: 1; accent-color: var(--encre); }

  .note {
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--filet);
    color: var(--encre-douce);
    font-size: 0.875rem;
    max-width: 76ch;
  }

  .note code {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.8125rem;
    color: var(--ocre);
  }

  .manquants {
    background: var(--papier);
    border-left: 3px solid var(--ocre);
    padding: 0.75rem 1rem;
    margin: 1.5rem 0 0;
    font-size: 0.875rem;
  }

  kbd {
    font-family: ui-monospace, "Cascadia Mono", "Consolas", monospace;
    font-size: 0.75rem;
    border: 1px solid var(--filet-fort);
    border-bottom-width: 2px;
    border-radius: 3px;
    padding: 0 0.3em;
  }
</style>
</head>
<body data-vue="duo">

<header class="tete">
  <p class="surtitre">Maison Vaubrune — boutique témoin · recette de la tranche C19</p>
  <h1>La refonte, avant et après</h1>
  <p class="chapeau">
    Vingt-huit captures d’un côté, vingt-huit de l’autre : les mêmes sept pages,
    aux mêmes quatre formats, photographiées par le même outil. À gauche le site
    tel qu’il est <strong>en ligne aujourd’hui</strong> ; à droite le site tel que
    la refonte le rend, mesuré sur la construction du ${texte(commit())}.
  </p>
  <p class="chapeau">
    Aucune commande n’est passée pendant la campagne : les pages de suivi et de
    gestion montrent le jeu d’essai à dates figées, donc les deux jeux sont
    comparables à l’octet près. Choisissez une page, puis un format.
    <kbd>←</kbd> <kbd>→</kbd> changent de page, <kbd>↑</kbd> <kbd>↓</kbd> de format.
  </p>
</header>

<nav class="barre" aria-label="Choix de la planche">
  <div class="groupe" id="choix-pages" role="group" aria-label="Page"><span class="intitule">Page</span></div>
  <div class="groupe" id="choix-formats" role="group" aria-label="Format"><span class="intitule">Format</span></div>
  <div class="groupe" id="choix-vue" role="group" aria-label="Affichage"><span class="intitule">Vue</span></div>
</nav>

<main>
  <div class="titre-planche">
    <h2 id="titre-page">—</h2>
    <span class="adresse" id="adresse-page"></span>
    <span class="metrique" id="format-page"></span>
  </div>
  <p class="regard" id="regard-page"></p>

  <div class="duo">
    <figure class="volet-avant">
      <figcaption>
        <span class="etiquette">Avant — le site en ligne</span>
        <span class="metrique" id="metrique-avant"></span>
      </figcaption>
      <div class="cadre" id="cadre-avant"></div>
    </figure>
    <figure class="volet-apres">
      <figcaption>
        <span class="etiquette">Après — la refonte</span>
        <span class="metrique" id="metrique-apres"></span>
      </figcaption>
      <div class="cadre" id="cadre-apres"></div>
    </figure>
  </div>

  <div class="balayage">
    <figcaption>
      <span class="etiquette">Balayage — les deux états superposés</span>
      <span class="metrique">hauts de page alignés</span>
    </figcaption>
    <div class="balayage-scene" id="balayage-scene">
      <img id="balayage-avant" alt="Avant la refonte">
      <div class="dessus" id="balayage-dessus"><img id="balayage-apres" alt="Après la refonte"></div>
      <div class="balayage-trait" id="balayage-trait"></div>
    </div>
    <div class="balayage-commande">
      <span class="etiquette">Avant</span>
      <input type="range" id="balayage-curseur" min="0" max="100" value="50" aria-label="Position du balayage">
      <span class="etiquette">Après</span>
    </div>
  </div>

  <p class="note">
    Les captures sont prises en <strong>pleine hauteur</strong> : le cadre défile.
    Elles attendent l’immobilité du site avant le déclic — les révélations sont
    jouées, le titre est arrivé, la vidéo du héros est figée sur une image choisie —
    sans quoi une planche montrerait un geste saisi en plein milieu.
    Le balayage aligne les hauts de page : les deux états n’ont pas la même
    hauteur, et la vue côte à côte reste celle qui fait foi.
  </p>
  <p class="note">
    Jeu « avant » : <code>preuves/avant-refonte/</code> (constitué le 6 août, avant la
    première ligne de la refonte). Jeu « après » : <code>preuves/c19/captures-apres/</code>,
    ${texte(JOUR)}, construction fraîche du commit ${texte(commit())}.
  </p>
  <div class="manquants" id="manquants" hidden></div>
</main>

<script>
const DONNEES = ${donnees};
const MANQUANTS = ${JSON.stringify(manquants)};

let rangPage = 0;
let rangFormat = 0;
let vue = 'duo';

const VUES = [
  { clef: 'duo', titre: 'Côte à côte' },
  { clef: 'balayage', titre: 'Balayage' },
  { clef: 'avant', titre: 'Avant seul' },
  { clef: 'apres', titre: 'Après seul' },
];

function planche() {
  const page = DONNEES.pages[rangPage];
  const format = DONNEES.formats[rangFormat];

  return DONNEES.planches.find((p) => p.page === page.fichier && p.format === format.nom);
}

function boutons(hote, liste, actif, action) {
  for (const [rang, element] of liste.entries()) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = element.titre;
    bouton.setAttribute('aria-pressed', String(rang === actif));
    bouton.addEventListener('click', () => { action(rang); });
    hote.append(bouton);
  }
}

function marquer(hote, actif) {
  const liste = [...hote.querySelectorAll('button')];

  for (const [rang, bouton] of liste.entries()) {
    bouton.setAttribute('aria-pressed', String(rang === actif));
  }
}

function image(cadre, piece, alternative) {
  cadre.replaceChildren();

  if (piece === null) {
    const vide = document.createElement('p');
    vide.className = 'absent';
    vide.textContent = 'Capture absente — la campagne ne l’a pas produite.';
    cadre.append(vide);
    return;
  }

  const img = document.createElement('img');
  img.src = piece.src;
  img.alt = alternative;
  img.loading = 'lazy';

  if (piece.dimensions !== null) {
    img.width = piece.dimensions.largeur;
    img.height = piece.dimensions.hauteur;
  }

  cadre.append(img);
}

function rendre() {
  const page = DONNEES.pages[rangPage];
  const format = DONNEES.formats[rangFormat];
  const p = planche();

  document.getElementById('titre-page').textContent = page.titre;
  document.getElementById('adresse-page').textContent = page.adresse;
  document.getElementById('format-page').textContent = format.titre + ' · ' + format.detail;
  document.getElementById('regard-page').textContent = page.regard;

  document.getElementById('metrique-avant').textContent =
    p.avant === null ? '—' : p.avant.taille + ' · ' + p.avant.poids;
  document.getElementById('metrique-apres').textContent =
    p.apres === null ? '—' : p.apres.taille + ' · ' + p.apres.poids;

  image(document.getElementById('cadre-avant'), p.avant, 'Avant la refonte — ' + page.titre);
  image(document.getElementById('cadre-apres'), p.apres, 'Après la refonte — ' + page.titre);

  const balayageAvant = document.getElementById('balayage-avant');
  const balayageApres = document.getElementById('balayage-apres');
  balayageAvant.src = p.avant === null ? '' : p.avant.src;
  balayageApres.src = p.apres === null ? '' : p.apres.src;

  document.body.dataset.vue = vue;
  poserBalayage();
  document.title = 'Avant / après — ' + page.titre + ' — ' + format.detail;
}

function poserBalayage() {
  const part = Number(document.getElementById('balayage-curseur').value);
  document.getElementById('balayage-dessus').style.width = part + '%';
  document.getElementById('balayage-trait').style.left = part + '%';
}

boutons(document.getElementById('choix-pages'), DONNEES.pages, 0, (rang) => {
  rangPage = rang;
  marquer(document.getElementById('choix-pages'), rang);
  rendre();
});

boutons(document.getElementById('choix-formats'), DONNEES.formats, 0, (rang) => {
  rangFormat = rang;
  marquer(document.getElementById('choix-formats'), rang);
  rendre();
});

boutons(document.getElementById('choix-vue'), VUES, 0, (rang) => {
  vue = VUES[rang].clef;
  marquer(document.getElementById('choix-vue'), rang);
  rendre();
});

document.getElementById('balayage-curseur').addEventListener('input', poserBalayage);

document.addEventListener('keydown', (evenement) => {
  if (evenement.target instanceof HTMLInputElement) {
    return;
  }

  const nombrePages = DONNEES.pages.length;
  const nombreFormats = DONNEES.formats.length;

  if (evenement.key === 'ArrowRight') { rangPage = (rangPage + 1) % nombrePages; }
  else if (evenement.key === 'ArrowLeft') { rangPage = (rangPage - 1 + nombrePages) % nombrePages; }
  else if (evenement.key === 'ArrowDown') { rangFormat = (rangFormat + 1) % nombreFormats; }
  else if (evenement.key === 'ArrowUp') { rangFormat = (rangFormat - 1 + nombreFormats) % nombreFormats; }
  else { return; }

  evenement.preventDefault();
  marquer(document.getElementById('choix-pages'), rangPage);
  marquer(document.getElementById('choix-formats'), rangFormat);
  rendre();
});

if (MANQUANTS.length > 0) {
  const bloc = document.getElementById('manquants');
  bloc.hidden = false;
  bloc.textContent = 'Captures manquantes (' + MANQUANTS.length + ') : ' + MANQUANTS.join(', ');
}

rendre();
</script>
</body>
</html>
`;

writeFileSync(SORTIE, html, 'utf8');

const presentes = planches.filter((p) => p.avant !== null && p.apres !== null).length;

console.log('-'.repeat(72));
console.log('PLANCHES AVANT / APRÈS');
console.log('-'.repeat(72));
console.log(`  paires complètes : ${String(presentes)} sur ${String(planches.length)}`);
console.log(`  avant            : ${versWeb(DOSSIER_AVANT)}/`);
console.log(`  après            : ${versWeb(DOSSIER_APRES)}/`);
console.log(`  page produite    : ${relative(RACINE, SORTIE).replaceAll('\\', '/')}`);

if (manquants.length > 0) {
  console.log('');
  console.log(`  ${String(manquants.length)} MANQUANTE(S) :`);

  for (const manquant of manquants) {
    console.log(`    - ${manquant}`);
  }
}

console.log('');

process.exit(manquants.length === 0 ? 0 : 1);
