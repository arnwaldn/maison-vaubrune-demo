import { describe, expect, it } from 'vitest';

import {
  appliquerTransition,
  ETATS_COMMANDE,
  LIBELLE_ETAT,
  transitionsAutorisees,
  type Commande,
  type EtatCommande,
} from '@/lib/commandes/etats';

/**
 * LES ÉTATS D'UNE COMMANDE.
 *
 * Le graphe compte quatre états, donc SEIZE couples possibles. Quatre sont
 * autorisés, douze sont refusés, et ce fichier les parcourt tous les seize par
 * construction plutôt qu'à la main : une liste écrite à la main oublierait le
 * couple qu'on n'a pas pensé à écrire, et c'est précisément celui-là qui
 * casserait un jour.
 */

const HORODATAGE = '2026-08-06T12:00:00.000Z';
const PLUS_TARD = '2026-08-07T09:15:00.000Z';

function commande(etat: EtatCommande): Commande {
  return {
    reference: 'MVB-20260806-2K7X',
    lignes: [],
    zone: 'metropole',
    totaux: { sousTotal: 5690, port: 690, total: 6380 },
    coordonnees: null,
    etat,
    journal: [{ etat: 'payee', horodatage: HORODATAGE }],
    modePaiement: 'simule',
  };
}

/** Les quatre passages que le graphe autorise, et eux seuls. */
const AUTORISES: readonly (readonly [EtatCommande, EtatCommande])[] = [
  ['payee', 'preparee'],
  ['payee', 'annulee'],
  ['preparee', 'expediee'],
  ['preparee', 'annulee'],
];

function estAutorise(depuis: EtatCommande, vers: EtatCommande): boolean {
  return AUTORISES.some(([a, b]) => a === depuis && b === vers);
}

/* -------------------------------------------------------------------------- */

describe('transitionsAutorisees', () => {
  it('depuis « payée » : préparée ou annulée', () => {
    expect(transitionsAutorisees('payee')).toEqual(['preparee', 'annulee']);
  });

  it('depuis « préparée » : expédiée ou annulée', () => {
    expect(transitionsAutorisees('preparee')).toEqual(['expediee', 'annulee']);
  });

  it('« expédiée » est TERMINAL', () => {
    expect(transitionsAutorisees('expediee')).toEqual([]);
  });

  it('« annulée » est TERMINAL', () => {
    expect(transitionsAutorisees('annulee')).toEqual([]);
  });

  it('n’annonce jamais une transition vers un état inconnu', () => {
    for (const etat of ETATS_COMMANDE) {
      for (const cible of transitionsAutorisees(etat)) {
        expect(ETATS_COMMANDE).toContain(cible);
      }
    }
  });
});

describe('LIBELLE_ETAT', () => {
  it('nomme les quatre états en français', () => {
    expect(Object.keys(LIBELLE_ETAT).sort()).toEqual([...ETATS_COMMANDE].sort());
  });
});

/* -------------------------------------------------------------------------- */

describe('appliquerTransition — les seize couples', () => {
  for (const depuis of ETATS_COMMANDE) {
    for (const vers of ETATS_COMMANDE) {
      const attendu = estAutorise(depuis, vers);

      it(`${depuis} → ${vers} : ${attendu ? 'accepté' : 'REFUSÉ'}`, () => {
        const resultat = appliquerTransition(commande(depuis), vers, PLUS_TARD);

        expect(resultat.ok).toBe(attendu);
      });
    }
  }
});

describe('appliquerTransition — une transition acceptée', () => {
  const resultat = appliquerTransition(commande('payee'), 'preparee', PLUS_TARD);

  it('change l’état', () => {
    expect(resultat.ok).toBe(true);
    expect(resultat.ok && resultat.commande.etat).toBe('preparee');
  });

  it('ALLONGE le journal d’exactement une entrée, sans toucher aux précédentes', () => {
    expect(resultat.ok && resultat.commande.journal).toEqual([
      { etat: 'payee', horodatage: HORODATAGE },
      { etat: 'preparee', horodatage: PLUS_TARD },
    ]);
  });

  it('ne modifie PAS la commande reçue', () => {
    const origine = commande('payee');
    appliquerTransition(origine, 'annulee', PLUS_TARD);

    expect(origine.etat).toBe('payee');
    expect(origine.journal).toHaveLength(1);
  });

  it('conserve tout le reste — référence, montants, mode de paiement', () => {
    expect(resultat.ok && resultat.commande).toMatchObject({
      reference: 'MVB-20260806-2K7X',
      totaux: { sousTotal: 5690, port: 690, total: 6380 },
      modePaiement: 'simule',
    });
  });
});

describe('appliquerTransition — les refus, et ce qu’ils disent', () => {
  it('expédiée → payée : refus d’un état TERMINAL, le motif le dit', () => {
    const resultat = appliquerTransition(commande('expediee'), 'payee', PLUS_TARD);

    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.motif).toContain('ne change plus d’état');
  });

  it('annulée → préparée : refus d’un état TERMINAL', () => {
    const resultat = appliquerTransition(commande('annulee'), 'preparee', PLUS_TARD);

    expect(!resultat.ok && resultat.motif).toContain('annulée');
  });

  it('payée → expédiée : refus d’un SAUT, le motif énumère les possibles', () => {
    const resultat = appliquerTransition(commande('payee'), 'expediee', PLUS_TARD);

    expect(resultat.ok).toBe(false);
    expect(!resultat.ok && resultat.motif).toContain('préparée ou annulée');
  });

  it('payée → payée : une commande ne revient pas sur son propre état', () => {
    const resultat = appliquerTransition(commande('payee'), 'payee', PLUS_TARD);

    expect(resultat.ok).toBe(false);
  });

  it('un refus n’ajoute RIEN au journal, puisqu’il ne rend pas de commande', () => {
    const origine = commande('expediee');
    const resultat = appliquerTransition(origine, 'preparee', PLUS_TARD);

    expect(resultat.ok).toBe(false);
    expect(origine.journal).toHaveLength(1);
  });
});

describe('une commande qui traverse toute sa vie', () => {
  it('payée → préparée → expédiée, avec trois entrées au journal', () => {
    const premiere = appliquerTransition(commande('payee'), 'preparee', PLUS_TARD);

    expect(premiere.ok).toBe(true);

    if (!premiere.ok) {
      return;
    }

    const seconde = appliquerTransition(
      premiere.commande,
      'expediee',
      '2026-08-08T08:00:00.000Z',
    );

    expect(seconde.ok).toBe(true);
    expect(seconde.ok && seconde.commande.journal.map((entree) => entree.etat)).toEqual([
      'payee',
      'preparee',
      'expediee',
    ]);
  });
});
