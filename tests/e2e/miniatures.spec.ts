import { expect, test, type Locator, type Page } from '@playwright/test';

import { INSECABLE, attendreHydratation, attendrePage, ouvrir, pastillePanier } from './aides';

/**
 * LES MINIATURES DES PRODUITS ACHETÉS ET LE « − [CHAMP] + » DU PANIER (C27).
 *
 * Tout ce qui est prouvé ici l'est par une MESURE du navigateur — `currentSrc`,
 * `naturalWidth`, rectangles, style calculé, `checkVisibility` — jamais par une
 * lecture de la source : « une règle juste écrite au mauvais endroit » (une
 * miniature rendue et jamais demandée, une règle d'impression qui ne s'applique
 * pas) est invisible au code et parfaitement visible à la mesure.
 *
 * Les deux profils du dépôt jouent ce fichier (bureau 1280, mobile 390) : le
 * cadre fait 4,5 rem au-dessus de 40 rem et 4 rem en dessous, soit 72 et 64 px.
 *
 * LA MINIATURE EST UN CARRÉ COMPOSÉ, ET LE TEST LE DIT (revue du directeur
 * artistique, P1). La première rédaction posait la vue principale (5:8, 4:3 des
 * coffrets) en `object-fit: cover` : le carré central retirait 37,5 % de la
 * hauteur d'une bouteille. Le dérivé servi doit donc être le dérivé `miniature`
 * — celui que le pipeline compose —, il doit être CARRÉ dans ses octets
 * (`naturalWidth === naturalHeight`), et le navigateur ne doit plus rien
 * recadrer (`object-fit` calculé : `fill`, jamais `cover`). Les trois tombent si
 * l'on remet l'ancien dérivé ou l'ancienne règle (preuves rouges au rapport).
 */

const HUILE = { slug: 'huile-olive-premiere-pression' } as const;
const NOIX = { slug: 'huile-noix-moulin' } as const;
/** Le pire cas du panier : un coffret à 46,00 €, stock 14, soit 644,00 € la ligne. */
const COFFRET = { slug: 'coffret-table-du-dimanche', stock: 14 } as const;

const CLIENT = {
  nom: 'Client d’essai',
  adresse: '1, rue de l’Exemple',
  codePostal: '69001',
  courriel: 'client-essai@example.invalid',
} as const;

/** Le côté du cadre : 4,5 rem à partir de 40 rem de fenêtre, 4 rem en dessous. */
function cote(page: Page): number {
  const largeur = page.viewportSize()?.width ?? 0;

  return largeur >= 640 ? 72 : 64;
}

/** Ajoute le produit d'une fiche et ferme le tiroir, comme le ferait le visiteur. */
async function ajouterDepuisLaFiche(page: Page, slug: string): Promise<void> {
  await ouvrir(page, `/boutique/${slug}`);
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeHidden();
}

async function panierDeDeuxLignes(page: Page): Promise<void> {
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ajouterDepuisLaFiche(page, NOIX.slug);
}

async function sansDebordement(page: Page): Promise<void> {
  const ecart = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  try {
    await expect.poll(ecart, { timeout: 3000 }).toBeLessThanOrEqual(0);
  } catch {
    /* LE MESSAGE D'ÉCHEC NOMME LES COUPABLES : l'intégration continue a lu
       773 px dans une fenêtre de 360 sans que rien ne dise quoi (07/10). Les
       trois éléments qui dépassent le plus le bord droit, avec de quoi les
       retrouver — un rouge se diagnostique sans être rejoué. */
    const coupables = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .map((element) => ({ element, boite: element.getBoundingClientRect() }))
        .filter(({ boite }) => boite.right > document.documentElement.clientWidth + 0.5)
        .sort((a, b) => b.boite.right - a.boite.right)
        .slice(0, 3)
        .map(({ element, boite }) => ({
          balise: element.tagName.toLowerCase(),
          classe: String(element.getAttribute('class') ?? '').slice(0, 80),
          id: element.id,
          droite: Math.round(boite.right),
          largeur: Math.round(boite.width),
        })),
    );

    expect(await ecart(), JSON.stringify(coupables)).toBeLessThanOrEqual(0);
  }
}

