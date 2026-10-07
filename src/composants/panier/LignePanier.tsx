'use client';

import Link from 'next/link';
import { useId, type ReactNode } from 'react';

import { formaterEuros } from '@/lib/argent';
import {
  trouverArticle,
  unionAllergenes,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import type { LigneCalculee } from '@/lib/panier/totaux';
import { typographier } from '@/lib/typographie';

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
 *
 * LA MINIATURE (C27) vient du serveur, en nœud déjà rendu (voir
 * `Miniatures.tsx`) : cet îlot ne fabrique aucun chemin d'image. Elle n'est
 * pas cliquable — le nom porte déjà le lien vers la fiche.
 *
 * LA QUANTITÉ EST UN « − [champ] + » (C27). Le champ numérique RESTE : on peut
 * toujours taper « 12 » au lieu d'appuyer onze fois, et il garde son libellé,
 * sa sémantique `spinbutton` et son correctif `onBlur`. Les deux boutons
 * réemploient le cadre `.vignette-pas` des vignettes (contour rentré, cibles de
 * 44 px). DIFFÉRENCE ASSUMÉE avec la vignette : ici « − » est éteint à 1 au lieu
 * de retirer la ligne — « Retirer » est juste à côté, et une ligne perdue par un
 * appui de trop coûte plus cher dans un panier qu'en vitrine.
 */

export function LignePanier({
  calculee,
  catalogue,
  miniature,
}: {
  readonly calculee: LigneCalculee;
  readonly catalogue: readonly ArticlePanier[];
  readonly miniature: ReactNode;
}) {
  const { envoyer } = usePanier();
  const identifiant = useId();
  const { article, ligne, cle } = calculee;
  const designation = `${article.nomProduit}, ${article.format}`;

  const changer = (quantite: number) => {
    envoyer({ type: 'changerQuantite', cle, quantite });
  };

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-filet py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-6">
      {miniature}

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

        {/* Un prix unitaire est une DONNÉE : il part au registre, comme tout
            chiffre du tunnel. */}
        <p className="registre mt-1.5 text-encre-douce">
          {formaterEuros(article.prixCentimes)} l’unité
        </p>

        {ligne.composition === undefined ? null : (
          <Composition composition={ligne.composition} catalogue={catalogue} />
        )}
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
        <div className="flex items-center gap-2">
          <label htmlFor={`${identifiant}-quantite`} className="etiquette text-encre-douce">
            Qté
          </label>
          <div
            role="group"
            aria-label={typographier(`Quantité de ${designation}`)}
            className="vignette-pas vignette-pas--panier"
          >
            <button
              type="button"
              onClick={() => {
                if (ligne.quantite > 1) {
                  changer(ligne.quantite - 1);
                }
              }}
              aria-disabled={ligne.quantite <= 1}
              aria-label={typographier(`Retirer un exemplaire de ${designation}`)}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                <path d="M2 6h8" />
              </svg>
            </button>
            <input
              id={`${identifiant}-quantite`}
              type="number"
              inputMode="numeric"
              min={1}
              max={article.stock}
              step={1}
              value={ligne.quantite}
              onChange={(evenement) => {
                changer(Number.parseInt(evenement.target.value, 10));
              }}
              /* Le champ vidé au clavier laisse le réducteur indifférent (voir
                 `fixerQuantite`) : la quantité tenue est donc l'ancienne, mais le
                 champ, lui, est resté vide à l'écran. Ce renvoi de la quantité
                 courante à la sortie du champ recrée un état neuf, ce qui suffit
                 à React pour remettre le nombre dans le champ. */
              onBlur={() => {
                changer(ligne.quantite);
              }}
              className="registre tabular-nums text-encre"
            />
            <button
              type="button"
              onClick={() => {
                if (ligne.quantite < article.stock) {
                  changer(ligne.quantite + 1);
                }
              }}
              aria-disabled={ligne.quantite >= article.stock}
              aria-label={typographier(`Ajouter un exemplaire de ${designation}`)}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                <path d="M2 6h8M6 2v8" />
              </svg>
            </button>
          </div>
        </div>

        {/* LE SOUS-TOTAL D'UNE LIGNE — mono, chiffres tabulaires.
            La « largeur figée » que demande la tranche est celle des CHIFFRES,
            et `tabular-nums` la donne : tous les chiffres de cette police ont la
            même chasse, donc 111,11 € et 999,99 € occupent exactement la même
            place. Une largeur minimale sur ce parent a été essayée puis RETIRÉE
            — elle ne changeait rien de mesurable, relevé à l'appui
            (`preuves/c16/largeur-montants.mjs`).
            La clé React est le montant lui-même : quand il change, React
            échange le nœud, et `@starting-style` fait fondre le NOMBRE SEUL —
            zéro état, zéro minuterie, c'est le patron de la pastille de C13. */}
        <p className="ml-auto text-right">
          <span
            key={calculee.sousTotalCentimes}
            data-chiffre=""
            className="font-mono text-base text-encre tabular-nums"
          >
            {formaterEuros(calculee.sousTotalCentimes)}
          </span>
        </p>

        {/* SUR TÉLÉPHONE, « RETIRER » PASSE TOUJOURS À LA LIGNE (C27). Sur une
            même rangée que « Qté − N + » et le sous-total, il ne tenait que si
            le montant était court : « 644,00 € » faisait passer « Retirer » à la
            ligne sur les polices de Linux et pas sur celles de Windows, et les
            sous-totaux cessaient de former une colonne (intégration continue
            rouge, 07/10). Le saut est donc imposé — une enveloppe de largeur
            pleine, calée à droite — au lieu d'être laissé aux métriques de
            police : le sous-total finit toujours au bord droit de la rangée. Le
            bouton garde sa taille naturelle : pas de zone de retrait invisible
            sur toute la largeur. */}
        <div className="basis-full text-right sm:basis-auto">
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
      <p className="etiquette text-encre-douce">Composition</p>
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
