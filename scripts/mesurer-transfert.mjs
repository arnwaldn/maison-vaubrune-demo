#!/usr/bin/env node
/**
 * LE JAVASCRIPT RÉELLEMENT TRANSFÉRÉ — les deux plafonds de navigation de D36.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'ANGLE MORT QUE CE SCRIPT FERME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La colonne « First Load JS » de `next build` tient le budget public depuis
 * C6. Elle a une limite que D36 nomme sans détour : elle compte ce que
 * l'empaqueteur RATTACHE à une route, pas ce qu'un navigateur TÉLÉCHARGE. Un
 * import dynamique déclenché à la première image d'animation — exactement ce
 * que la refonte prévoit pour Lenis (D37) — n'y figure pas d'un octet.
 *
 * D36 ferme cet angle mort par deux plafonds, et ce script est leur mesure :
 *
 *   JS transféré AU CHARGEMENT d'une page        ≤ 145 Ko
 *   JS transféré APRÈS UN PARCOURS complet       ≤ 190 Ko
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI IL N'EST PAS DANS `npm run controle`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il lui faut un Chromium, une construction de production servie, et quatre
 * navigations réelles. C'est le coût d'une campagne de bout en bout pour deux
 * nombres — et `npm run controle` en enchaîne déjà une. L'imposer une seconde
 * fois à chaque contrôle local ferait de la chaîne une corvée, et une garde
 * pénible finit désactivée, ce qui est pire que pas de garde (même
 * raisonnement que `scripts/mesurer-notes.mjs`, écrit en C8).
 *
 * Il se lance donc à la demande — `npm run mesurer-transfert` — et son
 * RÉSULTAT est versionné dans `mesures/`. C'est le fichier daté qui fait foi,
 * pas le souvenir de l'avoir lancé. Un dépassement rend un code de sortie non
 * nul, pour qu'il puisse entrer en intégration continue le jour où on le
 * voudra sans rien changer d'autre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI EST COMPTÉ, ET COMMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `performance.getEntriesByType('resource')`, et son champ `transferSize`.
 * C'est la seule mesure qui dise « octets passés sur le réseau » :
 *
 * - elle COMPTE les en-têtes de réponse, comme le réseau les compte ;
 * - elle compte la charge COMPRESSÉE, celle que le serveur a réellement
 *   envoyée — `encodedBodySize` la donnerait aussi, mais sans les en-têtes ;
 * - elle rend ZÉRO pour une ressource servie par le cache mémoire ou disque.
 *   C'est le comportement voulu, et c'est même tout l'intérêt du second
 *   plafond : un parcours réel ne retélécharge pas le socle à chaque page, et
 *   un plafond de parcours qui l'additionnerait quatre fois mesurerait une
 *   fiction. Le contexte de navigateur est donc UNIQUE pour les quatre pages.
 *
 * Sont comptés comme JavaScript : les ressources dont l'adresse finit par
 * `.js` ou `.mjs` (chaîne de requête retirée). Les charges utiles RSC
 * (`?_rsc=…`) sont du texte de données, servies en `text/x-component` : elles
 * ne portent pas d'extension et n'entrent donc pas dans le compte, ce qui est
 * conforme à ce que D36 plafonne — du CODE, pas du contenu.
 *
 * 1 Ko = 1024 octets, comme partout ailleurs dans ce projet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE PARCOURS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Accueil → rayon → fiche produit → panier. C'est le chemin qu'un visiteur qui
 * achète emprunte vraiment, et c'est celui qui charge le plus : le panier
 * porte l'îlot client le plus lourd du site public. Les quatre pages sont
 * visitées dans UN SEUL contexte, sans vider le cache entre deux — un visiteur
 * ne vide pas son cache en cliquant.
 *
 * La première page du parcours donne AUSSI le chiffre « au chargement ». Les
 * trois URL de `scripts/mesurer-notes.mjs` sont mesurées à froid en plus, dans
 * des contextes neufs, parce que le plafond de 145 Ko porte sur UNE page
 * ouverte directement — pas sur la première d'une visite.
 *
 * Usage : `node scripts/mesurer-transfert.mjs [--date AAAA-MM-JJ] [--suffixe c21b]`
 *         `node scripts/mesurer-transfert.mjs [--port N]`
 *         `node scripts/mesurer-transfert.mjs --base https://exemple.app`
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const NEXT = join(RACINE, 'node_modules', 'next', 'dist', 'bin', 'next');
const DOSSIER_MESURES = join(RACINE, 'mesures');
const TEMOIN_DE_CONSTRUCTION = join(RACINE, '.next', 'BUILD_ID');

/** Les deux plafonds de D36, en kibioctets. */
const PLAFOND_CHARGEMENT_KO = 145;
const PLAFOND_PARCOURS_KO = 190;

