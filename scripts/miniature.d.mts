/**
 * Les types de `miniature.mjs`, écrits à la main.
 *
 * Même motif que `etincelle.d.mts` : l'implémentation reste en `.mjs` comme tout
 * l'outillage du dépôt, mais un test `.ts` l'importe et le projet compile avec
 * `allowJs: false`.
 */

/** Un tampon de pixels entrelacés (RVB), tel que sharp le rend en `.raw()`. */
export interface ImageBrute {
  readonly pixels: Uint8Array;
  readonly largeur: number;
  readonly hauteur: number;
  readonly canaux: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

export interface BoiteDuProduit extends Rectangle {
  /** Le gradient maximal relevé dans la bande de 10 points qui longe le bord. */
  readonly gradientDuPourtour: number;
}

export interface Cadre extends Rectangle {
  /** `true` quand le cadrage serré est abandonné et le recadrage gardé ENTIER. */
  readonly entier: boolean;
}

export interface Placement {
  readonly largeur: number;
  readonly hauteur: number;
  readonly gauche: number;
  readonly haut: number;
}

export interface Reglages {
  readonly seuilGradient: number;
  readonly quorum: number;
  readonly air: number;
  readonly cotes: readonly number[];
  readonly coutureMax: number;
  readonly fenetreCouture: number;
}

/** Une couture par côté, en niveaux sur 255 ; `null` quand la photographie touche ce côté. */
export interface Coutures {
  readonly haut: number | null;
  readonly bas: number | null;
  readonly gauche: number | null;
  readonly droite: number | null;
}

export declare const REGLAGES: Reglages;

export declare function boiteDuProduit(
  image: ImageBrute,
  reglages?: Reglages,
): BoiteDuProduit | null;

export declare function cadrageMiniature(
  produit: Rectangle | null,
  recadrage: { readonly largeur: number; readonly hauteur: number },
  reglages?: Reglages,
): Cadre;

export declare function placerPhoto(
  cadre: { readonly largeur: number; readonly hauteur: number },
  cote: number,
): Placement;

export declare function partDuProduit(
  produit: { readonly largeur: number; readonly hauteur: number },
  cadre: { readonly largeur: number; readonly hauteur: number },
): number;

export declare function composer(
  photo: { readonly pixels: Uint8Array; readonly largeur: number; readonly hauteur: number },
  cote: number,
  placement: Placement,
): Uint8Array;

export declare function papierDuCarre(
  carre: Uint8Array,
  cote: number,
): { readonly r: number; readonly g: number; readonly b: number };

export declare function coutures(
  carre: Uint8Array,
  cote: number,
  placement: Placement,
  reglages?: Reglages,
): Coutures;
