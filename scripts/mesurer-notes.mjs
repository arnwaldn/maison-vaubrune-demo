#!/usr/bin/env node
/**
 * LES QUATRE NOTES, MESURÉES ET PUBLIÉES — trois URL, un fichier daté.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CE SCRIPT REND VRAI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'offre « Boutique en ligne » du portfolio promet « 4 notes ≥ 90 mesurées et
 * datées ». Jusqu'à cette tranche, les mesures existaient — neuf rapports
 * Lighthouse complets dans `mesures/` — mais chacune avait été lancée à la
 * main, avec ses propres options, et leur synthèse vivait dans le README, à
 * distance des fichiers. Une promesse chiffrée dont la mesure ne se rejoue pas
 * d'une commande est une promesse qu'il faut croire.
 *
 * Ce script est cette commande. Il construit s'il le faut, sert la production,
 * mesure TROIS URL au même profil, compare chaque note à son seuil, et écrit
 * un relevé daté que l'on versionne. Une note sous son seuil rend un code de
 * sortie non nul.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE PROFIL EST MOBILE ET BRIDÉ, ET C'EST LE PLUS DUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lighthouse propose deux profils. `--preset=desktop` mesure sans bridage
 * réseau ni ralentissement du processeur : c'est celui que le portfolio
 * emploie pour ses trois notes STRUCTURELLES (accessibilité, bonnes pratiques,
 * référencement), qui ne dépendent d'aucun des deux.
 *
 * Ici on publie AUSSI la rapidité, et le profil par défaut de Lighthouse — un
 * mobile de milieu de gamme, réseau 4G lent, processeur ralenti quatre fois —
 * est le seul qui veuille dire quelque chose pour elle. C'est le profil le
 * plus sévère, et le choisir est le seul moyen de publier un chiffre qu'un
 * prospect ne pourra pas contredire depuis son téléphone.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE SCRIPT N'EST PAS DANS `npm run controle`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une mesure complète demande un Chrome et une minute par URL. L'imposer à
 * chaque contrôle local rendrait le contrôle pénible — et une garde pénible
 * finit désactivée, ce qui est pire que pas de garde. Elle se lance donc à la
 * demande, `npm run mesurer-notes`, et son RÉSULTAT est versionné : c'est le
 * fichier daté qui fait foi, pas le souvenir de l'avoir lancée.
 *
 * Usage : `node scripts/mesurer-notes.mjs [--date AAAA-MM-JJ] [--port 4310]`
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const NEXT = join(RACINE, 'node_modules', 'next', 'dist', 'bin', 'next');
const LIGHTHOUSE = join(RACINE, 'node_modules', 'lighthouse', 'cli', 'index.js');
const DOSSIER_MESURES = join(RACINE, 'mesures');
const TEMOIN_DE_CONSTRUCTION = join(RACINE, '.next', 'BUILD_ID');

/* -------------------------------------------------------------------------- */
/* Ce qui est mesuré, et à quel seuil                                          */
/* -------------------------------------------------------------------------- */

/**
 * TROIS URL, et le choix n'est pas cosmétique.
 *
 * - L'ACCUEIL, parce que c'est la page que l'on ouvre en premier et la plus
 *   légère : elle donne la santé du socle.
 * - UNE FICHE PRODUIT, parce que c'est la page la plus lourde de la vitrine —
 *   deux tableaux, une illustration, le bloc d'ajout au panier, le balisage
 *   JSON-LD — et parce qu'il y en a quinze : ce qu'elle mesure, elle le
 *   mesure quinze fois.
 * - LE PANIER, parce que c'est la page la plus CHARGÉE EN JAVASCRIPT du site
 *   public et qu'elle porte un îlot client qui relit le stockage au montage.
 *   Mesurer une boutique sans mesurer son panier reviendrait à publier la note
 *   des pages faciles.
 *
 * Ce qui n'y est PAS et pourquoi : `/paiement/simulation` et `/gestion`
 * portent `robots: noindex` et obtiendraient un 66 de référencement qui dirait
 * la consigne donnée et non la qualité du travail (décisions D21 et D19). Ils
 * sont relevés à part, dans le compte rendu de tranche.
 */
