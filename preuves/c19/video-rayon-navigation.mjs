/**
 * LA VIDÉO DU RAYON DÉMARRE-T-ELLE QUAND ON ARRIVE EN CLIQUANT ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  D'OÙ VIENT LA QUESTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le retour client n° 14 (nuit du 11/08) a donné au rayon une boucle « miel »,
 * sur le patron EXACT du héros de l'accueil. La recette finale a étendu
 * `preuves/parcours-console.mjs` pour l'éprouver comme elle éprouve l'autre —
 * et l'attente a expiré au bout de vingt secondes.
 *
 * Le parcours arrive sur `/boutique` en CLIQUANT sur « Boutique » depuis
 * l'accueil, c'est-à-dire par une navigation CLIENTE. C'est aussi la façon dont
 * un visiteur y arrive. La question est donc exactement celle-ci : la vidéo
 * du rayon joue-t-elle pour quelqu'un qui n'a pas tapé son adresse à la main ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE LE SCRIPT COMPARE — six chemins vers DEUX pages
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   A. CHARGEMENT À FROID   `goto('/boutique')` — le document est neuf.
 *   B. NAVIGATION CLIENTE   `goto('/')` puis un CLIC sur « Boutique ».
 *   C. SENS INVERSE         `/boutique` à froid puis un CLIC sur la marque.
 *   D. RETOUR NAVIGATEUR    B, puis le bouton « Précédent » — même document.
 *   E. RETOUR DE DOCUMENT   deux chargements à froid, puis « Précédent » : le
 *                           navigateur peut restituer la page depuis son cache
 *                           d'avant-arrière (bfcache), où AUCUN effet React ne
 *                           se rejoue. Le script dit lequel des deux régimes il
 *                           a obtenu (`pageshow.persisted`) au lieu de le
 *                           supposer — les deux doivent rendre une vidéo qui
 *                           joue, par des voies différentes.
 *   F. MOUVEMENT RÉDUIT     B rejoué dans un contexte `reduce`, avec le RÉSEAU
 *                           sous écoute : la promesse « pas un octet » ne se lit
 *                           nulle part ailleurs, et un rebalayage par route est
 *                           exactement le geste qui pourrait la rompre.
 *
 * Rien d'autre ne change : même navigateur, même fenêtre, même contexte, même
 * attente. Si A joue et B ne joue pas, ce n'est ni la vidéo, ni le réseau, ni
 * la CSP — c'est le CHEMIN.
 *
 * Trois choses sont relevées de chaque côté : la valeur de `data-video-heros`
 * (« attente » tant que la frontière cliente n'a pas reçu `playing », « joue »
 * après), l'avancement réel du temps courant sur 1,2 s, et `readyState` du
 * lecteur — un lecteur qui n'a jamais reçu d'ordre reste à 0, un lecteur qui a
 * chargé sans jouer monte plus haut. Le premier critère seul se laisserait
 * tromper ; les trois ensemble nomment l'état sans interprétation.
 *
 * Le script ne corrige rien et ne juge rien. Il constate.
 *
 * Usage : node preuves/c19/video-rayon-navigation.mjs [--base http://localhost:3000]
 *                                                     [--sortie <fichier>]
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import process from 'node:process';

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

const BASE = option('base', 'http://localhost:3000').replace(/\/$/, '');
const SORTIE = option('sortie', 'preuves/c19/video-rayon-navigation.txt');

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

/**
 * L'état du lecteur, sans interprétation : cinq faits bruts.
 *
 * `enPause` ET `duree` ne sont pas décoratifs, et il a fallu un relevé rouge sur
 * un site SAIN pour les écrire. La première rédaction concluait « la vidéo
 * joue » sur `fin > debut`, ce qui est faux pour une BOUCLE : les deux vidéos
 * portent `loop`, celle de l'accueil dure une poignée de secondes, et un
 * échantillon pris à cheval sur le repassage rend « 5,99 s → 1,06 s » —
 * c'est-à-dire une progression parfaitement normale que la comparaison lit comme
 * un arrêt. Le défaut n'a pas pu se voir à la recette du 11/08 : les chemins
 * concernés y rendaient `readyState` 0, donc un lecteur qui n'avait jamais
 * bougé, et l'inégalité tombait juste pour la mauvaise raison.
 *
 * On mesure donc le MOUVEMENT (le temps courant a changé) et l'ÉTAT du lecteur
 * (il n'est pas en pause), jamais le SENS de la variation — un lecteur en boucle
 * n'a aucune raison d'avancer de façon monotone.
 */
