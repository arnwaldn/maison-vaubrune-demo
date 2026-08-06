import { describe, expect, it } from 'vitest';

import { CATALOGUE } from '@/donnees/catalogue';
import { COMMANDES_AMORCE, REFERENCES_AMORCE } from '@/donnees/commandes-amorce';
import { ETATS_COMMANDE, type EtatCommande } from '@/lib/commandes/etats';
import { MOTIF_REFERENCE } from '@/lib/commandes/reference';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';
import { calculerTotaux } from '@/lib/panier/totaux';

/**
 * LE JEU D'ESSAI, VÉRIFIÉ.
 *
 * Ce fichier est une GARDE autant qu'un test. Les six commandes portent leurs
 * trois montants ÉCRITS EN DUR — c'est la sémantique du type, des montants figés
 * au paiement — et ce test les recalcule avec `calculerTotaux()`, la même
 * fonction que le panier et le récapitulatif.
 *
 * Il attrape donc deux choses différentes, et les deux comptent :
 *
 * - une faute de frappe dans le jeu d'essai, aujourd'hui ;
 * - le jour où un prix du catalogue change sous une commande figée. Ce jour-là
 *   le test échoue, et c'est le bon comportement : il faut alors décider,
 *   sciemment, si le jeu d'essai suit le nouveau prix ou reste à l'ancien.
 *
 * Les autres contrôles portent sur ce qu'un écran affichera sans le vérifier :
 * l'ordre du journal, la cohérence de l'état avec sa dernière entrée,
 * l'existence des SKU, et le caractère explicitement fictif des coordonnées.
 */

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);
const SKU_CONNUS = new Set(CATALOGUE_PANIER.map((article) => article.sku));

/** Répartition annoncée par la commande de la tranche C6. */
const REPARTITION_ATTENDUE: Record<EtatCommande, number> = {
  payee: 1,
  preparee: 2,
  expediee: 2,
  annulee: 1,
};

/** Le jeu d'essai est daté de juillet-août 2026, en dur : voir son en-tête. */
const DEBUT_FENETRE = Date.parse('2026-07-01T00:00:00.000Z');
const FIN_FENETRE = Date.parse('2026-09-01T00:00:00.000Z');

describe('le jeu d’essai', () => {
  it('compte six commandes, aux références uniques et bien formées', () => {
    expect(COMMANDES_AMORCE).toHaveLength(6);
    expect(REFERENCES_AMORCE).toHaveLength(6);
    expect(new Set(REFERENCES_AMORCE).size).toBe(6);

    for (const reference of REFERENCES_AMORCE) {
      expect(reference).toMatch(MOTIF_REFERENCE);
    }
  });

  it('rend les mêmes références que les commandes construites', () => {
    expect(COMMANDES_AMORCE.map((commande) => commande.reference)).toEqual(
      REFERENCES_AMORCE,
    );
  });

  it('répartit les états comme la tranche l’annonce', () => {
    const comptes: Record<EtatCommande, number> = {
      payee: 0,
      preparee: 0,
      expediee: 0,
      annulee: 0,
    };

    for (const commande of COMMANDES_AMORCE) {
      comptes[commande.etat] += 1;
    }

    expect(comptes).toEqual(REPARTITION_ATTENDUE);
  });
});

describe('les totaux du jeu d’essai', () => {
  /* LE CONTRÔLE CENTRAL : les trois montants écrits sont EXACTEMENT ceux que
     produit le moteur, sous-total, port et total. */
  it.each(COMMANDES_AMORCE.map((commande) => [commande.reference, commande] as const))(
    '%s : les trois montants écrits sont ceux du moteur',
    (_reference, commande) => {
      const recalcules = calculerTotaux(
        commande.lignes.map((calculee) => calculee.ligne),
        CATALOGUE_PANIER,
        commande.zone,
      );

      expect(recalcules.expedition.statut).toBe('calcule');

      const port =
        recalcules.expedition.statut === 'calcule'
          ? recalcules.expedition.fraisCentimes
          : null;

      expect(recalcules.sousTotalCentimes).toBe(commande.totaux.sousTotal);
      expect(port).toBe(commande.totaux.port);
      expect(recalcules.totalCentimes).toBe(commande.totaux.total);
    },
  );

  it('vérifie l’addition elle-même : sous-total + port = total', () => {
    for (const { reference, totaux } of COMMANDES_AMORCE) {
      expect(`${reference} ${String(totaux.sousTotal + totaux.port)}`).toBe(
        `${reference} ${String(totaux.total)}`,
      );
    }
  });

  it('ne porte que des entiers de centimes', () => {
    for (const { totaux } of COMMANDES_AMORCE) {
      expect(Number.isInteger(totaux.sousTotal)).toBe(true);
      expect(Number.isInteger(totaux.port)).toBe(true);
      expect(Number.isInteger(totaux.total)).toBe(true);
    }
  });
});

