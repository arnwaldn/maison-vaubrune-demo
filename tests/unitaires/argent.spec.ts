import { describe, expect, it } from 'vitest';

import { centimesDepuisEuros, eurosDepuisCentimes, formaterEuros } from '@/lib/argent';

/**
 * L'ARGENT, dans les deux sens.
 *
 * Ce module rejoint le périmètre à 100 % en C6 (décision D16 : on couvre le
 * code qui DÉCIDE d'un montant). Il le mérite depuis que l'espace de gestion
 * laisse SAISIR un prix : jusqu'ici l'argent n'entrait dans le système que par
 * un fichier versionné relu par un humain, il y entre désormais par un champ de
 * formulaire.
 *
 * Le cas qui justifie ce fichier à lui seul est celui de la multiplication
 * flottante. `Number('12.90') * 100` vaut 1289,9999999999998 ; un `Math.round`
 * en aval donnerait le bon résultat ici et un centime de moins ailleurs. Les
 * cas ci-dessous incluent donc les valeurs qui piègent le flottant — 12,90 ;
 * 8,20 ; 1,10 ; 0,29 — et exigent l'entier exact.
 */

describe('formaterEuros', () => {
  it('écrit un montant en euros, insécable comprise', () => {
    /* U+00A0 est écrite par son point de code : rien d'invisible dans ce test. */
    const insecable = String.fromCodePoint(0x00a0);

    expect(formaterEuros(1290)).toBe(`12,90${insecable}€`);
    expect(formaterEuros(0)).toBe(`0,00${insecable}€`);
    expect(formaterEuros(100000)).toBe(`1${insecable}000,00${insecable}€`);
  });

  it('refuse un montant qui n’est pas un entier de centimes', () => {
    expect(() => formaterEuros(12.9)).toThrow(TypeError);
    expect(() => formaterEuros(Number.NaN)).toThrow(TypeError);
  });
});

describe('centimesDepuisEuros', () => {
  it('lit les formes qu’un marchand écrit vraiment', () => {
    expect(centimesDepuisEuros('12,90')).toBe(1290);
    expect(centimesDepuisEuros('12.90')).toBe(1290);
    expect(centimesDepuisEuros('12')).toBe(1200);
    expect(centimesDepuisEuros('0')).toBe(0);
    expect(centimesDepuisEuros('0,05')).toBe(5);
  });

  it('complète une décimale unique À DROITE : 12,9 vaut 12,90', () => {
    expect(centimesDepuisEuros('12,9')).toBe(1290);
    expect(centimesDepuisEuros('12,09')).toBe(1209);
  });

  it('ne dérive jamais, là où la multiplication flottante dériverait', () => {
    /* Les quatre valeurs pour lesquelles `Number(x) * 100` ne rend pas l'entier. */
    expect(centimesDepuisEuros('12,90')).toBe(1290);
    expect(centimesDepuisEuros('8,20')).toBe(820);
    expect(centimesDepuisEuros('1,10')).toBe(110);
    expect(centimesDepuisEuros('0,29')).toBe(29);
  });

  it('ignore les espaces de toute nature et le symbole monétaire', () => {
    const insecable = String.fromCodePoint(0x00a0);

    expect(centimesDepuisEuros('  12,90  ')).toBe(1290);
    expect(centimesDepuisEuros(`12,90${insecable}€`)).toBe(1290);
    expect(centimesDepuisEuros('1 234,50')).toBe(123450);
  });

  it('refuse ce qui n’est pas un prix', () => {
    expect(centimesDepuisEuros('')).toBeNull();
    expect(centimesDepuisEuros('abc')).toBeNull();
    expect(centimesDepuisEuros('12,')).toBeNull();
    expect(centimesDepuisEuros(',90')).toBeNull();
    expect(centimesDepuisEuros('12,905')).toBeNull();
    expect(centimesDepuisEuros('-3')).toBeNull();
    expect(centimesDepuisEuros('1e3')).toBeNull();
    expect(centimesDepuisEuros('12,90,10')).toBeNull();
    expect(centimesDepuisEuros('12345678')).toBeNull();
  });

  it('accepte la borne haute des sept chiffres', () => {
    expect(centimesDepuisEuros('9999999,99')).toBe(999999999);
  });
});

describe('eurosDepuisCentimes', () => {
  it('écrit la valeur telle qu’un champ de saisie l’attend', () => {
    expect(eurosDepuisCentimes(1290)).toBe('12,90');
    expect(eurosDepuisCentimes(0)).toBe('0,00');
    expect(eurosDepuisCentimes(5)).toBe('0,05');
    expect(eurosDepuisCentimes(999999999)).toBe('9999999,99');
  });

  it('fait l’aller-retour sans perte', () => {
    for (const centimes of [0, 1, 5, 99, 100, 560, 1290, 5400, 123450]) {
      expect(centimesDepuisEuros(eurosDepuisCentimes(centimes))).toBe(centimes);
    }
  });

  it('refuse un montant qui n’est pas un entier positif de centimes', () => {
    expect(() => eurosDepuisCentimes(12.5)).toThrow(TypeError);
    expect(() => eurosDepuisCentimes(-1)).toThrow(TypeError);
  });
});
