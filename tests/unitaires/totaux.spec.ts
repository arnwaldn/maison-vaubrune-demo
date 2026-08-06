import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import {
  nombreDePiecesAChoisir,
  projeterCatalogue,
  stocksDepuisCatalogue,
  trouverArticle,
  unionAllergenes,
} from '@/lib/panier/catalogue-panier';
import type { LignePanier } from '@/lib/panier/reducteur';
import { calculerTotaux } from '@/lib/panier/totaux';
import type { Produit } from '@/lib/types';

/**
 * LE TOTAL DU PANIER, et la projection qui l'alimente.
 *
 * Les deux modules sont éprouvés dans le même fichier parce qu'ils décrivent
 * une seule chose vue de deux côtés : le prix, le poids et le régime de
 * rétractation que le panier retient pour un SKU. Les séparer obligerait à
 * répéter le même montage de catalogue deux fois.
 *
 * Les montants ci-dessous sont ceux du catalogue LIVRÉ. Ils sont écrits en
 * clair, jamais recalculés depuis le catalogue dans le test lui-même : un test
 * qui refait le calcul du code qu'il vérifie ne vérifie rien.
 *
 *   MV-HV-OLI-50CL  huile d'olive 50 cl   22,50 €   950 g   stock 28
 *   MV-FR-BRE-250G  fromage de brebis     11,90 €   400 g   stock 9   PÉRISSABLE
 *   MV-HV-VIN-50CL  vinaigre de cidre      9,80 €   940 g   stock 46
 *   MV-CO-LIB-3P    coffret 3 pièces      34,00 €  1 400 g  stock 22  PERSONNALISABLE
 *
 * Barème métropole : 4,90 € jusqu'à 1 kg, 6,90 € jusqu'à 3 kg, 9,50 € jusqu'à
 * 10 kg, 14,90 € jusqu'à 30 kg ; isotherme 6,00 € ; franco à 69,00 €.
 */

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

const HUILE_50 = 'MV-HV-OLI-50CL';
const FROMAGE = 'MV-FR-BRE-250G';
const VINAIGRE = 'MV-HV-VIN-50CL';
const COFFRET_3 = 'MV-CO-LIB-3P';

const PIECES = ['MV-MC-CHA-250G', 'MV-CS-TER-180G', 'MV-ES-LEN-500G'];

/* -------------------------------------------------------------------------- */
/* La projection du catalogue                                                  */
/* -------------------------------------------------------------------------- */

describe('projeterCatalogue', () => {
  it('aplatit les quinze produits en vingt-trois articles', () => {
    expect(CATALOGUE_PANIER).toHaveLength(23);
  });

  it('reprend le prix, le poids et le stock de la variante', () => {
    const article = trouverArticle(CATALOGUE_PANIER, HUILE_50);

    expect(article).toMatchObject({
      slug: 'huile-olive-premiere-pression',
      prixCentimes: 2250,
      poidsGrammes: 950,
      stock: 28,
      perissable: false,
      personnalisable: false,
      fondementRetractation: null,
      piecesRequises: null,
    });
  });

  it('marque le fromage périssable et sans droit de rétractation (L. 221-28, 4°)', () => {
    const article = trouverArticle(CATALOGUE_PANIER, FROMAGE);

    expect(article?.perissable).toBe(true);
    expect(article?.fondementRetractation).toBe('L221-28-4');
    expect(article?.phraseRetractation).toContain('4°');
  });

  it('marque l’infusion scellée (L. 221-28, 5°)', () => {
    expect(trouverArticle(CATALOGUE_PANIER, 'MV-IN-SOI-60G')?.fondementRetractation).toBe(
      'L221-28-5',
    );
  });

  it('rend `undefined` sur un SKU inconnu', () => {
    expect(trouverArticle(CATALOGUE_PANIER, 'MV-XX-INEXISTANT')).toBeUndefined();
  });
});

describe('nombreDePiecesAChoisir', () => {
  it('lit trois et cinq dans les deux formats du coffret personnalisable', () => {
    expect(trouverArticle(CATALOGUE_PANIER, COFFRET_3)?.piecesRequises).toBe(3);
    expect(trouverArticle(CATALOGUE_PANIER, 'MV-CO-LIB-5P')?.piecesRequises).toBe(5);
  });

  it('rend `null` sur un coffret composé d’avance, qui ne se choisit pas', () => {
    expect(trouverArticle(CATALOGUE_PANIER, 'MV-CO-DIM-4P')?.piecesRequises).toBeNull();
  });

  it('rend `null` si le format d’un personnalisable ne commence pas par un nombre', () => {
    const bancal: Produit = {
      slug: 'coffret-bancal',
      nom: 'Coffret bancal',
      famille: 'coffrets',
      resume: 'Format sans nombre en tête, pour éprouver la lecture.',
      description: [],
      origine: 'nulle part',
      ingredients: [],
      allergenes: ['aucun'],
      conservation: { type: 'stable', ddmMois: 12 },
      conseilConservation: [],
      personnalisable: true,
      variantes: [
        {
          sku: 'MV-XX-BANCAL',
          format: 'pièces au choix',
          prixCentimes: 1000,
          poidsGrammes: 100,
          stock: 1,
        },
      ],
      miseEnAvant: false,
      illustration: { forme: 'coffret', teinte: 'olive' },
    };

    expect(nombreDePiecesAChoisir(bancal, bancal.variantes[0])).toBeNull();
    expect(projeterCatalogue([bancal])[0]?.piecesRequises).toBeNull();
  });
});

