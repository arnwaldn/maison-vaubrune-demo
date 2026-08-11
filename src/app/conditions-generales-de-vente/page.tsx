import type { Metadata } from 'next';

import { AComplete } from '@/composants/demonstration/AComplete';
import {
  CLASSE_ARTICLE,
  CLASSE_LISTE,
  CLASSE_SOUS_TITRE,
  CLASSE_TEXTE,
  CLASSE_TITRE_ARTICLE,
  EncadreGabarit,
  EnTeteLegale,
  LienLegal,
  NoteDemonstration,
  SommaireInterne,
  T,
  type EntreeSommaire,
} from '@/composants/legal/PageLegale';
import { CHAMPS } from '@/lib/champs-a-completer';

/**
 * CONDITIONS GÉNÉRALES DE VENTE — quatorze articles, un encadré réglementaire.
 *
 * Reprise du brouillon
 * `contenu/juridique-brouillons/02-conditions-generales-de-vente.md`, prose
 * intacte, onze `<AComplete>`.
 *
 * ---------------------------------------------------------------------------
 * L'ancre `#cgv`
 * ---------------------------------------------------------------------------
 *
 * La page de commande porte, depuis la tranche C4, un lien « conditions
 * générales de vente » qui menait à une ancre `#cgv` de sa propre page, faute
 * de document à ouvrir. Cette page-ci porte donc l'ancre `#cgv` en tête : le
 * lien de `/commande` la vise directement et le visiteur arrive sur le titre du
 * document, pas au milieu d'un article.
 *
 * ---------------------------------------------------------------------------
 * Ce qui n'est PAS écrit ici
 * ---------------------------------------------------------------------------
 *
 * L'article 6.1 ne recopie aucun montant de frais de port : il renvoie à
 * `/livraison`, page ENGENDRÉE depuis le barème du moteur d'expédition. Un
 * tarif recopié dans un contrat se désynchronise du calcul au premier
 * changement, et c'est le contrat qui a raison — donc le marchand qui a tort.
 *
 * L'article 7 ne nomme aucune référence du catalogue : il décrit les 3°, 4° et
 * 5° de l'article L. 221-28 et renvoie au tableau produit par produit de
 * `/retractation`, construit par `regimeRetractation()` (décision D12).
 *
 * Page STATIQUE, INDEXABLE, sans îlot client.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description:
    'Conditions générales de vente de la démonstration Maison Vaubrune : ' +
    'commande, prix, paiement, livraison, rétractation, garanties légales et ' +
    'médiation. Gabarit, à faire relire par un juriste.',
  alternates: { canonical: '/conditions-generales-de-vente' },
};

const SOMMAIRE: readonly EntreeSommaire[] = [
  { ancre: 'article-1', libelle: 'Article 1 — Objet et champ d’application' },
  { ancre: 'article-2', libelle: 'Article 2 — Produits' },
  { ancre: 'article-3', libelle: 'Article 3 — Prix' },
  { ancre: 'article-4', libelle: 'Article 4 — Commande' },
  { ancre: 'article-5', libelle: 'Article 5 — Paiement' },
  { ancre: 'article-6', libelle: 'Article 6 — Livraison' },
  { ancre: 'article-7', libelle: 'Article 7 — Droit de rétractation' },
  { ancre: 'article-8', libelle: 'Article 8 — Retours et remboursement' },
  { ancre: 'article-9', libelle: 'Article 9 — Garanties légales' },
  {
    ancre: 'article-10',
    libelle: 'Article 10 — Réclamations et médiation de la consommation',
  },
  { ancre: 'article-11', libelle: 'Article 11 — Données personnelles' },
  { ancre: 'article-12', libelle: 'Article 12 — Propriété intellectuelle' },
  {
    ancre: 'article-13',
    libelle: 'Article 13 — Droit applicable et langue du contrat',
  },
  { ancre: 'article-14', libelle: 'Article 14 — Archivage et preuve' },
];

/**
 * L'encadré de l'article D. 211-2, reproduit tel quel — voir `EncadreD211()`.
 *
 * texte-reglementaire:debut — encadré prévu par l'article D. 211-2 du code de
 * la consommation. Ce marqueur, refermé après la dernière ligne du tableau,
 * retire ce bloc de l'analyse de `verifier-aucune-donnee-inventee` : le
 * rédacteur juridique avait signalé que « 300 000 euros » et « 10 % » ont la
 * forme de ce qu'une garde de ce type recherche, et jugeait un marquage plus
 * sûr qu'une liste d'exceptions « parce qu'elle ne se périme pas à chaque
 * nouvelle citation » (00-NOTES-INTEGRATION.md, § 5.7). Les nombres présents
 * passeraient d'ailleurs sans lui — un montant suivi d'une unité n'est pas un
 * identifiant, et la garde le sait —, mais la prochaine citation ajoutée ici
 * n'aura pas à être plaidée.
 */