const URL_MESUREES = [
  { chemin: '/', intitule: 'Accueil' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'Fiche huile d’olive' },
  { chemin: '/panier', intitule: 'Panier' },
];

/**
 * LES SEUILS. Une note en dessous arrête le script.
 *
 * Rapidité à 92 et non à 90 : les relevés de C1 à C7 tiennent entre 97 et 98
 * au profil mobile, et un seuil posé quinze points sous la mesure ne garde
 * rien. 92 laisse la marge d'un runner chargé sans laisser passer une
 * régression réelle.
 *
 * Accessibilité, bonnes pratiques et référencement sont STRUCTURELS : ils ne
 * dépendent ni de la machine ni du réseau, et le site les tient à 100 depuis
 * C1. Le seuil de référencement est à 96 plutôt qu'à 100 parce qu'un seul
 * audit manqué y coûte plusieurs points d'un coup — et qu'on veut alors lire
 * l'écart dans un rapport, pas découvrir un zéro.
 */
const SEUILS = {
  performance: 92,
  accessibility: 100,
  seo: 96,
  'best-practices': 100,
};

/** L'ordre d'affichage des quatre notes, en français. */
const CATEGORIES = [
  { clef: 'performance', intitule: 'Rapidité' },
  { clef: 'accessibility', intitule: 'Accessibilité' },
  { clef: 'best-practices', intitule: 'Bonnes pratiques' },
  { clef: 'seo', intitule: 'Référencement' },
];

/** Les quatre mesures d'expérience relevées à côté des notes. */
const METRIQUES = [
  { audit: 'first-contentful-paint', clef: 'premierAffichage' },
  { audit: 'largest-contentful-paint', clef: 'plusGrandAffichage' },
  { audit: 'total-blocking-time', clef: 'tempsDeBlocage' },
  { audit: 'cumulative-layout-shift', clef: 'decalageCumule' },
];

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

function lireOption(nom, repli) {
  const rang = process.argv.indexOf(nom);

  if (rang === -1) {
    return repli;
  }

  const valeur = process.argv[rang + 1];

  if (valeur === undefined || valeur.startsWith('--')) {
    throw new Error(`${nom} attend une valeur`);
  }

  return valeur;
}

/**
 * La date du relevé.
 *
 * Injectable pour une seule raison : elle nomme le fichier publié, et un
 * fichier de mesures doit pouvoir être rejoué à l'identique — y compris le
 * lendemain, pour comparer. Par défaut, le jour courant à Paris.
 */
const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE = lireOption('--date', JOUR_PARIS.format(new Date()));

/* -------------------------------------------------------------------------- */
/* Le serveur de production                                                    */
/* -------------------------------------------------------------------------- */

/** Un port libre, demandé au système plutôt que choisi au hasard. */
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

function lancer(commande, arguments_) {
  return new Promise((resoudre, rejeter) => {
    const enfant = spawn(commande, arguments_, {
      cwd: RACINE,
      stdio: 'inherit',
      env: process.env,
    });

    enfant.on('exit', (code) => {
      if (code === 0) {
        resoudre();
        return;
      }
      rejeter(new Error(`« ${arguments_.join(' ')} » a échoué (code ${String(code)})`));
    });
  });
}

/**
 * Sert la construction de production sur un port libre.
 *
 * « localhost » et non « 127.0.0.1 » : Lighthouse ne reconnaît comme contexte
 * sécurisé QUE le nom d'hôte. Servi sur l'adresse numérique, le site serait
 * compté comme non chiffré et la note de bonnes pratiques chuterait pour une
 * raison qui n'a rien à voir avec le livrable. Le portfolio est tombé dans ce
 * piège avant nous ; on ne le refait pas.
 */
