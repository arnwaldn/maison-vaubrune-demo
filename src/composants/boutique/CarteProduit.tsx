import Link from 'next/link';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import {
  EtiquettesVitrine,
  PrixLePlusBasVitrine,
  ResumeVitrine,
} from '@/composants/surcouche/FeuillesVitrine';
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
 *
 * BASCULE C6 — la carte reste un composant SERVEUR. Trois de ses valeurs (le
 * résumé, le « à partir de », les étiquettes) passent par des feuilles
 * clientes qui rendent la valeur d'origine puis basculent sur celle de la
 * surcouche marchand après montage. Le HTML servi est donc inchangé pour un
 * visiteur qui n'a rien modifié, et la mise en page ne bouge pas — les
 * feuilles rendent les mêmes éléments avec les mêmes classes que le code
 * qu'elles remplacent (voir l'en-tête de `FeuillesVitrine.tsx`).
 *
 * Les variantes ne traversent la frontière que réduites à `{ sku,
 * prixCentimes }` : le minimum n'a besoin de rien d'autre, et la décision D17
 * interdit d'en envoyer davantage.
 */
export function CarteProduit({ produit }: { readonly produit: Produit }) {
  const frais = exigeChaineDuFroid(produit.conservation);
  const prix = produit.variantes.map((variante) => ({
    sku: variante.sku,
    prixCentimes: variante.prixCentimes,
  }));

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

          <ResumeVitrine
            slug={produit.slug}
            resume={produit.resume}
            className="mt-2 block text-sm leading-relaxed text-encre-douce"
          />

          {/* `mt-auto` colle la ligne de prix au bas de la carte : sur une même
              rangée, les prix s'alignent quelle que soit la longueur des
              résumés. */}
          <span className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-2 pt-3">
            <span className="text-sm font-semibold text-encre tabular-nums">
              à partir de <PrixLePlusBasVitrine slug={produit.slug} variantes={prix} />
            </span>
            <EtiquettesVitrine
              slug={produit.slug}
              frais={frais}
              miseEnAvant={produit.miseEnAvant}
            />
          </span>
        </span>
      </Link>
    </li>
  );
}
