import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import {
  suggestionsPourEnsemble,
  suggestionsPourProduit,
  type CandidatSuggestion,
} from '@/lib/suggestions';
import { type Produit } from '@/lib/types';

/**
 * LES SUGGESTIONS — et pourquoi ce module entre au périmètre de couverture.
 *
 * La règle d'admission écrite dans `vitest.config.mts` est : « ils décident
 * d'un CHIFFRE qu'on montre à quelqu'un, et un chiffre faux n'y serait visible
 * nulle part ailleurs ». Elle s'applique mot pour mot. Ce module décide quel
 * produit — donc quel prix — s'affiche dans un bloc commercial, à l'instant
 * exact de la décision d'achat. Une branche perdue publierait un produit EN
 * RUPTURE avec son prix, et cette paire n'existe sur aucune autre page du site :
 * aucun écran ne la contredirait.
 *
 * Surtout : DEUX DES QUATRE BRANCHES NE SE DÉCLENCHENT QUE SUR QUATRE FICHES
 * SUR QUINZE. Les familles à un ou deux membres sont celles qui empruntent le
 * repli, c'est-à-dire la moitié de la valeur du lot. Sans seuil à 100 % DE
 * BRANCHES, ce sont exactement les cas que personne ne regarderait.
 */

/** Un catalogue minuscule, écrit à la main : les cas de bord s'y voient. */
function fabriquer(
  slug: string,
  famille: Produit['famille'],
  stock: number,
  disponible?: boolean,
): Produit {
  const base = CATALOGUE[0];
  if (base === undefined) throw new Error('catalogue vide');

  return {
    ...base,
    slug,
    famille,
    variantes: [{ ...base.variantes[0], sku: `SKU-${slug}`, stock }],
    ...(disponible === undefined ? {} : { disponible }),
  } as Produit;
}

