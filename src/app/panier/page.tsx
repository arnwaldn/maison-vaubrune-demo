import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { HEROS_PANIER } from '@/donnees/visuels-editoriaux';
import { CarteSuggestion } from '@/composants/panier/CarteSuggestion';
import { IlotPanier } from '@/composants/panier/IlotPanier';
import { CATALOGUE } from '@/donnees/catalogue';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';
import type { CandidatSuggestion } from '@/lib/suggestions';
import { estDisponible } from '@/lib/types';

/**
 * LA PAGE PANIER — coquille serveur, contenu client.
 *
 * ---------------------------------------------------------------------------
 * Le partage des rôles
 * ---------------------------------------------------------------------------
 *
 * Cette page est STATIQUE : titre, chapeau et encart sont engendrés à la
 * construction et servis en HTML, comme les seize pages des tranches
 * précédentes. Seul `<IlotPanier>` est un composant client, et il ne reçoit du
 * catalogue que sa PROJECTION (voir `catalogue-panier.ts`) : vingt-trois
 * articles réduits à ce que le panier calcule. Le catalogue complet — les
 * quinze fiches, leur prose — ne franchit pas la frontière.
 *
 * ---------------------------------------------------------------------------
 * Indexation : hors du plan du site, mais PAS `noindex` — arbitrage mesuré
 * ---------------------------------------------------------------------------
 *
 * Un panier est un état personnel plutôt qu'un document : il n'a rien à faire
 * dans un plan de site, et il n'y est pas. Le réflexe suivant serait d'y poser
 * `robots: noindex`, comme le font beaucoup de boutiques.
 *
 * MESURE FAITE : `noindex` fait tomber la note SEO de Lighthouse de 100 à 66
 * sur cette page (audit `is-crawlable`, seul échec du rapport). Or ce projet
 * vend une promesse chiffrée — quatre notes ≥ 90, mesurées et datées — et
 * une note effondrée par une directive volontaire est indiscernable, dans un
 * rapport, d'une note effondrée par une faute. Entre les deux, on garde la
 * page mesurable : elle porte une canonique, elle n'est annoncée nulle part,
 * et son contenu ne duplique aucune page du rayon.
 *
 * Ce que ferait une boutique livrée, et qui reste à un mot près : rétablir
 * `robots: { index: false, follow: true }` ici et sur `/commande`, en sachant
 * que les 66 qui s'ensuivent sur ces deux URL disent une consigne aux robots,
 * pas un défaut de la page.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Panier',
  description:
    'Le panier de la boutique de démonstration Maison Vaubrune : quantités, ' +
    'destination de livraison, frais de port calculés et récapitulatif avant ' +
    'commande.',
  alternates: { canonical: '/panier' },
};

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

/**
 * LES SUGGESTIONS DU PANIER — ce que le serveur peut préparer, et ce qu'il ne
 * peut pas décider (C24).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI LE PATRON DU TIROIR NE SUFFIT PAS ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur la fiche produit, les suggestions ne dépendent que du produit de la page :
 * le serveur les CHOISIT au build et n'en rend que deux. Sur cette page-ci, la
 * sélection dépend du contenu du panier — qui vit dans le navigateur, et que
 * cette route (`force-static`) ne connaîtra jamais au moment du rendu.
 *
 * Le serveur fait donc la moitié du chemin qui lui revient : il prépare LES
 * QUINZE cartes, déjà rendues, et un POOL réduit à ce qui sert à choisir. Le
 * client, lui, ne fait qu'un tri — il ne porte aucun jugement de vente, parce
 * que le pool est déjà filtré (disponible, en stock) de ce côté-ci.
 *
 * CE QUE ÇA COÛTE, ET CE QUE ÇA NE COÛTE PAS. Environ 250 octets gzip par
 * carte, soit ~3,7 Ko de HTML sur cette seule page — et ZÉRO octet de premier
 * chargement, puisque rien de tout cela n'est du JavaScript. Surtout : une
 * carte que le client n'affiche pas n'insère jamais son `<img>` dans le
 * document, donc son AVIF n'est jamais demandé. On paie le texte de quinze
 * candidates, les octets d'image de deux ou trois.
 *
 * L'alternative — élargir la projection pour y mettre les visuels — aurait fait
 * entrer les chemins d'image dans le paquet JavaScript de toutes les pages qui
 * affichent un panier, et fait naître une seconde fabrique de chemins. D17
 * l'interdit, et C14/C15 ont payé trois fois le prix d'une deuxième vérité.
 */
const SUGGESTIONS_VENDABLES = CATALOGUE.filter(
  (produit) =>
    estDisponible(produit) && produit.variantes.some((variante) => variante.stock > 0),
);

const POOL_SUGGESTIONS: readonly CandidatSuggestion[] = SUGGESTIONS_VENDABLES.map((produit) => ({
  slug: produit.slug,
  famille: produit.famille,
}));

const CARTES_SUGGESTIONS: Record<string, ReactNode> = Object.fromEntries(
  SUGGESTIONS_VENDABLES.map((produit) => [
    produit.slug,
    <CarteSuggestion key={produit.slug} produit={produit} />,
  ]),
);

export default function PagePanier() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      {/* L’IMAGE VIT À DROITE DU TITRE, PANIER VIDE COMME PANIER PLEIN
          (retour client n° 17). Elle appartient au bloc d’ouverture, qui est
          servi par le SERVEUR et ne dépend d’aucun état : le contenu du panier
          vit dans l’îlot en dessous, et la composition ne change donc pas selon
          qu’on a un article ou dix. C’est aussi ce qui garantit qu’elle est là
          au premier rendu, avant hydratation, sur la page dont le décalage
          cumulé est publié. */}
      <HerosIllustre heros={HEROS_PANIER} className="pt-12 pb-4 sm:pt-16">
        {/* Règle du fond de C19 : le chapeau appartient à la composition
            d'ouverture et le déclare ; la prose qui suit se lit, donc elle
            repose sur un panneau de verre. Le `text-chapeau` est CONSERVÉ —
            un cas du tunnel lit cette classe pour vérifier que le chapeau
            parle bien la police de texte et non la didone, et `BlocTitre` le
            pose exactement comme cette page le posait. */}
        <BlocTitre
          surtitre="Commande"
          titre="Panier"
          chapeau={
            <>
              Les frais de port se calculent ici, avant tout paiement, à partir du
              poids du colis et de la destination. Aucun supplément n’apparaît plus
              loin.
            </>
          }
          note={
            <>
              Ce panier reste dans votre navigateur&nbsp;: il survit à la fermeture
              de l’onglet, il ne part sur aucun serveur, et il disparaît si vous
              effacez les données du site.
            </>
          }
        />
      </HerosIllustre>

      <IlotPanier
        catalogue={CATALOGUE_PANIER}
        poolSuggestions={POOL_SUGGESTIONS}
        cartesSuggestions={CARTES_SUGGESTIONS}
      />
    </div>
  );
}
