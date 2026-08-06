import { describe, expect, it } from 'vitest';

import {
  appliquerSurcouche,
  trouverProduitParSlug,
  trouverReferenceParSku,
  type SurcoucheCatalogue,
} from '@/lib/catalogue';
import {
  assainirModification,
  assainirSurcouche,
  assainirVariante,
  CLE_SURCOUCHE,
  DepotNavigateur,
  ecrireSurcouche,
  effacerSurcouche,
  estDisponibleAffiche,
  fusionnerDansSurcouche,
  lireSurcouche,
  miseEnAvantAffichee,
  prixAffiche,
  prixLePlusBasAffiche,
  resumeAffiche,
  stockAffiche,
  VERSION_SURCOUCHE,
  type StockageSurcouche,
} from '@/lib/catalogue-navigateur';
import { estDisponible, type Produit } from '@/lib/types';

/**
 * LA SURCOUCHE MARCHAND.
 *
 * Trois familles de cas, et la deuxième est le cœur de la tranche :
 *
 * 1. L'ENVELOPPE : ce qui est écrit se relit, et rien d'autre ne passe — clé
 *    absente, JSON invalide, version inconnue, stockage qui lève.
 * 2. LE FILTRE CHAMP PAR CHAMP : un patch qui corrige un prix et tente au
 *    passage de réécrire un poids d'expédition, un SKU ou un slug applique le
 *    prix ET SEULEMENT LUI. C'est la promesse de `catalogue-navigateur.ts`, et
 *    c'est celle qui protège le moteur de frais de port d'un écran de saisie.
 * 3. LES LECTURES DE VITRINE : chacune rend la valeur de base en l'absence de
 *    surcouche — c'est ce qui garantit que le premier rendu client est
 *    identique au HTML du serveur, donc l'absence de désaccord d'hydratation.
 */

/* -------------------------------------------------------------------------- */
/* Harnais                                                                     */
/* -------------------------------------------------------------------------- */

/** Un `Storage` de trois lignes. `null` de départ = clé absente. */
function stockage(initial: string | null = null): StockageSurcouche & {
  contenu: string | null;
} {
  return {
    contenu: initial,
    getItem(cle) {
      return cle === CLE_SURCOUCHE ? this.contenu : null;
    },
    setItem(cle, valeur) {
      if (cle === CLE_SURCOUCHE) {
        this.contenu = valeur;
      }
    },
    removeItem(cle) {
      if (cle === CLE_SURCOUCHE) {
        this.contenu = null;
      }
    },
  };
}

/** Un stockage qui refuse tout : navigation privée, quota, politique d'entreprise. */
const STOCKAGE_QUI_LEVE: StockageSurcouche = {
  getItem() {
    throw new Error('accès refusé');
  },
  setItem() {
    throw new Error('quota dépassé');
  },
  removeItem() {
    throw new Error('accès refusé');
  },
};

function enveloppe(contenu: unknown, version: number = VERSION_SURCOUCHE): string {
  return JSON.stringify({ version, contenu });
}

const HUILE: Produit = {
  slug: 'huile',
  nom: 'Huile d’essai',
  famille: 'huiles-et-vinaigres',
  resume: 'Un résumé d’origine.',
  description: ['Un paragraphe.'],
  origine: 'Quelque part',
  ingredients: ['huile'],
  allergenes: ['aucun'],
  conservation: { type: 'stable', ddmMois: 18 },
  conseilConservation: ['À l’abri de la lumière.'],
  personnalisable: false,
  variantes: [
    { sku: 'A-25', format: '25 cl', prixCentimes: 1290, poidsGrammes: 520, stock: 42 },
    { sku: 'A-50', format: '50 cl', prixCentimes: 2250, poidsGrammes: 950, stock: 28 },
  ],
  miseEnAvant: false,
  illustration: { forme: 'bouteille', teinte: 'olive' },
};

const MIEL: Produit = {
  ...HUILE,
  slug: 'miel',
  nom: 'Miel d’essai',
  famille: 'miels-et-confitures',
  variantes: [
    { sku: 'B-250', format: '250 g', prixCentimes: 890, poidsGrammes: 420, stock: 44 },
  ],
  miseEnAvant: true,
  illustration: { forme: 'pot', teinte: 'ocre' },
};

const BASE: readonly Produit[] = [HUILE, MIEL];

/* -------------------------------------------------------------------------- */
/* 1. L'enveloppe                                                              */
/* -------------------------------------------------------------------------- */

