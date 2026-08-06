import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AComplete } from '@/composants/demonstration/AComplete';
import { CadreDefilant } from '@/composants/legal/CadreDefilant';
import {
  CLASSE_ARTICLE,
  CLASSE_LISTE,
  CLASSE_SOUS_TITRE,
  CLASSE_TEXTE,
  CLASSE_TITRE_ARTICLE,
  EncadreGabarit,
  EnTeteLegale,
  LienLegal,
  T,
  TableauGabarit,
  type LigneGabarit,
} from '@/composants/legal/PageLegale';
import { CHAMPS } from '@/lib/champs-a-completer';

/**
 * DONNÉES PERSONNELLES — une page en deux moitiés qui ne se ressemblent pas.
 *
 * Reprise du brouillon `contenu/juridique-brouillons/03-donnees-personnelles.md`,
 * quarante et un `<AComplete>`, tous dans la seconde moitié.
 *
 * La partie 1 décrit un FAIT VÉRIFIABLE du site : aucun compte, aucune base,
 * aucun cookie, aucun courriel. Elle ne comporte aucun emplacement parce qu'il
 * n'y a rien à compléter — c'est le seul document du lot dont la première
 * moitié est écrite en dur. La partie 2 est un gabarit intégral.
 *
 * ---------------------------------------------------------------------------
 * ÉCART DE PROSE ASSUMÉ — le point 1.4
 * ---------------------------------------------------------------------------
 *
 * Le rédacteur juridique a demandé que le point 1.4 soit VÉRIFIÉ contre
 * l'implémentation réelle à l'intégration (00-NOTES-INTEGRATION.md, § 5.1),
 * en écrivant que « si le prestataire collecte lui-même une adresse, la phrase
 * doit changer ». Vérification faite dans `src/lib/paiement/stripe.ts` :
 *
 * - le corps envoyé à la route de paiement ne contient QUE des SKU, des
 *   quantités, une zone et un total (`src/lib/paiement/validation.ts`) — ni
 *   nom, ni adresse, ni courriel ;
 * - la session ouverte chez le prestataire porte les lignes recalculées, le
 *   montant des frais de port, la référence de commande et les adresses de
 *   retour ;
 * - mais elle porte AUSSI `shipping_address_collection` limitée à la France :
 *   c'est le prestataire qui demande lui-même l'adresse de livraison, sur ses
 *   pages, et il collecte une adresse de courrier électronique pour son reçu.
 *
 * Un paragraphe a donc été AJOUTÉ au point 1.4 pour le dire. S'en tenir à la
 * phrase d'origine aurait produit une page « données personnelles » plus
 * optimiste que le code — exactement le défaut que cette démonstration
 * prétend éviter.
 *
 * Page STATIQUE, INDEXABLE, sans îlot client.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Données personnelles',
  description:
    'Données personnelles sur la démonstration Maison Vaubrune : ce que le ' +
    'site ne collecte pas (aucun compte, aucune base, aucun cookie de suivi) ' +
    'et le gabarit de ce qu’une boutique livrée traite.',
  alternates: { canonical: '/donnees-personnelles' },
};

/* -------------------------------------------------------------------------- */
/* Données des tableaux                                                        */
/* -------------------------------------------------------------------------- */

/** 1.3 — ce qui est écrit dans le navigateur du visiteur. Aucun emplacement. */
const STOCKAGE_LOCAL: readonly {
  readonly quoi: string;
  readonly pourquoi: string;
  readonly ou: string;
}[] = [
  {
    quoi: 'Le panier en cours',
    pourquoi:
      'Retrouver sa sélection d’une page à l’autre et d’une visite à l’autre',
    ou: 'Navigateur du visiteur',
  },
  {
    quoi: 'Les commandes d’essai et leur état',
    pourquoi: 'Faire fonctionner le suivi de commande sans serveur',
    ou: 'Navigateur du visiteur',
  },
  {
    quoi: 'Les modifications du catalogue faites depuis l’espace marchand de démonstration',
    pourquoi: 'Montrer qu’un marchand tient son catalogue lui-même',
    ou: 'Navigateur du visiteur',
  },
];

