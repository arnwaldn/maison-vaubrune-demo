import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * LES OUTILS COMMUNS DES QUATRE CAMPAGNES.
 *
 * Ce fichier n'est pas un test — l'extension `.ts` sans `.spec` le tient hors
 * du filet de Playwright, qui ne ramasse que `*.spec.ts`. Il porte ce que les
 * six fichiers de `tests/e2e/` partagent, et rien d'autre.
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
 * Pourquoi il en faut une
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
 * et le verdict dépendrait de la vitesse de la machine. Aucune attente en
 * durée fixe non plus : une pause de « 500 ms » passe sur le poste qui l'a
 * écrite et échoue sur le conteneur d'intégration continue.
 *
 * ---------------------------------------------------------------------------
 * TROIS SIGNAUX POSITIFS (tranche C11), et pourquoi ils ont remplacé une absence
 * ---------------------------------------------------------------------------
 *
 * Le critère de C8 attendait l'ABSENCE de `div[aria-hidden="true"]` dans la
 * page. Il était juste au moment où il a été écrit — ces `div`-là ne
 * désignaient alors que les places réservées — et il devient faux à la
 * première refonte visuelle : un filet décoratif, un dégradé, un ornement
 * masqué aux lecteurs d'écran est un `div[aria-hidden]` de plus, et il ne
 * disparaît jamais. La barrière attendrait alors pour toujours, et TOUTES les
 * campagnes échoueraient sur un élément de décor.
 *
 * Un critère d'absence dépend de tout ce que la page NE contient pas ; un
 * critère de présence ne dépend que de ce qu'on a posé exprès. Les trois
 * signaux ci-dessous sont posés exprès :
 *
 * 1. `data-hydratation="prete"` SUR `<html>` — posé par un effet de
 *    `src/lib/fournisseurs.tsx`, la frontière cliente de la mise en page
 *    racine. C'est le seul signal qui vaille sur TOUTES les routes, y compris
 *    les pages légales, qui n'ont aucun îlot à elles et où les deux autres
 *    signaux sont vrais dès la première image.
 * 2. `[data-place-reservee]` A DISPARU — l'attribut ne désigne que les huit
 *    places réservées du projet, et rien d'autre ne peut le porter par
 *    accident. C'est le signal qui dit que les îlots ont fini de lire le
 *    stockage, là où le premier ne dit que « les contextes sont montés ».
 * 3. LES POLICES SONT STABILISÉES — `document.fonts.ready`. Les polices du
 *    site sont auto-hébergées avec des replis à métriques ajustées : le texte est
 *    donc lisible avant l'échange, mais ses retours à la ligne changent au
 *    moment où il a lieu. Une assertion sur un texte lu à cet instant précis
 *    est instable pour une raison qui n'a rien à voir avec ce qu'elle vérifie.
 *
 *    ATTENTION — la première rédaction de C11 lisait `document.fonts.status`,
 *    et c'était FAUX dans les deux sens. La spécification `FontFaceSet` dit
 *    que `status` vaut `'loaded'` tant qu'aucun chargement n'a COMMENCÉ, et
 *    qu'il y retourne quand un chargement ÉCHOUE. Le signal était donc vrai
 *    trop tôt (avant que la page ait demandé sa police) et vrai à tort (après
 *    un échec) : il ne garantissait rien du tout. `fonts.ready` est la
 *    promesse qui se résout quand le jeu de polices est STABLE, c'est-à-dire
 *    la seule chose qu'on veut savoir ici.
 *
 * La pastille du panier ne sert plus de signal : elle disait la même chose que
 * le deuxième critère, en moins direct, et son gabarit relève de l'apparence
 * de l'en-tête — c'est-à-dire de ce que la refonte va justement redessiner.
 *
 * ---------------------------------------------------------------------------
 * CONTRAT D'EMPLOI — après une navigation CLIENTE, jamais cette fonction seule
 * ---------------------------------------------------------------------------
 *
 * `data-hydratation` est posé une fois et n'est JAMAIS retiré : la mise en
 * page racine ne se démonte pas, et un attribut qu'on retirerait pour le
 * reposer ferait clignoter le signal. Il reste donc vrai après une navigation
 * par `<Link>`, qui ne recharge pas le document.
 *
 * Conséquence à respecter, sous peine de lire l'écran PRÉCÉDENT :
 *
 * - après `page.goto()` (ou `ouvrir()`), le document est neuf, l'attribut a
 *   disparu avec lui, et `attendreHydratation()` seule est correcte ;
 * - après un CLIC qui navigue, il faut `attendrePage()` — `waitForURL` d'abord,
 *   la barrière ensuite. Sans le `waitForURL`, la barrière trouve la page
 *   d'avant déjà hydratée et rend la main immédiatement.
 *
 * `attendrePage()` est exportée d'ici, et non recopiée dans chaque campagne,
 * pour que le contrat soit OUTILLÉ plutôt que retenu de mémoire.
 */

