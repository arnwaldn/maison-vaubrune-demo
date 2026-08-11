'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { PastilleEtat } from '@/composants/gestion/PastilleEtat';
import { formaterEuros } from '@/lib/argent';
import {
  appliquerTransitionEnregistree,
  lireCommande,
} from '@/lib/commandes/depot-local';
import {
  LIBELLE_ETAT,
  transitionsAutorisees,
  type Commande,
  type EtatCommande,
} from '@/lib/commandes/etats';
import { formaterHorodatage } from '@/lib/commandes/horodatage';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { typographier } from '@/lib/typographie';
import { LIBELLE_ZONE } from '@/lib/types';

/**
 * LE DÉTAIL D'UNE COMMANDE, et les boutons qui la font avancer.
 *
 * ---------------------------------------------------------------------------
 * La référence est lue DANS L'EFFET, pas pendant le rendu
 * ---------------------------------------------------------------------------
 *
 * Elle arrive en propriété depuis le segment d'adresse, donc côté serveur : ce
 * point-là est simple. Ce qui ne l'est pas, c'est la COMMANDE — elle vit dans
 * le stockage local, que le HTML engendré à la construction ne connaît pas. La
 * lecture a donc lieu après montage, et l'écran réserve sa place d'ici là :
 * exactement le patron de la page de confirmation (tranche C5, erreur
 * d'hydratation React #418 corrigée de la même manière).
 *
 * ---------------------------------------------------------------------------
 * AUCUNE RÈGLE D'ÉTAT N'EST ÉCRITE ICI
 * ---------------------------------------------------------------------------
 *
 * Les boutons proposés sont exactement `transitionsAutorisees(commande.etat)`,
 * et le passage lui-même est confié à `appliquerTransitionEnregistree()`. Le
 * graphe est écrit une fois, dans `commandes/etats.ts`, et cet écran ne le
 * connaît pas : il affiche ce que la machine à états lui dit de proposer. C'est
 * ce qui garantit qu'une commande expédiée n'affiche aucun bouton, sans qu'une
 * ligne de cette page n'ait à le savoir.
 *
 * Le refus, quand il survient (deux onglets ouverts sur la même commande, l'un
 * ayant déjà expédié), affiche la PHRASE que la machine a rédigée. On ne la
 * reformule pas : celui qui sait pourquoi il refuse est celui qui doit savoir
 * le dire.
 *
 * ---------------------------------------------------------------------------
 * La copie à l'écriture, dite à l'écran
 * ---------------------------------------------------------------------------
 *
 * Faire avancer une commande du jeu d'essai n'y touche pas : une copie est
 * écrite dans le stockage local et masque l'originale (voir
 * `commandes/depot-local.ts`). L'encart de bas de page le dit, parce que c'est
 * la seule manière de comprendre pourquoi « Réinitialiser le jeu d'essai »
 * rend une commande expédiée à son état payé.
 */

