import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import { CATALOGUE } from '@/donnees/catalogue';
import { formaterEuros } from '@/lib/argent';
import { prixLePlusBas, trouverProduitParSlug, trouverReferenceParSku } from '@/lib/catalogue';
import { regimeRetractation } from '@/lib/retractation';
import { typographier } from '@/lib/typographie';
import { LIBELLE_FAMILLE, type Conservation, type Produit } from '@/lib/types';

/**
 * La fiche produit.
 *
 * Quinze pages engendrées à la construction (`generateStaticParams`), servies
 * en HTML pur : aucune requête à l'exécution, aucune donnée à charger, aucun
 * JavaScript de page. `dynamic = 'force-static'` le grave — si une future
 * modification introduisait un appel dynamique, la construction échouerait au
 * lieu de basculer silencieusement la page en rendu à la demande, ce qui est
 * la manière habituelle de perdre une note de rapidité sans s'en apercevoir.
 *
 * Rien de la mention de rétractation n'est écrit ici : elle vient de
 * `regimeRetractation()`, seule source des phrases juridiques du projet.
 */

export const dynamic = 'force-static';

interface ProprietesPage {
  readonly params: Promise<{ readonly produit: string }>;
}

export function generateStaticParams(): { produit: string }[] {
  return CATALOGUE.map((produit) => ({ produit: produit.slug }));
}

export async function generateMetadata({ params }: ProprietesPage): Promise<Metadata> {
  const { produit: slug } = await params;
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    return {};
  }

  return {
    title: produit.nom,
    description: produit.resume,
    alternates: { canonical: `/boutique/${produit.slug}` },
  };
}

