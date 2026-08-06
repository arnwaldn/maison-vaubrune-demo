import type { Metadata } from 'next';

import { IlotTableauDeBord } from '@/composants/gestion/IlotTableauDeBord';
import { CATALOGUE } from '@/donnees/catalogue';
import { COMMANDES_AMORCE, LIBELLE_JEU_ESSAI } from '@/donnees/commandes-amorce';
import { projeterPourMarchand } from '@/lib/gestion/projection-marchand';

/**
 * LE TABLEAU DE BORD — coquille serveur, îlot client unique.
 *
 * Le jeu d'essai et la projection marchand sont calculés À LA CONSTRUCTION et
 * transmis en propriétés : les octets voyagent dans la charge utile RSC,
 * aplatie dans le HTML, et non dans le paquet JavaScript (décision D17). C'est
 * la même mécanique que les stocks du panier dans la mise en page racine.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Tableau de bord',
  description:
    'Espace marchand de la démonstration Maison Vaubrune : compteurs par état, ' +
    'chiffre d’affaires du jeu d’essai et stocks bas.',
};

const PRODUITS = projeterPourMarchand(CATALOGUE);

export default function PageGestion() {
  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Tableau de bord</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Ce que le marchand voit en ouvrant sa boutique&nbsp;: où en sont les
          commandes, ce qu’elles ont rapporté, ce qui manque en rayon.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Les chiffres ci-dessous portent sur le {LIBELLE_JEU_ESSAI} — six commandes
          fabriquées pour que cet écran ait quelque chose à montrer — augmenté des
          commandes que vous passez vous-même dans la démonstration.
        </p>
      </section>

      <IlotTableauDeBord amorce={COMMANDES_AMORCE} produits={PRODUITS} />
    </>
  );
}
