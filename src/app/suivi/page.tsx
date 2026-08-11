import type { Metadata } from 'next';

import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { HEROS_SUIVI } from '@/donnees/visuels-editoriaux';
import { IlotSuivi } from '@/composants/suivi/IlotSuivi';
import {
  COMMANDES_AMORCE,
  LIBELLE_JEU_ESSAI,
  REFERENCES_AMORCE,
} from '@/donnees/commandes-amorce';

/**
 * LE SUIVI DE COMMANDE — coquille serveur, îlot client unique.
 *
 * ---------------------------------------------------------------------------
 * Hors du plan du site ? Non. Et c'est l'application de D19, pas son exception
 * ---------------------------------------------------------------------------
 *
 * `/panier` et `/commande` sont hors du plan du site : personne ne cherche son
 * propre panier dans un moteur de recherche. Le suivi de commande, lui, EST
 * cherché — « suivi commande » suivi du nom de la boutique est une requête
 * ordinaire, et une boutique qui ne répond pas à celle-là reçoit le courriel à
 * la place. La page est donc annoncée au plan du site et INDEXABLE, comme
 * `/livraison` et pour la même raison : c'est une page de confiance, publique,
 * qui ne contient aucune donnée de commande tant qu'on ne lui a pas donné de
 * référence.
 *
 * Elle ne porte donc pas `noindex` — la décision D19 rappelle ce que cette
 * consigne coûte, mesures à l'appui : la note de référencement tombe de 100 à
 * 66. Ici la question ne se pose même pas, la page est faite pour être trouvée.
 *
 * ---------------------------------------------------------------------------
 * Ce que le serveur en sait : rien
 * ---------------------------------------------------------------------------
 *
 * Le HTML servi porte le titre, le chapeau, le champ de saisie et les six
 * références du jeu d'essai. Aucune commande n'y figure — elles vivent dans le
 * stockage local du visiteur (décision D2). Une référence saisie ne part nulle
 * part, et c'est vérifiable dans l'onglet réseau du navigateur.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Suivi de commande',
  description:
    'Suivez une commande de la boutique de démonstration Maison Vaubrune à ' +
    'partir de sa référence : payée, préparée, expédiée, avec les horodatages ' +
    'de chaque étape.',
  alternates: { canonical: '/suivi' },
};

export default function PageSuivi() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      {/* LE HÉROS PASSE EN VIDÉO (retour client n° 19), par le seul champ
          `video` de son entrée de données. */}
      <HerosIllustre heros={HEROS_SUIVI} className="pt-12 pb-4 sm:pt-16">
        <BlocTitre
          surtitre="Votre commande"
          titre="Suivi de commande"
          chapeau={
            <>
              Saisissez la référence reçue à la commande&nbsp;: vous verrez où elle
              en est, et quand chaque étape a eu lieu.
            </>
          }
          note={
            <>
              Rappel&nbsp;: Maison Vaubrune est une épicerie fine fictive et cette
              page est une démonstration. Les commandes affichées sont celles passées
              dans ce navigateur, plus le {LIBELLE_JEU_ESSAI}. Rien n’est envoyé
              nulle part quand vous saisissez une référence.
            </>
          }
        />
      </HerosIllustre>

      {/* L'enveloppe est un `div` nu : elle ne pose ni bordure, ni
          remplissage, si bien que les marges de l'îlot la traversent et que
          rien ne bouge d'un pixel. Poser l'attribut sur l'îlot lui-même
          demanderait de rendre un composant client conscient du mouvement —
          patron de l'encart de fiction sur l'accueil, C17. */}
      <div data-revelation>
        <IlotSuivi amorce={COMMANDES_AMORCE} exemples={REFERENCES_AMORCE} />
      </div>
    </div>
  );
}