const RESPONSABLE: readonly LigneGabarit[] = [
  {
    intitule: 'Responsable de traitement',
    valeur: <AComplete champ={CHAMPS.PROFESSIONNEL} />,
  },
  { intitule: 'Adresse', valeur: <AComplete champ={CHAMPS.SIEGE} /> },
  {
    intitule: 'Contact pour les questions de données personnelles',
    valeur: (
      <AComplete champ="adresse de courrier électronique dédiée aux demandes relatives aux données personnelles" />
    ),
  },
  {
    intitule: 'Délégué à la protection des données, s’il en existe un',
    valeur: (
      <AComplete champ="identité et coordonnées du délégué à la protection des données, ou mention de son absence" />
    ),
  },
];

/**
 * 2.2 — quatre colonnes.
 *
 * Les cellules sont écrites en JSX plutôt qu'en libellés, pour la même raison
 * que les tableaux à deux colonnes : la garde compte les `<AComplete>` de ce
 * fichier, et le décompte doit être celui des emplacements réellement
 * affichés. Six des sept bases légales sont ÉCRITES (elles se déduisent de la
 * finalité, ce n'est pas au marchand de les choisir) ; seule celle de la mesure
 * d'audience est un emplacement, parce qu'elle dépend de l'outil retenu.
 */
const TRAITEMENTS: readonly {
  readonly finalite: string;
  readonly donnees: ReactNode;
  readonly base: ReactNode;
  readonly duree: ReactNode;
}[] = [
  {
    finalite: 'Traiter et livrer la commande',
    donnees: <AComplete champ="catégories de données de commande collectées" />,
    base: <T>{'Exécution du contrat'}</T>,
    duree: <AComplete champ="durée de conservation des données de commande" />,
  },
  {
    finalite: 'Encaisser le paiement',
    donnees: <AComplete champ="données transmises au prestataire de paiement" />,
    base: <T>{'Exécution du contrat'}</T>,
    duree: <AComplete champ="durée de conservation des données de paiement" />,
  },
  {
    finalite: 'Établir et conserver les pièces comptables',
    donnees: <AComplete champ="données figurant sur les factures" />,
    base: <T>{'Obligation légale'}</T>,
    duree: <AComplete champ="durée légale de conservation comptable retenue" />,
  },
  {
    finalite: 'Gérer les réclamations, retours et garanties',
    donnees: <AComplete champ="données de réclamation" />,
    base: <T>{'Exécution du contrat et intérêt légitime'}</T>,
    duree: <AComplete champ="durée de conservation des dossiers de réclamation" />,
  },
  {
    finalite: 'Gérer le compte client, s’il en existe un',
    donnees: <AComplete champ="données de compte" />,
    base: <T>{'Exécution du contrat'}</T>,
    duree: <AComplete champ="durée de conservation du compte inactif" />,
  },
  {
    finalite: 'Envoyer une lettre d’information, si elle existe',
    donnees: <AComplete champ="données de prospection" />,
    base: <T>{'Consentement'}</T>,
    duree: (
      <AComplete champ="durée de conservation des consentements de prospection" />
    ),
  },
  {
    finalite: 'Mesurer l’audience, si une mesure est mise en place',
    donnees: <AComplete champ="outil de mesure retenu et données collectées" />,
    base: <AComplete champ="base légale retenue pour la mesure d’audience" />,
    duree: <AComplete champ="durée de conservation des données de mesure" />,
  },
];

