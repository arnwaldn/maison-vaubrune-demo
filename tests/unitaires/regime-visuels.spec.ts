import { describe, expect, it } from 'vitest';

import { controlerVisuels } from '../../scripts/regime-visuels.mjs';

/**
 * LE RÉGIME (b) DES VIGNETTES, ÉPROUVÉ SUR UN CATALOGUE SYNTHÉTIQUE.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ces cas ne peuvent PAS passer par la garde complète
 * ---------------------------------------------------------------------------
 *
 * `npm run verifier-catalogue` valide le catalogue avec un schéma zod
 * `strictObject`, c'est-à-dire un schéma qui REFUSE toute clé qu'il ne connaît
 * pas. Le champ `visuel` n'y sera déclaré qu'en C14. Lancer la garde sur un
 * catalogue qui le porte échouerait donc à la validation, bien avant
 * d'atteindre le contrôle des vignettes — on prouverait la sévérité du schéma,
 * pas la justesse de la règle.
 *
 * La revue de C11 a relevé le vrai problème que cela posait : écrit à
 * l'intérieur de la garde, le régime (b) était du code que RIEN n'exécutait et
 * que rien ne POUVAIT exécuter. Une règle dans cet état n'est pas une règle,
 * c'est une intention — et on en découvre les fautes le jour où on comptait
 * dessus, c'est-à-dire au pire moment.
 *
 * La logique vit donc à part (`scripts/regime-visuels.mjs`), pure, et ces cas
 * lui donnent les catalogues que le catalogue réel ne pourra pas former avant
 * C14.
 */

/** Un produit réduit à ce que le régime (b) regarde, et rien de plus. */
function produit(slug: string, alt?: string | null): Record<string, unknown> {
  if (alt === undefined) {
    return { slug };
  }

  return { slug, visuel: { principal: { alt } } };
}

describe('régime (b) — les alternatives textuelles des visuels', () => {
  it('se tait tant qu’aucun produit ne porte de visuel', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier'),
      produit('huile-olive-premiere-pression'),
    ]);

    expect(verdict.anomalies).toEqual([]);
    expect(verdict.illustres).toBe(0);
  });

  it('laisse passer des alternatives non vides et toutes distinctes', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier', 'Pot de miel de châtaignier, ambre foncé'),
      produit('huile-olive-premiere-pression', 'Bouteille d’huile d’olive, verre teinté'),
      produit('lentilles-blondes-plateau', 'Sachet de lentilles blondes'),
    ]);

    expect(verdict.anomalies).toEqual([]);
    expect(verdict.illustres).toBe(3);
    expect(verdict.alternatives).toBe(3);
  });

  it('échoue sur deux produits qui partagent la même alternative', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier', 'Photographie du produit'),
      produit('huile-olive-premiere-pression', 'Photographie du produit'),
    ]);

    expect(verdict.anomalies).toHaveLength(1);
    expect(verdict.anomalies[0]).toContain('huile-olive-premiere-pression');
    expect(verdict.anomalies[0]).toContain('miel-chataignier');
    expect(verdict.anomalies[0]).toContain('ne se distinguent pas à l’oreille');
    /* Une seule alternative RETENUE pour deux produits : c'est exactement le
       défaut que le régime (b) existe pour attraper, et celui qu'aucun audit
       automatique d'accessibilité ne signale — le texte est correct, il est
       seulement inutile. */
    expect(verdict.alternatives).toBe(1);
  });

  it('ne se laisse pas contourner par la casse ni par une espace', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier', 'Pot de miel'),
      produit('huile-olive-premiere-pression', '  POT DE MIEL '),
    ]);

    /* Deux alternatives que l'œil distingue et que l'oreille confond. La
       comparaison se fait donc sur la forme rognée et en minuscules. */
    expect(verdict.anomalies).toHaveLength(1);
  });

  it('échoue sur une alternative vide, absente ou faite d’espaces', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier', ''),
      produit('huile-olive-premiere-pression', '   '),
      produit('lentilles-blondes-plateau', null),
      { slug: 'confit-oignons-vin-doux', visuel: { principal: {} } },
    ]);

    expect(verdict.anomalies).toHaveLength(4);

    for (const anomalie of verdict.anomalies) {
      expect(anomalie).toContain('vide ou absent');
    }

    /* Aucune alternative valable n'a été retenue : le compteur ne doit pas
       avoir été alimenté par les fautes qu'on vient de compter. */
    expect(verdict.alternatives).toBe(0);
  });

  it('signale CHAQUE doublon, et pas seulement le premier', () => {
    const verdict = controlerVisuels([
      produit('miel-chataignier', 'Le produit'),
      produit('huile-olive-premiere-pression', 'Le produit'),
      produit('lentilles-blondes-plateau', 'Le produit'),
    ]);

    /* Une garde qui s'arrête au premier défaut fait faire trois tours de
       correction là où un seul suffirait. */
    expect(verdict.anomalies).toHaveLength(2);
  });
});
