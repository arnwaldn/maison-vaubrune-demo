'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formaterEuros } from '@/lib/argent';
import { promouvoirEnPayee } from '@/lib/commandes/depot-local';
import { LIBELLE_ETAT, type Commande } from '@/lib/commandes/etats';
import { formaterHorodatage } from '@/lib/commandes/horodatage';
import { usePanier } from '@/lib/panier/contexte-panier';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { LIBELLE_ZONE } from '@/lib/types';

/**
 * LA CONFIRMATION DE COMMANDE — trois gestes au montage, dans cet ordre.
 *
 * 1. PROMOUVOIR la commande en attente en commande payée. Le journal reçoit sa
 *    première et unique entrée, `payee`, horodatée maintenant.
 * 2. VIDER le panier — et seulement si la promotion a réussi. Vider avant, ou
 *    vider quand la référence ne correspond à rien, effacerait le panier d'un
 *    visiteur arrivé ici par un lien de travers.
 * 3. AFFICHER le récapitulatif relu depuis le dépôt, jamais depuis l'état
 *    React : ce qui s'affiche est ce qui est ENREGISTRÉ.
 *
 * ---------------------------------------------------------------------------
 * L'IDEMPOTENCE, et pourquoi elle n'est pas une élégance
 * ---------------------------------------------------------------------------
 *
 * Cette page est rafraîchie. Elle est mise en favori, rouverte depuis
 * l'historique, partagée. `promouvoirEnPayee()` est donc écrite pour être
 * appelée cent fois : la première fois elle promeut, les suivantes elle relit
 * la commande déjà rangée. Sans cette garantie, un rafraîchissement afficherait
 * « commande introuvable » sur une commande payée — c'est-à-dire la pire chose
 * qu'un écran de confirmation puisse dire.
 *
 * En mode strict de React, l'effet est d'ailleurs exécuté DEUX FOIS au montage
 * en développement. Ce n'est pas un problème à contourner, c'est le test
 * gratuit de cette propriété.
 *
 * ---------------------------------------------------------------------------
 * La référence est lue DANS L'EFFET, pas pendant le rendu
 * ---------------------------------------------------------------------------
 *
 * Même règle que partout ailleurs dans ce projet : le HTML servi est engendré à
 * la construction, quand aucune référence n'existe. Lire la chaîne de requête
 * pendant le rendu — `useSearchParams()` — ferait diverger le premier rendu
 * client du HTML reçu. Elle est donc lue au même endroit que le dépôt, dans
 * l'effet de montage, et l'écran réserve sa place d'ici là.
 *
 * ---------------------------------------------------------------------------
 * « Ce qui vient de se passer »
 * ---------------------------------------------------------------------------
 *
 * Le texte diffère selon le mode enregistré avec la commande : rien n'a été
 * payé en simulation ; un paiement de TEST a eu lieu chez le prestataire quand
 * une clé de test est posée. Les deux phrases sont vraies, et aucune ne laisse
 * croire à un encaissement.
 */