/**
 * Le délai accordé à CHAQUE signal.
 *
 * Sur une construction de production servie en local, les trois sont atteints
 * en moins d'une seconde. Dix secondes laissent donc une marge considérable
 * tout en gardant le total (trente secondes) sous le délai par défaut d'un
 * test — un signal qui manque se signale, il n'épuise pas la campagne.
 */
const DELAI_SIGNAL = 10_000;

/** L'état des trois signaux, tel que la page le montre à l'instant t. */
async function etatDesSignaux(page: Page): Promise<string> {
  try {
    const releve = await page.evaluate(() => ({
      adresse: `${location.pathname}${location.search}`,
      hydratation: document.documentElement.dataset['hydratation'] ?? '(attribut absent)',
      places: document.querySelectorAll('[data-place-reservee]').length,
      polices: document.fonts.status,
    }));

    return (
      `page ${releve.adresse} — data-hydratation=${releve.hydratation}, ` +
      `${String(releve.places)} place(s) réservée(s) restante(s), ` +
      `document.fonts.status=${releve.polices}`
    );
  } catch {
    /* La page a pu être fermée ou avoir navigué pendant le relevé : mieux vaut
       un diagnostic incomplet qu'une seconde erreur qui masque la première. */
    return 'état non relevable (page fermée ou en cours de navigation)';
  }
}

/**
 * Attend UN signal, et dit lequel a manqué quand il manque.
 *
 * Un `waitForFunction` qui expire annonce « Timeout 30000ms exceeded » et rien
 * d'autre : la barrière était muette, et un échec de campagne obligeait à
 * relire le code pour deviner lequel des trois signaux n'était pas venu. Les
 * trois attentes sont donc séparées et nommées, et l'échec porte le relevé des
 * trois — celui qui manque comme les deux qui étaient là.
 */
async function attendreSignal(
  page: Page,
  nom: string,
  predicat: () => boolean,
): Promise<void> {
  try {
    await page.waitForFunction(predicat, undefined, { timeout: DELAI_SIGNAL });
  } catch {
    throw new Error(
      `Barrière d’hydratation : le signal « ${nom} » n’est jamais venu ` +
        `(${String(DELAI_SIGNAL)} ms). État relevé : ${await etatDesSignaux(page)}`,
    );
  }
}

export async function attendreHydratation(page: Page): Promise<void> {
  await attendreSignal(page, 'data-hydratation="prete" sur <html>', () => {
    return document.documentElement.dataset['hydratation'] === 'prete';
  });

  await attendreSignal(page, 'plus aucune [data-place-reservee]', () => {
    return document.querySelectorAll('[data-place-reservee]').length === 0;
  });

  await attendreSignal(page, 'polices stabilisées (document.fonts.ready)', () => {
    /* `fonts.ready` est une PROMESSE, et le prédicat d'une attente doit être
       synchrone. On l'accroche une seule fois par document, à la première
       évaluation, et on relit le drapeau qu'elle lèvera — Playwright réévalue
       le prédicat à chaque image, la bascule est donc vue aussitôt. */
    const fenetre = window as unknown as { policesStabilisees?: boolean };

    if (fenetre.policesStabilisees === undefined) {
      fenetre.policesStabilisees = false;
      void document.fonts.ready.then(() => {
        fenetre.policesStabilisees = true;
      });
    }

    return fenetre.policesStabilisees;
  });
}