const ENCADRE_D211: readonly string[] = [
  'Le consommateur dispose d’un délai de deux ans à compter de la délivrance du ' +
    'bien pour obtenir la mise en œuvre de la garantie légale de conformité en ' +
    'cas d’apparition d’un défaut de conformité. Durant ce délai, le consommateur ' +
    'n’est tenu d’établir que l’existence du défaut de conformité et non la date ' +
    'd’apparition de celui-ci.',
  'La garantie légale de conformité emporte une obligation de fourniture de ' +
    'toutes les mises à jour nécessaires au maintien de la conformité du bien.',
  'La garantie légale de conformité donne au consommateur droit à la réparation ' +
    'ou au remplacement du bien dans un délai de trente jours suivant sa demande, ' +
    'sans frais et sans inconvénient majeur pour lui.',
  'Si le bien est réparé dans le cadre de la garantie légale de conformité, le ' +
    'consommateur bénéficie d’une extension de six mois de la garantie initiale.',
  'Si le consommateur demande la réparation du bien, mais que le vendeur impose ' +
    'le remplacement, la garantie légale de conformité est renouvelée pour une ' +
    'période de deux ans à compter de la date de remplacement du bien.',
  'Le consommateur peut obtenir une réduction du prix d’achat en conservant le ' +
    'bien ou mettre fin au contrat en se faisant rembourser intégralement contre ' +
    'restitution du bien, si :',
  '1° Le professionnel refuse de réparer ou de remplacer le bien ;',
  '2° La réparation ou le remplacement du bien intervient après un délai de ' +
    'trente jours ;',
  '3° La réparation ou le remplacement du bien occasionne un inconvénient majeur ' +
    'pour le consommateur, notamment lorsque le consommateur supporte ' +
    'définitivement les frais de reprise ou d’enlèvement du bien non conforme, ou ' +
    's’il supporte les frais d’installation du bien réparé ou de remplacement ;',
  '4° La non-conformité du bien persiste en dépit de la tentative de mise en ' +
    'conformité du vendeur restée infructueuse.',
  'Le consommateur a également droit à une réduction du prix du bien ou à la ' +
    'résolution du contrat lorsque le défaut de conformité est si grave qu’il ' +
    'justifie que la réduction du prix ou la résolution du contrat soit ' +
    'immédiate. Le consommateur n’est alors pas tenu de demander la réparation ou ' +
    'le remplacement du bien au préalable.',
  'Le consommateur n’a pas droit à la résolution de la vente si le défaut de ' +
    'conformité est mineur.',
  'Toute période d’immobilisation du bien en vue de sa réparation ou de son ' +
    'remplacement suspend la garantie qui restait à courir jusqu’à la délivrance ' +
    'du bien remis en état.',
  'Les droits mentionnés ci-dessus résultent de l’application des articles ' +
    'L. 217-1 à L. 217-32 du code de la consommation.',
  'Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie ' +
    'légale de conformité encourt une amende civile d’un montant maximal de ' +
    '300 000 euros, qui peut être porté jusqu’à 10 % du chiffre d’affaires moyen ' +
    'annuel (article L. 241-5 du code de la consommation).',
  'Le consommateur bénéficie également de la garantie légale des vices cachés en ' +
    'application des articles 1641 à 1649 du code civil, pendant une durée de ' +
    'deux ans à compter de la découverte du défaut. Cette garantie donne droit à ' +
    'une réduction de prix si le bien est conservé ou à un remboursement intégral ' +
    'contre restitution du bien.',
];
/* texte-reglementaire:fin */

