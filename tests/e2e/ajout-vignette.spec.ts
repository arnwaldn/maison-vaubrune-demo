import { expect, test, type Locator, type Page } from '@playwright/test';

import { attendrePage, euros, ouvrir, pastillePanier } from './aides';

/**
 * L'AJOUT AU PANIER DEPUIS LES VIGNETTES (C26).
 *
 * Les preuves sont des MESURES — géométrie dans la fenêtre, point d'impact,
 * `boundingBox`, style calculé, compteur de la pastille du panier — et jamais
 * une lecture de source : un bouton qui existe dans le DOM mais que la mise en
 * page recouvre, ou une règle de couche qui ne s'applique pas, passeraient
 * toutes les relectures. La campagne joue sur les deux profils du dépôt.
 */

const CLE_SURCOUCHE = 'maison-vaubrune.catalogue-surcouche.v1';

const OLIVE = {
  slug: 'huile-olive-premiere-pression',
  sku25: 'MV-HV-OLI-25CL',
  nom: 'Huile d’olive de première pression',
} as const;
const NOIX = { slug: 'huile-noix-moulin' } as const;
const COFFRET = { slug: 'coffret-composez-le-votre' } as const;

/** Les deux endroits où la même vignette est posée. */
const PAGES = [
  { nom: 'le rayon', chemin: '/boutique' },
  { nom: 'le rail de l’accueil', chemin: '/' },
] as const;

function carte(page: Page, slug: string): Locator {
  return page.locator(`.carte-produit:has(a[href="/boutique/${slug}"])`);
}

function boutonAjout(carteProduit: Locator): Locator {
  return carteProduit.getByRole('button', { name: /^Ajouter au panier\s:\s/ });
}

function boutonPlus(carteProduit: Locator): Locator {
  return carteProduit.getByRole('button', { name: /^Ajouter un exemplaire de / });
}

function boutonMoins(carteProduit: Locator): Locator {
  return carteProduit.getByRole('button', { name: /^Retirer un exemplaire de / });
}

function pas(carteProduit: Locator): Locator {
  return carteProduit.getByRole('group', { name: /^Quantité de / });
}

function pastille(carteProduit: Locator, format: string): Locator {
  return carteProduit.locator('label.vignette-pastille', { hasText: format });
}

async function poserSurcouche(page: Page, contenu: unknown): Promise<void> {
  await page.addInitScript(
    ([cle, valeur]) => {
      window.localStorage.setItem(cle as string, valeur as string);
    },
    [CLE_SURCOUCHE, JSON.stringify({ version: 1, contenu })],
  );
}

/**
 * Le rectangle entier est dans la fenêtre ET reçoit le toucher en son centre.
 *
 * Relu jusqu'à stabilité (`expect.poll`) : le défilement vers l'élément cliqué
 * et la transition de vue d'une bascule de rayon ne sont pas finis à l'instant
 * du clic, et une mesure unique lirait un état de passage.
 */
async function verifierVisibleEtTouchable(cible: Locator): Promise<void> {
  await expect
    .poll(() =>
      cible.evaluate((noeud) => {
        const r = noeud.getBoundingClientRect();
        const frappe = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);

        return {
          dansLaFenetre:
            r.x >= 0 &&
            r.y >= 0 &&
            r.right <= window.innerWidth &&
            r.bottom <= window.innerHeight,
          recoitLeToucher: frappe !== null && noeud.contains(frappe),
        };
      }),
    )
    .toEqual({ dansLaFenetre: true, recoitLeToucher: true });
}

async function style(cible: Locator, propriete: string): Promise<string> {
  return cible.evaluate(
    (noeud, nom) => getComputedStyle(noeud).getPropertyValue(nom),
    propriete,
  );
}

