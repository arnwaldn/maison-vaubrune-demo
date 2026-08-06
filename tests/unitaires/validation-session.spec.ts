import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import {
  catalogueDeValidation,
  validerCorps,
  type CatalogueValidation,
} from '@/lib/paiement/validation';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';

/**
 * LA VALIDATION DU CORPS REÇU PAR LA ROUTE DE PAIEMENT.
 *
 * C'est le seul endroit du projet où un montant est arbitré CÔTÉ SERVEUR, et
 * c'est pour cela qu'il a été extrait de la route : une fonction pure se
 * couvre à 100 % des branches, une route Next non.
 *
 * Les montants ci-dessous sont ceux du catalogue LIVRÉ, écrits en clair et
 * jamais recalculés depuis le catalogue par le test lui-même :
 *
 *   MV-HV-VIN-50CL  vinaigre de cidre      9,80 €    940 g   stock 46
 *   MV-HV-OLI-50CL  huile d’olive 50 cl   22,50 €    950 g   stock 28
 *   MV-FR-BRE-250G  fromage de brebis     11,90 €    400 g   stock 9   PÉRISSABLE
 *   MV-CO-LIB-3P    coffret 3 pièces      34,00 €  1 400 g   stock 22  PERSONNALISABLE
 *   MV-CO-DIM-4P    coffret 4 pièces      46,00 €  1 850 g   stock 14  COMPOSÉ D’AVANCE
 *
 * Barème métropole : 4,90 € jusqu’à 1 kg, 6,90 € jusqu’à 3 kg, 9,50 € jusqu’à
 * 10 kg, 14,90 € jusqu’à 30 kg ; isotherme 6,00 € ; franco à 69,00 €.
 */

const CATALOGUE_VALIDATION = catalogueDeValidation(CATALOGUE);

const VINAIGRE = 'MV-HV-VIN-50CL';
const HUILE_50 = 'MV-HV-OLI-50CL';
const FROMAGE = 'MV-FR-BRE-250G';
const COFFRET_3 = 'MV-CO-LIB-3P';
const COFFRET_FIXE = 'MV-CO-DIM-4P';

const PIECES = ['MV-MC-CHA-250G', 'MV-CS-TER-180G', 'MV-ES-LEN-500G'];

/** Un vinaigre vers la métropole : 9,80 € + 4,90 € de port = 14,70 €. */
const CORPS_JUSTE = {
  lignes: [{ sku: VINAIGRE, quantite: 1 }],
  zone: 'metropole',
  totalAnnonceCentimes: 1470,
};

function codeDe(corps: unknown, catalogue: CatalogueValidation = CATALOGUE_VALIDATION) {
  const resultat = validerCorps(corps, catalogue);

  return resultat.ok ? 'ok' : resultat.code;
}

/* -------------------------------------------------------------------------- */
/* Le catalogue de validation                                                  */
/* -------------------------------------------------------------------------- */

