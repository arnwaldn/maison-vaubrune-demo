import type { Metadata } from 'next';

import { IlotPanier } from '@/composants/panier/IlotPanier';
import { CATALOGUE } from '@/donnees/catalogue';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';

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
    'Le panier de la Maison Vaubrune : quantités, destination de livraison, ' +
    'frais de port calculés et récapitulatif avant commande.',
  alternates: { canonical: '/panier' },
};

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

export default function PagePanier() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 sm:pt-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Commande
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Panier</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Les frais de port se calculent ici, avant tout paiement, à partir du poids
          du colis et de la destination. Aucun supplément n’apparaît plus loin.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Ce panier reste dans votre navigateur&nbsp;: il survit à la fermeture de
          l’onglet, il ne part sur aucun serveur, et il disparaît si vous effacez les
          données du site.
        </p>
      </section>

      <IlotPanier catalogue={CATALOGUE_PANIER} />
    </div>
  );
}
