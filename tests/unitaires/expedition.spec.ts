import { describe, expect, it } from 'vitest';

import { BAREMES, type BaremeZone } from '@/donnees/bareme-expedition';
import {
  calculerFraisPort,
  formaterPoids,
  poidsTotal,
  resteAvantFranco,
  trancheApplicable,
  type LigneExpediable,
  type ResultatExpedition,
} from '@/lib/expedition';
import { typographier } from '@/lib/typographie';

/**
 * Le moteur de frais de port.
 *
 * Trois choses sont vérifiées ici, et dans cet ordre d'importance :
 *
 * 1. LES BORNES. Un barème par tranches se casse toujours au même endroit :
 *    d'un côté ou de l'autre de la borne haute. Chaque frontière du barème est
 *    donc testée au gramme qui la touche et au gramme qui la dépasse.
 * 2. L'ORDRE DES CINQ ÉTAPES. Les tests du franco avec produit frais
 *    échoueraient si le franco était appliqué avant l'isotherme ; ceux du
 *    périssable hors métropole échoueraient si la zone était examinée après le
 *    calcul du prix. L'ordre documenté dans `expedition.ts` n'est pas un
 *    commentaire décoratif, il est vérifiable.
 * 3. LES MESSAGES DE REFUS. Ils s'affichent tels quels devant un client. Les
 *    phrases attendues sont écrites ici en toutes lettres, avec des espaces
 *    ordinaires, puis passées par `typographier()` — la même convention que le
 *    reste du projet (décision D11) : rien d'invisible n'est saisi à la main.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures — des lignes tirées du catalogue réel                              */
/* -------------------------------------------------------------------------- */

/** Huile d'olive 25 cl : 520 g, 12,90 €. Le produit sec de référence. */
const HUILE: LigneExpediable = {
  sku: 'MV-HV-OLI-25CL',
  quantite: 1,
  poidsUnitaireGrammes: 520,
  perissable: false,
};

/** Beurre de baratte 250 g : 380 g, 7,40 €. Chaîne du froid. */
const BEURRE: LigneExpediable = {
  sku: 'MV-FR-BEU-250G',
  quantite: 1,
  poidsUnitaireGrammes: 380,
  perissable: true,
};

/** Fromage de brebis 250 g : 400 g, 11,90 €. Chaîne du froid. */
const FROMAGE: LigneExpediable = {
  sku: 'MV-FR-BRE-250G',
  quantite: 1,
  poidsUnitaireGrammes: 400,
  perissable: true,
};

/** Panier frais de référence : 780 g, 19,30 € de marchandise. */
const PANIER_FRAIS = [BEURRE, FROMAGE];

/** Un poids arbitraire, en une seule ligne, pour viser une borne exacte. */
function colisDe(grammes: number, perissable = false): LigneExpediable[] {
  return [
    {
      sku: 'MV-TEST-COLIS',
      quantite: 1,
      poidsUnitaireGrammes: grammes,
      perissable,
    },
  ];
}

/**
 * Barème de surcouche marchand : tarif unique, aucun franco, isotherme plus
 * cher. Il ne ressemble volontairement à aucun des trois barèmes versionnés,
 * pour qu'un résultat qui lui obéirait par hasard soit impossible.
 */
const BAREME_MARCHAND: BaremeZone = {
  zone: 'metropole',
  libelle: 'France métropolitaine',
  tranches: [{ jusquAGrammes: 2000, prixCentimes: 300 }],
  seuilFrancoCentimes: null,
  supplementIsothermeCentimes: 900,
  acceptePerissable: true,
  delaiIndicatif: '1 jour ouvré',
};

/* -------------------------------------------------------------------------- */
/* Aides de lecture — l'union discriminée se dénoue une fois pour toutes       */
/* -------------------------------------------------------------------------- */

type Calcule = Extract<ResultatExpedition, { statut: 'calcule' }>;
type Impossible = Extract<ResultatExpedition, { statut: 'impossible' }>;

function siCalcule(resultat: ResultatExpedition): Calcule {
  if (resultat.statut !== 'calcule') {
    throw new Error(`Attendu « calcule », reçu un refus : ${resultat.message}`);
  }

  return resultat;
}

function siImpossible(resultat: ResultatExpedition): Impossible {
  if (resultat.statut !== 'impossible') {
    throw new Error(
      `Attendu « impossible », reçu ${String(resultat.fraisCentimes)} centimes`,
    );
  }

  return resultat;
}

