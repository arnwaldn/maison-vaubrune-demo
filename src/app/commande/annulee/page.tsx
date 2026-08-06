import type { Metadata } from 'next';

import { IlotAnnulation } from '@/composants/commande/IlotAnnulation';

/**
 * LE RETOUR D'UN PAIEMENT ANNULÉ.
 *
 * Le prestataire y renvoie par son `cancel_url`, l'écran simulé par son bouton
 * « Annuler ». La page ne lit AUCUN paramètre d'URL — la référence y figure,
 * mais l'écran n'en a pas l'usage : il n'y a plus de commande à désigner, il y
 * a un panier à rendre. Pas de `<Suspense>` ici, donc, et pas de chaîne de
 * requête à attendre.
 *
 * Indexation : hors du plan du site, mais pas `noindex` — décision D19, comme
 * les autres pages du tunnel.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Paiement annulé',
  description:
    'Le paiement a été interrompu : le panier de la démonstration Maison ' +
    'Vaubrune est resté intact.',
  alternates: { canonical: '/commande/annulee' },
};

export default function PageAnnulee() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 sm:pt-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Commande
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Paiement annulé</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Le paiement a été interrompu. Aucun montant n’a été engagé, aucune commande
          n’a été enregistrée.
        </p>
      </section>

      <IlotAnnulation />
    </div>
  );
}
