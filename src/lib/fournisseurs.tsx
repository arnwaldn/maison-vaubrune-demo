'use client';

import type { ReactNode } from 'react';

import { FournisseurSurcouche } from '@/lib/contexte-surcouche';
import type { StocksParSku } from '@/lib/panier/reducteur';
import { FournisseurPanier } from '@/lib/panier/contexte-panier';

/**
 * LES DEUX FOURNISSEURS DE LA MISE EN PAGE RACINE, en une seule frontière.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce fichier existe : une mesure, pas un goût
 * ---------------------------------------------------------------------------
 *
 * La mise en page racine pourrait imbriquer les deux fournisseurs elle-même.
 * Elle l'a fait, et le tableau de construction l'a sanctionné : chaque module
 * `'use client'` référencé depuis un composant serveur ouvre un GROUPE DE
 * MORCEAUX distinct chez l'empaqueteur. Deux références depuis la mise en page
 * — le panier et la surcouche — donnaient donc deux groupes, dont le second
 * réapparaissait sur chaque page en plus du premier : un fichier de plus à
 * télécharger sur toutes les routes du site, pour du code qui aurait tenu dans
 * le premier.
 *
 * Mesuré sur la construction de la tranche C6 : +1,3 Ko compressés sur chaque
 * page, uniquement dus au découpage. Ce fichier ramène la mise en page à UNE
 * seule frontière client ; l'empaqueteur retrouve un seul groupe, et les deux
 * contextes y voyagent ensemble.
 *
 * ---------------------------------------------------------------------------
 * `children` reste un arbre SERVEUR
 * ---------------------------------------------------------------------------
 *
 * C'est le point à ne pas perdre en chemin. `children` traverse ce composant
 * comme une propriété : React le traite comme un nœud déjà rendu côté serveur,
 * et l'accueil, le rayon et les quinze fiches ne deviennent pas clients pour
 * autant. Le patron est celui posé en C4 (voir l'en-tête de
 * `panier/contexte-panier.tsx`) ; ce fichier ne fait que l'appliquer une fois
 * au lieu de deux.
 *
 * ORDRE DES DEUX FOURNISSEURS. La surcouche enveloppe le panier. Les deux
 * ordres fonctionneraient — aucun des deux contextes ne lit l'autre — et
 * celui-ci est retenu parce qu'il range le catalogue à l'extérieur et le panier
 * à l'intérieur, ce qui est l'ordre des dépendances métier : un panier
 * référence un catalogue, jamais le contraire.
 */
export function Fournisseurs({
  stocks,
  children,
}: {
  /** Vingt-trois paires SKU → stock, calculées côté serveur (voir `reducteur.ts`). */
  readonly stocks: StocksParSku;
  readonly children: ReactNode;
}) {
  return (
    <FournisseurSurcouche>
      <FournisseurPanier stocks={stocks}>{children}</FournisseurPanier>
    </FournisseurSurcouche>
  );
}