export default async function PageProduit({ params }: ProprietesPage) {
  const { produit: slug } = await params;
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    notFound();
  }

  const retractation = regimeRetractation(produit);

  return (
    <article className="mx-auto max-w-page px-5 pb-4 sm:px-8">
      <nav aria-label="Fil d’Ariane" className="pt-8 text-sm text-encre-douce">
        <Link
          href="/boutique"
          className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          Boutique
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/boutique#rayon-${produit.famille}`}
          className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          {LIBELLE_FAMILLE[produit.famille]}
        </Link>
      </nav>

      <header className="flex flex-wrap items-start gap-8 pt-8 pb-10 sm:gap-12 sm:pt-10">
        <Silhouette
          forme={produit.illustration.forme}
          teinte={produit.illustration.teinte}
          hauteur={168}
          className="h-24 w-auto shrink-0 sm:h-40"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
            {LIBELLE_FAMILLE[produit.famille]}
          </p>
          <h1 className="mt-4 text-titre font-semibold text-encre">{produit.nom}</h1>
          <p className="mt-4 max-w-lisible text-chapeau text-encre-douce">
            {produit.resume}
          </p>
          <p className="mt-4 text-sm text-encre-douce">
            Origine&nbsp;: {produit.origine}
          </p>
          <p className="mt-5 text-lg font-semibold text-encre">
            {produit.variantes.length > 1 ? 'à partir de ' : null}
            {formaterEuros(prixLePlusBas(produit))}
          </p>
        </div>
      </header>

      <div className="grid gap-x-12 gap-y-12 border-t border-filet pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <section aria-labelledby="titre-description">
            <h2 id="titre-description" className="sr-only">
              Description
            </h2>
            {produit.description.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre first:mt-0"
              >
                {paragraphe}
              </p>
            ))}
          </section>

          {produit.composition === undefined ? null : (
            <CompositionCoffret produit={produit} composition={produit.composition} />
          )}

          {produit.piecesEligibles === undefined ? null : (
            <PiecesEligibles piecesEligibles={produit.piecesEligibles} />
          )}

          <section aria-labelledby="titre-ingredients" className="mt-12">
            <h2 id="titre-ingredients" className="text-titre font-semibold text-encre">
              Ingrédients
            </h2>
            {produit.ingredients.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre-douce"
              >
                {paragraphe}
              </p>
            ))}
            <p className="mt-4 max-w-lisible leading-relaxed text-encre">
              <span className="font-semibold">Allergènes&nbsp;:</span>{' '}
              {produit.allergenes.join(', ')}.
            </p>
          </section>

          <section aria-labelledby="titre-conservation" className="mt-12">
            <h2 id="titre-conservation" className="text-titre font-semibold text-encre">
              Conservation
            </h2>
            <p className="mt-4 max-w-lisible leading-relaxed text-encre">
              {phraseConservation(produit.conservation)}
            </p>
            {produit.conseilConservation.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre-douce"
              >
                {paragraphe}
              </p>
            ))}
          </section>

          <section
            aria-labelledby="titre-retractation"
            className="mt-12 rounded-sm border border-filet bg-papier p-5 sm:p-6"
          >
            <h2
              id="titre-retractation"
              className="font-titre text-base font-semibold text-encre"
            >
              Droit de rétractation
            </h2>
            <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre">
              {retractation.phrase}
            </p>
          </section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <section aria-labelledby="titre-formats">
            <h2 id="titre-formats" className="text-titre font-semibold text-encre">
              Formats
            </h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Formats disponibles, prix toutes taxes comprises, poids expédié et
                  référence
                </caption>
                <thead>
                  <tr className="border-b border-filet text-left">
                    <th scope="col" className="pb-2 font-semibold text-encre">
                      Format
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold text-encre">
                      Prix
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold text-encre">
                      Poids
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produit.variantes.map((variante) => (
                    <tr key={variante.sku} className="border-b border-filet/60">
                      <td className="py-3 text-encre">
                        {variante.format}
                        <span className="block text-xs text-encre-douce">
                          {variante.sku}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-encre">
                        {formaterEuros(variante.prixCentimes)}
                      </td>
                      <td className="py-3 text-right text-encre-douce">
                        {variante.poidsGrammes}&nbsp;g
                        <span className="block text-xs">
                          {variante.stock} en stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-encre-douce">
              Le poids indiqué est celui du colis, emballage compris&nbsp;: c’est lui
              qui servira au calcul des frais de port.
            </p>

            <div className="mt-6 rounded-sm border border-filet bg-papier p-5">
              <button
                type="button"
                disabled
                aria-describedby="note-panier"
                className="w-full cursor-not-allowed rounded-sm border border-encre-douce/40 bg-creme px-4 py-2.5 text-sm font-semibold text-encre-douce"
              >
                Ajouter au panier
              </button>
              <p
                id="note-panier"
                className="mt-3 text-xs leading-relaxed text-encre-douce"
              >
                Bouton volontairement inerte&nbsp;: le panier arrive à la tranche
                suivante. Rien n’est caché derrière — pas de formulaire, pas de
                message d’erreur, pas de fausse mise en attente.
              </p>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}

/**
 * Le régime de conservation, dit en français.
 *
 * L'union discriminée paie ici : chaque forme a sa phrase, le compilateur
 * refuse d'en oublier une, et personne ne peut lire une DLC sur une conserve
 * stérilisée.
 */
function phraseConservation(conservation: Conservation): string {
  switch (conservation.type) {
    case 'stable':
      return typographier(
        conservation.note === undefined
          ? `Produit stable, à conserver à température ambiante. Date de durabilité minimale : ${String(conservation.ddmMois)} mois.`
          : `Produit stable, à conserver à température ambiante. Date de durabilité minimale : ${String(conservation.ddmMois)} mois (${conservation.note}).`,
      );
    case 'perissable':
      return typographier(
        `Produit périssable, expédié sous emballage isotherme et à maintenir au froid sans rupture de la chaîne du froid. Date limite de consommation : ${String(conservation.dlcJours)} jours.`,
      );
    case 'scelle-hygiene':
      return typographier(
        'Produit scellé sous atmosphère protectrice, à conserver à température ambiante.',
      );
  }
}

function CompositionCoffret({
  produit,
  composition,
}: {
  readonly produit: Produit;
  readonly composition: NonNullable<Produit['composition']>;
}) {
  const sommeDesPieces = composition.reduce(
    (total, piece) => total + piece.prixCentimes,
    0,
  );
  const prixDuCoffret = produit.variantes[0].prixCentimes;
  const ecart = prixDuCoffret - sommeDesPieces;

  return (
    <section aria-labelledby="titre-composition" className="mt-12">
      <h2 id="titre-composition" className="text-titre font-semibold text-encre">
        Ce que contient le coffret
      </h2>

      <ul className="mt-6 max-w-lisible">
        {composition.map((piece) => {
          const reference = trouverReferenceParSku(CATALOGUE, piece.sku);
          return (
            <li
              key={piece.sku}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-filet py-3 text-sm"
            >
              <span className="text-encre">
                {reference === undefined ? (
                  piece.nom
                ) : (
                  <Link
                    href={`/boutique/${reference.produit.slug}`}
                    className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                  >
                    {piece.nom}
                  </Link>
                )}
              </span>
              <span className="text-encre-douce">{formaterEuros(piece.prixCentimes)}</span>
            </li>
          );
        })}
      </ul>

      {/* Récapitulatif DÉRIVÉ : la somme et l'écart se calculent à partir des
          pièces et du prix saisi du coffret. La justification de cet écart est
          déjà dite plus haut, dans les mots du marchand ; on ne la répète pas,
          on donne les trois nombres. */}
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-filet pt-4 text-sm">
        <div>
          <dt className="text-encre-douce">Somme des pièces</dt>
          <dd className="font-semibold text-encre">{formaterEuros(sommeDesPieces)}</dd>
        </div>
        <div>
          <dt className="text-encre-douce">Prix du coffret</dt>
          <dd className="font-semibold text-encre">{formaterEuros(prixDuCoffret)}</dd>
        </div>
        <div>
          <dt className="text-encre-douce">Écart assumé</dt>
          <dd className="font-semibold text-terre">+{formaterEuros(ecart)}</dd>
        </div>
      </dl>

      <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
        L’écart couvre l’écrin, le calage, l’assemblage et le mot manuscrit. Il est
        écrit plutôt que laissé à deviner&nbsp;: les pièces se commandent aussi à
        l’unité, ce sont exactement les mêmes.
      </p>
    </section>
  );
}

function PiecesEligibles({
  piecesEligibles,
}: {
  readonly piecesEligibles: NonNullable<Produit['piecesEligibles']>;
}) {
  return (
    <section aria-labelledby="titre-pieces" className="mt-12">
      <h2 id="titre-pieces" className="text-titre font-semibold text-encre">
        Les pièces au choix
      </h2>

      <p className="mt-4 max-w-lisible leading-relaxed text-encre-douce">
        {piecesEligibles.length} références composent la liste, toutes stables et en
        petit format. Le prix du coffret est forfaitaire&nbsp;: il ne dépend pas des
        pièces retenues.
      </p>

      <ul className="mt-6 max-w-lisible">
        {piecesEligibles.map((sku) => {
          const reference = trouverReferenceParSku(CATALOGUE, sku);

          if (reference === undefined) {
            return null;
          }

          return (
            <li
              key={sku}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-filet py-3 text-sm"
            >
              <span className="text-encre">
                <Link
                  href={`/boutique/${reference.produit.slug}`}
                  className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                >
                  {reference.produit.nom}
                </Link>
                <span className="text-encre-douce">, {reference.variante.format}</span>
              </span>
              <span className="text-encre-douce">
                {formaterEuros(reference.variante.prixCentimes)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre">
        Trois informations de ce coffret ne peuvent pas être affichées ici, parce
        qu’elles n’existent qu’une fois la composition connue&nbsp;: les allergènes
        sont l’union de ceux des pièces choisies, le poids expédié en est la somme
        augmentée de l’écrin, et la date de durabilité minimale est la plus courte
        d’entre elles. Les trois se calculent à la commande et figurent sur le
        récapitulatif, avant paiement.
      </p>
    </section>
  );
}
