import { describe, expect, it } from 'vitest';

import {
  ALPHABET_REFERENCE,
  genererReference,
  LONGUEUR_SUFFIXE,
  MOTIF_REFERENCE,
  PREFIXE_REFERENCE,
} from '@/lib/commandes/reference';

/**
 * LA RÉFÉRENCE DE COMMANDE.
 *
 * Tout est déterministe ici : la date et la source de hasard sont des
 * paramètres. Un générateur qui lirait l'horloge et `Math.random()` ne se
 * vérifierait qu'à coups de « la référence commence par MVB » — ce qui ne dit
 * rien du jour retenu, ni de l'alphabet, ni du bornage.
 */

/** Une source de hasard qui rend la suite de valeurs fournie, puis boucle. */
function tirageEnBoucle(valeurs: readonly number[]): () => number {
  let rang = 0;

  return () => {
    const valeur = valeurs[rang % valeurs.length] ?? 0;
    rang += 1;
    return valeur;
  };
}

const CONSTANT = (valeur: number) => () => valeur;

describe('ALPHABET_REFERENCE', () => {
  it('compte trente-deux signes', () => {
    expect(ALPHABET_REFERENCE).toHaveLength(32);
  });

  it('ne contient ni O, ni 0, ni I, ni 1 — les quatre paires qui se confondent', () => {
    for (const interdit of ['O', '0', 'I', '1']) {
      expect(ALPHABET_REFERENCE).not.toContain(interdit);
    }
  });

  it('n’a aucun doublon', () => {
    expect(new Set(ALPHABET_REFERENCE)).toHaveLength(ALPHABET_REFERENCE.length);
  });
});

describe('genererReference', () => {
  const SIX_AOUT = new Date('2026-08-06T14:30:00.000Z');

  it('rend la forme MVB-AAAAMMJJ-XXXX', () => {
    const reference = genererReference(SIX_AOUT, CONSTANT(0));

    expect(reference).toMatch(MOTIF_REFERENCE);
    expect(reference.startsWith(`${PREFIXE_REFERENCE}-`)).toBe(true);
    expect(reference.split('-')[2]).toHaveLength(LONGUEUR_SUFFIXE);
  });

  it('est DÉTERMINISTE : mêmes entrées, même sortie, au caractère près', () => {
    expect(genererReference(SIX_AOUT, CONSTANT(0))).toBe('MVB-20260806-2222');
    expect(genererReference(SIX_AOUT, CONSTANT(0))).toBe('MVB-20260806-2222');
  });

  it('consomme un tirage par caractère, dans l’ordre', () => {
    // 0 → « 2 » (premier signe), 31/32 → « Z » (dernier).
    const alea = tirageEnBoucle([0, 31 / 32, 0, 31 / 32]);

    expect(genererReference(SIX_AOUT, alea)).toBe('MVB-20260806-2Z2Z');
  });

  it('parcourt tout l’alphabet, du premier au dernier signe', () => {
    for (let index = 0; index < ALPHABET_REFERENCE.length; index += 1) {
      const attendu = ALPHABET_REFERENCE.charAt(index);
      const reference = genererReference(
        SIX_AOUT,
        CONSTANT(index / ALPHABET_REFERENCE.length),
      );

      expect(reference.endsWith(attendu.repeat(LONGUEUR_SUFFIXE))).toBe(true);
    }
  });

  describe('bornage d’un tirage hors de [0, 1[', () => {
    it('ramène un tirage à 1 sur le DERNIER signe, jamais sur du vide', () => {
      const reference = genererReference(SIX_AOUT, CONSTANT(1));

      expect(reference).toBe('MVB-20260806-ZZZZ');
      expect(reference).toMatch(MOTIF_REFERENCE);
    });

    it('ramène un tirage négatif sur le PREMIER signe', () => {
      expect(genererReference(SIX_AOUT, CONSTANT(-0.5))).toBe('MVB-20260806-2222');
    });
  });

  describe('le jour retenu est celui de Paris, pas celui de la machine', () => {
    it('23 h 30 UTC le 6 août est encore le 6 août à Paris', () => {
      expect(genererReference(new Date('2026-08-06T21:30:00.000Z'), CONSTANT(0))).toBe(
        'MVB-20260806-2222',
      );
    });

    it('23 h 30 UTC le 31 décembre est DÉJÀ le 1er janvier à Paris', () => {
      /* Le cas qui fait chercher une commande la veille de son existence quand
         la date est prise en UTC : à 23 h 30 UTC, Paris est au 1er janvier. */
      expect(genererReference(new Date('2026-12-31T23:30:00.000Z'), CONSTANT(0))).toBe(
        'MVB-20270101-2222',
      );
    });

    it('00 h 30 UTC le 1er janvier est encore le 1er janvier à Paris', () => {
      expect(genererReference(new Date('2027-01-01T00:30:00.000Z'), CONSTANT(0))).toBe(
        'MVB-20270101-2222',
      );
    });
  });

  it('donne des références différentes sur des tirages différents', () => {
    const premiere = genererReference(SIX_AOUT, CONSTANT(0));
    const seconde = genererReference(SIX_AOUT, CONSTANT(0.5));

    expect(premiere).not.toBe(seconde);
  });

  it('rend mille références valides avec la vraie source de hasard', () => {
    for (let essai = 0; essai < 1000; essai += 1) {
      expect(genererReference(new Date(), Math.random)).toMatch(MOTIF_REFERENCE);
    }
  });
});