describe('stocksDepuisCatalogue', () => {
  it('rend une paire par SKU', () => {
    const stocks = stocksDepuisCatalogue(CATALOGUE_PANIER);

    expect(Object.keys(stocks)).toHaveLength(23);
    expect(stocks[HUILE_50]).toBe(28);
    expect(stocks[FROMAGE]).toBe(9);
  });
});

describe('unionAllergenes', () => {
  it('réunit les allergènes des pièces choisies, sans doublon', () => {
    expect(
      unionAllergenes(['MV-CS-TER-180G', 'MV-CS-OIG-110G'], CATALOGUE_PANIER),
    ).toEqual(['sulfites']);
  });

  it('écarte « aucun » dès qu’un allergène réel est présent', () => {
    expect(
      unionAllergenes(['MV-MC-CHA-250G', 'MV-CS-TER-180G'], CATALOGUE_PANIER),
    ).toEqual(['sulfites']);
  });

  it('rend « aucun » quand aucune pièce n’en porte', () => {
    expect(unionAllergenes(['MV-MC-CHA-250G'], CATALOGUE_PANIER)).toEqual(['aucun']);
  });

  it('rend « aucun » sur une sélection vide', () => {
    expect(unionAllergenes([], CATALOGUE_PANIER)).toEqual(['aucun']);
  });

  it('ignore une pièce absente du catalogue', () => {
    expect(
      unionAllergenes(['MV-XX-DISPARU', 'MV-ES-LEN-500G'], CATALOGUE_PANIER),
    ).toEqual(['gluten (traces éventuelles, rotation culturale)']);
  });
});

/* -------------------------------------------------------------------------- */
/* Le total                                                                    */
/* -------------------------------------------------------------------------- */