describe('les lignes du jeu d’essai', () => {
  it('ne cite que des SKU du catalogue', () => {
    for (const commande of COMMANDES_AMORCE) {
      expect(commande.lignes.length).toBeGreaterThan(0);

      for (const calculee of commande.lignes) {
        expect(SKU_CONNUS.has(calculee.article.sku)).toBe(true);
        expect(calculee.ligne.quantite).toBeGreaterThan(0);

        for (const sku of calculee.ligne.composition ?? []) {
          expect(SKU_CONNUS.has(sku)).toBe(true);
        }
      }
    }
  });

  it('chiffre chaque ligne au prix du catalogue', () => {
    for (const commande of COMMANDES_AMORCE) {
      for (const calculee of commande.lignes) {
        expect(calculee.sousTotalCentimes).toBe(
          calculee.article.prixCentimes * calculee.ligne.quantite,
        );
      }
    }
  });

  it('respecte la liste blanche du coffret personnalisable', () => {
    const eligibles = new Set(
      CATALOGUE.flatMap((produit) => produit.piecesEligibles ?? []),
    );

    for (const commande of COMMANDES_AMORCE) {
      for (const calculee of commande.lignes) {
        for (const sku of calculee.ligne.composition ?? []) {
          expect(eligibles.has(sku)).toBe(true);
        }
      }
    }
  });
});

describe('les journaux du jeu d’essai', () => {
  it('portent une entrée par état atteint, dans l’ordre chronologique', () => {
    for (const commande of COMMANDES_AMORCE) {
      expect(commande.journal.length).toBeGreaterThan(0);

      let precedent = Number.NEGATIVE_INFINITY;

      for (const entree of commande.journal) {
        const instant = Date.parse(entree.horodatage);

        expect(Number.isNaN(instant)).toBe(false);
        expect(instant).toBeGreaterThan(precedent);
        expect(ETATS_COMMANDE).toContain(entree.etat);
        precedent = instant;
      }
    }
  });

  it('commencent tous par « payee » : une commande naît du paiement', () => {
    for (const commande of COMMANDES_AMORCE) {
      expect(commande.journal[0]?.etat).toBe('payee');
    }
  });

  it('finissent sur l’état courant de la commande', () => {
    for (const commande of COMMANDES_AMORCE) {
      expect(commande.journal[commande.journal.length - 1]?.etat).toBe(commande.etat);
    }
  });

  it('n’enregistrent jamais deux fois le même état', () => {
    for (const commande of COMMANDES_AMORCE) {
      const etats = commande.journal.map((entree) => entree.etat);
      expect(new Set(etats).size).toBe(etats.length);
    }
  });

  it('tiennent dans la fenêtre juillet-août 2026, en dates ABSOLUES', () => {
    for (const commande of COMMANDES_AMORCE) {
      for (const entree of commande.journal) {
        const instant = Date.parse(entree.horodatage);
        expect(instant).toBeGreaterThanOrEqual(DEBUT_FENETRE);
        expect(instant).toBeLessThan(FIN_FENETRE);
      }
    }
  });

  it('portent une référence dont le jour précède le paiement d’au plus un jour', () => {
    /* La référence contient le jour civil PARISIEN du paiement. On se contente
       ici de vérifier que les deux ne se contredisent pas grossièrement : un
       écart de plus d'un jour signalerait une référence recopiée d'une autre
       commande. */
    for (const commande of COMMANDES_AMORCE) {
      const jour = commande.reference.slice(4, 12);
      const attendu = `${jour.slice(0, 4)}-${jour.slice(4, 6)}-${jour.slice(6, 8)}`;
      const paiement = Date.parse(commande.journal[0]?.horodatage ?? '');
      const ecart = Math.abs(paiement - Date.parse(`${attendu}T12:00:00.000Z`));

      expect(ecart).toBeLessThan(24 * 60 * 60 * 1000);
    }
  });
});

describe('les coordonnées du jeu d’essai', () => {
  it('se disent jeu d’essai, et ne ressemblent à personne', () => {
    for (const commande of COMMANDES_AMORCE) {
      const coordonnees = commande.coordonnees;

      expect(coordonnees).not.toBeNull();

      if (coordonnees === null) {
        continue;
      }

      expect(coordonnees.prenomNom).toMatch(/^Client d’essai n° \d$/);
      expect(coordonnees.adresse).toContain('rue de l’Exemple');
      /* `.invalid` est réservé par la RFC 2606 : ce domaine ne peut appartenir
         à personne et ne résoudra jamais. */
      expect(coordonnees.courriel).toMatch(/@exemple\.invalid$/);
      expect(coordonnees.codePostal).toMatch(/^\d{5}$/);
    }
  });

  it('porte un code postal cohérent avec la zone d’expédition', async () => {
    const { zoneDepuisCodePostal } = await import('@/lib/zones');

    for (const commande of COMMANDES_AMORCE) {
      expect(zoneDepuisCodePostal(commande.coordonnees?.codePostal ?? '')).toBe(
        commande.zone,
      );
    }
  });
});
