import type { Metadata } from 'next';

import { IlotListeCommandes } from '@/composants/gestion/IlotListeCommandes';
import { COMMANDES_AMORCE, LIBELLE_JEU_ESSAI } from '@/donnees/commandes-amorce';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Commandes',
  description:
    'Liste des commandes de la démonstration Maison Vaubrune : référence, date, ' +
    'client, total et état.',
};

export default function PageCommandesGestion() {
  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Commandes</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          De la plus récente à la plus ancienne. Chaque référence mène au détail, où
          la commande se fait avancer d’un état à l’autre.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Les six premières viennent du {LIBELLE_JEU_ESSAI}&nbsp;; les suivantes sont
          celles que vous passez dans la démonstration, rangées dans votre navigateur.
        </p>
      </section>

      <IlotListeCommandes amorce={COMMANDES_AMORCE} />
    </>
  );
}
