import { expect, test, type Locator, type Page } from '@playwright/test';

import { attendrePage, ouvrir, pastillePanier } from './aides';

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
 */

const HUILE = { slug: 'huile-olive-premiere-pression' } as const;
const NOIX = { slug: 'huile-noix-moulin' } as const;

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
  const mesure = await page.evaluate(() => ({
    contenu: document.documentElement.scrollWidth,
    fenetre: document.documentElement.clientWidth,
  }));

  expect(mesure.contenu).toBeLessThanOrEqual(mesure.fenetre);
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

  expect(releve.source).toContain(`/produits/${slug}/`);
  expect(releve.largeur).toBe(cote(page));
  expect(releve.hauteur).toBe(cote(page));
  expect(releve.imageDansLeCadre).toBe(true);
  /* Décorative : le nom du produit est juste à côté, et c'est lui qui porte le lien. */
  expect(releve.alternative).toBe('');
  expect(releve.dansUnLien).toBe(false);
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