export default function PageConditionsGeneralesDeVente() {
  return (
    <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <EnTeteLegale
        identifiant="cgv"
        surtitre="Document légal"
        titre="Conditions générales de vente"
        chapeau={
          'Le contrat que passerait une boutique réelle vendant les mêmes ' +
          'produits, avec les mêmes règles d’expédition et le même prestataire ' +
          'de paiement.'
        }
      />

      <EncadreGabarit
        gabarit={
          <T>
            {'Ce document est un gabarit. Les emplacements surlignés sont ceux ' +
              'que remplit le marchand ; sa relecture par un juriste reste la ' +
              'sienne.'}
          </T>
        }
        fiction={
          <>
            <T>{'Maison Vaubrune est une épicerie fine '}</T>
            <strong className="font-semibold">fictive</strong>
            <T>{' et ce site est une '}</T>
            <strong className="font-semibold">démonstration</strong>
            <T>
              {' : aucune vente n’y est conclue, aucun paiement n’y est encaissé, ' +
                'aucune commande n’y est expédiée. Les articles qui suivent ' +
                'décrivent le contrat que passerait une boutique réelle vendant ' +
                'les mêmes produits, avec les mêmes règles d’expédition et le ' +
                'même prestataire de paiement.'}
            </T>
          </>
        }
      />

      <p className="panneau mt-6 max-w-lisible text-sm leading-relaxed text-encre-douce">
        <T>{'Version : '}</T>
        <AComplete champ="date de la version des conditions générales de vente" />
      </p>

      <SommaireInterne
        titre="Les quatorze articles"
        identifiant="titre-sommaire"
        entrees={SOMMAIRE}
      />

      {/* Article 1 ------------------------------------------------------- */}
      <section id="article-1" className={CLASSE_ARTICLE} aria-labelledby="titre-article-1">
        <h2 id="titre-article-1" className={CLASSE_TITRE_ARTICLE}>
          Article 1 — Objet et champ d’application
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les présentes conditions générales de vente régissent la vente de ' +
              'produits alimentaires d’épicerie fine, conclue à distance par voie ' +
              'électronique, entre '}
          </T>
          <AComplete champ={CHAMPS.PROFESSIONNEL} />
          <T>
            {' (le vendeur) et toute personne physique agissant à des fins qui ' +
              'n’entrent pas dans le cadre de son activité commerciale, ' +
              'industrielle, artisanale, libérale ou agricole (le client, ' +
              'consommateur au sens du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Elles s’appliquent à l’exclusion de toute autre condition. Le client ' +
              'en prend connaissance avant de passer commande et les accepte ' +
              'expressément lors de la validation de celle-ci. Le vendeur peut les ' +
              'modifier à tout moment ; les conditions applicables à une commande ' +
              'sont celles en vigueur au jour de sa validation, et la version ' +
              'applicable est archivée avec la commande.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'L’identité et les coordonnées du vendeur figurent dans les '}</T>
          <LienLegal vers="/mentions-legales">
            <T>{'mentions légales'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>
      </section>

      {/* Article 2 ------------------------------------------------------- */}
      <section id="article-2" className={CLASSE_ARTICLE} aria-labelledby="titre-article-2">
        <h2 id="titre-article-2" className={CLASSE_TITRE_ARTICLE}>
          Article 2 — Produits
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les produits proposés sont ceux qui figurent au catalogue du site au ' +
              'moment de la consultation, dans la limite des stocks disponibles. ' +
              'Chaque fiche produit présente les caractéristiques essentielles du ' +
              'produit : composition, allergènes, format, poids, origine, mode de ' +
              'conservation et durée de vie.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les illustrations ont une valeur d’ambiance : ce sont des dessins ' +
              'vectoriels, non des photographies du produit livré. Les variations ' +
              'naturelles propres à des denrées artisanales (teinte, texture, ' +
              'dépôt) ne constituent pas un défaut de conformité.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les produits vendus sont des denrées alimentaires. Les indications ' +
              'de durée de vie s’entendent au sens de la réglementation ' +
              'applicable : date limite de consommation pour les denrées ' +
              'microbiologiquement très périssables, date de durabilité minimale ' +
              'pour les autres.'}
          </T>
        </p>
      </section>

      {/* Article 3 ------------------------------------------------------- */}
      <section id="article-3" className={CLASSE_ARTICLE} aria-labelledby="titre-article-3">
        <h2 id="titre-article-3" className={CLASSE_TITRE_ARTICLE}>
          Article 3 — Prix
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les prix sont indiqués en euros, toutes taxes comprises, hors frais ' +
              'de livraison. Les frais de livraison sont calculés et affichés ' +
              'avant la validation du paiement, selon le barème détaillé à la page '}
          </T>
          <LienLegal vers="/livraison">
            <T>{'Livraison'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Régime et taux de taxe sur la valeur ajoutée applicables : '}</T>
          <AComplete champ="régime et taux de TVA, arrêtés avec votre expert-comptable" />
          <T>
            {'. Le montant total dû par le client, ventilé entre le prix des ' +
              'produits et les frais de livraison, lui est présenté avant qu’il ne ' +
              'valide sa commande.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le vendeur peut modifier ses prix à tout moment ; le prix applicable ' +
              'à une commande est celui affiché au moment de sa validation.'}
          </T>
        </p>

        <NoteDemonstration>
          <T>
            {'Les prix du catalogue sont stockés en centimes et aucun d’eux n’est ' +
              'obtenu par un calcul en virgule flottante. Aucune ventilation de ' +
              'taxe n’est affichée tant que l’emplacement ci-dessus n’est pas ' +
              'rempli.'}
          </T>
        </NoteDemonstration>
      </section>

      {/* Article 4 ------------------------------------------------------- */}
      <section id="article-4" className={CLASSE_ARTICLE} aria-labelledby="titre-article-4">
        <h2 id="titre-article-4" className={CLASSE_TITRE_ARTICLE}>
          Article 4 — Commande
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La commande se déroule en quatre temps : constitution du panier, ' +
              'saisie de l’adresse de livraison, affichage du récapitulatif, ' +
              'paiement.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Avant la validation, le client dispose d’un récapitulatif reprenant ' +
              'les produits commandés, leur quantité, leur prix unitaire, les ' +
              'frais de livraison, le montant total à payer et l’adresse de ' +
              'livraison. Il peut corriger chacun de ces éléments avant de valider. ' +
              'Ce rappel des informations avant la commande relève de l’article ' +
              'L. 221-14 du code de la consommation.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Le bouton qui valide la commande porte la mention '}</T>
          <strong className="font-semibold text-encre">
            <T>{'Commander avec obligation de paiement'}</T>
          </strong>
          <T>
            {'. La commande n’est ferme qu’une fois cette validation effectuée et ' +
              'le paiement accepté ; le contrat est alors formé.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le vendeur peut refuser une commande pour un motif légitime, ' +
              'notamment en cas de rupture de stock, d’adresse de livraison située ' +
              'hors des zones desservies, ou d’incident de paiement antérieur non ' +
              'réglé.'}
          </T>
        </p>

        <NoteDemonstration>
          <T>
            {'La commande est enregistrée dans le navigateur du visiteur et nulle ' +
              'part ailleurs. Elle n’engage personne et ne donne lieu à aucune ' +
              'expédition.'}
          </T>
        </NoteDemonstration>
      </section>

      {/* Article 5 ------------------------------------------------------- */}
      <section id="article-5" className={CLASSE_ARTICLE} aria-labelledby="titre-article-5">
        <h2 id="titre-article-5" className={CLASSE_TITRE_ARTICLE}>
          Article 5 — Paiement
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>{'Le paiement s’effectue au comptant, à la commande.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client est redirigé vers la page de paiement hébergée par un ' +
              'prestataire de services de paiement agréé, '}
          </T>
          <AComplete champ={CHAMPS.PRESTATAIRE_PAIEMENT} />
          <T>
            {'. Il y saisit ses données de carte et revient ensuite sur le site.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'En conséquence de ce fonctionnement :'}</T>
        </p>

        <ul className={CLASSE_LISTE}>
          <li>
            <T>
              {'aucune donnée de carte bancaire ne transite par le site ni n’y est ' +
                'enregistrée ;'}
            </T>
          </li>
          <li>
            <T>
              {'le site reçoit du prestataire le seul résultat de la transaction, ' +
                'ainsi que les éléments nécessaires au suivi de la commande ;'}
            </T>
          </li>
          <li>
            <T>
              {'la sécurité de l’authentification du porteur est assurée par le ' +
                'prestataire et par la banque émettrice.'}
            </T>
          </li>
        </ul>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La commande n’est traitée qu’après confirmation du paiement par le ' +
              'prestataire.'}
          </T>
        </p>

        <NoteDemonstration>
          <T>
            {'Le paiement s’exécute en mode test chez le prestataire, ou par un ' +
              'écran de simulation qui s’annonce comme tel. Aucune somme n’est ' +
              'débitée, aucun encaissement n’a lieu.'}
          </T>
        </NoteDemonstration>
      </section>

      {/* Article 6 ------------------------------------------------------- */}
      <section id="article-6" className={CLASSE_ARTICLE} aria-labelledby="titre-article-6">
        <h2 id="titre-article-6" className={CLASSE_TITRE_ARTICLE}>
          Article 6 — Livraison
        </h2>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'6.1 Zones desservies'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les zones desservies, les transporteurs, les délais indicatifs et le ' +
              'barème des frais de port figurent à la page '}
          </T>
          <LienLegal vers="/livraison">
            <T>{'Livraison'}</T>
          </LienLegal>
          <T>
            {'. Cette page est produite à partir du barème effectivement appliqué ' +
              'par le site : elle et le calcul du panier ne peuvent pas diverger.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <strong className="font-semibold text-encre">
            <T>{'Denrées périssables.'}</T>
          </strong>{' '}
          <T>
            {'Les produits expédiés sous température dirigée ne sont livrés qu’en ' +
              'France métropolitaine. Une commande contenant un tel produit et ' +
              'destinée à une autre zone est refusée à l’étape du calcul des frais ' +
              'de port, avec l’indication du produit en cause. Le client peut ' +
              'retirer ce produit de son panier pour poursuivre, ou passer une ' +
              'commande séparée pour une adresse de livraison métropolitaine.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'6.2 Délais'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le vendeur livre le bien à la date ou dans le délai indiqué au client ' +
              'avant la conclusion du contrat. À défaut d’indication, la livraison ' +
              'intervient sans retard injustifié et au plus tard trente jours après ' +
              'la conclusion du contrat (article L. 216-1 du code de la ' +
              'consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'En cas de manquement du vendeur à son obligation de livraison, le ' +
              'client peut, dans les conditions et selon les formes prévues aux ' +
              'articles L. 216-6 et L. 216-7 du code de la consommation, résoudre ' +
              'le contrat et obtenir le remboursement des sommes versées.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'6.3 Réception'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le transfert des risques de perte ou d’endommagement des biens ' +
              'intervient au moment où le client prend physiquement possession du ' +
              'bien (article L. 216-4 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client est invité à vérifier l’état du colis à sa réception et à ' +
              'signaler au vendeur, dans les meilleurs délais, toute avarie ' +
              'constatée, avec les éléments permettant de la constater.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le vendeur est responsable de plein droit, à l’égard du client, de la ' +
              'bonne exécution des obligations résultant du contrat conclu à ' +
              'distance, que ces obligations soient exécutées par lui-même ou par ' +
              'd’autres prestataires (article L. 221-15 du code de la ' +
              'consommation).'}
          </T>
        </p>

        <NoteDemonstration>
          <T>
            {'Aucun colis n’est expédié. Le suivi de commande fait défiler les ' +
              'états d’une expédition réelle sur des données locales.'}
          </T>
        </NoteDemonstration>
      </section>

      {/* Article 7 ------------------------------------------------------- */}
      <section id="article-7" className={CLASSE_ARTICLE} aria-labelledby="titre-article-7">
        <h2 id="titre-article-7" className={CLASSE_TITRE_ARTICLE}>
          Article 7 — Droit de rétractation
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client dispose d’un délai de quatorze jours pour exercer son droit ' +
              'de rétractation, sans avoir à motiver sa décision ni à supporter ' +
              'd’autres coûts que ceux prévus par la loi (article L. 221-18 du code ' +
              'de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le délai court à compter du jour de la réception du bien par le ' +
              'client ou par un tiers qu’il a désigné. Pour une commande de ' +
              'plusieurs biens livrés séparément, ou d’un bien livré en plusieurs ' +
              'lots, il court à compter de la réception du dernier bien ou lot ' +
              '(article L. 221-19 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La rétractation s’exerce au moyen du formulaire type reproduit à la ' +
              'page '}
          </T>
          <LienLegal vers="/retractation#formulaire">
            <T>{'Rétractation'}</T>
          </LienLegal>
          <T>
            {', ou de toute autre déclaration dénuée d’ambiguïté exprimant la ' +
              'volonté de se rétracter (article L. 221-21 du code de la ' +
              'consommation). La charge de la preuve de l’exercice du droit de ' +
              'rétractation pèse sur le client (article L. 221-22 du code de la ' +
              'consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <strong className="font-semibold text-encre">
            <T>{'Exceptions.'}</T>
          </strong>{' '}
          <T>
            {'Certains produits du catalogue n’ouvrent pas droit à rétractation, ou ' +
              'cessent d’y ouvrir droit une fois descellés. Les motifs applicables ' +
              'sont ceux de l’article L. 221-28 du code de la consommation : les ' +
              'biens confectionnés selon les spécifications du client ou nettement ' +
              'personnalisés (3°), les biens susceptibles de se détériorer ou de se ' +
              'périmer rapidement (4°), et les biens scellés qui ne peuvent être ' +
              'renvoyés pour des raisons de protection de la santé ou d’hygiène et ' +
              'qui ont été descellés après la livraison (5°).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Le détail produit par produit figure à la page '}</T>
          <LienLegal vers="/retractation">
            <T>{'Rétractation'}</T>
          </LienLegal>
          <T>
            {' et sur chaque fiche produit. Il est établi à partir du catalogue ' +
              'lui-même, de sorte qu’aucune référence ne puisse être annoncée dans ' +
              'un régime et vendue dans un autre.'}
          </T>
        </p>
      </section>

      {/* Article 8 ------------------------------------------------------- */}
      <section id="article-8" className={CLASSE_ARTICLE} aria-labelledby="titre-article-8">
        <h2 id="titre-article-8" className={CLASSE_TITRE_ARTICLE}>
          Article 8 — Retours et remboursement
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Lorsque le droit de rétractation est exercé, le client renvoie les ' +
              'biens au plus tard quatorze jours après avoir communiqué sa ' +
              'décision. Il supporte les coûts directs de renvoi, sauf si le ' +
              'vendeur accepte de les prendre à sa charge ou s’il a omis d’en ' +
              'informer le client (article L. 221-23 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Prise en charge des frais de renvoi par le vendeur : '}</T>
          <AComplete champ={CHAMPS.FRAIS_RENVOI} />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Adresse de renvoi des produits : '}</T>
          <AComplete champ={CHAMPS.ADRESSE_RENVOI} />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La responsabilité du client peut être engagée en cas de dépréciation ' +
              'des biens résultant de manipulations autres que celles nécessaires ' +
              'pour établir leur nature, leurs caractéristiques et leur bon ' +
              'fonctionnement.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le vendeur rembourse la totalité des sommes versées, y compris les ' +
              'frais de livraison, au plus tard quatorze jours à compter de la date ' +
              'à laquelle il est informé de la décision de rétractation. Il peut ' +
              'différer le remboursement jusqu’à récupération des biens ou jusqu’à ' +
              'ce que le client ait fourni une preuve de leur expédition, la date ' +
              'retenue étant celle du premier de ces faits. Le remboursement ' +
              's’effectue par le même moyen de paiement que celui utilisé pour la ' +
              'transaction initiale, sauf accord exprès du client pour un autre ' +
              'moyen et sans frais pour lui. Lorsque le client a choisi un mode de ' +
              'livraison plus coûteux que le mode standard proposé, les frais de ' +
              'livraison sont remboursés sur la base du mode standard. Ces règles ' +
              'sont celles de l’article L. 221-24 du code de la consommation.'}
          </T>
        </p>

        <NoteDemonstration>
          <T>
            {'Aucun remboursement n’est exécuté. Le parcours de rétractation fait ' +
              'évoluer l’état de la commande dans le navigateur et affiche les ' +
              'courriels qu’une boutique livrée aurait envoyés.'}
          </T>
        </NoteDemonstration>
      </section>

      {/* Article 9 ------------------------------------------------------- */}
      <section id="article-9" className={CLASSE_ARTICLE} aria-labelledby="titre-article-9">
        <h2 id="titre-article-9" className={CLASSE_TITRE_ARTICLE}>
          Article 9 — Garanties légales
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client bénéficie de la garantie légale de conformité (articles ' +
              'L. 217-3 et suivants du code de la consommation), qui oblige le ' +
              'vendeur à délivrer un bien conforme au contrat et à répondre des ' +
              'défauts de conformité existant lors de la délivrance, ainsi que de ' +
              'la garantie légale des vices cachés (articles 1641 et suivants du ' +
              'code civil), qui joue lorsque le bien est affecté d’un défaut caché ' +
              'le rendant impropre à l’usage auquel on le destine.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ces garanties sont indépendantes de toute garantie commerciale et ' +
              's’exercent sans frais pour le client.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Demande à adresser à : '}</T>
          <AComplete champ="adresse postale et adresse de courrier électronique du service chargé des garanties" />
          <T>{'.'}</T>
        </p>

        <EncadreD211 />
      </section>

      {/* Article 10 ------------------------------------------------------ */}
      <section id="article-10" className={CLASSE_ARTICLE} aria-labelledby="titre-article-10">
        <h2 id="titre-article-10" className={CLASSE_TITRE_ARTICLE}>
          Article 10 — Réclamations et médiation de la consommation
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Toute réclamation est adressée en premier lieu au service client, ' +
              'dont les coordonnées figurent dans les '}
          </T>
          <LienLegal vers="/mentions-legales">
            <T>{'mentions légales'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Si la réclamation n’a pas trouvé de solution dans un délai ' +
              'raisonnable, le client peut recourir gratuitement à un médiateur de ' +
              'la consommation en vue de la résolution amiable du litige (articles ' +
              'L. 611-1 et L. 612-1 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Médiateur de la consommation dont relève le vendeur : '}</T>
        </p>
        <ul className="mt-3 max-w-lisible space-y-2 text-sm leading-relaxed text-encre-douce">
          <li>
            <AComplete champ="médiateur de la consommation choisi" />
          </li>
          <li>
            <AComplete champ="adresse postale du médiateur" />
          </li>
          <li>
            <AComplete champ="adresse du site du médiateur pour la saisine en ligne" />
          </li>
        </ul>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le recours au médiateur suppose que le client ait préalablement tenté ' +
              'de résoudre le litige directement auprès du vendeur par une ' +
              'réclamation écrite. L’information du consommateur sur le médiateur ' +
              'compétent relève des articles L. 616-1 et R. 616-1 du code de la ' +
              'consommation.'}
          </T>
        </p>
      </section>

      {/* Article 11 ------------------------------------------------------ */}
      <section id="article-11" className={CLASSE_ARTICLE} aria-labelledby="titre-article-11">
        <h2 id="titre-article-11" className={CLASSE_TITRE_ARTICLE}>
          Article 11 — Données personnelles
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>{'Le traitement des données du client est décrit à la page '}</T>
          <LienLegal vers="/donnees-personnelles">
            <T>{'Données personnelles'}</T>
          </LienLegal>
          <T>
            {', qui précise ce que la démonstration ne collecte pas et ce qu’une ' +
              'boutique livrée traite nécessairement pour honorer une commande.'}
          </T>
        </p>
      </section>

      {/* Article 12 ------------------------------------------------------ */}
      <section id="article-12" className={CLASSE_ARTICLE} aria-labelledby="titre-article-12">
        <h2 id="titre-article-12" className={CLASSE_TITRE_ARTICLE}>
          Article 12 — Propriété intellectuelle
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les textes, illustrations et éléments graphiques du site sont ' +
              'protégés par le code de la propriété intellectuelle. Toute ' +
              'reproduction ou représentation, en tout ou partie, sans autorisation ' +
              'écrite du titulaire des droits, est interdite.'}
          </T>
        </p>
      </section>

      {/* Article 13 ------------------------------------------------------ */}
      <section id="article-13" className={CLASSE_ARTICLE} aria-labelledby="titre-article-13">
        <h2 id="titre-article-13" className={CLASSE_TITRE_ARTICLE}>
          Article 13 — Droit applicable et langue du contrat
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les présentes conditions générales de vente sont soumises au droit ' +
              'français. La langue du contrat est le français.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les dispositions qui précèdent ne privent pas le consommateur ' +
              'résidant dans un autre État membre de l’Union européenne de la ' +
              'protection que lui assurent les dispositions impératives de la loi ' +
              'de son pays de résidence habituelle.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'En cas de litige, et à défaut de résolution amiable, les tribunaux ' +
              'territorialement compétents sont déterminés selon les règles de ' +
              'droit commun, le consommateur conservant la faculté de saisir la ' +
              'juridiction du lieu où il demeurait au moment de la conclusion du ' +
              'contrat ou de la survenance du fait dommageable.'}
          </T>
        </p>
      </section>

      {/* Article 14 ------------------------------------------------------ */}
      <section id="article-14" className={CLASSE_ARTICLE} aria-labelledby="titre-article-14">
        <h2 id="titre-article-14" className={CLASSE_TITRE_ARTICLE}>
          Article 14 — Archivage et preuve
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les commandes sont archivées par le vendeur dans les conditions ' +
              'prévues par l’article L. 213-1 du code de la consommation pour les ' +
              'contrats conclus par voie électronique au-delà d’un certain montant, ' +
              'et restent accessibles au client sur demande.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Durée et modalités d’archivage retenues : '}</T>
          <AComplete champ="durée de conservation des contrats et modalités d’accès du client à son contrat archivé" />
          <T>{'.'}</T>
        </p>

        <NoteDemonstration>
          <T>
            {'Aucun contrat n’est archivé, puisque aucune vente n’est conclue. Les ' +
              'commandes d’essai vivent dans le navigateur du visiteur et peuvent ' +
              'être exportées au format JSON depuis la page de suivi.'}
          </T>
        </NoteDemonstration>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* L'encadré réglementaire de l'article D. 211-2                               */
