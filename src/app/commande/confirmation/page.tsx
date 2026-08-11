import type { Metadata } from 'next';

import { IlotConfirmation } from '@/composants/commande/IlotConfirmation';
import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { HEROS_COMMANDE_CONFIRMATION } from '@/donnees/visuels-editoriaux';

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
 *
 * LE HÉROS ILLUSTRÉ, ET CE QU'IL N'A PAS LE DROIT DE POUSSER (C21a, retour
 * client n° 21). Sur cette page-ci, l'information reine est la RÉFÉRENCE de
 * commande : c'est elle qu'on recopie, qu'on cherche dans un courriel, qu'on
 * saisit dans `/suivi`. Une image de tête qui la ferait passer sous la ligne de
 * flottaison d'un téléphone rendrait la page plus belle et moins utile. Le
 * héros est donc SERRÉ — remplissage bas réduit, rappel de fiction ramené à la
 * suite du chapeau — et la position de la référence à 390 px est mesurée à la
 * capture, avant et après (`preuves/c21/`). Le titre, lui, n'entre pas : le
 * tunnel se lit (D37 n° 19, doctrine C16).
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
      <HerosIllustre
        heros={HEROS_COMMANDE_CONFIRMATION}
        titreAnime={false}
        /* LE RYTHME EST SERRÉ ICI, ET LE CHIFFRE EST LA RAISON. Au premier jet
           — le remplissage des deux autres pages du tunnel — la référence de
           commande finissait à 897 px sur un téléphone de 390 × 844 : il fallait
           défiler de 53 px pour lire en entier ce que la page existe pour
           donner. Trois retraits l'ont ramenée au-dessus de la ligne, mesurés
           un par un (`preuves/c21/vu-tunnel.txt`) : le remplissage haut passe de
           48 à 24 px sous `sm`, le bas à zéro, et la gouttière entre le texte et
           l'image de 32 à 16 px — `gap-y-4` bat le `gap-8` du composant parce
           que Tailwind écrit `row-gap` après `gap`, exactement comme le
           `lg:gap-x-12` qu'il porte déjà.

           UN QUATRIÈME RETRAIT EST VENU D'AILLEURS, ET IL N'A PAS ÉTÉ DEMANDÉ
           PAR LA MESURE : le retour client n° 22 a emporté le cartouche de tous
           les héros du site, et celui-ci pesait vingt-deux pixels de plus sur un
           téléphone. La référence remonte donc encore, gratuitement. Les trois
           réglages ci-dessus RESTENT — ils ont été mesurés sur une page qui
           portait sa légende, et les défaire au motif qu'on a gagné de la marge
           reviendrait à dépenser deux fois le même gain.

           Au-dessus de `sm` rien ne change : la contrainte est celle d'un
           téléphone, et payer partout le prix d'un écran étroit serait la
           mauvaise généralisation. */
        className="gap-y-4 pt-6 pb-0 sm:gap-y-8 sm:pt-16 sm:pb-4"
      >
        <BlocTitre
          surtitre="Commande"
          titre="Merci"
          chapeau={
            <>
              Votre commande est enregistrée. Elle porte une référence, un état et un
              journal, et vous les retrouverez ci-dessous.
            </>
          }
        />
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Rappel&nbsp;: Maison Vaubrune est une épicerie fine fictive. Rien ne sera
          expédié, et la démonstration détaille juste en dessous ce qui vient
          réellement de se passer.
        </p>
      </HerosIllustre>

      <IlotConfirmation />
    </div>
  );
}
