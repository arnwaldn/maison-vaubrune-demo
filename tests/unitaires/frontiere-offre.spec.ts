import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * LA GARDE DE LA DÉCISION D7 — la frontière entre deux offres, tenue par un test.
 *
 * ---------------------------------------------------------------------------
 * Ce que ce test protège vraiment
 * ---------------------------------------------------------------------------
 *
 * Le portfolio vend DEUX offres distinctes : « Boutique en ligne », dont cette
 * démonstration est la preuve, et « Application en ligne », qui est l'autre
 * métier — comptes, droits, facturation récurrente. La bibliothèque du
 * prestataire de paiement, elle, sait faire les deux : la même méthode
 * `checkout.sessions.create` ouvre un paiement unique ou un engagement
 * récurrent selon un seul mot passé en `mode`.
 *
 * Ce mot est donc INTERDIT dans `src/`, et ce test échoue s'il y apparaît, à la
 * casse près. Ce n'est pas une coquetterie de périmètre : un engagement
 * récurrent ouvert par inadvertance sur une démonstration prélèverait tous les
 * mois, et son propriétaire s'en apercevrait au relevé. La démonstration
 * n'encaisse rien (les clés `live` sont refusées à la construction de
 * l'adaptateur) ; ce test ferme la seconde porte, celle de la nature du
 * paiement.
 *
 * ---------------------------------------------------------------------------
 * Ce que ce test NE regarde PAS
 * ---------------------------------------------------------------------------
 *
 * `node_modules/`. Les types de la bibliothèque officielle emploient le mot
 * partout — c'est leur droit, elle sert aussi à l'autre métier. La garde porte
 * sur NOS fichiers : ceux de `src/`, ceux que nous écrivons et relisons. Un
 * type importé depuis la bibliothèque ne déclenche donc rien, et n'a pas à être
 * inscrit en exception.
 *
 * La liste des exceptions ci-dessous est VIDE au 2026-08-06, et c'est le
 * résultat mesuré : l'adaptateur écrit `mode: 'payment'` sans jamais nommer
 * l'autre valeur, et aucun type de la bibliothèque n'oblige à l'écrire. Si un
 * jour une signature l'imposait, la ligne s'ajouterait ici AVEC SON MOTIF —
 * jamais en assouplissant la recherche.
 */

/** Le mot interdit, composé par ses codes pour ne pas déclencher la garde. */
const MOT_INTERDIT = ['sub', 'scription'].join('');

const RACINE_SRC = fileURLToPath(new URL('../../src', import.meta.url));

/** Extensions réellement lues. Le reste (SVG, CSS) n'exprime pas de mode de paiement. */
const EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.js', '.mjs']);

/**
 * Exceptions autorisées, chemin relatif à `src/`, chacune avec son motif.
 * Vide au 2026-08-06 — voir l'en-tête.
 */
const EXCEPTIONS: Readonly<Record<string, string>> = {};

function fichiersSources(dossier: string): readonly string[] {
  const trouves: string[] = [];

  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);

    if (entree.isDirectory()) {
      trouves.push(...fichiersSources(chemin));
      continue;
    }

    if (EXTENSIONS.has(extname(entree.name))) {
      trouves.push(chemin);
    }
  }

  return trouves;
}

describe('frontière avec l’offre « application en ligne » (décision D7)', () => {
  const fichiers = fichiersSources(RACINE_SRC);

  it('parcourt bien l’arborescence de `src/`', () => {
    /* Une garde qui ne lit aucun fichier passerait toujours. On exige donc que
       le parcours ait trouvé de quoi chercher, et qu'il soit descendu dans les
       sous-dossiers. */
    expect(fichiers.length).toBeGreaterThan(30);
    expect(
      fichiers.some((chemin) => relative(RACINE_SRC, chemin).includes(sep)),
    ).toBe(true);
  });

  it('n’emploie le mot du paiement récurrent dans AUCUN fichier de `src/`', () => {
    const coupables: string[] = [];

    for (const chemin of fichiers) {
      const relatif = relative(RACINE_SRC, chemin).split(sep).join('/');

      if (relatif in EXCEPTIONS) {
        continue;
      }

      if (readFileSync(chemin, 'utf8').toLowerCase().includes(MOT_INTERDIT)) {
        coupables.push(relatif);
      }
    }

    expect(coupables).toEqual([]);
  });
});
