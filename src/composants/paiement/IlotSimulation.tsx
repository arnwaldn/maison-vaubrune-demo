'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formaterEuros } from '@/lib/argent';

/**
 * LE RÉCAPITULATIF DE L'ÉCRAN SIMULÉ, et les deux issues.
 *
 * ---------------------------------------------------------------------------
 * La chaîne de requête est lue DANS UN EFFET, jamais pendant le rendu
 * ---------------------------------------------------------------------------
 *
 * C'est exactement la règle posée en C4 pour le panier (voir `contexte-panier.tsx`),
 * et pour la même raison, mesurée ici : le HTML servi est engendré à la
 * construction, quand aucune référence n'existe. Lire les paramètres pendant le
 * rendu — avec `useSearchParams()`, par exemple — ferait produire au premier
 * rendu client un texte différent de celui du HTML reçu, ce que React signale
 * par une erreur d'hydratation (#418, constatée puis corrigée le 2026-08-06).
 * La lecture a donc lieu APRÈS, dans un effet, et la place est réservée
 * d'ici là pour que rien ne saute.
 *
 * ---------------------------------------------------------------------------
 * Les deux boutons mènent aux MÊMES adresses que le prestataire
 * ---------------------------------------------------------------------------
 *
 * C'est ce qui rend la simulation utile : `/commande/confirmation` et
 * `/commande/annulee` ne savent pas, et n'ont pas à savoir, par quel chemin le
 * visiteur revient. Le jour où une clé de test est posée, ces deux pages ne
 * changent pas d'une ligne.
 */

interface Retour {
  readonly reference: string;
  readonly totalCentimes: number | null;
}

export function IlotSimulation() {
  const [retour, setRetour] = useState<Retour | null>(null);

  useEffect(() => {
    const parametres = new URLSearchParams(window.location.search);
    const total = Number.parseInt(parametres.get('total') ?? '', 10);

    setRetour({
      reference: parametres.get('reference') ?? '',
      totalCentimes: Number.isInteger(total) ? total : null,
    });
  }, []);

  /* Même hauteur minimale que le contenu : la place réservée empêche le pied
     de page de remonter à l'hydratation (raisonnement chiffré en C4). */
  if (retour === null) {
    return <div aria-hidden="true" className="mt-10 min-h-80 max-w-lisible pb-4" />;
  }

  return (
    <div className="mt-10 min-h-80 max-w-lisible pb-4">
      <section
        aria-labelledby="titre-simulation-recapitulatif"
        className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
      >
        <h2
          id="titre-simulation-recapitulatif"
          className="font-titre text-base font-semibold text-encre"
        >
          Ce qui serait payé
        </h2>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-encre-douce">Référence de commande</dt>
            <dd className="font-semibold text-encre tabular-nums">
              {retour.reference === '' ? 'absente' : retour.reference}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-filet pt-3">
            <dt className="text-encre-douce">Montant</dt>
            <dd className="text-xl font-semibold text-encre tabular-nums">
              {retour.totalCentimes === null
                ? 'inconnu'
                : formaterEuros(retour.totalCentimes)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href={`/commande/confirmation?reference=${encodeURIComponent(retour.reference)}`}
          className="rounded-sm border border-olive bg-olive px-5 py-3 text-sm font-semibold text-creme no-underline hover:bg-olive-clair"
        >
          Payer
        </Link>
        <Link
          href={`/commande/annulee?reference=${encodeURIComponent(retour.reference)}`}
          className="rounded-sm border border-filet bg-creme px-5 py-3 text-sm font-semibold text-encre no-underline hover:border-terre hover:text-terre"
        >
          Annuler
        </Link>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-encre-douce">
        «&nbsp;Payer&nbsp;» ne débite rien&nbsp;: il enregistre la commande dans votre
        navigateur et vous ramène à la page de confirmation, exactement comme le
        ferait le retour du prestataire. «&nbsp;Annuler&nbsp;» vous ramène au panier,
        intact.
      </p>
    </div>
  );
}
