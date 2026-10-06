import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import {
  actionAjouter,
  actionMoins,
  actionPlus,
  decrireAchat,
  formatEpuise,
  formatParDefaut,
  type FormatVignette,
} from '@/lib/panier/achat-vignette';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';
import type { SurcoucheCatalogue } from '@/lib/catalogue';

/**
 * LA LIGNE D'ACHAT DES VIGNETTES (C26) — pourquoi ce module est couvert à 100 %.
 *
 * Il décide d'un chiffre montré : le prix du format choisi, la quantité au
 * panier, le plafond du « + ». Un prix de surcouche oublié ici s'afficherait
 * sur la fiche et pas sur la vignette (régression de D24), et une borne de
 * stock décalée d'un cran laisserait le visiteur demander ce que le réducteur
 * refusera en silence.
 */

const SLUG = 'huile-olive-premiere-pression';

/** Trois formats de l'huile d'olive, du plus petit au plus grand — l'ordre du catalogue. */
const FORMATS: readonly [FormatVignette, ...FormatVignette[]] = [
  { sku: 'A-25', format: '25 cl', prixCentimes: 1290, stock: 42, piecesRequises: null },
  { sku: 'A-50', format: '50 cl', prixCentimes: 2250, stock: 28, piecesRequises: null },
  { sku: 'A-75', format: '75 cl', prixCentimes: 3100, stock: 16, piecesRequises: null },
];

const UN_SEUL: readonly [FormatVignette, ...FormatVignette[]] = [
  { sku: 'B-1', format: '500 g', prixCentimes: 560, stock: 60, piecesRequises: null },
];

const COFFRET: readonly [FormatVignette, ...FormatVignette[]] = [
  { sku: 'C-3', format: '3 pièces', prixCentimes: 3400, stock: 22, piecesRequises: 3 },
  { sku: 'C-5', format: '5 pièces', prixCentimes: 5400, stock: 15, piecesRequises: 5 },
];

function decider(
  surcharge: {
    readonly formats?: readonly [FormatVignette, ...FormatVignette[]];
    readonly skuChoisi?: string | null;
    readonly lignes?: readonly { sku: string; quantite: number; composition?: readonly string[] }[];
    readonly surcouche?: SurcoucheCatalogue;
  } = {},
) {
  return decrireAchat({
    slug: SLUG,
    formats: surcharge.formats ?? FORMATS,
    skuChoisi: surcharge.skuChoisi ?? null,
    lignes: surcharge.lignes ?? [],
    surcouche: surcharge.surcouche ?? {},
  });
}

describe('la pastille cochée par défaut', () => {
  it('est le premier format du produit quand le panier est vide', () => {
    expect(formatParDefaut(FORMATS, []).sku).toBe('A-25');
  });

  it('est le format déjà au panier, le 50 cl avant un rechargement', () => {
    expect(formatParDefaut(FORMATS, [{ sku: 'A-50', quantite: 1 }]).sku).toBe('A-50');
  });

  it('est le premier DANS L’ORDRE DU CATALOGUE quand plusieurs formats y sont', () => {
    const lignes = [
      { sku: 'A-75', quantite: 1 },
      { sku: 'A-50', quantite: 2 },
    ];

    expect(formatParDefaut(FORMATS, lignes).sku).toBe('A-50');
  });

  it('ignore une ligne qui n’est pas ce format', () => {
    expect(formatParDefaut(FORMATS, [{ sku: 'AUTRE', quantite: 3 }]).sku).toBe('A-25');
  });

  it('ne se règle JAMAIS sur le prix : un grand format moins cher ne déplace pas la pastille', () => {
    const surcouche: SurcoucheCatalogue = {
      [SLUG]: { variantes: [{ sku: 'A-75', prixCentimes: 100 }] },
    };
    const decision = decider({ surcouche });

    expect(decision.sku).toBe('A-25');
    expect(decision.prixCentimes).toBe(1290);
  });

  it('ne tient pas compte d’une ligne de composition : elle n’est pas ce format', () => {
    const lignes = [{ sku: 'A-50', quantite: 1, composition: ['X'] }];

    expect(formatParDefaut(FORMATS, lignes).sku).toBe('A-25');
  });
});

