import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import { projeterPourMarchand } from '@/lib/gestion/projection-marchand';
import { LIBELLE_FAMILLE } from '@/lib/types';

/**
 * LA PROJECTION DE L'ESPACE DE GESTION.
 *
 * Ce que ce fichier vérifie n'est pas « la fonction recopie des champs » mais
 * les DEUX raisons d'être de cette seconde projection (voir son en-tête) :
 *
 * 1. Elle garde la STRUCTURE du catalogue — quinze produits portant leurs
 *    formats — là où la projection du panier aplatit en vingt-trois articles.
 *    Un tableau de gestion qui montrerait trois fois l'huile d'olive au lieu
 *    d'une ligne à trois formats serait illisible.
 * 2. Elle NE PORTE PAS ce qu'aucun écran de gestion n'affiche. Les phrases de
 *    rétractation et les allergènes pèsent plusieurs centaines de signes par
 *    article, et voyageraient dans la charge utile de chaque page de gestion.
 *    Le test l'exige explicitement, parce que c'est le genre de champ qu'on
 *    rajoute « au cas où » six mois plus tard.
 */

const PROJECTION = projeterPourMarchand(CATALOGUE);

describe('projeterPourMarchand', () => {
  it('rend un objet par produit, pas un par format', () => {
    expect(PROJECTION).toHaveLength(CATALOGUE.length);
    expect(PROJECTION.map((produit) => produit.slug)).toEqual(
      CATALOGUE.map((produit) => produit.slug),
    );
  });

  it('conserve les formats sous leur produit', () => {
    const total = PROJECTION.reduce(
      (compte, produit) => compte + produit.variantes.length,
      0,
    );

    expect(total).toBe(
      CATALOGUE.reduce((compte, produit) => compte + produit.variantes.length, 0),
    );
  });

  it('résout le libellé de famille : l’écran n’a pas à connaître la table', () => {
    for (const [rang, produit] of PROJECTION.entries()) {
      const source = CATALOGUE[rang];

      expect(produit.famille).toBe(LIBELLE_FAMILLE[source?.famille ?? 'coffrets']);
      expect(produit.famille).not.toBe(source?.famille);
    }
  });

  it('recopie exactement les cinq valeurs que l’écran édite ou affiche', () => {
    for (const [rang, produit] of PROJECTION.entries()) {
      const source = CATALOGUE[rang];

      expect(produit.nom).toBe(source?.nom);
      expect(produit.resume).toBe(source?.resume);
      expect(produit.miseEnAvant).toBe(source?.miseEnAvant);

      for (const [position, variante] of produit.variantes.entries()) {
        const origine = source?.variantes[position];

        expect(variante.sku).toBe(origine?.sku);
        expect(variante.format).toBe(origine?.format);
        expect(variante.prixCentimes).toBe(origine?.prixCentimes);
        expect(variante.poidsGrammes).toBe(origine?.poidsGrammes);
        expect(variante.stock).toBe(origine?.stock);
      }
    }
  });

  it('NE PORTE PAS ce qu’aucun écran de gestion n’affiche', () => {
    for (const produit of PROJECTION) {
      const champs = Object.keys(produit);

      expect(champs.sort()).toEqual(
        ['famille', 'miseEnAvant', 'nom', 'resume', 'slug', 'variantes'].sort(),
      );

      for (const variante of produit.variantes) {
        expect(Object.keys(variante).sort()).toEqual(
          ['format', 'poidsGrammes', 'prixCentimes', 'sku', 'stock'].sort(),
        );
      }
    }
  });

  it('rend un tableau vide sur un catalogue vide', () => {
    expect(projeterPourMarchand([])).toEqual([]);
  });
});
