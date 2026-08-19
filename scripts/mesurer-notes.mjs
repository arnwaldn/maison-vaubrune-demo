#!/usr/bin/env node
/**
 * LES QUATRE NOTES, MESURÉES ET PUBLIÉES — quatre URL, un fichier daté.
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
 * mesure QUATRE URL au même profil, compare chaque note à son seuil, et écrit
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
 * ═══════════════════════════════════════════════════════════════════════════
 *  HORS LIGNE OU EN LIGNE — DEUX RELEVÉS, DEUX FICHIERS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sans option, le script construit s'il le faut, sert la production en local et
 * mesure `http://localhost:<port libre>`. C'est la mesure de SANTÉ DU SOCLE :
 * elle se rejoue sans réseau, sur n'importe quelle machine, et elle attrape une
 * régression le jour où on l'introduit.
 *
 * Avec `--base https://…`, il ne construit rien, ne sert rien, et mesure le
 * déploiement RÉEL. C'est la mesure qui ENGAGE COMMERCIALEMENT : elle porte le
 * réseau de diffusion, la compression et les en-têtes réellement servis. Elle
 * s'écrit dans un fichier distinct — `lighthouse-en-ligne-<date>.json` — parce
 * que confondre les deux relevés reviendrait à publier la note d'un site pour
 * celle d'un autre.
 *
 * Usage : `node scripts/mesurer-notes.mjs [--date AAAA-MM-JJ] [--suffixe c14] [--port 4310]`
 *         `node scripts/mesurer-notes.mjs --base https://exemple.vercel.app`
 *         `node scripts/mesurer-notes.mjs --base https://… --psi`
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
 * QUATRE URL, et le choix n'est pas cosmétique.
 *
 * - L'ACCUEIL, parce que c'est la page que l'on ouvre en premier et la plus
 *   légère : elle donne la santé du socle.
 * - LE RAYON, ajouté en C16 et c'est une DETTE QU'ON SOLDE. `/boutique` porte
 *   quinze vignettes photographiques, c'est-à-dire le plus gros poste d'images
 *   du site (129,1 Ko sur un plafond de 180) et le seul écran dont le budget
 *   ait dû être tenu par une décision explicite plutôt que par le hasard des
 *   `sizes` (round 1 de C15). La page la plus TRANSFORMÉE par la refonte
 *   n'avait donc aucune note mesurée, et un plafond d'images qui ne se voit
 *   dans aucune note publiée n'est surveillé par personne.
 * - UNE FICHE PRODUIT, parce que c'est la page la plus lourde de la vitrine —
 *   deux tableaux, deux photographies, le bloc d'ajout au panier, le balisage
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
 *
 * L'ordre est celui de la NAVIGATION — on entre par l'accueil, on passe au
 * rayon, on ouvre une fiche, on va au panier — et non celui de l'ancienneté :
 * un relevé se lit comme un parcours.
 */
const URL_MESUREES = [
  { chemin: '/', intitule: 'Accueil' },
  { chemin: '/boutique', intitule: 'Rayon' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'Fiche huile d’olive' },
  { chemin: '/panier', intitule: 'Panier' },
];

/**
 * LES SEUILS. Une note en dessous arrête le script.
 *
 * RAPIDITÉ : 92 de C1 à C9, **90 depuis la tranche C11** (décision D36,
 * arbitrage validé par le client le 2026-08-06). C'est le seul seuil de ce
 * projet qui ait jamais baissé, et il faut donc dire pourquoi plutôt que de
 * laisser croire à un ajustement de confort :
 *
 * - LA MARGE MESURÉE EST DE HUIT POINTS, PAS DE SIX. Les relevés du 06/08
 *   donnent 98 et 99 en rapidité, en local comme en ligne. Ce n'est pas la
 *   note qui baisse, c'est le plancher.
 * - LES IMAGES ARRIVENT (décision D35). Le plus grand affichage de contenu
 *   d'une fiche deviendra une image et non plus un titre — un poste qui dépend
 *   du réseau du visiteur bien plus que du code.
 * - L'OFFRE VEND « quatre notes ≥ 90 mesurées et datées ». Le seuil de la
 *   garde s'aligne enfin sur le chiffre annoncé, au lieu de vivre sa vie deux
 *   points au-dessus.
 *
 * Ce que la baisse ne fait PAS : autoriser une régression invisible. Les
 * relevés restent versionnés et datés dans `mesures/`, et une note qui
 * tomberait de 98 à 91 tiendrait le seuil tout en étant une perte de sept
 * points, lisible dans le fichier. Un seuil est un plancher, pas un objectif.
 *
 * Accessibilité, bonnes pratiques et référencement sont STRUCTURELS : ils ne
 * dépendent ni de la machine ni du réseau, et le site les tient à 100 depuis
 * C1. Ils ne bougent pas d'un point. Le seuil de référencement est à 96 plutôt
 * qu'à 100 parce qu'un seul audit manqué y coûte plusieurs points d'un coup —
 * et qu'on veut alors lire l'écart dans un rapport, pas découvrir un zéro.
 */
