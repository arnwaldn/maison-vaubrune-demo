#!/usr/bin/env node
/**
 * SERT LA CONSTRUCTION DE PRODUCTION, en construisant d'abord si nécessaire.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce script plutôt qu'une ligne de commande dans la configuration
 * ---------------------------------------------------------------------------
 *
 * Playwright sait lancer un serveur (`webServer.command`), et la commande
 * évidente serait « npm run build && npm run start ». Elle a deux défauts, et
 * le second est le vrai :
 *
 * 1. Elle RECONSTRUIT à chaque campagne. Or `npm run controle` vient justement
 *    de construire, une ligne plus haut : refaire la construction doublerait
 *    la durée du contrôle pour produire deux fois le même livrable.
 * 2. Elle est écrite pour UN interpréteur. Playwright passe la commande au
 *    shell du système ; « && » se comporte différemment selon qu'on est sous
 *    `cmd.exe`, PowerShell ou un shell POSIX, et ce projet se développe sous
 *    Windows pour tourner en intégration continue sous Linux. Un script Node
 *    n'a pas d'interpréteur.
 *
 * ---------------------------------------------------------------------------
 * LA RÈGLE DE RÉUTILISATION, et ce qu'elle suppose
 * ---------------------------------------------------------------------------
 *
 * La construction est réutilisée si `.next/BUILD_ID` existe — c'est le fichier
 * que Next écrit EN FIN de construction, donc sa présence signale un livrable
 * complet et non une construction interrompue. Sinon, `next build` est lancé
 * avant de servir.
 *
 * Ce que cela suppose est dit plutôt que sous-entendu : dans la chaîne réelle
 * (`npm run controle`, intégration continue), la construction précède
 * immédiatement les tests, la réutilisation porte donc sur du neuf. Lancé seul
 * après une modification de source, `npm run test:parcours` servirait le
 * livrable précédent — d'où le drapeau `--reconstruire`, et d'où le fait que
 * la chaîne officielle ne dépend jamais de ce cas.
 *
 * Usage : `node scripts/servir-production.mjs [--port 3000] [--reconstruire]`
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const NEXT = join(RACINE, 'node_modules', 'next', 'dist', 'bin', 'next');
const TEMOIN_DE_CONSTRUCTION = join(RACINE, '.next', 'BUILD_ID');

const PORT_PAR_DEFAUT = '3000';

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

const port = lireOption('--port', PORT_PAR_DEFAUT);
const reconstruire = process.argv.includes('--reconstruire');

/** Lance une commande Next et rend une promesse résolue à sa sortie. */
function lancerNext(arguments_, { attendreLaFin }) {
  const enfant = spawn(process.execPath, [NEXT, ...arguments_], {
    cwd: RACINE,
    stdio: 'inherit',
    env: process.env,
  });

  if (!attendreLaFin) {
    /* Le serveur vit aussi longtemps que ce processus : les signaux lui sont
       transmis pour que Playwright puisse l'arrêter proprement en fin de
       campagne, plutôt que de laisser un port occupé derrière lui. */
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.on(signal, () => {
        enfant.kill(signal);
      });
    }

    enfant.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    return Promise.resolve();
  }

  return new Promise((resoudre, rejeter) => {
    enfant.on('exit', (code) => {
      if (code === 0) {
        resoudre();
        return;
      }
      rejeter(new Error(`« next ${arguments_.join(' ')} » a échoué (code ${String(code)})`));
    });
  });
}

const construite = existsSync(TEMOIN_DE_CONSTRUCTION);

if (reconstruire || !construite) {
  console.log(
    construite
      ? '  Construction demandée explicitement (--reconstruire)…'
      : '  Aucune construction dans .next/ — construction avant de servir…',
  );
  await lancerNext(['build'], { attendreLaFin: true });
} else {
  console.log('  Construction existante réutilisée (.next/BUILD_ID présent).');
}

console.log(`  Service de la production sur http://localhost:${port}`);
await lancerNext(['start', '--port', port], { attendreLaFin: false });
