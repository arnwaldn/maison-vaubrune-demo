import Link from 'next/link';

import { Visuel } from '@/composants/illustrations/Visuel';
import { formaterEuros } from '@/lib/argent';
import type { Produit } from '@/lib/types';

/**
 * UNE CARTE DE VENTE CROISÉE — un seul dessin pour tout le dépôt (C24).
 *
 * Elle est née dans le tiroir de la fiche produit en C23, et la page `/panier`
 * en a eu besoin dès le retour suivant. Deux copies du même dessin auraient
 * divergé à la première retouche : elle est donc extraite ici, et ses deux
 * appelants la partagent.
 *
 * COMPOSANT SERVEUR, et c'est la condition de tout le reste. `<Visuel>` est
 * serveur ; une carte cliente devrait recomposer les chemins d'image de son
 * côté, ce qui ferait naître la deuxième fabrique de chemins que ce projet
 * refuse depuis C14. La carte est donc rendue au build et voyage en nœud —
 * environ 250 octets gzip pièce, zéro octet de premier chargement.
 *
 * LE PRIX EST CELUI DU CATALOGUE VERSIONNÉ, jamais celui de la surcouche
 * marchand : ce composant n'a pas d'état de visiteur, comme le balisage
 * structuré n'en a pas (D33). L'écart est écrit plutôt que découvert.
 */
export function CarteSuggestion({ produit }: { readonly produit: Produit }) {
  return (
    /* COLONNE FLEX, ET LE PRIX EST POUSSÉ EN BAS (C24). Les noms de produits
       n'ont pas tous le même nombre de lignes — « Miel de bruyère blanche » en
       prend trois, « Coffrets » une seule — et les prix s'alignaient donc en
       escalier. `mt-auto` les ramène sur une ligne, quelle que soit la hauteur
       du nom au-dessus. `h-full` est nécessaire : sans lui la carte se contente
       de son contenu et le `mt-auto` n'a rien à repousser. */
    <Link
      href={`/boutique/${produit.slug}`}
      className="flex h-full flex-col no-underline"
      data-suggestion
    >
      {produit.visuel === undefined ? null : (
        <Visuel
          slug={produit.slug}
          vue="principal"
          donnees={produit.visuel.principal}
          illustration={produit.illustration}
          alternative="decorative"
          largeurMaximale={320}
          sizes="12rem"
          className="block rounded-sm"
        />
      )}
      {/* `text-balance` répartit les mots entre les lignes au lieu de laisser
          un orphelin — sur des noms de trois lignes dans 12 rem, la différence
          se voit. */}
      <p className="mt-2 text-balance font-titre text-titre leading-tight text-encre">
        {produit.nom}
      </p>
      <p className="registre mt-auto pt-1 text-encre-douce">
        dès {formaterEuros(prixDeBase(produit))}
      </p>
    </Link>
  );
}

/**
 * Le plus bas des prix de base d'un produit.
 *
 * Exportée parce que deux composants la lisent désormais. `prixLePlusBasAffiche()`
 * existe et honore la surcouche marchand, mais elle vit dans
 * `catalogue-navigateur.ts` et attend l'état d'un visiteur : ces composants
 * sont SERVEUR, ils n'en ont pas.
 */
export function prixDeBase(produit: {
  readonly variantes: readonly { readonly prixCentimes: number }[];
}): number {
  return Math.min(...produit.variantes.map((variante) => variante.prixCentimes));
}