describe('suggestionsPourProduit', () => {
  describe('la roue — le produit courant ne peut pas revenir', () => {
    it('rend deux voisins de la même famille quand elle en a assez', () => {
      const petit = [
        fabriquer('a', 'huiles-et-vinaigres', 5),
        fabriquer('b', 'huiles-et-vinaigres', 5),
        fabriquer('c', 'huiles-et-vinaigres', 5),
      ];

      expect(suggestionsPourProduit(petit, 'a', 2).map((p) => p.slug)).toEqual(['b', 'c']);
    });

    it('n’inclut JAMAIS le produit demandé, même au milieu de sa famille', () => {
      const petit = [
        fabriquer('a', 'huiles-et-vinaigres', 5),
        fabriquer('b', 'huiles-et-vinaigres', 5),
        fabriquer('c', 'huiles-et-vinaigres', 5),
      ];

      for (const slug of ['a', 'b', 'c']) {
        expect(suggestionsPourProduit(petit, slug, 3).map((p) => p.slug)).not.toContain(slug);
      }
    });

    it('repart au début de l’anneau quand le produit est le dernier', () => {
      const petit = [
        fabriquer('a', 'infusions', 5),
        fabriquer('b', 'infusions', 5),
        fabriquer('c', 'infusions', 5),
      ];

      expect(suggestionsPourProduit(petit, 'c', 2).map((p) => p.slug)).toEqual(['a', 'b']);
    });
  });

  describe('le rang — même famille d’abord, puis le repli', () => {
    it('met la même famille devant, quel que soit l’ordre du catalogue', () => {
      const petit = [
        fabriquer('courant', 'frais', 5),
        fabriquer('etranger', 'infusions', 5),
        fabriquer('cousin', 'frais', 5),
      ];

      expect(suggestionsPourProduit(petit, 'courant', 2).map((p) => p.slug)).toEqual([
        'cousin',
        'etranger',
      ]);
    });

    it('rend un repli entier quand la famille est solitaire', () => {
      const petit = [
        fabriquer('seul', 'epicerie-seche', 5),
        fabriquer('voisin', 'infusions', 5),
        fabriquer('suivant', 'coffrets', 5),
      ];

      expect(suggestionsPourProduit(petit, 'seul', 2).map((p) => p.slug)).toEqual([
        'voisin',
        'suivant',
      ]);
    });
  });

  describe('le tamis — rien qu’on ne puisse acheter', () => {
    it('écarte un produit retiré de la vente et prend le suivant de la roue', () => {
      const petit = [
        fabriquer('courant', 'frais', 5),
        fabriquer('retire', 'frais', 5, false),
        fabriquer('bon', 'frais', 5),
      ];

      expect(suggestionsPourProduit(petit, 'courant', 2).map((p) => p.slug)).toEqual(['bon']);
    });

    it('écarte un produit dont TOUTES les variantes sont à zéro', () => {
      const petit = [fabriquer('courant', 'frais', 5), fabriquer('epuise', 'frais', 0)];

      expect(suggestionsPourProduit(petit, 'courant', 2)).toEqual([]);
    });

    it('RETIENT un produit dont UNE SEULE variante a du stock — la borne opposée', () => {
      const base = fabriquer('mixte', 'frais', 0);
      const mixte = {
        ...base,
        variantes: [base.variantes[0], { ...base.variantes[0], sku: 'SKU-mixte-2', stock: 3 }],
      } as Produit;
      const petit = [fabriquer('courant', 'frais', 5), mixte];

      expect(suggestionsPourProduit(petit, 'courant', 2).map((p) => p.slug)).toEqual(['mixte']);
    });
  });

  describe('les bornes — la fonction reste totale', () => {
    it('rend un tableau vide sur un slug inconnu du catalogue', () => {
      expect(suggestionsPourProduit(CATALOGUE, 'produit-qui-n-existe-pas', 2)).toEqual([]);
    });

    it('rend un tableau vide quand on ne demande rien', () => {
      expect(suggestionsPourProduit(CATALOGUE, 'miel-chataignier', 0)).toEqual([]);
    });

    it('rend MOINS que demandé plutôt que d’inventer', () => {
      const petit = [fabriquer('a', 'frais', 5), fabriquer('b', 'frais', 5)];

      expect(suggestionsPourProduit(petit, 'a', 5)).toHaveLength(1);
    });

    it('est déterministe : deux appels rendent la même liste', () => {
      const premier = suggestionsPourProduit(CATALOGUE, 'miel-chataignier', 2);
      const second = suggestionsPourProduit(CATALOGUE, 'miel-chataignier', 2);

      expect(premier.map((p) => p.slug)).toEqual(second.map((p) => p.slug));
    });
  });

  /*
   * LE BALAYAGE DU CATALOGUE RÉEL — le cas qui attrape les familles solitaires.
   *
   * Les cas ci-dessus tournent sur des catalogues fabriqués, où l'on choisit ce
   * qu'on veut prouver. Celui-ci tourne sur les quinze fiches livrées, et c'est
   * lui qui dirait qu'une famille du catalogue ne peut plus fournir ses deux
   * suggestions — le jour où quelqu'un retirera un produit.
   */
  describe('sur les quinze fiches réellement livrées', () => {
    it('chacune rend exactement deux suggestions, achetables, et jamais elle-même', () => {
      for (const produit of CATALOGUE) {
        const suggestions = suggestionsPourProduit(CATALOGUE, produit.slug, 2);

        expect(suggestions, `${produit.slug} doit avoir deux suggestions`).toHaveLength(2);

        for (const suggestion of suggestions) {
          expect(suggestion.slug).not.toBe(produit.slug);
          expect(suggestion.disponible).not.toBe(false);
          expect(suggestion.variantes.some((variante) => variante.stock > 0)).toBe(true);
        }
      }
    });
  });
});

