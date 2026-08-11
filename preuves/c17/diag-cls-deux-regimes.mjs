/* LE DÉCALAGE CUMULÉ SOUS LES DEUX RÉGIMES (tranche C17).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE C13 MESURAIT, ET CE QU'IL NE POUVAIT PAS MESURER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `preuves/c13/diag-cls.mjs` a trouvé le décalage de 0,0089 que ni l'œil, ni
 * les campagnes, ni une mesure sans bridage ne voyaient. Il tourne au réglage
 * par défaut du navigateur, c'est-à-dire — depuis C17 — sur un site QUI BOUGE,
 * et il ne sait pas comparer.
 *
 * Or la promesse de D37 porte sur les deux régimes à la fois : « une révélation
 * joue sur l'opacité et sur une translation de quelques pixels — deux
 * propriétés qui ne déplacent rien d'autre ». L'affirmation n'a de valeur que
 * si les deux colonnes se ressemblent. Ce script les met côte à côte.
 *
 * Le bridage est celui de C13 (réseau 1,6 Mb/s, processeur ÷ 4, 412 × 823 à la
 * densité 1,75) : sans lui, la fenêtre d'échange de police est trop courte pour
 * se voir, et un décalage réel passe inaperçu.
 *
 * DEUX PASSES PAR PAGE ET PAR RÉGIME : au chargement, puis après un défilement
 * complet. Un socle de révélation qui pousserait le contenu ne se verrait qu'à
 * la seconde — et c'est exactement le décalage que D37 interdit.
 *
 * Emploi :  node preuves/c17/diag-cls-deux-regimes.mjs
 *                [--sortie <fichier>] [--pages /a,/b]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * `--sortie <fichier>` (ajouté en C18).
 *
 * Sans cette option, cet outil écrasait SON PROPRE RELEVÉ de C17 — c'est-à-dire
 * la pièce versionnée qui prouve ce que C17 avait mesuré. Une tranche qui rejoue
 * l'outil de la précédente doit pouvoir le faire sans détruire ce qu'elle vient
 * comparer.
 */
const sortieChoisie = (defaut) => {
  const rang = process.argv.indexOf('--sortie');

  return rang === -1 ? defaut : process.argv[rang + 1];
};


const PORT = 3993;
const PLAFOND = 0.002;

/* LES DEUX PAGES AJOUTÉES EN C19-ter, ET POURQUOI ELLES DEVAIENT L'ÊTRE.
 *
 * Le retour client n° 17 a donné un héros à DEUX COLONNES et une illustration
 * de pleine largeur à `/livraison`, `/suivi` et `/panier`. Les deux premières
 * n'étaient dans AUCUNE liste de mesure de ce dépôt — ni ici, ni dans les
 * quatre URL de `mesurer-notes`. Une image de tête est exactement ce qui
 * décale une page quand ses dimensions intrinsèques manquent ; mesurer le
 * décalage cumulé sur les pages qui n'ont pas changé et pas sur celles qui
 * viennent de gagner une image reviendrait à regarder ailleurs.
 *
 * `/panier` y était déjà, et il gagne la même illustration : il sert donc de
 * TÉMOIN — trois pages du même geste, dont une dont on connaît l'historique
 * depuis C16. */
const PAGES_SUIVIES = [
  ['/', 'accueil'],
  ['/boutique', 'rayon'],
  ['/boutique/huile-olive-premiere-pression', 'fiche'],
  ['/livraison', 'livraison'],
  ['/suivi', 'suivi'],
  ['/panier', 'panier'],
  ['/commande', 'commande'],
];

/*
 * `--pages /a,/b` (ajouté en C21a), et c'est la troisième fois que le dépôt
 * ajoute une option plutôt qu'un fichier : `--sortie` en C18, `--pages` à
 * `lcp-attribution` en C20, celle-ci aujourd'hui. Le motif ne change pas —
 * recopier l'outil pour changer une liste dupliquerait le bridage, les deux
 * régimes, la double passe et le plafond, c'est-à-dire quatre décisions
 * mesurées, désormais entretenues à deux endroits.
 *
 * Les trois pages du tunnel gagnent leur héros illustré, et deux d'entre elles
 * — `/paiement/simulation` et `/commande/confirmation` — ne sont dans AUCUNE
 * liste de mesure de ce dépôt. Mesurer le décalage des pages qui n'ont pas
 * changé et pas de celles qui viennent de gagner une image reviendrait, comme
 * en C19-ter, à regarder ailleurs.
 *
 * La liste par défaut est INCHANGÉE : un appel sans `--pages` rend exactement
 * ce qu'il rendait hier. Une page nommée à la main sans intitulé connu porte
 * son chemin en guise de nom.
 */