describe('le catalogue livré range bien ses formats du plus petit au plus grand', () => {
  it('pour les sept produits à plusieurs formats, dans l’ordre des variantes', () => {
    const multiples = CATALOGUE.filter((produit) => produit.variantes.length > 1);

    expect(multiples).toHaveLength(7);

    for (const produit of multiples) {
      const poids = produit.variantes.map((variante) => variante.poidsGrammes);

      expect(poids, produit.slug).toEqual([...poids].sort((a, b) => a - b));
    }
  });
});

describe('le mode « ajouter »', () => {
  it('montre le prix du format par défaut et l’action d’ajout d’une unité', () => {
    const decision = decider();

    expect(decision).toEqual({
      mode: 'ajouter',
      sku: 'A-25',
      format: '25 cl',
      prixCentimes: 1290,
      quantite: 0,
      max: 42,
    });
    expect(actionAjouter(decision)).toEqual({ type: 'ajouter', sku: 'A-25', quantite: 1 });
  });

  it('suit la pastille choisie : le prix et le plafond sont ceux de CE format', () => {
    const decision = decider({ skuChoisi: 'A-50' });

    expect(decision.sku).toBe('A-50');
    expect(decision.prixCentimes).toBe(2250);
    expect(decision.max).toBe(28);
  });

  it('retombe sur le défaut si le SKU choisi n’existe pas', () => {
    expect(decider({ skuChoisi: 'INCONNU' }).sku).toBe('A-25');
  });

  it('sert un produit à un seul format sans pastille à choisir', () => {
    expect(decider({ formats: UN_SEUL }).sku).toBe('B-1');
  });

  it('n’ajoute que pour le format choisi, pas pour un autre déjà au panier', () => {
    const decision = decider({
      skuChoisi: 'A-25',
      lignes: [{ sku: 'A-50', quantite: 2 }],
    });

    expect(decision.mode).toBe('ajouter');
    expect(decision.quantite).toBe(0);
  });
});

describe('le mode « quantité »', () => {
  const lignes = [{ sku: 'A-25', quantite: 2 }];

  it('rend la quantité de ce format et refuse l’ajout', () => {
    const decision = decider({ lignes });

    expect(decision.mode).toBe('quantite');
    expect(decision.quantite).toBe(2);
    expect(actionAjouter(decision)).toBeNull();
  });

  it('« + » monte d’un cran', () => {
    expect(actionPlus(decider({ lignes }))).toEqual({
      type: 'changerQuantite',
      cle: 'A-25',
      quantite: 3,
    });
  });

  it('« − » descend d’un cran au-dessus de un', () => {
    expect(actionMoins(decider({ lignes }))).toEqual({
      type: 'changerQuantite',
      cle: 'A-25',
      quantite: 1,
    });
  });

  it('« − » retire la ligne à un', () => {
    expect(actionMoins(decider({ lignes: [{ sku: 'A-25', quantite: 1 }] }))).toEqual({
      type: 'retirer',
      cle: 'A-25',
    });
  });

  it('« + » s’éteint EXACTEMENT au plafond de stock, et pas un cran avant', () => {
    const avant = decider({ lignes: [{ sku: 'A-75', quantite: 15 }], skuChoisi: 'A-75' });
    const plafond = decider({ lignes: [{ sku: 'A-75', quantite: 16 }], skuChoisi: 'A-75' });

    expect(avant.max).toBe(16);
    expect(actionPlus(avant)).not.toBeNull();
    expect(actionPlus(plafond)).toBeNull();
    expect(actionMoins(plafond)).not.toBeNull();
  });

  it('reste en mode quantité si le marchand a baissé le stock SOUS la quantité : on doit pouvoir retirer', () => {
    const surcouche: SurcoucheCatalogue = {
      [SLUG]: { variantes: [{ sku: 'A-25', stock: 1 }] },
    };
    const decision = decider({ lignes: [{ sku: 'A-25', quantite: 2 }], surcouche });

    expect(decision.mode).toBe('quantite');
    expect(decision.max).toBe(1);
    expect(actionPlus(decision)).toBeNull();
    expect(actionMoins(decision)).not.toBeNull();
  });
});

