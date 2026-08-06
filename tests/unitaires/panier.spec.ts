import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import {
  projeterCatalogue,
  stocksDepuisCatalogue,
} from '@/lib/panier/catalogue-panier';
import {
  analyserEtatPanier,
  cleLigne,
  ETAT_INITIAL,
  nombreArticles,
  reduirePanier,
  type ActionPanier,
  type EtatPanier,
  type StocksParSku,
} from '@/lib/panier/reducteur';

/**
 * LE RÉDUCTEUR DU PANIER.
 *
 * Ce que ces tests protègent : les quatre invariants énoncés en tête de
 * `reducteur.ts`. Ce ne sont pas des propriétés cosmétiques — chacun
 * correspond à une manière connue de perdre une commande ou d'en afficher une
 * fausse.
 *
 * Les stocks sont ceux du catalogue réel partout où c'est possible, parce
 * qu'un test qui invente ses propres nombres finit par tester ses nombres. Les
 * cas qui n'existent pas dans le catalogue livré — un stock à zéro, un SKU
 * disparu — se construisent en revanche à la main : c'est justement leur
 * absence du catalogue qui les rend indispensables à couvrir.
 */

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);
const STOCKS = stocksDepuisCatalogue(CATALOGUE_PANIER);

/** 28 en stock, 22,50 €, 950 g. */
const HUILE_50 = 'MV-HV-OLI-50CL';
/** 9 en stock, 11,90 €, 400 g, périssable. */
const FROMAGE = 'MV-FR-BRE-250G';
/** Coffret personnalisable, 3 pièces, 22 en stock. */
const COFFRET_3 = 'MV-CO-LIB-3P';

const PIECES_A = ['MV-MC-CHA-250G', 'MV-ES-LEN-500G', 'MV-IN-SOI-60G'];
const PIECES_B = ['MV-CS-TER-180G', 'MV-CS-RIL-180G', 'MV-CS-OIG-110G'];

function appliquer(etat: EtatPanier, ...actions: readonly ActionPanier[]): EtatPanier {
  return actions.reduce((courant, action) => reduirePanier(courant, action, STOCKS), etat);
}

function avec(stocks: StocksParSku, etat: EtatPanier, action: ActionPanier): EtatPanier {
  return reduirePanier(etat, action, stocks);
}

/* -------------------------------------------------------------------------- */
/* Identité d'une ligne                                                        */
/* -------------------------------------------------------------------------- */