/**
 * La page À CETTE LARGEUR, comme un téléphone la voit : il n'y arrive jamais en
 * partant de 1280. Redimensionner un onglet déjà rendu est un autre cas — une
 * fenêtre de bureau qu'on rétrécit —, et c'est celui que l'intégration continue
 * lisait à 773 px sous Linux, cause non établie (07/10, journal du projet).
 */
async function aLaLargeur(page: Page, largeur: number): Promise<void> {
  await page.setViewportSize({ width: largeur, height: 800 });
  await page.reload();
  await attendreHydratation(page);
}

/**
 * UNE miniature, du BON produit, CHARGÉE, de taille fixe, non cliquable.
 *
 * `currentSrc` et non `src` : le `<picture>` choisit entre l'AVIF et le repli
 * JPEG, et c'est ce que le navigateur a réellement retenu qui compte.
 */
async function verifierMiniature(
  page: Page,
  conteneur: Locator,
  slug: string,
): Promise<void> {
  const cadre = conteneur.locator('[data-miniature]');
  await expect(cadre).toHaveCount(1);
  await expect(cadre).toHaveAttribute('data-miniature', slug);
  await cadre.scrollIntoViewIfNeeded();

  const image = cadre.locator('img');
  await expect(image).toHaveCount(1);

  /* « Chargée » : l'image a été demandée ET décodée. Relu jusqu'à stabilité,
     parce qu'une image paresseuse n'est demandée qu'à l'approche de la fenêtre. */
  await expect
    .poll(() =>
      image.evaluate((noeud: HTMLImageElement) => (noeud.complete ? noeud.naturalWidth : 0)),
    )
    .toBeGreaterThan(0);

  const releve = await cadre.evaluate((noeud) => {
    const img = noeud.querySelector('img');
    const boite = noeud.getBoundingClientRect();
    const boiteImage = img === null ? null : img.getBoundingClientRect();

    return {
      source: img === null ? '' : img.currentSrc,
      largeurNaturelle: img === null ? 0 : img.naturalWidth,
      hauteurNaturelle: img === null ? -1 : img.naturalHeight,
      ajustement: img === null ? '' : getComputedStyle(img).objectFit,
      /* L'image remplit son carré EXACTEMENT : ni plus petite, ni plus grande. */
      remplitLeCadre:
        boiteImage !== null &&
        Math.abs(boiteImage.width - boite.width) < 0.5 &&
        Math.abs(boiteImage.height - boite.height) < 0.5,
      alternative: img === null ? null : img.getAttribute('alt'),
      largeur: boite.width,
      hauteur: boite.height,
      imageDansLeCadre:
        boiteImage !== null &&
        boiteImage.left >= boite.left - 0.5 &&
        boiteImage.right <= boite.right + 0.5 &&
        boiteImage.top >= boite.top - 0.5 &&
        boiteImage.bottom <= boite.bottom + 0.5,
      dansUnLien: noeud.closest('a') !== null,
    };
  });

  /* LE BON DÉRIVÉ : le slug ET le nom de la miniature composée — « principal »
     serait le dérivé 5:8 que `cover` recadrait. */
  expect(releve.source).toContain(`/produits/${slug}/miniature-`);
  expect(releve.source).not.toContain('/principal-');
  /* UN CARRÉ, dans les octets : l'image décodée, pas le cadre qui la porte. */
  expect(releve.largeurNaturelle).toBeGreaterThan(0);
  expect(releve.largeurNaturelle).toBe(releve.hauteurNaturelle);
  /* Et le navigateur ne recadre rien : `cover` retirerait de la hauteur. */
  expect(releve.ajustement).toBe('fill');
  expect(releve.largeur).toBe(cote(page));
  expect(releve.hauteur).toBe(cote(page));
  expect(releve.imageDansLeCadre).toBe(true);
  expect(releve.remplitLeCadre).toBe(true);
  /* Décorative : le nom du produit est juste à côté, et c'est lui qui porte le lien. */
  expect(releve.alternative).toBe('');
  expect(releve.dansUnLien).toBe(false);
}

