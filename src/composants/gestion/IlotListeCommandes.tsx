'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PastilleEtat } from '@/composants/gestion/PastilleEtat';
import { formaterEuros } from '@/lib/argent';
import { lireCommandes } from '@/lib/commandes/depot-local';
import {
  ETATS_COMMANDE,
  LIBELLE_ETAT,
  type Commande,
  type EtatCommande,
} from '@/lib/commandes/etats';
import { formaterJour } from '@/lib/commandes/horodatage';
import { stockageLocal } from '@/lib/stockage-navigateur';

/**
 * LA LISTE DES COMMANDES — un tableau, un filtre, rien de plus.
 *
 * ---------------------------------------------------------------------------
 * Le tri, et pourquoi il vient du JOURNAL et non de la référence
 * ---------------------------------------------------------------------------
 *
 * La référence porte une date (`MVB-AAAAMMJJ-XXXX`) et trier dessus aurait été
 * plus court. Ce serait pourtant trier sur un LIBELLÉ : la date de la référence
 * est celle du jour civil français au moment du paiement, sans heure, et deux
 * commandes du même jour se départageraient alors par quatre caractères tirés
 * au sort. L'ordre du tableau serait stable, arbitraire, et faux.
 *
 * Le tri porte donc sur le PREMIER horodatage du journal, c'est-à-dire l'instant
 * du paiement — la seule donnée qui dise réellement quand la commande est
 * née. Une commande dont le journal serait vide (impossible par construction,
 * mais le type autorise le tableau vide) tombe en fin de liste plutôt que de
 * faire échouer le tri.
 *
 * ---------------------------------------------------------------------------
 * Le filtre est un `<select>` ordinaire, pas une barre d'onglets
 * ---------------------------------------------------------------------------
 *
 * Quatre états, un seul choix à la fois, aucune combinaison : c'est exactement
 * ce qu'un `<select>` fait, avec le clavier, le lecteur d'écran et le sélecteur
 * natif du téléphone en prime. Une barre d'onglets aurait demandé la gestion
 * des flèches, du focus et de `aria-selected` pour rendre le même service.
 */

const TOUS = 'tous';

export function IlotListeCommandes({ amorce }: { readonly amorce: readonly Commande[] }) {
  const [commandes, setCommandes] = useState<readonly Commande[] | null>(null);
  const [filtre, setFiltre] = useState<EtatCommande | typeof TOUS>(TOUS);

  useEffect(() => {
    const stockage = stockageLocal();

    setCommandes(stockage === null ? amorce : lireCommandes(stockage, amorce));
  }, [amorce]);

  if (commandes === null) {
    return (
      <div
        aria-hidden="true"
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  const triees = [...commandes].sort(
    (a, b) => instantDuPaiement(b) - instantDuPaiement(a),
  );
  const affichees = filtre === TOUS ? triees : triees.filter((c) => c.etat === filtre);

  return (
    <div className="mt-10 min-h-96 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <label
            htmlFor="filtre-etat"
            className="block text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase"
          >
            Filtrer par état
          </label>
          <select
            id="filtre-etat"
            value={filtre}
            onChange={(evenement) => {
              setFiltre(evenement.target.value as EtatCommande | typeof TOUS);
            }}
            className="mt-2 rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre"
          >
            <option value={TOUS}>Tous les états</option>
            {ETATS_COMMANDE.map((etat) => (
              <option key={etat} value={etat}>
                {LIBELLE_ETAT[etat]}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-encre-douce tabular-nums">
          {affichees.length} commande{affichees.length > 1 ? 's' : ''} affichée
          {affichees.length > 1 ? 's' : ''} sur {commandes.length}.
        </p>
      </div>

      {affichees.length === 0 ? (
        <p className="mt-8 text-sm text-encre">
          Aucune commande dans cet état.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="sr-only">
              Commandes du jeu d’essai et de cette démonstration, de la plus récente
              à la plus ancienne
            </caption>
            <thead>
              <tr className="border-b border-filet text-left">
                <th scope="col" className="pb-2 font-semibold text-encre">
                  Référence
                </th>
                <th scope="col" className="pb-2 font-semibold text-encre">
                  Date
                </th>
                <th scope="col" className="pb-2 font-semibold text-encre">
                  Client
                </th>
                <th scope="col" className="pb-2 text-right font-semibold text-encre">
                  Total
                </th>
                <th scope="col" className="pb-2 text-right font-semibold text-encre">
                  État
                </th>
              </tr>
            </thead>
            <tbody>
              {affichees.map((commande) => (
                <tr key={commande.reference} className="border-b border-filet/60">
                  <td className="py-3">
                    <Link
                      href={`/gestion/commandes/${commande.reference}`}
                      className="font-semibold text-encre tabular-nums underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                    >
                      {commande.reference}
                    </Link>
                  </td>
                  <td className="py-3 text-encre-douce">
                    {commande.journal[0] === undefined
                      ? '—'
                      : formaterJour(commande.journal[0].horodatage)}
                  </td>
                  <td className="py-3 text-encre-douce">
                    {commande.coordonnees?.prenomNom ?? '—'}
                  </td>
                  <td className="py-3 text-right font-semibold text-encre tabular-nums">
                    {formaterEuros(commande.totaux.total)}
                  </td>
                  <td className="py-3 text-right">
                    <PastilleEtat etat={commande.etat} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * L'instant du paiement, en millisecondes. Voir l'en-tête pour le choix du
 * journal plutôt que de la référence. Une commande sans journal ni date lisible
 * rend zéro et tombe donc en fin de liste — visible, pas perdue.
 */
function instantDuPaiement(commande: Commande): number {
  const premiere = commande.journal[0];

  if (premiere === undefined) {
    return 0;
  }

  const instant = new Date(premiere.horodatage).getTime();

  return Number.isNaN(instant) ? 0 : instant;
}
