'use client';

import { formaterEuros } from '@/lib/argent';
import {
  estDisponibleAffiche,
  miseEnAvantAffichee,
  prixAffiche,
  prixLePlusBasAffiche,
  resumeAffiche,
  stockAffiche,
} from '@/lib/catalogue-navigateur';
import { useSurcouche } from '@/lib/contexte-surcouche';

/**
 * LES FEUILLES DE VITRINE — de tout petits îlots clients, et rien d'autre.
 *
 * ---------------------------------------------------------------------------
 * Le patron, et pourquoi il ne produit aucun désaccord d'hydratation
 * ---------------------------------------------------------------------------
 *
 * Chaque feuille reçoit sa VALEUR DE BASE en propriété, calculée côté serveur
 * depuis le catalogue versionné, et la rend telle quelle au premier rendu. La
 * surcouche, elle, n'est lue qu'APRÈS montage (voir `contexte-surcouche.tsx`,
 * effet 1) : le premier rendu client est donc identique au HTML reçu, au
 * caractère près, et React n'a rien à réconcilier. C'est le patron posé en C5
 * pour la page de retour de paiement (décision D22 et l'erreur #418 qu'elle a
 * corrigée), appliqué ici à la vitrine.
 *
 * Conséquence mesurable, et c'est l'argument : le HTML statique de `/boutique`
 * et des quinze fiches est INCHANGÉ pour un visiteur qui n'a rien modifié —
 * même prix, même résumé, mêmes badges. Les mesures Lighthouse publiées
 * portent donc sur exactement les mêmes octets qu'avant cette tranche.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi des feuilles et non des pages clientes
 * ---------------------------------------------------------------------------
 *
 * Rendre `/boutique` ou une fiche entièrement cliente aurait été plus court à
 * écrire, et aurait envoyé la prose des quinze fiches dans le paquet
 * JavaScript (décision D17). Les feuilles, elles, ne reçoivent que ce qu'elles
 * affichent : un slug, un SKU, un nombre. Elles n'importent ni le catalogue, ni
 * sa projection, ni `appliquerSurcouche()` — seulement six fonctions de lecture
 * de quatre lignes.
 *
 * ---------------------------------------------------------------------------
 * Largeurs stables (décision D24, contrainte de mise en page)
 * ---------------------------------------------------------------------------
 *
 * Aucune feuille n'introduit ni ne retire de boîte : chacune rend le MÊME
 * élément que le code serveur qu'elle remplace, avec les mêmes classes. Les
 * montants portent `tabular-nums` là où ils étaient déjà, pour qu'un prix qui
 * change de valeur ne change pas de chasse.
 */

/* -------------------------------------------------------------------------- */
/* Textes                                                                      */
/* -------------------------------------------------------------------------- */

/** Le résumé d'un produit — une phrase, dans la grille comme sur la fiche. */
export function ResumeVitrine({
  slug,
  resume,
  className,
}: {
  readonly slug: string;
  readonly resume: string;
  readonly className: string;
}) {
  const { surcouche } = useSurcouche();

  return <span className={className}>{resumeAffiche(surcouche, slug, resume)}</span>;
}

/* -------------------------------------------------------------------------- */
/* Montants                                                                    */
/* -------------------------------------------------------------------------- */

/** Le prix d'une variante désignée par son SKU. */
export function PrixVarianteVitrine({
  slug,
  sku,
  prixCentimes,
}: {
  readonly slug: string;
  readonly sku: string;
  readonly prixCentimes: number;
}) {
  const { surcouche } = useSurcouche();

  return <>{formaterEuros(prixAffiche(surcouche, slug, sku, prixCentimes))}</>;
}

/**
 * Le plus bas des prix d'un produit — le « à partir de ».
 *
 * Les variantes arrivent réduites à `{ sku, prixCentimes }` : c'est tout ce que
 * le minimum demande, et c'est tout ce qui traverse la frontière.
 */
export function PrixLePlusBasVitrine({
  slug,
  variantes,
}: {
  readonly slug: string;
  readonly variantes: readonly { readonly sku: string; readonly prixCentimes: number }[];
}) {
  const { surcouche } = useSurcouche();

  return <>{formaterEuros(prixLePlusBasAffiche(surcouche, slug, variantes))}</>;
}

/**
 * Les bornes de prix du rayon — « de 5,60 € à 54,00 € ».
 *
 * Elle existe pour une raison d'honnêteté et non d'exhaustivité : sans elle, le
 * pied du rayon annoncerait les bornes du catalogue livré pendant que les
 * cartes juste au-dessus afficheraient les prix corrigés par le visiteur. Deux
 * vérités sur un même écran, dont l'une est fausse.
 */
export function BornesPrixVitrine({
  articles,
}: {
  readonly articles: readonly {
    readonly slug: string;
    readonly sku: string;
    readonly prixCentimes: number;
  }[];
}) {
  const { surcouche } = useSurcouche();

  let plancher: number | null = null;
  let plafond: number | null = null;

  for (const article of articles) {
    const prix = prixAffiche(surcouche, article.slug, article.sku, article.prixCentimes);
    plancher = plancher === null ? prix : Math.min(plancher, prix);
    plafond = plafond === null ? prix : Math.max(plafond, prix);
  }

  return (
    <>
      {formaterEuros(plancher ?? 0)} à {formaterEuros(plafond ?? 0)}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Stock                                                                       */
/* -------------------------------------------------------------------------- */

/** Le stock d'une variante, tel que le tableau des formats l'affiche. */
export function StockVarianteVitrine({
  slug,
  sku,
  stock,
}: {
  readonly slug: string;
  readonly sku: string;
  readonly stock: number;
}) {
  const { surcouche } = useSurcouche();
  const affiche = stockAffiche(surcouche, slug, sku, stock);

  return <>{affiche === 0 ? 'épuisé' : `${String(affiche)} en stock`}</>;
}

/* -------------------------------------------------------------------------- */
/* Étiquettes                                                                  */
/* -------------------------------------------------------------------------- */

const CLASSE_ETIQUETTE =
  'rounded-sm border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase';

/**
 * Les étiquettes d'un produit : « Frais », « Sélection », « Indisponible ».
 *
 * Les trois sont rendues par la même feuille parce qu'elles vivent sur la même
 * ligne et se lisent ensemble. « Frais » ne dépend pas de la surcouche (le
 * régime de conservation n'est pas modifiable, voir `catalogue-navigateur.ts`)
 * mais transite par ici pour que la ligne entière ait un seul rendu et un seul
 * ordre — trois feuilles voisines s'échangeraient leur place au montage.
 */
export function EtiquettesVitrine({
  slug,
  frais,
  miseEnAvant,
}: {
  readonly slug: string;
  readonly frais: boolean;
  readonly miseEnAvant: boolean;
}) {
  const { surcouche } = useSurcouche();
  const disponible = estDisponibleAffiche(surcouche, slug);
  const enAvant = miseEnAvantAffichee(surcouche, slug, miseEnAvant);

  return (
    <>
      {frais ? (
        <span className={`${CLASSE_ETIQUETTE} border-terre text-terre`}>Frais</span>
      ) : null}
      {enAvant ? (
        <span className={`${CLASSE_ETIQUETTE} border-olive text-olive`}>Sélection</span>
      ) : null}
      {disponible ? null : (
        <span className={`${CLASSE_ETIQUETTE} border-encre-douce text-encre-douce`}>
          Indisponible
        </span>
      )}
    </>
  );
}
