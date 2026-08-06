'use client';

import Link from 'next/link';

import { usePanier } from '@/lib/panier/contexte-panier';
import { nombreArticles } from '@/lib/panier/reducteur';

/**
 * LA PASTILLE DU PANIER, dans l'en-tête de toutes les pages.
 *
 * ---------------------------------------------------------------------------
 * Le gabarit de largeur fixe, et pourquoi il n'est pas négociable
 * ---------------------------------------------------------------------------
 *
 * Le HTML servi ne connaît pas le panier du visiteur : il est engendré à la
 * construction, identique pour tout le monde. Le nombre d'articles n'apparaît
 * donc qu'après l'hydratation, une fois le `localStorage` relu. Si la pastille
 * n'occupait aucune place en attendant, l'arrivée du nombre pousserait la
 * navigation vers la gauche — un décalage de mise en page (CLS) sur CHAQUE
 * page du site, c'est-à-dire une note de rapidité perdue partout à la fois,
 * pour un badge de deux caractères.
 *
 * La réponse tient en une règle : la pastille occupe TOUJOURS le même
 * rectangle, `h-6 w-9`, avant comme après. Avant, il est vide. Après, il porte
 * le nombre. Rien ne bouge, jamais. Le plafond d'affichage à 99 sert la même
 * cause : « 100 » tiendrait encore, « 1000 » élargirait le rectangle.
 *
 * ---------------------------------------------------------------------------
 * Ce que dit un lecteur d'écran
 * ---------------------------------------------------------------------------
 *
 * Le rectangle est `aria-hidden` : un nombre nu, hors contexte, ne s'annonce
 * pas. Le décompte est porté à côté par un texte réservé aux lecteurs
 * d'écran, qui complète le nom du lien — « Panier, 3 articles » — et se tait
 * tant que le panier n'a pas été relu, plutôt que d'annoncer un « 0 » qui
 * serait faux.
 */

/** Au-delà, on écrit « 99+ » : le gabarit ne doit jamais s'élargir. */
const PLAFOND_AFFICHE = 99;

const CLASSE_LIEN =
  'inline-flex items-center gap-2 text-sm font-medium text-encre-douce hover:text-terre';

export function PastillePanier() {
  const { etat, pretALEmploi } = usePanier();
  const nombre = nombreArticles(etat);

  return (
    <Link href="/panier" className={CLASSE_LIEN}>
      <span className="underline decoration-filet decoration-2 underline-offset-4">
        Panier
      </span>

      <span
        aria-hidden="true"
        className="inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-full border border-filet bg-papier text-xs font-semibold text-encre tabular-nums no-underline"
      >
        {pretALEmploi ? abreger(nombre) : ''}
      </span>

      <span className="sr-only">{decompte(pretALEmploi, nombre)}</span>
    </Link>
  );
}

function abreger(nombre: number): string {
  return nombre > PLAFOND_AFFICHE ? `${String(PLAFOND_AFFICHE)}+` : String(nombre);
}

function decompte(pretALEmploi: boolean, nombre: number): string {
  if (!pretALEmploi) {
    return '';
  }

  if (nombre === 0) {
    return ', vide';
  }

  return nombre === 1 ? ', 1 article' : `, ${String(nombre)} articles`;
}