describe('lireSurcouche', () => {
  it('rend une surcouche vide quand la clé est absente', () => {
    expect(lireSurcouche(stockage())).toEqual({});
  });

  it('rend une surcouche vide quand le stockage lève', () => {
    expect(lireSurcouche(STOCKAGE_QUI_LEVE)).toEqual({});
  });

  it('rend une surcouche vide sur du JSON invalide', () => {
    expect(lireSurcouche(stockage('{ceci n’est pas du JSON'))).toEqual({});
  });

  it('rend une surcouche vide quand la charge n’est pas un objet', () => {
    expect(lireSurcouche(stockage(JSON.stringify('une chaîne')))).toEqual({});
  });

  it('rejette une enveloppe d’une autre version', () => {
    const rangee = stockage(enveloppe({ huile: { resume: 'Autre' } }, 2));
    expect(lireSurcouche(rangee)).toEqual({});
  });

  it('rejette un contenu qui n’est pas un objet', () => {
    expect(lireSurcouche(stockage(enveloppe([1, 2, 3])))).toEqual({});
    expect(lireSurcouche(stockage(enveloppe(null)))).toEqual({});
  });

  it('relit ce qui a été écrit', () => {
    const rangee = stockage();
    const surcouche: SurcoucheCatalogue = { huile: { resume: 'Nouveau résumé' } };

    expect(ecrireSurcouche(rangee, surcouche)).toBe(true);
    expect(lireSurcouche(rangee)).toEqual(surcouche);
  });

  it('écarte le slug vide, garde les autres', () => {
    const rangee = stockage(
      enveloppe({ '': { resume: 'Orphelin' }, huile: { resume: 'Gardé' } }),
    );

    expect(lireSurcouche(rangee)).toEqual({ huile: { resume: 'Gardé' } });
  });

  it('écarte un slug dont la modification ne survit pas au filtre', () => {
    const rangee = stockage(
      enveloppe({ huile: { poidsGrammes: 999 }, miel: { miseEnAvant: false } }),
    );

    expect(lireSurcouche(rangee)).toEqual({ miel: { miseEnAvant: false } });
  });
});

describe('ecrireSurcouche et effacerSurcouche', () => {
  it('rendent false quand le stockage refuse', () => {
    expect(ecrireSurcouche(STOCKAGE_QUI_LEVE, {})).toBe(false);
    expect(effacerSurcouche(STOCKAGE_QUI_LEVE)).toBe(false);
  });

  it('effacent réellement la clé', () => {
    const rangee = stockage();
    ecrireSurcouche(rangee, { huile: { resume: 'X' } });

    expect(effacerSurcouche(rangee)).toBe(true);
    expect(rangee.contenu).toBeNull();
    expect(lireSurcouche(rangee)).toEqual({});
  });
});

/* -------------------------------------------------------------------------- */
/* 2. Le filtre, champ par champ                                               */
/* -------------------------------------------------------------------------- */

describe('assainirVariante', () => {
  it('garde le prix et le stock, rien d’autre', () => {
    expect(
      assainirVariante({
        sku: 'A-25',
        prixCentimes: 990,
        stock: 7,
        poidsGrammes: 1,
        format: 'inventé',
      }),
    ).toEqual({ sku: 'A-25', prixCentimes: 990, stock: 7 });
  });

  it('refuse une variante sans SKU exploitable', () => {
    expect(assainirVariante({ prixCentimes: 990 })).toBeNull();
    expect(assainirVariante({ sku: '', prixCentimes: 990 })).toBeNull();
    expect(assainirVariante({ sku: 42, prixCentimes: 990 })).toBeNull();
    expect(assainirVariante('A-25')).toBeNull();
    expect(assainirVariante(null)).toBeNull();
    expect(assainirVariante(['A-25'])).toBeNull();
  });

  it('refuse une variante qui ne modifie rien d’autorisé', () => {
    expect(assainirVariante({ sku: 'A-25' })).toBeNull();
    expect(assainirVariante({ sku: 'A-25', poidsGrammes: 12 })).toBeNull();
  });

  it('refuse un prix ou un stock qui n’est pas un entier positif', () => {
    expect(assainirVariante({ sku: 'A-25', prixCentimes: 12.5 })).toBeNull();
    expect(assainirVariante({ sku: 'A-25', prixCentimes: -1 })).toBeNull();
    expect(assainirVariante({ sku: 'A-25', prixCentimes: '990' })).toBeNull();
    expect(assainirVariante({ sku: 'A-25', stock: Number.NaN })).toBeNull();
    expect(assainirVariante({ sku: 'A-25', prixCentimes: 0 })).toEqual({
      sku: 'A-25',
      prixCentimes: 0,
    });
  });
});

