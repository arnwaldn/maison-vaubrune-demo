'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PastilleEtat } from '@/composants/gestion/PastilleEtat';
import { formaterEuros } from '@/lib/argent';
import { stockAffiche } from '@/lib/catalogue-navigateur';
import { lireCommandes } from '@/lib/commandes/depot-local';
import { ETATS_COMMANDE, type Commande, type EtatCommande } from '@/lib/commandes/etats';
import { useSurcouche } from '@/lib/contexte-surcouche';
import type { ProduitMarchand } from '@/lib/gestion/projection-marchand';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { typographier } from '@/lib/typographie';

/**
 * LE TABLEAU DE BORD — quatre compteurs, un chiffre d'affaires, les stocks bas.
 *
 * Tout ce qu'il affiche vient du navigateur : les commandes du stockage local
 * fusionnées au jeu d'essai, les stocks du catalogue corrigés par la surcouche.
 * Le rendu serveur ne peut donc rien en dire, et l'écran RÉSERVE SA PLACE tant
 * que la lecture n'a pas eu lieu — même patron et même raison que le panier de
 * C4 : afficher « aucune commande » à quelqu'un qui en a six, même deux
 * dixièmes de seconde, est un mensonge que l'œil attrape.
 *
 * LE CHIFFRE D'AFFAIRES EXCLUT LES COMMANDES ANNULÉES. Ce n'est pas un détail
 * de présentation : une commande annulée a été remboursée, elle n'est pas du
 * chiffre d'affaires, et l'inclure donnerait au marchand un nombre qu'aucune
 * comptabilité ne reconnaîtrait. Le montant annulé est affiché à part, parce
 * qu'il se surveille aussi.
 */

/** Sous ce seuil, un format est signalé comme à réapprovisionner. */
const SEUIL_STOCK_BAS = 10;