/**
 * Le bord droit de CHAQUE prix d'une liste de lignes, et celui de la ligne qui le
 * porte. Deux relevés, parce que la retouche dit deux choses : les prix forment
 * une COLONNE (bords égaux entre eux), et cette colonne est à DROITE (égale au
 * bord de la ligne) — une colonne alignée à gauche aurait des bords inégaux, une
 * colonne alignée sur un mauvais bord aussi.
 */
async function bordsDroitsDesPrix(
  lignesMesurees: Locator,
  selecteurPrix: string,
): Promise<{ prix: number[]; ligne: number[] }> {
  return lignesMesurees.evaluateAll((noeuds, selecteur) => {
    const prix: number[] = [];
    const ligne: number[] = [];

    for (const noeud of noeuds) {
      const cible = noeud.querySelector(selecteur);

      if (cible !== null) {
        prix.push(Math.round(cible.getBoundingClientRect().right * 10) / 10);
        ligne.push(Math.round(noeud.getBoundingClientRect().right * 10) / 10);
      }
    }

    return { prix, ligne };
  }, selecteurPrix);
}

/** Les lignes du panier : celles qui portent un champ de quantité. */
function lignes(page: Page): Locator {
  return page.locator('li', { has: page.getByRole('spinbutton') });
}

/* ========================================================================== */
/* LES MINIATURES                                                              */
/* ========================================================================== */

test('le tiroir « Ajouté au panier » montre le produit ajouté, image chargée d’emblée', async ({
  page,
}) => {
  await ouvrir(page, `/boutique/${HUILE.slug}`);

  /* Chargée AVANT l'ouverture : dans un `<dialog>` fermé, une image paresseuse
     ne serait demandée qu'à l'ouverture et le tiroir s'ouvrirait sur un carré
     vide. On le prouve sur le tiroir FERMÉ. */
  const image = page.locator('[data-tiroir-ajout] [data-miniature] img');
  await expect(image).toHaveCount(1);
  await expect(image).toHaveJSProperty('loading', 'eager');
  await expect
    .poll(() => image.evaluate((noeud: HTMLImageElement) => noeud.naturalWidth))
    .toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  const tiroir = page.getByRole('dialog', { name: 'Ajouté au panier' });
  await expect(tiroir).toBeVisible();

  await verifierMiniature(page, tiroir.locator('.tiroir-article'), HUILE.slug);
  await sansDebordement(page);
});

test('chaque ligne du panier porte UNE miniature du bon produit', async ({ page }) => {
  await panierDeDeuxLignes(page);
  await ouvrir(page, '/panier');

  await expect(lignes(page)).toHaveCount(2);

  await verifierMiniature(page, lignes(page).nth(0), HUILE.slug);
  await verifierMiniature(page, lignes(page).nth(1), NOIX.slug);
  await sansDebordement(page);

  /* Texte et miniature s'alignent en HAUT : le bord haut du nom n'est jamais
     plus bas que celui du cadre de plus de la moitié d'une ligne. */
  const ecart = await lignes(page)
    .nth(0)
    .evaluate((noeud) => {
      const cadre = noeud.querySelector('[data-miniature]');
      const nom = noeud.querySelector('a');

      return cadre === null || nom === null
        ? Number.NaN
        : Math.abs(nom.getBoundingClientRect().top - cadre.getBoundingClientRect().top);
    });
  expect(ecart).toBeLessThan(12);
});