async function servirLaProduction() {
  if (!existsSync(TEMOIN_DE_CONSTRUCTION)) {
    console.log('  Aucune construction dans .next/ — construction avant la mesure…');
    await lancer(process.execPath, [NEXT, 'build']);
  }

  const port = lireOption('--port', String(await portLibre()));

  const serveur = spawn(process.execPath, [NEXT, 'start', '--port', port], {
    cwd: RACINE,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: process.env,
  });

  await new Promise((resoudre, rejeter) => {
    const minuterie = setTimeout(() => {
      rejeter(new Error('le serveur de production n’a pas démarré en 60 s'));
    }, 60_000);

    serveur.stdout.on('data', (morceau) => {
      if (String(morceau).includes('Ready')) {
        clearTimeout(minuterie);
        resoudre();
      }
    });
  });

  return { serveur, base: `http://localhost:${port}` };
}

/* -------------------------------------------------------------------------- */
/* La mesure                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Le Chrome que Lighthouse pilote.
 *
 * Priorité au Chromium DÉJÀ INSTALLÉ par Playwright, celui qui joue les
 * parcours de `npm run test:parcours`. Mesurer avec le même navigateur que
 * celui des tests évite d'en installer un second en intégration continue et
 * rend les deux résultats comparables.
 */
async function navigateurDeMesure() {
  if (process.env['CHROME_PATH'] !== undefined) {
    return process.env['CHROME_PATH'];
  }

  try {
    const { chromium } = await import('playwright-core');
    const chemin = chromium.executablePath();

    if (chemin !== '' && existsSync(chemin)) {
      return chemin;
    }
  } catch {
    /* Playwright absent : Lighthouse cherchera le Chrome du système. */
  }

  return null;
}

function lancerLighthouse(adresse, fichierRapport, navigateur) {
  return new Promise((resoudre, rejeter) => {
    const drapeaux =
      process.env['CI'] === undefined
        ? '--chrome-flags=--headless'
        : '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage';

    const enfant = spawn(
      process.execPath,
      [
        LIGHTHOUSE,
        adresse,
        '--only-categories=performance,accessibility,best-practices,seo',
        '--quiet',
        drapeaux,
        '--output=json',
        `--output-path=${fichierRapport}`,
      ],
      {
        cwd: RACINE,
        stdio: ['ignore', 'ignore', 'pipe'],
        env:
          navigateur === null ? process.env : { ...process.env, CHROME_PATH: navigateur },
      },
    );

    let journal = '';
    enfant.stderr.on('data', (morceau) => {
      journal += String(morceau);
    });

    enfant.on('exit', () => {
      /*
       * LE RAPPORT FAIT FOI, PAS LE CODE DE SORTIE.
       *
       * Constaté sur ce poste Windows dès le portfolio : Lighthouse mesure la
       * page, écrit son rapport complet, PUIS échoue en supprimant le profil
       * temporaire de Chrome (EPERM, le processus n'a pas encore rendu ses
       * descripteurs). On ne masque rien pour autant : la tolérance est
       * conditionnée à l'existence d'un rapport lisible — un rapport n'est
       * écrit qu'à la toute fin de la mesure —, l'incident est ANNONCÉ en une
       * ligne, et le journal complet ressort si le rapport manque.
       */
      if (existsSync(fichierRapport)) {
        if (journal.includes('EPERM')) {
          console.log(
            '    (Lighthouse a échoué en nettoyant le profil temporaire de Chrome —',
          );
          console.log('     incident connu sous Windows ; la mesure, elle, est complète.)');
        }
        resoudre();
        return;
      }

      rejeter(
        new Error(
          `Lighthouse n’a pas écrit de rapport pour ${adresse}\n  ${journal.trim().split('\n').slice(-6).join('\n  ')}`,
        ),
      );
    });
  });
}

/** Une note de 0 à 100, arrondie comme Lighthouse l'affiche. */
function note(rapport, categorie) {
  const brut = rapport.categories?.[categorie]?.score;

  if (typeof brut !== 'number') {
    throw new Error(`Lighthouse n’a pas rendu de note pour « ${categorie} »`);
  }

  return Math.round(brut * 100);
}