/** 2.3 — cinq destinataires, trois emplacements chacun. */
const DESTINATAIRES: readonly {
  readonly role: string;
  readonly prestataire: ReactNode;
  readonly recoit: ReactNode;
  readonly localisation: ReactNode;
}[] = [
  {
    role: 'Hébergement',
    prestataire: <AComplete champ={CHAMPS.HEBERGEUR} />,
    recoit: <AComplete champ="données hébergées" />,
    localisation: <AComplete champ="pays d’hébergement" />,
  },
  {
    role: 'Paiement',
    prestataire: <AComplete champ={CHAMPS.PRESTATAIRE_PAIEMENT} />,
    recoit: <AComplete champ="données transmises pour le paiement" />,
    localisation: (
      <AComplete champ="pays de traitement du prestataire de paiement" />
    ),
  },
  {
    role: 'Transport',
    prestataire: <AComplete champ="transporteurs" />,
    recoit: <AComplete champ="données transmises au transporteur" />,
    localisation: <AComplete champ="pays de traitement du transporteur" />,
  },
  {
    role: 'Envoi des courriels transactionnels',
    prestataire: <AComplete champ="prestataire d’envoi de courriels" />,
    recoit: <AComplete champ="données transmises pour l’envoi" />,
    localisation: (
      <AComplete champ="pays de traitement du prestataire de courriels" />
    ),
  },
  {
    role: 'Comptabilité',
    prestataire: <AComplete champ="cabinet ou outil comptable" />,
    recoit: <AComplete champ="données transmises à la comptabilité" />,
    localisation: <AComplete champ="pays de traitement" />,
  },
];

const EXERCICE_DES_DROITS: readonly LigneGabarit[] = [
  {
    intitule: 'Adresse d’exercice des droits',
    valeur: (
      <AComplete champ="adresse de courrier électronique ou postale pour l’exercice des droits" />
    ),
  },
  {
    intitule: 'Justificatif demandé, le cas échéant',
    valeur: (
      <AComplete champ="pièces demandées pour vérifier l’identité du demandeur" />
    ),
  },
  {
    intitule: 'Délai de réponse annoncé',
    valeur: (
      <AComplete champ="délai de réponse annoncé, dans la limite du délai réglementaire" />
    ),
  },
];

const CLASSE_CELLULE_ENTETE = 'pb-2 pr-6 text-left font-semibold text-encre';
const CLASSE_CELLULE = 'py-3 pr-6 align-baseline text-encre-douce';