test('le cadre est réservé avant l’image : même taille sans un seul octet d’image', async ({
  page,
}) => {
  await panierDeDeuxLignes(page);

  /* Aucune photographie de produit ne passe. Les cadres doivent déjà occuper
     leur place — c'est ce qui rend le décalage nul à l'arrivée de l'image. */
  await page.route('**/produits/**', (requete) => requete.abort());
  await ouvrir(page, '/panier');

  await expect(lignes(page)).toHaveCount(2);

  const cadres = page.locator('[data-miniature]');
  await expect(cadres).toHaveCount(2);

  for (let i = 0; i < 2; i += 1) {
    const boite = await cadres.nth(i).evaluate((noeud) => {
      const r = noeud.getBoundingClientRect();

      return { largeur: r.width, hauteur: r.height };
    });

    expect(boite).toEqual({ largeur: cote(page), hauteur: cote(page) });
  }

  await sansDebordement(page);
});

test('le récapitulatif de la commande porte les mêmes miniatures', async ({ page }) => {
  await panierDeDeuxLignes(page);
  await ouvrir(page, '/commande');

  const articles = page.getByRole('region', { name: 'Récapitulatif' });
  await expect(articles).toBeVisible();

  const lignesFigees = page.locator('li', { has: page.locator('[data-miniature]') });
  await expect(lignesFigees).toHaveCount(2);

  await verifierMiniature(page, lignesFigees.nth(0), HUILE.slug);
  await verifierMiniature(page, lignesFigees.nth(1), NOIX.slug);
  await sansDebordement(page);
});

/* ========================================================================== */
/* LES PRIX, ALIGNÉS À DROITE (retouches P2 du directeur artistique)           */
/* ========================================================================== */

test('les sous-totaux du panier forment une colonne, bords droits égaux, à 360 et à 390', async ({
  page,
}) => {
  /* LE PIRE CAS : trois lignes aux montants de largeurs très différentes —
     14 × 46,00 € = 644,00 € (le plus long), puis deux huiles. */
  await ajouterDepuisLaFiche(page, COFFRET.slug);
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ajouterDepuisLaFiche(page, NOIX.slug);
  await ouvrir(page, '/panier');

  const coffret = lignes(page).filter({ hasText: 'Coffret' }).first();
  await coffret.getByRole('spinbutton', { name: 'Qté', exact: true }).fill(String(COFFRET.stock));
  await expect(coffret.locator('[data-chiffre]')).toHaveText(`644,00${INSECABLE}€`);

  for (const largeur of [360, 390]) {
    await aLaLargeur(page, largeur);
    await expect(lignes(page)).toHaveCount(3);
    await sansDebordement(page);

    /* Les métriques de police décident des retours à la ligne : on mesure
       après le chargement des polices, jamais pendant. */
    await page.evaluate(() => document.fonts.ready);
    const bords = await bordsDroitsDesPrix(lignes(page), '[data-chiffre]');

    expect(bords.prix).toHaveLength(3);
    /* Une COLONNE, CALÉE AU BORD DROIT DE LA LIGNE : sous 40 rem, « Retirer »
       passe toujours à la ligne suivante (C27, correctif de l'intégration
       continue), donc le sous-total finit au bord de la rangée quelle que soit
       la largeur du montant ou la police du système. Le bord seul ne suffirait
       pas : sous Windows il restait égal d'une ligne à l'autre alors que la
       rangée cassait sous Linux — c'est le calage au bord qui ne dépend plus
       des métriques de police. Les mesures sont jointes au message d'échec. */
    const releve = JSON.stringify(bords);
    expect(new Set(bords.prix).size, releve).toBe(1);
    bords.prix.forEach((bord, rang) => {
      expect(bord, releve).toBeCloseTo(bords.ligne[rang] ?? Number.NaN, 0);
    });

    /* Le test ne vaut que si les montants n'ont PAS tous la même largeur : sans
       cela, une colonne alignée à gauche passerait aussi. */
    const largeurs = await lignes(page)
      .locator('[data-chiffre]')
      .evaluateAll((noeuds) => noeuds.map((noeud) => Math.round(noeud.getBoundingClientRect().width)));

    expect(new Set(largeurs).size).toBeGreaterThan(1);
  }
});

