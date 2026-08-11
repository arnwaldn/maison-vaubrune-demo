/**
 * Les types de `dimensions-image.mjs`, écrits à la main.
 *
 * Même raison que `regime-visuels.d.mts` et `etincelle.d.mts` : l'implémentation
 * reste en `.mjs` parce qu'elle est de l'OUTILLAGE — exécutée par `node` et par
 * `tsx`, jamais empaquetée dans le site —, et le projet compile avec
 * `allowJs: false`. Sans déclaration, le test `.ts` qui l'éprouve ne passerait
 * pas `tsc --noEmit`.
 */

/** Les dimensions d'une image, en points. */
export interface DimensionsImage {
  readonly largeur: number;
  readonly hauteur: number;
}

/** Ce qu'un NOM de fichier annonce : une largeur seule, ou les deux dimensions. */
export interface DimensionsAnnoncees {
  readonly largeur: number;
  /** `null` quand le nom ne porte qu'une largeur (`principal-320.avif`). */
  readonly hauteur: number | null;
}

/**
 * Les dimensions du fichier, lues dans ses octets.
 *
 * `null` si le format n'est pas reconnu — ce n'est PAS « tout va bien » :
 * l'appelant tranche, et la garde des images en fait une anomalie.
 */
export declare function lireDimensions(chemin: string): DimensionsImage | null;

/** La même lecture, sur un tampon déjà en mémoire. */
export declare function dimensionsDepuisOctets(octets: Buffer): DimensionsImage | null;

/** Les dimensions que le NOM annonce, ou `null` s'il n'en annonce aucune. */
export declare function dimensionsAnnonceesParLeNom(nom: string): DimensionsAnnoncees | null;
