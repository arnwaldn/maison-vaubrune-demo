/**
 * OÙ SONT PASSÉS LES QUATRE POINTS DE RAPIDITÉ — l'attribution du plus grand
 * affichage (tranche C19, recette finale).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA QUESTION, ET POURQUOI `mesurer-notes` NE PEUT PAS Y RÉPONDRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le relevé de publication de la nuit du 11/08 donne 92 · 93 · 94 · 92 en
 * rapidité, là où C18 donnait 97 · 96 · 98 · 96. Les quatre métriques du relevé
 * disent DÉJÀ beaucoup :
 *
 *   premier affichage    1,5-1,8 s   INCHANGÉ depuis C17
 *   plus grand affichage 2,5 → 3,1 s SUR LES QUATRE PAGES
 *   décalage cumulé      identique au dix-millième
 *
 * Un premier affichage inchangé et un plus grand affichage qui monte partout,
 * ce n'est pas un chemin critique alourdi : c'est quelque chose qui retarde le
 * RENDU du plus grand élément. Et « sur les quatre pages » élimine d'emblée la
 * vidéo (accueil seul) et les photographies (rayon et fiche seuls).
 *
 * `mesurer-notes` ne garde que quatre nombres par page — c'est sa force, il se
 * compare d'une tranche à l'autre. Il ne dit pas QUEL élément est le plus grand
 * affichage, ni ce qui a été téléchargé avant lui. Cet outil-là le dit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL MESURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sous le MÊME bridage que `mesurer-notes` (réseau et processeur émulés par le
 * protocole de débogage, valeurs reprises de `scripts/mesurer-notes.mjs`), sur
 * les quatre URL publiées :
 *
 *   1. le plus grand affichage — son élément, sa taille, l'instant de son rendu ;
 *   2. toutes les ressources non-HTML, avec leur instant de FIN et leur poids ;
 *   3. celles qui finissent APRÈS le premier affichage et AVANT le plus grand :
 *      la fenêtre où se joue le retard.
 *
 * Il ne corrige rien et ne juge rien. Il nomme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  `--pages`, AJOUTÉ EN C20 — et c'est la même raison qui avait ajouté
 *  `--sortie` aux outils de C17 en C18
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La bascule des héros de `/livraison` et `/suivi` en vidéo doit prouver que le
 * plus grand affichage reste une IMAGE et qu'il ne recule pas. Ces deux pages ne
 * sont pas dans les quatre URL publiées, et recopier l'outil pour changer une
 * liste aurait dupliqué le bridage, l'observateur et la fenêtre du retard —
 * c'est-à-dire trois décisions mesurées, désormais entretenues à deux endroits.
 * La liste par défaut est INCHANGÉE : un appel sans `--pages` rend exactement ce
 * qu'il rendait hier.
 *
 * Usage : node preuves/c19/lcp-attribution.mjs [--sortie <fichier>]
 *                                              [--pages /a,/b]
 */
import { chromium } from 'playwright-core';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

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

const SORTIE = option('sortie', 'preuves/c19/lcp-attribution.txt');

const PAGES_PUBLIEES = [
  { chemin: '/', intitule: 'Accueil' },
  { chemin: '/boutique', intitule: 'Rayon' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'Fiche huile d’olive' },
  { chemin: '/panier', intitule: 'Panier' },
];

/* Une page nommée à la main n'a pas d'intitulé : son chemin en tient lieu. */
const PAGES = (() => {
  const demandees = option('pages', '');

  if (demandees === '') {
    return PAGES_PUBLIEES;
  }

  return demandees
    .split(',')
    .map((chemin) => chemin.trim())
    .filter((chemin) => chemin !== '')
    .map((chemin) => {
      const connue = PAGES_PUBLIEES.find((page) => page.chemin === chemin);

      return connue ?? { chemin, intitule: chemin };
    });
})();

/* Le bridage de `mesurer-notes` — recopié de son en-tête, pas inventé ici :
   c'est celui du profil mobile de Lighthouse. */
const RESEAU = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};
const RALENTISSEMENT_PROCESSEUR = 4;

