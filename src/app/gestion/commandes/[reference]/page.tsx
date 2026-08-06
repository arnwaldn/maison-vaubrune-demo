import type { Metadata } from 'next';

import { IlotDetailCommande } from '@/composants/gestion/IlotDetailCommande';
import {
  COMMANDES_AMORCE,
  LIBELLE_JEU_ESSAI,
  REFERENCES_AMORCE,
} from '@/donnees/commandes-amorce';

/**
 * LE DÉTAIL D'UNE COMMANDE — coquille serveur, îlot client unique.
 *
 * ---------------------------------------------------------------------------
 * ÉCART CONSIGNÉ — le seul segment dynamique de l'espace de gestion
 * ---------------------------------------------------------------------------
 *
 * `generateStaticParams()` préengendre les SIX références du jeu d'essai : ce
 * sont les seules connues à la construction. Les commandes que le visiteur
 * passe lui-même portent des références tirées au sort dans son navigateur, et
 * aucune construction ne peut les deviner. `dynamicParams` reste donc vrai, et
 * une adresse hors des six est rendue à la demande.
 *
 * Ce que ce rendu à la demande fait, exactement : il produit le titre, le
 * chapeau et l'îlot vide. AUCUNE donnée de commande ne le traverse — elles
 * vivent toutes dans le stockage local du visiteur, que le serveur ne voit pas
 * et ne verra jamais (décision D2). C'est une coquille, pas une page de
 * données, et c'est la raison pour laquelle l'écart est acceptable : la
 * doctrine « une seule route serveur » protégeait le projet d'un serveur qui
 * SAIT des choses, pas d'un gabarit qui n'en sait aucune.
 *
 * L'alternative aurait été de refuser les références inconnues
 * (`dynamicParams = false`) : les commandes réellement passées dans la
 * démonstration auraient alors répondu 404 depuis leur propre liste, ce qui est
 * la panne la plus absurde qu'on puisse livrer sur un écran de suivi.
 */

export const metadata: Metadata = {
  title: 'Détail de commande',
  description:
    'Détail d’une commande de la démonstration Maison Vaubrune : lignes, totaux, ' +
    'coordonnées, journal des états.',
};

export function generateStaticParams(): { reference: string }[] {
  return REFERENCES_AMORCE.map((reference) => ({ reference }));
}

interface ProprietesPage {
  readonly params: Promise<{ readonly reference: string }>;
}

export default async function PageDetailCommande({ params }: ProprietesPage) {
  const { reference } = await params;

  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 font-titre text-3xl font-semibold text-encre tabular-nums sm:text-4xl">
          {decodeURIComponent(reference)}
        </h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Le détail complet de la commande, son journal, et les états vers lesquels
          elle peut encore passer.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Si cette référence appartient au {LIBELLE_JEU_ESSAI}, la faire avancer en
          écrit une copie dans votre navigateur&nbsp;: l’originale reste intacte.
        </p>
      </section>

      <IlotDetailCommande
        reference={decodeURIComponent(reference)}
        amorce={COMMANDES_AMORCE}
      />
    </>
  );
}
