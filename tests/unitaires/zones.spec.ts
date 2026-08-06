import { describe, expect, it } from 'vitest';

import { zoneDepuisCodePostal } from '@/lib/zones';

/**
 * La conversion code postal → zone.
 *
 * Ce que ces tests protègent vraiment, ce n'est pas la fonction — elle tient en
 * douze lignes — mais les quatre pièges qu'elle désamorce, et qui reviendraient
 * à la première réécriture « pour simplifier » : la saisie sale, le faux ami
 * « 2A/2B », la chaîne vide et la frontière outre-mer.
 */
describe('zoneDepuisCodePostal', () => {
  describe('Corse — tous les codes commencent par 20', () => {
    it('reconnaît Ajaccio (20000)', () => {
      expect(zoneDepuisCodePostal('20000')).toBe('corse');
    });

    it('reconnaît Biguglia (20620)', () => {
      expect(zoneDepuisCodePostal('20620')).toBe('corse');
    });

    it('reconnaît Bastia (20200), en Haute-Corse et non en « 2B »', () => {
      expect(zoneDepuisCodePostal('20200')).toBe('corse');
    });

    it('refuse « 2A000 » : 2A est un numéro de département, pas un code postal', () => {
      expect(zoneDepuisCodePostal('2A000')).toBeNull();
    });

    it('refuse « 2B000 » pour la même raison', () => {
      expect(zoneDepuisCodePostal('2B000')).toBeNull();
    });
  });

  describe('Outre-mer — préfixes 971 à 978', () => {
    it('reconnaît la Guadeloupe (97100)', () => {
      expect(zoneDepuisCodePostal('97100')).toBe('outre-mer');
    });

    it('reconnaît La Réunion (97400)', () => {
      expect(zoneDepuisCodePostal('97400')).toBe('outre-mer');
    });

    it('reconnaît Saint-Martin (97800), borne haute des préfixes couverts', () => {
      expect(zoneDepuisCodePostal('97800')).toBe('outre-mer');
    });

    it('reconnaît la Guyane (97300)', () => {
      expect(zoneDepuisCodePostal('97300')).toBe('outre-mer');
    });
  });

  describe('Métropole — tout le reste des codes bien formés', () => {
    it('reconnaît Paris 11e (75011)', () => {
      expect(zoneDepuisCodePostal('75011')).toBe('metropole');
    });

    it('reconnaît Bourg-en-Bresse (01000), zéro initial compris', () => {
      expect(zoneDepuisCodePostal('01000')).toBe('metropole');
    });

    it('reconnaît un code proche de la Corse sans en être (21000)', () => {
      expect(zoneDepuisCodePostal('21000')).toBe('metropole');
    });

    it('reconnaît un code proche de l’outre-mer sans en être (96000)', () => {
      expect(zoneDepuisCodePostal('96000')).toBe('metropole');
    });

    /**
     * Limite assumée et documentée dans `src/lib/zones.ts` : la démonstration
     * n'a que trois zones (décision D9), les collectivités du Pacifique ne sont
     * donc pas distinguées. Le test fige le comportement réel plutôt que de le
     * laisser dériver en silence — c'est ce qui rend l'écart repérable le jour
     * où une quatrième zone sera ajoutée.
     */
    it('classe 98800 (Nouméa) en métropole — limite assumée de la démonstration', () => {
      expect(zoneDepuisCodePostal('98800')).toBe('metropole');
    });
  });

  describe('Saisies qui n’en sont pas', () => {
    it('refuse quatre chiffres (7501)', () => {
      expect(zoneDepuisCodePostal('7501')).toBeNull();
    });

    it('refuse six chiffres (750110)', () => {
      expect(zoneDepuisCodePostal('750110')).toBeNull();
    });

    it('refuse une chaîne de lettres (abcde)', () => {
      expect(zoneDepuisCodePostal('abcde')).toBeNull();
    });

    it('refuse la chaîne vide', () => {
      expect(zoneDepuisCodePostal('')).toBeNull();
    });

    it('refuse une chaîne d’espaces seules', () => {
      expect(zoneDepuisCodePostal('     ')).toBeNull();
    });

    it('refuse une espace au milieu (75 011) : ce n’est pas un code postal', () => {
      expect(zoneDepuisCodePostal('75 011')).toBeNull();
    });
  });

  describe('Tolérance à la saisie sale', () => {
    it('accepte les espaces de bordure (« 75011 » collé avec ses marges)', () => {
      expect(zoneDepuisCodePostal(' 75011 ')).toBe('metropole');
    });

    it('accepte une tabulation et un retour à la ligne collés', () => {
      expect(zoneDepuisCodePostal('\t20000\n')).toBe('corse');
    });

    it('accepte les marges autour d’un code d’outre-mer', () => {
      expect(zoneDepuisCodePostal('  97400  ')).toBe('outre-mer');
    });
  });
});