for (const { nom, chemin } of PAGES) {
  test(`${nom} : Ajouter, +, autre format, −, rechargement, puis /panier`, async ({ page }) => {
    await ouvrir(page, chemin);
    const huile = carte(page, OLIVE.slug);
    await huile.scrollIntoViewIfNeeded();

    await test.step('Ajouter (25 cl) : pastille 1, adresse inchangée, sélecteur dans la fenêtre', async () => {
      await expect(boutonAjout(huile)).toHaveAccessibleName(
        new RegExp(`^Ajouter au panier\\s:\\s${OLIVE.nom}, 25\\scl, 12,90\\s€$`),
      );
      await expect(boutonAjout(huile)).toHaveText('Ajouter au panier');
      const adresse = page.url();

      await boutonAjout(huile).click();

      await expect(pastillePanier(page)).toHaveText('1');
      expect(page.url()).toBe(adresse);
      await expect(pas(huile)).toContainText('1');
      await verifierVisibleEtTouchable(pas(huile));
      await expect(huile.getByRole('status')).toContainText('1 au panier');
    });

    await test.step('+ : deux', async () => {
      await boutonPlus(huile).click();
      await expect(pastillePanier(page)).toHaveText('2');
      await expect(pas(huile)).toContainText('2');
    });

    await test.step('le 50 cl : « Ajouter » revient, au prix de ce format', async () => {
      await pastille(huile, '50').click();

      await expect(boutonAjout(huile)).toHaveAccessibleName(
        new RegExp(`^Ajouter au panier\\s:\\s${OLIVE.nom}, 50\\scl, 22,50\\s€$`),
      );
      await expect(huile.locator('.vignette-prix')).toContainText(euros('22,50'));
      await expect(pas(huile)).toHaveCount(0);

      await boutonAjout(huile).click();
      await expect(pastillePanier(page)).toHaveText('3');
      await expect(pas(huile)).toContainText('1');

      await boutonMoins(huile).click();
      await expect(boutonAjout(huile)).toBeVisible();
      await expect(pastillePanier(page)).toHaveText('2');
    });

    await test.step('rechargement : le sélecteur du 25 cl affiche toujours 2', async () => {
      await ouvrir(page, chemin);
      await expect(pastillePanier(page)).toHaveText('2');
      await expect(pas(carte(page, OLIVE.slug))).toContainText('2');
      await expect(
        carte(page, OLIVE.slug).getByRole('radio', { checked: true }),
      ).toHaveAccessibleName(/25\scl/);
    });

    await test.step('/panier : 25 cl × 2 au montant exact', async () => {
      await page.getByRole('link', { name: /^Panier/ }).click();
      await attendrePage(page, '/panier');

      const ligne = page
        .getByRole('listitem')
        .filter({ has: page.getByRole('button', { name: /^Retirer/ }) })
        .filter({ hasText: OLIVE.nom });

      await expect(ligne).toHaveCount(1);
      await expect(ligne).toContainText(/25\scl/);
      await expect(ligne).toContainText(euros('25,80'));
    });
  });

  test(`${nom} : le 50 cl ajouté puis rechargé revient coché, avec sa quantité`, async ({
    page,
  }) => {
    await ouvrir(page, chemin);
    const huile = carte(page, OLIVE.slug);

    await pastille(huile, '50').click();
    await boutonAjout(huile).click();
    await expect(pas(huile)).toContainText('1');

    await ouvrir(page, chemin);
    const apres = carte(page, OLIVE.slug);

    await expect(apres.getByRole('radio', { checked: true })).toHaveAccessibleName(/50\scl/);
    await expect(pas(apres)).toContainText('1');
    await expect(apres.locator('.vignette-prix')).toContainText(euros('22,50'));
  });

  test(`${nom} : un clic sur l’image ouvre toujours la fiche`, async ({ page }) => {
    await ouvrir(page, chemin);

    await carte(page, OLIVE.slug).locator('.carte-visuel').click();
    await attendrePage(page, `/boutique/${OLIVE.slug}`);
  });

  test(`${nom} : le coffret à composer renvoie à la fiche, sans bouton d’ajout`, async ({
    page,
  }) => {
    await ouvrir(page, chemin === '/' ? '/boutique' : chemin);
    const coffret = carte(page, COFFRET.slug);
    await coffret.scrollIntoViewIfNeeded();

    await expect(boutonAjout(coffret)).toHaveCount(0);
    await expect(pas(coffret)).toHaveCount(0);

    const lien = coffret.getByRole('link', { name: /^Composer\s/ });
    await expect(lien).toHaveAttribute('href', `/boutique/${COFFRET.slug}`);

    await lien.click();
    await attendrePage(page, `/boutique/${COFFRET.slug}`);
  });
}

