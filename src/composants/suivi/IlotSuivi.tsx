'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formaterEuros } from '@/lib/argent';
import { lireCommande } from '@/lib/commandes/depot-local';
import { LIBELLE_ETAT, type Commande, type EtatCommande } from '@/lib/commandes/etats';
import { formaterHorodatage } from '@/lib/commandes/horodatage';
import { normaliserReferenceSaisie } from '@/lib/commandes/reference';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { LIBELLE_ZONE } from '@/lib/types';

/**
 * LE SUIVI CLIENT — une référence, une frise.
 *
 * ---------------------------------------------------------------------------
 * La saisie est TOLÉRANTE, la recherche ne l'est pas
 * ---------------------------------------------------------------------------
 *
 * `normaliserReferenceSaisie()` accepte la casse et les séparateurs — un client
 * tape « mvb 20260718 7f2b » aussi bien que « MVB-20260718-7F2B » — et rend la
 * forme canonique, ou `null`. La tolérance s'arrête exactement là :
 * l'alphabet des références a été privé de ses paires ambiguës (ni O ni 0, ni I
 * ni 1) pour que personne n'ait jamais à deviner, et « corriger » un caractère
 * ici rouvrirait la porte que cet alphabet ferme.
 *
 * ---------------------------------------------------------------------------
 * La référence arrive aussi par l'adresse
 * ---------------------------------------------------------------------------
 *
 * La page de confirmation renvoie ici avec `?reference=…`, pour que le client
 * qui vient de payer n'ait rien à retaper. Elle est lue DANS L'EFFET de
 * montage et non pendant le rendu — le HTML est engendré à la construction,
 * quand aucune référence n'existe, et `useSearchParams()` pendant le rendu
 * ferait diverger le premier rendu client du HTML reçu. C'est l'erreur
 * d'hydratation React #418 rencontrée en C5 sur l'écran de paiement, et
 * corrigée de la même manière.
 *
 * ---------------------------------------------------------------------------
 * La frise, et le cas de l'annulation
 * ---------------------------------------------------------------------------
 *
 * Le parcours ordinaire est payée → préparée → expédiée : trois étapes, dont
 * celles qui n'ont pas eu lieu restent visibles, éteintes, avec leur libellé.
 * Une frise qui masquerait les étapes à venir ne dirait pas où l'on en est,
 * seulement ce qui est fait.
 *
 * Une commande ANNULÉE ne s'affiche pas comme une commande arrêtée en chemin :
 * elle a quitté le parcours. La frise porte alors l'annulation comme dernière
 * étape, et les étapes non atteintes sont barrées plutôt qu'en attente — elles
 * n'arriveront pas.
 */

/** Le parcours ordinaire, dans l'ordre. L'annulation en sort, elle ne s'y insère pas. */
const PARCOURS: readonly EtatCommande[] = ['payee', 'preparee', 'expediee'];

