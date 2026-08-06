import type { Metadata } from 'next';

import { CarteProduit } from '@/composants/boutique/CarteProduit';
import { BornesPrixVitrine } from '@/composants/surcouche/FeuillesVitrine';
import { CATALOGUE } from '@/donnees/catalogue';
import { FAMILLES, LIBELLE_FAMILLE } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Boutique',
  description:
    'Les quinze références de la Maison Vaubrune, rangées par famille : huiles ' +
    'et vinaigres, conserves salées, miels et confitures, épicerie sèche, ' +
    'infusions, frais et coffrets.',
  alternates: { canonical: '/boutique' },
};

/**
 * Le rayon, rangé par famille.
 *
 * Pourquoi PAS de filtres. Un filtre par famille est un composant client : de
 * l'état, un gestionnaire d'événement, du JavaScript envoyé à tous les
 * visiteurs — pour quinze produits qui tiennent sur un écran et demi. La même
 * fonction est ici rendue par sept sections ancrées et un sommaire de liens
 * ordinaires : cela marche sans JavaScript, cela s'indexe, cela se partage
 * (« /boutique#rayon-coffrets » est une adresse), et cela ne coûte pas un
 * octet de bundle. Le jour où le catalogue comptera deux cents références, le
 * filtre se justifiera ; il n'est pas là aujourd'hui parce qu'il ne sert à
 * rien aujourd'hui.
 *
 * Le regroupement est calculé une fois au chargement du module, donc à la
 * construction : la page est entièrement statique.
 */
const RAYONS = FAMILLES.map((famille) => ({
  famille,
  ancre: `rayon-${famille}`,
  produits: CATALOGUE.filter((produit) => produit.famille === famille),
})).filter((rayon) => rayon.produits.length > 0);

/**
 * Tous les formats du catalogue, réduits à ce dont la ligne des bornes a
 * besoin. Le calcul lui-même a quitté cette page en C6 : les bornes doivent
 * suivre la surcouche marchand comme les cartes, sans quoi le pied du rayon
 * contredirait les prix affichés juste au-dessus.
 */
const FORMATS = CATALOGUE.flatMap((produit) =>
  produit.variantes.map((variante) => ({
    slug: produit.slug,
    sku: variante.sku,
    prixCentimes: variante.prixCentimes,
  })),
);

const NOMBRE_FORMATS = FORMATS.length;

export default function PageBoutique() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Le rayon
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">Boutique</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          {CATALOGUE.length} références rangées en {RAYONS.length} familles. Les prix
          sont indiqués toutes taxes comprises, hors frais de port.
        </p>
        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Le panier, la commande et le paiement de démonstration vont jusqu’au
          bout du parcours. Rappel utile&nbsp;: la maison est fictive, aucune
          commande ne serait expédiée et aucun montant n’est encaissé.
        </p>
      </section>

      <nav aria-labelledby="titre-familles" className="border-y border-filet py-5">
        <h2
          id="titre-familles"
          className="font-titre text-sm font-semibold tracking-[0.08em] text-encre uppercase"
        >
          Familles
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {RAYONS.map((rayon) => (
            <li key={rayon.famille}>
              <a
                href={`#${rayon.ancre}`}
                className="text-sm text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
              >
                {LIBELLE_FAMILLE[rayon.famille]}{' '}
                <span className="text-xs text-ocre">({rayon.produits.length})</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {RAYONS.map((rayon) => (
        <section
          key={rayon.famille}
          id={rayon.ancre}
          aria-labelledby={`titre-${rayon.ancre}`}
          className="scroll-mt-8 pt-12 pb-4 sm:pt-16"
        >
          <h2
            id={`titre-${rayon.ancre}`}
            className="text-titre font-semibold text-encre"
          >
            {LIBELLE_FAMILLE[rayon.famille]}
          </h2>

          <ul className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {rayon.produits.map((produit) => (
              <CarteProduit key={produit.slug} produit={produit} />
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-14 mb-4 text-sm text-encre-douce tabular-nums">
        {NOMBRE_FORMATS} formats vendables au total, de{' '}
        <BornesPrixVitrine articles={FORMATS} />.
      </p>
    </div>
  );
}
