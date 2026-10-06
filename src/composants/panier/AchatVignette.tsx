'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { formaterEuros } from '@/lib/argent';
import { PrixLePlusBasVitrine } from '@/composants/surcouche/FeuillesVitrine';
import { useSurcouche } from '@/lib/contexte-surcouche';
import {
  actionAjouter,
  actionMoins,
  actionPlus,
  decrireAchat,
  formatEpuise,
  type DecisionAchat,
  type FormatVignette,
} from '@/lib/panier/achat-vignette';
import { usePanier } from '@/lib/panier/contexte-panier';
import type { ActionPanier } from '@/lib/panier/reducteur';
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
 * - UN CLIC REÇU AVANT QUE LE PANIER AIT RELU SON STOCKAGE (`pretALEmploi`)
 *   N'EST NI PERDU NI ÉCRASÉ : il est GARDÉ dans une ref et envoyé dès que le
 *   panier est prêt. Envoyé tout de suite, `restaurer` l'écraserait. Rendu
 *   `inert` (premier jet de C26), le bouton avait l'air actif et mangeait le
 *   clic : 1,8 s de clics dans le vide sous un processeur bridé ×4, mesurés
 *   à la souris par `preuves/c26/sonde-premier-clic.mjs` — et `inert` écrit
 *   dans le HTML serveur empêchait même React de rejouer un clic arrivé
 *   pendant l'hydratation.
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
 * - LE NOM DU BOUTON D'AJOUT COMMENCE PAR SON TEXTE VISIBLE (WCAG 2.5.3,
 *   « étiquette dans le nom ») : qui dicte « Ajouter au panier » à une commande
 *   vocale doit toucher ce bouton. Suivent le produit, le format et le prix —
 *   le prix y revient, puisqu'il a quitté le nom du lien. Sur une fiche, les
 *   cartes de suggestion vivent dans le tiroir : fermé, il ne rend rien ;
 *   ouvert, il est modal et le bouton de la fiche est inerte derrière lui. Une
 *   recherche de « Ajouter au panier » n'y trouve donc jamais deux boutons.
 */

const TEXTE_AJOUT = 'Ajouter au panier';

export function AchatVignette({
  slug,
  nom,
  formats,
  compacte = false,
}: {
  readonly slug: string;
  readonly nom: string;
  readonly formats: readonly [FormatVignette, ...FormatVignette[]];
  /** Carte étroite (suggestions) : le prix passe au-dessus du bouton, pleine largeur. */
  readonly compacte?: boolean;
}) {
  const { etat, pretALEmploi, envoyer } = usePanier();
  const { surcouche } = useSurcouche();
  const identifiant = useId();

  const [skuChoisi, setSkuChoisi] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState('');
  const plusRef = useRef<HTMLButtonElement>(null);
  const ajouterRef = useRef<HTMLButtonElement>(null);
  const intention = useRef<{ readonly action: ActionPanier; readonly annonce: string } | null>(
    null,
  );
  const [focaliserPlus, setFocaliserPlus] = useState(false);

  const decision = decrireAchat({ slug, formats, skuChoisi, lignes: etat.lignes, surcouche });
  const prix = formaterEuros(decision.prixCentimes);
  const designation = `${nom}, ${decision.format}`;
  /* LE COFFRET À COMPOSER N'A PAS DE PASTILLES : le format se choisit sur la
     fiche, avec les pièces. Une pastille « 5 pièces » cochée ici serait perdue
     à l'arrivée sur la fiche, qui ouvre sur 3 (bêta-test du 06/10) : on
     n'offre pas un choix qu'on ne sait pas transmettre. Le prix redevient le
     « dès » de la vitrine, surcouche comprise. */
  const aComposer = formats.every((format) => format.piecesRequises !== null);

  /* Le clic gardé part dès que le panier est prêt, APRÈS sa restauration. */
  useEffect(() => {
    const gardee = intention.current;

    if (!pretALEmploi || gardee === null) {
      return;
    }

    intention.current = null;
    envoyer(gardee.action);
    setAnnonce(gardee.annonce);
    setFocaliserPlus(true);
  }, [pretALEmploi, envoyer]);

  useEffect(() => {
    if (focaliserPlus) {
      plusRef.current?.focus();
      setFocaliserPlus(false);
    }
  }, [focaliserPlus]);

  const ajouter = () => {
    const action = actionAjouter(decision);

    if (action === null) {
      return;
    }

    if (!pretALEmploi) {
      intention.current = {
        action,
        annonce: typographier(`${designation} : 1 au panier.`),
      };
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
    <div className={compacte ? 'vignette-achat vignette-achat--compacte' : 'vignette-achat'}>
      <div className="vignette-corps">
        {formats.length > 1 && !aComposer ? (
          <fieldset className="vignette-formats">
            <legend className="sr-only">{typographier(`Format de ${nom}`)}</legend>
            {formats.map((format) => (
              <label
                key={format.sku}
                className="vignette-pastille"
                data-epuise={formatEpuise(surcouche, slug, format) ? '' : undefined}
              >
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
            {aComposer ? (
              <>
                dès <PrixLePlusBasVitrine slug={slug} variantes={formats} />
              </>
            ) : (
              prix
            )}
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
                aria-label={typographier(`Composer ${nom}`)}
                className="vignette-bouton text-sm font-semibold no-underline"
              >
                Composer
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
                aria-label={typographier(`${TEXTE_AJOUT} : ${designation}, ${prix}`)}
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
