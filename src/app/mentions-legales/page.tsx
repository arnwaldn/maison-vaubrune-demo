import type { Metadata } from 'next';

import { AComplete } from '@/composants/demonstration/AComplete';
import {
  CLASSE_ARTICLE,
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
 * MENTIONS LÉGALES — le premier des cinq documents de la tranche C7.
 *
 * Reprise du brouillon `contenu/juridique-brouillons/01-mentions-legales.md`,
 * prose intacte. Les vingt-deux jetons `{{A_COMPLETER:…}}` du brouillon sont
 * devenus vingt-deux `<AComplete>` : le surlignage se voit à l'œil, et
 * l'`aria-label` du composant donne à un lecteur d'écran la même information
 * que la couleur donne à l'œil.
 *
 * Page STATIQUE et INDEXABLE (décision D19). Elle ne dépend d'aucune donnée de
 * commande, d'aucune date et d'aucun utilisateur : `force-static` le grave.
 * Aucun îlot client, donc aucun octet de JavaScript ajouté au budget public.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales de la démonstration Maison Vaubrune : éditeur, ' +
    'hébergeur, contact et médiation. Gabarit — aucune donnée d’entreprise ' +
    'n’a été inventée pour le remplir.',
  alternates: { canonical: '/mentions-legales' },
};

/* -------------------------------------------------------------------------- */
/* Les quatre tableaux d'identité                                              */
/* -------------------------------------------------------------------------- */

const EDITEUR: readonly LigneGabarit[] = [
  {
    intitule: 'Dénomination sociale ou nom du professionnel',
    valeur: <AComplete champ={CHAMPS.PROFESSIONNEL} />,
  },
  {
    intitule: 'Forme juridique',
    valeur: <AComplete champ="forme juridique" />,
  },
  {
    intitule: 'Capital social (sociétés uniquement)',
    valeur: <AComplete champ="montant du capital social" />,
  },
  {
    intitule: 'Adresse du siège social ou de l’établissement',
    valeur: <AComplete champ={CHAMPS.SIEGE} />,
  },
  {
    intitule: 'Numéro unique d’identification (SIREN)',
    valeur: <AComplete champ="numéro SIREN" />,
  },
  {
    intitule: 'Immatriculation au registre du commerce et des sociétés',
    valeur: <AComplete champ="ville du greffe et numéro RCS" />,
  },
  {
    intitule: 'Immatriculation au répertoire des métiers, le cas échéant',
    valeur: <AComplete champ="numéro et chambre de métiers de rattachement" />,
  },
  {
    intitule: 'Numéro de TVA intracommunautaire',
    valeur: <AComplete champ="numéro de TVA intracommunautaire" />,
  },
  {
    intitule: 'Activité réglementée, autorisation ou déclaration applicable',
    valeur: (
      <AComplete champ="référence de la déclaration ou de l’agrément sanitaire, et autorité qui l’a délivré" />
    ),
  },
  {
    intitule: 'Adhésion à un dispositif de médiation de la consommation',
    valeur: (
      <AComplete champ="nom, adresse postale et adresse du site du médiateur de la consommation retenu" />
    ),
  },
];

const DIRECTEUR: readonly LigneGabarit[] = [
  {
    intitule: 'Nom et prénom',
    valeur: <AComplete champ="nom et prénom du directeur de la publication" />,
  },
  {
    intitule: 'Qualité',
    valeur: (
      <AComplete champ="qualité au sein de l’entreprise, par exemple gérant ou président" />
    ),
  },
  {
    intitule: 'Adresse de contact',
    valeur: (
      <AComplete champ="adresse de courrier électronique du directeur de la publication" />
    ),
  },
];

const HEBERGEUR: readonly LigneGabarit[] = [
  {
    intitule: 'Dénomination sociale de l’hébergeur',
    valeur: <AComplete champ={CHAMPS.HEBERGEUR} />,
  },
  {
    intitule: 'Adresse du siège',
    valeur: <AComplete champ="adresse postale complète de l’hébergeur" />,
  },
  {
    intitule: 'Téléphone',
    valeur: <AComplete champ="numéro de téléphone de l’hébergeur" />,
  },
  {
    intitule: 'Site',
    valeur: <AComplete champ="adresse du site de l’hébergeur" />,
  },
];

const CONTACT: readonly LigneGabarit[] = [
  {
    intitule: 'Adresse de courrier électronique',
    valeur: <AComplete champ={CHAMPS.COURRIEL_CONTACT} />,
  },
  {
    intitule: 'Téléphone',
    valeur: <AComplete champ="numéro de téléphone du service client" />,
  },
  {
    intitule: 'Adresse postale du service client',
    valeur: (
      <AComplete champ="adresse postale du service client, si elle diffère du siège" />
    ),
  },
  {
    intitule: 'Horaires ou délai de réponse annoncé',
    valeur: <AComplete champ="jours, horaires ou délai de réponse annoncé" />,
  },
];