describe('la surcouche marchand, par les mêmes chemins que la fiche (D24)', () => {
  it('le prix affiché est celui de la surcouche, jamais le brut de la projection', () => {
    const surcouche: SurcoucheCatalogue = {
      [SLUG]: { variantes: [{ sku: 'A-25', prixCentimes: 999 }] },
    };

    expect(decider({ surcouche }).prixCentimes).toBe(999);
  });

  it('un stock réduit borne le plafond, un stock augmenté n’élargit rien', () => {
    const reduit: SurcoucheCatalogue = { [SLUG]: { variantes: [{ sku: 'A-25', stock: 3 }] } };
    const augmente: SurcoucheCatalogue = { [SLUG]: { variantes: [{ sku: 'A-25', stock: 500 }] } };

    expect(decider({ surcouche: reduit }).max).toBe(3);
    expect(decider({ surcouche: augmente }).max).toBe(42);
  });

  it('un stock à zéro rend le mode « épuisé » : plus d’ajout possible', () => {
    const surcouche: SurcoucheCatalogue = { [SLUG]: { variantes: [{ sku: 'A-25', stock: 0 }] } };
    const decision = decider({ surcouche });

    expect(decision.mode).toBe('epuise');
    expect(actionAjouter(decision)).toBeNull();
    expect(actionPlus(decision)).toBeNull();
    expect(actionMoins(decision)).toBeNull();
  });

  it('un format épuisé n’éteint pas les autres', () => {
    const surcouche: SurcoucheCatalogue = { [SLUG]: { variantes: [{ sku: 'A-25', stock: 0 }] } };

    expect(decider({ surcouche, skuChoisi: 'A-50' }).mode).toBe('ajouter');
  });

  it('un produit retiré de la vente est « indisponible », même avec du stock', () => {
    const decision = decider({ surcouche: { [SLUG]: { disponible: false } } });

    expect(decision.mode).toBe('indisponible');
    expect(actionAjouter(decision)).toBeNull();
  });

  it('« indisponible » l’emporte sur un coffret et sur une quantité déjà au panier', () => {
    const surcouche: SurcoucheCatalogue = { [SLUG]: { disponible: false } };

    expect(decider({ surcouche, formats: COFFRET }).mode).toBe('indisponible');
    expect(
      decider({ surcouche, lignes: [{ sku: 'A-25', quantite: 1 }] }).mode,
    ).toBe('indisponible');
  });
});

describe('la pastille d’un format épuisé', () => {
  it('se barre quand la surcouche ou le catalogue met le stock à zéro, et pas autrement', () => {
    const [vingtCinq, cinquante] = FORMATS;
    const surcouche: SurcoucheCatalogue = { [SLUG]: { variantes: [{ sku: 'A-25', stock: 0 }] } };

    expect(formatEpuise(surcouche, SLUG, vingtCinq)).toBe(true);
    expect(formatEpuise(surcouche, SLUG, cinquante!)).toBe(false);
    expect(formatEpuise({}, SLUG, { ...vingtCinq, stock: 0 })).toBe(true);
    expect(formatEpuise({}, SLUG, vingtCinq)).toBe(false);
  });
});

describe('le coffret à composer', () => {
  it('renvoie à la fiche : mode « composer », aucune action possible', () => {
    const decision = decider({ formats: COFFRET });

    expect(decision.mode).toBe('composer');
    expect(decision.sku).toBe('C-3');
    expect(actionAjouter(decision)).toBeNull();
    expect(actionPlus(decision)).toBeNull();
    expect(actionMoins(decision)).toBeNull();
  });

  it('montre quand même le prix du format choisi', () => {
    expect(decider({ formats: COFFRET, skuChoisi: 'C-5' }).prixCentimes).toBe(5400);
  });
});

describe('le catalogue réel, projeté comme la vignette le reçoit', () => {
  it('chaque produit se décrit : coffret à composer, tous les autres à ajouter', () => {
    const articles = projeterCatalogue(CATALOGUE);

    for (const produit of CATALOGUE) {
      const formats = articles
        .filter((article) => article.slug === produit.slug)
        .map((article) => ({
          sku: article.sku,
          format: article.format,
          prixCentimes: article.prixCentimes,
          stock: article.stock,
          piecesRequises: article.piecesRequises,
        }));
      const [premier, ...reste] = formats;

      if (premier === undefined) {
        throw new Error(`aucun format pour ${produit.slug}`);
      }

      const decision = decrireAchat({
        slug: produit.slug,
        formats: [premier, ...reste],
        skuChoisi: null,
        lignes: [],
        surcouche: {},
      });

      expect(decision.mode, produit.slug).toBe(produit.personnalisable ? 'composer' : 'ajouter');
      expect(decision.sku, produit.slug).toBe(produit.variantes[0].sku);
    }
  });
});
