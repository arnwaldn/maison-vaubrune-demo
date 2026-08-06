import type { Metadata } from 'next';

import { IlotConfirmation } from '@/composants/commande/IlotConfirmation';

/**
 * LA PAGE DE CONFIRMATION — le retour du paiement, quel qu'en soit le chemin.
 *
 * Le prestataire de paiement y renvoie par son `success_url`, l'écran simulé
 * par son bouton « Payer ». Les deux passent la référence en chaîne de requête,
 * et cette page ne cherche pas à savoir d'où l'on vient : c'est ce qui fait
 * qu'ajouter une clé de test ne change pas une ligne ici.
 *
 * La coquille reste STATIQUE — titre, chapeau, rappel de démonstration sont
 * dans le HTML servi. Tout ce qui dépend de la référence et du stockage local
 * vit dans l'îlot client, qui les lit APRÈS hydratation (voir son en-tête) et
 * réserve sa place d'ici là.
 *
 * Indexation : comme `/panier` et `/commande`, hors du plan du site mais pas
 * `noindex` (décision D19, arbitrage chiffré en tête de `src/app/panier/page.tsx`).
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Commande confirmée',
  description:
    'Confirmation de commande de la démonstration Maison Vaubrune : référence, ' +
    'récapitulatif, état de la commande et journal.',
  alternates: { canonical: '/commande/confirmation' },
};

export default function PageConfirmation() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 sm:pt-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Commande
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Merci</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Votre commande est enregistrée. Elle porte une référence, un état et un
          journal, et vous les retrouverez ci-dessous.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Rappel&nbsp;: Maison Vaubrune est une épicerie fine fictive. Rien ne sera
          expédié, et la démonstration détaille juste en dessous ce qui vient
          réellement de se passer.
        </p>
      </section>

      <IlotConfirmation />
    </div>
  );
}
