'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { formaterEuros } from '@/lib/argent';
import { useSurcouche } from '@/lib/contexte-surcouche';
import {
  actionAjouter,
  actionMoins,
  actionPlus,
  decrireAchat,
  type DecisionAchat,
  type FormatVignette,
} from '@/lib/panier/achat-vignette';
import { usePanier } from '@/lib/panier/contexte-panier';
import { typographier } from '@/lib/typographie';

/**
 * LA LIGNE D'ACHAT D'UNE VIGNETTE (C26) — pastilles de format, prix, ajout.
 *
 * Elle vit HORS du lien de la carte : un bouton dans un `<a>` est du HTML
 * invalide, et un clic sur « + » ne doit pas ouvrir la fiche. Ce composant ne
 * décide de rien — `achat-vignette.ts` (module pur, couvert à 100 %) rend le
 * mode, le prix et le plafond ; ici on dessine et on envoie l'action au panier.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI IL NE REÇOIT PAS L'ARTICLE DU PANIER (D17)
 * ---------------------------------------------------------------------------
 *
 * `ArticlePanier` porte la phrase de rétractation, le fondement et les
 * allergènes : à quinze vignettes par page, ces octets gonfleraient la charge
 * RSC aplatie dans le HTML de `/boutique`. L'îlot reçoit cinq champs par format
 * (`FormatVignette`), le slug et le nom — et jamais `CATALOGUE`.
 *
 * ---------------------------------------------------------------------------
 * CE QUI NE SE VOIT PAS DANS LE CODE, ET QUE LA CAMPAGNE MESURE
 * ---------------------------------------------------------------------------
 *
 * - AUCUN `id` EN DUR : quinze vignettes par page. Le `name` des radios vient
 *   de `useId()`, sans quoi les groupes n'en formeraient qu'un et cocher
 *   50 cl sur une carte décocherait la voisine.
 * - INERTE TANT QUE LE PANIER N'A PAS RELU SON STOCKAGE (`pretALEmploi`) : un
 *   clic avant la restauration serait écrasé par `restaurer`. `inert` rend la
 *   ligne non cliquable SANS la griser — elle garde sa taille et son dessin.
 * - LA MÊME TAILLE DANS TOUS LES MODES (`.vignette-action`) : bouton, pas et
 *   lien occupent la même cellule, donc rien ne bouge à l'hydratation ni au
 *   passage d'un mode à l'autre.
 * - LE FOCUS SUIT LE GESTE : après « Ajouter », sur « + » ; après le dernier
 *   « − », sur « Ajouter ». `flushSync` rend le nouvel élément AVANT qu'on lui
 *   donne le focus, sans drapeau à rattraper dans un effet.
 * - « + » est `aria-disabled` et non `disabled` au plafond : un bouton
 *   désactivé perd le focus, et le clavier perdrait sa place.
 * - « − » ET « + » SONT DES SVG, jamais des caractères : la mono du registre
 *   est sous-ensemblée (143 points de code) et un U+2212 partirait sur une
 *   police de repli étrangère.
 * - LE NOM DU BOUTON D'AJOUT NE CONTIENT JAMAIS « Ajouter au panier » : les
 *   campagnes de la fiche cherchent cette suite exacte, et leur correspondance
 *   par sous-chaîne rendrait deux boutons sur une page qui porterait aussi des
 *   vignettes. Le prix y revient, puisqu'il a quitté le nom du lien.
 */

const TEXTE_AJOUT = 'Ajouter au panier';

