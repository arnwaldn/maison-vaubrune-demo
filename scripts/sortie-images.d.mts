/**
 * Les types de `sortie-images.mjs`, écrits à la main.
 *
 * Même raison que `dimensions-image.d.mts`, `regime-visuels.d.mts` et
 * `etincelle.d.mts` : l'implémentation reste en `.mjs` parce qu'elle est de
 * l'OUTILLAGE — exécutée par `node`, jamais empaquetée dans le site —, et le
 * projet compile avec `allowJs: false`. Sans déclaration, le test `.ts` qui
 * l'éprouve ne passerait pas `tsc --noEmit`.
 */

/**
 * Le bilan d'un refait, en chemins relatifs à la racine de sortie.
 *
 * Les deux listes sont triées. `preserves` est la pièce à conviction de
 * l'invariant : elle NOMME les fichiers d'un autre pipeline qui ont survécu,
 * pour qu'une préservation soit vue plutôt que supposée.
 */
export interface BilanRefait {
  readonly supprimes: string[];
  readonly preserves: string[];
}

/** Le fichier porte-t-il la signature du pipeline d'images (format ou relevé) ? */
export declare function estProduitParLePipelineDImages(nom: string): boolean;

/**
 * Refait une racine de sortie : retire ce que le pipeline d'images a produit,
 * laisse tout le reste en place, et garantit que la racine existe.
 */
export declare function refaireSortie(racine: string): BilanRefait;
