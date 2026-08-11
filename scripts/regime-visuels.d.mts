/**
 * Les types de `regime-visuels.mjs`, écrits à la main.
 *
 * L'implémentation reste en `.mjs` comme toutes les gardes du projet — elles
 * sont de l'OUTILLAGE, exécuté par `node` ou `tsx`, jamais empaqueté dans le
 * site. Mais elle est désormais importée par un test `.ts`, et le projet
 * compile avec `allowJs: false` : sans déclaration, `tsc --noEmit` refuserait
 * l'import. Dix lignes ici valent mieux qu'un `allowJs` ouvert pour tout le
 * dépôt, ou qu'un `@ts-expect-error` qui masquerait aussi les vraies fautes.
 *
 * TypeScript résout `./regime-visuels.mjs` vers `./regime-visuels.d.mts` — la
 * correspondance est celle des extensions ESM, il n'y a rien à configurer.
 */

/** Le verdict du régime (b) : les anomalies, et de quoi écrire une observation. */
export interface VerdictVisuels {
  /** Vide si le catalogue est conforme. Un message par défaut constaté. */
  readonly anomalies: readonly string[];
  /** Nombre de produits portant un champ `visuel`. */
  readonly illustres: number;
  /** Nombre d'alternatives textuelles DISTINCTES relevées. */
  readonly alternatives: number;
}

/**
 * Contrôle le régime (b) — alternatives non vides et toutes distinctes.
 *
 * Tolérant : un produit sans champ `visuel` est ignoré, ce qui est le cas de
 * tous tant que la tranche C14 n'a pas ouvert le schéma.
 */
export declare function controlerVisuels(
  catalogue: readonly Record<string, unknown>[],
): VerdictVisuels;
