import type { Metadata } from 'next';

import { IlotCommande } from '@/composants/commande/IlotCommande';
import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { CATALOGUE } from '@/donnees/catalogue';
import { HEROS_COMMANDE } from '@/donnees/visuels-editoriaux';
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
 *
 * LE HÉROS ILLUSTRÉ (retour client n° 21, C21a) : la page la plus chargée du
 * site public — 119 kB de premier chargement pour un plafond de 125 (D36) —
 * gagne une image de tête sans payer un octet de JavaScript, parce qu'une
 * balise `<picture>` rendue au serveur n'en coûte aucun. Le titre, lui, N'ENTRE
 * PAS : le tunnel se lit, il ne se met pas en scène (D37 n° 19, doctrine C16),
 * et c'est ce que dit `titreAnime={false}`.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Commande',
  description:
    'Récapitulatif de commande de la boutique de démonstration Maison ' +
    'Vaubrune : articles, frais de port, total à payer, coordonnées de ' +
    'livraison et conditions générales de vente.',
  alternates: { canonical: '/commande' },
};

const CATALOGUE_PANIER = projeterCatalogue(CATALOGUE);

export default function PageCommande() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <HerosIllustre
        heros={HEROS_COMMANDE}
        titreAnime={false}
        className="pt-12 pb-2 sm:pt-16 sm:pb-4"
      >
        {/* Règle du fond de C19 — voir `panneau` dans `globals.css`. */}
        <BlocTitre
          surtitre="Commande"
          titre="Récapitulatif"
          chapeau={
            <>
              Tout ce à quoi vous vous engageriez est écrit ci-dessous&nbsp;: le
              détail des articles, les frais de port, le total à payer et les
              articles qui n’ouvrent pas droit à rétractation.
            </>
          }
          note={
            <>
              Le paiement va jusqu’au bout du parcours, mais n’encaisse
              rien&nbsp;: écran de simulation qui s’annonce comme tel, ou
              prestataire agréé en mode test. Vos coordonnées, elles, ne quittent pas
              ce navigateur.
            </>
          }
        />
      </HerosIllustre>

      <IlotCommande catalogue={CATALOGUE_PANIER} />
    </div>
  );
}
