'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { formaterEuros } from '@/lib/argent';
import { unionAllergenes, type ArticlePanier } from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';

/**
 * L'AJOUT AU PANIER, sur la fiche produit.
 *
 * Deux comportements dans un seul composant, parce que c'est un seul geste
 * pour l'acheteur — « je prends celui-ci » :
 *
 * - CAS ORDINAIRE : un format à choisir quand le produit en a plusieurs, une
 *   quantité, un bouton.
 * - COFFRET PERSONNALISABLE : la même chose, précédée du choix des pièces. Le
 *   nombre exact est imposé par le format retenu (trois ou cinq), le bouton
 *   reste inerte tant qu'il n'est pas atteint, et les allergènes de la
 *   sélection s'affichent au fur et à mesure — c'est la seule information du
 *   coffret qui n'existe pas avant que le client ait choisi, et la fiche
 *   promet qu'elle sera donnée avant paiement.
 *
 * La quantité est bornée par le stock À LA SAISIE comme au réducteur. Les deux
 * ne font pas double emploi : ici c'est un confort d'interface, là-bas c'est
 * l'invariant. Le second tient même si le premier est contourné.
 */

export function BoutonAjouter({
  articles,
  pieces,
}: {
  /** Les variantes de CE produit, projetées côté serveur. */
  readonly articles: readonly ArticlePanier[];
  /** Les pièces éligibles d'un coffret personnalisable ; vide sinon. */
  readonly pieces: readonly ArticlePanier[];
}) {
  const { envoyer } = usePanier();
  const identifiant = useId();

  const [skuChoisi, setSkuChoisi] = useState(articles[0]?.sku ?? '');
  const [quantite, setQuantite] = useState(1);
  const [choisies, setChoisies] = useState<readonly string[]>([]);
  const [confirmation, setConfirmation] = useState(false);

  const article = articles.find((candidat) => candidat.sku === skuChoisi) ?? articles[0];

  /* Un produit sans format vendable n'existe pas (le type `Produit` l'impose)
     mais le compilateur ne le sait pas d'un tableau : plutôt qu'une assertion,
     on rend un écran honnête. */
  if (article === undefined) {
    return null;
  }

  const requises = article.piecesRequises;
  const composeParLeClient = requises !== null && pieces.length > 0;
  const compositionComplete = !composeParLeClient || choisies.length === requises;
  const epuise = article.stock <= 0;
  const activable = !epuise && compositionComplete;

  const basculerPiece = (sku: string) => {
    setConfirmation(false);
    setChoisies((actuelles) =>
      actuelles.includes(sku)
        ? actuelles.filter((candidat) => candidat !== sku)
        : [...actuelles, sku],
    );
  };

  const ajouter = () => {
    envoyer({
      type: 'ajouter',
      sku: article.sku,
      quantite,
      ...(composeParLeClient ? { composition: choisies } : {}),
    });

    setChoisies([]);
    setQuantite(1);
    setConfirmation(true);
  };

  return (
    <div className="rounded-sm border border-filet bg-papier p-5">
      {articles.length > 1 ? (
        <div>
          <label
            htmlFor={`${identifiant}-format`}
            className="block text-xs font-semibold tracking-[0.12em] text-encre uppercase"
          >
            Format
          </label>
          <select
            id={`${identifiant}-format`}
            value={article.sku}
            onChange={(evenement) => {
              setSkuChoisi(evenement.target.value);
              setQuantite(1);
              setChoisies([]);
              setConfirmation(false);
            }}
            className="mt-2 w-full rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre"
          >
            {articles.map((candidat) => (
              <option key={candidat.sku} value={candidat.sku}>
                {candidat.format} — {formaterEuros(candidat.prixCentimes)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-encre">
          {article.format} — <strong>{formaterEuros(article.prixCentimes)}</strong>
        </p>
      )}

      {composeParLeClient ? (
        <ChoixDesPieces
          identifiant={identifiant}
          requises={requises}
          pieces={pieces}
          choisies={choisies}
          basculer={basculerPiece}
        />
      ) : null}

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor={`${identifiant}-quantite`}
            className="block text-xs font-semibold tracking-[0.12em] text-encre uppercase"
          >
            Quantité
          </label>
          <input
            id={`${identifiant}-quantite`}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, article.stock)}
            step={1}
            value={quantite}
            disabled={epuise}
            onChange={(evenement) => {
              setConfirmation(false);
              setQuantite(borner(evenement.target.value, article.stock));
            }}
            className="mt-2 w-24 rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre tabular-nums"
          />
        </div>

        <p className="text-xs leading-relaxed text-encre-douce">
          {epuise ? 'Épuisé pour ce format.' : `${String(article.stock)} en stock.`}
        </p>
      </div>

      <button
        type="button"
        onClick={ajouter}
        disabled={!activable}
        aria-describedby={activable ? undefined : `${identifiant}-empechement`}
        className="mt-5 w-full rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme hover:bg-olive-clair disabled:cursor-not-allowed disabled:border-encre-douce/40 disabled:bg-creme disabled:text-encre-douce"
      >
        Ajouter au panier
      </button>

      {activable ? null : (
        <p
          id={`${identifiant}-empechement`}
          className="mt-3 text-xs leading-relaxed text-encre-douce"
        >
          {epuise
            ? 'Ce format est épuisé : il ne peut pas être ajouté au panier.'
            : `Choisissez ${String(requises)} pièces pour composer ce coffret.`}
        </p>
      )}

      <p aria-live="polite" className="mt-3 text-xs leading-relaxed text-olive">
        {confirmation ? (
          <>
            Ajouté au panier.{' '}
            <Link
              href="/panier"
              className="font-semibold underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
            >
              Voir le panier
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Le nombre saisi, ramené entre 1 et le stock.
 *
 * Une saisie vide ou non numérique rend 1 plutôt que zéro : le champ ne doit
 * jamais afficher un état à partir duquel le bouton d'ajout ne ferait rien.
 */
function borner(saisie: string, stock: number): number {
  const valeur = Number.parseInt(saisie, 10);

  if (Number.isNaN(valeur)) {
    return 1;
  }

  return Math.min(Math.max(1, valeur), Math.max(1, stock));
}

function ChoixDesPieces({
  identifiant,
  requises,
  pieces,
  choisies,
  basculer,
}: {
  readonly identifiant: string;
  readonly requises: number;
  readonly pieces: readonly ArticlePanier[];
  readonly choisies: readonly string[];
  readonly basculer: (sku: string) => void;
}) {
  const allergenes = unionAllergenes(choisies, pieces);

  return (
    <fieldset className="mt-5 border-0 p-0">
      <legend className="text-xs font-semibold tracking-[0.12em] text-encre uppercase">
        Composition — {requises} pièces à choisir
      </legend>

      <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {pieces.map((piece) => {
          const coche = choisies.includes(piece.sku);

          return (
            <li key={piece.sku}>
              <label className="flex items-baseline gap-2.5 text-sm text-encre">
                <input
                  type="checkbox"
                  checked={coche}
                  onChange={() => {
                    basculer(piece.sku);
                  }}
                  className="mt-1 shrink-0 accent-olive"
                />
                <span>
                  {piece.nomProduit}
                  <span className="text-encre-douce">, {piece.format}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p
        aria-live="polite"
        className="mt-3 text-xs leading-relaxed text-encre-douce"
        id={`${identifiant}-compte`}
      >
        {choisies.length} pièce{choisies.length > 1 ? 's' : ''} sur {requises}
        {choisies.length > requises ? ' — décochez-en pour revenir au compte.' : null}
      </p>

      {choisies.length === 0 ? null : (
        <p className="mt-2 text-xs leading-relaxed text-encre">
          <span className="font-semibold">Allergènes de cette composition&nbsp;:</span>{' '}
          {allergenes.join(', ')}.
        </p>
      )}
    </fieldset>
  );
}