describe('cleLigne', () => {
  it('rend le SKU nu quand la ligne n’a pas de composition', () => {
    expect(cleLigne({ sku: HUILE_50 })).toBe(HUILE_50);
  });

  it('rend le SKU nu quand la composition est un tableau vide', () => {
    expect(cleLigne({ sku: COFFRET_3, composition: [] })).toBe(COFFRET_3);
  });

  it('suffixe la composition, triée, pour un coffret composé', () => {
    expect(cleLigne({ sku: COFFRET_3, composition: PIECES_A })).toBe(
      `${COFFRET_3}#MV-ES-LEN-500G+MV-IN-SOI-60G+MV-MC-CHA-250G`,
    );
  });

  it('donne la MÊME clé aux mêmes pièces cochées dans un autre ordre', () => {
    expect(cleLigne({ sku: COFFRET_3, composition: [...PIECES_A].reverse() })).toBe(
      cleLigne({ sku: COFFRET_3, composition: PIECES_A }),
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Ajouter                                                                     */
/* -------------------------------------------------------------------------- */

describe('ajouter', () => {
  it('pose une ligne de quantité un quand aucune quantité n’est demandée', () => {
    const etat = appliquer(ETAT_INITIAL, { type: 'ajouter', sku: HUILE_50 });

    expect(etat.lignes).toEqual([{ sku: HUILE_50, quantite: 1 }]);
  });

  it('INCRÉMENTE la ligne existante d’un SKU déjà au panier', () => {
    const etat = appliquer(
      ETAT_INITIAL,
      { type: 'ajouter', sku: HUILE_50, quantite: 2 },
      { type: 'ajouter', sku: HUILE_50, quantite: 3 },
    );

    expect(etat.lignes).toHaveLength(1);
    expect(etat.lignes[0]?.quantite).toBe(5);
  });

  it('n’écrase pas les autres lignes en incrémentant', () => {
    const etat = appliquer(
      ETAT_INITIAL,
      { type: 'ajouter', sku: HUILE_50 },
      { type: 'ajouter', sku: FROMAGE, quantite: 2 },
      { type: 'ajouter', sku: HUILE_50 },
    );

    expect(etat.lignes).toEqual([
      { sku: HUILE_50, quantite: 2 },
      { sku: FROMAGE, quantite: 2 },
    ]);
  });

  it('BORNE AU STOCK, silencieusement, dès le premier ajout', () => {
    // Le fromage n'a que neuf pièces au catalogue.
    const etat = appliquer(ETAT_INITIAL, { type: 'ajouter', sku: FROMAGE, quantite: 40 });

    expect(etat.lignes[0]?.quantite).toBe(9);
  });

  it('BORNE AU STOCK lors d’un incrément qui dépasserait', () => {
    const etat = appliquer(
      ETAT_INITIAL,
      { type: 'ajouter', sku: FROMAGE, quantite: 7 },
      { type: 'ajouter', sku: FROMAGE, quantite: 7 },
    );

    expect(etat.lignes[0]?.quantite).toBe(9);
  });

  it('ignore un SKU absent du catalogue', () => {
    const etat = appliquer(ETAT_INITIAL, { type: 'ajouter', sku: 'MV-XX-INEXISTANT' });

    expect(etat).toBe(ETAT_INITIAL);
  });

  it('ignore un SKU dont le stock est tombé à zéro', () => {
    const etat = avec({ [HUILE_50]: 0 }, ETAT_INITIAL, { type: 'ajouter', sku: HUILE_50 });

    expect(etat.lignes).toEqual([]);
  });

  it('ignore une quantité demandée nulle ou négative', () => {
    expect(
      appliquer(ETAT_INITIAL, { type: 'ajouter', sku: HUILE_50, quantite: 0 }).lignes,
    ).toEqual([]);
    expect(
      appliquer(ETAT_INITIAL, { type: 'ajouter', sku: HUILE_50, quantite: -3 }).lignes,
    ).toEqual([]);
  });

  describe('coffret composé', () => {
    it('DEUX COMPOSITIONS DIFFÉRENTES du même coffret font DEUX lignes', () => {
      const etat = appliquer(
        ETAT_INITIAL,
        { type: 'ajouter', sku: COFFRET_3, composition: PIECES_A },
        { type: 'ajouter', sku: COFFRET_3, composition: PIECES_B },
      );

      expect(etat.lignes).toHaveLength(2);
      expect(etat.lignes.map((ligne) => ligne.quantite)).toEqual([1, 1]);
    });

    it('la MÊME composition, elle, incrémente la ligne existante', () => {
      const etat = appliquer(
        ETAT_INITIAL,
        { type: 'ajouter', sku: COFFRET_3, composition: PIECES_A },
        { type: 'ajouter', sku: COFFRET_3, composition: [...PIECES_A].reverse() },
      );

      expect(etat.lignes).toHaveLength(1);
      expect(etat.lignes[0]?.quantite).toBe(2);
    });

    it('conserve la composition dans l’ordre où elle a été cochée', () => {
      const etat = appliquer(ETAT_INITIAL, {
        type: 'ajouter',
        sku: COFFRET_3,
        composition: PIECES_A,
      });

      expect(etat.lignes[0]?.composition).toEqual(PIECES_A);
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Changer la quantité, retirer, vider, choisir une zone                       */
/* -------------------------------------------------------------------------- */

describe('changerQuantite', () => {
  const plein = appliquer(
    ETAT_INITIAL,
    { type: 'ajouter', sku: HUILE_50, quantite: 2 },
    { type: 'ajouter', sku: FROMAGE },
  );

  it('fixe la quantité de la seule ligne visée', () => {
    const etat = appliquer(plein, { type: 'changerQuantite', cle: HUILE_50, quantite: 6 });

    expect(etat.lignes).toEqual([
      { sku: HUILE_50, quantite: 6 },
      { sku: FROMAGE, quantite: 1 },
    ]);
  });

  it('QUANTITÉ ZÉRO = RETRAIT de la ligne', () => {
    const etat = appliquer(plein, { type: 'changerQuantite', cle: HUILE_50, quantite: 0 });

    expect(etat.lignes).toEqual([{ sku: FROMAGE, quantite: 1 }]);
  });

  it('une quantité négative retire aussi', () => {
    const etat = appliquer(plein, { type: 'changerQuantite', cle: FROMAGE, quantite: -2 });

    expect(etat.lignes).toEqual([{ sku: HUILE_50, quantite: 2 }]);
  });

  it('borne au stock', () => {
    const etat = appliquer(plein, { type: 'changerQuantite', cle: FROMAGE, quantite: 99 });

    expect(etat.lignes[1]?.quantite).toBe(9);
  });

  it('NE TOUCHE À RIEN sur une saisie inexploitable (champ vidé au clavier)', () => {
    const etat = appliquer(plein, {
      type: 'changerQuantite',
      cle: HUILE_50,
      quantite: Number.NaN,
    });

    expect(etat).toBe(plein);
  });

  it('ne touche à rien non plus sur une quantité fractionnaire', () => {
    expect(
      appliquer(plein, { type: 'changerQuantite', cle: HUILE_50, quantite: 2.5 }),
    ).toBe(plein);
  });

  it('retire une ligne dont le SKU n’est plus au catalogue', () => {
    const orphelin: EtatPanier = {
      lignes: [{ sku: 'MV-XX-DISPARU', quantite: 3 }],
      zone: 'metropole',
    };

    const etat = avec(STOCKS, orphelin, {
      type: 'changerQuantite',
      cle: 'MV-XX-DISPARU',
      quantite: 2,
    });

    expect(etat.lignes).toEqual([]);
  });
});

describe('retirer, vider, choisirZone', () => {
  const plein = appliquer(
    ETAT_INITIAL,
    { type: 'ajouter', sku: HUILE_50, quantite: 2 },
    { type: 'ajouter', sku: COFFRET_3, composition: PIECES_A },
  );

  it('retire la ligne désignée par sa clé, et elle seule', () => {
    const etat = appliquer(plein, {
      type: 'retirer',
      cle: cleLigne({ sku: COFFRET_3, composition: PIECES_A }),
    });

    expect(etat.lignes).toEqual([{ sku: HUILE_50, quantite: 2 }]);
  });

  it('vide les lignes sans oublier la zone choisie', () => {
    const etat = appliquer(plein, { type: 'choisirZone', zone: 'corse' }, { type: 'vider' });

    expect(etat).toEqual({ lignes: [], zone: 'corse' });
  });

  it('change la zone sans toucher aux lignes', () => {
    const etat = appliquer(plein, { type: 'choisirZone', zone: 'outre-mer' });

    expect(etat.zone).toBe('outre-mer');
    expect(etat.lignes).toEqual(plein.lignes);
  });
});

describe('nombreArticles', () => {
  it('somme les quantités, et non les lignes', () => {
    const etat = appliquer(
      ETAT_INITIAL,
      { type: 'ajouter', sku: HUILE_50, quantite: 2 },
      { type: 'ajouter', sku: FROMAGE, quantite: 3 },
    );

    expect(nombreArticles(etat)).toBe(5);
  });

  it('vaut zéro sur un panier vide', () => {
    expect(nombreArticles(ETAT_INITIAL)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Analyse d'un état venu d'ailleurs                                           */
/* -------------------------------------------------------------------------- */

describe('analyserEtatPanier', () => {
  it('accepte un état bien formé', () => {
    expect(
      analyserEtatPanier({ lignes: [{ sku: HUILE_50, quantite: 2 }], zone: 'corse' }),
    ).toEqual({ lignes: [{ sku: HUILE_50, quantite: 2 }], zone: 'corse' });
  });

  it('accepte une ligne portant une composition de chaînes', () => {
    expect(
      analyserEtatPanier({
        lignes: [{ sku: COFFRET_3, quantite: 1, composition: PIECES_A }],
        zone: 'metropole',
      })?.lignes[0]?.composition,
    ).toEqual(PIECES_A);
  });

  const refus: readonly (readonly [string, unknown])[] = [
    ['une chaîne', 'panier'],
    ['un nombre', 42],
    ['null', null],
    ['un objet sans lignes', { zone: 'metropole' }],
    ['des lignes qui ne sont pas un tableau', { lignes: 'deux', zone: 'metropole' }],
    ['une zone absente', { lignes: [] }],
    ['une zone non textuelle', { lignes: [], zone: 3 }],
    ['une zone inconnue', { lignes: [], zone: 'mars' }],
    ['une ligne qui n’est pas un objet', { lignes: ['MV-HV-OLI-50CL'], zone: 'metropole' }],
    ['une ligne nulle', { lignes: [null], zone: 'metropole' }],
    ['un SKU non textuel', { lignes: [{ sku: 7, quantite: 1 }], zone: 'metropole' }],
    ['un SKU vide', { lignes: [{ sku: '', quantite: 1 }], zone: 'metropole' }],
    [
      'une quantité non numérique',
      { lignes: [{ sku: HUILE_50, quantite: '2' }], zone: 'metropole' },
    ],
    [
      'une quantité fractionnaire',
      { lignes: [{ sku: HUILE_50, quantite: 1.5 }], zone: 'metropole' },
    ],
    [
      'une quantité nulle',
      { lignes: [{ sku: HUILE_50, quantite: 0 }], zone: 'metropole' },
    ],
    [
      'une composition qui n’est pas un tableau',
      { lignes: [{ sku: COFFRET_3, quantite: 1, composition: 'trois' }], zone: 'metropole' },
    ],
    [
      'une composition contenant autre chose que des chaînes',
      { lignes: [{ sku: COFFRET_3, quantite: 1, composition: [1, 2, 3] }], zone: 'metropole' },
    ],
  ];

  for (const [intitule, valeur] of refus) {
    it(`refuse ${intitule}`, () => {
      expect(analyserEtatPanier(valeur)).toBeNull();
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Restaurer                                                                   */
/* -------------------------------------------------------------------------- */

describe('restaurer', () => {
  const restaurer = (brut: unknown, stocks: StocksParSku = STOCKS): EtatPanier =>
    reduirePanier(ETAT_INITIAL, { type: 'restaurer', etat: brut }, stocks);

  it('reprend un panier bien formé, zone comprise', () => {
    expect(
      restaurer({ lignes: [{ sku: HUILE_50, quantite: 3 }], zone: 'corse' }),
    ).toEqual({ lignes: [{ sku: HUILE_50, quantite: 3 }], zone: 'corse' });
  });

  it('rend le PANIER VIDE, sans lever, sur un état corrompu', () => {
    expect(restaurer({ lignes: 'deux', zone: 'metropole' })).toEqual(ETAT_INITIAL);
  });

  it('rend le panier vide, sans lever, sur `null`', () => {
    expect(restaurer(null)).toEqual(ETAT_INITIAL);
  });

  it('PURGE une ligne dont le SKU a disparu du catalogue, et garde le reste', () => {
    const etat = restaurer({
      lignes: [
        { sku: 'MV-XX-RETIRE', quantite: 2 },
        { sku: HUILE_50, quantite: 1 },
      ],
      zone: 'metropole',
    });

    expect(etat.lignes).toEqual([{ sku: HUILE_50, quantite: 1 }]);
  });

  it('purge une ligne dont le stock est tombé à zéro', () => {
    const etat = restaurer(
      { lignes: [{ sku: HUILE_50, quantite: 2 }], zone: 'metropole' },
      { [HUILE_50]: 0 },
    );

    expect(etat.lignes).toEqual([]);
  });

  it('rabat la quantité gardée sur le stock du jour', () => {
    const etat = restaurer(
      { lignes: [{ sku: HUILE_50, quantite: 12 }], zone: 'metropole' },
      { [HUILE_50]: 4 },
    );

    expect(etat.lignes).toEqual([{ sku: HUILE_50, quantite: 4 }]);
  });

  it('écarte un doublon de clé au lieu de le dupliquer', () => {
    const etat = restaurer({
      lignes: [
        { sku: COFFRET_3, quantite: 1, composition: PIECES_A },
        { sku: COFFRET_3, quantite: 5, composition: [...PIECES_A].reverse() },
      ],
      zone: 'metropole',
    });

    expect(etat.lignes).toEqual([{ sku: COFFRET_3, quantite: 1, composition: PIECES_A }]);
  });
});