describe('calculerTotaux', () => {
  describe('panier vide', () => {
    const totaux = calculerTotaux([], CATALOGUE_PANIER, 'metropole');

    it('ne compte rien et ne facture rien', () => {
      expect(totaux.nbArticles).toBe(0);
      expect(totaux.sousTotalCentimes).toBe(0);
      expect(totaux.totalCentimes).toBe(0);
    });

    it('rend un port calculé à zéro, sans ligne de détail (décision D15)', () => {
      expect(totaux.expedition.statut).toBe('calcule');
      expect(totaux.expedition).toMatchObject({ fraisCentimes: 0, detail: [] });
    });

    it('n’a ni périssable, ni personnalisé, ni exception de rétractation', () => {
      expect(totaux.contientPerissable).toBe(false);
      expect(totaux.contientPersonnalise).toBe(false);
      expect(totaux.articlesSansRetractation).toEqual([]);
    });
  });

  describe('deux huiles 50 cl et un fromage, vers la métropole', () => {
    const lignes: readonly LignePanier[] = [
      { sku: HUILE_50, quantite: 2 },
      { sku: FROMAGE, quantite: 1 },
    ];
    const totaux = calculerTotaux(lignes, CATALOGUE_PANIER, 'metropole');

    it('compte trois articles pour deux lignes', () => {
      expect(totaux.nbArticles).toBe(3);
      expect(totaux.lignes).toHaveLength(2);
    });

    it('sous-total 56,90 € — 2 × 22,50 € + 11,90 €', () => {
      expect(totaux.sousTotalCentimes).toBe(5690);
      expect(totaux.lignes[0]?.sousTotalCentimes).toBe(4500);
      expect(totaux.lignes[1]?.sousTotalCentimes).toBe(1190);
    });

    it('2 300 g : tranche à 6,90 € + isotherme 6,00 € = 12,90 € de port', () => {
      expect(totaux.expedition).toMatchObject({
        statut: 'calcule',
        poidsTotalGrammes: 2300,
        fraisCentimes: 1290,
        francoApplique: false,
      });
    });

    it('total 69,80 €', () => {
      expect(totaux.totalCentimes).toBe(6980);
    });

    it('reste 12,10 € avant le franco de 69,00 €', () => {
      expect(totaux.expedition).toMatchObject({ resteAvantFrancoCentimes: 1210 });
    });

    it('signale le périssable et l’exception de rétractation du fromage', () => {
      expect(totaux.contientPerissable).toBe(true);
      expect(totaux.contientPersonnalise).toBe(false);
      expect(totaux.articlesSansRetractation).toHaveLength(1);
      expect(totaux.articlesSansRetractation[0]).toMatchObject({
        slug: 'fromage-fermier-brebis',
        nom: 'Fromage fermier de brebis',
        fondement: 'L221-28-4',
      });
      // La phrase vient de `regimeRetractation()`, jamais réécrite (D12).
      expect(totaux.articlesSansRetractation[0]?.phrase).toContain('L. 221-28, 4°');
    });
  });

  describe('le même panier, vers la Corse', () => {
    const totaux = calculerTotaux(
      [
        { sku: HUILE_50, quantite: 2 },
        { sku: FROMAGE, quantite: 1 },
      ],
      CATALOGUE_PANIER,
      'corse',
    );

    it('refuse l’expédition à cause du produit frais', () => {
      expect(totaux.expedition).toMatchObject({
        statut: 'impossible',
        motif: 'perissable-hors-metropole',
      });
    });

    it('n’a PAS de total : `null`, et non un total « hors port »', () => {
      expect(totaux.totalCentimes).toBeNull();
    });

    it('garde son sous-total et son article sans rétractation', () => {
      expect(totaux.sousTotalCentimes).toBe(5690);
      expect(totaux.articlesSansRetractation[0]?.fondement).toBe('L221-28-4');
    });
  });

  describe('franco de port atteint', () => {
    // 4 × 22,50 € = 90,00 €, au-dessus des 69,00 € du seuil métropole.
    const totaux = calculerTotaux(
      [{ sku: HUILE_50, quantite: 4 }],
      CATALOGUE_PANIER,
      'metropole',
    );

    it('ramène les frais à zéro et le marque', () => {
      expect(totaux.expedition).toMatchObject({
        statut: 'calcule',
        fraisCentimes: 0,
        francoApplique: true,
        resteAvantFrancoCentimes: 0,
      });
    });

    it('total = sous-total', () => {
      expect(totaux.sousTotalCentimes).toBe(9000);
      expect(totaux.totalCentimes).toBe(9000);
    });
  });

  describe('reste avant franco, au centime près', () => {
    it('un vinaigre à 9,80 € laisse 59,20 € à parcourir', () => {
      const totaux = calculerTotaux(
        [{ sku: VINAIGRE, quantite: 1 }],
        CATALOGUE_PANIER,
        'metropole',
      );

      expect(totaux.expedition).toMatchObject({ resteAvantFrancoCentimes: 5920 });
    });

    it('rend `null` en outre-mer, zone sans franco de port', () => {
      const totaux = calculerTotaux(
        [{ sku: VINAIGRE, quantite: 1 }],
        CATALOGUE_PANIER,
        'outre-mer',
      );

      expect(totaux.expedition).toMatchObject({ resteAvantFrancoCentimes: null });
    });
  });

  describe('coffret composé', () => {
    const totaux = calculerTotaux(
      [{ sku: COFFRET_3, quantite: 1, composition: PIECES }],
      CATALOGUE_PANIER,
      'metropole',
    );

    it('facture le prix FORFAITAIRE du format, pas la somme des pièces', () => {
      expect(totaux.sousTotalCentimes).toBe(3400);
    });

    it('retient le poids SAISI du format et non celui des pièces choisies', () => {
      expect(totaux.expedition).toMatchObject({ poidsTotalGrammes: 1400 });
    });

    it('le marque personnalisé et sans rétractation (L. 221-28, 3°)', () => {
      expect(totaux.contientPersonnalise).toBe(true);
      expect(totaux.articlesSansRetractation[0]?.fondement).toBe('L221-28-3');
    });
  });

  describe('deux formats du même produit sans rétractation', () => {
    it('ne disent la mention QU’UNE FOIS, dédupliquée par produit', () => {
      const totaux = calculerTotaux(
        [
          { sku: COFFRET_3, quantite: 1, composition: PIECES },
          { sku: 'MV-CO-LIB-5P', quantite: 1, composition: PIECES },
        ],
        CATALOGUE_PANIER,
        'metropole',
      );

      expect(totaux.articlesSansRetractation).toHaveLength(1);
      expect(totaux.articlesSansRetractation[0]?.slug).toBe('coffret-composez-le-votre');
    });
  });

  describe('ligne dont le SKU n’existe plus', () => {
    it('est ignorée, sans faire échouer le calcul du reste', () => {
      const totaux = calculerTotaux(
        [
          { sku: 'MV-XX-DISPARU', quantite: 5 },
          { sku: VINAIGRE, quantite: 1 },
        ],
        CATALOGUE_PANIER,
        'metropole',
      );

      expect(totaux.lignes).toHaveLength(1);
      expect(totaux.nbArticles).toBe(1);
      expect(totaux.sousTotalCentimes).toBe(980);
    });
  });

  describe('panier plus lourd que le barème', () => {
    it('rend une expédition impossible et aucun total', () => {
      // 40 × 950 g = 38 kg, au-delà des 30 kg de la dernière tranche métropole.
      const totaux = calculerTotaux(
        [{ sku: HUILE_50, quantite: 40 }],
        CATALOGUE_PANIER,
        'metropole',
      );

      expect(totaux.expedition).toMatchObject({
        statut: 'impossible',
        motif: 'poids-hors-bareme',
      });
      expect(totaux.totalCentimes).toBeNull();
    });
  });
});
