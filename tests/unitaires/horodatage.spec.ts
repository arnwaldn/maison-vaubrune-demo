import { describe, expect, it } from 'vitest';

import { formaterHorodatage, formaterJour } from '@/lib/commandes/horodatage';

/**
 * LES HORODATAGES AFFICHÉS.
 *
 * Ce que ce fichier vérifie et ce qu'il refuse de vérifier. Il n'exige AUCUNE
 * chaîne exacte : le rendu de `Intl` dépend du fuseau de la machine et de la
 * version d'ICU, si bien qu'attendre « 18 juillet 2026 à 11:12 » ferait échouer
 * la construction ailleurs qu'ici — et donnerait à croire, le jour où elle
 * échouerait, qu'une conversion est fausse.
 *
 * Il vérifie les propriétés qui tiennent partout : le mois est écrit en toutes
 * lettres et en français, l'année y est, l'heure n'apparaît que dans la forme
 * longue, et une date illisible rend la chaîne reçue au lieu de lever.
 */

const INSTANT = '2026-07-18T09:12:00.000Z';

describe('formaterHorodatage', () => {
  it('écrit le jour en français et y ajoute l’heure', () => {
    const rendu = formaterHorodatage(INSTANT);

    expect(rendu).toContain('juillet');
    expect(rendu).toContain('2026');
    expect(rendu).toMatch(/\d{1,2}:\d{2}/);
  });

  it('rend la chaîne reçue quand la date ne se lit pas', () => {
    expect(formaterHorodatage('hier matin')).toBe('hier matin');
    expect(formaterHorodatage('')).toBe('');
  });
});

describe('formaterJour', () => {
  it('écrit le jour sans l’heure', () => {
    const rendu = formaterJour(INSTANT);

    expect(rendu).toContain('juillet');
    expect(rendu).toContain('2026');
    expect(rendu).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('rend la chaîne reçue quand la date ne se lit pas', () => {
    expect(formaterJour('pas une date')).toBe('pas une date');
  });
});