export function IlotConfirmation() {
  const { envoyer } = usePanier();

  const [reference, setReference] = useState('');
  const [commande, setCommande] = useState<Commande | null>(null);
  const [reglee, setReglee] = useState(false);

  useEffect(() => {
    const demandee =
      new URLSearchParams(window.location.search).get('reference') ?? '';

    setReference(demandee);

    const stockage = stockageLocal();

    if (stockage === null) {
      setReglee(true);
      return;
    }

    const promue = promouvoirEnPayee(stockage, demandee, new Date().toISOString());

    setCommande(promue);
    setReglee(true);

    if (promue !== null) {
      envoyer({ type: 'vider' });
    }
  }, [envoyer]);

  if (!reglee) {
    return (
      <div
        aria-hidden="true"
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  if (commande === null) {
    return <CommandeIntrouvable reference={reference} />;
  }

  return <RecapitulatifCommande commande={commande} />;
}

/* -------------------------------------------------------------------------- */
/* Le récapitulatif                                                            */
/* -------------------------------------------------------------------------- */

function RecapitulatifCommande({ commande }: { readonly commande: Commande }) {
  const simule = commande.modePaiement === 'simule';

  return (
    <div className="mt-10 grid gap-x-12 gap-y-10 pb-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-10">
        <section
          aria-labelledby="titre-reference"
          className="rounded-sm border border-olive/40 bg-papier p-5 sm:p-6"
        >
          <h2 id="titre-reference" className="font-titre text-base font-semibold text-encre">
            Votre référence de commande
          </h2>
          {/* Assez grosse pour être notée d'un coup d'œil, assez sobre pour
              tenir sur une ligne dès 640 px : à la taille d'affiche, la
              référence se coupait à son tiret sur un écran de bureau — une
              référence qui s'écrit sur deux lignes se recopie de travers. */}
          <p className="mt-3 font-titre text-3xl font-semibold text-olive tabular-nums sm:text-4xl">
            {commande.reference}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-encre-douce">
            C’est elle qui désigne cette commande partout&nbsp;: dans le suivi, dans
            les courriels d’une boutique livrée, et auprès du marchand. Notez-la.
          </p>
        </section>

        <section aria-labelledby="titre-passe">
          <h2 id="titre-passe" className="text-titre font-semibold text-encre">
            Ce qui vient de se passer
          </h2>

          <div className="mt-4 max-w-lisible space-y-3 text-sm leading-relaxed text-encre">
            {simule ? (
              <>
                <p>
                  <strong>Rien n’a été payé.</strong> Le paiement est passé par l’écran
                  de simulation de cette démonstration&nbsp;: aucun prestataire n’a été
                  appelé, aucune carte n’a été demandée, aucun montant n’a quitté quoi
                  que ce soit.
                </p>
                <p>
                  La commande ci-dessous est néanmoins réelle du point de vue du
                  site&nbsp;: elle porte une référence, un état et un journal, et le
                  suivi la retrouvera.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Un paiement de test a eu lieu chez le prestataire.</strong>{' '}
                  Une clé de test est posée sur cette installation&nbsp;: la session de
                  paiement a bien été créée chez lui, avec ses écrans et son
                  authentification, mais en environnement de test — aucun compte
                  bancaire n’est débité, et aucun euro ne change de main.
                </p>
                <p>
                  C’est exactement le circuit d’une boutique livrée. Seul le jeu de
                  clés distingue les deux.
                </p>
              </>
            )}

            <p>
              Votre panier a été vidé. Vos coordonnées, elles, n’ont jamais quitté ce
              navigateur&nbsp;: elles ne figuraient pas dans la demande envoyée au
              serveur, et elles sont enregistrées ici, avec la commande.
            </p>
          </div>
        </section>

        <section aria-labelledby="titre-articles-commandes">
          <h2 id="titre-articles-commandes" className="text-titre font-semibold text-encre">
            Votre commande
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
                  <p className="mt-1 text-sm text-encre-douce">
                    {calculee.ligne.quantite} ×{' '}
                    {formaterEuros(calculee.article.prixCentimes)}
                  </p>
                </div>
                <p className="font-semibold text-encre tabular-nums">
                  {formaterEuros(calculee.sousTotalCentimes)}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-encre-douce">
            Destination&nbsp;: {LIBELLE_ZONE[commande.zone]}.
          </p>
        </section>

        {commande.coordonnees === null ? null : (
          <section aria-labelledby="titre-livraison">
            <h2 id="titre-livraison" className="text-titre font-semibold text-encre">
              Livraison
            </h2>
            <address className="mt-4 text-sm leading-relaxed text-encre not-italic">
              {commande.coordonnees.prenomNom}
              <br />
              {commande.coordonnees.adresse}
              <br />
              {commande.coordonnees.codePostal}
              <br />
              {commande.coordonnees.courriel}
            </address>
          </section>
        )}
      </div>

      <div className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start">
        <section
          aria-labelledby="titre-montants"
          className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
        >
          <h2 id="titre-montants" className="font-titre text-base font-semibold text-encre">
            Montants
          </h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-encre-douce">Sous-total</dt>
              <dd className="font-semibold text-encre tabular-nums">
                {formaterEuros(commande.totaux.sousTotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-encre-douce">Frais de port</dt>
              <dd className="font-semibold text-encre tabular-nums">
                {formaterEuros(commande.totaux.port)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-filet pt-4">
            <p className="font-titre text-base font-semibold text-encre">Total</p>
            <p className="text-xl font-semibold text-encre tabular-nums">
              {formaterEuros(commande.totaux.total)}
            </p>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-encre-douce">
            Prix toutes taxes comprises, frais de port inclus.
          </p>
        </section>

        <section
          aria-labelledby="titre-etat"
          className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
        >
          <h2 id="titre-etat" className="font-titre text-base font-semibold text-encre">
            État
          </h2>
          <p className="mt-3 text-sm text-encre">
            <span className="font-semibold">{LIBELLE_ETAT[commande.etat]}</span>
          </p>
          <ol className="mt-4 space-y-2 text-xs leading-relaxed text-encre-douce">
            {commande.journal.map((entree) => (
              <li key={`${entree.etat}-${entree.horodatage}`}>
                {LIBELLE_ETAT[entree.etat]} — {formaterHorodatage(entree.horodatage)}
              </li>
            ))}
          </ol>

          {/* Bascule C6 : la page de suivi existe, le lien est un vrai
              `<Link>`. La référence est passée en chaîne de requête pour que
              le client arrive sur sa frise sans rien retaper. */}
          <p className="mt-4 text-xs leading-relaxed text-encre-douce">
            <Link
              href={`/suivi?reference=${commande.reference}`}
              className="font-semibold underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
            >
              Suivre cette commande
            </Link>{' '}
            — la page de suivi affiche la frise des états et leurs horodatages, à
            partir de la référence ci-dessus.
          </p>
        </section>

        <Link
          href="/boutique"
          className="block rounded-sm border border-olive bg-olive px-4 py-3 text-center text-sm font-semibold text-creme no-underline hover:bg-olive-clair"
        >
          Retourner à la boutique
        </Link>
      </div>
    </div>
  );
}

/* La conversion d'un horodatage en phrase a quitté ce fichier en C6 pour
   `@/lib/commandes/horodatage` : le détail marchand et la frise du suivi en ont
   besoin, et une quatrième copie de six lignes aurait fini par diverger. */

/* -------------------------------------------------------------------------- */
/* La commande introuvable                                                     */
/* -------------------------------------------------------------------------- */

/**
 * L'écran honnête quand rien ne correspond.
 *
 * Il se produit pour de vraies raisons : une adresse de confirmation ouverte
 * dans un autre navigateur que celui qui a commandé (le dépôt est local,
 * décision D2), un stockage effacé entre-temps, un lien recopié à la main. On
 * ne prétend donc pas qu'une commande existe, et on dit laquelle des deux
 * causes est la plus probable.
 */
function CommandeIntrouvable({ reference }: { readonly reference: string }) {
  return (
    <div className="mt-10 min-h-96 max-w-lisible pb-4">
      <h2 className="text-titre font-semibold text-encre">Aucune commande à afficher</h2>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        {reference === ''
          ? 'Cette adresse ne porte aucune référence de commande.'
          : `Aucune commande portant la référence ${reference} n’est enregistrée dans ce navigateur.`}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        Les commandes de cette démonstration sont rangées dans le navigateur qui les
        a passées, et nulle part ailleurs&nbsp;: aucune base de données, aucun compte
        (c’est la décision D2, et la page «&nbsp;À propos&nbsp;» la détaille). Une
        commande passée sur un autre appareil, ou dans une fenêtre privée fermée
        depuis, est donc introuvable ici. Une boutique livrée la retrouverait, parce
        qu’elle vivrait sur son serveur.
      </p>

      <Link
        href="/boutique"
        className="mt-6 inline-block rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme no-underline hover:bg-olive-clair"
      >
        Voir la boutique
      </Link>
    </div>
  );
}
