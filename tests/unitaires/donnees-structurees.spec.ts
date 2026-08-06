import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import { trouverProduitParSlug } from '@/lib/catalogue';
import {
  donneesOrganisation,
  donneesProduit,
  filArianeProduit,
  prixSchemaOrg,
  varianteLaMoinsChere,
} from '@/lib/donnees-structurees';
import type { Produit } from '@/lib/types';

/**
 * LE BALISAGE JSON-LD — ce qu'on déclare aux robots.
 *
 * Ces fonctions publient un PRIX et une DISPONIBILITÉ à des moteurs de
 * recherche. C'est la raison — la seule — pour laquelle elles entrent au
 * périmètre de couverture à 100 % (décision D16) : la règle d'admission n'a
 * jamais été « ce fichier est important », mais « ce fichier décide d'un
 * chiffre qu'on montre à quelqu'un ». Un prix affiché dans un résultat de
 * recherche est un prix affiché.
 *
 * Deux propriétés valent d'être vérifiées et le sont d'abord : le prix se
 * compose en ÉCRITURE ANGLAISE (schema.org lirait « 22,50 » comme deux mille
 * deux cent cinquante), et le balisage n'invente RIEN — pas de note moyenne,
 * pas d'adresse, pas de téléphone.
 */

const HUILE = obligatoire('huile-olive-premiere-pression');
const SITE = 'https://exemple.invalid';

function obligatoire(slug: string): Produit {
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    throw new Error(`fiche absente du catalogue : ${slug}`);
  }

  return produit;
}

describe('prixSchemaOrg', () => {
  it('écrit le séparateur décimal en point, jamais en virgule', () => {
    expect(prixSchemaOrg(2250)).toBe('22.50');
  });

  it('conserve les deux décimales d’un compte rond', () => {
    expect(prixSchemaOrg(5400)).toBe('54.00');
  });

  it('rend les centimes seuls sans perdre le zéro de tête', () => {
    expect(prixSchemaOrg(9)).toBe('0.09');
  });
});

describe('varianteLaMoinsChere', () => {
  it('retient le plus petit prix parmi trois formats', () => {
    expect(varianteLaMoinsChere(HUILE).sku).toBe('MV-HV-OLI-25CL');
  });

  it('rend l’unique variante d’un produit qui n’en a qu’une', () => {
    const vinaigre = obligatoire('vinaigre-cidre-vieilli-fut');

    expect(varianteLaMoinsChere(vinaigre).sku).toBe('MV-HV-VIN-50CL');
  });

  it('ne dépend pas de l’ordre : une variante moins chère en dernier gagne', () => {
    const bricolee: Produit = {
      ...HUILE,
      variantes: [
        { sku: 'A', format: 'A', prixCentimes: 900, poidsGrammes: 100, stock: 1 },
        { sku: 'B', format: 'B', prixCentimes: 100, poidsGrammes: 100, stock: 1 },
      ],
    };

    expect(varianteLaMoinsChere(bricolee).sku).toBe('B');
  });
});

describe('donneesProduit', () => {
  const balisage = donneesProduit(HUILE, SITE);

  it('déclare un Product et son unique Offer', () => {
    expect(balisage['@context']).toBe('https://schema.org');
    expect(balisage['@type']).toBe('Product');
    expect(balisage.offers['@type']).toBe('Offer');
  });

  it('publie le prix du format le moins cher, en euros', () => {
    expect(balisage.offers.price).toBe('12.90');
    expect(balisage.offers.priceCurrency).toBe('EUR');
  });

  it('reprend le nom et le résumé du catalogue, sans les reformuler', () => {
    expect(balisage.name).toBe(HUILE.nom);
    expect(balisage.description).toBe(HUILE.resume);
  });

  it('donne une adresse absolue, la même pour le produit et pour l’offre', () => {
    expect(balisage.url).toBe(`${SITE}/boutique/${HUILE.slug}`);
    expect(balisage.offers.url).toBe(balisage.url);
  });

  it('annonce « en stock » quand le format le moins cher en a', () => {
    expect(balisage.offers.availability).toBe('https://schema.org/InStock');
  });

  it('annonce « épuisé » quand ce format n’a plus de stock', () => {
    const epuise: Produit = {
      ...HUILE,
      variantes: [{ ...varianteLaMoinsChere(HUILE), stock: 0 }, ...HUILE.variantes.slice(1)] as Produit['variantes'],
    };

    expect(donneesProduit(epuise, SITE).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('annonce « épuisé » quand le produit est retiré de la vente, stock ou non', () => {
    const retire: Produit = { ...HUILE, disponible: false };

    expect(donneesProduit(retire, SITE).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('n’invente NI note moyenne, NI avis, NI marque, NI image', () => {
    const champs = Object.keys(balisage);

    expect(champs).toEqual(['@context', '@type', 'name', 'description', 'url', 'offers']);
  });
});

describe('filArianeProduit', () => {
  const fil = filArianeProduit(HUILE, SITE);

  it('remonte de la fiche à l’accueil en trois marches', () => {
    expect(fil['@type']).toBe('BreadcrumbList');
    expect(fil.itemListElement.map((etape) => etape.name)).toEqual([
      'Accueil',
      'Boutique',
      HUILE.nom,
    ]);
  });

  it('numérote les marches à partir de un, dans l’ordre', () => {
    expect(fil.itemListElement.map((etape) => etape.position)).toEqual([1, 2, 3]);
  });

  it('donne à chaque marche une adresse absolue', () => {
    expect(fil.itemListElement.map((etape) => etape.item)).toEqual([
      `${SITE}/`,
      `${SITE}/boutique`,
      `${SITE}/boutique/${HUILE.slug}`,
    ]);
  });
});

describe('donneesOrganisation', () => {
  const organisation = donneesOrganisation(SITE);

  it('se limite à trois champs : nom, adresse du site, description', () => {
    expect(Object.keys(organisation)).toEqual([
      '@context',
      '@type',
      'name',
      'url',
      'description',
    ]);
  });

  it('porte le nom du marchand et l’adresse racine du site', () => {
    expect(organisation.name).toBe('Maison Vaubrune');
    expect(organisation.url).toBe(`${SITE}/`);
  });

  it('dit dans sa description qu’il s’agit d’une démonstration', () => {
    expect(organisation.description).toContain('démonstration');
    expect(organisation.description).toContain('fictive');
  });
});
