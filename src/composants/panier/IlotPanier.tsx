'use client';

import Link from 'next/link';

import { ChoixZone } from '@/composants/panier/ChoixZone';
import { LignePanier } from '@/composants/panier/LignePanier';
import { MentionRetractation } from '@/composants/panier/MentionRetractation';
import { RecapitulatifTotaux } from '@/composants/panier/RecapitulatifTotaux';
import type { ArticlePanier } from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import { calculerTotaux } from '@/lib/panier/totaux';

/**
 * LE CONTENU DE LA PAGE PANIER — l'unique îlot client de la route.
 *
 * La page elle-même (`src/app/panier/page.tsx`) reste un composant serveur :
 * elle porte le titre, le chapeau et l'encart de démonstration, engendrés à la
 * construction, et ne descend ici que ce qui dépend réellement de l'état du
 * visiteur. Un îlot unique plutôt que six petits : les six composants
 * partagent le même calcul, et les découper en autant de frontières ferait
 * relire l'état six fois pour un seul écran.
 *
 * ---------------------------------------------------------------------------
 * Le rendu avant restauration
 * ---------------------------------------------------------------------------
 *
 * Le HTML servi est celui d'un panier vide — il ne peut pas être autre chose
 * (voir `contexte-panier.tsx`). Tant que `pretALEmploi` est faux, on affiche
 * donc une PLACE RÉSERVÉE et non « votre panier est vide » : annoncer un
 * panier vide à quelqu'un qui en a un, même pendant deux dixièmes de seconde,
 * est un mensonge que l'œil attrape.
 *
 * Cette place réservée et l'écran de panier vide partagent la MÊME HAUTEUR
 * MINIMALE (`min-h-96`), et ce n'est pas un détail d'esthétique : sans elle,
 * le remplacement de l'une par l'autre faisait remonter le pied de page de
 * cent cinquante pixels au moment de l'hydratation. Mesuré à 0,053 de
 * décalage cumulé (CLS) par Lighthouse avant correction, 0 après.
 *
 * Elle porte `data-place-reservee` depuis la tranche C11. Les huit places
 * réservées du projet le portent, et c'est leur DISPARITION que les campagnes
 * de bout en bout attendent — un attribut qui ne désigne qu'elles, là où
 * `div[aria-hidden="true"]` désignait aussi tout ce qu'une refonte visuelle
 * pourrait poser de décoratif. L'`aria-hidden` reste : il dit autre chose, et à
 * quelqu'un d'autre.
 *
 * ---------------------------------------------------------------------------
 * Le bouton « Passer commande »
 * ---------------------------------------------------------------------------
 *
 * Il est un vrai lien quand la commande est possible, et un bouton éteint
 * accompagné de son motif quand elle ne l'est pas — expédition refusée par le
 * moteur. Jamais un lien qui mènerait à une page où l'on découvrirait
 * l'empêchement : le refus se dit là où il se constate.
 */

export function IlotPanier({ catalogue }: { readonly catalogue: readonly ArticlePanier[] }) {
  const { etat, pretALEmploi, envoyer } = usePanier();

  if (!pretALEmploi) {
    return (
      <div
        aria-hidden="true"
        data-place-reservee=""
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  const totaux = calculerTotaux(etat.lignes, catalogue, etat.zone);

  if (totaux.lignes.length === 0) {
    return <PanierVide />;
  }

  const commandable = totaux.expedition.statut === 'calcule';

  return (
    <div className="mt-10 grid gap-x-12 gap-y-10 pb-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <h2 className="sr-only">Articles du panier</h2>

        <ul className="border-t border-filet">
          {totaux.lignes.map((calculee) => (
            <LignePanier key={calculee.cle} calculee={calculee} catalogue={catalogue} />
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            envoyer({ type: 'vider' });
          }}
          className="mt-5 text-sm text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          Vider le panier
        </button>
      </div>

      <div className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start">
        <ChoixZone zone={etat.zone} />

        <RecapitulatifTotaux totaux={totaux} />

        {commandable ? (
          <Link
            href="/commande"
            className="block rounded-sm border border-olive bg-olive px-4 py-3 text-center text-sm font-semibold text-creme no-underline hover:border-encre hover:bg-encre"
          >
            Passer commande
          </Link>
        ) : (
          <div>
            <button
              type="button"
              disabled
              aria-describedby="empechement-commande"
              className="w-full cursor-not-allowed rounded-sm border border-encre-douce/40 bg-creme px-4 py-3 text-sm font-semibold text-encre-douce"
            >
              Passer commande
            </button>
            <p
              id="empechement-commande"
              className="mt-3 text-xs leading-relaxed text-encre-douce"
            >
              La commande est bloquée parce que ce panier ne peut pas être expédié
              vers la destination choisie. Changez de destination ci-dessus, ou
              retirez l’article en cause&nbsp;: le récapitulatif dit lequel.
            </p>
          </div>
        )}

        <MentionRetractation articles={totaux.articlesSansRetractation} />
      </div>
    </div>
  );
}

function PanierVide() {
  return (
    /* PANNEAU (C19) : l'état vide est de la prose posée sur le fond de page, et
       le fond de page est un marbre. `min-h-96` RESTE — c'est la hauteur
       commune qui a fait tomber à zéro le décalage cumulé de 0,053 relevé en
       C4 au remplacement de la place réservée, et un panneau ne la remplace
       pas : il se pose dedans. */
    <div className="panneau mt-10 min-h-96 max-w-lisible">
      <p className="text-chapeau text-encre-douce">Votre panier est vide.</p>
      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        Le rayon compte quinze références et vingt-trois formats, du condiment au
        coffret.
      </p>
      <Link
        href="/boutique"
        className="mt-6 inline-block rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme no-underline hover:border-encre hover:bg-encre"
      >
        Voir la boutique
      </Link>
    </div>
  );
}
