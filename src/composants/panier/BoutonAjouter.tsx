'use client';

import { useId, useState, type ReactNode } from 'react';

import { formaterEuros } from '@/lib/argent';
import {
  estDisponibleAffiche,
  prixAffiche,
  stockAffiche,
} from '@/lib/catalogue-navigateur';
import { useSurcouche } from '@/lib/contexte-surcouche';
import { unionAllergenes, type ArticlePanier } from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import { sousTotalDesLignes } from '@/lib/panier/totaux';
import { TiroirAjout } from '@/composants/panier/TiroirAjout';

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
 *
 * ---------------------------------------------------------------------------
 * AJOUT C6 — la surcouche marchand, et jusqu'où elle porte (décision D24)
 * ---------------------------------------------------------------------------
 *
 * Ce bloc est sur la fiche produit, donc dans la VITRINE : il affiche les prix
 * et les stocks corrigés par le visiteur dans `/gestion/catalogue`, comme le
 * reste de la fiche. Le panier et le tunnel, eux, restent aux prix du catalogue
 * versionné — le serveur ne fait jamais confiance au navigateur, et `/commande`
 * porte la note qui l'explique.
 *
 * Deux conséquences précises sur ce composant :
 *
 * - LA DISPONIBILITÉ ÉTEINT LE BOUTON, avec son motif. C'est la seule
 *   modification de vitrine qui interdit quelque chose, et elle est sûre parce
 *   qu'elle RETRANCHE : un produit retiré de la vente ne peut pas entrer au
 *   panier, jamais l'inverse.
 * - LA QUANTITÉ EST BORNÉE PAR LE PLUS PETIT des deux stocks, celui de la
 *   surcouche et celui du catalogue livré. Baisser un stock dans l'espace de
 *   gestion contraint donc réellement l'ajout ; l'augmenter n'élargit rien,
 *   parce que le réducteur du panier ne connaît que le stock d'origine
 *   (décision D17 : il reçoit `Record<SKU, stock>` calculé côté serveur) et
 *   ramènerait silencieusement la quantité. Deux nombres qui se contredisent
 *   valent moins qu'un seul qui restreint.
 */

export function BoutonAjouter({
  articles,
  pieces,
  meubles,
  prix,
}: {
  /** Les variantes de CE produit, projetées côté serveur. */
  readonly articles: readonly ArticlePanier[];
  /** Les pièces éligibles d'un coffret personnalisable ; vide sinon. */
  readonly pieces: readonly ArticlePanier[];
  /** Suggestions et reassurance, RENDUES PAR LE SERVEUR (voir MeublesTiroir). */
  readonly meubles: ReactNode;
  /** Un prix par reference — le corollaire de D17, six fois moins lourd que la projection. */
  readonly prix: Readonly<Record<string, number>>;
}) {
  const { etat, envoyer } = usePanier();
  const { surcouche } = useSurcouche();
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

  const disponible = estDisponibleAffiche(surcouche, article.slug);
  const stockVitrine = stockAffiche(surcouche, article.slug, article.sku, article.stock);
  /* Le plus petit des deux stocks : voir l'en-tête, section « décision D24 ». */
  const stockAjoutable = Math.min(stockVitrine, article.stock);

  const requises = article.piecesRequises;
  const composeParLeClient = requises !== null && pieces.length > 0;
  const compositionComplete = !composeParLeClient || choisies.length === requises;
  const epuise = stockAjoutable <= 0;
  const activable = disponible && !epuise && compositionComplete;

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
            className="etiquette block text-encre"
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
                {candidat.format} —{' '}
                {formaterEuros(
                  prixAffiche(
                    surcouche,
                    candidat.slug,
                    candidat.sku,
                    candidat.prixCentimes,
                  ),
                )}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-encre">
          {article.format} —{' '}
          <strong className="tabular-nums">
            {formaterEuros(
              prixAffiche(surcouche, article.slug, article.sku, article.prixCentimes),
            )}
          </strong>
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
            className="etiquette block text-encre"
          >
            Quantité
          </label>
          <input
            id={`${identifiant}-quantite`}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, stockAjoutable)}
            step={1}
            value={quantite}
            disabled={epuise || !disponible}
            onChange={(evenement) => {
              setConfirmation(false);
              setQuantite(borner(evenement.target.value, stockAjoutable));
            }}
            className="mt-2 w-24 rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre tabular-nums"
          />
        </div>

        <p className="text-xs leading-relaxed text-encre-douce tabular-nums">
          {epuise ? 'Épuisé pour ce format.' : `${String(stockVitrine)} en stock.`}
        </p>
      </div>

      <button
        type="button"
        onClick={ajouter}
        disabled={!activable}
        aria-describedby={activable ? undefined : `${identifiant}-empechement`}
        className="mt-5 w-full rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme hover:border-encre hover:bg-encre disabled:cursor-not-allowed disabled:border-encre-douce/40 disabled:bg-creme disabled:text-encre-douce"
      >
        Ajouter au panier
      </button>

      {activable ? null : (
        <p
          id={`${identifiant}-empechement`}
          className="mt-3 text-xs leading-relaxed text-encre-douce"
        >
          {motifEmpechement(disponible, epuise, requises)}
        </p>
      )}

      {/* LE RETOUR D'AJOUT A CHANGÉ DE NATURE (C23).

          Ici vivait un `<p aria-live="polite">` de douze pixels, en olive, sans
          fond ni icône. Il était correct, annoncé aux lecteurs d'écran, jamais
          effacé — et mesuré sur le site publié après un vrai clic : ZÉRO pixel
          visible dans la fenêtre. Il est REMPLACÉ, pas doublé : un dialogue
          modal annonce déjà son nom et son contenu à l'ouverture, et une région
          vivante en plus produirait une double annonce. */}
      <TiroirAjout
        ouvert={confirmation}
        fermer={() => setConfirmation(false)}
        nom={article.nomProduit}
        format={article.format}
        prixCentimes={article.prixCentimes}
        sousTotalCentimes={sousTotalDesLignes(etat.lignes, prix)}
        meubles={meubles}
      />
    </div>
  );
}

/**
 * Pourquoi le bouton d'ajout est éteint, dit en français.
 *
 * L'ordre des trois cas est celui de leur portée : un produit retiré de la
 * vente ne se commande d'aucun format, un format épuisé n'empêche pas les
 * autres, une composition incomplète ne tient qu'à un clic de plus.
 */
function motifEmpechement(
  disponible: boolean,
  epuise: boolean,
  requises: number | null,
): string {
  if (!disponible) {
    return 'Ce produit a été retiré de la vente depuis l’espace de gestion de la démonstration : il ne peut pas être ajouté au panier. Rendez-le disponible dans « Catalogue », ou réinitialisez le jeu d’essai.';
  }

  if (epuise) {
    return 'Ce format est épuisé : il ne peut pas être ajouté au panier.';
  }

  return `Choisissez ${String(requises)} pièces pour composer ce coffret.`;
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
      <legend className="etiquette text-encre">
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
