import { expect, test, type Page } from '@playwright/test';

import { attendrePage, ouvrir } from './aides';

/**
 * LE RAYON, LU AU STYLE CALCULÉ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE CAMPAGNE EXISTE, ET CE QU'ELLE N'EST PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle est née du round 1 de la tranche C15, qui a trouvé DEUX défauts que rien
 * dans le dépôt ne pouvait attraper — ni une relecture de feuille de style, ni
 * une campagne d'accessibilité, ni les soixante-quatorze tests existants :
 *
 * 1. `.carte-produit:hover { border-color }` vivait dans `@layer components`
 *    tandis que la carte portait l'utilitaire `border-filet`. Dans le modèle
 *    des couches CSS, c'est la COUCHE qui décide avant la spécificité : la
 *    règle était écrite, lisible, plausible — et n'était JAMAIS appliquée.
 * 2. La bascule grille/liste écrivait un attribut sur `<html>` sans jamais le
 *    relire. Au retour d'une navigation cliente, le rayon restait en liste
 *    sous un bouton « Grille » annoncé `aria-pressed="true"`.
 *
 * Les deux ont la même parade, et c'est elle que cette campagne applique : LIRE
 * LE STYLE CALCULÉ ET L'ÉTAT ANNONCÉ, jamais la source. Une règle qui ne
 * s'applique pas est indiscernable d'une règle absente dans un fichier ; elle
 * est parfaitement discernable dans `getComputedStyle`.
 *
 * C'est la même leçon que C13 tirait de sa dette typographique — « contrôler la
 * propriété, pas son indice » —, appliquée cette fois à la propriété CSS
 * elle-même.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES DEUX PROFILS, ET CE QU'ILS N'ATTENDENT PAS DE LA MÊME FAÇON
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le profil mobile déclare `hasTouch`, donc `hover: none` : le survol n'y existe
 * pas, et la feuille le sait — elle y montre le registre en permanence plutôt
 * que de réserver une information à un geste que l'appareil ne sait pas faire.
 * Le troisième cas interroge donc la requête de média et vérifie la promesse de
 * CHAQUE profil, plutôt que de s'exclure de l'un des deux : un test sauté est un
 * test qu'on cesse de lire.
 */

const RAYON = '/boutique';
const FICHE = '/boutique/huile-olive-premiere-pression';

/** La première carte du rayon, celle sur laquelle tous les cas travaillent. */
function premiereCarte(page: Page) {
  return page.locator('.carte-produit').first();
}

function bouton(page: Page, libelle: string) {
  return page.getByRole('button', { name: libelle, exact: true });
}

/** La propriété calculée d'un élément — la seule vérité qui vaille ici. */
async function styleCalcule(page: Page, selecteur: string, propriete: string): Promise<string> {
  return page.evaluate(
    ([cible, nom]) => {
      const element = document.querySelector(cible as string);

      if (element === null) {
        return '(élément absent)';
      }

      return getComputedStyle(element).getPropertyValue(nom as string);
    },
    [selecteur, propriete],
  );
}

