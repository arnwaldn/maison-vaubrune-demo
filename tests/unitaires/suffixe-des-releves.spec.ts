import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

/**
 * LE SUFFIXE DE TRANCHE DES DEUX OUTILS DE MESURE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CES CAS GARDENT, ET POURQUOI ILS LANCENT LE VRAI SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `mesurer-notes` et `mesurer-transfert` écrivent tous les deux dans `mesures/`,
 * et un relevé versionné n'a de valeur que s'il survit à la mesure suivante. Le
 * dépôt a payé deux fois pour l'apprendre : le relevé de notes de C12 écrasé par
 * C13 (d'où `--suffixe` en C14), puis le relevé de transfert de C20 écrasé par
 * C21a le même jour (d'où `--suffixe` ici, en C21b).
 *
 * Ce qui se garde n'est PAS l'écriture du fichier — elle demande un Chromium,
 * une construction servie et quatre navigations, c'est-à-dire une campagne
 * entière pour deux nombres. Ce qui se garde est le point où l'option peut
 * SILENCIEUSEMENT ne rien faire : sa validation. Un suffixe qui contiendrait un
 * séparateur de chemin sortirait du dossier des mesures ; un suffixe refusé
 * doit arrêter le script AVANT qu'il ne mesure quoi que ce soit, et non écrire
 * le fichier sans marque en croyant bien faire.
 *
 * Les deux outils sont éprouvés du même geste, et c'est le sens du fichier : ils
 * écrivent au même endroit, ils n'ont aucune raison de se défendre autrement.
 * Le jour où l'un des deux changera de validation, ce fichier le dira.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE CAS QUI PASSE NE MESURE RIEN, ET C'EST VOULU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un suffixe VALIDE laisse le script continuer — jusqu'à la validation suivante,
 * celle de `--base`, qu'on fait échouer exprès avec une adresse en clair. Le
 * message d'erreur rendu nomme alors `--base` et non `--suffixe` : c'est la
 * preuve que le suffixe est passé, obtenue sans lancer un navigateur.
 */

vi.setConfig({ testTimeout: 30_000 });

const OUTILS = [
  ['mesurer-notes', fileURLToPath(new URL('../../scripts/mesurer-notes.mjs', import.meta.url))],
  [
    'mesurer-transfert',
    fileURLToPath(new URL('../../scripts/mesurer-transfert.mjs', import.meta.url)),
  ],
] as const;

function lancer(script: string, arguments_: readonly string[]) {
  return spawnSync(process.execPath, [script, ...arguments_], { encoding: 'utf8' });
}

describe.each(OUTILS)('%s — le suffixe de tranche', (_nom, script) => {
  it.each([
    ['../evasion', 'un chemin relatif'],
    ['c21/b', 'un séparateur de chemin'],
    ['C21B', 'des capitales'],
    ['c21 b', 'une espace'],
  ])('refuse « %s » (%s) et n’écrit rien', (suffixe) => {
    const rendu = lancer(script, ['--suffixe', suffixe]);

    expect(rendu.status).not.toBe(0);
    expect(rendu.stderr).toContain('--suffixe');
  });

  it('refuse un `--suffixe` sans valeur', () => {
    const rendu = lancer(script, ['--suffixe']);

    expect(rendu.status).not.toBe(0);
  });

  it('accepte un suffixe de tranche, et s’arrête plus loin', () => {
    /* L'adresse en clair fait échouer la validation SUIVANTE. Le message nomme
       `--base` : le suffixe, lui, est passé. */
    const rendu = lancer(script, ['--suffixe', 'c21b', '--base', 'http://exemple.test']);

    expect(rendu.status).not.toBe(0);
    expect(rendu.stderr).toContain('--base');
    expect(rendu.stderr).not.toContain('--suffixe attend');
  });
});
