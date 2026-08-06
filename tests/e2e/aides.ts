import type { Locator, Page } from '@playwright/test';

/**
 * LES OUTILS COMMUNS DES QUATRE CAMPAGNES.
 *
 * Ce fichier n'est pas un test — l'extension `.ts` sans `.spec` le tient hors
 * du filet de Playwright, qui ne ramasse que `*.spec.ts`. Il porte ce que les
 * quatre fichiers de `tests/e2e/` partagent, et rien d'autre.
 */

/* -------------------------------------------------------------------------- */
/* Les montants, écrits en toutes lettres                                      */
/* -------------------------------------------------------------------------- */

/** U+00A0, par son point de code : aucun caractère invisible dans ce fichier. */
export const INSECABLE = String.fromCodePoint(0x00a0);

/** U+202F, l'espace fine. Tolérée en LECTURE, jamais écrite (voir D11). */
export const FINE_INSECABLE = String.fromCodePoint(0x202f);

/**
 * Un prix, tel que le site l'affiche.
 *
 * VOLONTAIREMENT écrit à la main plutôt qu'obtenu de `formaterEuros()`. Un
 * test qui formate ses attentes avec la fonction qu'il vérifie ne vérifie
 * rien : les deux se trompent ensemble. Les montants attendus par le parcours
 * fumigatoire sont donc des chaînes littérales, et si le formatage change,
 * c'est le test qui doit être relu.
 */
export function euros(montant: string): string {
  return `${montant}${INSECABLE}€`;
}

/* -------------------------------------------------------------------------- */
/* La barrière d'hydratation                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Attend que la page soit HYDRATÉE et que ses îlots aient lu le stockage.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi il en faut une, et pourquoi ce signal-là
 * ---------------------------------------------------------------------------
 *
 * Le HTML servi par ce site ne connaît ni le panier du visiteur, ni ses
 * commandes, ni sa surcouche de catalogue : tout cela vit dans le
 * `localStorage` et n'apparaît qu'après montage (décision D2). Les écrans
 * concernés réservent d'ici là une PLACE RÉSERVÉE — un `<div aria-hidden>` de
 * hauteur fixe, posé pour que rien ne saute (le raisonnement chiffré est en
 * tête d'`IlotPanier`).
 *
 * Un test qui lirait la page avant ce moment verrait donc une coquille vide,
 * et le verdict dépendrait de la vitesse de la machine. Deux conditions, et
 * il faut les deux :
 *
 * 1. LA PASTILLE DU PANIER PORTE UN NOMBRE. Elle est dans l'en-tête de TOUTES
 *    les pages, son gabarit est vide avant hydratation et porte un chiffre
 *    après (voir `PastillePanier`) : c'est le signal universel du site.
 * 2. PLUS AUCUNE PLACE RÉSERVÉE. `div[aria-hidden="true"]` ne désigne, dans
 *    tout le projet, que ces places-là — les autres éléments masqués aux
 *    lecteurs d'écran sont des `span`, un `dd` et des `svg`. Leur disparition
 *    signale que les effets de montage ont rendu leur verdict.
 *
 * Aucune attente en durée fixe : une pause de « 500 ms » passe sur le poste
 * qui l'a écrite et échoue sur le conteneur d'intégration continue.
 */
export async function attendreHydratation(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const pastille = document.querySelector(
      'header a[href="/panier"] span[aria-hidden="true"]',
    );

    if (pastille === null || pastille.textContent === '') {
      return false;
    }

    return document.querySelectorAll('div[aria-hidden="true"]').length === 0;
  });
}

/** Ouvre une adresse et attend que ses îlots aient fini de se régler. */
export async function ouvrir(page: Page, chemin: string): Promise<void> {
  await page.goto(chemin);
  await attendreHydratation(page);
}

/* -------------------------------------------------------------------------- */
/* Les repères de l'interface                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Le compteur d'articles de l'en-tête.
 *
 * C'est le rectangle `aria-hidden` de `PastillePanier`, celui qui porte le
 * nombre. Le décompte annoncé aux lecteurs d'écran est à côté, dans un texte
 * réservé — les deux disent la même chose, celui-ci se lit à l'œil.
 */
export function pastillePanier(page: Page): Locator {
  return page.locator('header a[href="/panier"] span[aria-hidden="true"]');
}

/** Le lien du rayon dans la navigation principale, à l'exclusion du reste. */
export function lienNavigation(page: Page, libelle: string): Locator {
  return page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: libelle, exact: true });
}
