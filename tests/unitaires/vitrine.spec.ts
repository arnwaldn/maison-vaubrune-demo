import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import { trouverProduitParSlug } from '@/lib/catalogue';
import { FAMILLES, type Produit } from '@/lib/types';
import { fondImage, ligneDeGarde, rangInventaire, styleDeFamille } from '@/lib/vitrine';

/**
 * LA NOMENCLATURE DE LA VITRINE — quatre fonctions, et une seule question.
 *
 * Ce module entre au périmètre de couverture pour la même raison que le
 * balisage JSON-LD en C8 : il produit des NOMBRES destinés à l'œil du visiteur.
 * Un rang d'inventaire faux, une DDM lue sur le mauvais bras de l'union
 * discriminée, un poids pris sur la mauvaise variante — rien de tout cela ne se
 * verrait ailleurs, et la garde d'honnêteté (décision D30) ne sait pas lire une
 * donnée juste rendue au mauvais endroit.
 */

function obligatoire(slug: string): Produit {
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    throw new Error(`fiche absente du catalogue : ${slug}`);
  }

  return produit;
}

describe('rangInventaire', () => {
  it('rend la position RÉELLE dans le catalogue, sur deux chiffres', () => {
    expect(rangInventaire(CATALOGUE, 'huile-olive-premiere-pression')).toEqual({
      rang: '01',
      total: '15',
    });
  });

  it('compte à partir de un, et non de zéro', () => {
    const deuxieme = obligatoire(CATALOGUE[1]?.slug ?? '');

    expect(rangInventaire(CATALOGUE, deuxieme.slug)?.rang).toBe('02');
  });

  it('atteint le dernier rang sans le dépasser', () => {
    const dernier = obligatoire(CATALOGUE[CATALOGUE.length - 1]?.slug ?? '');
    const rang = rangInventaire(CATALOGUE, dernier.slug);

    expect(rang?.rang).toBe('15');
    expect(rang?.total).toBe('15');
  });

  /**
   * MIEUX VAUT NE RIEN AFFICHER QU'UN RANG FAUX. Un produit absent du catalogue
   * passé rendrait `-1` avec un calcul naïf, donc « N° 00 / 15 » à l'écran.
   */
  it('rend null pour un slug inconnu, plutôt qu’un rang inventé', () => {
    expect(rangInventaire(CATALOGUE, 'huile-de-schiste')).toBeNull();
  });

  it('les quinze rangs sont distincts et couvrent la série', () => {
    const rangs = CATALOGUE.map((produit) => rangInventaire(CATALOGUE, produit.slug)?.rang);

    expect(new Set(rangs).size).toBe(15);
  });
});

describe('ligneDeGarde', () => {
  it('donne le poids du PREMIER format, celui du « à partir de »', () => {
    const huile = obligatoire('huile-olive-premiere-pression');

    expect(ligneDeGarde(huile)[0]).toBe(`${String(huile.variantes[0].poidsGrammes)} g`);
  });

  it('dit la garde en mois pour un produit stable', () => {
    expect(ligneDeGarde(obligatoire('huile-olive-premiere-pression'))).toContain('garde 18 mois');
  });

  /**
   * L'UNION DISCRIMINÉE PAIE ICI : une DLC se compte en jours, une DDM en mois,
   * et les confondre donnerait « garde 21 mois » à un beurre qui tient trois
   * semaines.
   */
  it('dit la DLC en jours et la chaîne du froid pour un périssable', () => {
    const beurre = obligatoire('beurre-baratte-demi-sel');
    const segments = ligneDeGarde(beurre);

    expect(segments.some((segment) => segment.startsWith('dlc '))).toBe(true);
    expect(segments).toContain('chaîne du froid');
    expect(segments.some((segment) => segment.includes('garde'))).toBe(false);
  });

  it('n’annonce AUCUNE durée pour un produit scellé, faute d’en connaître une', () => {
    const scelle: Produit = {
      ...obligatoire('huile-olive-premiere-pression'),
      conservation: { type: 'scelle-hygiene' },
    };

    expect(ligneDeGarde(scelle)).toEqual(['520 g', 'scellé']);
  });

  it('rend au moins deux segments pour chacune des quinze fiches', () => {
    for (const produit of CATALOGUE) {
      expect(ligneDeGarde(produit).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('styleDeFamille', () => {
  it('traduit le nom de famille en nom de scheme — les deux ne coïncident pas', () => {
    expect(styleDeFamille('huiles-et-vinaigres')).toEqual({
      '--scheme-fond': 'var(--scheme-huiles-fond)',
      '--scheme-trait': 'var(--scheme-huiles-trait)',
    });
  });

  it('couvre les sept familles, sans exception ni valeur de repli', () => {
    for (const famille of FAMILLES) {
      const style = styleDeFamille(famille) as Record<string, string>;

      expect(style['--scheme-fond']).toMatch(/^var\(--scheme-[a-z-]+-fond\)$/);
      expect(style['--scheme-trait']).toMatch(/^var\(--scheme-[a-z-]+-trait\)$/);
    }
  });
});

describe('fondImage', () => {
  /**
   * LA FORME COMPTE : c'est elle qui laisse le navigateur choisir l'AVIF quand
   * il le lit et le JPEG sinon, sans script et sans requête perdue — ce que
   * `<picture>` fait pour une balise et que `image-set()` fait pour un fond.
   */
  it('propose l’AVIF puis le repli JPEG, chacun avec son type déclaré', () => {
    expect(fondImage('produits', 'miel-chataignier', 'ambiance', 320)).toBe(
      'image-set(url("/produits/miel-chataignier/ambiance-320.avif") type("image/avif"), ' +
        'url("/produits/miel-chataignier/ambiance-320.jpg") type("image/jpeg"))',
    );
  });

  it('recompose le chemin depuis la racine, le dossier, la vue et la largeur', () => {
    expect(fondImage('editorial', 'infusions', 'macro', 1024)).toContain(
      '/editorial/infusions/macro-1024.avif',
    );
  });
});
