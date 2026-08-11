'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

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
 *
 * ---------------------------------------------------------------------------
 * C13 : le chiffre roule, la pastille bat une fois — et la STRUCTURE NE BOUGE PAS
 * ---------------------------------------------------------------------------
 *
 * Le rectangle `aria-hidden` reste le rectangle `aria-hidden` : mêmes
 * dimensions, même unicité dans l'en-tête, même contenu textuel — un nombre et
 * rien d'autre. C'est une contrainte de tranche, et elle a une raison précise :
 * les campagnes de bout en bout désignent ce rectangle par
 * `header a[href="/panier"] span[aria-hidden="true"]` et lisent son texte.
 * Un second `aria-hidden` à l'intérieur en aurait fait deux et cassé le
 * sélecteur ; un doublon de chiffre pour rouler aurait fait lire « 03 » là où
 * le test attend « 3 ».
 *
 * Le roulement se fait donc SANS DOUBLON : le chiffre est porté par un `<span>`
 * intérieur dont la CLÉ REACT est le nombre lui-même. Quand le nombre change,
 * React remplace l'élément au lieu de le modifier, et l'animation CSS — qui ne
 * joue qu'au montage — rejoue toute seule. Zéro état, zéro minuterie, zéro
 * ligne de JavaScript d'animation.
 *
 * LE BATTEMENT NE SE DÉCLENCHE QU'À L'AJOUT, et c'est la seule chose qui
 * demande de se souvenir : une référence garde le nombre précédent, mise à
 * jour dans un effet — donc après la peinture, donc lisible pendant le rendu
 * sans impureté. Elle vaut `null` tant que le panier n'a pas été relu, ce qui
 * évite le faux battement de l'hydratation : arriver sur une page avec trois
 * articles déjà au panier n'est pas un ajout.
 *
 * Sous mouvement réduit, les deux animations n'existent pas (elles sont
 * écrites sous `no-preference` dans `globals.css`) : le chiffre change, point.
 */

/** Au-delà, on écrit « 99+ » : le gabarit ne doit jamais s'élargir. */
const PLAFOND_AFFICHE = 99;

const CLASSE_LIEN =
  'etiquette inline-flex items-center gap-2 text-encre-douce no-underline hover:text-encre';

export function PastillePanier() {
  const { etat, pretALEmploi } = usePanier();
  const nombre = nombreArticles(etat);

  const precedent = useRef<number | null>(null);
  const monte = precedent.current !== null && nombre > precedent.current;

  useEffect(() => {
    precedent.current = pretALEmploi ? nombre : null;
  }, [pretALEmploi, nombre]);

  const cle = pretALEmploi ? String(nombre) : 'attente';

  return (
    <Link href="/panier" className={CLASSE_LIEN}>
      <span>Panier</span>

      <span
        key={cle}
        aria-hidden="true"
        data-pastille-monte={monte ? '' : undefined}
        className="inline-flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-filet bg-papier text-xs font-mono font-medium text-encre tabular-nums no-underline"
      >
        <span className="pastille-chiffre">{pretALEmploi ? abreger(nombre) : ''}</span>
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