export function IlotTableauDeBord({
  amorce,
  produits,
}: {
  readonly amorce: readonly Commande[];
  readonly produits: readonly ProduitMarchand[];
}) {
  const { surcouche, pretALEmploi: surcouchePrete } = useSurcouche();
  const [commandes, setCommandes] = useState<readonly Commande[] | null>(null);

  useEffect(() => {
    const stockage = stockageLocal();

    setCommandes(stockage === null ? amorce : lireCommandes(stockage, amorce));
  }, [amorce]);

  if (commandes === null || !surcouchePrete) {
    return (
      <div
        aria-hidden="true"
        data-place-reservee=""
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  const parEtat = compterParEtat(commandes);
  const chiffreAffaires = commandes
    .filter((commande) => commande.etat !== 'annulee')
    .reduce((total, commande) => total + commande.totaux.total, 0);
  const montantAnnule = commandes
    .filter((commande) => commande.etat === 'annulee')
    .reduce((total, commande) => total + commande.totaux.total, 0);

  const stocksBas = produits.flatMap((produit) =>
    produit.variantes
      .map((variante) => ({
        produit,
        variante,
        stock: stockAffiche(surcouche, produit.slug, variante.sku, variante.stock),
      }))
      .filter((ligne) => ligne.stock < SEUIL_STOCK_BAS),
  );

  return (
    <div className="mt-10 min-h-96 space-y-12 pb-4">
      <section aria-labelledby="titre-compteurs" className="panneau">
        <h2 id="titre-compteurs" className="text-titre text-encre">
          Les commandes, par état
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETATS_COMMANDE.map((etat) => (
            <li
              key={etat}
              className="rounded-sm border border-filet bg-papier px-4 py-4"
            >
              <PastilleEtat etat={etat} />
              <p className="mt-3 font-mono text-3xl font-medium text-encre tabular-nums">
                {parEtat[etat]}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-4 registre text-encre-douce">
          {commandes.length} commandes au total.
        </p>
      </section>

      <section aria-labelledby="titre-chiffre" className="panneau">
        <h2 id="titre-chiffre" className="text-titre text-encre">
          Chiffre d’affaires
        </h2>

        <dl className="mt-6 flex flex-wrap gap-x-12 gap-y-5">
          <div>
            <dt className="etiquette text-encre-douce">
              Encaissé, hors annulations
            </dt>
            <dd className="mt-2 font-mono text-3xl font-medium text-olive tabular-nums">
              {formaterEuros(chiffreAffaires)}
            </dd>
          </div>
          <div>
            <dt className="etiquette text-encre-douce">
              Annulé
            </dt>
            <dd className="mt-2 font-mono text-3xl font-medium text-encre-douce tabular-nums">
              {formaterEuros(montantAnnule)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Frais de port compris, toutes taxes comprises. Les commandes annulées sont
          exclues du premier montant&nbsp;: une commande annulée est remboursée, elle
          n’est pas du chiffre d’affaires.
        </p>
      </section>

      <section aria-labelledby="titre-stocks" className="panneau">
        <h2 id="titre-stocks" className="text-titre text-encre">
          Stocks bas
        </h2>

        <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Les formats dont il reste moins de {SEUIL_STOCK_BAS} unités. Les stocks
          affichés sont ceux du catalogue, corrigés par vos essais.
        </p>

        {stocksBas.length === 0 ? (
          <p className="mt-6 text-sm text-encre">
            Aucun format sous le seuil. Rien à réapprovisionner.
          </p>
        ) : (
          <ul className="mt-6 max-w-lisible border-t border-filet">
            {stocksBas.map(({ produit, variante, stock }) => (
              <li
                key={variante.sku}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-filet py-3 text-sm"
              >
                <span className="text-encre">
                  <Link
                    href={`/boutique/${produit.slug}`}
                    className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                  >
                    {produit.nom}
                  </Link>
                  <span className="text-encre-douce">, {variante.format}</span>
                </span>
                <span className="font-mono font-medium text-terre tabular-nums">
                  {stock} en stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-raccourcis" className="panneau">
        <h2 id="titre-raccourcis" className="text-titre text-encre">
          Où aller ensuite
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {RACCOURCIS.map((raccourci) => (
            <li key={raccourci.adresse}>
              <Link
                href={raccourci.adresse}
                className="block h-full rounded-sm border border-filet bg-papier px-4 py-4 no-underline hover:border-olive"
              >
                <span className="block sous-titre text-encre">
                  {raccourci.libelle}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-encre-douce">
                  {raccourci.texte}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const RACCOURCIS = [
  {
    adresse: '/gestion/commandes',
    libelle: 'Commandes',
    texte:
      'La liste complète, triée de la plus récente à la plus ancienne, avec le ' +
      'filtre par état et le détail de chacune.',
  },
  {
    adresse: '/gestion/catalogue',
    libelle: 'Catalogue',
    texte:
      typographier('Les quinze références et leurs vingt-trois formats : prix, stock, ') +
      'disponibilité, mise en avant, résumé. Export en JSON.',
  },
  {
    adresse: '/gestion/modeles-de-courriels',
    libelle: 'Modèles de courriels',
    texte:
      'Les cinq messages qu’une boutique livrée expédie, avec leurs ' +
      'emplacements à compléter. La démonstration n’en envoie aucun.',
  },
  {
    adresse: '/gestion/prise-en-main',
    libelle: 'Prise en main',
    texte:
      typographier('Le mode d’emploi écrit : tenir le catalogue, suivre une commande, ') +
      'retrouver les documents, exporter.',
  },
] as const;

/**
 * Un compteur par état, les quatre présents même à zéro.
 *
 * Compter uniquement les états rencontrés ferait disparaître la colonne
 * « Annulée » d'un tableau de bord sans annulation — donc perdre l'information
 * qu'il n'y en a aucune, qui est justement celle qu'on regarde.
 */
function compterParEtat(
  commandes: readonly Commande[],
): Record<EtatCommande, number> {
  const comptes: Record<EtatCommande, number> = {
    payee: 0,
    preparee: 0,
    expediee: 0,
    annulee: 0,
  };

  for (const commande of commandes) {
    comptes[commande.etat] += 1;
  }

  return comptes;
}
