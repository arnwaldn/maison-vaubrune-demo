import type { ReactNode } from 'react';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import { Visuel } from '@/composants/illustrations/Visuel';
import type { Produit } from '@/lib/types';

/**
 * LES MINIATURES DES PRODUITS ACHETÉS — fabriquées ici, jamais dans un îlot (C27).
 *
 * Quatre écrans montrent au client ce qu'il achète : les lignes du panier, le
 * récapitulatif de `/commande`, la page de confirmation et le tiroir « Ajouté
 * au panier » de la fiche. Les quatre sont des îlots clients, et `<Visuel>` est
 * un composant SERVEUR : un îlot qui fabriquerait lui-même ses chemins d'image
 * ferait naître la seconde fabrique que C14 et C15 ont payée trois fois (D17).
 *
 * Le serveur rend donc les miniatures et les passe en `Record<slug, ReactNode>`,
 * sur le patron de `CARTES_SUGGESTIONS` (`src/app/panier/page.tsx`) : l'îlot
 * n'affiche que celles qui servent, et un nœud non affiché n'insère jamais son
 * `<img>` — son fichier n'est jamais demandé. Sur `/commande`, la route la plus
 * serrée du budget (119 Ko pour 125), c'est la seule voie : aucun import
 * d'image ni de `Visuel` ne franchit la frontière cliente.
 *
 * LE CADRE EST FIXE, ET C'EST CE QUI TIENT LE DÉCALAGE. Un carré de 4,5 rem
 * (4 rem sous 40 rem), `object-fit: cover` — voir `.miniature-produit` dans
 * `globals.css` : la place est réservée avant le premier octet, quelle que soit
 * la proportion de la photographie (4:5, 4:3 pour les coffrets).
 *
 * DÉCORATIVE (`alternative="decorative"`) : le nom du produit est juste à côté,
 * et c'est lui qui porte le lien. Une alternative rendue ferait lire le nom
 * deux fois ; la miniature n'est d'ailleurs pas cliquable, pour ne pas ouvrir
 * un second arrêt de tabulation vers la même adresse.
 *
 * LE REPLI SUIT `CarteProduit` : un produit sans `visuel` montre sa silhouette
 * seule ; un produit avec `visuel` laisse `<Visuel>` poser la photographie ET
 * la silhouette que la feuille d'impression rétablira (D35) — sur
 * `/commande/confirmation`, la page qu'on imprime, la miniature devient donc un
 * dessin au trait dans le même carré.
 */

/** Une seule largeur est jamais servie : le dérivé 320, ~5 Ko, suffit à 4,5 rem à toute densité. */
const LARGEUR_MINIATURE = 320;

/** Ce que la miniature occupe : 4,5 rem. Un seul candidat dans le `srcset`, `sizes` reste donc juste et inerte. */
const SIZES_MINIATURE = '4.5rem';

/**
 * La miniature d'UN produit.
 *
 * `eager` pour le tiroir de la fiche : posée dans un `<dialog>` fermé, une image
 * paresseuse ne serait demandée qu'à l'ouverture (voir `Visuel`). Il va avec la
 * priorité BASSE (`arrierePlan`) : l'image est demandée tout de suite, derrière
 * la galerie qui porte le plus grand affichage de la page.
 */
export function miniatureProduit(produit: Produit, eager = false): ReactNode {
  return (
    <div className="miniature-produit" data-miniature={produit.slug}>
      {produit.visuel === undefined ? (
        <Silhouette
          forme={produit.illustration.forme}
          teinte={produit.illustration.teinte}
          hauteur={56}
        />
      ) : (
        <Visuel
          slug={produit.slug}
          vue="principal"
          donnees={produit.visuel.principal}
          illustration={produit.illustration}
          alternative="decorative"
          largeurMaximale={LARGEUR_MINIATURE}
          sizes={SIZES_MINIATURE}
          {...(eager ? { chargement: 'eager', arrierePlan: true } : {})}
        />
      )}
    </div>
  );
}

/** Les miniatures de tout un catalogue, indexées par slug — le patron de `CARTES_SUGGESTIONS`. */
export function miniaturesProduits(produits: readonly Produit[]): Record<string, ReactNode> {
  return Object.fromEntries(
    produits.map((produit) => [produit.slug, miniatureProduit(produit)]),
  );
}
