import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { LienLegal, T } from '@/composants/legal/PageLegale';
import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { CATALOGUE } from '@/donnees/catalogue';
import { FAMILLES, CODES_ZONE } from '@/lib/types';

/**
 * À PROPOS DE CETTE DÉMONSTRATION — la frontière, en trois colonnes.
 *
 * Reprise du brouillon
 * `contenu/juridique-brouillons/06-a-propos-de-cette-demonstration.md`, prose
 * intacte, dans la mise en page qu'il demande : trois colonnes à parts égales
 * sur grand écran, empilées sur mobile, titres de colonne au mot près.
 *
 * ---------------------------------------------------------------------------
 * AUCUN JETON SUR CETTE PAGE, ET C'EST VOULU
 * ---------------------------------------------------------------------------
 *
 * C'est le seul des cinq documents de la tranche qui ne comporte pas un seul
 * `<AComplete>` : il ne décrit pas le marchand, il décrit le SITE. Il n'y a
 * donc rien à compléter. La garde `verifier-aucune-donnee-inventee` en tient
 * compte explicitement — voir sa liste `PAGES_LEGALES`, où cette page est la
 * seule dispensée d'emplacement, avec son motif écrit à côté.
 *
 * ---------------------------------------------------------------------------
 * LES CHIFFRES SONT CALCULÉS, PAS RECOPIÉS
 * ---------------------------------------------------------------------------
 *
 * Le rédacteur a posé la règle : « les chiffres cités proviennent du catalogue
 * et du barème ; s'ils doivent figurer en dur, un contrôle doit les comparer
 * aux sources ; sinon, ils sont calculés à la construction ». Calculés, donc :
 * quinze produits, vingt-trois formats et sept familles sortent du catalogue,
 * trois zones du vocabulaire du moteur d'expédition, cinq courriels du dossier
 * des modèles. Une page qui se vante d'exactitude ne peut pas se permettre un
 * nombre périmé — ce serait la première chose qu'un prospect attentif irait
 * vérifier.
 *
 * Page STATIQUE, INDEXABLE, sans îlot client.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'À propos de cette démonstration',
  description:
    'Ce que la démonstration Maison Vaubrune fait vraiment, ce qu’elle simule ' +
    'et le dit, et ce que change une boutique livrée à un marchand réel.',
  alternates: { canonical: '/a-propos-de-cette-demonstration' },
};

/* -------------------------------------------------------------------------- */
/* Les chiffres, lus à leur source                                             */
/* -------------------------------------------------------------------------- */

const NOMBRE_PRODUITS = CATALOGUE.length;
const NOMBRE_FORMATS = CATALOGUE.reduce(
  (total, produit) => total + produit.variantes.length,
  0,
);
const NOMBRE_FAMILLES = FAMILLES.length;
const NOMBRE_ZONES = CODES_ZONE.length;

/**
 * Les modèles de courriels sont COMPTÉS, pas déclarés.
 *
 * Même lecture du système de fichiers que `/gestion/modeles-de-courriels`, à la
 * construction, dans un composant serveur : rien de tout cela n'atteint le
 * navigateur. Ajouter un sixième modèle au dossier suffira à corriger cette
 * page.
 */
const NOMBRE_COURRIELS = readdirSync(
  join(process.cwd(), 'contenu', 'juridique-brouillons', 'modeles-courriels'),
).filter((fichier) => fichier.endsWith('.md')).length;

const EN_LETTRES: Readonly<Record<number, string>> = {
  3: 'trois',
  4: 'quatre',
  5: 'cinq',
  6: 'six',
  7: 'sept',
  15: 'quinze',
  23: 'vingt-trois',
};

function enLettres(nombre: number): string {
  return EN_LETTRES[nombre] ?? String(nombre);
}

