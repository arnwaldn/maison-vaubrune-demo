import Link from 'next/link';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import { formaterEuros } from '@/lib/argent';
import { prixLePlusBas } from '@/lib/catalogue';
import { exigeChaineDuFroid, type Produit } from '@/lib/types';

/**
 * Une vignette de la grille.
 *
 * Trois partis pris :
 *
 * - Le prix affiché est un « à partir de » DÉRIVÉ des variantes, jamais une
 *   valeur saisie une seconde fois. Un prix recopié dans la grille finit par
 *   contredire la fiche.
 * - Le badge « frais » se déduit de la chaîne du froid, pas de la famille
 *   (décision D9, telle que la revue des fiches l'a précisée) : le jour où un
 *   coffret contiendra du beurre, il portera le badge sans qu'on y touche.
 * - La carte entière est cliquable, mais le nom du produit reste le texte du
 *   lien : c'est lui qu'annonce un lecteur d'écran, pas « lire la suite ».
 */
export function CarteProduit({ produit }: { readonly produit: Produit }) {
  const frais = exigeChaineDuFroid(produit.conservation);

  return (
    <li className="border-t border-filet pt-6">
      <Link
        href={`/boutique/${produit.slug}`}
        className="group flex h-full gap-4 no-underline sm:gap-5"
      >
        <Silhouette
          forme={produit.illustration.forme}
          teinte={produit.illustration.teinte}
          hauteur={84}
          className="shrink-0 self-start"
        />

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="block font-titre text-lg leading-snug font-semibold text-encre group-hover:text-terre">
            {produit.nom}
          </span>

          <span className="mt-2 block text-sm leading-relaxed text-encre-douce">
            {produit.resume}
          </span>

          {/* `mt-auto` colle la ligne de prix au bas de la carte : sur une même
              rangée, les prix s'alignent quelle que soit la longueur des
              résumés. */}
          <span className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-2 pt-3">
            <span className="text-sm font-semibold text-encre">
              à partir de {formaterEuros(prixLePlusBas(produit))}
            </span>
            {frais ? (
              <span className="rounded-sm border border-terre px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.12em] text-terre uppercase">
                Frais
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