test('choisir une pastille sur une carte ne change pas la sélection d’une autre', async ({
  page,
}) => {
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);
  const noix = carte(page, NOIX.slug);

  await pastille(huile, '75').click();

  await expect(huile.getByRole('radio', { checked: true })).toHaveAccessibleName(/75\scl/);
  await expect(noix.getByRole('radio', { checked: true })).toHaveAccessibleName(/25\scl/);

  const noms = await page
    .locator('.vignette-formats input[type="radio"]')
    .evaluateAll((entrees) => entrees.map((entree) => (entree as HTMLInputElement).name));
  const groupes = new Set(noms);

  /* Sept produits à plusieurs formats, dont le coffret qui se compose sur sa
     fiche et ne porte pas de pastilles : six groupes — et aucun nom en dur. */
  expect(groupes.size).toBe(6);
  expect([...groupes].every((nomGroupe) => nomGroupe !== '' && !/^format$/.test(nomGroupe))).toBe(
    true,
  );
});

test('aucun identifiant en double sur le rayon (quinze vignettes)', async ({ page }) => {
  await ouvrir(page, '/boutique');

  const doublons = await page.evaluate(() => {
    const vus = new Map<string, number>();

    for (const noeud of document.querySelectorAll('[id]')) {
      vus.set(noeud.id, (vus.get(noeud.id) ?? 0) + 1);
    }

    return [...vus].filter(([, compte]) => compte > 1).map(([id]) => id);
  });

  expect(doublons).toEqual([]);
});

test('les cibles de « − », « + » et des pastilles font au moins 44 × 44 px', async ({
  page,
}) => {
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);
  const hauteurLigne = () =>
    huile.locator('.vignette-ligne').evaluate((noeud) => noeud.getBoundingClientRect().height);
  const avant = await hauteurLigne();

  await boutonAjout(huile).click();

  /* Le pas remplace le bouton SANS changer la hauteur de la rangée : un
     saut de 2 px déplaçait toute la grille en dessous (revue DA du 06/10). */
  await expect(pas(huile)).toBeVisible();
  expect(await hauteurLigne()).toBe(avant);

  const cibles = [
    boutonMoins(huile),
    boutonPlus(huile),
    pastille(huile, '25'),
    pastille(huile, '50'),
    pastille(huile, '75'),
  ];

  for (const cible of cibles) {
    const boite = await cible.boundingBox();

    expect(boite).not.toBeNull();
    expect(boite?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(boite?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('clavier : après « Ajouter » le focus est sur « + », après le dernier « − » sur « Ajouter »', async ({
  page,
}) => {
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);

  await boutonAjout(huile).focus();
  await page.keyboard.press('Enter');

  await expect(boutonPlus(huile)).toBeFocused();

  await boutonMoins(huile).focus();
  await page.keyboard.press('Enter');

  await expect(boutonAjout(huile)).toBeFocused();
  await expect(pastillePanier(page)).toHaveText('0');
});

test('le « + » s’éteint au plafond de stock, par le style calculé', async ({ page }) => {
  await poserSurcouche(page, { [OLIVE.slug]: { variantes: [{ sku: OLIVE.sku25, stock: 2 }] } });
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);

  await boutonAjout(huile).click();
  await expect(boutonPlus(huile)).toBeEnabled();
  await boutonPlus(huile).click();

  await expect(pas(huile)).toContainText('2');
  await expect(boutonPlus(huile)).toBeDisabled();
  expect(await style(boutonPlus(huile), 'opacity')).toBe('0.45');
  expect(await style(boutonPlus(huile), 'cursor')).toBe('not-allowed');

  await boutonPlus(huile).click({ force: true });
  await expect(pas(huile)).toContainText('2');
  await expect(pastillePanier(page)).toHaveText('2');
});

test('un produit retiré de la vente éteint le bouton, avec son motif', async ({ page }) => {
  await poserSurcouche(page, { [OLIVE.slug]: { disponible: false } });
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);

  await expect(boutonAjout(huile)).toBeDisabled();
  await expect(huile.locator('.vignette-prix')).toContainText('Retiré de la vente');
  await expect(boutonAjout(huile)).toHaveAccessibleDescription('Retiré de la vente');
  expect(await style(boutonAjout(huile), 'cursor')).toBe('not-allowed');

  await boutonAjout(huile).click({ force: true });
  await expect(pastillePanier(page)).toHaveText('0');
});

test('un prix modifié dans la surcouche s’affiche sur la vignette, comme sur la fiche', async ({
  page,
}) => {
  await poserSurcouche(page, {
    [OLIVE.slug]: { variantes: [{ sku: OLIVE.sku25, prixCentimes: 999 }] },
  });
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);

  await expect(huile.locator('.vignette-prix')).toContainText(euros('9,99'));
  await expect(boutonAjout(huile)).toHaveAccessibleName(/25\scl, 9,99\s€$/);
});