describe('assainirModification', () => {
  it('garde les trois champs de produit autorisés', () => {
    expect(
      assainirModification({ resume: 'Neuf', miseEnAvant: true, disponible: false }),
    ).toEqual({ resume: 'Neuf', miseEnAvant: true, disponible: false });
  });

  it('ignore CHAMP PAR CHAMP ce qui n’est pas autorisé', () => {
    expect(
      assainirModification({
        resume: 'Neuf',
        slug: 'autre-adresse',
        nom: 'Autre nom',
        description: ['réécrite'],
        allergenes: ['inventé'],
        conservation: { type: 'perissable', dlcJours: 1, chaineDuFroid: true },
        piecesEligibles: ['A-25'],
        composition: [],
      }),
    ).toEqual({ resume: 'Neuf' });
  });

  it('refuse un résumé vide ou non textuel', () => {
    expect(assainirModification({ resume: '   ' })).toBeNull();
    expect(assainirModification({ resume: 12 })).toBeNull();
  });

  it('refuse une mise en avant ou une disponibilité non booléennes', () => {
    expect(assainirModification({ miseEnAvant: 'oui' })).toBeNull();
    expect(assainirModification({ disponible: 0 })).toBeNull();
  });

  it('refuse ce qui n’est pas un objet', () => {
    expect(assainirModification(null)).toBeNull();
    expect(assainirModification('resume')).toBeNull();
    expect(assainirModification([{ resume: 'Neuf' }])).toBeNull();
  });

  it('écarte les variantes illisibles sans perdre les autres', () => {
    expect(
      assainirModification({
        variantes: [
          { sku: 'A-25', prixCentimes: 990 },
          { poidsGrammes: 3 },
          'A-50',
          { sku: 'A-50', stock: 4 },
        ],
      }),
    ).toEqual({
      variantes: [
        { sku: 'A-25', prixCentimes: 990 },
        { sku: 'A-50', stock: 4 },
      ],
    });
  });

  it('ignore un champ « variantes » qui n’est pas un tableau', () => {
    expect(assainirModification({ resume: 'Neuf', variantes: { 'A-25': 990 } })).toEqual({
      resume: 'Neuf',
    });
  });

  it('rend null quand rien ne survit', () => {
    expect(assainirModification({})).toBeNull();
    expect(assainirModification({ poidsGrammes: 12, variantes: [] })).toBeNull();
  });
});

describe('assainirSurcouche', () => {
  it('rend un objet vide sur une entrée qui n’en est pas un', () => {
    expect(assainirSurcouche(null)).toEqual({});
    expect(assainirSurcouche('huile')).toEqual({});
    expect(assainirSurcouche([])).toEqual({});
  });
});

/* -------------------------------------------------------------------------- */
/* La fusion d'un patch                                                        */
/* -------------------------------------------------------------------------- */