/* -------------------------------------------------------------------------- */
/* poidsTotal                                                                  */
/* -------------------------------------------------------------------------- */

describe('poidsTotal', () => {
  it('rend zéro pour un panier sans ligne', () => {
    expect(poidsTotal([])).toBe(0);
  });

  it('rend le poids d’une ligne unique', () => {
    expect(poidsTotal([HUILE])).toBe(520);
  });

  it('multiplie par la quantité', () => {
    expect(poidsTotal([{ ...HUILE, quantite: 3 }])).toBe(1560);
  });

  it('additionne les lignes hétérogènes', () => {
    expect(poidsTotal([{ ...HUILE, quantite: 2 }, BEURRE, FROMAGE])).toBe(1820);
  });

  it('rend zéro quand toutes les quantités sont nulles', () => {
    expect(poidsTotal([{ ...HUILE, quantite: 0 }])).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* trancheApplicable — les bornes, une par une                                 */
/* -------------------------------------------------------------------------- */

describe('trancheApplicable — bornes hautes incluses', () => {
  const metropole = BAREMES.metropole;

  it('range 1 g dans la première tranche', () => {
    expect(trancheApplicable(metropole, 1)?.prixCentimes).toBe(490);
  });

  it('range 1 000 g exactement dans la PREMIÈRE tranche (borne incluse)', () => {
    expect(trancheApplicable(metropole, 1000)?.prixCentimes).toBe(490);
  });

  it('bascule à 1 001 g dans la deuxième tranche', () => {
    expect(trancheApplicable(metropole, 1001)?.prixCentimes).toBe(690);
  });

  it('range 3 000 g exactement dans la deuxième tranche', () => {
    expect(trancheApplicable(metropole, 3000)?.prixCentimes).toBe(690);
  });

  it('bascule à 3 001 g dans la troisième tranche', () => {
    expect(trancheApplicable(metropole, 3001)?.prixCentimes).toBe(950);
  });

  it('range 10 000 g exactement dans la troisième tranche', () => {
    expect(trancheApplicable(metropole, 10000)?.prixCentimes).toBe(950);
  });

  it('bascule à 10 001 g dans la quatrième tranche', () => {
    expect(trancheApplicable(metropole, 10001)?.prixCentimes).toBe(1490);
  });

  it('range 30 000 g exactement dans la dernière tranche', () => {
    expect(trancheApplicable(metropole, 30000)?.prixCentimes).toBe(1490);
  });

  it('ne trouve plus rien à 30 001 g', () => {
    expect(trancheApplicable(metropole, 30001)).toBeNull();
  });

  it('s’arrête à 10 kg en outre-mer, où le barème n’a que trois tranches', () => {
    expect(trancheApplicable(BAREMES['outre-mer'], 10000)?.prixCentimes).toBe(3900);
    expect(trancheApplicable(BAREMES['outre-mer'], 10001)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* resteAvantFranco                                                            */
/* -------------------------------------------------------------------------- */

describe('resteAvantFranco', () => {
  it('rend le complément à verser en métropole', () => {
    expect(resteAvantFranco(BAREMES.metropole, 1930)).toBe(4970);
  });

  it('rend 1 centime quand il manque 1 centime', () => {
    expect(resteAvantFranco(BAREMES.metropole, 6899)).toBe(1);
  });

  it('rend zéro au seuil exact', () => {
    expect(resteAvantFranco(BAREMES.metropole, 6900)).toBe(0);
  });

  it('rend zéro au-delà du seuil, jamais un nombre négatif', () => {
    expect(resteAvantFranco(BAREMES.metropole, 12000)).toBe(0);
  });

  it('compte sur le seuil relevé de la Corse', () => {
    expect(resteAvantFranco(BAREMES.corse, 6900)).toBe(2000);
  });

  it('rend null en outre-mer, où il n’y a pas de franco du tout', () => {
    expect(resteAvantFranco(BAREMES['outre-mer'], 100000)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — étape 0, le panier vide                                 */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — panier vide', () => {
  it('ne facture rien et ne détaille rien', () => {
    const resultat = siCalcule(calculerFraisPort([], 'metropole', 0));

    expect(resultat.poidsTotalGrammes).toBe(0);
    expect(resultat.fraisCentimes).toBe(0);
    expect(resultat.francoApplique).toBe(false);
    expect(resultat.detail).toEqual([]);
  });

  it('renseigne tout de même ce qui manque pour le franco', () => {
    const resultat = siCalcule(calculerFraisPort([], 'metropole', 0));

    expect(resultat.resteAvantFrancoCentimes).toBe(6900);
  });

  it('ne facture rien non plus quand toutes les quantités sont à zéro', () => {
    const resultat = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 0 }], 'metropole', 0),
    );

    expect(resultat.fraisCentimes).toBe(0);
    expect(resultat.poidsTotalGrammes).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — étapes 1 et 3, le poids et la tranche                   */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — poids et tranche', () => {
  it('facture la première tranche à 1 000 g pile', () => {
    const resultat = siCalcule(calculerFraisPort(colisDe(1000), 'metropole', 2000));

    expect(resultat.poidsTotalGrammes).toBe(1000);
    expect(resultat.fraisCentimes).toBe(490);
  });

  it('facture la deuxième tranche à 1 001 g', () => {
    const resultat = siCalcule(calculerFraisPort(colisDe(1001), 'metropole', 2000));

    expect(resultat.fraisCentimes).toBe(690);
  });

  it('facture la dernière tranche à 30 000 g', () => {
    const resultat = siCalcule(calculerFraisPort(colisDe(30000), 'metropole', 2000));

    expect(resultat.fraisCentimes).toBe(1490);
  });

  it('refuse 30 001 g et invite à écrire', () => {
    const resultat = siImpossible(
      calculerFraisPort(colisDe(30001), 'metropole', 2000),
    );

    expect(resultat.motif).toBe('poids-hors-bareme');
    expect(resultat.zone).toBe('metropole');
    expect(resultat.message).toBe(
      typographier(
        'Ce panier pèse 30 001 g. Le barème s’arrête à 30 kg pour cette ' +
          'destination (France métropolitaine) : au-delà, l’expédition se chiffre ' +
          'au cas par cas. Écrivez-nous avec le contenu de votre panier, nous vous ' +
          'répondrons avec un prix ferme et un délai.',
      ),
    );
  });

  it('refuse dès 10 001 g en outre-mer, où le barème s’arrête plus tôt', () => {
    const resultat = siImpossible(
      calculerFraisPort(colisDe(10001), 'outre-mer', 2000),
    );

    expect(resultat.motif).toBe('poids-hors-bareme');
    expect(resultat.message).toContain(typographier('s’arrête à 10 kg'));
  });

  it('additionne les quantités multiples avant de choisir la tranche', () => {
    const resultat = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 3 }], 'metropole', 3870),
    );

    expect(resultat.poidsTotalGrammes).toBe(1560);
    expect(resultat.fraisCentimes).toBe(690);
  });

  it('bascule de tranche par l’effet de la seule quantité', () => {
    const deux = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 1 }], 'metropole', 1290),
    );
    const quatre = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 2 }], 'metropole', 2580),
    );

    expect(deux.fraisCentimes).toBe(490);
    expect(quatre.fraisCentimes).toBe(690);
  });

  it('détaille une seule ligne pour un panier sec', () => {
    const resultat = siCalcule(calculerFraisPort([HUILE], 'metropole', 1290));

    expect(resultat.detail).toEqual([
      {
        libelle: typographier('Expédition — France métropolitaine (colis jusqu’à 1 kg)'),
        montantCentimes: 490,
      },
    ]);
  });

  it('rend un total égal à la somme de son détail', () => {
    const resultat = siCalcule(calculerFraisPort(PANIER_FRAIS, 'metropole', 1930));
    const somme = resultat.detail.reduce(
      (total, ligne) => total + ligne.montantCentimes,
      0,
    );

    expect(somme).toBe(resultat.fraisCentimes);
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — étape 2, le périssable contre la zone                   */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — produits frais et zones', () => {
  it('refuse un panier frais vers la Corse, avec le message exact', () => {
    const resultat = siImpossible(calculerFraisPort(PANIER_FRAIS, 'corse', 1930));

    expect(resultat.motif).toBe('perissable-hors-metropole');
    expect(resultat.zone).toBe('corse');
    expect(resultat.message).toBe(
      typographier(
        'Ce panier contient un produit frais, expédié sous emballage isotherme ' +
          'et sous chaîne du froid continue : ces envois ne sont assurés qu’en ' +
          'France métropolitaine. La destination choisie (Corse) n’est pas ' +
          'desservie pour ces produits, et nous préférons refuser la commande ' +
          'plutôt que livrer une denrée douteuse. Retirez le produit frais du ' +
          'panier pour commander le reste.',
      ),
    );
  });

  it('refuse un panier frais vers l’outre-mer, avec le message exact', () => {
    const resultat = siImpossible(calculerFraisPort(PANIER_FRAIS, 'outre-mer', 1930));

    expect(resultat.motif).toBe('perissable-hors-metropole');
    expect(resultat.zone).toBe('outre-mer');
    expect(resultat.message).toBe(
      typographier(
        'Ce panier contient un produit frais, expédié sous emballage isotherme ' +
          'et sous chaîne du froid continue : ces envois ne sont assurés qu’en ' +
          'France métropolitaine. La destination choisie (Outre-mer) n’est pas ' +
          'desservie pour ces produits, et nous préférons refuser la commande ' +
          'plutôt que livrer une denrée douteuse. Retirez le produit frais du ' +
          'panier pour commander le reste.',
      ),
    );
  });

  it('refuse dès qu’UNE seule ligne est périssable, même noyée dans du sec', () => {
    const resultat = siImpossible(
      calculerFraisPort([{ ...HUILE, quantite: 4 }, BEURRE], 'corse', 6900),
    );

    expect(resultat.motif).toBe('perissable-hors-metropole');
  });

  it('refuse AVANT de regarder le poids : un panier frais hors barème donne le motif frais', () => {
    const resultat = siImpossible(
      calculerFraisPort(colisDe(40000, true), 'corse', 9000),
    );

    expect(resultat.motif).toBe('perissable-hors-metropole');
  });

  it('accepte le même panier sec vers la Corse, au tarif corse', () => {
    const resultat = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 1 }], 'corse', 1290),
    );

    expect(resultat.fraisCentimes).toBe(790);
  });

  it('accepte le même panier sec vers l’outre-mer, au tarif outre-mer', () => {
    const resultat = siCalcule(
      calculerFraisPort([{ ...HUILE, quantite: 1 }], 'outre-mer', 1290),
    );

    expect(resultat.fraisCentimes).toBe(1890);
    expect(resultat.resteAvantFrancoCentimes).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — étape 4, l'isotherme                                    */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — supplément isotherme', () => {
  it('facture l’isotherme en métropole et détaille DEUX lignes', () => {
    const resultat = siCalcule(calculerFraisPort(PANIER_FRAIS, 'metropole', 1930));

    expect(resultat.poidsTotalGrammes).toBe(780);
    expect(resultat.fraisCentimes).toBe(1090);
    expect(resultat.francoApplique).toBe(false);
    expect(resultat.detail).toEqual([
      {
        libelle: typographier('Expédition — France métropolitaine (colis jusqu’à 1 kg)'),
        montantCentimes: 490,
      },
      {
        libelle: typographier('Emballage isotherme (produit frais)'),
        montantCentimes: 600,
      },
    ]);
  });

  it('n’ajoute rien quand aucune ligne n’est périssable', () => {
    const resultat = siCalcule(calculerFraisPort([HUILE], 'metropole', 1290));

    expect(resultat.fraisCentimes).toBe(490);
    expect(resultat.detail).toHaveLength(1);
  });

  it('ne facture l’isotherme qu’une fois, quel que soit le nombre de lignes fraîches', () => {
    const resultat = siCalcule(
      calculerFraisPort(
        [
          { ...BEURRE, quantite: 3 },
          { ...FROMAGE, quantite: 2 },
        ],
        'metropole',
        4600,
      ),
    );

    expect(resultat.poidsTotalGrammes).toBe(1940);
    expect(resultat.fraisCentimes).toBe(1290);
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — étape 5, le franco                                      */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — franco de port', () => {
  it('ne s’applique pas à un centime du seuil', () => {
    const resultat = siCalcule(calculerFraisPort([HUILE], 'metropole', 6899));

    expect(resultat.francoApplique).toBe(false);
    expect(resultat.fraisCentimes).toBe(490);
    expect(resultat.resteAvantFrancoCentimes).toBe(1);
  });

  it('s’applique au centime près, à 69,00 € pile', () => {
    const resultat = siCalcule(calculerFraisPort([HUILE], 'metropole', 6900));

    expect(resultat.francoApplique).toBe(true);
    expect(resultat.fraisCentimes).toBe(0);
    expect(resultat.resteAvantFrancoCentimes).toBe(0);
  });

  it('s’applique au-delà du seuil', () => {
    const resultat = siCalcule(calculerFraisPort(colisDe(25000), 'metropole', 15000));

    expect(resultat.francoApplique).toBe(true);
    expect(resultat.fraisCentimes).toBe(0);
  });

  it('ABSORBE le supplément isotherme — décision 004, pas d’astérisque', () => {
    const souffle = siCalcule(calculerFraisPort(PANIER_FRAIS, 'metropole', 6899));
    const offert = siCalcule(calculerFraisPort(PANIER_FRAIS, 'metropole', 6900));

    expect(souffle.fraisCentimes).toBe(1090);
    expect(offert.fraisCentimes).toBe(0);
    expect(offert.francoApplique).toBe(true);
  });

  it('remplace le détail par une ligne d’offre, sans montant résiduel', () => {
    const resultat = siCalcule(calculerFraisPort(PANIER_FRAIS, 'metropole', 6900));

    expect(resultat.detail).toEqual([
      {
        libelle: typographier('Frais de port offerts à partir de 69,00 €'),
        montantCentimes: 0,
      },
    ]);
  });

  it('applique le seuil relevé de la Corse, et pas celui de la métropole', () => {
    const entreLesDeux = siCalcule(calculerFraisPort([HUILE], 'corse', 6900));
    const auSeuilCorse = siCalcule(calculerFraisPort([HUILE], 'corse', 8900));

    expect(entreLesDeux.francoApplique).toBe(false);
    expect(entreLesDeux.fraisCentimes).toBe(790);
    expect(auSeuilCorse.francoApplique).toBe(true);
    expect(auSeuilCorse.fraisCentimes).toBe(0);
  });

  it('n’offre jamais rien en outre-mer, même sur un très gros panier', () => {
    const resultat = siCalcule(calculerFraisPort([HUILE], 'outre-mer', 100000));

    expect(resultat.francoApplique).toBe(false);
    expect(resultat.fraisCentimes).toBe(1890);
    expect(resultat.resteAvantFrancoCentimes).toBeNull();
  });

  it('n’efface pas un refus : un colis hors barème reste refusé, franco ou non', () => {
    const resultat = siImpossible(
      calculerFraisPort(colisDe(30001), 'metropole', 50000),
    );

    expect(resultat.motif).toBe('poids-hors-bareme');
  });
});

/* -------------------------------------------------------------------------- */
/* calculerFraisPort — barème injecté (surcouche marchand, décision D2)        */
/* -------------------------------------------------------------------------- */

describe('calculerFraisPort — barème injecté', () => {
  it('obéit au barème fourni plutôt qu’au barème versionné', () => {
    const resultat = siCalcule(
      calculerFraisPort([HUILE], 'metropole', 20000, BAREME_MARCHAND),
    );

    expect(resultat.fraisCentimes).toBe(300);
    expect(resultat.francoApplique).toBe(false);
    expect(resultat.resteAvantFrancoCentimes).toBeNull();
  });

  it('applique le supplément isotherme du barème fourni', () => {
    const resultat = siCalcule(
      calculerFraisPort(PANIER_FRAIS, 'metropole', 1930, BAREME_MARCHAND),
    );

    expect(resultat.fraisCentimes).toBe(1200);
  });

  it('conserve la zone demandée dans le résultat', () => {
    const resultat = siCalcule(
      calculerFraisPort([HUILE], 'corse', 1290, BAREME_MARCHAND),
    );

    expect(resultat.zone).toBe('corse');
  });
});

/* -------------------------------------------------------------------------- */
/* formaterPoids                                                               */
/* -------------------------------------------------------------------------- */

describe('formaterPoids', () => {
  it('dit les multiples exacts de mille en kilogrammes', () => {
    expect(formaterPoids(1000)).toBe(typographier('1 kg'));
    expect(formaterPoids(30000)).toBe(typographier('30 kg'));
  });

  it('dit le reste en grammes, séparateur de milliers compris', () => {
    expect(formaterPoids(780)).toBe(typographier('780 g'));
    expect(formaterPoids(30001)).toBe(typographier('30 001 g'));
  });

  it('ne laisse aucune espace ordinaire dans le résultat', () => {
    expect(formaterPoids(30001)).not.toMatch(/ /);
    expect(formaterPoids(1000)).not.toMatch(/ /);
  });
});