async function etatDuLecteur(page) {
  const lecteur = page.locator('[data-video-heros]');

  if ((await lecteur.count()) === 0) {
    return { present: false };
  }

  return lecteur.evaluate(async (video) => {
    const debut = video.currentTime;
    await new Promise((r) => setTimeout(r, 1200));

    return {
      present: true,
      marque: video.dataset['videoHeros'] ?? '(aucune)',
      debut,
      fin: video.currentTime,
      duree: Number.isFinite(video.duration) ? video.duration : 0,
      enPause: video.paused,
      readyState: video.readyState,
      source: video.currentSrc === '' ? '(aucune source chargée)' : video.currentSrc.split('/').pop(),
    };
  });
}

function raconter(intitule, etat) {
  dire(`  ${intitule}`);

  if (!etat.present) {
    dire('    aucun élément [data-video-heros] dans la page');
    return false;
  }

  const boucle = etat.fin < etat.debut;

  dire(`    marque            : data-video-heros="${etat.marque}"`);
  dire(
    `    temps courant     : ${etat.debut.toFixed(2)} s → ${etat.fin.toFixed(2)} s sur 1,2 s d'attente` +
      (boucle ? ` (la boucle a repassé son début — durée ${etat.duree.toFixed(2)} s)` : ''),
  );
  dire(`    en pause          : ${etat.enPause ? 'OUI' : 'non'}`);
  dire(`    readyState        : ${String(etat.readyState)} (0 = rien n'a été demandé au lecteur)`);
  dire(`    source chargée    : ${etat.source}`);

  return (
    etat.marque === 'joue' && !etat.enPause && etat.fin !== etat.debut && etat.readyState >= 3
  );
}

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  reducedMotion: 'no-preference',
});
const page = await contexte.newPage();

dire('LA VIDÉO DU RAYON SELON LE CHEMIN EMPRUNTÉ — recette finale C19');
dire(`base : ${BASE}`);
dire('fenêtre 1280 × 800, mouvement AUTORISÉ (prefers-reduced-motion: no-preference)');
dire('='.repeat(78));
dire('');

/* A — CHARGEMENT À FROID. Le document est neuf, tous les effets se montent. */
dire('A. CHARGEMENT À FROID de /boutique (adresse tapée, ou rechargement)');
dire('-'.repeat(78));
await page.goto(`${BASE}/boutique`, { waitUntil: 'load' });
await page.waitForTimeout(6000);
const froid = raconter('état du lecteur après six secondes :', await etatDuLecteur(page));
dire('');

/* B — NAVIGATION CLIENTE. Le document est celui de l'accueil ; seul le contenu
   de la route change. C'est le chemin d'un visiteur ordinaire. */
dire('B. NAVIGATION CLIENTE : accueil, puis CLIC sur « Boutique »');
dire('-'.repeat(78));
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.getByRole('complementary', { name: 'Démonstration — épicerie fictive' }).waitFor();
await page.waitForTimeout(3000);
await page.getByRole('link', { name: 'Boutique', exact: true }).first().click();
await page.waitForURL((u) => u.pathname === '/boutique');
await page.waitForTimeout(6000);
const clique = raconter('état du lecteur après six secondes :', await etatDuLecteur(page));
dire('');

/* C — LA MÊME QUESTION POSÉE À L'AUTRE VIDÉO, DANS L'AUTRE SENS.
   Si la cause est bien le CHEMIN et non la page, alors la vidéo de l'ACCUEIL
   doit se taire elle aussi quand on arrive à l'accueil en cliquant. Le dépôt
   a une règle sur ce point (« ne jamais écrire identique sans avoir diffé les
   relevés », C18) : on ne déduit pas ce troisième cas du mécanisme, on le
   mesure. C'est aussi lui qui dit la TAILLE du défaut — une page ou deux. */
