'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { BlocReassurance } from '@/composants/panier/BlocReassurance';
import { ChoixZone } from '@/composants/panier/ChoixZone';
import { LignePanier } from '@/composants/panier/LignePanier';
import { LigneContact } from '@/composants/panier/LigneContact';
import { MentionRetractation } from '@/composants/panier/MentionRetractation';
import { RecapitulatifTotaux } from '@/composants/panier/RecapitulatifTotaux';
import type { ArticlePanier } from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import { calculerTotaux } from '@/lib/panier/totaux';
import { suggestionsPourEnsemble, type CandidatSuggestion } from '@/lib/suggestions';

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

/** Combien de suggestions sous le panier. Trois tiennent sur un rang, à toute largeur. */
const COMBIEN_DE_SUGGESTIONS = 3;

export function IlotPanier({
  catalogue,
  poolSuggestions,
  cartesSuggestions,
}: {
  readonly catalogue: readonly ArticlePanier[];
  /**
   * Le strict minimum pour CHOISIR — un slug, une famille. Déjà filtré côté
   * serveur (disponible, en stock), donc cet îlot ne porte aucun jugement de
   * vente : il trie, il ne décide pas.
   */
  readonly poolSuggestions: readonly CandidatSuggestion[];
  /**
   * Les cartes DÉJÀ RENDUES par le serveur, une par produit vendable.
   *
   * C'est le patron du tiroir de la fiche produit, étendu d'un cran. Là-bas le
   * serveur choisissait lesquelles rendre — le slug de la page suffisait. Ici
   * la sélection dépend du panier, qui n'existe qu'après hydratation : le
   * serveur livre donc toutes les candidates et cet îlot n'en affiche que
   * quelques-unes. Une carte non affichée ne coûte que son HTML — son image
   * n'entre jamais dans le document, donc n'est jamais téléchargée.
   */
  readonly cartesSuggestions: Record<string, ReactNode>;
}) {
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

  /* Les slugs du panier, dans l'ordre où ils y sont entrés : la roue des
     suggestions s'amorce après le DERNIER, le signal d'intention le plus frais.
     Dédupliqué — deux formats du même produit ne comptent qu'une fois. */
  const slugsAuPanier = [...new Set(totaux.lignes.map((calculee) => calculee.article.slug))];
  const suggestions = suggestionsPourEnsemble(
    poolSuggestions,
    slugsAuPanier,
    COMBIEN_DE_SUGGESTIONS,
  );

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

        {/* LE VIDE DE LA COLONNE GAUCHE DEVIENT UN RAYON (C24, retour d'Arnaud).

            « Sur la page du panier il y a un grand espace vide sur la gauche en
            bas ; tu devrais implémenter des suggestions de produits
            complémentaires. » Le vide était mécanique : la colonne droite
            (destination, récapitulatif, bouton, mentions) est longue et
            collante, la gauche s'arrêtait après « Vider le panier ».

            CET ÎLOT NE FAIT QUE TRIER. Les cartes sont rendues par le serveur,
            le pool est déjà filtré sur la disponibilité et le stock — il ne
            reste ici qu'un choix d'ordre, à partir de ce que le panier dit de
            lui-même. C'est ce qui permet aux suggestions d'avoir des
            photographies sans qu'un seul chemin d'image n'entre dans le paquet
            JavaScript (D17).

            LE BLOC DISPARAÎT PLUTÔT QUE DE MENTIR : panier contenant tout le
            catalogue, ou pool épuisé, et il n'y a ni titre ni grille. */}
        {suggestions.length > 0 && (
          <section aria-labelledby="titre-suggestions" className="mt-10 border-t border-filet pt-6">
            <h2 id="titre-suggestions" className="etiquette text-encre-douce">
              Vous aimerez peut-être aussi
            </h2>
            {/* LES CARTES SONT BORNEES, PAS ETIREES. La colonne gauche fait
                environ 850 points sur un ecran large : trois cartes etirees y
                donnaient des vignettes de 270 points sous un nom en didone qui
                passait sur trois lignes. Reduire le corps est interdit — la
                Bodoni est deja au plancher de l interdit n° 10 de D37 — donc
                c est la carte qui se borne. A 12 rem elle retrouve la
                proportion du tiroir, ou le meme dessin tient depuis C23. */}
            <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(0,12rem))] gap-4">
              {suggestions.map((candidat) => (
                <li key={candidat.slug}>{cartesSuggestions[candidat.slug]}</li>
              ))}
            </ul>
          </section>
        )}
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

        {/* LA REASSURANCE, AU DERNIER ECRAN AVANT LE PAIEMENT (C25).

            La remarque du professionnel disait « dans le panier OU au niveau
            de la fiche produit ». C23 ne l avait posee que dans le tiroir —
            un ecran de passage, ni l un ni l autre. Ici, elle se lit juste
            au-dessus du bouton qui engage.

            SANS le renvoi au service client : `LigneContact` est déjà posée
            deux blocs plus bas depuis C23, et la répéter à cette distance se
            lirait comme une maladresse plutôt que comme une insistance. */}
        <BlocReassurance avecContact={false} />

        <MentionRetractation articles={totaux.articlesSansRetractation} />

        {/* « UNE QUESTION ? » AU DERNIER MOMENT OÙ ELLE SE POSE (C23, retour du
            professionnel n° 5). Le panier est l'écran où l'on hésite : c'est là
            qu'un client veut savoir qu'un humain existe. Le bloc ne porte aucune
            coordonnée — elles valent `null` par doctrine — et renvoie vers la
            section « 4. Contact » des mentions légales, où les quatre
            emplacements sont déjà rendus en `<AComplete>`. Le manque s'y lit
            comme un gabarit, pas comme un oubli. */}
        <div className="mt-6 border-t border-filet pt-4">
          <LigneContact />
        </div>
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