/* -------------------------------------------------------------------------- */

/**
 * L'encadré de l'article D. 211-2 du code de la consommation, reproduit tel quel.
 *
 * C'est un TEXTE RÉGLEMENTAIRE destiné à être reproduit : il n'est ni résumé,
 * ni reformulé, ni élagué. Deux conséquences visibles ici :
 *
 * 1. La phrase sur « la fourniture de toutes les mises à jour nécessaires au
 *    maintien de la conformité du bien » n'a aucun sens pour un pot de miel.
 *    Elle est CONSERVÉE : un rédacteur qui élague un texte réglementaire
 *    l'altère. Le rédacteur juridique a versé le point au dossier des doutes à
 *    soumettre au juriste (00-NOTES-INTEGRATION.md, § 4.1), il n'est pas
 *    tranché ici.
 * 2. Ses deux nombres — « 300 000 euros » et « 10 % » — sont exactement le
 *    genre de chaîne qu'une garde « aucune donnée inventée » prend pour un
 *    identifiant. Ce bloc est donc balisé DEUX FOIS, pour deux lecteurs
 *    différents : l'attribut `data-texte-reglementaire` ci-dessous le déclare
 *    dans le document rendu, à l'usage de qui inspecte la page ; et la paire
 *    de marqueurs qui encadre la constante `ENCADRE_D211` le retire de
 *    l'analyse de la garde. Le second est celui que le script lit — le premier
 *    ne dit rien à personne d'autre qu'un humain.
 *
 *    Ces marqueurs ne s'écrivent PAS en prose, ici ou ailleurs : le script les
 *    cherche par leur texte, une mention dans un commentaire compterait pour
 *    une ouverture réelle. C'est arrivé pendant l'écriture de cette page, et
 *    c'est le contrôle de déséquilibre de la garde qui l'a dit.
 *
 * La mise en forme (bordure franche, fond distinct, ouverture et fermeture
 * annoncées) sert une seule chose : qu'on voie où le texte officiel commence et
 * où il s'arrête.
 */