test('les états se lisent au style calculé : pastille cochée, bouton, focus', async ({
  page,
}) => {
  await ouvrir(page, '/boutique');
  const huile = carte(page, OLIVE.slug);

  const cochee = pastille(huile, '25');
  const libre = pastille(huile, '50');

  /* #1c211a (encre) et #f2ece1 (coquille) : la règle `:has(input:checked)` doit
     réellement s'appliquer, pas seulement exister dans la feuille. */
  expect(await style(cochee, 'background-color')).toBe('rgb(28, 33, 26)');
  expect(await style(cochee, 'color')).toBe('rgb(242, 236, 225)');
  expect(await style(libre, 'background-color')).not.toBe('rgb(28, 33, 26)');

  expect(await style(boutonAjout(huile), 'background-color')).toBe('rgb(71, 85, 47)');

  await page.keyboard.press('Tab');
  await huile.getByRole('radio', { checked: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(huile.getByRole('radio', { checked: true })).toHaveAccessibleName(/50\scl/);
  expect(await style(pastille(huile, '50'), 'outline-width')).toBe('3px');
});

test('mode liste : la ligne d’achat reste dans la carte, sous la colonne de texte', async ({
  page,
}) => {
  await ouvrir(page, '/boutique');
  await page.getByRole('button', { name: 'Liste', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Liste', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const huile = carte(page, OLIVE.slug);

  /* La bascule passe par une transition de vue : le style calculé est relu
     jusqu'à ce que la règle de la liste s'applique, au lieu d'être supposé. */
  const large = (page.viewportSize()?.width ?? 0) >= 640;
  await expect
    .poll(() => style(huile.locator('.vignette-ligne'), 'justify-content'))
    .toBe('flex-start');
  if (large) {
    await expect
      .poll(() => style(huile.locator('.vignette-achat'), 'margin-left'))
      .not.toBe('0px');
  }

  const mesure = await huile.evaluate((noeud) => {
    const c = noeud.getBoundingClientRect();
    const visuel = noeud.querySelector('.carte-visuel')?.getBoundingClientRect();
    const achat = noeud.querySelector('.vignette-achat')?.getBoundingClientRect();

    return {
      carteDroite: c.right,
      carteBas: c.bottom,
      visuelDroite: visuel?.right ?? Number.NaN,
      achatGauche: achat?.left ?? Number.NaN,
      achatDroite: achat?.right ?? Number.NaN,
      achatBas: achat?.bottom ?? Number.NaN,
    };
  });

  /* Au-dessus de 40 rem la ligne d'achat se range sous la colonne de texte ;
     en dessous elle prend toute la largeur de la carte, sans quoi le document
     débordait de 13 px à 390 (revue DA). */
  if (large) {
    expect(mesure.achatGauche).toBeGreaterThanOrEqual(mesure.visuelDroite);
  }
  expect(mesure.achatDroite).toBeLessThanOrEqual(mesure.carteDroite);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  expect(mesure.achatBas).toBeLessThanOrEqual(mesure.carteBas);

  await boutonAjout(huile).click();
  await expect(pas(huile)).toContainText('1');
  await verifierVisibleEtTouchable(pas(huile));
});

test('avant l’hydratation la ligne n’est pas inerte et garde sa taille', async ({
  browser,
  page,
  baseURL,
}) => {
  const sansScript = await browser.newContext({ javaScriptEnabled: false, ...(baseURL === undefined ? {} : { baseURL }) });
  const statique = await sansScript.newPage();
  await statique.goto('/boutique');

  /* Pas d'`inert` dans le HTML servi : un élément inerte ne reçoit aucun
     clic, et React ne pourrait pas rejouer celui qui arrive pendant
     l'hydratation. Le clic précoce est GARDÉ par l'îlot et envoyé quand le
     panier est prêt — mesuré à la souris, processeur bridé ×4, par
     `preuves/c26/sonde-premier-clic.mjs` (relevés `premier-clic-*.txt`). */
  const corps = carte(statique, OLIVE.slug).locator('.vignette-corps');
  await expect(corps).not.toHaveAttribute('inert', /.*/);
  const hauteurAvant = (await carte(statique, OLIVE.slug).locator('.vignette-ligne').boundingBox())
    ?.height;
  await sansScript.close();

  await ouvrir(page, '/boutique');
  const apres = carte(page, OLIVE.slug);

  await expect(apres.locator('.vignette-corps')).not.toHaveAttribute('inert', /.*/);
  const hauteurApres = (await apres.locator('.vignette-ligne').boundingBox())?.height;

  expect(hauteurAvant).toBeDefined();
  expect(hauteurApres).toBe(hauteurAvant);
});

/* -------------------------------------------------------------------------- */
/* Les cartes de suggestion portent la même ligne d'achat (C26, décision OODA   */
/* d'Arnaud du 07/10 : la règle vaut pour tout produit affiché).               */
/* -------------------------------------------------------------------------- */

const suggestions = (racine: Locator) =>
  racine.locator('li', { has: racine.page().locator('[data-suggestion]') });

test('le tiroir de la fiche : une suggestion s’ajoute sans fermer le tiroir', async ({
  page,
}) => {
  await ouvrir(page, `/boutique/${OLIVE.slug}`);
  await page.getByRole('button', { name: 'Ajouter au panier', exact: true }).click();

  const tiroir = page.getByRole('dialog', { name: 'Ajouté au panier' });
  await expect(tiroir).toBeVisible();
  await expect(pastillePanier(page)).toHaveText('1');

  const premiere = suggestions(tiroir).first();
  await boutonAjout(premiere).click();

  await expect(pas(premiere)).toContainText('1');
  await expect(pastillePanier(page)).toHaveText('2');
  await expect(tiroir).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/boutique/${OLIVE.slug}$`));
});

test('le panier : une suggestion s’ajoute et devient une ligne du panier', async ({ page }) => {
  await ouvrir(page, '/boutique');
  await boutonAjout(carte(page, OLIVE.slug)).click();
  await expect(pastillePanier(page)).toHaveText('1');

  await ouvrir(page, '/panier');
  const section = page.locator('section', { has: page.locator('[data-suggestion]') });
  const premiere = suggestions(section).first();
  const nom = (await premiere.locator('[data-suggestion] p').innerText()).trim();

  await boutonAjout(premiere).click();

  await expect(pastillePanier(page)).toHaveText('2');
  await expect(page).toHaveURL(/\/panier$/);
  await expect(page.locator('main').getByText(nom, { exact: false }).first()).toBeVisible();
});