describe('suggestionsPourEnsemble', () => {
  /** Un pool minuscule : les cas de bord s'y lisent. */
  const pool: CandidatSuggestion[] = [
    { slug: 'huile-a', famille: 'huiles-et-vinaigres' },
    { slug: 'huile-b', famille: 'huiles-et-vinaigres' },
    { slug: 'miel-a', famille: 'miels-et-confitures' },
    { slug: 'miel-b', famille: 'miels-et-confitures' },
    { slug: 'infusion', famille: 'infusions' },
  ];

  describe('l’exclusion — rien de ce qui est déjà au panier', () => {
    it('n’en propose aucun des articles du panier', () => {
      const rendu = suggestionsPourEnsemble(pool, ['huile-a', 'miel-a'], 5).map((c) => c.slug);

      expect(rendu).not.toContain('huile-a');
      expect(rendu).not.toContain('miel-a');
    });

    it('rend un tableau VIDE quand tout le pool est au panier', () => {
      const tous = pool.map((c) => c.slug);

      expect(suggestionsPourEnsemble(pool, tous, 3)).toEqual([]);
    });
  });

  describe('le rang — les familles déjà au panier d’abord', () => {
    it('propose la famille du panier avant les autres', () => {
      /* Panier : un miel. Les autres miels doivent passer devant les huiles. */
      const rendu = suggestionsPourEnsemble(pool, ['miel-a'], 4).map((c) => c.slug);

      expect(rendu[0]).toBe('miel-b');
    });

    it('mêle plusieurs familles du panier, sans en oublier', () => {
      const rendu = suggestionsPourEnsemble(pool, ['huile-a', 'miel-a'], 4);
      const deuxPremiers = rendu.slice(0, 2).map((c) => c.famille);

      expect(deuxPremiers).not.toContain('infusions');
    });
  });

  describe('la roue — elle s’amorce après le DERNIER ajouté', () => {
    it('change de proposition quand le dernier article change', () => {
      const apresHuile = suggestionsPourEnsemble(pool, ['infusion', 'huile-a'], 5).map(
        (c) => c.slug,
      );
      const apresMiel = suggestionsPourEnsemble(pool, ['infusion', 'miel-a'], 5).map(
        (c) => c.slug,
      );

      expect(apresHuile).not.toEqual(apresMiel);
    });

    it('repart au début du pool quand le dernier article lui est inconnu', () => {
      /* Un produit retiré de la vente depuis qu'il est entré au panier :
         il n'est plus dans le pool, mais il reste dans les lignes. */
      const rendu = suggestionsPourEnsemble(pool, ['produit-retire'], 2);

      expect(rendu).toHaveLength(2);
      expect(rendu[0]?.slug).toBe('huile-a');
    });
  });

  describe('les bornes — la fonction reste totale', () => {
    it('rend le début du pool sur un panier vide, plutôt que de jeter', () => {
      expect(suggestionsPourEnsemble(pool, [], 2).map((c) => c.slug)).toEqual([
        'huile-a',
        'huile-b',
      ]);
    });

    it('rend un tableau vide quand on ne demande rien', () => {
      expect(suggestionsPourEnsemble(pool, ['huile-a'], 0)).toEqual([]);
    });

    it('rend MOINS que demandé plutôt que d’inventer', () => {
      expect(suggestionsPourEnsemble(pool, ['huile-a', 'huile-b', 'miel-a'], 5)).toHaveLength(2);
    });

    it('rend un tableau vide sur un pool vide', () => {
      expect(suggestionsPourEnsemble([], ['huile-a'], 3)).toEqual([]);
    });

    it('est déterministe : deux appels rendent la même liste', () => {
      const a = suggestionsPourEnsemble(pool, ['miel-a'], 3).map((c) => c.slug);
      const b = suggestionsPourEnsemble(pool, ['miel-a'], 3).map((c) => c.slug);

      expect(a).toEqual(b);
    });
  });

  /*
   * LE POOL RÉEL — le cas qui dirait qu'une famille du catalogue ne peut plus
   * fournir, le jour où quelqu'un retire un produit.
   */
  describe('sur le catalogue réellement livré', () => {
    const poolReel: CandidatSuggestion[] = CATALOGUE.filter(
      (p) => p.disponible !== false && p.variantes.some((v) => v.stock > 0),
    ).map((p) => ({ slug: p.slug, famille: p.famille }));

    it('rend trois suggestions pour un panier d’un seul article, quel qu’il soit', () => {
      for (const produit of CATALOGUE) {
        const rendu = suggestionsPourEnsemble(poolReel, [produit.slug], 3);

        expect(rendu, `${produit.slug} doit avoir trois suggestions`).toHaveLength(3);
        expect(rendu.map((c) => c.slug)).not.toContain(produit.slug);
      }
    });
  });
});
