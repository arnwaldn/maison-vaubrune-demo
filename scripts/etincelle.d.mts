/**
 * Les types de `etincelle.mjs`, écrits à la main.
 *
 * Même motif que `regime-visuels.d.mts` : l'implémentation reste en `.mjs`
 * comme tout l'outillage du dépôt, mais elle est importée par un test `.ts` et
 * le projet compile avec `allowJs: false`. Dix lignes de déclaration valent
 * mieux qu'un `allowJs` ouvert pour tout le dépôt.
 */

/** Un rectangle en points de MASTER. */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
}

/** La fenêtre de recherche d'un master, et la vignette qu'on en attend. */
export interface Fenetre {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
  readonly largeurReduite: number;
  readonly hauteurReduite: number;
  readonly facteur: number;
  readonly cote: number;
}

/** Ce que le détecteur a trouvé, ou n'a pas trouvé. */
export interface Signature {
  readonly localisee: boolean;
  readonly score: number;
  readonly amplitude: number;
  readonly precision: number;
  readonly boite: Rectangle | null;
}

export declare const REGLAGES: {
  readonly fraction: number;
  readonly largeurReduite: number;
  readonly coteRelatif: number;
  readonly scoreMinimum: number;
  readonly amplitudeMinimum: number;
};

export declare function fenetreDeRecherche(largeur: number, hauteur: number): Fenetre;

export declare function gabaritAstroide(cote: number): Float64Array;

export declare function localiserSignature(
  vignette: Uint8Array,
  fenetre: Fenetre,
): Signature;

export declare function verdictSignature(
  signature: Signature,
  boite: Rectangle,
): { readonly dansLaBoite: boolean; readonly marge: number | null };
