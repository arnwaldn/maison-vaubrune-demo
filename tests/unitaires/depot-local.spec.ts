import { describe, expect, it } from 'vitest';

import {
  abandonnerAttente,
  appliquerTransitionEnregistree,
  CLE_ATTENTE,
  CLE_COMMANDES,
  lireAttente,
  lireCommande,
  lireCommandes,
  lireCommandesLocales,
  mettreEnAttente,
  promouvoirEnPayee,
  purgerCommandesLocales,
  VERSION_COMMANDES,
  type StockageCommandes,
} from '@/lib/commandes/depot-local';
import type { Commande, CommandeEnAttente } from '@/lib/commandes/etats';

/**
 * LE DÉPÔT DES COMMANDES.
 *
 * Même parti pris que la persistance du panier : le stockage est INJECTÉ, donc
 * les cas qui comptent — quota dépassé, accès qui lève, enveloppe d'une autre
 * version, commande à moitié lisible — se reproduisent en trois lignes au lieu
 * d'attendre qu'un visiteur les rencontre.
 *
 * Le cas le plus important de ce fichier est l'IDEMPOTENCE de la promotion :
 * la page de confirmation est rafraîchie, mise en favori, rouverte depuis
 * l'historique. Elle appelle donc `promouvoirEnPayee()` plusieurs fois sur la
 * même référence, et doit obtenir la même commande, avec un journal qui n'a
 * pas bougé.
 */

const REFERENCE = 'MVB-20260806-2K7X';
const HORODATAGE = '2026-08-06T12:00:00.000Z';
const PLUS_TARD = '2026-08-07T09:15:00.000Z';

const ATTENTE: CommandeEnAttente = {
  reference: REFERENCE,
  lignes: [],
  zone: 'metropole',
  totaux: { sousTotal: 5690, port: 690, total: 6380 },
  coordonnees: {
    prenomNom: 'A COMPLETER',
    adresse: 'A COMPLETER',
    codePostal: '75011',
    courriel: 'essai@example.test',
  },
  modePaiement: 'simule',
};

/* -------------------------------------------------------------------------- */
/* Faux stockages                                                              */
/* -------------------------------------------------------------------------- */

function stockageMemoire(contenu: Record<string, string> = {}): StockageCommandes & {
  readonly contenu: Record<string, string>;
} {
  return {
    contenu,
    getItem: (cle) => contenu[cle] ?? null,
    setItem: (cle, valeur) => {
      contenu[cle] = valeur;
    },
    removeItem: (cle) => {
      delete contenu[cle];
    },
  };
}

/** Un stockage qui lève à la lecture comme à l'écriture. */
const STOCKAGE_VERROUILLE: StockageCommandes = {
  getItem: () => {
    throw new Error('accès au stockage refusé');
  },
  setItem: () => {
    throw new Error('accès au stockage refusé');
  },
  removeItem: () => {
    throw new Error('accès au stockage refusé');
  },
};

/** Un stockage qui lit ce qu'on lui a donné mais refuse toute écriture. */
function stockagePlein(contenu: Record<string, string> = {}): StockageCommandes {
  return {
    getItem: (cle) => contenu[cle] ?? null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
}

function enveloppe(contenu: unknown, version: unknown = VERSION_COMMANDES): string {
  return JSON.stringify({ version, contenu });
}

function commandePayee(): Commande {
  return {
    ...ATTENTE,
    etat: 'payee',
    journal: [{ etat: 'payee', horodatage: HORODATAGE }],
  };
}

/* -------------------------------------------------------------------------- */
/* La commande en attente                                                      */
/* -------------------------------------------------------------------------- */

describe('mettreEnAttente / lireAttente', () => {
  it('relit à l’identique ce qui a été mis en attente', () => {
    const stockage = stockageMemoire();

    expect(mettreEnAttente(stockage, ATTENTE)).toBe(true);
    expect(lireAttente(stockage)).toEqual(ATTENTE);
  });

  it('écrit sous une enveloppe versionnée, à la clé du projet', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    expect(JSON.parse(stockage.contenu[CLE_ATTENTE] ?? '')).toEqual({
      version: VERSION_COMMANDES,
      contenu: ATTENTE,
    });
  });

  it('rend `false` sans lever quand le stockage refuse d’écrire', () => {
    expect(mettreEnAttente(stockagePlein(), ATTENTE)).toBe(false);
  });

  it('rend `null` quand il n’y a rien en attente', () => {
    expect(lireAttente(stockageMemoire())).toBeNull();
  });

  it('rend `null`, sans lever, quand l’accès au stockage lève', () => {
    expect(lireAttente(STOCKAGE_VERROUILLE)).toBeNull();
  });
});

