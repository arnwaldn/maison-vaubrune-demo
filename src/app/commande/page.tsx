import type { Metadata } from 'next';

import { IlotCommande } from '@/composants/commande/IlotCommande';
import { CATALOGUE } from '@/donnees/catalogue';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';

/**
 * LA PAGE COMMANDE — coquille serveur, îlot client unique.
 *
 * La page a besoin du panier pour exister, et le panier vit dans le navigateur
 * du visiteur : tout le contenu utile est donc client. Il n'est pas pour autant
 * réparti en plusieurs îlots — un seul, `<IlotCommande>`, porte le
 * récapitulatif, les coordonnées et l'engagement. La coquille, elle, reste
 * statique : titre, chapeau et rappel de démonstration sont dans le HTML servi,
 * lisibles avant la moindre exécution de JavaScript.
 *
 * Indexation : hors du plan du site, mais pas `noindex` — l'arbitrage est
 * chiffré en tête de `src/app/panier/page.tsx`, et il vaut pour les deux
 * pages du tunnel.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Commande',
  description:
    'Récapitulatif de commande de la Maison Vaubrune : articles, frais de port, ' +
    'total à payer, coordonnées de livraison et conditions générales de vente.',
  alternates: { canonical: '/commande' },
};

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

export default function PageCommande() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 sm:pt-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Commande
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Récapitulatif</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Tout ce à quoi vous vous engageriez est écrit ci-dessous&nbsp;: le détail
          des articles, les frais de port, le total à payer et les articles qui
          n’ouvrent pas droit à rétractation.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Aucun paiement n’est possible sur cette démonstration, et aucune donnée
          saisie ne quitte cet onglet.
        </p>
      </section>

      <IlotCommande catalogue={CATALOGUE_PANIER} />
    </div>
  );
}