const SEUILS = {
  performance: 90,
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

/**
 * La base à mesurer, quand elle est DISTANTE.
 *
 * `null` = mesure hors ligne, le script construit et sert lui-même. Une valeur
 * = mesure en ligne : rien n'est construit, rien n'est servi, et le relevé
 * part dans un fichier séparé.
 */
const BASE_DISTANTE = lireOption('--base', null);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  `--psi` — MESURER AILLEURS QUE SUR CETTE MACHINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lighthouse mesure là où il tourne. Sur un poste de travail qui porte une
 * session ouverte, il mesure donc la charge du poste autant que le site : le
 * 19/08, deux tirages CONSÉCUTIFS contre la même production ont rendu 90 puis
 * 71 sur l'accueil, et l'effondrement frappait les quatre pages également —
 * signature d'une machine occupée, jamais d'une régression, qui frapperait la
 * page modifiée.
 *
 * Le harnais exige « zéro node avant la mesure ». Cette exigence est
 * INTENABLE ici : l'agent qui conduit la recette est lui-même un process node,
 * et il ne peut pas se tuer pour se mesurer.
 *
 * `--psi` délègue donc la mesure à PageSpeed Insights, qui exécute Lighthouse
 * sur l'infrastructure de Google. Le résultat ne dépend plus de ce poste. Les
 * mêmes URL, les mêmes seuils, le même relevé — seule la MACHINE change, et
 * c'est précisément la variable qu'on cherchait à retirer.
 *
 * Contrainte : la page doit être PUBLIQUE (Google doit pouvoir l'atteindre),
 * donc `--psi` exige `--base`. Une mesure locale reste possible sans lui, en
 * sachant ce qu'elle vaut.
 *
 * LA CLÉ vient de l'environnement, jamais d'un fichier du dépôt : elle est
 * posée en variable UTILISATEUR de Windows, hors de l'arborescence, donc hors
 * du miroir de sauvegarde. Sans clé, l'API répond quand même — mais son quota
 * anonyme est par ADRESSE IP et s'épuise en une journée d'essais.
 */
const PSI = process.argv.includes('--psi');
const CLE_PSI = process.env.PAGESPEED_API_KEY ?? null;

if (PSI && BASE_DISTANTE === null) {
  throw new Error(
    '--psi mesure depuis les serveurs de Google : la page doit être publique. ' +
      'Ajoutez --base https://… (une adresse locale leur est inatteignable).',
  );
}

/**
 * Un rapport Lighthouse obtenu par l'API PageSpeed Insights.
 *
 * `lighthouseResult` a EXACTEMENT la forme d'un rapport local — mêmes
 * `categories`, mêmes `audits`, même `lighthouseVersion` —, ce qui est la
 * raison pour laquelle ce mode tient en quelques lignes : tout ce qui lit un
 * rapport en aval continue de fonctionner sans le savoir.
 */
async function mesurerParPSI(adresse) {
  const parametres = new URLSearchParams({ url: adresse, strategy: 'mobile' });
  for (const { clef } of CATEGORIES) {
    parametres.append('category', clef);
  }
  if (CLE_PSI !== null) {
    parametres.set('key', CLE_PSI);
  }

  const reponse = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${parametres.toString()}`,
  );
  const charge = await reponse.json();

  if (charge.error !== undefined) {
    const motif =
      charge.error.code === 429
        ? 'quota épuisé — avec une clé, il est de 25 000 requêtes par jour ; ' +
          'sans clé, il est partagé par adresse IP et beaucoup plus bas'
        : charge.error.message;
    throw new Error(`PageSpeed a refusé ${adresse} (${String(charge.error.code)}) : ${motif}`);
  }

  if (charge.lighthouseResult === undefined) {
    throw new Error(`PageSpeed n'a rendu aucun rapport pour ${adresse}`);
  }

  return charge.lighthouseResult;
}

/**
 * LE SUFFIXE DE TRANCHE — `--suffixe c14` écrit `lighthouse-<date>-c14.json`.
 *
 * Ajouté en C14, et le motif est un incident, pas une commodité : C12 et C13
 * ont mesuré le MÊME JOUR, et le relevé de C13 a écrasé celui de C12. Les
 * valeurs de C12 n'ont survécu que parce qu'elles étaient dans l'historique
 * git, ce qui n'est pas ce qu'on entend par « relevé versionné et daté ».
 *
 * Une tranche par jour est une hypothèse que ce projet a déjà démentie deux
 * fois. Le suffixe est facultatif — un relevé de recette n'en a pas besoin —
 * et il n'est validé que sur sa forme : des minuscules, des chiffres, des
 * tirets, rien qui puisse sortir du dossier des mesures.
 */
const SUFFIXE = lireOption('--suffixe', null);

if (SUFFIXE !== null && !/^[a-z0-9-]+$/.test(SUFFIXE)) {
  throw new Error('--suffixe attend des minuscules, des chiffres et des tirets');
}

if (BASE_DISTANTE !== null && !BASE_DISTANTE.startsWith('https://')) {
  throw new Error(
    '--base attend une adresse en https:// — une mesure en clair fausserait la note ' +
      'de bonnes pratiques pour une raison qui ne regarde pas le livrable',
  );
}

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
  /*
   * Mesure en ligne : il n'y a rien à construire ni à servir. On rend un
   * service sans processus, que le `finally` saura ne pas tuer.
   */
  if (BASE_DISTANTE !== null) {
    return { serveur: null, base: BASE_DISTANTE.replace(/\/$/, '') };
  }

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
    console.log(
      BASE_DISTANTE === null
        ? `  Production servie sur ${service.base}`
        : `  Déploiement mesuré EN LIGNE : ${service.base}`,
    );
    console.log('');

    const pages = [];
    const ecarts = [];
    let versionLighthouse = null;

    for (const { chemin, intitule } of URL_MESUREES) {
      const fichierRapport = join(dossierTemporaire, `${chemin.replaceAll('/', '_')}.json`);
      const adresse = `${service.base}${chemin}`;

      console.log(`  ${intitule} (${chemin})…`);

      let rapport;

      if (PSI) {
        rapport = await mesurerParPSI(adresse);
      } else {
        await lancerLighthouse(adresse, fichierRapport, navigateur);
        rapport = JSON.parse(readFileSync(fichierRapport, 'utf8'));
      }
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
        origine:
          BASE_DISTANTE === null
            ? 'construction de production servie en local (next start)'
            : `déploiement de production, mesuré depuis Internet (${service.base})`,
        horsLigne: BASE_DISTANTE === null,
        /* CE QUI SÉPARE VRAIMENT DEUX RELEVÉS : la machine qui a mesuré. Deux
           fichiers voisins seraient indiscernables sans ce champ, alors qu'ils
           ne valent pas la même chose — l'un porte la charge de ce poste. */
        mesurePar: PSI
          ? 'PageSpeed Insights (Lighthouse exécuté sur l’infrastructure de Google)'
          : 'Lighthouse local, donc sensible à la charge de ce poste',
      },
      seuils: SEUILS,
      pages,
    };

    mkdirSync(DOSSIER_MESURES, { recursive: true });

    const marque = SUFFIXE === null ? '' : `-${SUFFIXE}`;
    const nomFichier = PSI
      ? `lighthouse-psi-${DATE}${marque}.json`
      : BASE_DISTANTE === null
        ? `lighthouse-${DATE}${marque}.json`
        : `lighthouse-en-ligne-${DATE}${marque}.json`;
    writeFileSync(
      join(DOSSIER_MESURES, nomFichier),
      `${JSON.stringify(releve, null, 2)}\n`,
      'utf8',
    );

    console.log('');
    console.log(`  Relevé écrit : mesures/${nomFichier}`);
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
    if (service !== null && service.serveur !== null) {
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