function portLibre() {
  return new Promise((resoudre, rejeter) => {
    const sonde = createServer();
    sonde.unref();
    sonde.on('error', rejeter);
    sonde.listen(0, '127.0.0.1', () => {
      const { port } = sonde.address();
      sonde.close(() => {
        resoudre(port);
      });
    });
  });
}

const port = await portLibre();

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(port)], {
  cwd: RACINE,
  stdio: 'ignore',
});

const base = `http://localhost:${String(port)}`;

async function attendreLeService() {
  for (let essai = 0; essai < 120; essai += 1) {
    try {
      const reponse = await fetch(base, { method: 'HEAD' });

      if (reponse.ok) {
        return;
      }
    } catch {
      /* pas encore debout */
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error('le service de production n’est pas monté');
}

await attendreLeService();

const lignes = [];
const synthese = [];
const dire = (texte = '') => {
  lignes.push(texte);
  console.log(texte);
};

dire('ATTRIBUTION DU PLUS GRAND AFFICHAGE — tranche C19, recette finale');
dire(
  `date   : ${new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())} (Paris)`,
);
dire(
  `commit : ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RACINE }).toString().trim()}`,
);
dire('bridage: réseau 1,6 Mb/s · latence 150 ms · processeur ÷ 4, APPLIQUÉ par le');
dire('         protocole de débogage — à ne pas confondre avec le bridage SIMULÉ');
dire('         du profil mobile de Lighthouse, qui est ce que mesure `mesurer-notes`.');
dire('='.repeat(78));

const navigateur = await chromium.launch();

try {
  for (const { chemin, intitule } of PAGES) {
    const contexte = await navigateur.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
    });
    const page = await contexte.newPage();
    const session = await contexte.newCDPSession(page);

    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', RESEAU);
    await session.send('Emulation.setCPUThrottlingRate', { rate: RALENTISSEMENT_PROCESSEUR });

    /* L'observateur est posé AVANT la navigation : le plus grand affichage est
       un événement tamponné, mais son ÉLÉMENT ne survit pas à une lecture après
       coup si le nœud a été remplacé. */
    await page.addInitScript(() => {
      globalThis.__lcp = null;
      new PerformanceObserver((liste) => {
        const entrees = liste.getEntries();
        const derniere = entrees[entrees.length - 1];

        globalThis.__lcp = {
          instant: derniere.renderTime || derniere.loadTime || derniere.startTime,
          taille: derniere.size,
          url: derniere.url ?? '',
          balise: derniere.element?.tagName ?? '(élément retiré)',
          identite:
            derniere.element === null || derniere.element === undefined
              ? ''
              : [
                  derniere.element.id === '' ? '' : `#${derniere.element.id}`,
                  typeof derniere.element.className === 'string' && derniere.element.className !== ''
                    ? `.${derniere.element.className.trim().split(/\s+/u).slice(0, 3).join('.')}`
                    : '',
                ].join(''),
          texte: (derniere.element?.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 60),
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    await page.goto(`${base}${chemin}`, { waitUntil: 'load' });
    await page.waitForTimeout(3500);

    const releve = await page.evaluate(() => {
      const premier = performance
        .getEntriesByType('paint')
        .find((entree) => entree.name === 'first-contentful-paint');

      const ressources = performance
        .getEntriesByType('resource')
        .filter((entree) => entree.initiatorType !== 'beacon')
        .map((entree) => ({
          nom: entree.name.replace(/^https?:\/\/[^/]+/u, ''),
          type: entree.initiatorType,
          debut: Math.round(entree.startTime),
          fin: Math.round(entree.responseEnd),
          octets: entree.transferSize,
        }))
        .sort((a, b) => b.fin - a.fin);

      return {
        lcp: globalThis.__lcp,
        premierAffichage: premier === undefined ? null : Math.round(premier.startTime),
        ressources,
      };
    });

    dire('');
    dire(`${intitule}  (${chemin})`);
    dire('-'.repeat(78));

    const fcp = releve.premierAffichage;
    const lcp = releve.lcp;

    dire(`  premier affichage    : ${fcp === null ? '?' : `${String(fcp)} ms`}`);

    if (lcp === null) {
      dire('  plus grand affichage : AUCUN relevé — l’observateur n’a rien vu.');
    } else {
      dire(
        `  plus grand affichage : ${String(Math.round(lcp.instant))} ms  —  ` +
          `<${lcp.balise.toLowerCase()}${lcp.identite}>  ${String(Math.round(lcp.taille))} px²`,
      );

      if (lcp.url !== '') {
        dire(`                         image : ${lcp.url.replace(/^https?:\/\/[^/]+/u, '')}`);
      }

      if (lcp.texte !== '') {
        dire(`                         texte : « ${lcp.texte} »`);
      }
    }

    /* LA FENÊTRE DU RETARD : ce qui finit entre le premier affichage et le plus
       grand. C'est là, et nulle part ailleurs, que se décide la note. */
    const borneHaute = lcp === null ? Number.POSITIVE_INFINITY : lcp.instant;
    const dansLaFenetre = releve.ressources.filter(
      (r) => fcp !== null && r.fin >= fcp - 200 && r.fin <= borneHaute + 200,
    );

    dire('');
    dire('  ce qui finit de charger dans la fenêtre du retard :');

    if (dansLaFenetre.length === 0) {
      dire('    (rien — le retard ne vient pas du réseau)');
    } else {
      for (const r of dansLaFenetre.slice(0, 12)) {
        dire(
          `    ${String(r.fin).padStart(5)} ms  ${String(Math.round(r.octets / 1024)).padStart(4)} Ko  ` +
            `${r.type.padEnd(10)} ${r.nom}`,
        );
      }
    }

    const lourdes = releve.ressources
      .filter((r) => r.octets > 20 * 1024)
      .sort((a, b) => b.octets - a.octets)
      .slice(0, 6);

    dire('');
    dire('  les ressources les plus lourdes de la page :');

    for (const r of lourdes) {
      dire(
        `    ${String(Math.round(r.octets / 1024)).padStart(4)} Ko  fin à ${String(r.fin).padStart(5)} ms  ` +
          `${r.type.padEnd(10)} ${r.nom}`,
      );
    }

    const marbre = releve.ressources.find((r) => r.nom.includes('marbre'));

    synthese.push({
      intitule,
      fcp,
      lcp: lcp === null ? null : Math.round(lcp.instant),
      marbre: marbre === undefined ? null : marbre.fin,
    });

    await contexte.close();
  }
} finally {
  await navigateur.close();
  serveur.kill();
}

/* LA SYNTHÈSE — la seule question que cet outil existe pour trancher : la tuile
   de marbre, posée sur les quatre pages par la passe du 11/08, est-elle DEVANT
   ou DERRIÈRE le plus grand affichage ? Un relevé qui oblige son lecteur à
   soustraire deux colonnes de tête n'a pas fini son travail. */
dire('');
dire('='.repeat(78));
dire('LA TUILE DE MARBRE EST-ELLE DEVANT LE PLUS GRAND AFFICHAGE ?');
dire('-'.repeat(78));
dire('  page                    premier aff.   plus grand aff.   fin du marbre   écart');

for (const s of synthese) {
  const ecart = s.marbre === null || s.lcp === null ? null : s.marbre - s.lcp;

  dire(
    `  ${s.intitule.padEnd(22)}${String(s.fcp ?? '?').padStart(9)} ms${String(s.lcp ?? '?').padStart(14)} ms` +
      `${String(s.marbre ?? 'absente').padStart(14)} ${s.marbre === null ? '   ' : 'ms'}` +
      `${ecart === null ? '        —' : `${ecart > 0 ? '   +' : '   '}${String(ecart)} ms`}`,
  );
}

dire('');
dire('  Un écart POSITIF veut dire que la tuile finit APRÈS le plus grand');
dire('  affichage : elle n’est pas sur son chemin. Elle est découverte par la');
dire('  feuille de style, donc après le premier rendu, et elle arrive derrière.');
dire('='.repeat(78));

writeFileSync(SORTIE, `${lignes.join('\n')}\n`, 'utf8');
console.log(`\nRelevé écrit : ${SORTIE}`);