export default function PageDonneesPersonnelles() {
  return (
    <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <EnTeteLegale
        surtitre="Document légal"
        titre="Données personnelles"
        chapeau={
          'Ce que cette démonstration collecte — rien — et le gabarit de ce ' +
          'qu’une boutique qui vend réellement doit traiter pour honorer une ' +
          'commande.'
        }
      />

      <EncadreGabarit
        gabarit={
          <T>
            {'Ce document est un gabarit pour sa seconde moitié. La première ' +
              'moitié décrit le fonctionnement réel de cette démonstration et ne ' +
              'comporte aucun emplacement à remplir. Les emplacements surlignés ' +
              'de la seconde moitié sont ceux que remplit le marchand ; sa ' +
              'relecture par un juriste reste la sienne.'}
          </T>
        }
        fiction={
          <>
            <T>{'Maison Vaubrune est une épicerie fine '}</T>
            <strong className="font-semibold">fictive</strong>
            <T>{' et ce site est une '}</T>
            <strong className="font-semibold">démonstration</strong>
            <T>{'.'}</T>
          </>
        }
      />

      {/* ==================== PARTIE 1 ==================== */}
      <section id="partie-1" className={CLASSE_ARTICLE} aria-labelledby="titre-partie-1">
        <h2 id="titre-partie-1" className={CLASSE_TITRE_ARTICLE}>
          Partie 1 — Ce que cette démonstration collecte&nbsp;: rien
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'C’est la particularité de ce site, et elle est vraie, pas ' +
              'rhétorique. Il n’y a ici ni compte client, ni base de données, ni ' +
              'serveur qui reçoive une identité.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.1 Aucun traitement côté serveur'}</T>
        </h3>

        <ul className={CLASSE_LISTE}>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Aucun compte.'}</T>
            </strong>{' '}
            <T>
              {'Il n’y a pas d’inscription, pas de mot de passe, pas de profil. ' +
                'Une commande d’essai se passe sans s’identifier.'}
            </T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Aucune base de données.'}</T>
            </strong>{' '}
            <T>
              {'Le site n’en possède pas. Les pages sont construites à l’avance à ' +
                'partir d’un catalogue versionné avec le code.'}
            </T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Aucun formulaire d’envoi.'}</T>
            </strong>{' '}
            <T>
              {'Il n’existe pas de formulaire de contact, pas d’inscription à une ' +
                'lettre d’information, pas de champ dont le contenu partirait vers ' +
                'un serveur.'}
            </T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Aucun courriel.'}</T>
            </strong>{' '}
            <T>
              {'Rien n’est envoyé, donc aucune adresse de courrier électronique ' +
                'n’est nécessaire ni conservée.'}
            </T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Aucune journalisation applicative.'}</T>
            </strong>{' '}
            <T>
              {'Le site n’écrit ni journal de navigation, ni identifiant de ' +
                'session, ni empreinte de visiteur.'}
            </T>
          </li>
        </ul>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Une unique route serveur existe : celle qui ouvre la session de ' +
              'paiement chez le prestataire. Elle ne conserve rien et n’écrit nulle ' +
              'part ; ce qu’elle transmet est décrit au point 1.4.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.2 Aucun cookie de suivi, aucune mesure d’audience'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le site ne dépose aucun cookie de mesure d’audience, aucun cookie ' +
              'publicitaire, aucun traceur tiers, et n’intègre aucun bouton de ' +
              'réseau social. Il n’y a donc pas de bandeau de consentement, parce ' +
              'qu’il n’y a rien à consentir.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les polices de caractères sont servies depuis le site lui-même : la ' +
              'consultation d’une page ne provoque aucune requête vers un domaine ' +
              'tiers, hors la redirection vers le prestataire de paiement lorsque ' +
              'le visiteur va jusqu’au bout d’un essai de commande.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.3 Ce qui est écrit dans votre navigateur, et rien d’autre'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les essais du visiteur sont conservés dans le stockage local de son ' +
              'navigateur (localStorage) :'}
          </T>
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              <T>
                {'Ce que la démonstration écrit dans le stockage local du ' +
                  'navigateur, à quoi cela sert et où cela vit'}
              </T>
            </caption>
            <thead>
              <tr className="border-b border-filet">
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Ce qui est stocké
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  À quoi cela sert
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Où cela vit
                </th>
              </tr>
            </thead>
            <tbody>
              {STOCKAGE_LOCAL.map((entree) => (
                <tr key={entree.quoi} className="border-b border-filet/60">
                  <th
                    scope="row"
                    className="py-3 pr-6 text-left align-baseline font-normal text-encre"
                  >
                    <T>{entree.quoi}</T>
                  </th>
                  <td className={CLASSE_CELLULE}>
                    <T>{entree.pourquoi}</T>
                  </td>
                  <td className={CLASSE_CELLULE}>
                    <T>{entree.ou}</T>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ces informations ne quittent jamais l’appareil. Personne d’autre que ' +
              'le visiteur n’y a accès : ni le concepteur du site, ni l’hébergeur. ' +
              'Elles disparaissent lorsque le visiteur vide les données de son ' +
              'navigateur, et il existe sur la page de suivi un bouton qui les ' +
              'efface et un bouton qui les exporte au format JSON.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ce stockage relève de la catégorie des opérations strictement ' +
              'nécessaires à la fourniture d’un service expressément demandé par ' +
              'l’utilisateur, telle que définie par l’article 82 de la loi ' +
              'n° 78-17 du 6 janvier 1978 modifiée : sans lui, il n’y aurait ni ' +
              'panier ni suivi. Aucune de ces entrées ne sert à mesurer, à ' +
              'profiler ou à reconnaître un visiteur d’une visite à l’autre à ' +
              'd’autres fins.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.4 Le paiement'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Lorsque le visiteur va jusqu’au paiement, il est redirigé vers la ' +
              'page hébergée par le prestataire de paiement, en mode test. Ce qui ' +
              'est transmis au prestataire pour ouvrir la session se limite aux ' +
              'éléments nécessaires à l’opération : le contenu du panier et son ' +
              'montant. Les données de carte sont saisies chez le prestataire, sur ' +
              'ses pages, et ne transitent jamais par ce site.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Précision vérifiée sur le code de cette démonstration, parce qu’une ' +
              'page de données personnelles plus optimiste que son site ne vaut ' +
              'rien : les coordonnées saisies à l’étape de commande — nom, ' +
              'adresse, code postal, courrier électronique — ne partent nulle ' +
              'part. La demande envoyée à la route de paiement ne contient que des ' +
              'références d’articles, des quantités, une zone et un total. En ' +
              'revanche, la session ouverte chez le prestataire lui demande de ' +
              'collecter LUI-MÊME une adresse de livraison, limitée à la France, ' +
              'ainsi qu’une adresse de courrier électronique pour son reçu : ces ' +
              'informations-là sont saisies sur ses pages et relèvent de sa ' +
              'politique, pas de celle-ci. Lui sont également transmis la ' +
              'référence de la commande et les adresses de retour vers la ' +
              'boutique.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le prestataire applique sa propre politique de confidentialité à ' +
              'cette étape.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.5 L’hébergeur'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'L’hébergement du site produit des journaux techniques de connexion ' +
              '(adresses IP, dates, pages appelées), comme tout serveur web. Ils ' +
              'relèvent du fonctionnement et de la sécurité de l’hébergement, et ' +
              'non d’un traitement mis en œuvre par la démonstration. Le nom de ' +
              'l’hébergeur figure dans les '}
          </T>
          <LienLegal vers="/mentions-legales">
            <T>{'mentions légales'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'1.6 Vos droits ici'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le règlement général sur la protection des données (règlement (UE) ' +
              '2016/679) et la loi n° 78-17 du 6 janvier 1978 modifiée ouvrent au ' +
              'visiteur des droits d’accès, de rectification, d’effacement, de ' +
              'limitation, d’opposition et de portabilité sur les données le ' +
              'concernant.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sur cette démonstration, ces droits sont sans objet faute de ' +
              'traitement : il n’existe aucune donnée personnelle à consulter, à ' +
              'rectifier ou à effacer, et les seules informations existantes sont ' +
              'déjà entre les mains du visiteur, dans son navigateur, où il peut ' +
              'les lire, les exporter et les supprimer lui-même.'}
          </T>
        </p>
      </section>

      {/* ==================== PARTIE 2 ==================== */}
      <section id="partie-2" className={CLASSE_ARTICLE} aria-labelledby="titre-partie-2">
        <h2 id="titre-partie-2" className={CLASSE_TITRE_ARTICLE}>
          Partie 2 — Ce qui change sur une boutique livrée
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Une boutique qui vend réellement ne peut pas rester sans traitement ' +
              'de données : livrer suppose une adresse, encaisser suppose une ' +
              'facture, répondre à une réclamation suppose de retrouver la ' +
              'commande. Les emplacements ci-dessous sont ceux que le marchand ' +
              'remplit avant l’ouverture.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'2.1 Responsable de traitement'}</T>
        </h3>

        <TableauGabarit
          legende="Identité et coordonnées du responsable de traitement"
          lignes={RESPONSABLE}
        />

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>
            {'2.2 Ce qui est collecté, pourquoi, sur quelle base et pour combien ' +
              'de temps'}
          </T>
        </h3>

        <CadreDefilant idLegende="legende-finalites" className="mt-5">
          <table className="w-full border-collapse text-sm">
            <caption id="legende-finalites" className="sr-only">
              <T>
                {'Finalités de traitement, données concernées, base légale et ' +
                  'durée de conservation, à compléter par le marchand'}
              </T>
            </caption>
            <thead>
              <tr className="border-b border-filet">
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Finalité
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Données concernées
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Base légale
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Durée de conservation
                </th>
              </tr>
            </thead>
            <tbody>
              {TRAITEMENTS.map((traitement) => (
                <tr key={traitement.finalite} className="border-b border-filet/60">
                  <th
                    scope="row"
                    className="py-3 pr-6 text-left align-baseline font-normal text-encre"
                  >
                    <T>{traitement.finalite}</T>
                  </th>
                  <td className={CLASSE_CELLULE}>{traitement.donnees}</td>
                  <td className={CLASSE_CELLULE}>{traitement.base}</td>
                  <td className={CLASSE_CELLULE}>{traitement.duree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CadreDefilant>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'2.3 Destinataires et sous-traitants'}</T>
        </h3>

        <CadreDefilant idLegende="legende-destinataires" className="mt-5">
          <table className="w-full border-collapse text-sm">
            <caption id="legende-destinataires" className="sr-only">
              <T>
                {'Destinataires et sous-traitants, ce que chacun reçoit et où les ' +
                  'données sont traitées, à compléter par le marchand'}
              </T>
            </caption>
            <thead>
              <tr className="border-b border-filet">
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Rôle
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Prestataire
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Ce qu’il reçoit
                </th>
                <th scope="col" className={CLASSE_CELLULE_ENTETE}>
                  Localisation des données
                </th>
              </tr>
            </thead>
            <tbody>
              {DESTINATAIRES.map((destinataire) => (
                <tr key={destinataire.role} className="border-b border-filet/60">
                  <th
                    scope="row"
                    className="py-3 pr-6 text-left align-baseline font-normal text-encre"
                  >
                    <T>{destinataire.role}</T>
                  </th>
                  <td className={CLASSE_CELLULE}>{destinataire.prestataire}</td>
                  <td className={CLASSE_CELLULE}>{destinataire.recoit}</td>
                  <td className={CLASSE_CELLULE}>{destinataire.localisation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CadreDefilant>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Transferts hors Union européenne, le cas échéant, et garanties ' +
              'encadrant ces transferts : '}
          </T>
          <AComplete champ="transferts hors Union européenne et garanties applicables" />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Un contrat de sous-traitance conforme à l’article 28 du règlement ' +
              'général sur la protection des données est conclu avec chacun de ces ' +
              'prestataires.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'2.4 Cookies et traceurs'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <AComplete champ="liste des cookies et traceurs déposés, leur finalité, leur durée et le mécanisme de recueil du consentement" />
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'2.5 Droits des personnes et modalités d’exercice'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sur une boutique livrée, les droits d’accès, de rectification, ' +
              'd’effacement, de limitation, d’opposition et de portabilité ' +
              's’exercent réellement, ainsi que le droit de définir des directives ' +
              'relatives au sort des données après le décès.'}
          </T>
        </p>

        <TableauGabarit
          legende="Modalités d’exercice des droits des personnes"
          lignes={EXERCICE_DES_DROITS}
        />

        <p className={CLASSE_TEXTE}>
          <T>
            {'Toute personne peut introduire une réclamation auprès de la ' +
              'Commission nationale de l’informatique et des libertés, autorité de ' +
              'contrôle française.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'2.6 Sécurité'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>{'Mesures techniques et organisationnelles mises en œuvre : '}</T>
          <AComplete champ="mesures de sécurité retenues, par exemple chiffrement des échanges, contrôle des accès, sauvegardes, journalisation des accès administrateur" />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Procédure applicable en cas de violation de données : '}</T>
          <AComplete champ="procédure de notification à l’autorité de contrôle et, le cas échéant, aux personnes concernées" />
          <T>{'.'}</T>
        </p>
      </section>

      <section
        id="structure-de-la-page"
        className={CLASSE_ARTICLE}
        aria-labelledby="titre-structure"
      >
        <h2 id="titre-structure" className={CLASSE_TITRE_ARTICLE}>
          Ce que cette page devient sur une boutique livrée
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La partie 1 est écrite en dur : elle décrit un fait vérifiable du ' +
              'site, pas une promesse. La partie 2 est un gabarit intégral, ' +
              'composé de tableaux dont chaque cellule vide est un emplacement à ' +
              'remplir. Sur une boutique livrée, la partie 1 disparaît et la ' +
              'partie 2 devient la page entière.'}
          </T>
        </p>
      </section>
    </div>
  );
}