test('la bascule « Liste » recompose vraiment le rayon, et « Grille » le rend', async ({
  page,
}) => {
  await ouvrir(page, RAYON);

  /* AU REPOS — la carte empile son image et son texte. */
  expect(await styleCalcule(page, '.carte-produit > a', 'flex-direction')).toBe('column');

  await bouton(page, 'Liste').click();

  /* APRÈS LE CLIC — la carte se couche, et l'image prend une largeur fixe.
     C'est exactement ce que la livraison de C15 croyait faire : le bouton
     posait bien son attribut, la transition de vue s'exécutait bien, et rien
     ne bougeait, parce que les règles vivaient dans une couche que les
     utilitaires de grille battaient. Un geste qui marche et ne fait rien. */
  await expect(bouton(page, 'Liste')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Grille')).toHaveAttribute('aria-pressed', 'false');
  expect(await styleCalcule(page, '.carte-produit > a', 'flex-direction')).toBe('row');

  const largeurCouchee = await premiereCarte(page)
    .locator('.carte-visuel')
    .evaluate((noeud) => noeud.getBoundingClientRect().width);

  expect(largeurCouchee).toBeLessThan(200);

  await bouton(page, 'Grille').click();

  await expect(bouton(page, 'Grille')).toHaveAttribute('aria-pressed', 'true');
  expect(await styleCalcule(page, '.carte-produit > a', 'flex-direction')).toBe('column');

  const largeurDebout = await premiereCarte(page)
    .locator('.carte-visuel')
    .evaluate((noeud) => noeud.getBoundingClientRect().width);

  expect(largeurDebout).toBeGreaterThan(largeurCouchee);
});

test('le bouton d’affichage reste d’accord avec le rayon après un aller-retour', async ({
  page,
}) => {
  await ouvrir(page, RAYON);
  await bouton(page, 'Liste').click();

  /* On quitte le rayon par un lien de carte — une navigation CLIENTE, celle qui
     ne recharge pas le document et laisse donc l'attribut sur `<html>`. */
  await premiereCarte(page).getByRole('link').first().click();
  await page.waitForURL((url) => url.pathname.startsWith('/boutique/'));

  /* Puis on y revient par le fil d'Ariane, toujours sans rechargement. */
  await page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByRole('link', {
    name: 'Boutique',
    exact: true,
  }).click();
  await attendrePage(page, RAYON);

  /* CE QUI EST À L'ÉCRAN ET CE QUI EST ANNONCÉ DISENT LA MÊME CHOSE. Avant le
     correctif, le rayon revenait en liste (l'attribut avait survécu) sous un
     bouton « Grille » annoncé pressé (l'état React était reparti de zéro) — un
     lecteur d'écran annonçait donc le contraire de ce qui était affiché. */
  expect(await styleCalcule(page, '.carte-produit > a', 'flex-direction')).toBe('row');
  await expect(bouton(page, 'Liste')).toHaveAttribute('aria-pressed', 'true');
  await expect(bouton(page, 'Grille')).toHaveAttribute('aria-pressed', 'false');

  /* Et un document NEUF repart en grille : l'attribut ne survit pas à un
     rechargement, la préférence n'est pas un stockage. */
  await ouvrir(page, RAYON);

  expect(await styleCalcule(page, '.carte-produit > a', 'flex-direction')).toBe('column');
  await expect(bouton(page, 'Grille')).toHaveAttribute('aria-pressed', 'true');
});

test('la carte prend le trait de sa famille au survol, là où le survol existe', async ({
  page,
}) => {
  await ouvrir(page, RAYON);

  const carte = premiereCarte(page);
  const auRepos = await carte.evaluate((noeud) => getComputedStyle(noeud).borderTopColor);

  /* La couleur de repos vient de `.carte-produit`, dans la couche `components`.
     Si elle valait `rgb(0, 0, 0)` — la valeur héritée d'un `currentColor` — la
     couleur de famille aurait beau s'appliquer, le repos serait faux. */
  expect(auRepos).not.toBe('rgba(0, 0, 0, 0)');

  const survolPossible = await page.evaluate(() => matchMedia('(hover: hover)').matches);

  if (!survolPossible) {
    /* Sans survol possible, la feuille tient une autre promesse : le registre
       (poids, garde) est visible EN PERMANENCE, parce que réserver une
       information à un geste que l'appareil ne sait pas faire reviendrait à la
       supprimer. C'est cela qu'on vérifie sur ce profil-là. */
    const opacite = await carte
      .locator('.carte-registre')
      .evaluate((noeud) => getComputedStyle(noeud).opacity);

    expect(Number(opacite)).toBe(1);
    return;
  }

  await carte.hover();

  /* ON ATTEND QUE LA COULEUR AIT FINI DE CHANGER, ET C'EST UNE MISE À JOUR
     DÉCLARÉE (C19) : le fondu des cartes est passé de 320 à 620 ms sur retour
     client. Une lecture immédiate après `hover()` rendait la couleur de REPOS —
     le cas tombait sur un site parfaitement sain. Ce profil-ci joue sous
     mouvement réduit, où la transition est quasi nulle ; le scrutin le rend
     robuste aux DEUX régimes plutôt qu'à celui qui se trouve courir. */
  await expect
    .poll(async () => carte.evaluate((noeud) => getComputedStyle(noeud).borderTopColor), {
      timeout: 3000,
    })
    .not.toBe(auRepos);

  const auSurvol = await carte.evaluate((noeud) => getComputedStyle(noeud).borderTopColor);

  /* LE CŒUR DU CAS. La règle de survol était écrite depuis la livraison et
     n'avait jamais rien changé : la carte portait `border-filet`, un utilitaire,
     et un utilitaire bat une règle de `components` quelle que soit sa
     spécificité. `getComputedStyle` est le seul endroit où cela se voit. */
  expect(auSurvol).not.toBe(auRepos);

  const trait = await carte.evaluate((noeud) =>
    getComputedStyle(noeud).getPropertyValue('--scheme-trait'),
  );

  expect(trait.trim()).not.toBe('');

  /* Et le registre monte, lui aussi par une règle de la même couche. */
  const opacite = await carte
    .locator('.carte-registre')
    .evaluate((noeud) => getComputedStyle(noeud).opacity);

  expect(Number(opacite)).toBe(1);
});

test('la galerie d’une fiche coffret n’ouvre aucun cadre plus haut que son image', async ({
  page,
}) => {
  /* Les deux vues d'un coffret ne partagent pas de cadrage — un 4:3 fermé et un
     zénithal 4:5 — et la grille les étirait à la même hauteur : deux cents
     pixels de passe-partout vide sous la première, ce qui se lit comme une
     image qui n'a pas chargé. La vérification porte sur l'ÉCART entre la
     hauteur du cadre et celle de ce qu'il contient, jamais sur une hauteur
     absolue, qui dépendrait de la largeur de la fenêtre. */
  await ouvrir(page, '/boutique/coffret-table-du-dimanche');

  const cadres = page.locator('figure.cadre-photo');

  await expect(cadres).toHaveCount(2);

  const debords = await cadres.evaluateAll((figures) =>
    figures.map((figure) => {
      const cartouche = figure.querySelector('figcaption');
      const image = figure.querySelector('img');

      if (cartouche === null || image === null) {
        return -1;
      }

      return figure.getBoundingClientRect().bottom - cartouche.getBoundingClientRect().bottom;
    }),
  );

  for (const debord of debords) {
    /* Ce qui reste sous le cartouche est le remplissage du passe-partout, qui
       vaut au plus 14 points (`clamp(0.5rem, …, 0.875rem)`). Vingt-quatre laisse
       la marge d'un arrondi de sous-pixel sans laisser passer deux cents. */
    expect(debord).toBeGreaterThanOrEqual(0);
    expect(debord).toBeLessThan(24);
  }
});

/* Le même contrôle sur une fiche ORDINAIRE, dont les deux vues partagent la
   boîte : il doit être vrai là aussi, et il l'était déjà. Sans lui, le cas
   précédent pourrait passer pour une particularité des coffrets. */
test('la galerie d’une fiche ordinaire tient la même promesse', async ({ page }) => {
  await ouvrir(page, FICHE);

  const debords = await page.locator('figure.cadre-photo').evaluateAll((figures) =>
    figures.map((figure) => {
      const cartouche = figure.querySelector('figcaption');

      return cartouche === null
        ? -1
        : figure.getBoundingClientRect().bottom - cartouche.getBoundingClientRect().bottom;
    }),
  );

  expect(debords.length).toBeGreaterThan(0);

  for (const debord of debords) {
    expect(debord).toBeGreaterThanOrEqual(0);
    expect(debord).toBeLessThan(24);
  }
});

/* ========================================================================== */
/* 6. LE MONUMENT DU HÉROS NE TOUCHE JAMAIS LA CARTE (C18)                    */
/* ========================================================================== */

/**
 * LE CAS NÉ D'UN RETOUR CLIENT, ET LE SEUL DU DÉPÔT QUI OUVRE SES PROPRES
 * LARGEURS.
 *
 * Le 10/08, Arnaud a vu sur la prévisualisation de branche le monument
 * « Maison Vaubrune » passer sous la carte du héros, le « e » final tronqué par
 * le bord de l'image. Aucune mesure du dépôt ne pouvait le voir : les deux
 * profils de campagne valent 1 280 et 390 px, et le défaut n'apparaît qu'au-delà
 * de 1 472 px — la largeur exacte où le conteneur de page cesse de grandir
 * pendant que `--text-monument`, calé sur `vw`, continue.
 *
 * D'où les trois contextes ouverts ici. Un test qui ne regarde que les largeurs
 * où l'on a déjà regardé ne trouvera jamais rien de neuf.
 *
 * CE QU'IL VÉRIFIE, ET DANS CET ORDRE. D'abord que le mot ne sort pas de sa
 * propre boîte — c'est la cause, et elle était déjà vraie à 1 280 px pour 36 px,
 * absorbés par la gouttière ; ensuite que les deux boîtes ne se croisent pas —
 * c'est le symptôme, et c'est lui que le client a vu. Contrôler le seul symptôme
 * laisserait passer un débord qu'une gouttière plus large masquerait ; contrôler
 * la seule cause ne dirait rien d'une mise en page qui superposerait ses
 * colonnes pour une autre raison.
 */
test('le monument du héros ne sort ni de sa colonne ni sur la carte, à aucune largeur', async ({
  browser,
}) => {
  for (const largeur of [1440, 1900, 2560]) {
    const contexte = await browser.newContext({
      viewport: { width: largeur, height: 900 },
      reducedMotion: 'reduce',
    });
    const onglet = await contexte.newPage();

    await ouvrir(onglet, '/');
    /* Les polices décident de la largeur d'un mot : mesurer avant leur arrivée
       reviendrait à mesurer le repli, c'est-à-dire une autre police que celle
       qui sera lue. */
    await onglet.waitForFunction(() => document.fonts.status === 'loaded');

    const releve = await onglet.evaluate(() => {
      const monument = document.querySelector('h1');
      const carte = document.querySelector('[data-signature="macro"]');

      if (monument === null || carte === null) {
        return null;
      }

      const boiteMonument = monument.getBoundingClientRect();
      const boiteCarte = carte.getBoundingClientRect();

      return {
        debord: monument.scrollWidth - monument.clientWidth,
        /* Deux rectangles se recouvrent s'ils se croisent SUR LES DEUX AXES.
           Un monument placé au-dessus de la carte partage ses abscisses sans
           rien recouvrir : ne regarder que l'axe horizontal aurait rendu ce cas
           rouge sur une mise en page parfaitement saine. */
        recouvre:
          boiteMonument.left < boiteCarte.right &&
          boiteMonument.right > boiteCarte.left &&
          boiteMonument.top < boiteCarte.bottom &&
          boiteMonument.bottom > boiteCarte.top,
      };
    });

    await contexte.close();

    expect(releve, `le héros est introuvable à ${String(largeur)} px`).not.toBeNull();
    expect(releve?.debord, `débord du monument à ${String(largeur)} px`).toBeLessThanOrEqual(
      0,
    );
    expect(releve?.recouvre, `recouvrement à ${String(largeur)} px`).toBe(false);
  }
});

/**
 * LE FONDU DES CARTES EST SYMÉTRIQUE, ET IL N'EST PAS GRATUIT (retour client, C19).
 *
 * Le client a jugé le fondu croisé « trop brutal ». Il l'était par
 * construction : `background-image` n'était déclarée que dans la règle de
 * survol, de sorte que la couche cessait d'exister à l'instant où le doigt
 * partait — on entrait en fondu et on sortait d'un coup. L'écart avait été
 * DÉCLARÉ en C15, avec son motif (quinze vues d'ambiance téléchargées d'avance
 * auraient porté le rayon à ~250 Ko pour un plafond de 180).
 *
 * CE CAS TIENT LES DEUX BOUTS, et il faut les deux : la symétrie SANS le
 * budget serait une régression de 120 Ko, le budget SANS la symétrie serait le
 * retour au défaut.
 *
 * 1. AU REPOS, AUCUNE VUE D'AMBIANCE N'EST DEMANDÉE. Contrôle au RÉSEAU, seul
 *    endroit où cela se voit : la règle CSS est identique dans les deux cas.
 * 2. À LA SORTIE DU SURVOL, L'OPACITÉ EST INTERMÉDIAIRE. C'est la définition
 *    même de ce qu'on répare. Avant le correctif, la valeur relevée au même
 *    instant aurait été zéro — non par une transition rapide, mais parce qu'il
 *    n'y avait plus rien à faire transiter.
 */
test('le fondu d’ambiance revient aussi lentement qu’il est venu, sans rien coûter au repos', async ({
  page,
}) => {
  const survolPossible = await page.evaluate(() => matchMedia('(hover: hover)').matches);

  const ambiances: string[] = [];

  page.on('request', (requete) => {
    if (/ambiance-\d+\.(avif|jpg)/.test(requete.url())) {
      ambiances.push(requete.url().split('/').slice(-2).join('/'));
    }
  });

  await ouvrir(page, RAYON);
  await attendrePage(page, RAYON);
  await page.waitForTimeout(600);

  /* 1. LE BUDGET AU REPOS, sur les DEUX profils — c'est la promesse de C15 et
     elle n'a pas le droit de bouger. */
  expect(
    ambiances,
    `au repos, ${String(ambiances.length)} vue(s) d’ambiance demandée(s)`,
  ).toEqual([]);

  const carte = page.locator('.carte-produit').first();
  const ambiance = carte.locator('.carte-ambiance');

  if (!survolPossible) {
    /* AU TACTILE, RIEN NE CHANGE ET C'EST LA CONSIGNE. La règle de survol vit
       sous `@media (hover: hover)`, le délégué sort avant tout abonnement, et
       la carte ne demande jamais sa vue d'ambiance. Le cas n'est pas sauté —
       il vérifie l'autre moitié de la promesse. */
    await carte.hover();
    await page.waitForTimeout(400);

    expect(ambiances, 'une ambiance a été demandée sur un profil tactile').toEqual([]);
    expect(await carte.evaluate((n) => n.dataset['ambianceChargee'])).toBeUndefined();
    return;
  }

  await carte.hover();
  await page.waitForTimeout(900);

  const auSurvol = await ambiance.evaluate((noeud) => {
    const style = getComputedStyle(noeud);
    return {
      opacite: Number(style.opacity),
      image: style.backgroundImage !== 'none',
    };
  });

  expect(auSurvol.opacite).toBe(1);
  expect(auSurvol.image, 'la vue d’ambiance n’a pas été déclarée au survol').toBe(true);

  /* 2. LA COUCHE SURVIT À LA SORTIE. C'est la moitié structurelle du correctif,
     et la seule que ce profil-ci puisse voir : les deux profils fonctionnels
     jouent sous MOUVEMENT RÉDUIT, où la transition vaut dix microsecondes. Une
     assertion de durée y serait fausse — la première rédaction l'a écrite, et
     le contrôle a rendu « attendu 0.62s, reçu 1e-05s », ce qui était le verdict
     juste sur un site juste. La SYMÉTRIE, elle, se mesure dans la campagne du
     mouvement, qui est le seul projet où les transitions existent. */
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);

  const aLaSortie = await ambiance.evaluate((noeud) => ({
    opacite: Number(getComputedStyle(noeud).opacity),
    image: getComputedStyle(noeud).backgroundImage !== 'none',
  }));

  expect(
    aLaSortie.image,
    'la couche a disparu à la sortie : il n’y aurait plus rien à faire fondre',
  ).toBe(true);
  expect(aLaSortie.opacite, 'sous mouvement réduit, la bascule est nette').toBe(0);

  /* ET LA CARTE SURVOLÉE, ELLE, A BIEN DEMANDÉ SA VUE. La contre-épreuve du
     point 1 : sans elle, « zéro requête » se lirait aussi bien comme « le
     mécanisme est cassé ». */
  expect(ambiances.length).toBe(1);
});
