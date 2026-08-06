'use client';

import Link from 'next/link';
import { useId } from 'react';

import { formaterEuros } from '@/lib/argent';
import {
  trouverArticle,
  unionAllergenes,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import type { LigneCalculee } from '@/lib/panier/totaux';

/**
 * UNE LIGNE DU PANIER, modifiable.
 *
 * Elle n'additionne rien. Le sous-total qu'elle affiche vient de
 * `calculerTotaux()` (champ `sousTotalCentimes` de la ligne calculée), comme
 * tous les montants du tunnel — la règle est écrite en tête de `totaux.ts`.
 * Un `prix × quantité` posé ici serait un second calcul, donc une seconde
 * vérité, donc un écart possible avec le récapitulatif de commande.
 *
 * La composition d'un coffret « Composez le vôtre » est affichée intégralement,
 * avec l'union de ses allergènes : c'est cette ligne-là, et pas la fiche
 * produit, qui dit ce que le client a réellement mis dans son panier.
 */

export function LignePanier({
  calculee,
  catalogue,
}: {
  readonly calculee: LigneCalculee;
  readonly catalogue: readonly ArticlePanier[];
}) {
  const { envoyer } = usePanier();
  const identifiant = useId();
  const { article, ligne, cle } = calculee;

  return (
    <li className="grid gap-x-6 gap-y-3 border-b border-filet py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-encre">
          <Link
            href={`/boutique/${article.slug}`}
            className="font-semibold underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            {article.nomProduit}
          </Link>
          <span className="text-encre-douce">, {article.format}</span>
        </p>

        <p className="mt-1 text-sm text-encre-douce">
          {formaterEuros(article.prixCentimes)} l’unité
        </p>

        {ligne.composition === undefined ? null : (
          <Composition composition={ligne.composition} catalogue={catalogue} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`${identifiant}-quantite`}
            className="text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase"
          >
            Qté
          </label>
          <input
            id={`${identifiant}-quantite`}
            type="number"
            inputMode="numeric"
            min={1}
            max={article.stock}
            step={1}
            value={ligne.quantite}
            onChange={(evenement) => {
              envoyer({
                type: 'changerQuantite',
                cle,
                quantite: Number.parseInt(evenement.target.value, 10),
              });
            }}
            /* Le champ vidé au clavier laisse le réducteur indifférent (voir
               `fixerQuantite`) : la quantité tenue est donc l'ancienne, mais le
               champ, lui, est resté vide à l'écran. Ce renvoi de la quantité
               courante à la sortie du champ recrée un état neuf, ce qui suffit
               à React pour remettre le nombre dans le champ. */
            onBlur={() => {
              envoyer({ type: 'changerQuantite', cle, quantite: ligne.quantite });
            }}
            className="w-20 rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre tabular-nums"
          />
        </div>

        <p className="text-base font-semibold text-encre tabular-nums">
          {formaterEuros(calculee.sousTotalCentimes)}
        </p>

        <button
          type="button"
          onClick={() => {
            envoyer({ type: 'retirer', cle });
          }}
          className="text-xs text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          Retirer
          <span className="sr-only">
            {' '}
            {article.nomProduit}, {article.format}
          </span>
        </button>
      </div>
    </li>
  );
}

/**
 * La composition d'un coffret personnalisé.
 *
 * Une pièce absente du catalogue courant ne s'affiche pas : elle a été retirée
 * de l'étal depuis que le coffret a été composé. Le coffret reste commandable
 * — son prix est forfaitaire et son poids est celui de son format — mais on ne
 * prétend pas nommer ce qu'on ne trouve plus.
 */
function Composition({
  composition,
  catalogue,
}: {
  readonly composition: readonly string[];
  readonly catalogue: readonly ArticlePanier[];
}) {
  const allergenes = unionAllergenes(composition, catalogue);

  return (
    <div className="mt-3 border-l-2 border-filet pl-4">
      <p className="text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase">
        Composition
      </p>
      <ul className="mt-1.5 space-y-0.5 text-sm text-encre-douce">
        {composition.map((sku) => {
          const piece = trouverArticle(catalogue, sku);

          return piece === undefined ? null : (
            <li key={sku}>
              {piece.nomProduit}, {piece.format}
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-xs text-encre-douce">
        Allergènes&nbsp;: {allergenes.join(', ')}.
      </p>
    </div>
  );
}
