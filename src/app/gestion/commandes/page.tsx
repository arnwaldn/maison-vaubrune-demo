import type { Metadata } from 'next';

import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
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
        <BlocTitre
          surtitre="Espace marchand"
          titre="Commandes"
          chapeau={
            <>
              De la plus récente à la plus ancienne. Chaque référence mène au détail,
              où la commande se fait avancer d’un état à l’autre.
            </>
          }
          note={
            <>
              Les six premières viennent du {LIBELLE_JEU_ESSAI}&nbsp;; les suivantes
              sont celles que vous passez dans la démonstration, rangées dans votre
              navigateur.
            </>
          }
        />
      </section>

      {/* Même motif que le tableau de bord : l'espace marchand n'est ni le
          tunnel ni un document légal (voir `gestion/page.tsx`). */}
      <div data-revelation>
        <IlotListeCommandes amorce={COMMANDES_AMORCE} />
      </div>
    </>
  );
}