/** Les pages ouvertes À FROID, chacune dans un contexte neuf. */
const PAGES_A_FROID = [
  { chemin: '/', intitule: 'Accueil' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'Fiche huile d’olive' },
  { chemin: '/panier', intitule: 'Panier' },
];

/** Le parcours, joué dans UN SEUL contexte, cache conservé. */
const PARCOURS = [
  { chemin: '/', intitule: 'Accueil' },
  { chemin: '/boutique', intitule: 'Rayon' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'Fiche huile d’olive' },
  { chemin: '/panier', intitule: 'Panier' },
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

const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE = lireOption('--date', JOUR_PARIS.format(new Date()));
const BASE_DISTANTE = lireOption('--base', null);

/**
 * LE SUFFIXE DE TRANCHE — `--suffixe c21b` écrit `transfert-<date>-c21b.json`.
 *
 * Ajouté en C21b, et c'est la TROISIÈME MORSURE DU MÊME CHIEN. `mesurer-notes`
 * a reçu cette option en C14 parce que le relevé de C13 avait écrasé celui de
 * C12, mesuré le même jour ; les deux outils de C17 ont reçu `--sortie` en C18
 * pour la même raison. Cet outil-ci est resté sans rien, et il a fini par faire
 * exactement ce qu'on attendait : en C21a, une mesure du tunnel a écrasé le
 * relevé de transfert de C20, publié le matin même. Les valeurs de C20 n'ont
 * survécu que parce qu'elles étaient dans l'historique git — ce qui n'est pas
 * ce qu'on entend par « relevé versionné et daté ».
 *
 * Une tranche par jour est une hypothèse que ce projet a déjà démentie quatre
 * fois. Le suffixe est facultatif — un relevé de recette n'en a pas besoin — et
 * il n'est validé que sur sa FORME : des minuscules, des chiffres, des tirets,
 * rien qui puisse sortir du dossier des mesures. C'est la validation de
 * `mesurer-notes`, au caractère près : deux outils qui écrivent dans le même
 * dossier n'ont aucune raison de se défendre différemment.
 */
const SUFFIXE = lireOption('--suffixe', null);

if (SUFFIXE !== null && !/^[a-z0-9-]+$/.test(SUFFIXE)) {
  throw new Error('--suffixe attend des minuscules, des chiffres et des tirets');
}

if (BASE_DISTANTE !== null && !BASE_DISTANTE.startsWith('https://')) {
  throw new Error('--base attend une adresse en https://');
}

/* -------------------------------------------------------------------------- */
/* Le serveur de production                                                    */
/* -------------------------------------------------------------------------- */

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
    const enfant = spawn(commande, arguments_, { cwd: RACINE, stdio: 'inherit', env: process.env });
    enfant.on('exit', (code) => {
      if (code === 0) {
        resoudre();
        return;
      }
      rejeter(new Error(`« ${arguments_.join(' ')} » a échoué (code ${String(code)})`));
    });
  });
}

