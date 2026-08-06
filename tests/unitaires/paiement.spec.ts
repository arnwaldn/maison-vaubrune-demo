import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  choisirAdaptateur,
  NOM_VARIABLE_CLE,
  type CommandePreparee,
} from '@/lib/paiement/adaptateur';
import { ADAPTATEUR_SIMULE, CHEMIN_SIMULATION } from '@/lib/paiement/simule';
import { creerAdaptateurStripe, PREFIXE_CLE_TEST } from '@/lib/paiement/stripe';

/**
 * L'ADAPTATEUR DE PAIEMENT — le choix, et le refus des clés réelles.
 *
 * Ce fichier n'appelle AUCUN prestataire : il vérifie le choix de
 * l'implémentation et la construction de l'adaptateur, pas les échanges
 * réseau. Le seul comportement du prestataire qui compte pour ce projet est
 * antérieur à toute requête — le REFUS d'une clé qui n'est pas une clé de
 * test — et il se vérifie sur un constructeur.
 *
 * La variable d'environnement est posée puis retirée ici, dans le code du
 * test : le poste de travail interdit d'écrire son nom dans une ligne de
 * commande, et de toute façon un test qui dépend de l'environnement dans lequel
 * on l'a lancé n'est pas un test.
 */

const CLE_ORIGINE = process.env[NOM_VARIABLE_CLE];

beforeEach(() => {
  delete process.env[NOM_VARIABLE_CLE];
});

afterEach(() => {
  if (CLE_ORIGINE === undefined) {
    delete process.env[NOM_VARIABLE_CLE];
  } else {
    process.env[NOM_VARIABLE_CLE] = CLE_ORIGINE;
  }
});

const COMMANDE: CommandePreparee = {
  reference: 'MVB-20260806-2K7X',
  lignes: [],
  zone: 'metropole',
  fraisPortCentimes: 490,
  totalCentimes: 1470,
};

/* -------------------------------------------------------------------------- */

describe('choisirAdaptateur', () => {
  it('rend l’adaptateur simulé quand aucune clé n’est posée', () => {
    expect(choisirAdaptateur().nom).toBe('simule');
  });

  it('rend l’adaptateur simulé quand la clé est une chaîne vide', () => {
    process.env[NOM_VARIABLE_CLE] = '';

    expect(choisirAdaptateur().nom).toBe('simule');
  });

  it('rend l’adaptateur simulé quand la clé n’est faite que d’espaces', () => {
    process.env[NOM_VARIABLE_CLE] = '   ';

    expect(choisirAdaptateur().nom).toBe('simule');
  });

  it('rend l’adaptateur du prestataire dès qu’une clé de TEST est posée', () => {
    process.env[NOM_VARIABLE_CLE] = `${PREFIXE_CLE_TEST}0000000000000000`;

    expect(choisirAdaptateur().nom).toBe('stripe');
  });

  it('LIT L’ENVIRONNEMENT À CHAQUE APPEL, jamais une fois à l’import', () => {
    expect(choisirAdaptateur().nom).toBe('simule');

    process.env[NOM_VARIABLE_CLE] = `${PREFIXE_CLE_TEST}0000000000000000`;

    expect(choisirAdaptateur().nom).toBe('stripe');
  });

  it('LAISSE JETER une clé réelle plutôt que d’encaisser', () => {
    process.env[NOM_VARIABLE_CLE] = 'sk_live_0000000000000000';

    expect(() => choisirAdaptateur()).toThrow(/démonstration/);
  });
});

describe('creerAdaptateurStripe', () => {
  it('accepte une clé de test', () => {
    expect(creerAdaptateurStripe(`${PREFIXE_CLE_TEST}0000000000000000`).nom).toBe(
      'stripe',
    );
  });

  it('REFUSE une clé réelle, à la construction, avant tout appel', () => {
    expect(() => creerAdaptateurStripe('sk_live_0000000000000000')).toThrow(
      /clés de test/,
    );
  });

  it('refuse une clé publiable, qui n’a rien à faire côté serveur', () => {
    expect(() => creerAdaptateurStripe('pk_test_0000000000000000')).toThrow();
  });

  it('refuse une clé restreinte, même de test', () => {
    expect(() => creerAdaptateurStripe('rk_test_0000000000000000')).toThrow();
  });

  it('dit dans son message quoi faire — et que sans clé, la simulation prend le relais', () => {
    expect(() => creerAdaptateurStripe('sk_live_x')).toThrow(/simulé/);
  });
});

describe('ADAPTATEUR_SIMULE', () => {
  it('rend une adresse RELATIVE vers l’écran de simulation', async () => {
    const session = await ADAPTATEUR_SIMULE.creerSession(COMMANDE, 'https://exemple.test');

    expect(session.url.startsWith(`${CHEMIN_SIMULATION}?`)).toBe(true);
    expect(session.mode).toBe('simule');
    expect(session.reference).toBe(COMMANDE.reference);
  });

  it('porte la référence et le total en paramètres', async () => {
    const session = await ADAPTATEUR_SIMULE.creerSession(COMMANDE, '');
    const parametres = new URLSearchParams(session.url.split('?')[1] ?? '');

    expect(parametres.get('reference')).toBe(COMMANDE.reference);
    expect(parametres.get('total')).toBe('1470');
  });

  it('n’utilise PAS l’origine qu’on lui passe : il ne quitte pas le site', async () => {
    const session = await ADAPTATEUR_SIMULE.creerSession(
      COMMANDE,
      'https://ailleurs.example',
    );

    expect(session.url).not.toContain('ailleurs.example');
  });
});
