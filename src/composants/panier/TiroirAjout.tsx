'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import Link from 'next/link';

import { formaterEuros } from '@/lib/argent';

/**
 * LE TIROIR DE CONFIRMATION D'AJOUT AU PANIER (C23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL REMPLACE, ET POURQUOI CE N'ÉTAIT PAS TENABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le retour d'ajout était un paragraphe de douze pixels, en olive, sans fond ni
 * icône, posé sous le bouton. Il était correct, annoncé aux lecteurs d'écran,
 * et jamais effacé. Mesuré sur le site publié après un clic réel : ZÉRO pixel
 * visible dans la fenêtre. Le seul autre signal, la pastille de l'en-tête,
 * disparaît au premier défilement sur téléphone, où l'en-tête ne colle pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  `<dialog>` NATIF, ET CE N'EST PAS UN CHOIX DE CONFORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `showModal()` apporte gratuitement trois comportements qui coûteraient sinon
 * une quarantaine de lignes de client et leurs propres tests : le piège de
 * focus, la touche Échap, et l'inertie de tout le reste du document.
 *
 * L'ARGUMENT QUI A DÉCIDÉ NE SE VOIT QU'EN LISANT LA FEUILLE DE STYLE.
 * `html.mouvement [data-transition-page]` porte une transition d'opacité de
 * 900 ms. Un élément à opacité < 1 CRÉE UN CONTEXTE D'EMPILEMENT : un tiroir en
 * `position: fixed; z-index: 50` posé dessous serait, pendant tout le fondu de
 * route, peint SOUS l'en-tête collant (`z-index: 40`). Défaut intermittent,
 * invisible en revue, visible une fois sur trois à l'écran. La couche
 * supérieure d'un `<dialog>` modal est rendue hors de l'arbre normal : ni
 * l'opacité d'un ancêtre, ni un `overflow`, ni un `sticky` ne l'atteignent. Le
 * problème n'existe pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ON N'ÉCRIT PAS, ET C'EST AUSSI IMPORTANT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - PAS de `role="dialog"` ni d'`aria-modal` à la main : le navigateur les pose
 *   lui-même, et SEULEMENT en mode modal. Les écrire serait une seconde source
 *   de vérité, qui ment le jour où quelqu'un passe à `show()`.
 * - PAS d'`aria-hidden` sur `<main>` : `showModal()` rend le reste inerte, et
 *   poser l'attribut sur un conteneur qui garde des éléments focalisables est
 *   exactement la violation `aria-hidden-focus`, de gravité « serious ».
 * - PAS de `overflow: hidden` sur `<body>` : retirer la barre de défilement
 *   change la largeur de mise en page, donc produit du décalage cumulé sur une
 *   page qui en tient zéro. Écart assumé : la page défile encore derrière le
 *   tiroir. Elle est inerte, rien n'y est cliquable.
 * - PAS de `<p aria-live>` en plus : un dialogue modal annonce son nom et son
 *   contenu à l'ouverture ; une région vivante ferait une double annonce.
 *
 * L'ORDRE EST LE CORRECTIF, comme en C17. On appelle `close()`, JAMAIS un
 * démontage direct : `close()` restaure le focus sur l'élément qui l'avait
 * avant `showModal()`, c'est-à-dire le bouton « Ajouter au panier ». Démonter
 * d'abord ferait disparaître l'élément avant que le navigateur restaure quoi
 * que ce soit, et le focus retomberait sur `<body>`.
 */
export function TiroirAjout({
  ouvert,
  fermer,
  nom,
  format,
  prixCentimes,
  sousTotalCentimes,
  meubles,
}: {
  readonly ouvert: boolean;
  readonly fermer: () => void;
  readonly nom: string;
  readonly format: string;
  readonly prixCentimes: number;
  readonly sousTotalCentimes: number;
  /** Les suggestions et la réassurance, RENDUES PAR LE SERVEUR (voir MeublesTiroir). */
  readonly meubles: ReactNode;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const intitule = useId();

  useEffect(() => {
    const noeud = dialogue.current;

    if (noeud === null) {
      return;
    }

    if (ouvert && !noeud.open) {
      noeud.showModal();
    } else if (!ouvert && noeud.open) {
      noeud.close();
    }
  }, [ouvert]);

  return (
    <dialog
      ref={dialogue}
      data-tiroir-ajout
      aria-labelledby={intitule}
      /* Le navigateur peut fermer sans que React le sache (Échap, clic sur le
         voile). Sans cet écouteur, l'état React resterait à « ouvert » et le
         tiroir refuserait de se rouvrir au clic suivant. */
      onClose={fermer}
      onClick={(evenement) => {
        /* Les clics sur `::backdrop` sont distribués au `<dialog>` lui-même.
           Sans ce test, TOUT clic à l'intérieur fermerait le tiroir. */
        if (evenement.target === dialogue.current) {
          dialogue.current?.close();
        }
      }}
    >
      <div className="tiroir-tete">
        <h2 id={intitule} className="text-titre text-encre">
          Ajouté au panier
        </h2>
        <button
          type="button"
          autoFocus
          onClick={() => dialogue.current?.close()}
          className="tiroir-fermer"
        >
          Fermer
        </button>
      </div>

      <p className="tiroir-article">
        <span className="font-titre text-titre text-encre">{nom}</span>
        <span className="registre block text-encre-douce">
          {format} · {formaterEuros(prixCentimes)}
        </span>
      </p>

      <p className="tiroir-soustotal">
        <span className="etiquette text-encre-douce">Sous-total</span>
        <span className="registre text-encre">{formaterEuros(sousTotalCentimes)}</span>
      </p>

      <div className="tiroir-actions">
        <Link href="/panier" className="tiroir-bouton-primaire no-underline">
          Voir le panier
        </Link>
        <button type="button" onClick={() => dialogue.current?.close()} className="tiroir-bouton">
          Continuer mes achats
        </button>
      </div>

      {meubles}
    </dialog>
  );
}