/**
 * Attend l'arrivée effective sur une adresse, PUIS son hydratation.
 *
 * À employer après tout CLIC qui navigue — voir le contrat d'emploi ci-dessus.
 * Les liens du site sont des `<Link>` : le clic déclenche une navigation côté
 * client, qui n'est pas terminée quand la promesse du clic se résout.
 */
export async function attendrePage(page: Page, chemin: string): Promise<void> {
  await page.waitForURL((url) => url.pathname === chemin);
  await attendreHydratation(page);
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

/**
 * Le lien du rayon dans la navigation principale, à l'exclusion du reste.
 *
 * LE LOCALISATEUR NU : il ne déplie rien, et c'est délibéré. C'est lui qui
 * permet d'écrire le cas « au chargement, les trois destinations n'ont pas de
 * boîte sur le profil replié ». Un repère qui ouvrirait le menu tout seul
 * rendrait ce cas-là vert quoi qu'il arrive — le défaut de C16, « un test vert
 * ne prouve rien tant qu'on ne l'a pas vu rouge pour la raison qu'il annonce ».
 *
 * Pour CLIQUER une destination, employer `cliquerNavigation()` juste dessous.
 */
export function lienNavigation(page: Page, libelle: string): Locator {
  return page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: libelle, exact: true });
}

/**
 * Ouvre le menu de l'en-tête S'IL EST REPLIÉ, et ne fait rien sinon.
 *
 * TROIS PROPRIÉTÉS, ET CHACUNE FERME UN DÉFAUT QU'ON AURAIT EU AUTREMENT.
 *
 * 1. LE CRITÈRE EST UNE BOÎTE, JAMAIS UNE LARGEUR DE FENÊTRE. Le bouton est
 *    rendu à toutes les largeurs ; c'est la feuille qui le retire au-dessus de
 *    `md`. Un repère qui lirait `viewportSize()` déciderait sur un nombre que
 *    la feuille de style ne connaît pas, et il mentirait le jour où le point
 *    d'arrêt bouge. `isVisible()` lit ce que le moteur a calculé.
 * 2. IL NE COÛTE RIEN AU PROFIL BUREAU. `isVisible()` est un RELEVÉ, pas une
 *    assertion : il rend faux immédiatement quand l'élément n'a pas de boîte,
 *    sans attente ni délai d'expiration.
 * 3. IL NE SUPPOSE PAS QUE LE MENU EXISTE. Tant que le repliable n'est pas
 *    écrit, le localisateur ne trouve rien, la fonction est un passe-plat, et
 *    la campagne reste verte À L'IDENTIQUE. C'est ce qui permet de POSER LE
 *    HARNAIS D'ABORD — l'exigence écrite de C17 — et de PROUVER qu'il ne change
 *    rien avant que le composant existe.
 *
 * IDEMPOTENT : appelé deux fois, il lit `open` et sort. Et il ne REFERME jamais
 * rien : la fermeture à la navigation est une propriété du SITE ; la refaire
 * ici la rendrait vraie dans la campagne et fausse chez le visiteur.
 */
export async function ouvrirMenuSiReplie(page: Page): Promise<void> {
  const repliable = page.locator('[data-chrome-entete] details[data-menu-entete]');
  const bouton = repliable.locator('summary');

  if (!(await bouton.isVisible())) {
    return;
  }

  if (await repliable.evaluate((noeud: HTMLDetailsElement) => noeud.open)) {
    return;
  }

  await bouton.click();
  await expect(repliable).toHaveJSProperty('open', true);
}

/** Déplie le menu si besoin, PUIS clique la destination. Le geste du visiteur. */
export async function cliquerNavigation(page: Page, libelle: string): Promise<void> {
  await ouvrirMenuSiReplie(page);
  await lienNavigation(page, libelle).click();
}