export function IlotDetailCommande({
  reference,
  amorce,
}: {
  readonly reference: string;
  readonly amorce: readonly Commande[];
}) {
  const [commande, setCommande] = useState<Commande | null>(null);
  const [reglee, setReglee] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  useEffect(() => {
    const stockage = stockageLocal();

    setCommande(stockage === null ? null : lireCommande(stockage, reference, amorce));
    setReglee(true);
  }, [reference, amorce]);

  const transitionner = useCallback(
    (cible: EtatCommande) => {
      const stockage = stockageLocal();

      if (stockage === null) {
        setRefus(
          typographier(
            'Le stockage de ce navigateur est inaccessible : le changement d’état ne peut pas être enregistré.',
          ),
        );
        return;
      }

      const resultat = appliquerTransitionEnregistree(
        stockage,
        reference,
        cible,
        new Date().toISOString(),
        amorce,
      );

      if (resultat.ok) {
        setCommande(resultat.commande);
        setRefus(null);
        return;
      }

      setRefus(resultat.motif);
      setCommande(lireCommande(stockage, reference, amorce));
    },
    [reference, amorce],
  );

  if (!reglee) {
    return (
      <div
        aria-hidden="true"
        data-place-reservee=""
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  if (commande === null) {
    return <CommandeIntrouvable reference={reference} />;
  }

  return (
    <div className="mt-10 grid min-h-96 gap-x-12 gap-y-10 pb-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-12">
        <section aria-labelledby="titre-lignes">
          <h2 id="titre-lignes" className="text-titre text-encre">
            Articles
          </h2>

          <ul className="mt-6 border-t border-filet">
            {commande.lignes.map((calculee) => (
              <li
                key={calculee.cle}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-filet py-4"
              >
                <div className="min-w-0">
                  <p className="text-encre">
                    <span className="font-semibold">{calculee.article.nomProduit}</span>
                    <span className="text-encre-douce">, {calculee.article.format}</span>
                  </p>
                  <p className="mt-1 registre text-encre-douce">
                    {calculee.ligne.quantite} ×{' '}
                    {formaterEuros(calculee.article.prixCentimes)} —{' '}
                    {calculee.article.sku}
                  </p>
                  {calculee.ligne.composition === undefined ? null : (
                    <ul className="mt-2 border-l-2 border-filet pl-4 text-sm text-encre-douce">
                      {calculee.ligne.composition.map((sku) => (
                        <li key={sku}>{sku}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="font-mono font-medium text-encre tabular-nums">
                  {formaterEuros(calculee.sousTotalCentimes)}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-encre-douce">
            Destination&nbsp;: {LIBELLE_ZONE[commande.zone]}. Paiement&nbsp;:{' '}
            {commande.modePaiement === 'simule'
              ? 'écran de simulation, rien n’a été payé'
              : 'prestataire agréé en mode test, aucun compte débité'}
            .
          </p>
        </section>

        <section aria-labelledby="titre-destinataire">
          <h2 id="titre-destinataire" className="text-titre text-encre">
            Destinataire
          </h2>

          {commande.coordonnees === null ? (
            <p className="mt-4 text-sm text-encre-douce">
              Cette commande a été reprise sans ses coordonnées.
            </p>
          ) : (
            <address className="mt-4 text-sm leading-relaxed text-encre not-italic">
              {commande.coordonnees.prenomNom}
              <br />
              {commande.coordonnees.adresse}
              <br />
              {commande.coordonnees.codePostal}
              <br />
              {commande.coordonnees.courriel}
            </address>
          )}
        </section>

        <section aria-labelledby="titre-journal">
          <h2 id="titre-journal" className="text-titre text-encre">
            Journal
          </h2>

          <ol className="mt-6 border-l border-filet pl-6">
            {commande.journal.map((entree) => (
              <li
                key={`${entree.etat}-${entree.horodatage}`}
                className="relative pb-6 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[1.9375rem] block h-2.5 w-2.5 rounded-full border border-olive bg-olive"
                />
                <p className="text-sm font-semibold text-encre">
                  {LIBELLE_ETAT[entree.etat]}
                </p>
                <p className="mt-0.5 text-sm text-encre-douce">
                  {formaterHorodatage(entree.horodatage)}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Le journal s’ajoute, il ne se réécrit jamais&nbsp;: c’est la seule chose
            qui permette de répondre à «&nbsp;quand cette commande est-elle passée en
            préparation&nbsp;?&nbsp;» sans le deviner.
          </p>
        </section>
      </div>

      <div className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start">
        <section
          aria-labelledby="titre-montants-gestion"
          className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
        >
          <h2
            id="titre-montants-gestion"
            className="sous-titre text-encre"
          >
            Montants
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-encre-douce">Sous-total</dt>
              <dd className="font-mono font-medium text-encre tabular-nums">
                {formaterEuros(commande.totaux.sousTotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-encre-douce">Frais de port</dt>
              <dd className="font-mono font-medium text-encre tabular-nums">
                {formaterEuros(commande.totaux.port)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-filet pt-4">
            <p className="sous-titre text-encre">Total</p>
            <p className="font-mono text-xl font-medium text-encre tabular-nums">
              {formaterEuros(commande.totaux.total)}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="titre-etat-gestion"
          className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
        >
          <h2
            id="titre-etat-gestion"
            className="sous-titre text-encre"
          >
            État
          </h2>

          <p className="mt-3">
            <PastilleEtat etat={commande.etat} />
          </p>

          <BoutonsTransition etat={commande.etat} transitionner={transitionner} />

          {refus === null ? null : (
            <p
              role="alert"
              className="mt-4 rounded-sm border border-terre/40 bg-creme px-4 py-3 text-xs leading-relaxed text-encre"
            >
              {refus}
            </p>
          )}

          <p className="mt-4 text-xs leading-relaxed text-encre-douce">
            Chaque changement d’état est horodaté au moment où vous cliquez, et ajouté
            au journal. Sur une boutique livrée, il partirait aussi par courriel au
            client&nbsp;: la démonstration n’en envoie aucun.
          </p>
        </section>

        <section
          aria-labelledby="titre-copie"
          className="rounded-sm border border-ocre-clair bg-papier p-5 sm:p-6"
        >
          <h2 id="titre-copie" className="sous-titre text-encre">
            Ce que vous modifiez ici
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-encre-douce">
            Faire avancer une commande du jeu d’essai n’y touche pas&nbsp;: une copie
            est écrite dans votre navigateur et prend sa place à l’affichage.
            «&nbsp;Réinitialiser le jeu d’essai&nbsp;», depuis l’écran Catalogue, efface
            ces copies et rend les six commandes à leur état d’origine.
          </p>
        </section>

        <Link
          href="/gestion/commandes"
          className="block rounded-sm border border-filet bg-creme px-4 py-3 text-center text-sm font-semibold text-encre no-underline hover:border-olive"
        >
          Retour à la liste
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Les boutons de transition                                                   */
/* -------------------------------------------------------------------------- */

/** Le verbe du marchand pour chaque état atteignable. */
const LIBELLE_BOUTON: Record<EtatCommande, string> = {
  payee: 'Marquer payée',
  preparee: 'Marquer préparée',
  expediee: 'Marquer expédiée',
  annulee: 'Annuler la commande',
};

function BoutonsTransition({
  etat,
  transitionner,
}: {
  readonly etat: EtatCommande;
  readonly transitionner: (cible: EtatCommande) => void;
}) {
  const cibles = transitionsAutorisees(etat);

  if (cibles.length === 0) {
    return (
      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        {typographier(
          etat === 'expediee'
            ? 'Le colis est parti : cette commande ne change plus d’état. Un retour ou une rétractation est un autre acte, avec ses propres pièces.'
            : 'Cette commande est annulée : elle ne change plus d’état. Une commande annulée que l’on pourrait rouvrir ferait exister deux versions d’un même engagement.',
        )}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {cibles.map((cible) => (
        <button
          key={cible}
          type="button"
          onClick={() => {
            transitionner(cible);
          }}
          className={
            cible === 'annulee'
              ? 'w-full rounded-sm border border-terre bg-creme px-4 py-2.5 text-sm font-semibold text-terre hover:bg-papier'
              : 'w-full rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme hover:border-encre hover:bg-encre'
          }
        >
          {LIBELLE_BOUTON[cible]}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* La commande introuvable                                                     */
/* -------------------------------------------------------------------------- */

function CommandeIntrouvable({ reference }: { readonly reference: string }) {
  return (
    <div className="mt-10 min-h-96 max-w-lisible pb-4">
      <h2 className="text-titre text-encre">Commande introuvable</h2>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        Aucune commande portant la référence{' '}
        <span className="font-mono font-medium text-encre tabular-nums">{reference}</span> n’est
        enregistrée dans ce navigateur, et elle ne fait pas partie du jeu d’essai.
      </p>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        Les commandes de cette démonstration sont rangées dans le navigateur qui les a
        passées, et nulle part ailleurs (décision D2). Une commande passée sur un autre
        appareil est donc introuvable ici&nbsp;; une boutique livrée la retrouverait,
        parce qu’elle vivrait sur son serveur.
      </p>

      <Link
        href="/gestion/commandes"
        className="mt-6 inline-block rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme no-underline hover:border-encre hover:bg-encre"
      >
        Retour à la liste
      </Link>
    </div>
  );
}