describe('fusionnerDansSurcouche', () => {
  it('ajoute un slug absent', () => {
    expect(fusionnerDansSurcouche({}, 'huile', { resume: 'Neuf' })).toEqual({
      huile: { resume: 'Neuf' },
    });
  });

  it('n’altère pas la surcouche reçue', () => {
    const depart: SurcoucheCatalogue = { huile: { resume: 'A' } };
    fusionnerDansSurcouche(depart, 'huile', { resume: 'B' });

    expect(depart).toEqual({ huile: { resume: 'A' } });
  });

  it('fusionne les champs de produit', () => {
    const apres = fusionnerDansSurcouche(
      { huile: { resume: 'A', miseEnAvant: true } },
      'huile',
      { disponible: false },
    );

    expect(apres).toEqual({
      huile: { resume: 'A', miseEnAvant: true, disponible: false },
    });
  });

  it('fusionne les variantes SKU PAR SKU', () => {
    const apres = fusionnerDansSurcouche(
      { huile: { variantes: [{ sku: 'A-25', prixCentimes: 990 }] } },
      'huile',
      { variantes: [{ sku: 'A-50', stock: 3 }] },
    );

    expect(apres['huile']?.variantes).toEqual([
      { sku: 'A-25', prixCentimes: 990 },
      { sku: 'A-50', stock: 3 },
    ]);
  });

  it('complète une variante déjà présente sans effacer son autre champ', () => {
    const apres = fusionnerDansSurcouche(
      { huile: { variantes: [{ sku: 'A-25', prixCentimes: 990 }] } },
      'huile',
      { variantes: [{ sku: 'A-25', stock: 3 }] },
    );

    expect(apres['huile']?.variantes).toEqual([
      { sku: 'A-25', prixCentimes: 990, stock: 3 },
    ]);
  });

  it('conserve les variantes déjà là quand le patch n’en porte pas', () => {
    const apres = fusionnerDansSurcouche(
      { huile: { variantes: [{ sku: 'A-25', prixCentimes: 990 }] } },
      'huile',
      { resume: 'Neuf' },
    );

    expect(apres).toEqual({
      huile: { resume: 'Neuf', variantes: [{ sku: 'A-25', prixCentimes: 990 }] },
    });
  });

  it('RETIRE le slug quand le patch ne survit pas au filtre', () => {
    const apres = fusionnerDansSurcouche(
      { huile: { resume: 'A' }, miel: { resume: 'B' } },
      'huile',
      { poidsGrammes: 12 },
    );

    expect(apres).toEqual({ miel: { resume: 'B' } });
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Les lectures de vitrine                                                  */
/* -------------------------------------------------------------------------- */

describe('lectures de vitrine', () => {
  const SURCOUCHE: SurcoucheCatalogue = {
    huile: {
      resume: 'Résumé marchand',
      disponible: false,
      miseEnAvant: true,
      variantes: [{ sku: 'A-50', prixCentimes: 1500, stock: 3 }],
    },
  };

  it('rendent la valeur de base sans surcouche', () => {
    expect(prixAffiche({}, 'huile', 'A-25', 1290)).toBe(1290);
    expect(stockAffiche({}, 'huile', 'A-25', 42)).toBe(42);
    expect(resumeAffiche({}, 'huile', 'Origine')).toBe('Origine');
    expect(miseEnAvantAffichee({}, 'huile', false)).toBe(false);
    expect(estDisponibleAffiche({}, 'huile')).toBe(true);
  });

  it('rendent la valeur de base pour un slug non modifié', () => {
    expect(prixAffiche(SURCOUCHE, 'miel', 'B-250', 890)).toBe(890);
    expect(estDisponibleAffiche(SURCOUCHE, 'miel')).toBe(true);
  });

  it('rendent la valeur de base pour une variante non modifiée', () => {
    expect(prixAffiche(SURCOUCHE, 'huile', 'A-25', 1290)).toBe(1290);
    expect(stockAffiche(SURCOUCHE, 'huile', 'A-25', 42)).toBe(42);
  });

  it('rendent la valeur surcouchée quand elle existe', () => {
    expect(prixAffiche(SURCOUCHE, 'huile', 'A-50', 2250)).toBe(1500);
    expect(stockAffiche(SURCOUCHE, 'huile', 'A-50', 28)).toBe(3);
    expect(resumeAffiche(SURCOUCHE, 'huile', 'Origine')).toBe('Résumé marchand');
    expect(miseEnAvantAffichee(SURCOUCHE, 'huile', false)).toBe(true);
    expect(estDisponibleAffiche(SURCOUCHE, 'huile')).toBe(false);
  });

  it('calcule le plus bas des prix affichés', () => {
    const variantes = [
      { sku: 'A-25', prixCentimes: 1290 },
      { sku: 'A-50', prixCentimes: 2250 },
    ];

    expect(prixLePlusBasAffiche({}, 'huile', variantes)).toBe(1290);
    /* La surcouche descend le 50 cl SOUS le 25 cl : c'est lui qui devient le
       « à partir de », et un minimum calculé sur le catalogue livré aurait
       affiché 12,90 € au-dessus d'une fiche à 10,00 €. */
    expect(
      prixLePlusBasAffiche(
        { huile: { variantes: [{ sku: 'A-50', prixCentimes: 1000 }] } },
        'huile',
        variantes,
      ),
    ).toBe(1000);
  });

  it('rend zéro pour un produit sans variante — cas impossible, réponse sûre', () => {
    expect(prixLePlusBasAffiche({}, 'huile', [])).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Le dépôt                                                                    */
/* -------------------------------------------------------------------------- */

describe('DepotNavigateur', () => {
  it('rend le catalogue livré tant que rien n’est modifié', () => {
    const depot = new DepotNavigateur(BASE, stockage());

    expect(depot.lire()).toEqual(BASE);
    expect(depot.surcouche()).toEqual({});
  });

  it('applique une modification enregistrée', () => {
    const rangee = stockage();
    const depot = new DepotNavigateur(BASE, rangee);

    depot.enregistrerModification('huile', {
      resume: 'Résumé marchand',
      disponible: false,
      variantes: [{ sku: 'A-50', prixCentimes: 1500 }],
    });

    const [huile, miel] = depot.lire();

    expect(huile?.resume).toBe('Résumé marchand');
    expect(estDisponible(huile ?? HUILE)).toBe(false);
    expect(huile?.variantes[1]?.prixCentimes).toBe(1500);
    /* Le poids et le format n'ont pas bougé : ce sont des entrées de calcul. */
    expect(huile?.variantes[1]?.poidsGrammes).toBe(950);
    expect(huile?.variantes[1]?.format).toBe('50 cl');
    expect(miel).toEqual(MIEL);
  });

  it('accumule deux modifications successives', () => {
    const rangee = stockage();
    const depot = new DepotNavigateur(BASE, rangee);

    depot.enregistrerModification('huile', {
      variantes: [{ sku: 'A-25', prixCentimes: 990 }],
    });
    depot.enregistrerModification('huile', {
      variantes: [{ sku: 'A-50', stock: 2 }],
    });

    const [huile] = depot.lire();

    expect(huile?.variantes[0]?.prixCentimes).toBe(990);
    expect(huile?.variantes[1]?.stock).toBe(2);
  });

  it('réinitialise et rend l’étal d’origine', () => {
    const rangee = stockage();
    const depot = new DepotNavigateur(BASE, rangee);

    depot.enregistrerModification('huile', { resume: 'Résumé marchand' });
    depot.reinitialiser();

    expect(depot.lire()).toEqual(BASE);
    expect(rangee.contenu).toBeNull();
  });

  it('exporte le catalogue COMPLET, surcouché et indenté', () => {
    const rangee = stockage();
    const depot = new DepotNavigateur(BASE, rangee);

    depot.enregistrerModification('huile', {
      variantes: [{ sku: 'A-25', prixCentimes: 990 }],
    });

    const json = depot.exporter();
    const relu = JSON.parse(json) as readonly Produit[];

    expect(json).toContain('\n  ');
    expect(relu).toHaveLength(2);
    /* La prose entière est là : c'est ce qu'une base de données enregistre. */
    expect(relu[0]?.description).toEqual(HUILE.description);
    expect(relu[0]?.variantes[0]?.prixCentimes).toBe(990);
    expect(relu[1]).toEqual(MIEL);
  });
});

/* -------------------------------------------------------------------------- */
/* La fonction pure de C2, sous sa forme élargie                               */
/* -------------------------------------------------------------------------- */

describe('appliquerSurcouche', () => {
  it('rend le produit tel quel quand rien ne le concerne', () => {
    expect(appliquerSurcouche(BASE, {})).toEqual(BASE);
  });

  it('applique les champs de produit sans toucher aux variantes', () => {
    const [huile] = appliquerSurcouche(BASE, {
      huile: { resume: 'Résumé marchand', disponible: false },
    });

    expect(huile?.resume).toBe('Résumé marchand');
    expect(huile?.variantes).toEqual(HUILE.variantes);
  });

  it('n’écrase JAMAIS le slug ni le SKU', () => {
    const [huile] = appliquerSurcouche(BASE, {
      huile: {
        slug: 'autre-adresse',
        variantes: [{ sku: 'A-25', prixCentimes: 990 }],
      },
    });

    expect(huile?.slug).toBe('huile');
    expect(huile?.variantes[0]?.sku).toBe('A-25');
  });

  it('ignore une variante dont le SKU n’existe pas', () => {
    const [huile] = appliquerSurcouche(BASE, {
      huile: { variantes: [{ sku: 'INCONNU', prixCentimes: 1 }] },
    });

    expect(huile?.variantes).toEqual(HUILE.variantes);
  });
});

describe('recherches du catalogue', () => {
  it('trouve un produit par son slug, ou rend undefined', () => {
    expect(trouverProduitParSlug(BASE, 'miel')?.nom).toBe('Miel d’essai');
    expect(trouverProduitParSlug(BASE, 'inexistant')).toBeUndefined();
  });

  it('trouve une variante par son SKU, avec son produit', () => {
    expect(trouverReferenceParSku(BASE, 'A-50')?.produit.slug).toBe('huile');
    expect(trouverReferenceParSku(BASE, 'B-250')?.variante.prixCentimes).toBe(890);
    expect(trouverReferenceParSku(BASE, 'INCONNU')).toBeUndefined();
  });
});

describe('estDisponible', () => {
  it('traite l’absence du champ comme « en vente »', () => {
    expect(estDisponible({})).toBe(true);
    expect(estDisponible({ disponible: true })).toBe(true);
    expect(estDisponible({ disponible: false })).toBe(false);
  });
});