describe('abandonnerAttente', () => {
  it('efface la clé', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    expect(abandonnerAttente(stockage)).toBe(true);
    expect(lireAttente(stockage)).toBeNull();
  });

  it('rend `false` sans lever quand l’effacement est refusé', () => {
    expect(abandonnerAttente(stockagePlein())).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Lecture méfiante                                                            */
/* -------------------------------------------------------------------------- */

describe('lecture d’un stockage corrompu — l’état vide plutôt qu’une demi-vérité', () => {
  const cas: readonly (readonly [string, string])[] = [
    ['du JSON invalide', '{lignes:'],
    ['un JSON valide qui n’est pas un objet', '42'],
    ['le littéral `null`', 'null'],
    ['une enveloppe sans version', JSON.stringify({ contenu: [] })],
    ['une enveloppe d’une AUTRE version', enveloppe([], 2)],
    ['une charge qui n’est pas une liste', enveloppe({ pas: 'une liste' })],
  ];

  for (const [description, brut] of cas) {
    it(`rend une liste vide sur ${description}`, () => {
      expect(lireCommandes(stockageMemoire({ [CLE_COMMANDES]: brut }))).toEqual([]);
    });
  }

  it('rend une liste vide quand l’accès au stockage lève', () => {
    expect(lireCommandes(STOCKAGE_VERROUILLE)).toEqual([]);
  });

  it('rend une liste vide quand la clé est absente', () => {
    expect(lireCommandes(stockageMemoire())).toEqual([]);
  });

  const malformees: readonly (readonly [string, unknown])[] = [
    ['une commande qui n’est pas un objet', 'MVB-20260806-2K7X'],
    ['une commande `null`', null],
    ['une référence absente', { ...commandePayee(), reference: undefined }],
    ['une référence vide', { ...commandePayee(), reference: '' }],
    ['une référence numérique', { ...commandePayee(), reference: 7 }],
    ['des lignes qui ne sont pas un tableau', { ...commandePayee(), lignes: 'deux' }],
    ['une zone inconnue', { ...commandePayee(), zone: 'antarctique' }],
    ['une zone numérique', { ...commandePayee(), zone: 3 }],
    ['un mode de paiement inconnu', { ...commandePayee(), modePaiement: 'reel' }],
    ['des totaux absents', { ...commandePayee(), totaux: null }],
    ['des totaux qui ne sont pas un objet', { ...commandePayee(), totaux: 6380 }],
    [
      'un total non entier',
      { ...commandePayee(), totaux: { sousTotal: 5690, port: 690, total: 63.8 } },
    ],
    [
      'un port en toutes lettres',
      { ...commandePayee(), totaux: { sousTotal: 5690, port: '6,90', total: 6380 } },
    ],
    ['des coordonnées qui ne sont pas un objet', { ...commandePayee(), coordonnees: 12 }],
    [
      'des coordonnées incomplètes',
      { ...commandePayee(), coordonnees: { prenomNom: 'A COMPLETER' } },
    ],
    ['un état inconnu', { ...commandePayee(), etat: 'remboursee' }],
    ['un journal qui n’est pas un tableau', { ...commandePayee(), journal: 'payee' }],
    ['une entrée de journal qui n’est pas un objet', { ...commandePayee(), journal: [1] }],
    ['une entrée de journal `null`', { ...commandePayee(), journal: [null] }],
    [
      'une entrée de journal sans horodatage',
      { ...commandePayee(), journal: [{ etat: 'payee' }] },
    ],
    [
      'une entrée de journal à l’état inconnu',
      { ...commandePayee(), journal: [{ etat: 'remboursee', horodatage: HORODATAGE }] },
    ],
  ];

  for (const [description, brute] of malformees) {
    it(`rejette TOUTE la liste sur ${description}`, () => {
      const stockage = stockageMemoire({
        [CLE_COMMANDES]: enveloppe([commandePayee(), brute]),
      });

      expect(lireCommandes(stockage)).toEqual([]);
    });
  }

  it('accepte une commande SANS coordonnées : `null` est une valeur, pas une faute', () => {
    const sansCoordonnees: Commande = { ...commandePayee(), coordonnees: null };
    const stockage = stockageMemoire({
      [CLE_COMMANDES]: enveloppe([sansCoordonnees]),
    });

    expect(lireCommandes(stockage)).toEqual([sansCoordonnees]);
  });

  it('rejette une commande en attente malformée comme une commande', () => {
    const stockage = stockageMemoire({
      [CLE_ATTENTE]: enveloppe({ ...ATTENTE, zone: 'antarctique' }),
    });

    expect(lireAttente(stockage)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* La promotion                                                                */
/* -------------------------------------------------------------------------- */

describe('promouvoirEnPayee', () => {
  it('déplace l’attente vers les commandes, à l’état payée', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    const promue = promouvoirEnPayee(stockage, REFERENCE, HORODATAGE);

    expect(promue?.etat).toBe('payee');
    expect(promue?.reference).toBe(REFERENCE);
    expect(lireCommandes(stockage)).toHaveLength(1);
    expect(lireAttente(stockage)).toBeNull();
  });

  it('pose un journal d’EXACTEMENT une entrée, horodatée par l’appelant', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    expect(promouvoirEnPayee(stockage, REFERENCE, HORODATAGE)?.journal).toEqual([
      { etat: 'payee', horodatage: HORODATAGE },
    ]);
  });

  it('conserve les coordonnées et les montants de l’attente', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    expect(promouvoirEnPayee(stockage, REFERENCE, HORODATAGE)).toMatchObject({
      coordonnees: ATTENTE.coordonnees,
      totaux: ATTENTE.totaux,
      modePaiement: 'simule',
    });
  });

  it('est IDEMPOTENTE : trois appels, une seule commande, un journal figé', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    const premiere = promouvoirEnPayee(stockage, REFERENCE, HORODATAGE);
    const deuxieme = promouvoirEnPayee(stockage, REFERENCE, PLUS_TARD);
    const troisieme = promouvoirEnPayee(stockage, REFERENCE, PLUS_TARD);

    expect(deuxieme).toEqual(premiere);
    expect(troisieme).toEqual(premiere);
    expect(lireCommandes(stockage)).toHaveLength(1);
    expect(deuxieme?.journal).toHaveLength(1);
  });

  it('rend `null` quand rien n’est en attente et que rien n’est rangé', () => {
    expect(promouvoirEnPayee(stockageMemoire(), REFERENCE, HORODATAGE)).toBeNull();
  });

  it('rend `null` quand l’attente porte une AUTRE référence', () => {
    const stockage = stockageMemoire();
    mettreEnAttente(stockage, ATTENTE);

    expect(promouvoirEnPayee(stockage, 'MVB-20260806-9ZZZ', HORODATAGE)).toBeNull();
    expect(lireAttente(stockage)).not.toBeNull();
  });

  it('empile une seconde commande sans écraser la première', () => {
    const stockage = stockageMemoire();

    mettreEnAttente(stockage, ATTENTE);
    promouvoirEnPayee(stockage, REFERENCE, HORODATAGE);

    const seconde = { ...ATTENTE, reference: 'MVB-20260807-3H4K' };
    mettreEnAttente(stockage, seconde);
    promouvoirEnPayee(stockage, seconde.reference, PLUS_TARD);

    expect(lireCommandes(stockage).map((commande) => commande.reference)).toEqual([
      REFERENCE,
      seconde.reference,
    ]);
  });

  it('rend la commande mais GARDE l’attente quand l’écriture est refusée', () => {
    /* Un stockage plein ne doit pas faire disparaître la seule trace de la
       commande : on rend le récapitulatif à afficher, et l'attente survit. */
    const contenu = { [CLE_ATTENTE]: enveloppe(ATTENTE) };
    const stockage = stockagePlein(contenu);

    const promue = promouvoirEnPayee(stockage, REFERENCE, HORODATAGE);

    expect(promue?.reference).toBe(REFERENCE);
    expect(contenu[CLE_ATTENTE]).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/* Lecture unitaire                                                            */
/* -------------------------------------------------------------------------- */

describe('lireCommande', () => {
  it('retrouve une commande par sa référence', () => {
    const stockage = stockageMemoire({
      [CLE_COMMANDES]: enveloppe([commandePayee()]),
    });

    expect(lireCommande(stockage, REFERENCE)?.reference).toBe(REFERENCE);
  });

  it('rend `null` sur une référence inconnue', () => {
    const stockage = stockageMemoire({
      [CLE_COMMANDES]: enveloppe([commandePayee()]),
    });

    expect(lireCommande(stockage, 'MVB-20260806-9ZZZ')).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* La transition persistée                                                     */
/* -------------------------------------------------------------------------- */

describe('appliquerTransitionEnregistree', () => {
  function stockageAvecUneCommande() {
    return stockageMemoire({ [CLE_COMMANDES]: enveloppe([commandePayee()]) });
  }

  it('écrit le nouvel état ET la nouvelle entrée de journal', () => {
    const stockage = stockageAvecUneCommande();
    const resultat = appliquerTransitionEnregistree(
      stockage,
      REFERENCE,
      'preparee',
      PLUS_TARD,
    );

    expect(resultat.ok).toBe(true);

    const relue = lireCommande(stockage, REFERENCE);

    expect(relue?.etat).toBe('preparee');
    expect(relue?.journal).toEqual([
      { etat: 'payee', horodatage: HORODATAGE },
      { etat: 'preparee', horodatage: PLUS_TARD },
    ]);
  });

  it('ne touche pas aux autres commandes de la liste', () => {
    const autre: Commande = { ...commandePayee(), reference: 'MVB-20260807-3H4K' };
    const stockage = stockageMemoire({
      [CLE_COMMANDES]: enveloppe([commandePayee(), autre]),
    });

    appliquerTransitionEnregistree(stockage, REFERENCE, 'annulee', PLUS_TARD);

    expect(lireCommande(stockage, autre.reference)?.etat).toBe('payee');
  });

  it('refuse une référence inconnue, et le dit', () => {
    const resultat = appliquerTransitionEnregistree(
      stockageAvecUneCommande(),
      'MVB-20260806-9ZZZ',
      'preparee',
      PLUS_TARD,
    );

    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.motif).toContain('MVB-20260806-9ZZZ');
  });

  it('refuse une transition interdite SANS rien réécrire', () => {
    const stockage = stockageAvecUneCommande();
    const resultat = appliquerTransitionEnregistree(
      stockage,
      REFERENCE,
      'expediee',
      PLUS_TARD,
    );

    expect(resultat.ok).toBe(false);
    expect(lireCommande(stockage, REFERENCE)?.etat).toBe('payee');
    expect(lireCommande(stockage, REFERENCE)?.journal).toHaveLength(1);
  });

  it('refuse, en le disant, quand le stockage n’accepte plus d’écriture', () => {
    const stockage = stockagePlein({ [CLE_COMMANDES]: enveloppe([commandePayee()]) });
    const resultat = appliquerTransitionEnregistree(
      stockage,
      REFERENCE,
      'preparee',
      PLUS_TARD,
    );

    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.motif).toContain('refusé l’écriture');
  });
});

/* -------------------------------------------------------------------------- */
/* Le jeu d'essai : fusion, masquage, copie à l'écriture (tranche C6)          */
/* -------------------------------------------------------------------------- */

/**
 * LA COPIE À L'ÉCRITURE.
 *
 * Six commandes d'amorce peuplent l'espace de gestion sans jamais être écrites
 * dans le stockage. Faire avancer l'une d'elles doit en écrire une COPIE
 * locale, qui masque l'originale à la lecture suivante — et l'amorce doit
 * rester intacte, en mémoire, pour que « Réinitialiser le jeu d'essai » rende
 * exactement l'état de départ.
 *
 * C'est le seul endroit du projet où deux sources de commandes coexistent, et
 * les trois cas qui comptent sont ici : la fusion, le masquage, et le fait que
 * l'amorce reçue N'EST PAS MODIFIÉE.
 */
describe('le jeu d’essai et la copie à l’écriture', () => {
  const REFERENCE_AMORCE = 'MVB-20260718-7F2B';

  function amorce(): readonly Commande[] {
    return [
      {
        ...commandePayee(),
        reference: REFERENCE_AMORCE,
        etat: 'preparee',
        journal: [
          { etat: 'payee', horodatage: '2026-07-18T09:12:00.000Z' },
          { etat: 'preparee', horodatage: '2026-07-19T08:05:00.000Z' },
        ],
      },
    ];
  }

  it('rend l’amorce seule quand le navigateur n’a rien écrit', () => {
    const stockage = stockageMemoire();

    expect(lireCommandes(stockage, amorce())).toHaveLength(1);
    expect(lireCommandesLocales(stockage)).toHaveLength(0);
  });

  it('rend l’amorce PUIS les commandes locales', () => {
    const stockage = stockageMemoire({ [CLE_COMMANDES]: enveloppe([commandePayee()]) });
    const toutes = lireCommandes(stockage, amorce());

    expect(toutes.map((commande) => commande.reference)).toEqual([
      REFERENCE_AMORCE,
      REFERENCE,
    ]);
  });

  it('ignore l’amorce quand on ne la passe pas — le tunnel n’en veut pas', () => {
    const stockage = stockageMemoire({ [CLE_COMMANDES]: enveloppe([commandePayee()]) });

    expect(lireCommandes(stockage)).toHaveLength(1);
    expect(lireCommande(stockage, REFERENCE_AMORCE)).toBeNull();
  });

  it('ÉCRIT UNE COPIE quand on fait avancer une commande d’amorce', () => {
    const stockage = stockageMemoire();
    const jeu = amorce();

    const resultat = appliquerTransitionEnregistree(
      stockage,
      REFERENCE_AMORCE,
      'expediee',
      PLUS_TARD,
      jeu,
    );

    expect(resultat.ok).toBe(true);

    const locales = lireCommandesLocales(stockage);

    expect(locales).toHaveLength(1);
    expect(locales[0]?.reference).toBe(REFERENCE_AMORCE);
    expect(locales[0]?.etat).toBe('expediee');
    /* L'AMORCE N'A PAS BOUGÉ : c'est ce qui rend la réinitialisation exacte. */
    expect(jeu[0]?.etat).toBe('preparee');
    expect(jeu[0]?.journal).toHaveLength(2);
  });

  it('la copie MASQUE l’originale, sans la dupliquer à l’affichage', () => {
    const stockage = stockageMemoire();
    const jeu = amorce();

    appliquerTransitionEnregistree(
      stockage,
      REFERENCE_AMORCE,
      'expediee',
      PLUS_TARD,
      jeu,
    );

    const toutes = lireCommandes(stockage, jeu);

    expect(toutes).toHaveLength(1);
    expect(toutes[0]?.etat).toBe('expediee');
    expect(toutes[0]?.journal).toHaveLength(3);
  });

  it('REMPLACE la copie au second changement d’état, sans en créer une seconde', () => {
    const stockage = stockageMemoire();
    const jeu = amorce();

    appliquerTransitionEnregistree(stockage, REFERENCE_AMORCE, 'expediee', PLUS_TARD, jeu);
    const second = appliquerTransitionEnregistree(
      stockage,
      REFERENCE_AMORCE,
      'annulee',
      PLUS_TARD,
      jeu,
    );

    /* Expédiée est un état terminal : le second passage est refusé, et rien
       n'a été ajouté à la liste locale. */
    expect(second.ok).toBe(false);
    expect(lireCommandesLocales(stockage)).toHaveLength(1);
  });

  it('enchaîne deux transitions sur une même copie', () => {
    const stockage = stockageMemoire();
    const jeu: readonly Commande[] = [
      { ...commandePayee(), reference: REFERENCE_AMORCE },
    ];

    appliquerTransitionEnregistree(stockage, REFERENCE_AMORCE, 'preparee', PLUS_TARD, jeu);
    appliquerTransitionEnregistree(
      stockage,
      REFERENCE_AMORCE,
      'expediee',
      '2026-08-08T09:00:00.000Z',
      jeu,
    );

    const locales = lireCommandesLocales(stockage);

    expect(locales).toHaveLength(1);
    expect(locales[0]?.etat).toBe('expediee');
    expect(locales[0]?.journal).toHaveLength(3);
  });

  it('refuse une référence absente de l’amorce comme du stockage', () => {
    const resultat = appliquerTransitionEnregistree(
      stockageMemoire(),
      'MVB-20260806-9ZZZ',
      'preparee',
      PLUS_TARD,
      amorce(),
    );

    expect(resultat.ok).toBe(false);
  });
});

describe('purgerCommandesLocales', () => {
  it('efface la liste ET la commande en attente, et rend l’amorce intacte', () => {
    const stockage = stockageMemoire({
      [CLE_COMMANDES]: enveloppe([commandePayee()]),
      [CLE_ATTENTE]: enveloppe(ATTENTE),
    });
    const jeu: readonly Commande[] = [
      { ...commandePayee(), reference: 'MVB-20260718-7F2B' },
    ];

    expect(purgerCommandesLocales(stockage)).toBe(true);
    expect(lireCommandesLocales(stockage)).toHaveLength(0);
    expect(lireAttente(stockage)).toBeNull();
    expect(lireCommandes(stockage, jeu)).toHaveLength(1);
  });

  it('rend false quand le stockage refuse la suppression', () => {
    expect(purgerCommandesLocales(STOCKAGE_VERROUILLE)).toBe(false);
  });
});
