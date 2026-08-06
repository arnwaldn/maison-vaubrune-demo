import { describe, expect, it } from 'vitest';

import {
  CLE_PANIER,
  ecrire,
  lire,
  VERSION_PANIER,
  type StockageCompatible,
} from '@/lib/panier/persistance';
import type { EtatPanier } from '@/lib/panier/reducteur';

/**
 * LA PERSISTANCE DU PANIER.
 *
 * Aucun navigateur ici, et c'est tout l'intérêt du stockage injecté : les
 * quatre faux objets ci-dessous couvrent des situations qu'un vrai
 * `localStorage` refuserait de reproduire à la demande — un quota dépassé, un
 * accès qui lève, un contenu écrit par une version antérieure du site. Sans
 * l'injection, ces cas resteraient non testés jusqu'au jour où ils casseraient
 * l'hydratation chez un visiteur en navigation privée.
 */

const ETAT: EtatPanier = {
  lignes: [{ sku: 'MV-HV-OLI-50CL', quantite: 2 }],
  zone: 'corse',
};

/** Un stockage en mémoire, honnête. */
function stockageMemoire(contenu: Record<string, string> = {}): StockageCompatible & {
  readonly contenu: Record<string, string>;
} {
  return {
    contenu,
    getItem: (cle) => contenu[cle] ?? null,
    setItem: (cle, valeur) => {
      contenu[cle] = valeur;
    },
  };
}

/** Un stockage qui lève à la lecture, comme une navigation privée verrouillée. */
const STOCKAGE_QUI_REFUSE_DE_LIRE: StockageCompatible = {
  getItem: () => {
    throw new Error('accès au stockage refusé');
  },
  setItem: () => {
    throw new Error('accès au stockage refusé');
  },
};

/** Un stockage qui lit mais refuse d'écrire, comme un quota dépassé. */
const STOCKAGE_PLEIN: StockageCompatible = {
  getItem: () => null,
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

function enveloppe(version: unknown, panier: unknown): string {
  return JSON.stringify({ version, panier });
}

/* -------------------------------------------------------------------------- */

describe('ecrire', () => {
  it('écrit une enveloppe versionnée sous la clé du projet', () => {
    const stockage = stockageMemoire();

    expect(ecrire(stockage, ETAT)).toBe(true);
    expect(JSON.parse(stockage.contenu[CLE_PANIER] ?? '')).toEqual({
      version: VERSION_PANIER,
      panier: ETAT,
    });
  });

  it('rend `false` sans lever quand le stockage refuse d’écrire', () => {
    expect(ecrire(STOCKAGE_PLEIN, ETAT)).toBe(false);
  });
});

describe('lire', () => {
  it('relit ce que `ecrire` a écrit, à l’identique', () => {
    const stockage = stockageMemoire();
    ecrire(stockage, ETAT);

    expect(lire(stockage)).toEqual(ETAT);
  });

  it('rend `null` quand la clé est absente', () => {
    expect(lire(stockageMemoire())).toBeNull();
  });

  it('rend `null`, sans lever, quand l’accès au stockage lève', () => {
    expect(lire(STOCKAGE_QUI_REFUSE_DE_LIRE)).toBeNull();
  });

  it('rend `null` sur du JSON INVALIDE', () => {
    expect(lire(stockageMemoire({ [CLE_PANIER]: '{lignes:' }))).toBeNull();
  });

  it('rend `null` quand le JSON est valide mais n’est pas un objet', () => {
    expect(lire(stockageMemoire({ [CLE_PANIER]: '42' }))).toBeNull();
  });

  it('rend `null` quand le JSON vaut littéralement `null`', () => {
    expect(lire(stockageMemoire({ [CLE_PANIER]: 'null' }))).toBeNull();
  });

  it('rend `null` sur une VERSION INCONNUE — un panier de la v2 n’est pas lu', () => {
    expect(lire(stockageMemoire({ [CLE_PANIER]: enveloppe(2, ETAT) }))).toBeNull();
  });

  it('rend `null` quand l’enveloppe n’a pas de version du tout', () => {
    expect(
      lire(stockageMemoire({ [CLE_PANIER]: JSON.stringify({ panier: ETAT }) })),
    ).toBeNull();
  });

  it('rend `null` quand l’enveloppe est bonne mais le panier MAL FORMÉ', () => {
    expect(
      lire(stockageMemoire({ [CLE_PANIER]: enveloppe(1, { lignes: 'deux', zone: 'corse' }) })),
    ).toBeNull();
  });

  it('rend `null` quand une ligne porte une quantité impossible', () => {
    expect(
      lire(
        stockageMemoire({
          [CLE_PANIER]: enveloppe(1, {
            lignes: [{ sku: 'MV-HV-OLI-50CL', quantite: -1 }],
            zone: 'metropole',
          }),
        }),
      ),
    ).toBeNull();
  });
});