async function servirLaProduction() {
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
 * Le relevé des ressources du DOCUMENT COURANT.
 *
 * Lu après chaque navigation : `performance` est remis à zéro à chaque
 * document, donc ce qui n'est pas lu tout de suite est perdu. C'est aussi ce
 * qui permet d'additionner un parcours proprement — chaque page ne rend que ce
 * qu'ELLE a fait passer sur le réseau, les ressources déjà en cache rendant
 * zéro.
 */
async function relever(page) {
  return page.evaluate(() => {
    const entrees = performance.getEntriesByType('resource');
    const javascript = entrees.filter((entree) => {
      const sansRequete = entree.name.split('?')[0] ?? '';
      return sansRequete.endsWith('.js') || sansRequete.endsWith('.mjs');
    });

    return {
      octets: javascript.reduce((somme, entree) => somme + entree.transferSize, 0),
      fichiers: javascript.length,
      total: entrees.reduce((somme, entree) => somme + entree.transferSize, 0),
    };
  });
}

async function ouvrir(navigateur, base, chemin) {
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();

  await page.goto(`${base}${chemin}`, { waitUntil: 'networkidle', timeout: 60_000 });
  const releve = await relever(page);

  await contexte.close();
  return releve;
}

function ko(octets) {
  return octets / 1024;
}

async function principal() {
  const { chromium } = await import('playwright-core');
  let service = null;
  let navigateur = null;

  console.log('');
  console.log(`JavaScript transféré — ${DATE}, plafonds D36`);
  console.log('-'.repeat(72));

  try {
    service = await servirLaProduction();
    console.log(
      BASE_DISTANTE === null
        ? `  Production servie sur ${service.base}`
        : `  Déploiement mesuré EN LIGNE : ${service.base}`,
    );

    navigateur = await chromium.launch();
    const ecarts = [];

    console.log('');
    console.log(`  À FROID — plafond ${String(PLAFOND_CHARGEMENT_KO)} Ko par page`);

    const aFroid = [];

    for (const { chemin, intitule } of PAGES_A_FROID) {
      const releve = await ouvrir(navigateur, service.base, chemin);
      aFroid.push({ chemin, intitule, ...releve });

      console.log(
        `    ${intitule.padEnd(24)} ${ko(releve.octets).toFixed(1)} Ko de JS ` +
          `(${String(releve.fichiers)} fichiers) · ${ko(releve.total).toFixed(1)} Ko au total`,
      );

      if (ko(releve.octets) > PLAFOND_CHARGEMENT_KO) {
        ecarts.push(
          `${chemin} — ${ko(releve.octets).toFixed(1)} Ko de JS au chargement, ` +
            `plafond ${String(PLAFOND_CHARGEMENT_KO)} Ko`,
        );
      }
    }

    console.log('');
    console.log(`  PARCOURS — plafond ${String(PLAFOND_PARCOURS_KO)} Ko cumulés, cache conservé`);

    const contexte = await navigateur.newContext();
    const page = await contexte.newPage();
    const etapes = [];
    let cumul = 0;

    for (const { chemin, intitule } of PARCOURS) {
      await page.goto(`${service.base}${chemin}`, { waitUntil: 'networkidle', timeout: 60_000 });
      const releve = await relever(page);
      cumul += releve.octets;
      etapes.push({ chemin, intitule, octets: releve.octets, cumulOctets: cumul });

      console.log(
        `    ${intitule.padEnd(24)} +${ko(releve.octets).toFixed(1)} Ko ` +
          `→ ${ko(cumul).toFixed(1)} Ko cumulés`,
      );
    }

    await contexte.close();

    if (ko(cumul) > PLAFOND_PARCOURS_KO) {
      ecarts.push(
        `parcours complet — ${ko(cumul).toFixed(1)} Ko de JS cumulés, ` +
          `plafond ${String(PLAFOND_PARCOURS_KO)} Ko`,
      );
    }

    const releve = {
      date: DATE,
      origine:
        BASE_DISTANTE === null
          ? 'construction de production servie en local (next start)'
          : `déploiement de production (${service.base})`,
      methode:
        'performance.getEntriesByType("resource").transferSize — octets réseau, ' +
        'en-têtes compris, zéro pour une ressource servie par le cache',
      plafonds: {
        chargementKo: PLAFOND_CHARGEMENT_KO,
        parcoursKo: PLAFOND_PARCOURS_KO,
      },
      aFroid: aFroid.map((page_) => ({
        chemin: page_.chemin,
        intitule: page_.intitule,
        javascriptKo: Number(ko(page_.octets).toFixed(2)),
        fichiers: page_.fichiers,
        toutesRessourcesKo: Number(ko(page_.total).toFixed(2)),
      })),
      parcours: {
        etapes: etapes.map((etape) => ({
          chemin: etape.chemin,
          intitule: etape.intitule,
          javascriptKo: Number(ko(etape.octets).toFixed(2)),
          cumulKo: Number(ko(etape.cumulOctets).toFixed(2)),
        })),
        cumulKo: Number(ko(cumul).toFixed(2)),
      },
    };

    mkdirSync(DOSSIER_MESURES, { recursive: true });
    const marque = SUFFIXE === null ? '' : `-${SUFFIXE}`;
    const nomFichier =
      BASE_DISTANTE === null
        ? `transfert-${DATE}${marque}.json`
        : `transfert-en-ligne-${DATE}${marque}.json`;
    writeFileSync(join(DOSSIER_MESURES, nomFichier), `${JSON.stringify(releve, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(`  Relevé écrit : mesures/${nomFichier}`);
    console.log('-'.repeat(72));

    if (ecarts.length > 0) {
      console.log(`${String(ecarts.length)} plafond(s) dépassé(s) :`);
      for (const ecart of ecarts) {
        console.log(`   -> ${ecart}`);
      }
      console.log('');
      process.exitCode = 1;
      return;
    }

    console.log('Les deux plafonds de navigation de D36 sont tenus.');
    console.log('');
  } finally {
    if (navigateur !== null) {
      await navigateur.close();
    }
    if (service !== null && service.serveur !== null) {
      service.serveur.kill();
    }
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
  console.error('   - Chromium absent ? npx playwright install chromium ;');
  console.error('   - la production ne démarre pas ? essayez « npm run build && npm run start ».');
  console.error('');
  process.exitCode = 1;
}
