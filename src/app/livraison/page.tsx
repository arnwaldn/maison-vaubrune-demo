import type { Metadata } from 'next';
import Link from 'next/link';

import { BAREMES, type BaremeZone } from '@/donnees/bareme-expedition';
import { formaterEuros } from '@/lib/argent';
import { formaterPoids } from '@/lib/expedition';
import { CODES_ZONE } from '@/lib/types';

/**
 * La page « Livraison » — le barème, publié tel qu'il est calculé.
 *
 * ---------------------------------------------------------------------------
 * Le seul principe de cette page
 * ---------------------------------------------------------------------------
 *
 * AUCUN MONTANT, AUCUN SEUIL, AUCUN DÉLAI N'EST ÉCRIT ICI. Tout est lu dans
 * `src/donnees/bareme-expedition.ts` et rendu par `formaterEuros()` et
 * `formaterPoids()`. Ce n'est pas de la coquetterie d'architecture : c'est la
 * seule manière d'être certain que le prix ANNONCÉ sur cette page est le prix
 * FACTURÉ au panier. Une page de livraison recopiée à la main se désynchronise
 * du moteur au premier changement de tarif, et le client découvre l'écart au
 * récapitulatif — c'est-à-dire au pire moment.
 *
 * Corollaire : le tableau de chaque zone a exactement autant de lignes que la
 * zone a de tranches. L'outre-mer en a trois là où la métropole en a quatre,
 * sans qu'une seule ligne de cette page ne le sache.
 *
 * Statique par construction, `force-static` le grave : rien ici ne dépend d'une
 * requête, d'une date ou d'un utilisateur.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Livraison',
  description:
    'Frais de port de la Maison Vaubrune : barème par poids et par zone ' +
    '(France métropolitaine, Corse, outre-mer), franco de port, emballage ' +
    'isotherme et délais indicatifs.',
  alternates: { canonical: '/livraison' },
};

/** Les trois barèmes dans l'ordre du vocabulaire des zones. */
const ZONES = CODES_ZONE.map((zone) => BAREMES[zone]);

/** Les zones qui accueillent les produits frais — pour dire la règle sans la recopier. */
const ZONES_FRAIS = ZONES.filter((bareme) => bareme.acceptePerissable);

