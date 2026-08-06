import type { Metadata } from 'next';
import Link from 'next/link';

import { LIBELLE_JEU_ESSAI } from '@/donnees/commandes-amorce';

/**
 * LA PRISE EN MAIN — le mode d'emploi écrit, et l'heure qui va avec.
 *
 * L'offre « Boutique en ligne » inclut « prise en main documentée ». Cette page
 * est la moitié qu'on peut livrer d'avance : le texte, complet, qui reste
 * disponible après la séance et qu'on relit six mois plus tard quand la
 * question revient. L'autre moitié est l'heure passée avec le client, en
 * visioconférence, et elle NE SE SIMULE PAS — la section correspondante le dit
 * plutôt que de mettre une vidéo d'illustration à la place.
 *
 * Page entièrement statique, sans îlot : elle ne lit ni le stockage, ni le
 * catalogue, ni les commandes. Elle est aussi la seule de l'espace de gestion
 * qui garde tout son sens imprimée.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Prise en main',
  description:
    'Mode d’emploi de l’espace marchand de la démonstration Maison Vaubrune : ' +
    'tenir le catalogue, suivre une commande, retrouver les documents, exporter.',
};

const CLASSE_TITRE = 'text-titre font-semibold text-encre';
const CLASSE_SOUS_TITRE = 'mt-8 font-titre text-lg font-semibold text-encre';
const CLASSE_TEXTE = 'mt-4 max-w-lisible leading-relaxed text-encre';
const CLASSE_LIEN =
  'underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre';

export default function PagePriseEnMain() {
  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Prise en main</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Comment tenir cette boutique au quotidien&nbsp;: le catalogue, les
          commandes, les documents, les sauvegardes. Écrit pour être relu, pas
          seulement écouté une fois.
        </p>
      </section>

      <div className="mt-12 space-y-14 pb-4">
        <section aria-labelledby="titre-catalogue">
          <h2 id="titre-catalogue" className={CLASSE_TITRE}>
            1. Tenir le catalogue
          </h2>

          <p className={CLASSE_TEXTE}>
            Tout se passe dans{' '}
            <Link href="/gestion/catalogue" className={CLASSE_LIEN}>
              Catalogue
            </Link>
            . Chaque référence occupe un bloc, et chacun de ses formats une ligne du
            tableau. Vous modifiez directement dans les champs&nbsp;: il n’y a pas de
            bouton «&nbsp;Enregistrer&nbsp;», la modification est prise dès que la
            valeur est lisible.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Changer un prix</h3>
          <p className={CLASSE_TEXTE}>
            Écrivez le prix en euros, avec une virgule et au plus deux décimales
            — 12,90 par exemple. Le point est accepté aussi, et le symbole € est
            ignoré s’il traîne. Une saisie qui ne se lit pas reste affichée telle que
            vous l’avez tapée, avec un message rouge sous le champ&nbsp;: rien n’est
            enregistré tant qu’elle n’est pas corrigée, et rien n’est perdu. Sous
            chaque champ modifié, le prix d’origine est rappelé en ocre.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Changer un stock</h3>
          <p className={CLASSE_TEXTE}>
            Un entier positif, zéro compris. À zéro, le format devient
            «&nbsp;épuisé&nbsp;» sur la fiche et ne peut plus être ajouté au panier.
            Les formats sous dix unités remontent automatiquement dans
            «&nbsp;Stocks bas&nbsp;» du tableau de bord.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Retirer une référence de la vente</h3>
          <p className={CLASSE_TEXTE}>
            Décochez «&nbsp;Disponible à la vente&nbsp;». La fiche reste lisible et son
            adresse continue de répondre — c’est important&nbsp;: un lien partagé, un
            favori ou un résultat de moteur ne doivent pas se mettre à répondre 404
            parce qu’un produit est en rupture. Le bouton d’ajout s’éteint et affiche
            son motif. Recochez la case pour la remettre en vente.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Mettre en avant</h3>
          <p className={CLASSE_TEXTE}>
            La case «&nbsp;Mise en avant&nbsp;» ajoute l’étiquette
            «&nbsp;Sélection&nbsp;» au rayon et sur la fiche. C’est un signal de
            vitrine, pas un classement&nbsp;: l’ordre du rayon reste celui des
            familles.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Ce qui n’est pas modifiable, et pourquoi</h3>
          <p className={CLASSE_TEXTE}>
            Les poids d’expédition, les formats, les textes de fiche et les mentions
            légales ne se modifient pas depuis cet écran. Ce n’est pas une limite de
            la démonstration mais une règle de sûreté&nbsp;: le poids décide de la
            tranche de frais de port, le format porte le nombre de pièces d’un
            coffret composé, et les mentions de rétractation sont calculées à partir
            de la nature du produit. Une boutique livrée les ouvre à l’édition, avec
            un éditeur de texte, une relecture et un historique des versions.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>
            Vos essais ne s’appliquent qu’à la vitrine
          </h3>
          <p className={CLASSE_TEXTE}>
            Le rayon et les fiches affichent immédiatement vos valeurs. Le panier et
            la commande, eux, restent aux prix d’origine. Ce n’est pas un oubli, c’est
            la règle que vend cette démonstration&nbsp;: le serveur ne fait jamais
            confiance au navigateur, et il recalcule la totalité d’une commande avant
            d’ouvrir le paiement. Sur une boutique livrée, vos prix vivraient sur ce
            serveur et s’appliqueraient donc partout.
          </p>
        </section>

        <section aria-labelledby="titre-commandes">
          <h2 id="titre-commandes" className={CLASSE_TITRE}>
            2. Suivre une commande
          </h2>

          <p className={CLASSE_TEXTE}>
            La liste vit dans{' '}
            <Link href="/gestion/commandes" className={CLASSE_LIEN}>
              Commandes
            </Link>
            , de la plus récente à la plus ancienne. Le sélecteur en haut à gauche
            filtre par état. Cliquez une référence pour ouvrir son détail.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Les quatre états, et leur sens</h3>
          <p className={CLASSE_TEXTE}>
            Une commande naît <strong>payée</strong>. Vous la passez en{' '}
            <strong>préparée</strong> quand le colis est fait, puis en{' '}
            <strong>expédiée</strong> quand il part. Depuis payée ou préparée, vous
            pouvez aussi l’<strong>annuler</strong>.
          </p>
          <p className={CLASSE_TEXTE}>
            Expédiée et annulée sont des états définitifs, et le système refuse d’en
            sortir. Ce n’est pas une rigidité gratuite&nbsp;: un colis parti est
            parti, et ce qui arrive ensuite — un retour, une rétractation — est un
            autre acte, avec ses propres pièces. Une commande annulée qu’on pourrait
            rouvrir ferait exister deux versions d’un même engagement, celle que le
            client a lue et celle que vous auriez rétablie.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Le journal</h3>
          <p className={CLASSE_TEXTE}>
            Chaque changement d’état ajoute une ligne horodatée au journal, qui ne se
            réécrit jamais. C’est lui qui permet de répondre à «&nbsp;quand cette
            commande est-elle passée en préparation&nbsp;?&nbsp;» sans le deviner, et
            c’est lui qu’affiche la page de suivi côté client.
          </p>

          <h3 className={CLASSE_SOUS_TITRE}>Ce que le client voit</h3>
          <p className={CLASSE_TEXTE}>
            La page{' '}
            <Link href="/suivi" className={CLASSE_LIEN}>
              Suivi de commande
            </Link>{' '}
            est publique&nbsp;: le client y saisit sa référence et voit la frise
            payée → préparée → expédiée avec les horodatages de votre journal. Sur une
            boutique livrée, chaque changement d’état part aussi par courriel&nbsp;;
            la démonstration n’en envoie aucun, et les textes exacts sont dans{' '}
            <Link href="/gestion/modeles-de-courriels" className={CLASSE_LIEN}>
              Modèles de courriels
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="titre-documents">
          <h2 id="titre-documents" className={CLASSE_TITRE}>
            3. Où sont les documents
          </h2>

          <p className={CLASSE_TEXTE}>
            Les cinq modèles de courriels sont dans{' '}
            <Link href="/gestion/modeles-de-courriels" className={CLASSE_LIEN}>
              Modèles de courriels
            </Link>
            , dans l’ordre du parcours client&nbsp;: confirmation de commande,
            expédition, accusé de réception d’une rétractation, instructions de
            retour, confirmation de remboursement. Chacun indique son déclencheur, et
            ses emplacements variables sont surlignés.
          </p>

          <p className={CLASSE_TEXTE}>
            Les documents de vente sont publiés et accessibles depuis le pied de page
            de la boutique&nbsp;:{' '}
            <Link href="/mentions-legales" className={CLASSE_LIEN}>
              Mentions légales
            </Link>
            ,{' '}
            <Link href="/conditions-generales-de-vente" className={CLASSE_LIEN}>
              Conditions générales de vente
            </Link>
            ,{' '}
            <Link href="/donnees-personnelles" className={CLASSE_LIEN}>
              Données personnelles
            </Link>{' '}
            et{' '}
            <Link href="/retractation" className={CLASSE_LIEN}>
              Droit de rétractation
            </Link>
            . Le lien des conditions générales, sur la page de commande, ouvre
            désormais le vrai document.
          </p>

          <p className={CLASSE_TEXTE}>
            Ce sont des <strong>gabarits</strong>&nbsp;: partout où un marchand
            réel inscrit une donnée qui lui appartient — son numéro
            d’identification, son adresse, son téléphone, son médiateur, ses durées
            de conservation — la page affiche un emplacement surligné qui nomme ce
            qui manque, en français. Rien n’a été inventé pour les remplir, et une
            garde du dépôt (<code>npm run verifier-donnees</code>) fait échouer le
            contrôle si une donnée de ce type venait à y apparaître.
          </p>

          <p className={CLASSE_TEXTE}>
            La page{' '}
            <Link href="/retractation" className={CLASSE_LIEN}>
              Droit de rétractation
            </Link>{' '}
            publie en outre le régime de chaque référence du catalogue —
            droit ouvert ou exception, avec son fondement — et ce tableau est{' '}
            <strong>engendré</strong> depuis le catalogue&nbsp;: modifier une fiche
            met la page à jour, et il est impossible d’annoncer une référence dans un
            régime ici et de la vendre dans un autre là-bas. Elle porte aussi le
            formulaire type de l’annexe R.&nbsp;221-1, imprimable et téléchargeable
            en texte brut.
          </p>

          <p className={CLASSE_TEXTE}>
            Les frais de port, leurs zones, leurs tranches et leurs délais sont
            publiés sur la page{' '}
            <Link href="/livraison" className={CLASSE_LIEN}>
              Livraison
            </Link>
            , qui est engendrée depuis le barème&nbsp;: aucun montant n’y est écrit à
            la main, et changer de transporteur ne demande de toucher qu’un tableau
            de nombres.
          </p>
        </section>

        <section aria-labelledby="titre-exporter">
          <h2 id="titre-exporter" className={CLASSE_TITRE}>
            4. Exporter, et réinitialiser
          </h2>

          <p className={CLASSE_TEXTE}>
            Le bouton <strong>Exporter en JSON</strong>, en haut de l’écran Catalogue,
            télécharge le catalogue complet avec vos valeurs — les quinze fiches
            entières, textes compris. C’est exactement ce qu’une boutique livrée
            enregistre dans sa base de données&nbsp;: le fichier se relit, se
            réimporte, et sert de sauvegarde avant une modification importante.
          </p>

          <p className={CLASSE_TEXTE}>
            Le bouton <strong>Réinitialiser le jeu d’essai</strong>, à côté, remet
            tout à zéro&nbsp;: le catalogue reprend ses valeurs d’origine, les six
            commandes du {LIBELLE_JEU_ESSAI} reviennent à leur état d’origine, et les
            commandes que vous aviez passées vous-même dans la démonstration sont
            effacées. Rien ne le demande deux fois — exportez avant si vous tenez à
            vos essais.
          </p>

          <p className={CLASSE_TEXTE}>
            Rappel utile&nbsp;: tout ce que vous modifiez ici vit dans le stockage
            local de votre navigateur, et nulle part ailleurs. Changer de navigateur
            ou d’appareil, ou vider le cache, vous rend l’étal d’origine. Sur une
            boutique livrée, ces données vivent sur un serveur, sauvegardé, et se
            retrouvent depuis n’importe quel écran.
          </p>
        </section>

        <section
          aria-labelledby="titre-heure"
          className="rounded-sm border border-ocre-clair bg-papier p-5 sm:p-6"
        >
          <h2 id="titre-heure" className={CLASSE_TITRE}>
            5. L’heure de prise en main
          </h2>

          <p className={CLASSE_TEXTE}>
            L’offre comprend une heure de prise en main. Elle se fait{' '}
            <strong>avec vous, en visioconférence</strong>, écran partagé, sur votre
            boutique et vos produits — pas sur cette démonstration. On y fait les
            gestes une première fois ensemble&nbsp;: ajouter une référence, corriger
            un prix, passer une vraie commande d’essai de bout en bout, la faire
            avancer, retrouver le courriel qu’elle déclenche.
          </p>

          <p className={CLASSE_TEXTE}>
            <strong>Cette heure ne se simule pas</strong>, et cette page ne prétend
            pas la remplacer. Ce qui s’écrit d’avance est écrit ci-dessus, et reste
            disponible après la séance&nbsp;; ce qui se passe pendant l’heure, ce sont
            vos questions, sur votre catalogue, avec quelqu’un en face. Mettre une
            vidéo de démonstration à cet endroit laisserait croire l’inverse.
          </p>

          <div className="mt-6 rounded-sm border border-dashed border-encre-douce/50 bg-creme px-5 py-8 text-center">
            <p className="font-titre text-base font-semibold text-encre">
              Emplacement réservé à l’enregistrement de la séance
            </p>
            <p className="mt-2 text-sm leading-relaxed text-encre-douce">
              La séance est enregistrée si vous le souhaitez, et le fichier vous est
              remis. Il prendrait place ici, sur votre installation. Rien n’est
              déposé sur cette démonstration&nbsp;: il n’y a aucune séance à montrer,
              et un enregistrement d’illustration ne serait pas le vôtre.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