/** Une métrique d'expérience, telle que le rapport l'écrit. */
function metrique(rapport, audit) {
  const releve = rapport.audits?.[audit];

  return {
    valeur: typeof releve?.numericValue === 'number' ? releve.numericValue : null,
    affichage: typeof releve?.displayValue === 'string' ? releve.displayValue : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Le relevé                                                                   */
/* -------------------------------------------------------------------------- */

async function principal() {
  const dossierTemporaire = mkdtempSync(join(tmpdir(), 'mesures-vaubrune-'));
  const navigateur = await navigateurDeMesure();
  let service = null;

  console.log('');
  console.log(`Mesure des notes publiées — ${DATE}, profil mobile bridé`);
  console.log('-'.repeat(72));

  if (navigateur !== null) {
    console.log(`  Navigateur : ${navigateur}`);
  }

  try {
    service = await servirLaProduction();
    console.log(`  Production servie sur ${service.base}`);
    console.log('');

    const pages = [];
    const ecarts = [];
    let versionLighthouse = null;

    for (const { chemin, intitule } of URL_MESUREES) {
      const fichierRapport = join(dossierTemporaire, `${chemin.replaceAll('/', '_')}.json`);
      const adresse = `${service.base}${chemin}`;

      console.log(`  ${intitule} (${chemin})…`);
      await lancerLighthouse(adresse, fichierRapport, navigateur);

      const rapport = JSON.parse(readFileSync(fichierRapport, 'utf8'));
      versionLighthouse = rapport.lighthouseVersion ?? versionLighthouse;

      const notes = {};

      for (const { clef, intitule: libelle } of CATEGORIES) {
        const mesuree = note(rapport, clef);
        notes[clef] = mesuree;

        if (mesuree < SEUILS[clef]) {
          ecarts.push(
            `${chemin} — ${libelle} : ${String(mesuree)} mesuré, seuil ${String(SEUILS[clef])}`,
          );
        }
      }

      const mesures = {};

      for (const { audit, clef } of METRIQUES) {
        mesures[clef] = metrique(rapport, audit);
      }

      pages.push({ chemin, intitule, notes, mesures });

      console.log(
        `    ${CATEGORIES.map(
          ({ clef, intitule: libelle }) => `${libelle} ${String(notes[clef])}`,
        ).join('  ·  ')}`,
      );
    }

    const releve = {
      date: DATE,
      lighthouseVersion: versionLighthouse,
      profil: {
        appareil: 'mobile',
        bridage: 'profil par défaut de Lighthouse (mobile émulé, réseau et processeur bridés)',
        origine: 'construction de production servie en local (next start)',
        horsLigne: true,
      },
      seuils: SEUILS,
      pages,
    };

    mkdirSync(DOSSIER_MESURES, { recursive: true });

    const fichier = join(DOSSIER_MESURES, `lighthouse-${DATE}.json`);
    writeFileSync(fichier, `${JSON.stringify(releve, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(`  Relevé écrit : mesures/lighthouse-${DATE}.json`);
    console.log('-'.repeat(72));

    if (ecarts.length > 0) {
      console.log(`${String(ecarts.length)} note(s) sous son seuil :`);
      for (const ecart of ecarts) {
        console.log(`   -> ${ecart}`);
      }
      console.log('');
      process.exitCode = 1;
      return;
    }

    console.log(
      `${String(URL_MESUREES.length * CATEGORIES.length)} notes mesurées, toutes au-dessus de leur seuil.`,
    );
    console.log('');
  } finally {
    if (service !== null) {
      service.serveur.kill();
    }
    rmSync(dossierTemporaire, { recursive: true, force: true });
  }
}

try {
  await principal();
} catch (erreur) {
  console.error('');
  console.error('  ÉCHEC — la mesure n’a pas pu aller au bout :');
  console.error(`  ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  console.error('');
  console.error('  Pistes, dans l’ordre :');
  console.error('   - Chrome introuvable ? npx playwright install chromium, ou posez CHROME_PATH ;');
  console.error('   - la production ne démarre pas ? essayez « npm run build && npm run start » ;');
  console.error('   - dépendance absente ? npm ci (lighthouse est en devDependency).');
  console.error('');
  process.exitCode = 1;
}