dire('C. NAVIGATION CLIENTE EN SENS INVERSE : /boutique à froid, puis CLIC sur « Accueil »');
dire('-'.repeat(78));
await page.goto(`${BASE}/boutique`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
/* Le retour à l'accueil se fait par la MARQUE de l'en-tête : ce site n'a pas de
   lien nommé « Accueil », il a un monument qui y ramène — c'est le geste réel
   d'un visiteur, et un sélecteur par l'adresse le décrit mieux qu'un nom. */
await page.locator('header a[href="/"]').first().click();
await page.waitForURL((u) => u.pathname === '/');
await page.waitForTimeout(6000);
const retour = raconter('état du lecteur de l’ACCUEIL après six secondes :', await etatDuLecteur(page));
dire('');

/* D — LE BOUTON « PRÉCÉDENT » APRÈS UNE NAVIGATION CLIENTE.
   Le geste le plus banal du web, et le seul des six qui ne passe par AUCUN
   clic dans la page : c'est l'historique qui remet la route en place. Pour
   React, c'est une navigation comme une autre — le contrôleur doit donc y
   voir la même chose qu'en B, et c'est ce qu'on vérifie plutôt que de le
   déduire. */
dire('D. RETOUR NAVIGATEUR : accueil, CLIC sur « Boutique », puis bouton « Précédent »');
dire('-'.repeat(78));
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.getByRole('link', { name: 'Boutique', exact: true }).first().click();
await page.waitForURL((u) => u.pathname === '/boutique');
await page.waitForTimeout(2000);
await page.goBack();
await page.waitForURL((u) => u.pathname === '/');
await page.waitForTimeout(6000);
const precedent = raconter('état du lecteur de l’ACCUEIL après six secondes :', await etatDuLecteur(page));
dire('');

/* E — LE RETOUR D'UN DOCUMENT ENTIER, où React peut ne rien rejouer du tout.
   Deux chargements à froid puis « Précédent » : le navigateur a le droit de
   restituer la page depuis son cache d'avant-arrière, auquel cas AUCUN effet
   ne se remonte et l'état de la page est celui qu'elle avait en partant. Les
   deux issues sont acceptables — encore faut-il savoir laquelle on a obtenue,
   d'où le drapeau `pageshow.persisted` posé AVANT la navigation. */
dire('E. RETOUR DE DOCUMENT (cache d’avant-arrière) : /boutique à froid, / à froid, « Précédent »');
dire('-'.repeat(78));
await page.goto(`${BASE}/boutique`, { waitUntil: 'load' });
await page.waitForTimeout(4000);
await page.evaluate(() => {
  window.addEventListener('pageshow', (evenement) => {
    window.restituee = evenement.persisted;
  });
});
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.goBack();
await page.waitForURL((u) => u.pathname === '/boutique');
await page.waitForTimeout(6000);
const restituee = await page.evaluate(() => window.restituee ?? false);
dire(
  `  régime obtenu     : ${
    restituee
      ? 'page RESTITUÉE du cache d’avant-arrière (aucun effet React rejoué)'
      : 'document RECHARGÉ (les effets se remontent normalement)'
  }`,
);
const arriere = raconter('état du lecteur du RAYON après six secondes :', await etatDuLecteur(page));
dire('');

await contexte.close();

/* F — SOUS MOUVEMENT RÉDUIT, APRÈS NAVIGATION : LE RÉSEAU RESTE MUET.
   C'est la contre-épreuve du correctif, et la seule qui compte vraiment :
   rebalayer les vidéos à chaque route serait exactement le geste capable de
   rompre la promesse « pas un octet sous reduce », puisqu'il rejoue le
   contrôleur là où il ne tournait jamais. On l'écoute donc au RÉSEAU, seul
   endroit où la promesse se voit — un attribut ou une opacité vaudraient la
   même chose si le fichier partait quand même. */
dire('F. MOUVEMENT RÉDUIT, APRÈS NAVIGATION CLIENTE : combien d’octets de vidéo ?');
dire('-'.repeat(78));
const contexteReduit = await navigateur.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  reducedMotion: 'reduce',
});
const ongletReduit = await contexteReduit.newPage();
const demandesVideo = [];