test('le prix de chaque ligne du récapitulatif de la commande est aligné à droite sur mobile', async ({
  page,
}) => {
  await ajouterDepuisLaFiche(page, COFFRET.slug);
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ouvrir(page, '/commande');

  const lignesFigees = page.locator('li', { has: page.locator('[data-miniature]') });
  await expect(lignesFigees).toHaveCount(2);

  for (const largeur of [360, 390]) {
    await aLaLargeur(page, largeur);
    await sansDebordement(page);

    /* Les métriques de police décident des retours à la ligne : on mesure
       après le chargement des polices, jamais pendant. */
    await page.evaluate(() => document.fonts.ready);
    const bords = await bordsDroitsDesPrix(lignesFigees, 'p.font-mono');

    expect(bords.prix).toHaveLength(2);
    expect(new Set(bords.prix).size, JSON.stringify(bords)).toBe(1);
    expect(bords.prix[0]).toBeCloseTo(bords.ligne[0] ?? Number.NaN, 0);
  }
});

/**
 * La page qu'un client IMPRIME. Un seul parcours joue le tunnel entier : le
 * récapitulatif, le paiement simulé, la confirmation — puis le papier.
 */
test('la confirmation montre les miniatures, et le papier les remplace par des silhouettes', async ({
  page,
}) => {
  await panierDeDeuxLignes(page);
  await ouvrir(page, '/commande');

  await page.getByLabel('Prénom et nom').fill(CLIENT.nom);
  await page.getByLabel('Adresse de livraison').fill(CLIENT.adresse);
  await page.getByLabel('Code postal').fill(CLIENT.codePostal);
  await page.getByLabel('Courriel').fill(CLIENT.courriel);
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
  await page.getByRole('button', { name: 'Commander avec obligation de paiement' }).click();

  await attendrePage(page, '/paiement/simulation');
  await page.getByRole('link', { name: 'Payer' }).click();
  await attendrePage(page, '/commande/confirmation');

  const lignesCommande = page.locator('li', { has: page.locator('[data-miniature]') });
  await expect(lignesCommande).toHaveCount(2);

  await verifierMiniature(page, lignesCommande.nth(0), HUILE.slug);
  await verifierMiniature(page, lignesCommande.nth(1), NOIX.slug);
  await sansDebordement(page);

  /* Le prix de la ligne de confirmation est lui aussi calé à droite, sous la
     miniature comme à côté d'elle (retouche P2 du directeur artistique). */
  const fenetreInitiale = page.viewportSize() ?? { width: 1280, height: 800 };

  for (const largeur of [360, 390]) {
    await aLaLargeur(page, largeur);
    await sansDebordement(page);
    await page.evaluate(() => document.fonts.ready);

    const bords = await bordsDroitsDesPrix(lignesCommande, 'p.font-mono');

    expect(bords.prix).toHaveLength(2);
    expect(new Set(bords.prix).size, JSON.stringify(bords)).toBe(1);
    expect(bords.prix[0]).toBeCloseTo(bords.ligne[0] ?? Number.NaN, 0);
  }

  await aLaLargeur(page, fenetreInitiale.width);

  /* ─── LE PAPIER ─────────────────────────────────────────────────────────
     Convention de C12 et C14 : `.visuel-produit img` sort, `[data-repli-
     silhouette]` rentre. Une miniature doit alors devenir un dessin au trait
     DANS son carré — ni carré vide, ni silhouette de 168 points qui déborde.
     Mesuré par la visibilité réelle et la géométrie, jamais par la source. */
  await page.emulateMedia({ media: 'print' });

  const cadres = page.locator('[data-miniature]');
  await expect(cadres).toHaveCount(2);

  for (let i = 0; i < 2; i += 1) {
    const papier = await cadres.nth(i).evaluate((noeud) => {
      const img = noeud.querySelector('img');
      const silhouette = noeud.querySelector('[data-repli-silhouette]');
      const dessin = silhouette === null ? null : silhouette.querySelector('svg');
      const cadre = noeud.getBoundingClientRect();
      const trace = dessin === null ? null : dessin.getBoundingClientRect();
      const options = { checkVisibilityCSS: true } as const;

      return {
        photographieVisible: img === null ? null : img.checkVisibility(options),
        silhouetteVisible: dessin === null ? null : dessin.checkVisibility(options),
        largeurDuTrace: trace === null ? 0 : trace.width,
        hauteurDuTrace: trace === null ? 0 : trace.height,
        traceDansLeCadre:
          trace !== null &&
          trace.left >= cadre.left - 0.5 &&
          trace.right <= cadre.right + 0.5 &&
          trace.top >= cadre.top - 0.5 &&
          trace.bottom <= cadre.bottom + 0.5,
        cadre: { largeur: cadre.width, hauteur: cadre.height },
      };
    });

    expect(papier.photographieVisible).toBe(false);
    expect(papier.silhouetteVisible).toBe(true);
    /* Pas un carré vide : le trait occupe une part réelle du cadre. */
    expect(papier.largeurDuTrace).toBeGreaterThan(cote(page) / 4);
    expect(papier.hauteurDuTrace).toBeGreaterThan(cote(page) / 2);
    expect(papier.traceDansLeCadre).toBe(true);
    expect(papier.cadre).toEqual({ largeur: cote(page), hauteur: cote(page) });
  }

  await sansDebordement(page);
});

