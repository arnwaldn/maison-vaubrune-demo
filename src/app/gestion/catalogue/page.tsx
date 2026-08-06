import type { Metadata } from 'next';

import { IlotCatalogueMarchand } from '@/composants/gestion/IlotCatalogueMarchand';
import { CATALOGUE } from '@/donnees/catalogue';

/**
 * LE CATALOGUE MARCHAND — coquille serveur, îlot client unique.
 *
 * Cette page transmet le CATALOGUE ENTIER à son îlot, ce que le reste du
 * projet s'interdit (décision D17). L'exception est motivée et bornée :
 * `exporter()` doit produire les quinze fiches complètes, prose comprise —
 * « exactement ce qu'une boutique livrée enregistre dans sa base » — et cela ne
 * peut se fabriquer que là où le téléchargement se déclenche, c'est-à-dire dans
 * le navigateur.
 *
 * Ce que D17 interdit reste interdit : l'îlot n'IMPORTE pas le catalogue, il le
 * REÇOIT. Les octets voyagent donc dans la charge utile RSC, aplatie dans le
 * HTML et compressée avec lui, et non dans le paquet JavaScript — c'est la
 * différence entre une page lourde et un site lourd. Et elle ne pèse que sur
 * cette page-ci : `/gestion/catalogue` est `noindex`, interdite aux robots,
 * absente du plan du site et hors des mesures publiées.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'Tenue du catalogue de la démonstration Maison Vaubrune : prix, stock, ' +
    'disponibilité, mise en avant, résumé, export en JSON.',
};

export default function PageCatalogueGestion() {
  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Catalogue</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Quinze références, vingt-trois formats. Modifiez un prix, un stock, un
          résumé&nbsp;: le rayon et les fiches suivent immédiatement, y compris dans
          un autre onglet déjà ouvert.
        </p>

        <div className="mt-6 max-w-lisible rounded-sm border border-ocre-clair bg-papier px-4 py-3 text-sm leading-relaxed text-encre">
          <p>
            <span className="font-semibold">
              Vos modifications s’appliquent à la vitrine, pas au paiement.
            </span>{' '}
            Le panier et la commande travaillent aux prix du catalogue d’origine —
            sur une boutique livrée, les prix vivent côté serveur, et c’est
            précisément ce que le contrôle d’intégrité du paiement vérifie.
          </p>
          <p className="mt-2 text-encre-douce">
            Cinq champs sont modifiables&nbsp;: le résumé, la mise en avant et la
            disponibilité d’une référence, le prix et le stock de chaque format. Les
            poids, les formats, les textes de fiche et les mentions légales ne le
            sont pas — les uns servent au calcul des frais de port, les autres au
            droit de rétractation.
          </p>
        </div>
      </section>

      <IlotCatalogueMarchand catalogue={CATALOGUE} />
    </>
  );
}
