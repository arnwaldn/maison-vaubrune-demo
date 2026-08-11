import type { Metadata } from 'next';

import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
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
        <BlocTitre
          surtitre="Espace marchand"
          titre="Tableau de bord"
          chapeau={
            <>
              Ce que le marchand voit en ouvrant sa boutique&nbsp;: où en sont les
              commandes, ce qu’elles ont rapporté, ce qui manque en rayon.
            </>
          }
          note={
            <>
              Les chiffres ci-dessous portent sur le {LIBELLE_JEU_ESSAI} — six
              commandes fabriquées pour que cet écran ait quelque chose à montrer —
              augmenté des commandes que vous passez vous-même dans la démonstration.
            </>
          }
        />
      </section>

      {/* LE TABLEAU DE BORD MARCHAND ENTRE LUI AUSSI (retour client n° 18).
          Ces cinq écrans ne sont NI le tunnel NI un document légal : personne
          n'y vérifie un montant avant de payer, personne n'y lit un texte
          opposable. L'interdit n° 19 de D37 ne les vise pas, et un espace
          marchand qui s'affiche d'un bloc au milieu d'un site qui respire se
          lit comme la partie qu'on n'a pas finie. */}
      <div data-revelation>
        <IlotTableauDeBord amorce={COMMANDES_AMORCE} produits={PRODUITS} />
      </div>
    </>
  );
}