export function IlotSuivi({
  amorce,
  exemples,
}: {
  readonly amorce: readonly Commande[];
  /** Références du jeu d'essai, proposées pour essayer tout de suite. */
  readonly exemples: readonly string[];
}) {
  const [saisie, setSaisie] = useState('');
  const [recherchee, setRecherchee] = useState<string | null>(null);
  const [commande, setCommande] = useState<Commande | null>(null);
  const [malFormee, setMalFormee] = useState(false);

  const chercher = useCallback(
    (valeur: string) => {
      const reference = normaliserReferenceSaisie(valeur);

      if (reference === null) {
        setMalFormee(valeur.trim() !== '');
        setRecherchee(null);
        setCommande(null);
        return;
      }

      const stockage = stockageLocal();

      setMalFormee(false);
      setRecherchee(reference);
      setCommande(stockage === null ? null : lireCommande(stockage, reference, amorce));
    },
    [amorce],
  );

  useEffect(() => {
    const depuisAdresse = new URLSearchParams(window.location.search).get('reference');

    if (depuisAdresse === null || depuisAdresse === '') {
      return;
    }

    setSaisie(depuisAdresse);
    chercher(depuisAdresse);
  }, [chercher]);

  return (
    <div className="mt-10 min-h-96 pb-4">
      <form
        className="panneau max-w-lisible"
        onSubmit={(evenement) => {
          evenement.preventDefault();
          chercher(saisie);
        }}
      >
        <label
          htmlFor="champ-reference"
          className="block etiquette text-encre-douce"
        >
          Référence de commande
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="champ-reference"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="MVB-20260718-7F2B"
            value={saisie}
            aria-describedby="aide-reference"
            aria-invalid={malFormee}
            onChange={(evenement) => {
              setSaisie(evenement.target.value);
              chercher(evenement.target.value);
            }}
            className="min-w-56 flex-1 rounded-sm border border-filet bg-creme px-3 py-2 font-mono text-sm text-encre tabular-nums"
          />
          <button
            type="submit"
            className="rounded-sm border border-olive bg-olive px-4 py-2 text-sm font-semibold text-creme hover:border-encre hover:bg-encre"
          >
            Suivre
          </button>
        </div>

        <p
          id="aide-reference"
          aria-live="polite"
          className="mt-2 text-xs leading-relaxed text-encre-douce"
        >
          {malFormee
            ? 'Cette référence ne se lit pas. Elle a la forme MVB, huit chiffres, quatre signes — les tirets et la casse n’ont pas d’importance.'
            : 'Elle figure sur votre écran de confirmation. Les tirets et la casse n’ont pas d’importance.'}
        </p>
      </form>

      <section aria-labelledby="titre-exemples" className="panneau mt-8 max-w-lisible">
        <h2
          id="titre-exemples"
          className="etiquette text-encre-douce"
        >
          Références à essayer
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-encre-douce">
          Ces six commandes sont un jeu d’essai&nbsp;: elles existent pour que cette
          page ait quelque chose à montrer sans que vous ayez à commander d’abord.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {exemples.map((exemple) => (
            <li key={exemple}>
              <button
                type="button"
                onClick={() => {
                  setSaisie(exemple);
                  chercher(exemple);
                }}
                className="rounded-sm border border-filet bg-papier px-2.5 py-1 text-xs font-mono font-medium text-encre tabular-nums hover:border-olive"
              >
                {exemple}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {recherchee === null ? null : commande === null ? (
        <Introuvable reference={recherchee} />
      ) : (
        <Resultat commande={commande} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Le résultat                                                                 */
/* -------------------------------------------------------------------------- */

function Resultat({ commande }: { readonly commande: Commande }) {
  const horodatages = new Map(
    commande.journal.map((entree) => [entree.etat, entree.horodatage]),
  );
  const annulee = commande.etat === 'annulee';

  return (
    <section aria-labelledby="titre-resultat" className="panneau mt-12">
      <h2 id="titre-resultat" className="text-titre text-encre">
        Commande{' '}
        <span className="font-mono tabular-nums">{commande.reference}</span>
      </h2>

      <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
        {formaterEuros(commande.totaux.total)} toutes taxes comprises, frais de port
        inclus — destination&nbsp;: {LIBELLE_ZONE[commande.zone]}.
      </p>

      <ol className="mt-8 max-w-lisible border-l border-filet pl-6">
        {PARCOURS.map((etat) => {
          const horodatage = horodatages.get(etat);
          const atteint = horodatage !== undefined;

          return (
            <li key={etat} className="relative pb-7 last:pb-0">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[1.9375rem] block h-2.5 w-2.5 rounded-full border ${
                  atteint
                    ? 'border-olive bg-olive'
                    : 'border-encre-douce/50 bg-creme'
                }`}
              />
              <p
                className={`text-sm font-semibold ${
                  atteint
                    ? 'text-encre'
                    : annulee
                      ? 'text-encre-douce line-through'
                      : 'text-encre-douce'
                }`}
              >
                {LIBELLE_ETAT[etat]}
              </p>
              <p className="mt-0.5 text-sm text-encre-douce">
                {atteint
                  ? formaterHorodatage(horodatage)
                  : annulee
                    ? 'n’aura pas lieu'
                    : 'à venir'}
              </p>
            </li>
          );
        })}

        {annulee ? (
          <li className="relative pt-1">
            <span
              aria-hidden="true"
              className="absolute top-2.5 -left-[1.9375rem] block h-2.5 w-2.5 rounded-full border border-terre bg-terre"
            />
            <p className="text-sm font-semibold text-terre">
              {LIBELLE_ETAT.annulee}
            </p>
            <p className="mt-0.5 text-sm text-encre-douce">
              {formaterHorodatage(horodatages.get('annulee') ?? '')}
            </p>
          </li>
        ) : null}
      </ol>

      <p className="mt-8 max-w-lisible rounded-sm border border-filet bg-papier px-4 py-3 text-sm leading-relaxed text-encre-douce">
        Sur une boutique livrée, chaque changement d’état part aussi par
        courriel&nbsp;; la démonstration n’en envoie aucun. Les textes exacts de ces
        messages sont lisibles dans l’
        <Link
          href="/gestion/modeles-de-courriels"
          className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          espace marchand
        </Link>
        .
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* L'échec honnête                                                             */
/* -------------------------------------------------------------------------- */

function Introuvable({ reference }: { readonly reference: string }) {
  return (
    <section aria-labelledby="titre-introuvable" className="mt-12 max-w-lisible">
      <h2 id="titre-introuvable" className="text-titre text-encre">
        Aucune commande à cette référence
      </h2>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        La référence <span className="font-mono font-medium tabular-nums">{reference}</span> est
        bien formée, mais aucune commande ne la porte dans ce navigateur.
      </p>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        Les commandes de cette démonstration sont rangées dans le navigateur qui les a
        passées, et nulle part ailleurs&nbsp;: aucune base de données, aucun compte.
        Une commande passée sur un autre appareil, ou dans une fenêtre privée fermée
        depuis, est donc introuvable ici. Une boutique livrée la retrouverait, parce
        qu’elle vivrait sur son serveur — c’est d’ailleurs la seule différence entre
        cet écran et le sien.
      </p>
    </section>
  );
}