describe('catalogueDeValidation', () => {
  it('reprend les vingt-trois articles de la projection', () => {
    expect(CATALOGUE_VALIDATION.articles).toHaveLength(23);
  });

  it('joint la liste blanche aux DEUX formats du coffret personnalisable', () => {
    expect(CATALOGUE_VALIDATION.piecesEligibles[COFFRET_3]).toHaveLength(11);
    expect(CATALOGUE_VALIDATION.piecesEligibles['MV-CO-LIB-5P']).toHaveLength(11);
  });

  it('ne joint aucune liste blanche aux produits qui ne se composent pas', () => {
    expect(CATALOGUE_VALIDATION.piecesEligibles[VINAIGRE]).toBeUndefined();
    expect(CATALOGUE_VALIDATION.piecesEligibles[COFFRET_FIXE]).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* Le chemin qui passe                                                         */
/* -------------------------------------------------------------------------- */

describe('un corps juste', () => {
  const resultat = validerCorps(CORPS_JUSTE, CATALOGUE_VALIDATION);

  it('est accepté', () => {
    expect(resultat.ok).toBe(true);
  });

  it('rend la commande préparée avec le port et le total RECALCULÉS', () => {
    expect(resultat.ok && resultat.commandePreparee).toMatchObject({
      zone: 'metropole',
      fraisPortCentimes: 490,
      totalCentimes: 1470,
    });
  });

  it('rend les lignes DÉJÀ CHIFFRÉES, prêtes pour le prestataire', () => {
    expect(resultat.ok && resultat.commandePreparee.lignes).toHaveLength(1);
    expect(resultat.ok && resultat.commandePreparee.lignes[0]).toMatchObject({
      sousTotalCentimes: 980,
    });
  });

  it('ne rend AUCUNE coordonnée — le type ne le permet même pas', () => {
    expect(resultat.ok && Object.keys(resultat.commandePreparee).sort()).toEqual([
      'fraisPortCentimes',
      'lignes',
      'totalCentimes',
      'zone',
    ]);
  });

  it('accepte un coffret personnalisable correctement composé', () => {
    // 34,00 € + 6,90 € (1 400 g, tranche des 3 kg) = 40,90 €.
    expect(
      codeDe({
        lignes: [{ sku: COFFRET_3, quantite: 1, composition: PIECES }],
        zone: 'metropole',
        totalAnnonceCentimes: 4090,
      }),
    ).toBe('ok');
  });

  it('accepte deux coffrets de compositions DIFFÉRENTES en deux lignes', () => {
    // 2 × 34,00 € + 6,90 € (2 800 g) = 74,90 €… mais 68,00 € de sous-total
    // reste sous le franco de 69,00 €, donc le port est bien facturé.
    const autre = ['MV-MC-CHA-250G', 'MV-CS-TER-180G', 'MV-CS-RIL-180G'];

    expect(
      codeDe({
        lignes: [
          { sku: COFFRET_3, quantite: 1, composition: PIECES },
          { sku: COFFRET_3, quantite: 1, composition: autre },
        ],
        zone: 'metropole',
        totalAnnonceCentimes: 7490,
      }),
    ).toBe('ok');
  });

  it('accepte un panier au franco de port : 4 huiles à 90,00 €, port offert', () => {
    expect(
      codeDe({
        lignes: [{ sku: HUILE_50, quantite: 4 }],
        zone: 'metropole',
        totalAnnonceCentimes: 9000,
      }),
    ).toBe('ok');
  });
});

/* -------------------------------------------------------------------------- */
/* Le corps lui-même                                                           */
/* -------------------------------------------------------------------------- */

describe('corps illisible', () => {
  it('refuse un corps qui n’est pas un objet', () => {
    expect(codeDe(42)).toBe('corps-illisible');
  });

  it('refuse un corps `null`', () => {
    expect(codeDe(null)).toBe('corps-illisible');
  });

  it('refuse des lignes qui ne sont pas un tableau', () => {
    expect(codeDe({ ...CORPS_JUSTE, lignes: 'un vinaigre' })).toBe('corps-illisible');
  });
});

describe('zone', () => {
  it('refuse une destination inconnue', () => {
    expect(codeDe({ ...CORPS_JUSTE, zone: 'antarctique' })).toBe('zone-inconnue');
  });

  it('refuse une zone absente', () => {
    expect(codeDe({ lignes: CORPS_JUSTE.lignes, totalAnnonceCentimes: 1470 })).toBe(
      'zone-inconnue',
    );
  });

  it('refuse une zone numérique', () => {
    expect(codeDe({ ...CORPS_JUSTE, zone: 3 })).toBe('zone-inconnue');
  });
});

describe('total annoncé', () => {
  it('refuse un total en toutes lettres', () => {
    expect(codeDe({ ...CORPS_JUSTE, totalAnnonceCentimes: '14,70' })).toBe(
      'total-illisible',
    );
  });

  it('refuse un total à virgule — un centime est un entier', () => {
    expect(codeDe({ ...CORPS_JUSTE, totalAnnonceCentimes: 14.7 })).toBe(
      'total-illisible',
    );
  });

  it('refuse un total négatif', () => {
    expect(codeDe({ ...CORPS_JUSTE, totalAnnonceCentimes: -1470 })).toBe(
      'total-illisible',
    );
  });

  it('REFUSE UN TOTAL FAUX, même à un centime près', () => {
    const resultat = validerCorps(
      { ...CORPS_JUSTE, totalAnnonceCentimes: 1469 },
      CATALOGUE_VALIDATION,
    );

    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.code).toBe('total-different');
    expect(!resultat.ok && resultat.message).toContain('c’est le serveur qui fixe le prix');
  });

  it('refuse un total à 1 centime sur un panier à 90,00 € — l’attaque évidente', () => {
    expect(
      codeDe({
        lignes: [{ sku: HUILE_50, quantite: 4 }],
        zone: 'metropole',
        totalAnnonceCentimes: 1,
      }),
    ).toBe('total-different');
  });
});

describe('panier vide', () => {
  it('refuse un panier sans ligne', () => {
    expect(codeDe({ ...CORPS_JUSTE, lignes: [] })).toBe('panier-vide');
  });
});

/* -------------------------------------------------------------------------- */
/* Les lignes                                                                  */
/* -------------------------------------------------------------------------- */

describe('lignes mal formées', () => {
  const mauvaises: readonly (readonly [string, unknown])[] = [
    ['une ligne qui n’est pas un objet', 'MV-HV-VIN-50CL'],
    ['une ligne `null`', null],
    ['un SKU absent', { quantite: 1 }],
    ['un SKU vide', { sku: '', quantite: 1 }],
    ['un SKU numérique', { sku: 7, quantite: 1 }],
    ['une quantité en toutes lettres', { sku: VINAIGRE, quantite: 'deux' }],
    ['une quantité à virgule', { sku: VINAIGRE, quantite: 1.5 }],
    ['une quantité nulle', { sku: VINAIGRE, quantite: 0 }],
    ['une quantité négative', { sku: VINAIGRE, quantite: -3 }],
    [
      'une composition qui n’est pas un tableau',
      { sku: COFFRET_3, quantite: 1, composition: 'trois pièces' },
    ],
    [
      'une composition de nombres',
      { sku: COFFRET_3, quantite: 1, composition: [1, 2, 3] },
    ],
  ];

  for (const [description, ligne] of mauvaises) {
    it(`refuse ${description}`, () => {
      expect(codeDe({ ...CORPS_JUSTE, lignes: [ligne] })).toBe('ligne-illisible');
    });
  }
});

describe('SKU inconnu', () => {
  it('refuse une référence absente du catalogue', () => {
    const resultat = validerCorps(
      { ...CORPS_JUSTE, lignes: [{ sku: 'MV-XX-DISPARU', quantite: 1 }] },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('sku-inconnu');
    expect(!resultat.ok && resultat.message).toContain('MV-XX-DISPARU');
  });
});

describe('ligne en double', () => {
  it('refuse deux lignes identiques — le stock se contournerait sinon', () => {
    expect(
      codeDe({
        ...CORPS_JUSTE,
        lignes: [
          { sku: VINAIGRE, quantite: 1 },
          { sku: VINAIGRE, quantite: 1 },
        ],
      }),
    ).toBe('ligne-en-double');
  });

  it('refuse deux coffrets de composition IDENTIQUE en deux lignes', () => {
    expect(
      codeDe({
        ...CORPS_JUSTE,
        lignes: [
          { sku: COFFRET_3, quantite: 1, composition: PIECES },
          { sku: COFFRET_3, quantite: 1, composition: [...PIECES].reverse() },
        ],
      }),
    ).toBe('ligne-en-double');
  });
});

describe('stock', () => {
  it('refuse une quantité supérieure au stock', () => {
    const resultat = validerCorps(
      { ...CORPS_JUSTE, lignes: [{ sku: FROMAGE, quantite: 10 }] },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('stock-insuffisant');
    expect(!resultat.ok && resultat.message).toContain('9');
  });

  it('accepte exactement le stock', () => {
    // 9 × 11,90 € = 107,10 €, au-delà du franco : port offert.
    expect(
      codeDe({
        lignes: [{ sku: FROMAGE, quantite: 9 }],
        zone: 'metropole',
        totalAnnonceCentimes: 10710,
      }),
    ).toBe('ok');
  });

  it('additionne les quantités du MÊME SKU réparties sur deux lignes', () => {
    /* Deux compositions différentes forment deux lignes légitimes : c'est le
       cumul par SKU, et non la quantité d'une ligne, qui doit tenir dans les
       vingt-deux coffrets en stock. */
    const autre = ['MV-MC-CHA-250G', 'MV-CS-TER-180G', 'MV-CS-RIL-180G'];

    expect(
      codeDe({
        ...CORPS_JUSTE,
        lignes: [
          { sku: COFFRET_3, quantite: 12, composition: PIECES },
          { sku: COFFRET_3, quantite: 11, composition: autre },
        ],
      }),
    ).toBe('stock-insuffisant');
  });
});

/* -------------------------------------------------------------------------- */
/* La composition du coffret                                                   */
/* -------------------------------------------------------------------------- */

describe('composition du coffret personnalisable', () => {
  it('refuse un coffret sans composition', () => {
    const resultat = validerCorps(
      { ...CORPS_JUSTE, lignes: [{ sku: COFFRET_3, quantite: 1 }] },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('composition-invalide');
    expect(!resultat.ok && resultat.message).toContain('exactement');
  });

  it('refuse un COMPTE inexact', () => {
    expect(
      codeDe({
        ...CORPS_JUSTE,
        lignes: [{ sku: COFFRET_3, quantite: 1, composition: PIECES.slice(0, 2) }],
      }),
    ).toBe('composition-invalide');
  });

  it('refuse une pièce choisie DEUX FOIS', () => {
    const resultat = validerCorps(
      {
        ...CORPS_JUSTE,
        lignes: [
          {
            sku: COFFRET_3,
            quantite: 1,
            composition: ['MV-MC-CHA-250G', 'MV-MC-CHA-250G', 'MV-CS-TER-180G'],
          },
        ],
      },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.message).toContain('deux fois');
  });

  it('refuse une pièce HORS LISTE BLANCHE — l’huile 75 cl à 31,00 €', () => {
    const resultat = validerCorps(
      {
        ...CORPS_JUSTE,
        lignes: [
          {
            sku: COFFRET_3,
            quantite: 1,
            composition: ['MV-HV-OLI-75CL', 'MV-CS-TER-180G', 'MV-ES-LEN-500G'],
          },
        ],
      },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('composition-invalide');
    expect(!resultat.ok && resultat.message).toContain('MV-HV-OLI-75CL');
  });

  it('refuse TOUTE composition quand aucune liste blanche n’est jointe', () => {
    /* Catalogue amputé de ses listes blanches : rien n'est alors éligible, et
       la validation refuse plutôt que d'accepter faute de règle. */
    const ampute: CatalogueValidation = {
      articles: projeterCatalogue(CATALOGUE),
      piecesEligibles: {},
    };

    expect(
      codeDe(
        {
          ...CORPS_JUSTE,
          lignes: [{ sku: COFFRET_3, quantite: 1, composition: PIECES }],
        },
        ampute,
      ),
    ).toBe('composition-invalide');
  });

  it('refuse une composition sur un produit qui ne se compose pas', () => {
    const resultat = validerCorps(
      {
        ...CORPS_JUSTE,
        lignes: [{ sku: COFFRET_FIXE, quantite: 1, composition: PIECES }],
      },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('composition-invalide');
    expect(!resultat.ok && resultat.message).toContain('vendu tel quel');
  });

  it('accepte le coffret composé d’avance SANS composition', () => {
    // 46,00 € + 6,90 € (1 850 g) = 52,90 €.
    expect(
      codeDe({
        lignes: [{ sku: COFFRET_FIXE, quantite: 1 }],
        zone: 'metropole',
        totalAnnonceCentimes: 5290,
      }),
    ).toBe('ok');
  });
});

/* -------------------------------------------------------------------------- */
/* L'expédition                                                                */
/* -------------------------------------------------------------------------- */

describe('expédition impossible', () => {
  it('refuse un produit frais hors métropole, avec la phrase du moteur', () => {
    const resultat = validerCorps(
      {
        lignes: [{ sku: FROMAGE, quantite: 1 }],
        zone: 'corse',
        totalAnnonceCentimes: 1190,
      },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('expedition-impossible');
    expect(!resultat.ok && resultat.message).toContain('chaîne du froid');
  });

  it('refuse un colis plus lourd que le barème', () => {
    // 46 vinaigres = 43 240 g, au-delà des 30 kg de la dernière tranche.
    const resultat = validerCorps(
      {
        lignes: [{ sku: VINAIGRE, quantite: 46 }],
        zone: 'metropole',
        totalAnnonceCentimes: 45080,
      },
      CATALOGUE_VALIDATION,
    );

    expect(!resultat.ok && resultat.code).toBe('expedition-impossible');
    expect(!resultat.ok && resultat.message).toContain('cas par cas');
  });
});