/** Le même nombre, en tête de phrase. */
function enLettresCapitale(nombre: number): string {
  const mot = enLettres(nombre);
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Les trois colonnes                                                          */
/* -------------------------------------------------------------------------- */

interface Entree {
  readonly titre: string;
  readonly corps: ReactNode;
}

const FAIT_VRAIMENT: readonly Entree[] = [
  {
    titre: 'Un catalogue tenu par le marchand.',
    corps: (
      <T>
        {`${enLettresCapitale(NOMBRE_PRODUITS)} produits, ${enLettres(NOMBRE_FORMATS)} formats, ` +
          `${enLettres(NOMBRE_FAMILLES)} familles. Chaque fiche porte sa composition, ses ` +
          'allergènes, son origine, son poids expédié, son mode de conservation ' +
          'et son régime de rétractation. Un espace marchand permet d’en modifier ' +
          'le contenu depuis le navigateur, pour montrer que le catalogue ' +
          'appartient au commerçant et non au prestataire.'}
      </T>
    ),
  },
  {
    titre: 'Un panier qui calcule juste.',
    corps: (
      <T>
        {'Les prix sont stockés en centimes, jamais recomposés par un calcul à ' +
          'virgule flottante. Les totaux, les quantités et les formats se ' +
          'comportent comme sur une boutique réelle, y compris pour les coffrets, ' +
          'dont le prix est une donnée saisie et non une addition de leurs pièces.'}
      </T>
    ),
  },
  {
    titre: 'Des frais de port calculés par des règles, affichés avant de payer.',
    corps: (
      <T>
        {`Le barème travaille sur ${enLettres(NOMBRE_ZONES)} zones et sur le poids expédié réel des ` +
          'articles. Il sait refuser : une denrée sous température dirigée ' +
          'destinée à une adresse hors France métropolitaine produit un cas ' +
          'd’expédition impossible, avec l’indication du produit en cause, avant ' +
          'tout paiement.'}
      </T>
    ),
  },
  {
    titre: 'Un tunnel de commande complet.',
    corps: (
      <T>
        {'Panier, adresse, récapitulatif, validation par un bouton portant la ' +
          'mention d’obligation de paiement, redirection vers le paiement, retour ' +
          'sur la boutique. Aucune étape n’est sautée ni maquettée.'}
      </T>
    ),
  },
  {
    titre: 'Un suivi d’états.',
    corps: (
      <T>
        {'Une commande passe d’un état à l’autre — enregistrée, payée, préparée, ' +
          'expédiée, livrée, rétractée, remboursée — avec ses dates. Le suivi est ' +
          'consultable, et les données de la commande sont exportables au format ' +
          'JSON.'}
      </T>
    ),
  },
  {
    titre: 'Des pages légales rédigées, pas figurées.',
    corps: (
      <T>
        {'Mentions légales, conditions générales de vente, données personnelles, ' +
          'rétractation et formulaire type sont écrits en entier. Le tableau des ' +
          'exceptions de rétractation est produit à partir du catalogue lui-même : ' +
          'une référence ne peut pas être annoncée dans un régime sur une page et ' +
          'vendue dans un autre sur sa fiche.'}
      </T>
    ),
  },
  {
    titre: 'Des mesures publiées.',
    corps: (
      <T>
        {'Les quatre notes de qualité technique sont mesurées, datées et ' +
          'versionnées dans le dépôt, avec la commande qui permet de les ' +
          'reproduire.'}
      </T>
    ),
  },
];

const SIMULE: readonly Entree[] = [
  {
    titre: 'Le paiement.',
    corps: (
      <T>
        {'Le passage à la caisse redirige vers la page hébergée du prestataire de ' +
          'paiement en mode test, ou vers un écran de simulation qui s’annonce ' +
          'comme tel lorsque aucune clé n’est configurée. Aucune somme n’est ' +
          'débitée, aucun encaissement n’a lieu. Le comportement du reste du site ' +
          'est identique dans les deux cas : c’est la même mécanique, branchée sur ' +
          'un prestataire réel ou sur son doublure.'}
      </T>
    ),
  },
  {
    titre: 'L’enregistrement des commandes.',
    corps: (
      <T>
        {'Il n’y a ni base de données ni serveur qui conserve quoi que ce soit. ' +
          'Les essais du visiteur — panier, commandes, modifications du catalogue — ' +
          'vivent dans le stockage local de son navigateur. Ils ne quittent jamais ' +
          'son appareil, ne sont visibles de personne d’autre, et disparaissent ' +
          's’il vide les données de son navigateur. Un bandeau permanent le ' +
          'rappelle, et la page de suivi offre un bouton d’export et un bouton ' +
          'd’effacement.'}
      </T>
    ),
  },
  {
    titre: 'Les courriels.',
    corps: (
      <T>
        {`Aucun courriel ne part. Les ${enLettres(NOMBRE_COURRIELS)} messages qu’une boutique livrée ` +
          'envoie — confirmation de commande, expédition, accusé de rétractation, ' +
          'instructions de retour, confirmation de remboursement — sont rédigés et ' +
          'consultables, mais affichés à l’écran plutôt qu’expédiés.'}
      </T>
    ),
  },
  {
    titre: 'L’expédition.',
    corps: (
      <T>
        {'Aucun colis n’est préparé ni remis à un transporteur. Les numéros de ' +
          'suivi affichés sont fictifs et signalés comme tels ; les délais affichés ' +
          'sont ceux du barème, pas ceux d’un transporteur contractualisé.'}
      </T>
    ),
  },
  {
    titre: 'Les visuels.',
    corps: (
      <T>
        {'Les photographies de produits, les vues d’ambiance, les macros de famille ' +
          'et les boucles vidéo de ce site ont été ' +
          'ENGENDRÉES PAR UNE INTELLIGENCE ' +
          'ARTIFICIELLE, à partir de consignes écrites, puis relues une par une, ' +
          'recadrées, ré-encodées et dépouillées de leurs métadonnées avant d’entrer ' +
          'dans le site. Aucune n’est une photographie de banque d’images, aucune ne ' +
          'montre une personne, aucune ne reproduit une marque ou un signe officiel. ' +
          'Les produits qu’elles montrent n’existent pas : il aurait été malhonnête ' +
          'de les photographier, et plus malhonnête encore de laisser croire qu’on ' +
          'l’avait fait. Sur une boutique livrée, ces images sont remplacées par les ' +
          'photographies du marchand — c’est le seul poste de ce site qui change ' +
          'd’origine et non de nature.'}
      </T>
    ),
  },
  {
    titre: 'L’identité du marchand.',
    corps: (
      <T>
        {'Les pages légales sont des gabarits. Aucun numéro d’entreprise, aucune ' +
          'adresse, aucun téléphone, aucun nom de personne n’a été inventé pour les ' +
          'remplir : les emplacements sont surlignés et attendent les valeurs d’un ' +
          'marchand réel. Une vérification automatique fait échouer la construction ' +
          'du site si une donnée de ce type apparaissait dans le dépôt.'}
      </T>
    ),
  },
];

const BOUTIQUE_LIVREE: readonly Entree[] = [
  {
    titre: 'Une base de données.',
    corps: (
      <T>
        {'Les commandes, les clients et le catalogue quittent le navigateur pour ' +
          'un serveur : ils survivent au changement d’appareil, se retrouvent par ' +
          'recherche, se recoupent avec la comptabilité, et deviennent consultables ' +
          'par le marchand depuis n’importe où.'}
      </T>
    ),
  },
  {
    titre: 'Des comptes marchand sécurisés.',
    corps: (
      <T>
        {'L’espace de gestion du catalogue et des commandes passe derrière une ' +
          'authentification, avec des rôles distincts si plusieurs personnes y ' +
          'travaillent, et une trace des actions sensibles.'}
      </T>
    ),
  },
  {
    titre: 'Des courriels transactionnels réels.',
    corps: (
      <T>
        {'Confirmation, expédition, retour et remboursement partent par un ' +
          'prestataire d’envoi, avec un domaine authentifié pour que les messages ' +
          'arrivent en boîte de réception plutôt qu’en indésirables, et un suivi ' +
          'des envois en échec.'}
      </T>
    ),
  },
  {
    titre: 'Une notification serveur à serveur du prestataire de paiement.',
    corps: (
      <T>
        {'C’est la pièce la plus importante et la moins visible. Le retour du ' +
          'client sur la boutique après paiement n’est pas une preuve de paiement : ' +
          'il peut fermer son onglet, perdre son réseau, revenir par un lien ' +
          'périmé. Le prestataire notifie donc directement le serveur du marchand, ' +
          'message signé à l’appui, et c’est cette notification — vérifiée, et ' +
          'rejouée par le prestataire tant qu’elle n’a pas été acquittée — qui fait ' +
          'passer une commande à l’état payé.'}
      </T>
    ),
  },
  {
    titre: 'Des sauvegardes et une restauration éprouvée.',
    corps: (
      <T>
        {'Sauvegarde régulière de la base et des fichiers, conservation sur une ' +
          'durée décidée, et surtout un essai de restauration : une sauvegarde ' +
          'jamais restaurée n’est pas une sauvegarde.'}
      </T>
    ),
  },
  {
    titre: 'Un nom de domaine et sa messagerie.',
    corps: (
      <T>
        {'Le domaine du marchand, son certificat, ses enregistrements ' +
          'd’authentification de courriel, et les adresses de contact et de service ' +
          'client qui figurent dans les documents légaux.'}
      </T>
    ),
  },
  {
    titre: 'Ce qui reste identique.',
    corps: (
      <T>
        {'Le catalogue, le panier, le calcul des frais de port, le tunnel de ' +
          'commande, les états de commande et les documents légaux : ce que montre ' +
          'cette démonstration est ce qui est livré, non une maquette qu’il ' +
          'faudrait refaire.'}
      </T>
    ),
  },
];

const COLONNES: readonly {
  readonly identifiant: string;
  readonly titre: string;
  readonly entrees: readonly Entree[];
}[] = [
  {
    identifiant: 'fait-vraiment',
    titre: 'Ce que la démonstration fait vraiment',
    entrees: FAIT_VRAIMENT,
  },
  {
    identifiant: 'simule',
    titre: 'Ce qu’elle simule, et le dit',
    entrees: SIMULE,
  },
  {
    identifiant: 'boutique-livree',
    titre: 'Ce que change une boutique livrée',
    entrees: BOUTIQUE_LIVREE,
  },
];

export default function PageAProposDeCetteDemonstration() {
  return (
    <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10">
        <BlocTitre
          surtitre="Démonstration"
          titre="À propos de cette démonstration"
          chapeau={
            <T>
              {'Maison Vaubrune est une épicerie fine fictive. Ce site est une ' +
                'boutique en ligne complète, construite pour être regardée de près : ' +
                'le catalogue, le panier, le calcul des frais de port, le passage de ' +
                'commande et les documents légaux y fonctionnent réellement. Ce qui ne ' +
                'peut pas exister sans marchand réel — l’encaissement, l’expédition, ' +
                'les courriels — est simulé, et le site le dit à l’endroit où cela se ' +
                'produit plutôt que dans une note en bas de page.'}
            </T>
          }
        />
        <p className="panneau mt-6 max-w-lisible text-sm leading-relaxed text-encre-douce">
          <T>
            {'Cette page dresse la frontière exacte entre les trois : ce qui ' +
              'fonctionne, ce qui est simulé, et ce qu’ajoute une boutique livrée à ' +
              'un marchand réel.'}
          </T>
        </p>
      </section>

      {/* Trois colonnes à parts égales sur grand écran, empilées sur mobile.
          `items-start` empêche les trois colonnes de s'étirer à la hauteur de
          la plus longue : chacune s'arrête où son contenu s'arrête, ce qui est
          ce qu'on attend d'une comparaison en colonnes. */}
      <div className="grid items-start gap-x-10 gap-y-12 border-t border-filet pt-10 lg:grid-cols-3">
        {COLONNES.map((colonne) => (
          <section
            key={colonne.identifiant}
            id={colonne.identifiant}
            aria-labelledby={`titre-${colonne.identifiant}`}
            className="panneau scroll-mt-8"
          >
            <h2
              id={`titre-${colonne.identifiant}`}
              className="text-titre text-balance text-encre"
            >
              <T>{colonne.titre}</T>
            </h2>

            <div className="mt-6 space-y-6">
              {colonne.entrees.map((entree) => (
                <p
                  key={entree.titre}
                  className="text-sm leading-relaxed text-encre-douce"
                >
                  <strong className="font-semibold text-encre">
                    <T>{entree.titre}</T>
                  </strong>{' '}
                  {entree.corps}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section
        aria-labelledby="titre-documents"
        className="mt-14 border-t border-filet pt-10"
      >
        <h2 id="titre-documents" className="text-titre text-encre">
          Les documents
        </h2>
        <p className="panneau mt-6 max-w-lisible text-sm leading-relaxed text-encre-douce">
          <T>{'Les quatre documents de vente sont publiés : '}</T>
          <LienLegal vers="/mentions-legales">
            <T>{'mentions légales'}</T>
          </LienLegal>
          <T>{', '}</T>
          <LienLegal vers="/conditions-generales-de-vente">
            <T>{'conditions générales de vente'}</T>
          </LienLegal>
          <T>{', '}</T>
          <LienLegal vers="/donnees-personnelles">
            <T>{'données personnelles'}</T>
          </LienLegal>
          <T>{' et '}</T>
          <LienLegal vers="/retractation">
            <T>{'droit de rétractation'}</T>
          </LienLegal>
          <T>
            {', ce dernier portant le formulaire type de l’annexe R. 221-1, ' +
              'imprimable et téléchargeable.'}
          </T>
        </p>
      </section>
    </div>
  );
}