/* ========================================================================== */
/* LE « − [CHAMP] + » DU PANIER                                                */
/* ========================================================================== */

test('« + » et « − » changent la quantité et le sous-total ; « − » s’éteint à 1, « + » au stock', async ({
  page,
}) => {
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ouvrir(page, '/panier');

  const ligne = lignes(page).first();
  const champ = ligne.getByRole('spinbutton', { name: 'Qté', exact: true });
  const moins = ligne.getByRole('button', { name: /^Retirer un exemplaire de / });
  const plus = ligne.getByRole('button', { name: /^Ajouter un exemplaire de / });
  const sousTotal = ligne.locator('[data-chiffre]');

  await expect(champ).toHaveValue('1');
  await expect(moins).toHaveAttribute('aria-disabled', 'true');
  await expect(plus).toHaveAttribute('aria-disabled', 'false');

  /* Éteint à 1 : un appui n'ôte pas la ligne — « Retirer » est juste à côté. */
  await moins.click({ force: true });
  await expect(champ).toHaveValue('1');
  await expect(lignes(page)).toHaveCount(1);

  const sousTotalAUn = await sousTotal.innerText();

  await plus.click();
  await expect(champ).toHaveValue('2');
  await expect(sousTotal).not.toHaveText(sousTotalAUn);
  await expect(pastillePanier(page)).toHaveText('2');
  await expect(moins).toHaveAttribute('aria-disabled', 'false');
  /* Le focus reste sur le bouton pressé : on peut enchaîner les appuis. */
  await expect(plus).toBeFocused();

  await moins.click();
  await expect(champ).toHaveValue('1');
  await expect(sousTotal).toHaveText(sousTotalAUn);
  await expect(pastillePanier(page)).toHaveText('1');
  await expect(moins).toHaveAttribute('aria-disabled', 'true');
  await expect(moins).toBeFocused();

  /* Au stock : « + » s'éteint et un appui de plus ne change rien. */
  const stock = Number(await champ.getAttribute('max'));
  expect(stock).toBeGreaterThan(2);

  await champ.fill(String(stock));
  await expect(champ).toHaveValue(String(stock));
  await expect(plus).toHaveAttribute('aria-disabled', 'true');
  await plus.click({ force: true });
  await expect(champ).toHaveValue(String(stock));
  await expect(pastillePanier(page)).toHaveText(String(stock));

  await moins.click();
  await expect(champ).toHaveValue(String(stock - 1));
  await expect(plus).toHaveAttribute('aria-disabled', 'false');
});