const PAGES = (() => {
  const rang = process.argv.indexOf('--pages');

  if (rang === -1) {
    return PAGES_SUIVIES;
  }

  const demandees = process.argv[rang + 1];

  if (demandees === undefined || demandees.startsWith('--')) {
    throw new Error('--pages attend une liste de chemins séparés par des virgules');
  }

  return demandees
    .split(',')
    .map((chemin) => chemin.trim())
    .filter((chemin) => chemin !== '')
    .map((chemin) => PAGES_SUIVIES.find(([suivie]) => suivie === chemin) ?? [chemin, chemin]);
})();

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

dire('DÉCALAGE CUMULÉ SOUS LES DEUX RÉGIMES — tranche C17');
dire('Bridage de C13 : 412 × 823 densité 1,75, réseau 1,6 Mb/s, processeur ÷ 4.');
dire('Chaque page est chargée, laissée six secondes, puis PARCOURUE en entier.');
dire(`Plafond du projet : ${PLAFOND.toFixed(3)}`);
dire('');
dire('page       régime            au chargement    après parcours   sources');
dire('─'.repeat(76));

let pire = 0;
const detail = [];

for (const [chemin, intitule] of PAGES) {
  for (const reduit of [true, false]) {
    const contexte = await navigateur.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
      reducedMotion: reduit ? 'reduce' : 'no-preference',
    });
    const page = await contexte.newPage();
    const cdp = await contexte.newCDPSession(page);

    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.addInitScript(() => {
      window.__decalages = [];
      new PerformanceObserver((liste) => {
        for (const entree of liste.getEntries()) {
          if (entree.hadRecentInput) continue;
          window.__decalages.push({
            valeur: entree.value,
            sources: (entree.sources ?? []).map((s) => ({
              balise: s.node ? s.node.tagName : '?',
              classe: s.node && s.node.className ? String(s.node.className).slice(0, 70) : '',
              avant: s.previousRect ? Math.round(s.previousRect.y) : '',
              apres: s.currentRect ? Math.round(s.currentRect.y) : '',
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(`http://localhost:${String(PORT)}${chemin}`, { waitUntil: 'load' });
    await page.waitForTimeout(6000);

    const auChargement = await page.evaluate(() =>
      window.__decalages.reduce((somme, x) => somme + x.valeur, 0),
    );

    /* LE PARCOURS. C'est lui qui déclenche les révélations, donc lui seul qui
       peut faire apparaître un décalage que le chargement ne montre pas. */
    await page.evaluate(async () => {
      const pas = window.innerHeight * 0.75;

      for (let y = 0; y < document.body.scrollHeight; y += pas) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 400));
      }
    });
    await page.waitForTimeout(1500);

    const releve = await page.evaluate(() => window.__decalages);
    const apresParcours = releve.reduce((somme, x) => somme + x.valeur, 0);

    pire = Math.max(pire, apresParcours);

    dire(
      `${intitule.padEnd(11)}${(reduit ? 'réduit' : 'mouvement').padEnd(18)}` +
        `${auChargement.toFixed(4).padStart(13)}    ${apresParcours.toFixed(4).padStart(13)}   ` +
        `${String(releve.length).padStart(3)}`,
    );

    if (releve.length > 0) {
      detail.push([`${intitule} — ${reduit ? 'réduit' : 'mouvement'}`, releve]);
    }

    await contexte.close();
  }
}

dire('');
dire(`PIRE VALEUR : ${pire.toFixed(4)} pour un plafond de ${PLAFOND.toFixed(3)}.`);
dire(
  pire <= PLAFOND
    ? 'VERDICT : le socle de mouvement ne fabrique aucun décalage. Les révélations'
    : 'VERDICT : ÉCHEC — un décalage dépasse le plafond.',
);
dire(
  pire <= PLAFOND
    ? "n'animent qu'opacity et transform, et la mesure le confirme sous les DEUX régimes."
    : '',
);

if (detail.length > 0) {
  dire('');
  dire('DÉTAIL DES DÉCALAGES RELEVÉS');
  dire('─'.repeat(76));

  for (const [ou, releve] of detail) {
    dire(`${ou} :`);

    for (const decalage of releve) {
      dire(`   ${decalage.valeur.toFixed(5)}`);

      for (const source of decalage.sources) {
        dire(`      <${source.balise}> y ${source.avant} → ${source.apres} | ${source.classe}`);
      }
    }
  }
}

writeFileSync(sortieChoisie('preuves/c17/diag-cls-c17.txt'), `${lignes.join('\n')}\n`, 'utf8');

await navigateur.close();
serveur.kill();

process.exit(pire <= PLAFOND ? 0 : 1);
