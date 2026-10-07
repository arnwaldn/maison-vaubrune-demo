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
 * (4 rem sous 40 rem) — voir `.miniature-produit` dans `globals.css` : la place
 * est réservée avant le premier octet.
 *
 * L'IMAGE EST ELLE-MÊME UN CARRÉ, ET NE SE RECADRE PLUS. La première rédaction
 * servait la vue principale (5:8 pour les pots et les bouteilles, 4:3 pour les
 * coffrets) en `object-fit: cover` : un carré central retire 37,5 % de la hauteur
 * d'un 5:8, et la bouteille perdait son bouchon et sa base — « un produit coupé
 * serait une faute » (revue du directeur artistique). Le dérivé `miniature` est
 * COMPOSÉ par le pipeline (`scripts/miniature.mjs`) : le produit entier, 6 % d'air,
 * le papier étendu côté par côté. Le navigateur n'a plus rien à recadrer ; il
 * remplit le carré, et la couleur de réservation est le papier de ce carré.
 *
 * Les chemins viennent de `<Visuel>`, la seule fabrique : `miniature` en est une
 * vue comme les autres, avec ses deux largeurs (160 et 320, pour les densités 2
 * et 3 d'un cadre de 72 ou 64 points).
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

/**
 * Ce que la miniature occupe : 4,5 rem, 4 rem sous 40 rem (la même coupure que
 * `.miniature-produit`). Le `sizes` est JUSTE — il n'y a pas de `largeurMaximale`
 * pour le brider : à la densité 2 le navigateur prend le 160 (144 points
 * demandés), à la densité 3 le 320 (216), et le plus lourd des deux fichiers
 * pèse 15 Ko.
 */
const SIZES_MINIATURE = '(max-width: 39.9375rem) 4rem, 4.5rem';

/**
 * La miniature d'UN produit.
 *
 * `eager` pour le tiroir de la fiche : posée dans un `<dialog>` fermé, une image
 * paresseuse ne serait demandée qu'à l'ouverture (voir `Visuel`). Il va avec la
 * priorité BASSE (`arrierePlan`) : l'image est demandée tout de suite, derrière
 * la galerie qui porte le plus grand affichage de la page.
 */
export function miniatureProduit(produit: Produit, eager = false): ReactNode {
  const visuel = produit.visuel;
  const miniature = visuel?.miniature;

  return (
    <div className="miniature-produit" data-miniature={produit.slug}>
      {visuel === undefined || miniature === undefined ? (
        <Silhouette
          forme={produit.illustration.forme}
          teinte={produit.illustration.teinte}
          hauteur={56}
        />
      ) : (
        <Visuel
          slug={produit.slug}
          vue="miniature"
          donnees={{ ...miniature, alt: visuel.principal.alt }}
          illustration={produit.illustration}
          alternative="decorative"
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
