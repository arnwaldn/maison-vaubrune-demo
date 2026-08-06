import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * LA GARDE D'HONNÊTETÉ, ÉPROUVÉE SUR PIÈCES.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi on lance le vrai script, et pas ses fonctions
 * ---------------------------------------------------------------------------
 *
 * Une garde ne vaut que par son verdict : elle doit rendre un code de sortie
 * non nul quand le dépôt est fautif, sinon `npm run controle` continue et
 * personne ne voit rien. Tester les expressions régulières une par une
 * laisserait hors de portée la seule chose qui compte réellement — le
 * branchement entre « j'ai trouvé quelque chose » et « je fais échouer la
 * chaîne ». Ces six cas exécutent donc le script comme le fait `npm run`, et
 * lisent son code de sortie.
 *
 * Le coût est celui de six démarrages de Node, soit quelques dizaines de
 * millisecondes chacun : le script ne dépend d'AUCUN module TypeScript du
 * projet (il ne lit que du texte), il n'a donc pas besoin de `tsx` comme la
 * garde du catalogue.
 *
 * ---------------------------------------------------------------------------
 * Le cas qui passe est le VRAI dépôt
 * ---------------------------------------------------------------------------
 *
 * Les cinq cas en échec s'appuient sur des dépôts miniatures
 * (`tests/fixtures/donnees-inventees/`, voir leur LISEZ-MOI) ; le cas qui
 * passe, lui, n'a pas d'imitation : c'est le dépôt lui-même. C'est le sens de
 * la garde — dire que CE dépôt-ci n'a pas de donnée inventée — et une fixture
 * « dépôt sain » n'aurait prouvé que la bonne santé de la fixture.
 */

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = fileURLToPath(
  new URL('../../scripts/verifier-aucune-donnee-inventee.mjs', import.meta.url),
);
const FIXTURES = fileURLToPath(new URL('../fixtures/donnees-inventees/', import.meta.url));

interface Verdict {
  readonly code: number;
  readonly sortie: string;
}

/** Lance la garde sur le dépôt réel, ou sur un dépôt miniature nommé. */
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

describe('garde « aucune donnée inventée »', () => {
  it('laisse passer le dépôt tel qu’il est', () => {
    const verdict = lancerLaGarde();

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('échoue sur un numéro à neuf chiffres posé dans src', () => {
    const verdict = lancerLaGarde('siren');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('SIREN');
    expect(verdict.sortie).toContain('marchand-rempli.txt');
  });

  it('échoue sur un numéro de téléphone français posé dans src', () => {
    const verdict = lancerLaGarde('telephone');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Numéro de téléphone français');
    expect(verdict.sortie).toContain('service-client.txt');
  });

  it('échoue sur un identifiant bancaire posé dans contenu', () => {
    const verdict = lancerLaGarde('iban');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('IBAN français');
  });

  it('échoue sur une page gabarit vidée de ses emplacements', () => {
    const verdict = lancerLaGarde('page-sans-emplacement');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('aucun <AComplete>');
    expect(verdict.sortie).toContain('mentions-legales');

    /* Les trois autres gabarits de la fixture ont gardé le leur : la garde ne
       doit pas condamner tout le lot pour une page. Et la page « À propos »,
       dispensée, ne doit pas non plus être comptée en échec malgré ses zéro
       emplacement. */
    expect(verdict.sortie).toContain('dispense assumée');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('retire son exemption au jeu d’essai qui a perdu ses marqueurs', () => {
    const verdict = lancerLaGarde('jeu-essai-sans-marqueur');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('marqueur « rue de l’Exemple » absent');

    /* Deux échecs, et c'est la démonstration même du mécanisme : la preuve
       tombe (contrôle 3), donc l'exemption tombe, donc l'adresse du jeu d'essai
       est analysée comme n'importe quelle autre et signalée (contrôle 4). */
    expect(verdict.sortie).toContain('Adresse postale');
    expect(verdict.sortie).toContain('2 en échec');
  });
});