export default function PageLivraison() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Expédition
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Livraison</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Les frais de port se calculent sur le poids du colis et sur la zone de
          destination, et rien d’autre. Le barème complet est publié ci-dessous&nbsp;:
          il n’y a pas de second tarif ailleurs.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          La zone est déduite du code postal de livraison. Le poids retenu est celui
          du colis, emballage compris&nbsp;: c’est le poids indiqué sur chaque{' '}
          <Link
            href="/boutique"
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            fiche produit
          </Link>
          , additionné sur l’ensemble du panier.
        </p>
      </section>

      <EncartDemonstration />

      <RegleGenerale />

      <nav aria-labelledby="titre-zones" className="mt-14 border-y border-filet py-5">
        <h2
          id="titre-zones"
          className="font-titre text-sm font-semibold tracking-[0.08em] text-encre uppercase"
        >
          Zones
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {ZONES.map((bareme) => (
            <li key={bareme.zone}>
              <a
                href={`#zone-${bareme.zone}`}
                className="text-sm text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
              >
                {bareme.libelle}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {ZONES.map((bareme) => (
        <TableauZone key={bareme.zone} bareme={bareme} />
      ))}

      <p className="mt-14 mb-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
        Au-delà de la dernière tranche d’une zone, il n’y a pas de tarif&nbsp;: il y a
        un devis. Le panier le dit alors clairement et invite à écrire, plutôt que
        d’afficher un prix que personne n’a fixé.
      </p>
    </div>
  );
}

/**
 * L'encart de démonstration.
 *
 * Il ne répète pas l'aveu de fiction — il est déjà partout — mais il dit la
 * chose que cette page-ci doit dire : ces montants sont des données, pas des
 * tarifs négociés, et le marchand les remplace par les siens en éditant un
 * seul fichier.
 */
function EncartDemonstration() {
  return (
    <aside
      aria-labelledby="etiquette-bareme"
      className="overflow-hidden rounded-sm border border-filet bg-papier"
    >
      <p
        id="etiquette-bareme"
        className="border-b border-filet px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-ocre uppercase sm:px-7"
      >
        Données de démonstration
      </p>
      <p className="px-5 py-6 text-sm leading-relaxed text-encre sm:px-7">
        Les montants, les seuils et les délais de cette page sont des valeurs
        plausibles pour une petite maison qui expédie des colis alimentaires depuis
        la France. Ils ne reproduisent le tarif d’aucun transporteur réel et n’ont
        été négociés avec personne. Un marchand qui reprendrait cette boutique
        remplacerait ce barème par ses propres conditions&nbsp;: c’est un tableau de
        nombres dans un fichier unique, et ni le calcul ni cette page n’ont à être
        rouverts pour cela.
      </p>
    </aside>
  );
}

/**
 * Les deux règles qui ne se lisent pas dans un tableau.
 *
 * Le franco qui couvre l'isotherme est dit en une phrase et sans astérisque —
 * c'est l'objet même de la décision `004-franco-couvre-isotherme.md`. Le
 * montant du seuil n'est pas répété ici : il est dans le tableau de chaque
 * zone, à sa place, et une seule fois.
 */
function RegleGenerale() {
  return (
    <section aria-labelledby="titre-regles" className="mt-14">
      <h2 id="titre-regles" className="text-titre font-semibold text-encre">
        Deux règles à connaître
      </h2>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="font-titre text-base font-semibold text-encre">
            Le franco de port couvre tout
          </h3>
          <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Quand votre commande atteint le seuil de sa zone, les frais de port
            tombent à zéro — emballage isotherme compris. Il n’y a pas d’astérisque,
            pas de supplément qui réapparaît au récapitulatif, pas de catégorie de
            produits exclue de l’offre.
          </p>
        </div>

        <div>
          <h3 className="font-titre text-base font-semibold text-encre">
            Les produits frais restent en métropole
          </h3>
          <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Le beurre et le fromage voyagent sous emballage isotherme et sous chaîne
            du froid continue. Ces envois ne sont assurés qu’en{' '}
            {ZONES_FRAIS.map((bareme) => bareme.libelle).join(', ')}&nbsp;: ailleurs,
            le délai de route ne permet pas de garantir la denrée, et le panier le
            refuse avant paiement plutôt qu’après.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Le barème d'une zone : un tableau de tranches, puis ses quatre conditions.
 *
 * Accessibilité du tableau. Une légende (`<caption>`) dit ce que le tableau
 * contient, y compris pour qui ne voit pas le titre de section juste au-dessus.
 * Les en-têtes de colonnes portent `scope="col"` et — c'est le point qu'on
 * oublie — la borne de poids de chaque ligne est un en-tête de LIGNE
 * (`<th scope="row">`), pas une cellule ordinaire : c'est elle qui qualifie le
 * prix à sa droite, et c'est elle qu'un lecteur d'écran doit annoncer avant lui.
 */
function TableauZone({ bareme }: { readonly bareme: BaremeZone }) {
  const titre = `titre-zone-${bareme.zone}`;

  return (
    <section
      id={`zone-${bareme.zone}`}
      aria-labelledby={titre}
      className="scroll-mt-8 pt-12 sm:pt-16"
    >
      <h2 id={titre} className="text-titre font-semibold text-encre">
        {bareme.libelle}
      </h2>

      <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Frais de port vers {bareme.libelle}, par tranche de poids du colis,
              toutes taxes comprises
            </caption>
            <thead>
              <tr className="border-b border-filet text-left">
                <th scope="col" className="pb-2 font-semibold text-encre">
                  Poids du colis
                </th>
                <th scope="col" className="pb-2 text-right font-semibold text-encre">
                  Frais de port
                </th>
              </tr>
            </thead>
            <tbody>
              {bareme.tranches.map((tranche, rang) => {
                const precedente = bareme.tranches[rang - 1];

                return (
                  <tr key={tranche.jusquAGrammes} className="border-b border-filet/60">
                    <th
                      scope="row"
                      className="py-3 text-left font-normal text-encre-douce"
                    >
                      {precedente === undefined ? (
                        <>Jusqu’à {formaterPoids(tranche.jusquAGrammes)}</>
                      ) : (
                        <>
                          Plus de {formaterPoids(precedente.jusquAGrammes)}, jusqu’à{' '}
                          {formaterPoids(tranche.jusquAGrammes)}
                        </>
                      )}
                    </th>
                    <td className="py-3 text-right font-semibold text-encre">
                      {formaterEuros(tranche.prixCentimes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-3 text-xs leading-relaxed text-encre-douce">
            Les bornes hautes sont incluses&nbsp;: un colis de{' '}
            {formaterPoids(bareme.tranches[0].jusquAGrammes)} pile relève encore de la
            première tranche.
          </p>
        </div>

        <dl className="grid gap-4 self-start rounded-sm border border-filet bg-papier p-5 text-sm sm:p-6">
          <div>
            <dt className="font-semibold text-encre">Franco de port</dt>
            <dd className="mt-1 text-encre-douce">
              {bareme.seuilFrancoCentimes === null ? (
                <>Aucun franco de port sur cette zone.</>
              ) : (
                <>
                  Frais de port offerts à partir de{' '}
                  {formaterEuros(bareme.seuilFrancoCentimes)} de commande, emballage
                  isotherme compris.
                </>
              )}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-encre">Emballage isotherme</dt>
            <dd className="mt-1 text-encre-douce">
              {bareme.acceptePerissable ? (
                <>
                  {formaterEuros(bareme.supplementIsothermeCentimes)} par commande
                  contenant au moins un produit frais, une seule fois quel que soit le
                  nombre de références.
                </>
              ) : (
                <>Sans objet&nbsp;: les produits frais ne partent pas vers cette zone.</>
              )}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-encre">Produits frais</dt>
            <dd className="mt-1 text-encre-douce">
              {bareme.acceptePerissable
                ? 'Oui — expédiés sous emballage isotherme et chaîne du froid continue.'
                : 'Non — le panier refuse la commande avant paiement.'}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-encre">Délai indicatif</dt>
            <dd className="mt-1 text-encre-douce">
              {bareme.delaiIndicatif} après expédition.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