function EncadreD211() {
  return (
    <section
      aria-labelledby="titre-encadre-d211"
      data-texte-reglementaire="D. 211-2 du code de la consommation"
      className="mt-8 overflow-hidden rounded-sm border-2 border-encre-douce/40 bg-papier"
    >
      <h3
        id="titre-encadre-d211"
        className="etiquette border-b border-encre-douce/30 px-5 py-2.5 text-encre sm:px-7"
      >
        Encadré réglementaire
      </h3>

      <div className="px-5 py-6 sm:px-7">
        <p className="max-w-lisible border-l-2 border-ocre-clair pl-4 text-xs leading-relaxed text-encre-douce">
          <T>
            {'Le texte qui suit est celui de l’encadré prévu par l’article ' +
              'D. 211-2 du code de la consommation. Il s’agit d’un texte ' +
              'réglementaire destiné à être reproduit tel quel : il n’est ni ' +
              'résumé ni reformulé.'}
          </T>
        </p>

        {ENCADRE_D211.map((paragraphe) => (
          <p
            key={paragraphe.slice(0, 40)}
            className="mt-4 max-w-lisible text-sm leading-relaxed text-encre"
          >
            <T>{paragraphe}</T>
          </p>
        ))}

        <p className="mt-6 text-xs text-encre-douce italic">
          <T>{'Fin de l’encadré réglementaire.'}</T>
        </p>
      </div>
    </section>
  );
}