export default function PageMentionsLegales() {
  return (
    <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <EnTeteLegale
        surtitre="Document légal"
        titre="Mentions légales"
        chapeau={
          'Identité de l’éditeur, du directeur de la publication et de ' +
          'l’hébergeur, coordonnées du service client et dispositif de ' +
          'médiation de la consommation.'
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
              {'. Aucune vente n’y est conclue, aucun paiement n’y est encaissé, ' +
                'aucune commande n’y est expédiée. Les mentions ci-dessous ' +
                'décrivent ce qu’une boutique réelle affiche à cet endroit ; ' +
                'elles ne désignent aucune entreprise existante et aucune donnée ' +
                'n’a été inventée pour les remplir.'}
            </T>
          </>
        }
      />

      <section id="editeur" className={CLASSE_ARTICLE} aria-labelledby="titre-editeur">
        <h2 id="titre-editeur" className={CLASSE_TITRE_ARTICLE}>
          1. Éditeur du site
        </h2>

        <TableauGabarit
          legende="Éléments d’identification de l’éditeur du site"
          lignes={EDITEUR}
        />

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le professionnel qui exerce une activité de commerce électronique ' +
              'met à disposition du public ces éléments d’identification (article ' +
              '6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans ' +
              'l’économie numérique, et article 19 de la même loi pour l’activité ' +
              'de commerce électronique). Les mentions relatives à ' +
              'l’immatriculation relèvent en outre de l’article R. 123-237 du code ' +
              'de commerce. L’information du consommateur sur l’identité et les ' +
              'coordonnées du professionnel relève de l’article L. 111-1 du code ' +
              'de la consommation.'}
          </T>
        </p>
      </section>

      <section
        id="directeur-publication"
        className={CLASSE_ARTICLE}
        aria-labelledby="titre-directeur"
      >
        <h2 id="titre-directeur" className={CLASSE_TITRE_ARTICLE}>
          2. Directeur de la publication
        </h2>

        <TableauGabarit
          legende="Identité et coordonnées du directeur de la publication"
          lignes={DIRECTEUR}
        />
      </section>

      <section id="hebergeur" className={CLASSE_ARTICLE} aria-labelledby="titre-hebergeur">
        <h2 id="titre-hebergeur" className={CLASSE_TITRE_ARTICLE}>
          3. Hébergeur du site
        </h2>

        <TableauGabarit
          legende="Identité et coordonnées de l’hébergeur du site"
          lignes={HEBERGEUR}
        />
      </section>

      <section id="contact" className={CLASSE_ARTICLE} aria-labelledby="titre-contact">
        <h2 id="titre-contact" className={CLASSE_TITRE_ARTICLE}>
          4. Contact
        </h2>

        <TableauGabarit
          legende="Coordonnées du service client"
          lignes={CONTACT}
        />

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le coût de l’appel, lorsqu’un numéro est indiqué, n’excède pas le ' +
              'prix d’un appel local pour les demandes portant sur l’exécution ' +
              'd’un contrat déjà conclu (article L. 111-2 du code de la ' +
              'consommation).'}
          </T>
        </p>
      </section>

      <section
        id="propriete-intellectuelle"
        className={CLASSE_ARTICLE}
        aria-labelledby="titre-propriete"
      >
        <h2 id="titre-propriete" className={CLASSE_TITRE_ARTICLE}>
          5. Propriété intellectuelle
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les textes, les illustrations et la structure de ce site sont ' +
              'protégés par le code de la propriété intellectuelle. Le titulaire ' +
              'des droits, pour un site réellement exploité, est '}
          </T>
          <AComplete champ="titulaire des droits sur les contenus du site" />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Dans la présente démonstration, les illustrations sont des dessins ' +
              'vectoriels produits pour le projet et les textes de produits sont ' +
              'écrits pour lui : aucune photographie de banque d’images, aucune ' +
              'marque réelle, aucune appellation protégée et aucun producteur ' +
              'nommé n’y figurent.'}
          </T>
        </p>
      </section>

      <section id="litiges" className={CLASSE_ARTICLE} aria-labelledby="titre-litiges">
        <h2 id="titre-litiges" className={CLASSE_TITRE_ARTICLE}>
          6. Litiges et médiation
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les modalités de réclamation, le recours au médiateur de la ' +
              'consommation (article L. 612-1 du code de la consommation) et le ' +
              'droit applicable figurent aux articles correspondants des '}
          </T>
          <LienLegal vers="/conditions-generales-de-vente">
            <T>{'conditions générales de vente'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>
      </section>

      <section id="boutique-livree" className={CLASSE_ARTICLE} aria-labelledby="titre-livree">
        <h2 id="titre-livree" className={CLASSE_TITRE_ARTICLE}>
          7. Ce que cette page devient sur une boutique livrée
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les valeurs surlignées ci-dessus sont fournies par le marchand une ' +
              'fois pour toutes ; elles ne changent qu’en cas de modification de ' +
              'sa situation (déménagement, changement de forme juridique, ' +
              'changement d’hébergeur, changement de médiateur). La page est ' +
              'statique et ne dépend d’aucune donnée de commande.'}
          </T>
        </p>
      </section>
    </div>
  );
}
