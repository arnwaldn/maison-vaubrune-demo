import type { Metadata } from 'next';

import { LigneEntree } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { HEROS_PAIEMENT_SIMULATION } from '@/donnees/visuels-editoriaux';
import { IlotSimulation } from '@/composants/paiement/IlotSimulation';

/**
 * L'ÉCRAN DE PAIEMENT SIMULÉ — il imite une page de paiement, et le DIT.
 *
 * ---------------------------------------------------------------------------
 * AUCUN CHAMP DE CARTE, PAS MÊME DÉCORATIF
 * ---------------------------------------------------------------------------
 *
 * Un faux formulaire de numéro de carte, même barré, même désactivé, même
 * accompagné d'un « ceci est une démonstration », est une mauvaise idée dont
 * on ne se remet pas : quelqu'un finira par y taper seize chiffres. Un
 * visiteur ne lit pas les avertissements d'une page qui a la forme de ce qu'il
 * attend — il remplit ce qui ressemble à un champ. Cet écran n'affiche donc
 * AUCUNE zone de saisie, et remplace le formulaire par un encart qui décrit,
 * en français, ce que le prestataire agréé afficherait à cet endroit.
 *
 * L'aveu vient EN PREMIER, avant le récapitulatif et avant les boutons : c'est
 * la seule position où il est lu.
 *
 * ---------------------------------------------------------------------------
 * INDEXATION — `noindex` assumé, et l'écart avec la décision D19 est motivé
 * ---------------------------------------------------------------------------
 *
 * La décision D19 a retiré `noindex` de `/panier` et `/commande` après mesure :
 * la directive fait tomber la note de référencement de 100 à 66 (audit
 * `is-crawlable`), et ce projet vend quatre notes mesurées. Cette page-ci est
 * traitée AUTREMENT, et la raison est nette : `/panier` et `/commande` sont des
 * pages de boutique, présentables, que l'on peut vouloir montrer ; cet écran
 * est un ORGANE DE FONCTIONNEMENT, une étape technique du tunnel, sans contenu
 * propre et sans intérêt hors de son parcours. Une adresse de ce genre
 * remontant dans un moteur de recherche donnerait à voir « Écran de paiement
 * simulé » détaché de tout — la pire vitrine possible pour une démonstration
 * qui se vend sur son sérieux.
 *
 * Elle porte donc `robots: noindex`, elle n'est pas au plan du site, et — c'est
 * l'autre moitié de la décision — ELLE N'ENTRE PAS DANS LES MESURES LIGHTHOUSE
 * PUBLIÉES. Les quatre notes promises portent sur l'accueil, le rayon, une
 * fiche et le tunnel ; mesurer ici produirait un 66 de référencement qui ne
 * dirait rien de la qualité du travail et tout de la consigne donnée.
 *
 * ---------------------------------------------------------------------------
 * LE HÉROS ILLUSTRÉ NE DÉPLACE NI D22 NI D21 (retour client n° 21, C21a)
 * ---------------------------------------------------------------------------
 *
 * L'image entre dans la COLONNE DE DROITE du héros, l'avertissement reste dans
 * la gauche — donc AVANT lui dans l'ordre du document, aux deux largeurs : sous
 * `lg` la grille retombe à une colonne et l'ordre du DOM devient l'ordre
 * visuel, ce qui met l'image SOUS l'avertissement et non entre le titre et lui.
 * Ce n'est pas un réglage heureux, c'est la seule disposition acceptable : la
 * phrase « aucune carte n'est demandée » doit être lue avant tout le reste, et
 * un visiteur ne lit pas l'avertissement d'une page qui a la forme de ce qu'il
 * attend.
 *
 * Le grand encart « ce que le prestataire agréé afficherait ici » reste DEHORS
 * du héros, en pleine largeur : le mettre dans la colonne de gauche aurait
 * étiré celle-ci sur trois écrans et fait flotter l'image au milieu du vide.
 *
 * Et l'image elle-même est contrainte par D22 avant d'être choisie pour son
 * goût : aucun organe de paiement, aucun chiffre, aucune main — le sujet est
 * un cachet de cire NU. Le raisonnement est à l'entrée de données.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Écran de paiement simulé',
  description:
    'Écran de paiement simulé de la démonstration Maison Vaubrune : aucun ' +
    'prestataire n’est appelé et aucune carte n’est demandée.',
  robots: { index: false, follow: true },
};

export default function PageSimulation() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <HerosIllustre
        heros={HEROS_PAIEMENT_SIMULATION}
        titreAnime={false}
        className="pt-12 pb-2 sm:pt-16 sm:pb-4"
      >
        {/* DEUX LIGNES SEULEMENT ENTRENT ICI, ET LA TROISIÈME N'ENTRERA PAS.
            Le paragraphe qui suit n'est pas un chapeau : c'est l'AVERTISSEMENT
            de la décision D22 — « aucune carte n'est demandée, aucun montant ne
            sera débité ». Un avertissement se peint, il ne se met pas en scène,
            et le faire arriver soixante-dix millisecondes après le titre serait
            soixante-dix millisecondes pendant lesquelles un écran qui ressemble
            à un paiement n'aurait pas encore dit qu'il n'en est pas un. */}
        <LigneEntree rang={1} className="etiquette text-ocre" enfants="Paiement" />
        <LigneEntree
          rang={2}
          balise="h1"
          className="mt-4 text-affiche text-encre"
          enfants="Écran de paiement simulé"
        />

        <p className="mt-5 max-w-lisible rounded-sm border border-ocre/40 bg-papier px-5 py-4 text-chapeau leading-relaxed text-encre">
          <strong>
            Aucun prestataire n’est appelé, aucune carte n’est demandée, aucun montant
            ne sera débité.
          </strong>{' '}
          Cette page appartient à la démonstration&nbsp;: elle occupe la place de la
          page de paiement, elle n’en est pas une.
        </p>
      </HerosIllustre>

      <div className="mt-2 max-w-lisible rounded-sm border border-filet bg-creme px-5 py-4 text-sm leading-relaxed text-encre-douce">
        <p className="font-semibold text-encre">Ce que le prestataire agréé afficherait ici</p>
        <p className="mt-3">
          Sa propre page, hébergée sur son domaine, sur laquelle le visiteur saisit son
          numéro de carte, sa date d’expiration et son cryptogramme, puis valide
          l’authentification forte de sa banque. Il y renseigne aussi son adresse de
          livraison, que la boutique reçoit ensuite de lui.
        </p>
        <p className="mt-3">
          La boutique ne voit jamais ces informations et n’en conserve aucune&nbsp;:
          c’est la raison d’être d’un encaissement délégué, et c’est ce qui met la
          conformité des cartes bancaires à la charge de celui qui en fait métier. Voilà
          aussi pourquoi cette démonstration n’affiche pas de faux champ de carte, même
          désactivé&nbsp;: un champ qui ressemble à un champ finit par être rempli.
        </p>
      </div>

      {/* La chaîne de requête n'existe que dans le navigateur : la coquille
          reste engendrée à la construction, et l'îlot la lit dans un effet,
          après hydratation (voir son en-tête). */}
      <IlotSimulation />
    </div>
  );
}