ongletReduit.on('request', (demande) => {
  if (demande.url().includes('.mp4')) {
    demandesVideo.push(demande.url().split('/').pop() ?? '');
  }
});

await ongletReduit.goto(`${BASE}/`, { waitUntil: 'load' });
await ongletReduit.waitForTimeout(2000);
await ongletReduit.getByRole('link', { name: 'Boutique', exact: true }).first().click();
await ongletReduit.waitForURL((u) => u.pathname === '/boutique');
await ongletReduit.waitForTimeout(6000);

const etatReduit = await ongletReduit.locator('[data-video-heros]').evaluate((video) => ({
  marque: video.dataset['videoHeros'] ?? '(aucune)',
  readyState: video.readyState,
  enPause: video.paused,
}));

dire(`  fichiers .mp4 demandés : ${demandesVideo.length === 0 ? 'AUCUN' : demandesVideo.join(', ')}`);
dire(`  marque                 : data-video-heros="${etatReduit.marque}"`);
dire(`  readyState             : ${String(etatReduit.readyState)}`);
dire(`  en pause               : ${etatReduit.enPause ? 'oui' : 'NON'}`);

const reduitMuet =
  demandesVideo.length === 0 &&
  etatReduit.marque === 'attente' &&
  etatReduit.readyState === 0 &&
  etatReduit.enPause;

await contexteReduit.close();
dire('');

dire('='.repeat(78));
dire('VERDICT');
dire('-'.repeat(78));
dire(`  A. rayon à froid              : ${froid ? 'la vidéo JOUE' : 'la vidéo NE JOUE PAS'}`);
dire(`  B. rayon en cliquant          : ${clique ? 'la vidéo JOUE' : 'la vidéo NE JOUE PAS'}`);
dire(`  C. accueil en cliquant        : ${retour ? 'la vidéo JOUE' : 'la vidéo NE JOUE PAS'}`);
dire(`  D. accueil par « Précédent »  : ${precedent ? 'la vidéo JOUE' : 'la vidéo NE JOUE PAS'}`);
dire(`  E. rayon retrouvé en arrière  : ${arriere ? 'la vidéo JOUE' : 'la vidéo NE JOUE PAS'}`);
dire(`  F. sous mouvement réduit      : ${reduitMuet ? 'AUCUN OCTET, lecteur au repos' : 'LA PROMESSE EST ROMPUE'}`);
dire('');

const tousLesChemins = froid && clique && retour && precedent && arriere;

if (tousLesChemins && reduitMuet) {
  dire('  LES CINQ CHEMINS DONNENT LE MÊME SITE, et le sixième ne coûte rien.');
  dire('  La vidéo ne dépend plus de la page par laquelle la visite a commencé.');
} else if (!clique && froid) {
  dire('  LES DEUX CHEMINS NE DONNENT PAS LE MÊME SITE. La vidéo du rayon ne');
  dire('  démarre que sur un chargement à froid. Or personne n’arrive sur un');
  dire('  rayon en tapant son adresse : on y arrive en cliquant.');
} else if (!reduitMuet) {
  dire('  LE MOUVEMENT RÉDUIT PAIE POUR UN MOUVEMENT QU’IL REFUSE : le rebalayage');
  dire('  par route a rouvert le réseau là où il devait rester muet.');
} else {
  dire('  AU MOINS UN CHEMIN RESTE MUET — voir le détail ci-dessus, chemin par');
  dire('  chemin. Le défaut n’est pas réparé sur toute sa surface.');
}

dire('='.repeat(78));

await navigateur.close();
writeFileSync(SORTIE, `${lignes.join('\n')}\n`, 'utf8');
process.stdout.write(`\nRelevé écrit : ${SORTIE}\n`);

if (!(tousLesChemins && reduitMuet)) {
  process.exitCode = 1;
}