export function AchatVignette({
  slug,
  nom,
  formats,
}: {
  readonly slug: string;
  readonly nom: string;
  readonly formats: readonly [FormatVignette, ...FormatVignette[]];
}) {
  const { etat, pretALEmploi, envoyer } = usePanier();
  const { surcouche } = useSurcouche();
  const identifiant = useId();

  const [skuChoisi, setSkuChoisi] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState('');
  const plusRef = useRef<HTMLButtonElement>(null);
  const ajouterRef = useRef<HTMLButtonElement>(null);

  const decision = decrireAchat({ slug, formats, skuChoisi, lignes: etat.lignes, surcouche });
  const prix = formaterEuros(decision.prixCentimes);
  const designation = `${nom}, ${decision.format}`;

  const ajouter = () => {
    const action = actionAjouter(decision);

    if (action === null) {
      return;
    }

    flushSync(() => {
      envoyer(action);
    });
    plusRef.current?.focus();
    setAnnonce(typographier(`${designation} : 1 au panier.`));
  };

  const plus = () => {
    const action = actionPlus(decision);

    if (action === null) {
      return;
    }

    envoyer(action);
    setAnnonce(typographier(`${designation} : ${String(decision.quantite + 1)} au panier.`));
  };

  const moins = () => {
    const action = actionMoins(decision);

    if (action === null) {
      return;
    }

    if (action.type === 'retirer') {
      flushSync(() => {
        envoyer(action);
      });
      ajouterRef.current?.focus();
      setAnnonce(typographier(`${designation} : retiré du panier.`));
      return;
    }

    envoyer(action);
    setAnnonce(typographier(`${designation} : ${String(decision.quantite - 1)} au panier.`));
  };

  return (
    <div className="vignette-achat">
      <div className="vignette-corps" inert={!pretALEmploi}>
        {formats.length > 1 ? (
          <fieldset className="vignette-formats">
            <legend className="sr-only">{typographier(`Format de ${nom}`)}</legend>
            {formats.map((format) => (
              <label key={format.sku} className="vignette-pastille">
                <input
                  type="radio"
                  name={`${identifiant}-format`}
                  value={format.sku}
                  checked={format.sku === decision.sku}
                  onChange={() => {
                    setSkuChoisi(format.sku);
                  }}
                  className="sr-only"
                />
                <span className="etiquette">{format.format}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        <div className="vignette-ligne">
          <p className="vignette-prix registre text-encre tabular-nums">
            {prix}
            {motifCourt(decision) === null ? null : (
              <span id={`${identifiant}-motif`} className="etiquette block text-encre-douce">
                {motifCourt(decision)}
              </span>
            )}
          </p>

          <div className="vignette-action">
            {decision.mode === 'quantite' ? (
              <div
                role="group"
                aria-label={typographier(`Quantité de ${designation}`)}
                className="vignette-pas"
              >
                <button
                  type="button"
                  onClick={moins}
                  aria-label={typographier(`Retirer un exemplaire de ${designation}`)}
                >
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                    <path d="M2 6h8" />
                  </svg>
                </button>
                <span className="registre tabular-nums text-encre">{decision.quantite}</span>
                <button
                  ref={plusRef}
                  type="button"
                  onClick={plus}
                  aria-disabled={decision.quantite >= decision.max}
                  aria-label={typographier(`Ajouter un exemplaire de ${designation}`)}
                >
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                    <path d="M2 6h8M6 2v8" />
                  </svg>
                </button>
              </div>
            ) : decision.mode === 'composer' ? (
              <Link
                href={`/boutique/${slug}`}
                className="vignette-bouton text-sm font-semibold no-underline"
              >
                Composer mon coffret
              </Link>
            ) : (
              <button
                ref={ajouterRef}
                type="button"
                onClick={ajouter}
                disabled={decision.mode !== 'ajouter'}
                aria-describedby={
                  decision.mode === 'ajouter' ? undefined : `${identifiant}-motif`
                }
                aria-label={typographier(`Ajouter ${designation}, ${prix}, au panier`)}
                className="vignette-bouton text-sm font-semibold"
              >
                {TEXTE_AJOUT}
              </button>
            )}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>
    </div>
  );
}

/** Le motif court d'un bouton éteint, dit en français ; `null` quand il est actif. */
function motifCourt(decision: DecisionAchat): string | null {
  if (decision.mode === 'indisponible') {
    return 'Retiré de la vente';
  }

  return decision.mode === 'epuise' ? 'Épuisé' : null;
}
