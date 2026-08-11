import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

/**
 * TRENTE SECONDES, ET NON LES CINQ PAR DÉFAUT.
 *
 * Les cas de ce fichier ne sont pas des tests unitaires : chacun LANCE UN
 * PROCESSUS — démarrer Node, parfois compiler le catalogue TypeScript par
 * `tsx`, parcourir le dépôt, écrire un rapport. Le budget de cinq secondes de
 * Vitest est calibré pour une fonction pure ; il a tenu ici par chance tant que
 * les gardes étaient deux, et il a lâché quand C11 en a ajouté une troisième
 * avec ses treize cas — les processus se disputent alors les mêmes cœurs.
 *
 * Ce délai n'est pas un budget de performance : c'est un filet contre un
 * BLOCAGE (une garde qui attendrait une entrée, un processus qui ne rendrait
 * jamais la main). Il doit donc être assez lâche pour ne jamais se déclencher
 * à tort — un test rouge un jour sur trois, sur un code identique, est pire
 * qu'un test absent.
 */
vi.setConfig({ testTimeout: 30_000 });


/**
 * LA GARDE DES MARQUES RÉELLES, ÉPROUVÉE SUR PIÈCES.
 *
 * Même dispositif que `garde-donnees-inventees.spec.ts`, et pour la même
 * raison : ce qui compte dans une garde n'est pas ce qu'elle trouve, c'est le
 * CODE DE SORTIE qu'elle rend quand elle trouve. Tester les expressions
 * régulières une à une laisserait hors de portée le seul branchement qui
 * arrête `npm run controle`.
 *
 * Les quatre cas couvrent les quatre familles de défauts que la garde
 * distingue : une marque dans un texte, une appellation et ses signes
 * officiels, une marque dans un NOM de fichier, et le dépôt réel qui doit
 * passer. Le dernier n'a pas d'imitation — c'est le dépôt lui-même, et une
 * fixture « dépôt sain » n'aurait prouvé que la bonne santé de la fixture.
 */

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../../scripts/verifier-marques-reelles.mjs', import.meta.url));
const FIXTURES = fileURLToPath(new URL('../fixtures/marques-reelles/', import.meta.url));

interface Verdict {
  readonly code: number;
  readonly sortie: string;
}

function lancerLaGarde(fixture?: string): Verdict {
  const arguments_ =
    fixture === undefined ? [SCRIPT] : [SCRIPT, '--base', join(FIXTURES, fixture)];

  try {
    const sortie = execFileSync(process.execPath, arguments_, {
      cwd: RACINE,
      encoding: 'utf8',
    });
    return { code: 0, sortie };
  } catch (erreur) {
    /* `execFileSync` JETTE quand le code de sortie n'est pas nul : c'est
       précisément le cas qu'on veut observer, pas un incident. */
    const echec = erreur as { status?: number; stdout?: string };
    return { code: echec.status ?? -1, sortie: echec.stdout ?? '' };
  }
}

describe('garde « aucune marque réelle »', () => {
  it('laisse passer le dépôt tel qu’il est', () => {
    const verdict = lancerLaGarde();

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('échoue sur une marque réelle citée dans une fiche', () => {
    const verdict = lancerLaGarde('marque-dans-une-fiche');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Bonne Maman');
    expect(verdict.sortie).toContain('catalogue.txt');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue sur une appellation protégée et ses signes officiels', () => {
    const verdict = lancerLaGarde('appellation-dans-un-brouillon');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Roquefort');
    expect(verdict.sortie).toContain('IGP');
    expect(verdict.sortie).toContain('Label Rouge');

    /* Deux familles distinctes en échec : l'appellation et les signes
       officiels sont comptés séparément, parce qu'ils n'engagent pas la même
       règle — l'une est une dénomination, les autres sont des certifications. */
    expect(verdict.sortie).toContain('2 en échec');
  });

  it('échoue sur une marque portée par un NOM de fichier', () => {
    const verdict = lancerLaGarde('marque-dans-un-nom-de-fichier');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Panzani');
    expect(verdict.sortie).toContain('dans le chemin');

    /* Le TEXTE du fichier est propre : seul le contrôle des noms doit échouer.
       C'est ce qui prouve que les deux contrôles sont réellement distincts. */
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('déclare ses exemptions et les justifie', () => {
    const verdict = lancerLaGarde();

    /* L'unique exemption du dépôt est accordée à une CITATION, pas à un
       fichier : « Fauchon » n'est toléré dans la décision du choix du nom que
       tant que la phrase qui l'entoure reste celle du comptage de marques. */
    expect(verdict.sortie).toContain('Chaque exemption sert encore');
    expect(verdict.sortie).toContain('Fauchon');
    expect(verdict.sortie).toContain('000-choix-du-nom.md');
  });
});