test('le champ reste un champ : saisie au clavier, flèches du clavier, sortie à vide', async ({
  page,
}) => {
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ouvrir(page, '/panier');

  const ligne = lignes(page).first();
  const champ = ligne.getByRole('spinbutton', { name: 'Qté', exact: true });
  const sousTotal = ligne.locator('[data-chiffre]');
  const avant = await sousTotal.innerText();

  await champ.fill('12');
  await expect(champ).toHaveValue('12');
  await expect(sousTotal).not.toHaveText(avant);
  await expect(pastillePanier(page)).toHaveText('12');

  /* La flèche haute du clavier incrémente toujours : sémantique `spinbutton`. */
  await champ.press('ArrowUp');
  await expect(champ).toHaveValue('13');

  /* Le correctif de sortie : un champ vidé redevient la quantité tenue. */
  await champ.fill('');
  await champ.blur();
  await expect(champ).toHaveValue('13');
  await expect(pastillePanier(page)).toHaveText('13');
});

test('le champ du panier n’a ni flèches natives ni bordure propre, et garde ses 44 points', async ({
  page,
}) => {
  await ajouterDepuisLaFiche(page, HUILE.slug);
  await ouvrir(page, '/panier');

  const ligne = lignes(page).first();
  const champ = ligne.getByRole('spinbutton', { name: 'Qté', exact: true });

  /* Le style CALCULÉ, pas la règle écrite : la règle de Tailwind pose bordure et
     fond sur les champs dans une couche, et seule la mesure dit laquelle gagne. */
  const style = await champ.evaluate((noeud) => {
    const calcule = getComputedStyle(noeud);

    return {
      bordure: calcule.borderTopWidth,
      apparence: calcule.appearance,
      fond: calcule.backgroundColor,
      hauteur: noeud.getBoundingClientRect().height,
      famille: calcule.fontFamily,
    };
  });

  expect(style.bordure).toBe('0px');
  /* `appearance: textfield` est ce qui retire les flèches natives de Chromium :
     sans lui, un bureau montrerait deux jeux de contrôles dans le même cadre. */
  expect(style.apparence).toBe('textfield');
  expect(style.fond).toBe('rgba(0, 0, 0, 0)');
  expect(style.hauteur).toBeGreaterThanOrEqual(44);

  /* Le libellé « Qté » reste en mono, comme avant. */
  const etiquette = await ligne
    .getByText('Qté', { exact: true })
    .evaluate((noeud) => getComputedStyle(noeud).fontFamily);
  expect(etiquette).toContain('mono');

  /* Le cadre du pas encadre bien les trois éléments, sur une seule rangée. */
  const rangee = await ligne.getByRole('group', { name: /^Quantité de / }).evaluate((noeud) => {
    const enfants = [...noeud.children].map((enfant) => enfant.getBoundingClientRect());
    const cadre = noeud.getBoundingClientRect();

    return {
      trois: enfants.length,
      memeLigne: enfants.every((r) => Math.abs(r.top - enfants[0]!.top) < 1),
      dedans: enfants.every((r) => r.left >= cadre.left - 0.5 && r.right <= cadre.right + 0.5),
      cibles: enfants.every((r) => r.height >= 44 && (r.width >= 44 || enfants.indexOf(r) === 1)),
    };
  });

  expect(rangee).toEqual({ trois: 3, memeLigne: true, dedans: true, cibles: true });
  await sansDebordement(page);
});
