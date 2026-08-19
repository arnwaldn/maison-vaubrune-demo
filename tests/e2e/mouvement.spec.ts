import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { attendrePage, euros, ouvrir, pastillePanier } from './aides';

/**
 * LE MOUVEMENT, JOUÉ POUR DE VRAI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE SEUL FICHIER DU DÉPÔT QUI TOURNE SUR UN SITE QUI BOUGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les six campagnes existantes jouent sous `reducedMotion: 'reduce'` depuis
 * C11, et ce n'est pas une commodité : c'est la séparation de deux questions
 * qu'on ne doit jamais mélanger. « Le site fonctionne-t-il ? » se vérifie sur un
 * site immobile, où un élément est à sa place ou n'y est pas ; une campagne
 * fonctionnelle qui attend la fin d'un fondu avant chaque assertion mesure la
 * patience de Playwright et devient instable le jour où une durée change.
 *
 * « Le mouvement se comporte-t-il bien ? » est l'autre question, et c'est ce
 * fichier. Le projet `mouvement` de `playwright.config.ts` a été DÉCLARÉ en C11
 * et laissé inerte pendant cinq tranches ; il s'éveille ici. Il est le seul à
 * porter `reducedMotion: 'no-preference'`, et son `testMatch` ne désigne que ce
 * fichier — les deux profils fonctionnels l'écartent par `testIgnore`, sans
 * quoi ils le rejoueraient sur un site immobile, où par doctrine il ne se passe
 * rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CES QUATRE CAS LISENT : LE STYLE CALCULÉ, LE RÉSEAU, ET RIEN D'AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'interdit n° 21 de D37 — gravé par cette tranche — dit qu'une règle qui ne
 * s'applique pas est indiscernable d'une règle absente DANS UN FICHIER, et
 * parfaitement discernable dans `getComputedStyle`. Aucun cas ci-dessous ne lit
 * une classe, un nom de fichier ou une source : ils lisent une opacité
 * calculée, une position de défilement, une liste de requêtes réseau et des
 * montants affichés.
 */

const RAYON = '/boutique';
const FICHE = '/boutique/huile-olive-premiere-pression';

/** La durée d'un fondu de route : `--ms-signature`, 900 ms (D37). */
const DUREE_TRANSITION = '0.9s';

/* -------------------------------------------------------------------------- */
/* Outils communs                                                              */
/* -------------------------------------------------------------------------- */

/** L'opacité CALCULÉE d'un élément désigné par sélecteur. */
async function opacite(page: Page, selecteur: string): Promise<number> {
  return page.evaluate((cible) => {
    const element = document.querySelector(cible);

    return element === null ? Number.NaN : Number(getComputedStyle(element).opacity);
  }, selecteur);
}

/**
 * Attend que le fournisseur de mouvement ait posé sa classe.
 *
 * `attendreHydratation()` ne suffit pas : elle garantit que les contextes sont
 * montés et que les îlots ont lu le stockage, pas que l'effet du mouvement a
 * tourné. Les deux arrivent à quelques millisecondes d'écart, et une assertion
 * écrite entre les deux serait verte ou rouge selon la charge de la machine —
 * exactement le genre de test qu'on finit par ne plus croire.
 */
async function attendreMouvement(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('mouvement'),
  );
}

/**
 * Le morceau qui porte la bibliothèque de défilement adouci, trouvé DANS LA
 * CONSTRUCTION plutôt que recopié.
 *
 * Son nom contient une empreinte de contenu : il change à chaque construction.
 * L'écrire dans le test l'aurait rendu faux au commit suivant, et — bien pire —
 * faux d'une manière qui rend le test VERT, puisqu'un fichier qu'on ne demande
 * jamais n'est jamais téléchargé. Un test qui passe parce qu'il cherche la
 * mauvaise chose est le pire résultat possible.
 */
function morceauDuDefilementAdouci(): string {
  const dossier = join('.next', 'static', 'chunks');
  const nom = readdirSync(dossier)
    .filter((fichier) => fichier.endsWith('.js'))
    .find((fichier) => readFileSync(join(dossier, fichier), 'utf8').includes('lenis-smooth'));

  if (nom === undefined) {
    throw new Error(
      'Aucun morceau de .next/static/chunks ne porte le marqueur « lenis-smooth » : ' +
        'la bibliothèque n’a pas été construite, ou son marqueur a changé.',
    );
  }

  return nom;
}

/* ========================================================================== */
/* 1. LES RÉVÉLATIONS                                                         */
/* ========================================================================== */

test('un bloc sous la flottaison est masqué, se révèle au défilement, et ne rejoue jamais', async ({
  page,
}) => {
  /*
   * L'ESPION EST POSÉ AVANT LE PREMIER SCRIPT DE LA PAGE.
   *
   * `unobserve` ne laisse aucune trace observable dans le DOM : l'attribut
   * `data-revele` prouve qu'un élément a été révélé, pas que le contrôleur a
   * cessé de l'observer. On compte donc les appels, en enveloppant la méthode du
   * prototype avant que la page n'instancie quoi que ce soit.
   *
   * La sentinelle de l'en-tête (C13) emploie elle aussi un `IntersectionObserver`
   * — mais elle n'appelle jamais `unobserve` : elle observe un repère unique
   * pendant toute la vie du document. Le compteur ne mesure donc que les
   * révélations.
   */
  await page.addInitScript(() => {
    const fenetre = window as unknown as { relevesUnobserve: number };
    const origine = IntersectionObserver.prototype.unobserve;

    fenetre.relevesUnobserve = 0;

    IntersectionObserver.prototype.unobserve = function remplacant(cible: Element) {
      fenetre.relevesUnobserve += 1;

      return origine.call(this, cible);
    };
  });

  await ouvrir(page, RAYON);
  await attendreMouvement(page);

  /* La dernière vignette du rayon : quinze références réparties en sept
     familles, elle est très loin sous la flottaison quelle que soit la
     hauteur de la fenêtre. */
  const derniere = page.locator('.carte-produit').last();

  /* LA PRÉSENCE, JAMAIS LA VALEUR. `data-revelation` s'écrit sans valeur en
     JSX, et React le sérialise `data-revelation="true"` — un détail de
     bibliothèque qu'aucun sélecteur CSS ne regarde (`[data-revelation]` matche
     quelle que soit la valeur) et qu'un test n'a donc aucune raison de figer.
     La première rédaction attendait la chaîne vide et échouait sur « true » :
     elle vérifiait React, pas le site. */
  expect(await derniere.evaluate((noeud) => noeud.hasAttribute('data-revelation'))).toBe(
    true,
  );
  expect(await derniere.evaluate((noeud) => noeud.hasAttribute('data-revele'))).toBe(
    false,
  );

  const masquee = await derniere.evaluate((noeud) => ({
    opacite: Number(getComputedStyle(noeud).opacity),
    transformation: getComputedStyle(noeud).transform,
  }));

  /* MASQUÉE POUR DE BON, et par les deux propriétés que D37 autorise. Une
     translation de 24 px se lit `matrix(1, 0, 0, 1, 0, 24)` : on vérifie
     qu'elle n'est pas `none`, sans figer la matrice — la valeur exacte
     appartient à la feuille, pas au test. */
  expect(masquee.opacite).toBe(0);
  expect(masquee.transformation).not.toBe('none');

  const avant = await page.evaluate(
    () => (window as unknown as { relevesUnobserve: number }).relevesUnobserve,
  );

  await derniere.scrollIntoViewIfNeeded();

  /*
   * ON INTERROGE `derniere`, PAS UN AUTRE ÉLÉMENT QUI LUI RESSEMBLE (C19).
   *
   * Cette attente lisait `.carte-produit:last-of-type` via `document.
   * querySelector`, qui rend le PREMIER nœud correspondant. Or `:last-of-type`
   * désigne le dernier `li` DE CHAQUE `ul` : le rayon en compte sept, un par
   * famille, et le premier nœud rendu était donc la dernière vignette de la
   * PREMIÈRE famille — pas celle que tout le reste du cas manipule.
   *
   * Le cas passait par accident : cette vignette-là était assez haut dans la
   * page pour être révélée d'emblée par la passe « déjà dans la fenêtre » du
   * fournisseur. Les panneaux de C19 ont allongé l'en-tête du rayon de quelques
   * dizaines de pixels, elle est passée sous la flottaison, et
   * `scrollIntoViewIfNeeded()` sur la DERNIÈRE vignette saute par-dessus sans
   * jamais la faire intersecter : opacité 0, cas rouge.
   *
   * Le défaut n'était pas dans le site, il était dans l'attente. Corrigé à la
   * cause : on lit l'opacité du locator `derniere`, celui-là même dont on vient
   * de vérifier les attributs et qu'on vient de faire défiler. Un cas qui
   * n'interroge pas son propre sujet ne prouve rien de ce qu'il annonce.
   */
  await expect
    .poll(
      async () => derniere.evaluate((noeud) => Number(getComputedStyle(noeud).opacity)),
      { timeout: 5000 },
    )
    .toBe(1);

  expect(await derniere.evaluate((noeud) => noeud.hasAttribute('data-revele'))).toBe(true);

  const apres = await page.evaluate(
    () => (window as unknown as { relevesUnobserve: number }).relevesUnobserve,
  );

  /* LE CŒUR DU CAS : le contrôleur a cessé d'observer ce qu'il vient de
     révéler. Sans `unobserve`, un bloc traversé vingt fois notifierait vingt
     fois et le contrôleur réécrirait vingt fois un attribut déjà écrit. */
  expect(apres).toBeGreaterThan(avant);

  /* ET LA RÉVÉLATION NE REJOUE PAS. On repart au sommet, puis on redescend :
     l'attribut tient, l'opacité ne retombe jamais. Une révélation est un
     événement, pas un état qui se rejoue à chaque passage. */
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await derniere.scrollIntoViewIfNeeded();

  /* Même correction qu'au-dessus, et c'est le second endroit où le cas se
     trompait de nœud : on lit `derniere`, pas le premier `:last-of-type` du
     document. */
  expect(
    await derniere.evaluate((noeud) => Number(getComputedStyle(noeud).opacity)),
  ).toBe(1);
  expect(await derniere.evaluate((noeud) => noeud.hasAttribute('data-revele'))).toBe(true);
});

/* ========================================================================== */
/* 2. LE FONDU D'ARRIVÉE DE ROUTE                                             */
/* ========================================================================== */

test('le fondu de route joue à la navigation, jamais au chargement, et rend la page entière', async ({
  page,
}) => {
  await ouvrir(page, '/');
  await attendreMouvement(page);

  /* AU CHARGEMENT À FROID, RIEN NE FOND — et c'est la moitié la plus utile du
     cas. La règle vit sous `html.mouvement`, posée après hydratation : au
     premier rendu, l'élément a calculé son style sans elle, donc sans
     `@starting-style`. Un fondu ici serait un préchargeur (interdit n° 7) et
     coûterait l'indice de rapidité visuelle. */
  expect(await opacite(page, '[data-transition-page]')).toBe(1);

  const duree = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector('[data-transition-page]') as Element)
        .transitionDuration,
  );

  expect(duree).toBe(DUREE_TRANSITION);

  /*
   * UN ÉCHANTILLONNEUR PLUTÔT QU'UNE LECTURE APRÈS COUP.
   *
   * Lire l'opacité « juste après le clic » revient à parier que l'aller-retour
   * du protocole tombe dans la fenêtre du fondu. Neuf cents millisecondes
   * laissent de la marge, mais un test qui dépend d'une marge de temps est un
   * test qui échouera un jour sur une machine chargée, et pour une raison qui
   * n'a rien à voir avec ce qu'il vérifie.
   *
   * On installe donc une boucle qui retient le MINIMUM observé. Elle survit à
   * la navigation cliente, qui ne recharge pas le document.
   */
  await page.evaluate(() => {
    const fenetre = window as unknown as { opaciteMinimale: number };

    fenetre.opaciteMinimale = 1;

    const echantillonner = () => {
      const element = document.querySelector('[data-transition-page]');

      if (element !== null) {
        fenetre.opaciteMinimale = Math.min(
          fenetre.opaciteMinimale,
          Number(getComputedStyle(element).opacity),
        );
      }

      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();
  await attendrePage(page, RAYON);

  const minimum = await page.evaluate(
    () => (window as unknown as { opaciteMinimale: number }).opaciteMinimale,
  );

  /* LE FONDU A BIEN EU LIEU. Le seuil est lâche à dessein : ce qu'on vérifie
     est qu'un état intermédiaire a existé, pas qu'il valait telle valeur à
     telle image — la courbe appartient à la feuille. */
  expect(minimum).toBeLessThan(0.9);

  /* ET LA PAGE EST ENTIÈRE À LA FIN. Un fondu qui laisserait le contenu à
     mi-opacité, ou qui masquerait une partie de la page, serait pire que pas de
     fondu du tout : ce projet a fait le choix inverse partout (l'état final est
     l'état par défaut). */
  await expect
    .poll(async () => opacite(page, '[data-transition-page]'), { timeout: 5000 })
    .toBe(1);

  await expect(page.getByRole('heading', { level: 1, name: 'Boutique' })).toBeVisible();
  await expect(page.locator('.carte-produit')).toHaveCount(15);
});

/* ========================================================================== */
/* 3. LE DÉFILEMENT ADOUCI                                                    */
/* ========================================================================== */

test('le défilement adouci vit sur trois routes, jamais dans le tunnel, et pas du tout sous mouvement réduit', async ({
  page,
  browser,
}) => {
  /* Les trois routes que D37 nomme. La classe est posée par la bibliothèque
     elle-même : la lire prouve qu'elle a été téléchargée, instanciée ET
     démarrée — trois choses qu'un `import` réussi ne garantit pas. */
  for (const route of ['/', RAYON, FICHE]) {
    await ouvrir(page, route);
    await attendreMouvement(page);

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.documentElement.classList.contains('lenis')),
        { timeout: 5000 },
      )
      .toBe(true);
  }

  /* ET LE TUNNEL RESTE NATIF. « On n'adoucit pas le défilement de quelqu'un qui
     vérifie un montant avant de payer. » Le contrôle est fait APRÈS les trois
     routes adoucies, sur le même contexte : la classe doit avoir été RETIRÉE au
     démontage, pas seulement jamais posée. C'est le nettoyage de l'effet qu'on
     vérifie ici, et il n'y a qu'ici qu'il se voie. */
  await page.getByRole('link', { name: /^Panier/ }).click();
  await attendrePage(page, '/panier');

  await expect
    .poll(
      async () =>
        page.evaluate(() => document.documentElement.classList.contains('lenis')),
      { timeout: 5000 },
    )
    .toBe(false);

  /*
   * L'ANCRE DESCEND EN DOUCEUR, ET ELLE ATTERRIT AU MÊME ENDROIT QU'EN NATIF.
   *
   * Deux promesses, et deux façons de les prouver.
   *
   * LA DOUCEUR se prouve ici, par le nombre de positions intermédiaires : un
   * saut natif en produit deux, une descente animée en produit une par image.
   *
   * L'ATTERRISSAGE se prouve plus bas, par COMPARAISON DES DEUX RÉGIMES — et
   * c'est cette moitié-là qu'il ne faut pas raconter deux fois. Lenis HONORE
   * `scroll-padding-top` (6,5 rem, C13) ET le `scroll-mt-*` que les sections du
   * rayon portent depuis C7 ; le délégué d'ancres ne lui passe donc AUCUN
   * décalage. Le raisonnement complet, avec les nombres qui l'ont établi, est
   * au bloc « L'ENDROIT OÙ L'ON ARRIVE EST LE MÊME DANS LES DEUX RÉGIMES »,
   * soixante lignes plus bas.
   */
  await ouvrir(page, RAYON);
  await attendreMouvement(page);

  await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));

  await page.evaluate(() => {
    const fenetre = window as unknown as { positions: number[] };

    fenetre.positions = [];

    const echantillonner = () => {
      fenetre.positions.push(window.scrollY);
      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await page.getByRole('link', { name: /^Coffrets/ }).first().click();

  /*
   * ON ATTEND L'IMMOBILISATION, PAS UN SEUIL — et c'est ce que la première
   * rédaction avait manqué.
   *
   * Elle attendait « scrollY > 200 » puis comptait les positions relevées :
   * elle en trouvait TROIS et concluait au saut natif. La courbe de Lenis est
   * pourtant celle du vocabulaire, très front-chargée — `1.001 − 2^(−10t)`
   * franchit la moitié de la distance en une centaine de millisecondes. Le
   * seuil de 200 px était donc atteint au troisième rendu, et le relevé lu à cet
   * instant ne disait rien de la descente : il disait à quelle vitesse elle
   * commence.
   *
   * On attend donc que la position ne change plus pendant huit images, ce qui
   * est la définition d'un défilement terminé, et on compte ensuite.
   */
  await page.waitForFunction(
    () => {
      const fenetre = window as unknown as { positions: number[] };
      const nombre = fenetre.positions.length;

      return (
        nombre > 12 &&
        window.scrollY > 200 &&
        fenetre.positions[nombre - 1] === fenetre.positions[nombre - 8]
      );
    },
    undefined,
    { timeout: 8000 },
  );

  const positions = await page.evaluate(
    () => (window as unknown as { positions: number[] }).positions,
  );
  const distinctes = new Set(positions).size;

  /* Un saut natif produit deux positions : celle d'avant et celle d'après. Une
     descente animée en produit une par image. Vingt est très en dessous de ce
     qu'on observe et très au-dessus de ce qu'un saut peut produire. */
  expect(distinctes).toBeGreaterThan(20);

  /*
   * L'ENDROIT OÙ L'ON ARRIVE EST LE MÊME DANS LES DEUX RÉGIMES.
   *
   * C'est l'invariant qui compte, et il vaut mieux qu'un nombre écrit à la
   * main. Le délégué d'ancres change la MANIÈRE d'arriver — une descente animée
   * au lieu d'un saut — et il n'a aucun droit de changer l'endroit : ce serait
   * une page qui se comporte différemment selon un réglage d'accessibilité.
   *
   * La première rédaction du délégué passait un décalage explicite à
   * `scrollTo`, en croyant que la bibliothèque ignorait `scroll-padding-top`.
   * Ce cas l'a démentie : 208 px d'écart au bas de l'en-tête contre 108 en
   * natif — exactement le décalage ajouté en trop. Comparer les deux régimes
   * l'attrape ; vérifier une borne écrite à la main l'aurait laissée passer
   * sous une borne assez lâche, ou aurait figé un nombre qui n'appartient pas
   * au test.
   */
  const positionSousLenis = await page.evaluate(
    () => document.querySelector('#rayon-coffrets')?.getBoundingClientRect().top ?? NaN,
  );

  const contexteNatif = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const ongletNatif = await contexteNatif.newPage();

  await ongletNatif.goto(RAYON);
  await ongletNatif.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await ongletNatif.getByRole('link', { name: /^Coffrets/ }).first().click();
  await ongletNatif.waitForFunction(() => window.scrollY > 200);

  const positionNative = await ongletNatif.evaluate(
    () => document.querySelector('#rayon-coffrets')?.getBoundingClientRect().top ?? NaN,
  );

  await contexteNatif.close();

  expect(Math.abs(positionSousLenis - positionNative)).toBeLessThan(4);

  /* Et l'endroit en question laisse la section SOUS l'en-tête : la promesse de
     `scroll-padding-top` (C13) tient dans les deux régimes. */
  const basDeLEntete = await page.evaluate(
    () => document.querySelector('[data-chrome-entete]')?.getBoundingClientRect().bottom ?? NaN,
  );

  expect(positionSousLenis).toBeGreaterThan(basDeLEntete);

  /*
   * LA PREUVE RÉSEAU : SOUS MOUVEMENT RÉDUIT, LE MORCEAU N'EST PAS TÉLÉCHARGÉ.
   *
   * C'est le niveau 2 des trois de D37, et c'est celui qui distingue « case
   * cochée » de « respecté » : un site qui charge le code avant de le
   * neutraliser a déjà payé le réseau, l'analyse syntaxique et la mémoire de
   * quelqu'un qui a précisément demandé qu'on lui épargne tout cela.
   *
   * Le contexte est créé ICI, dans un test du projet `mouvement` — c'est le
   * seul endroit du dépôt où l'on peut comparer les deux régimes côte à côte,
   * et une affirmation sur l'absence n'a de valeur qu'avec sa contre-épreuve.
   */
  const morceau = morceauDuDefilementAdouci();

  const releverDemandes = async (reduit: boolean): Promise<boolean> => {
    const contexte = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: reduit ? 'reduce' : 'no-preference',
    });
    const onglet = await contexte.newPage();
    const demandes: string[] = [];

    onglet.on('request', (demande) => {
      demandes.push(demande.url());
    });

    await onglet.goto('/');
    await onglet.waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
    );
    /* Une seconde après l'hydratation : largement de quoi laisser partir un
       import dynamique qui aurait été déclenché. Une absence se prouve en
       laissant du temps, pas en regardant vite. */
    await onglet.waitForTimeout(1000);

    await contexte.close();

    return demandes.some((url) => url.includes(morceau));
  };

  expect(await releverDemandes(true)).toBe(false);
  expect(await releverDemandes(false)).toBe(true);
});

/* ========================================================================== */
/* 4. LE PARCOURS D'ACHAT, ANIMÉ                                              */
/* ========================================================================== */

/**
 * LE MÊME ACHAT, AUX MÊMES MONTANTS, SUR UN SITE QUI BOUGE.
 *
 * Deux huiles d'olive de 50 cl et un fromage de brebis : 56,90 € de sous-total,
 * 6,90 € de tranche de poids, 6,00 € d'emballage isotherme, 69,80 € au total.
 * Les montants sont écrits en toutes lettres et recopiés de `parcours.spec.ts`
 * — jamais calculés ici, jamais lus d'une fonction du projet.
 *
 * CE QUE CE CAS AJOUTE AUX 94 AUTRES : le même parcours joué là où les
 * révélations se déclenchent, où les pages fondent à l'arrivée et où le
 * défilement est piloté par une bibliothèque. Il répond à une question précise
 * — un élément en cours de transition intercepte-t-il un clic ? — et la réponse
 * ne se lit nulle part ailleurs, parce que les six campagnes existantes jouent
 * sur un site immobile où la question ne se pose pas.
 *
 * Il ne rejoue PAS le parcours entier jusqu'au suivi et à l'espace marchand :
 * `parcours.spec.ts` le fait sur deux profils, et le tunnel n'a par doctrine
 * aucun mouvement à vérifier passé l'écran de paiement. Il s'arrête donc à la
 * référence de commande, c'est-à-dire au dernier écran où le mouvement du site
 * a pu gêner un geste.
 */
test('le parcours d’achat rend les mêmes montants exacts sur un site qui bouge', async ({
  page,
}) => {
  await ouvrir(page, '/');
  await attendreMouvement(page);

  await expect(pastillePanier(page)).toHaveText('0');

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();
  await attendrePage(page, RAYON);

  await page.getByRole('link', { name: /^Huile d’olive de première pression/ }).click();
  await attendrePage(page, FICHE);

  await page.getByLabel('Format', { exact: true }).selectOption('MV-HV-OLI-50CL');
  await page.getByLabel('Quantité').fill('2');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeVisible();
  /* LE TIROIR SE FERME AVANT DE RENDRE LA MAIN (C23). Il est MODAL : tant
     qu'il est ouvert, le reste du document est inerte et Playwright échoue à
     l'actionnabilité sur le premier élément cliqué ensuite. Le geste appartient
     au parcours du visiteur, pas à un contournement — il continue ses achats. */
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeHidden();
  await expect(pastillePanier(page)).toHaveText('2');

  await page
    .getByRole('navigation', { name: 'Fil d’Ariane' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();
  await attendrePage(page, RAYON);

  /* LE CLIC QUI COMPTE. Cette vignette est loin sous la flottaison : elle a
     donc été révélée par le contrôleur juste avant d'être cliquée, ce qui est
     exactement la situation qu'on veut mettre à l'épreuve. Playwright échouerait
     ici si un élément en cours de transition recouvrait la cible. */
  await page.getByRole('link', { name: /^Fromage fermier de brebis/ }).click();
  await attendrePage(page, '/boutique/fromage-fermier-brebis');

  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeVisible();
  /* LE TIROIR SE FERME AVANT DE RENDRE LA MAIN (C23). Il est MODAL : tant
     qu'il est ouvert, le reste du document est inerte et Playwright échoue à
     l'actionnabilité sur le premier élément cliqué ensuite. Le geste appartient
     au parcours du visiteur, pas à un contournement — il continue ses achats. */
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeHidden();
  await expect(pastillePanier(page)).toHaveText('3');

  await page.getByRole('link', { name: /^Panier/ }).click();
  await attendrePage(page, '/panier');

  const recapitulatif = page.getByRole('region', { name: 'Récapitulatif' });

  await expect(recapitulatif.getByText(euros('56,90'), { exact: true })).toBeVisible();
  await expect(recapitulatif.getByText(euros('6,90'), { exact: true })).toBeVisible();
  await expect(recapitulatif.getByText(euros('6,00'), { exact: true })).toBeVisible();
  await expect(recapitulatif.getByText(euros('69,80'), { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Passer commande' }).click();
  await attendrePage(page, '/commande');

  /* LE TUNNEL EST IMMOBILE MÊME ICI, et c'est une promesse de D37 qu'aucun
     autre test ne pouvait vérifier : les six campagnes existantes ne voient
     jamais le tunnel autrement qu'immobile, puisqu'elles jouent sous mouvement
     réduit. Le contrôle est fait sur ce qui SE VOIT — aucune zone du tunnel ne
     porte le geste de révélation. */
  expect(await page.locator('[data-revelation]').count()).toBe(0);

  /* LE DÉBRANCHEMENT EST UN EFFET, DONC IL EST DIFFÉRÉ D'UNE IMAGE. React vide
     ses effets passifs après la peinture, et `attendrePage()` rend la main dès
     que l'adresse a changé et que les signaux d'hydratation sont là — ce qui,
     après une navigation cliente, est vrai immédiatement. Une lecture
     synchrone attrapait donc la classe encore posée, et déclarait un défaut là
     où il n'y avait qu'une image d'écart. On attend l'état, on ne le
     photographie pas. */
  await expect
    .poll(
      async () =>
        page.evaluate(() => document.documentElement.classList.contains('lenis')),
      { timeout: 2000 },
    )
    .toBe(false);

  await expect(
    page.getByRole('region', { name: 'Récapitulatif' }).getByText(euros('69,80'), {
      exact: true,
    }),
  ).toBeVisible();

  const engagement = page.getByRole('button', {
    name: 'Commander avec obligation de paiement',
  });

  await page.getByLabel('Prénom et nom').fill('Client d’essai C17');
  await page.getByLabel('Adresse de livraison').fill('1, rue de l’Exemple');
  await page.getByLabel('Code postal').fill('69001');
  await page.getByLabel('Courriel').fill('client-essai@example.invalid');
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();

  await expect(engagement).toBeEnabled();
  await engagement.click();

  await attendrePage(page, '/paiement/simulation');
  await expect(
    page.getByRole('region', { name: 'Ce qui serait payé' }).getByText(euros('69,80'), {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Payer' }).click();
  await attendrePage(page, '/commande/confirmation');

  const reference = new URL(page.url()).searchParams.get('reference') ?? '';

  expect(reference).toMatch(/^MVB-\d{8}-[2-9A-HJ-NP-Z]{4}$/);
  await expect(
    page.getByRole('region', { name: 'Votre référence de commande' }),
  ).toContainText(reference);
  await expect(pastillePanier(page)).toHaveText('0');
});

/* ========================================================================== */
/* 5. L'ÉTAT MASQUÉ SURVIT À SA COUCHE — UN BLOC DE CHAQUE ZONE (C18)         */
/* ========================================================================== */

/**
 * LE CAS QUI MANQUAIT, ET LE DÉFAUT LIVRÉ QU'IL A TROUVÉ EN NAISSANT.
 *
 * La revue de C17 signalait un risque au futur : les règles de
 * `[data-revelation]` vivaient dans `@layer base`, donc n'importe quelle règle
 * d'une couche supérieure pouvait les éteindre en silence — et une seule des
 * trois zones révélées était sous garde.
 *
 * Le risque était déjà réalisé, et pas par un utilitaire. `.carte-produit`
 * déclare sa propre `transition` dans `@layer components` (le fond et le filet
 * qui passent au scheme de la famille au survol, C15) et les quinze vignettes
 * du rayon portent aussi `data-revelation`. La couche `components` bat la
 * couche `base` : les vignettes ne se révélaient pas, elles SURGISSAIENT — sans
 * fondu, et sans la cascade que leur composant prend soin de calculer. Aucune
 * relecture de feuille ne pouvait le voir ; `getComputedStyle` le dit en une
 * ligne.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  IL LIT LES DEUX ÉTATS, ET C'EST CE QUI LE REND UTILE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'état MASQUÉ dit que le geste existe ; l'état RÉVÉLÉ dit qu'il transite.
 * Depuis le correctif de cette tranche, la transition vit sur l'état révélé et
 * l'état masqué n'en porte aucune — le masquage est une préparation interne,
 * pas un geste, et il doit être instantané. Lire le seul état masqué ne dirait
 * donc plus rien du fondu ; lire le seul état révélé ne dirait rien du fait
 * qu'un bloc était bien masqué avant.
 *
 * Le bloc est RÉVÉLÉ POUR DE VRAI, en l'amenant dans la fenêtre : c'est le
 * contrôleur qui pose l'attribut, pas le test. Un test qui poserait
 * `data-revele` lui-même vérifierait une feuille de style sur un site
 * imaginaire.
 */
test('l’état masqué des révélations résiste aux couches, dans les trois zones', async ({
  page,
}) => {
  const zones = [
    ['/', 'li[data-revelation]', 'accueil'],
    [RAYON, '.carte-produit[data-revelation]', 'rayon'],
    [FICHE, 'section[data-revelation]', 'fiche'],
  ] as const;

  for (const [chemin, selecteur, zone] of zones) {
    await ouvrir(page, chemin);
    await attendreMouvement(page);

    /* LE DERNIER BLOC DE LA ZONE. Le contrôleur révèle ce qui est dans la
       fenêtre au chargement, du haut vers le bas : le dernier est celui qui
       reste masqué, quelle que soit la hauteur de la fenêtre. */
    const dernier = page.locator(selecteur).last();

    expect(
      await dernier.evaluate((noeud) => noeud.hasAttribute('data-revele')),
      `le dernier bloc de la zone ${zone} est déjà révélé`,
    ).toBe(false);

    const masque = await dernier.evaluate((noeud) => ({
      opacite: Number(getComputedStyle(noeud).opacity),
      transformation: getComputedStyle(noeud).transform,
    }));

    /* MASQUÉ PAR LES DEUX PROPRIÉTÉS QUE D37 AUTORISE, ET INSTANTANÉMENT.
       L'opacité vaut zéro dès que la classe est posée : si le masquage
       transitait, cette lecture attraperait une valeur intermédiaire et le cas
       deviendrait dépendant de la charge de la machine. */
    expect(masque.opacite, `opacité du bloc masqué — ${zone}`).toBe(0);
    expect(masque.transformation, `transformation du bloc masqué — ${zone}`).not.toBe(
      'none',
    );

    await dernier.scrollIntoViewIfNeeded();

    await expect
      .poll(async () => dernier.evaluate((noeud) => Number(getComputedStyle(noeud).opacity)), {
        timeout: 5000,
      })
      .toBe(1);

    const revele = await dernier.evaluate(
      (noeud) => getComputedStyle(noeud).transitionProperty,
    );

    /* ET IL TRANSITE. C'est la moitié que la couche emportait : un bloc dont la
       liste de transitions ne contient pas `opacity` surgit au lieu de se
       révéler, et rien dans le DOM ne l'en distingue. */
    expect(revele, `transitions du bloc révélé — ${zone}`).toContain('opacity');
    expect(revele, `transitions du bloc révélé — ${zone}`).toContain('transform');

    /* LA VIGNETTE DU RAYON GARDE EN PLUS SES PROPRES TRANSITIONS, et ce
       contrôle est l'autre moitié du correctif. Un élément n'a qu'UNE liste :
       faire gagner la révélation en écrasant le fondu de survol de la carte
       aurait remplacé un défaut par un autre, de la même famille et tout aussi
       invisible. */
    if (zone === 'rayon') {
      expect(revele, 'le fondu de survol de la vignette').toContain('background-color');
      expect(revele, 'le fondu de survol de la vignette').toContain('border-color');
    }
  }
});

/* ========================================================================== */
/* 6. « LA MISE EN BOUTEILLE » — LA MONTÉE MASQUÉE, À FROID (C18, C19)        */
/* ========================================================================== */

/**
 * TROIS EXIGENCES CLIENT SUCCESSIVES SUR LE MÊME GESTE, ET CE CAS PORTE LA
 * DERNIÈRE — AVEC LA TRACE DES DEUX AUTRES.
 *
 * Le 10/08 au matin : « une animation d'ouverture du titre, classe, chaleureuse,
 * accueillante, douce et lente, premium ». C17 avait livré cette cascade
 * derrière `html.mouvement`, donc jouée seulement au RETOUR à l'accueil depuis
 * le site — pas à l'arrivée qui compte. C18 l'a fait passer à froid.
 *
 * Le 10/08 au soir : « beaucoup trop discrète ». Le geste jouait (série relevée
 * sur le déployé avant qu'on ne tranche) : pas une panne, une intensité. La
 * réponse fut un BLOC PLEIN balayant chaque ligne.
 *
 * Le 10/08 à 20 h 10, sur ce bloc : « de grands rectangles noirs pas très
 * esthétiques ». Confirmé de visu — à mi-course les cinq blocs se chevauchaient
 * en une masse d'encre par-dessus le premier écran. LE BLOC EST ABANDONNÉ, et
 * ce cas change avec lui : il ne mesure plus un balayage, il EXIGE QU'IL N'Y EN
 * AIT AUCUN.
 *
 * QUATRE CHOSES SE FIXENT ICI, ET LA PREMIÈRE EST LE VERDICT DU CLIENT :
 *
 * 1. AUCUNE MATIÈRE NE SE POSE SUR LE HÉROS. Aucune des cinq lignes n'engendre
 *    de pseudo-élément : `content` vaut sa valeur initiale, donc il n'existe
 *    aucune boîte à colorer. C'est plus fort que « le bloc est transparent » —
 *    il n'y a rien. Contrôlé sous les DEUX régimes.
 *
 * 2. LA MONTÉE A LIEU À FROID, et elle part de sous la ligne. Chaque texte
 *    commence translaté d'au moins une hauteur de ligne et finit à zéro.
 *
 * 3. LES LIGNES SONT ÉTAGÉES. Quatre gestes et non un seul épais : les rangs
 *    espacés (1, 3, 5, 6) doivent se voir dans les instants d'arrivée.
 *
 * 4. L'IMAGE NE BOUGE PAS. C'est le plus grand affichage de contenu de la page,
 *    et la protection écrite en C17 tient : une ouverture de l'image au
 *    chargement coûterait l'indice de rapidité visuelle.
 *
 * L'ÉCHANTILLONNEUR EST POSÉ AVANT LE PREMIER SCRIPT. La séquence part au
 * premier calcul de style, c'est-à-dire avant tout ce qu'un test pourrait faire
 * après `goto`. Une lecture après coup ne verrait que l'état final et
 * conclurait, à tort, qu'il ne s'est rien passé — le cas serait vert sur un site
 * parfaitement immobile.
 */
test('le héros monte derrière un masque, à froid, sans qu’aucun bloc ne le couvre', async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => {
    const fenetre = window as unknown as {
      serieSignature: { montees: number[]; textes: number[] }[];
      transformationsMacro: string[];
      retardsSignature: number[] | null;
    };

    fenetre.serieSignature = [];
    fenetre.transformationsMacro = [];
    fenetre.retardsSignature = null;

    /* LA TRANSLATION VERTICALE SE LIT DANS LE SIXIÈME TERME DE LA MATRICE, et
       l'exposant n'est pas facultatif : Chrome écrit des valeurs en notation
       scientifique en fin de course, et une expression qui s'arrêterait au
       premier point lirait un nombre entier là où il n'en reste rien. Le relevé
       versionné de la tranche a porté ce défaut sur l'échelle avant d'être
       corrigé — la leçon se recopie ici. */
    const translation = (matrice: string): number => {
      if (matrice === 'none') return 0;
      const nombres = matrice.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
      return nombres === null || nombres.length < 6 ? 0 : Number(nombres[5]);
    };

    const echantillonner = () => {
      const lignes = [...document.querySelectorAll('[data-signature="ligne"]')];
      const macro = document.querySelector('[data-signature="macro"] img');

      /* LES RETARDS DÉCLARÉS, LUS DANS LE MOTEUR, ET NON DEVINÉS AUX IMAGES.
         C'est le seul relevé de l'étagement qui ne dépende pas de la cadence
         d'échantillonnage — voir le long commentaire au point 3 plus bas. On
         les prend à la PREMIÈRE image où les cinq lignes portent une
         animation : après la fin de la cascade, `fill: backwards` cesse d'être
         pertinent et le moteur retire les animations de la liste. */
      if (fenetre.retardsSignature === null && lignes.length > 0) {
        const lus = lignes.map((noeud) => {
          const texte = noeud.querySelector('[data-signature="texte"]');
          if (texte === null) return null;
          const animations = texte.getAnimations();
          if (animations.length === 0) return null;
          return Math.max(
            ...animations.map((a) => Number(a.effect?.getComputedTiming().delay ?? 0)),
          );
        });
        if (lus.every((valeur) => valeur !== null)) {
          fenetre.retardsSignature = lus as number[];
        }
      }

      if (lignes.length > 0) {
        const textes = lignes.map((noeud) =>
          noeud.querySelector('[data-signature="texte"]'),
        );

        fenetre.serieSignature.push({
          montees: textes.map((noeud) =>
            noeud === null ? 0 : translation(getComputedStyle(noeud).transform),
          ),
          textes: textes.map((noeud) =>
            noeud === null ? 1 : Number(getComputedStyle(noeud).opacity),
          ),
        });
      }

      if (macro !== null) {
        fenetre.transformationsMacro.push(getComputedStyle(macro).transform);
      }

      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await ouvrir(page, '/');
  await attendreMouvement(page);

  /* `--ms-hero` (1400 ms) plus le rang le plus lointain (6 × 70 ms), et une
     marge : la cascade a fini. */
  await page.waitForTimeout(2400);

  const releve = await page.evaluate(() => {
    const fenetre = window as unknown as {
      serieSignature: { montees: number[]; textes: number[] }[];
      transformationsMacro: string[];
      retardsSignature: number[] | null;
    };

    return {
      serie: fenetre.serieSignature,
      retards: fenetre.retardsSignature,
      transformations: [...new Set(fenetre.transformationsMacro)],
      finales: [...document.querySelectorAll('[data-signature="ligne"] [data-signature="texte"]')].map(
        (noeud) => ({
          opacite: Number(getComputedStyle(noeud).opacity),
          transformation: getComputedStyle(noeud).transform,
        }),
      ),
      /* LE VERDICT CLIENT, LU DANS LE STYLE CALCULÉ : aucune ligne n'engendre
         de pseudo-élément, donc aucune surface ne peut se poser sur le héros. */
      pseudos: [...document.querySelectorAll('[data-signature="ligne"]')].map((noeud) =>
        getComputedStyle(noeud, '::after').content,
      ),
    };
  });

  /* CINQ LIGNES : le surtitre, les DEUX mots du monument (la montée se fait mot
     par mot depuis C19 — un seul masque pour deux lignes de cent quarante
     pixels ferait monter le second mot sur deux hauteurs), la baseline et le
     bouton. */
  expect(releve.finales).toHaveLength(5);

  /* 1. AUCUN RECTANGLE. C'est l'exigence du 10/08 à 20 h 10, et c'est la
     première chose que ce cas vérifie. */
  for (const contenu of releve.pseudos) {
    expect(contenu, 'une ligne du héros engendre encore un pseudo-élément').toBe('none');
  }

  const nombreDeLignes = releve.finales.length;
  const departs: number[] = [];

  for (let rang = 0; rang < nombreDeLignes; rang += 1) {
    const montees = releve.serie.map((point) => point.montees[rang] ?? 0);
    const textes = releve.serie.map((point) => point.textes[rang] ?? 1);

    /* 2. LA LIGNE PART DE SOUS LE MASQUE ET REVIENT À ZÉRO. Le seuil de départ
       est en pixels et volontairement bas (12 px) : la plus courte des cinq
       courses est celle de l'étiquette de onze pixels, et la valeur exacte
       appartient à la feuille, pas au test. */
    expect(
      Math.max(...montees),
      `ligne ${String(rang)} : le texte n’est jamais parti d’en dessous`,
    ).toBeGreaterThan(12);
    expect(
      Math.abs(montees.at(-1) ?? 99),
      `ligne ${String(rang)} : le texte n’est pas revenu à sa place`,
    ).toBeLessThan(0.5);

    /* ET LE FONDU EST COURT. L'opacité atteint son plein avant le dixième de la
       course : c'est la contrepartie assumée de la disparition du bloc, sous
       lequel le texte prenait autrefois son opacité à l'abri. La fenêtre pendant
       laquelle de l'encre pâle est visible reste QUATRE FOIS plus courte que
       celle des révélations du reste du site (620 ms, C17). */
    const premiereVisible = textes.findIndex((valeur) => valeur > 0.999);

    expect(premiereVisible, `ligne ${String(rang)} : le texte n’est jamais apparu`).toBeGreaterThan(-1);

    const intermediaires = textes.filter((valeur) => valeur > 0.001 && valeur < 0.999).length;

    expect(
      intermediaires,
      `ligne ${String(rang)} : le fondu a duré ${String(intermediaires)} images`,
    ).toBeLessThan(20);

    /*
     * L'INSTANT DE DÉPART, ET NON CELUI D'ARRIVÉE — la première rédaction
     * mesurait l'arrivée et se serait trompée.
     *
     * `animation-fill-mode: backwards` maintient l'état de départ PENDANT le
     * retard : la première image où la translation quitte son maximum est donc
     * exactement l'instant où le retard de cette ligne expire, et c'est la
     * cascade qu'on veut lire. L'arrivée, elle, dépend de la LONGUEUR de chaque
     * course : le monument parcourt cent vingt-quatre pixels et le bouton
     * vingt-quatre, si bien que le bouton, parti le dernier, se pose avant la
     * baseline. Un contrôle sur les arrivées aurait déclaré rompue une cascade
     * parfaitement étagée.
     */
    const depart = Math.abs(montees[0] ?? 0);

    departs.push(montees.findIndex((valeur) => Math.abs(valeur) < depart * 0.98));
  }

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * 3. LES CINQ GESTES SONT ÉTAGÉS — ET L'INDICE D'IMAGE NE PEUT PAS LE DIRE
   * ═══════════════════════════════════════════════════════════════════════
   *
   * La première rédaction exigeait que les INDICES D'IMAGE de départ soient
   * strictement croissants. C'était mesurer l'échantillonneur, pas la cascade,
   * et le défaut a fini par se voir : le cas est tombé sur « la ligne 3 ne part
   * pas après la ligne 2 — attendu > 11, reçu 11 ».
   *
   * LA CAUSE N'EST PAS DANS LA FEUILLE. Un chargement de page comporte
   * TOUJOURS une image longue — le relevé de ce dépôt en montre une de 100 à
   * 300 ms, pendant le décodage du fond et des polices. `requestAnimationFrame`
   * ne rend pas la main pendant ce temps-là : deux départs séparés de 140 ms
   * dans la feuille tombent alors dans la MÊME image, et deux rangs
   * parfaitement étagés partagent un indice. Le fond de marbre de C19 a rendu
   * l'image longue un peu plus longue, donc la collision plus probable — il a
   * révélé le défaut, il ne l'a pas créé.
   *
   * ON NE MESURE DONC PLUS L'ÉTAGEMENT AUX IMAGES, ON LE LIT DANS LE MOTEUR.
   * `getComputedTiming().delay` rend le retard que le navigateur appliquera
   * réellement à chaque ligne : c'est l'équivalent, pour une animation, de ce
   * que `getComputedStyle` est pour une couleur — la valeur calculée, jamais la
   * source. Elle est exacte, et aucune cadence d'échantillonnage ne peut la
   * brouiller.
   *
   * La série échantillonnée garde tout le reste du travail (le texte part de
   * sous la ligne, revient à zéro, le fondu est court) : elle prouve que le
   * geste A LIEU. Le moteur, lui, prouve qu'il est ÉTAGÉ. Aucun des deux ne
   * remplace l'autre.
   */
  expect(releve.retards, 'les retards des cinq lignes n’ont pas pu être lus').toHaveLength(
    nombreDeLignes,
  );

  const retards = releve.retards ?? [];

  for (let rang = 1; rang < retards.length; rang += 1) {
    expect(
      retards[rang],
      `la ligne ${String(rang)} ne part pas après la ligne ${String(rang - 1)} ` +
        `(retards déclarés : ${retards.join(', ')} ms)`,
    ).toBeGreaterThan(retards[rang - 1] ?? 0);
  }

  /* ET LA CASCADE COUVRE BIEN LA PORTÉE ANNONCÉE. Les rangs 1, 2, 3, 5 et 6
     valent 350 ms entre la première ligne et la dernière (70 ms de pas). Sans
     cette borne, cinq retards de 1, 2, 3, 4 et 5 ms passeraient le contrôle
     ci-dessus en rendant un seul geste épais — exactement le défaut que
     l'espacement des rangs existe pour éviter. */
  expect(
    (retards.at(-1) ?? 0) - (retards[0] ?? 0),
    `la cascade ne s’étale que sur ${String((retards.at(-1) ?? 0) - (retards[0] ?? 0))} ms`,
  ).toBeGreaterThanOrEqual(280);

  /* LA SÉRIE ÉCHANTILLONNÉE CORROBORE, SANS PLUS PRÉTENDRE TRANCHER : les
     départs observés ne peuvent pas REMONTER le temps. C'est faible, et c'est
     vrai quelle que soit la longueur de l'image longue — donc ça ne rendra
     jamais rouge un site sain. */
  for (let rang = 1; rang < departs.length; rang += 1) {
    expect(
      departs[rang],
      `la ligne ${String(rang)} a été vue partir AVANT la ligne ${String(rang - 1)}`,
    ).toBeGreaterThanOrEqual(departs[rang - 1] ?? 0);
  }

  /* ET LES CINQ LIGNES FINISSENT VISIBLES, À LEUR PLACE. C'est la promesse que
     toute cette doctrine protège : l'état final est l'état par défaut, et une
     animation d'entrée qui laisserait une ligne à mi-opacité — ou décalée —
     serait pire que pas d'animation du tout. */
  for (const finale of releve.finales) {
    expect(finale.opacite).toBe(1);
    expect(finale.transformation).toBe('none');
  }

  /* L'IMAGE N'A PAS BOUGÉ D'UNE IMAGE. La signature de la macro reste derrière
     `html.mouvement`, qui n'est posée qu'après hydratation — et les images-clés
     du texte ne la concernent pas. Sa transformation ne prend donc qu'une seule
     valeur pendant toute la séquence. */
  expect(releve.transformations).toEqual(['none']);

  /* ═══════════════════════════════════════════════════════════════════════
     SOUS MOUVEMENT RÉDUIT, LE TEXTE COMMENCE VISIBLE ET AUCUN BLOC N'EXISTE
     ═══════════════════════════════════════════════════════════════════════
     La contre-épreuve, et elle ne peut se faire qu'ici : les six campagnes
     fonctionnelles jouent sous `reduce` mais n'ont aucune raison de regarder le
     héros, et ce projet-ci est le seul qui puisse ouvrir les deux régimes côte
     à côte. Le geste vit sous `no-preference` : sous `reduce`, aucune animation
     n'est déclarée, le texte est à sa place et il y est depuis toujours.

     LE MASQUE, LUI, EXISTE DANS LES DEUX RÉGIMES — c'est une géométrie, pas un
     mouvement, et la mise en page ne se règle pas (même raison que `width:
     fit-content` depuis C18). Il ne retire que ce qui se trouve SOUS la ligne,
     donc rien quand le texte est posé : le contrôle du pseudo-élément vaut ici
     comme là-bas, et il vaut désormais « il n'y a AUCUN bloc », pas « le bloc
     ne joue pas ». */
  const contexteReduit = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const ongletReduit = await contexteReduit.newPage();

  await ongletReduit.addInitScript(() => {
    const fenetre = window as unknown as { opaciteMinimale: number };

    fenetre.opaciteMinimale = 1;

    const echantillonner = () => {
      for (const noeud of document.querySelectorAll('[data-signature="texte"]')) {
        fenetre.opaciteMinimale = Math.min(
          fenetre.opaciteMinimale,
          Number(getComputedStyle(noeud).opacity),
        );
      }

      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await ongletReduit.goto('/');
  await ongletReduit.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await ongletReduit.waitForTimeout(500);

  const releveReduit = await ongletReduit.evaluate(() => ({
    minimum: (window as unknown as { opaciteMinimale: number }).opaciteMinimale,
    /* Le pseudo-élément n'est même pas déclaré : `content` vaut sa valeur
       initiale, donc aucune boîte n'est engendrée. C'est plus fort que « il ne
       bouge pas » — il n'y a rien. */
    contenus: [...document.querySelectorAll('[data-signature="ligne"]')].map(
      (noeud) => getComputedStyle(noeud, '::after').content,
    ),
  }));

  await contexteReduit.close();

  /* JAMAIS AUTRE CHOSE QUE UN. Le texte n'a pas commencé transparent : il n'a
     jamais cessé d'être là. */
  expect(releveReduit.minimum).toBe(1);

  for (const contenu of releveReduit.contenus) {
    expect(contenu).toBe('none');
  }
});

/* ========================================================================== */
/* 7. LA VIDÉO DU HÉROS — ELLE NE PART QUE SI ON LA VEUT (C19)               */
/* ========================================================================== */

/**
 * CE CAS DÉFEND UNE PROMESSE FAITE AU VISITEUR, PAS UN EFFET.
 *
 * Le plan directeur EXCLUAIT la vidéo du héros, et il avait écrit ses cinq
 * conditions de retour. Le client a tranché le 10/08 ; les conditions restent,
 * et deux d'entre elles ne se vérifient qu'au RÉSEAU — c'est-à-dire nulle part
 * ailleurs que dans une campagne :
 *
 * 1. SOUS MOUVEMENT RÉDUIT, PAS UN OCTET. Ce n'est pas « la vidéo ne joue
 *    pas » : c'est « la vidéo n'est pas téléchargée ». Un visiteur qui demande
 *    moins de mouvement ne paie pas un mégaoctet pour un mouvement qu'il
 *    refuse. Lire l'opacité ou l'attribut ne le dirait PAS — les deux vaudraient
 *    la même chose si le fichier partait quand même.
 * 2. UN SEUL RENDU EST TÉLÉCHARGÉ. Deux sources sont déclarées, AV1 puis
 *    H.264 : si la chaîne `codecs` était absente ou fausse, un navigateur
 *    prendrait la première qu'il ne sait pas lire, ou les deux. Le contrôle
 *    porte donc sur le COMPTE et sur le NOM du fichier reçu.
 *
 * Le patron est celui du défilement adouci de C17 (preuve réseau AVEC
 * contre-épreuve) : un compte à zéro ne prouve rien tout seul, il faut montrer
 * dans le même cas qu'il vaut un ailleurs.
 */
test('la vidéo du héros joue sous mouvement, et ne se télécharge pas sous reduce', async ({
  page,
  browser,
}) => {
  const recus: string[] = [];

  page.on('request', (requete) => {
    if (requete.url().includes('.mp4')) {
      recus.push(requete.url().split('/').pop() ?? '');
    }
  });

  await ouvrir(page, '/');
  await attendreMouvement(page);

  const video = page.locator('[data-video-heros]');

  /* La lecture demande un décodage : on attend l'ÉTAT, jamais une durée. */
  await expect(video).toHaveAttribute('data-video-heros', 'joue', { timeout: 10_000 });

  /* LE FONDU DURE `--ms-revele` (620 ms) ET IL COMMENCE À L'ATTRIBUT : lire
     l'opacité à l'instant où l'attribut bascule rend une valeur intermédiaire
     (0,67 relevé au contrôle). On SCRUTE la valeur d'arrivée plutôt que
     d'attendre une durée — un délai en dur serait juste aujourd'hui et faux au
     premier réglage du jeton. */
  await expect
    .poll(async () => video.evaluate((noeud) => getComputedStyle(noeud).opacity), {
      timeout: 5000,
    })
    .toBe('1');

  const etat = await video.evaluate((noeud) => {
    const lecteur = noeud as HTMLVideoElement;
    return {
      opacite: getComputedStyle(lecteur).opacity,
      enPause: lecteur.paused,
      avance: lecteur.currentTime > 0,
      recue: lecteur.currentSrc.split('/').pop(),
    };
  });

  expect(etat.opacite).toBe('1');
  expect(etat.enPause).toBe(false);
  expect(etat.avance, 'la vidéo est marquée jouée mais n’a pas avancé').toBe(true);

  /* UN SEUL FICHIER, ET C'EST L'AV1. Le repli pèse deux fois et demie plus :
     le télécharger en plus reviendrait à annuler tout l'intérêt des deux
     sources. */
  expect(recus, `fichiers vidéo reçus : ${recus.join(', ')}`).toHaveLength(1);
  expect(recus[0]).toContain('av1');
  expect(etat.recue).toContain('av1');

  /* L'AFFICHE EST TOUJOURS LÀ, DESSOUS. La vidéo la recouvre, elle ne la
     remplace pas : c'est elle le plus grand affichage de contenu, et c'est ce
     qui protège la note de rapidité de la page. */
  await expect(page.locator('.scene-heros img').first()).toBeVisible();

  /* AUCUN TEXTE SUR LA VIDÉO — décision confirmée trois fois. Un texte posé sur
     une image mouvante n'a pas de contraste mesurable, et ce projet en vend des
     mesurés. La scène ne contient que des images. */
  const texteDansLaScene = await page
    .locator('.scene-heros')
    .evaluate((noeud) => (noeud.textContent ?? '').trim());

  expect(texteDansLaScene).toBe('');

  /* ═══════════════════════════════════════════════════════════════════════
     LA CONTRE-ÉPREUVE : SOUS MOUVEMENT RÉDUIT, LE RÉSEAU RESTE MUET
     ═══════════════════════════════════════════════════════════════════════ */
  const contexteReduit = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const ongletReduit = await contexteReduit.newPage();
  const recusReduit: string[] = [];

  ongletReduit.on('request', (requete) => {
    if (requete.url().includes('.mp4')) {
      recusReduit.push(requete.url().split('/').pop() ?? '');
    }
  });

  await ongletReduit.goto('/');
  await ongletReduit.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );

  /* Trois secondes : très au-delà du délai qu'un observateur met à déclencher,
     et très en deçà de ce qu'un test peut se permettre d'attendre. */
  await ongletReduit.waitForTimeout(3000);

  const etatReduit = await ongletReduit.locator('[data-video-heros]').evaluate((noeud) => {
    const lecteur = noeud as HTMLVideoElement;
    return {
      attribut: lecteur.dataset['videoHeros'],
      opacite: getComputedStyle(lecteur).opacity,
      enPause: lecteur.paused,
    };
  });

  await contexteReduit.close();

  expect(
    recusReduit,
    `sous mouvement réduit, ${String(recusReduit.length)} fichier(s) vidéo ont été demandés`,
  ).toEqual([]);
  expect(etatReduit.attribut).toBe('attente');
  expect(etatReduit.opacite).toBe('0');
  expect(etatReduit.enPause).toBe(true);
});

/* ========================================================================== */
/* 8. LES VIDÉOS JOUENT AUSSI QUAND ON ARRIVE EN CLIQUANT (C19, étendu C20)   */
/* ========================================================================== */

/**
 * LE CAS QUI FIXE LE DÉFAUT DE LA RECETTE FINALE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL DÉFEND, ET POURQUOI LE CAS 7 NE POUVAIT PAS LE VOIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La recette du 11/08 a mesuré, sur trois chemins, que **seule jouait la vidéo
 * de la page par laquelle la visite avait COMMENCÉ** : `/boutique` ouverte à
 * froid rendait `readyState` 4, la même page atteinte en CLIQUANT restait à 0,
 * et l'accueil atteint en cliquant se taisait pareillement. Le contrôleur vivait
 * dans la frontière cliente unique de la mise en page racine (D26) avec une
 * liste de dépendances VIDE : il se montait une fois par DOCUMENT et ne revoyait
 * jamais la balise `<video>` d'une route suivante.
 *
 * Le cas 7 est passé à côté pour une raison qui vaut d'être écrite : il ouvre sa
 * page avec `ouvrir()`, c'est-à-dire un `goto`. **Toutes les preuves du dépôt
 * chargent à froid.** Un visiteur, lui, clique — et comme la plupart des visites
 * commencent par l'accueil, la vidéo du héros avait toujours l'air de marcher.
 * Un harnais qui n'emprunte qu'un seul chemin ne peut pas voir un défaut DE
 * CHEMIN, quelle que soit sa densité d'assertions.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE CRITÈRE NE REGARDE PAS LE SENS DU TEMPS — une boucle n'avance pas droit
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toutes les boucles portent `loop`. Un échantillon pris à cheval sur le repassage
 * rend « 5,99 s → 1,06 s », c'est-à-dire une lecture parfaitement normale qu'une
 * comparaison `fin > debut` déclare arrêtée. L'outil in vivo de la recette
 * portait cette faute et ne l'a jamais montrée : sur les chemins cassés, le
 * lecteur rendait zéro des deux côtés, et l'inégalité tombait juste pour la
 * mauvaise raison. On lit donc trois faits qui ne dépendent d'aucun sens : le
 * lecteur n'est pas en pause, son temps courant a CHANGÉ, et il a de quoi
 * peindre (`readyState` ≥ 3).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ET LA CONTRE-ÉPREUVE PORTE SUR LE RISQUE QUE LE CORRECTIF CRÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rebalayer les vidéos à chaque route est exactement le geste capable de rompre
 * la promesse « pas un octet sous mouvement réduit » (interdit n° 17 de D37,
 * condition de retour n° 3) : il rejoue le contrôleur là où il ne tournait
 * jamais. Le cas 7 prouve cette promesse au chargement à froid ; il faut la
 * prouver aussi APRÈS navigation, et cela ne se lit qu'au réseau.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE C20 A AJOUTÉ ICI, ET POURQUOI PAS UN CAS DE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le retour n° 19 donne une vidéo à `/livraison`, à `/suivi`, puis à `/panier`.
 * Le défaut que ce cas défend est un défaut DE CHEMIN et non de page : sa cause
 * vivait dans la mise en page racine, donc il se rejoue à l'identique sur toute
 * route ajoutée. Le CHEMIN s'allonge — accueil → rayon → livraison → suivi →
 * panier → accueil → « Précédent » — et chaque étape lit les mêmes trois faits.
 * Écrire trois cas jumeaux aurait triplé le temps de campagne pour rejouer le
 * même mécanisme : ce qui manquait n'était pas une assertion, c'était un pas.
 */
test('les vidéos jouent quand on arrive sur leur page en cliquant', async ({
  page,
  browser,
}) => {
  /** Trois faits bruts, relevés à 400 ms d'intervalle sur le lecteur de la page. */
  const etatDuLecteur = async () =>
    page.locator('[data-video-heros]').evaluate(async (noeud) => {
      const lecteur = noeud as HTMLVideoElement;
      const debut = lecteur.currentTime;

      await new Promise((resoudre) => setTimeout(resoudre, 400));

      return {
        marque: lecteur.dataset['videoHeros'] ?? '(aucune)',
        aBouge: lecteur.currentTime !== debut,
        enPause: lecteur.paused,
        readyState: lecteur.readyState,
      };
    });

  /* ─── LE CHEMIN D'ENTRÉE : l'accueil, à froid. C'est l'état que la recette
     trouvait déjà sain, et il sert ici de point de départ, pas de preuve. ─── */
  await ouvrir(page, '/');
  await attendreMouvement(page);
  await expect(page.locator('[data-video-heros]')).toHaveAttribute(
    'data-video-heros',
    'joue',
    { timeout: 10_000 },
  );

  /* ─── 1. LE RAYON, ATTEINT EN CLIQUANT. Le cœur du cas : c'est ce chemin-là
     qui rendait `readyState` 0 avant le correctif — un lecteur auquel rien
     n'avait jamais été demandé. ─── */
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();
  await attendrePage(page, RAYON);

  await expect(
    page.locator('[data-video-heros]'),
    'la vidéo du rayon reste muette quand on y arrive en cliquant',
  ).toHaveAttribute('data-video-heros', 'joue', { timeout: 10_000 });

  const auRayon = await etatDuLecteur();

  expect(auRayon.readyState, 'le lecteur du rayon n’a rien reçu').toBeGreaterThanOrEqual(3);
  expect(auRayon.enPause, 'le lecteur du rayon est en pause').toBe(false);
  expect(auRayon.aBouge, 'le temps courant du rayon n’a pas changé').toBe(true);

  /* ─── 1 bis. LES TROIS ROUTES DE C20, DANS LA FOULÉE. Elles n'ajoutent pas un
     mécanisme, elles ajoutent des PAS sur le même chemin : le contrôleur ne
     connaît que la route courante, et une route de plus est exactement ce qu'il
     doit voir. Les liens de l'en-tête sont ceux qu'un visiteur emprunte — et
     c'est pour cela que `/panier` porte son propre localisateur au lieu de
     rejoindre la boucle par un simple intitulé : on n'y va PAS par la navigation
     principale, on y va par la pastille. Un test qui prendrait une autre porte
     que le visiteur ne prouverait pas la sienne. ─── */
  const navigation = () => page.getByRole('navigation', { name: 'Navigation principale' });

  for (const etape of [
    { chemin: '/livraison', lien: () => navigation().getByRole('link', { name: 'Livraison', exact: true }) },
    {
      chemin: '/suivi',
      lien: () => navigation().getByRole('link', { name: 'Suivi de commande', exact: true }),
    },
    { chemin: '/panier', lien: () => page.locator('header a[href="/panier"]').first() },
  ]) {
    await etape.lien().click();
    await attendrePage(page, etape.chemin);

    await expect(
      page.locator('[data-video-heros]'),
      `la vidéo de ${etape.chemin} reste muette quand on y arrive en cliquant`,
    ).toHaveAttribute('data-video-heros', 'joue', { timeout: 10_000 });

    const releve = await etatDuLecteur();

    expect(
      releve.readyState,
      `le lecteur de ${etape.chemin} n’a rien reçu`,
    ).toBeGreaterThanOrEqual(3);
    expect(releve.enPause, `le lecteur de ${etape.chemin} est en pause`).toBe(false);
    expect(releve.aBouge, `le temps courant de ${etape.chemin} n’a pas changé`).toBe(true);
  }

  /* ─── 2. L'ACCUEIL, RETROUVÉ EN CLIQUANT. La recette a mesuré ce troisième
     chemin plutôt que de le déduire du mécanisme, et c'est lui qui a dit la
     TAILLE du défaut : deux pages, pas une. Le retour se fait par la MARQUE de
     l'en-tête — ce site n'a pas de lien « Accueil », il a un monument qui y
     ramène, et c'est le geste réel d'un visiteur. ─── */
  await page.locator('header a[href="/"]').first().click();
  await attendrePage(page, '/');

  await expect(
    page.locator('[data-video-heros]'),
    'la vidéo de l’accueil reste muette quand on y revient depuis le site',
  ).toHaveAttribute('data-video-heros', 'joue', { timeout: 10_000 });

  const deRetour = await etatDuLecteur();

  expect(deRetour.readyState, 'le lecteur de l’accueil n’a rien reçu').toBeGreaterThanOrEqual(
    3,
  );
  expect(deRetour.enPause, 'le lecteur de l’accueil est en pause').toBe(false);
  expect(deRetour.aBouge, 'le temps courant de l’accueil n’a pas changé').toBe(true);

  /* ─── 3. ET LE BOUTON « PRÉCÉDENT » VAUT UN CLIC. C'est l'historique qui
     remet la route en place, sans qu'aucun lien n'ait été touché ; pour React
     c'est une navigation comme une autre, et le contrôleur doit y voir la même
     chose. On le mesure au lieu de le déduire. Depuis la cagette, le pas en
     arrière ramène à `/panier`, dernière étape avant l'accueil. ─── */
  await page.goBack();
  await attendrePage(page, '/panier');

  await expect(
    page.locator('[data-video-heros]'),
    'la vidéo se tait quand on revient par le bouton « Précédent »',
  ).toHaveAttribute('data-video-heros', 'joue', { timeout: 10_000 });

  /* ═══════════════════════════════════════════════════════════════════════
     LA CONTRE-ÉPREUVE : SOUS MOUVEMENT RÉDUIT, LA NAVIGATION NE COÛTE RIEN
     ═══════════════════════════════════════════════════════════════════════ */
  const contexteReduit = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const ongletReduit = await contexteReduit.newPage();
  const recusReduit: string[] = [];

  ongletReduit.on('request', (requete) => {
    if (requete.url().includes('.mp4')) {
      recusReduit.push(requete.url().split('/').pop() ?? '');
    }
  });

  await ongletReduit.goto('/');
  await ongletReduit.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await ongletReduit
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Boutique', exact: true })
    .click();
  await ongletReduit.waitForURL((url) => url.pathname === RAYON);

  /* Trois secondes après l'arrivée : très au-delà du délai qu'un observateur
     met à déclencher. Une absence se prouve en laissant du temps, pas en
     regardant vite. */
  await ongletReduit.waitForTimeout(3000);

  const etatReduit = await ongletReduit.locator('[data-video-heros]').evaluate((noeud) => {
    const lecteur = noeud as HTMLVideoElement;
    return {
      attribut: lecteur.dataset['videoHeros'],
      readyState: lecteur.readyState,
      enPause: lecteur.paused,
    };
  });

  await contexteReduit.close();

  expect(
    recusReduit,
    `après navigation sous mouvement réduit, ${String(recusReduit.length)} fichier(s) vidéo demandés`,
  ).toEqual([]);
  expect(etatReduit.attribut).toBe('attente');
  expect(etatReduit.readyState, 'le lecteur a été sollicité sous mouvement réduit').toBe(0);
  expect(etatReduit.enPause).toBe(true);
});

/* ========================================================================== */
/* 9. LES TROIS HÉROS DE C20 — À FROID, ET SOUS REDUCE (retour client n° 19)  */
/* ========================================================================== */

/**
 * LE CAS 7 DÉFEND UNE PAGE ; CELUI-CI DÉFEND LES TROIS QUI VIENNENT D'ARRIVER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI ON NE S'EST PAS CONTENTÉ D'ÉTENDRE LE CAS 8
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le cas 8 emprunte un CHEMIN : il prouve que la vidéo part quand on arrive en
 * cliquant. Il ne dit rien de ce qui se passe quand la visite COMMENCE sur ces
 * pages-là — c'est-à-dire le cas d'un lien partagé, d'un résultat de recherche,
 * d'un signet. Or c'est le seul chemin où la vidéo entre en concurrence avec
 * l'image de tête, donc le seul où elle peut coûter la note de rapidité. Les
 * deux questions sont distinctes, et une seule campagne les couvrait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TROIS PROMESSES, ET CHACUNE SE LIT À UN ENDROIT DIFFÉRENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. UN SEUL RENDU TÉLÉCHARGÉ, ET C'EST L'AV1. Se lit au RÉSEAU. Si la chaîne
 *    `codecs` du relevé était absente ou fausse, le navigateur prendrait la
 *    source qu'il ne sait pas lire, ou les deux — et le repli pèse ici de deux
 *    à quatre fois l'AV1.
 * 2. L'AFFICHE RESTE DESSOUS. Se lit dans le DOM. C'est elle le plus grand
 *    affichage de contenu de la page ; la vidéo la RECOUVRE, elle ne la
 *    remplace pas. Une vidéo qui deviendrait le plus grand affichage ferait
 *    tomber la note et romprait la règle D37 amendée en C19-ter.
 * 3. SOUS MOUVEMENT RÉDUIT, PAS UN OCTET. Se lit au réseau, et seulement là :
 *    l'attribut et l'opacité vaudraient la même chose si le fichier partait
 *    quand même.
 *
 * LE CRITÈRE DE LECTURE EST CELUI DU CAS 8, et pour la même raison : ces trois
 * boucles portent `loop`, donc leur temps courant peut RECULER. On lit le
 * mouvement (le temps a changé) et l'état (hors pause), jamais le SENS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ET `/panier` N'EST PAS UNE TROISIÈME PAGE COMME LES DEUX AUTRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle est l'une des QUATRE URL dont ce projet publie les notes. La promesse
 * n° 2 ci-dessus — l'affiche reste le plus grand affichage de contenu — y cesse
 * d'être une précaution d'architecture pour devenir la condition d'un chiffre
 * vendu : c'est elle qui autorise l'entrée de titre à jouer sur cette page
 * (D37 amendé en C19-ter). Elle se lit ici dans le DOM, et sous bridage dans
 * `preuves/c19/lcp-attribution.mjs`, qui nomme l'élément mesuré.
 */
test('les trois héros de C20 jouent à froid, et se taisent sous reduce', async ({
  page,
  browser,
}) => {
  for (const chemin of ['/livraison', '/suivi', '/panier']) {
    const recus: string[] = [];

    const noter = (requete: { url: () => string }) => {
      if (requete.url().includes('.mp4')) {
        recus.push(requete.url().split('/').pop() ?? '');
      }
    };

    page.on('request', noter);

    await ouvrir(page, chemin);
    await attendreMouvement(page);

    const video = page.locator('[data-video-heros]');

    await expect(video, `${chemin} : la vidéo n’a jamais joué`).toHaveAttribute(
      'data-video-heros',
      'joue',
      { timeout: 10_000 },
    );

    /* Le fondu dure `--ms-revele` : on SCRUTE la valeur d'arrivée plutôt que
       d'attendre une durée, qui serait juste aujourd'hui et fausse au premier
       réglage du jeton. */
    await expect
      .poll(async () => video.evaluate((noeud) => getComputedStyle(noeud).opacity), {
        timeout: 5000,
      })
      .toBe('1');

    const etat = await video.evaluate(async (noeud) => {
      const lecteur = noeud as HTMLVideoElement;
      const debut = lecteur.currentTime;

      await new Promise((resoudre) => setTimeout(resoudre, 400));

      return {
        enPause: lecteur.paused,
        aBouge: lecteur.currentTime !== debut,
        readyState: lecteur.readyState,
        recue: lecteur.currentSrc.split('/').pop() ?? '',
        /* Le dossier servi doit être celui de la page : une clef qui se
           tromperait de route jouerait la boucle du voisin, et tout le reste
           serait vert. */
        dossier: lecteur.currentSrc.split('/').slice(-2, -1)[0] ?? '',
      };
    });

    page.off('request', noter);

    expect(etat.enPause, `${chemin} : le lecteur est en pause`).toBe(false);
    expect(etat.aBouge, `${chemin} : le temps courant n’a pas changé`).toBe(true);
    expect(etat.readyState, `${chemin} : le lecteur n’a rien reçu`).toBeGreaterThanOrEqual(3);
    expect(etat.dossier, `${chemin} : la boucle servie vient d’un autre dossier`).toBe(
      chemin.slice(1),
    );

    expect(recus, `${chemin} : fichiers vidéo reçus — ${recus.join(', ')}`).toHaveLength(1);
    expect(recus[0]).toContain('av1');
    expect(etat.recue).toContain('av1');

    /* L'AFFICHE EST TOUJOURS LÀ, DESSOUS — et c'est elle qui porte la mesure. */
    await expect(
      page.locator('.scene-heros img').first(),
      `${chemin} : l’affiche a disparu sous la vidéo`,
    ).toBeVisible();

    /* AUCUN TEXTE SUR LA VIDÉO : un texte posé sur une image mouvante n'a pas
       de contraste mesurable, et ce projet en vend des mesurés. */
    const texteDansLaScene = await page
      .locator('.scene-heros')
      .evaluate((noeud) => (noeud.textContent ?? '').trim());

    expect(texteDansLaScene, `${chemin} : du texte est posé sur la vidéo`).toBe('');
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LA CONTRE-ÉPREUVE : SUR LES TROIS PAGES, SOUS REDUCE, LE RÉSEAU EST MUET
     ═══════════════════════════════════════════════════════════════════════

     Un même contexte réduit visite les trois pages : un compte à zéro cumulé
     sur les trois est plus fort que trois comptes à zéro pris séparément, parce
     qu'il couvre AUSSI la navigation de l'une à l'autre. */
  const contexteReduit = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const ongletReduit = await contexteReduit.newPage();
  const recusReduit: string[] = [];

  ongletReduit.on('request', (requete) => {
    if (requete.url().includes('.mp4')) {
      recusReduit.push(requete.url().split('/').pop() ?? '');
    }
  });

  const etatsReduits: { chemin: string; attribut: string; readyState: number }[] = [];

  for (const chemin of ['/livraison', '/suivi', '/panier']) {
    await ongletReduit.goto(chemin);
    await ongletReduit.waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
    );

    /* Trois secondes : très au-delà du délai qu'un observateur met à
       déclencher. Une absence se prouve en laissant du temps. */
    await ongletReduit.waitForTimeout(3000);

    const releve = await ongletReduit.locator('[data-video-heros]').evaluate((noeud) => {
      const lecteur = noeud as HTMLVideoElement;

      return {
        attribut: lecteur.dataset['videoHeros'] ?? '(aucun)',
        readyState: lecteur.readyState,
      };
    });

    etatsReduits.push({ chemin, ...releve });
  }

  await contexteReduit.close();

  expect(
    recusReduit,
    `sous mouvement réduit, ${String(recusReduit.length)} fichier(s) vidéo demandés sur les trois pages`,
  ).toEqual([]);

  for (const etat of etatsReduits) {
    expect(etat.attribut, `${etat.chemin} : la vidéo a été marquée jouée sous reduce`).toBe(
      'attente',
    );
    expect(
      etat.readyState,
      `${etat.chemin} : le lecteur a été sollicité sous mouvement réduit`,
    ).toBe(0);
  }
});

/* ========================================================================== */
/* 10. LE FONDU DES CARTES EST SYMÉTRIQUE (retour client, C19)                */
/* ========================================================================== */

/**
 * POURQUOI CE CAS EST ICI ET NON DANS LA CAMPAGNE DE LA VITRINE.
 *
 * Il porte sur une DURÉE, et les deux profils fonctionnels jouent sous
 * mouvement réduit depuis C11 : la transition y vaut dix microsecondes. Une
 * assertion de durée écrite là-bas serait fausse — elle l'a été, le temps d'un
 * contrôle, qui a rendu « attendu 0.62s, reçu 1e-05s ». C'était le verdict
 * juste sur un site juste, et il valait un déplacement de cas.
 *
 * CE QU'IL DÉFEND. Le client a jugé le fondu croisé « trop brutal ». Il l'était
 * PAR CONSTRUCTION : l'image d'ambiance n'était déclarée que dans la règle de
 * survol, de sorte que la couche cessait d'exister à l'instant où le doigt
 * partait. On entrait en fondu et on sortait d'un coup — et une transition
 * d'opacité sur une couche disparue ne se voit nulle part dans une feuille de
 * style.
 *
 * LA MESURE EST LA SEULE QUI DISTINGUE LES DEUX ÉTATS : à l'aller comme au
 * retour, l'opacité doit passer par des valeurs INTERMÉDIAIRES. Zéro puis un,
 * sans rien entre les deux, est la signature exacte du défaut réparé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE LE RETOUR CLIENT SUIVANT A AJOUTÉ ICI (10/08, 20 h 12)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Toujours trop rapide et peu fluide. » Le diagnostic in vivo
 * (`preuves/c19/fondu-cartes-diagnostic.mjs`) a trouvé deux causes, et ce cas
 * porte désormais les deux correctifs :
 *
 * 1. LE PREMIER SURVOL NE PART PLUS À VIDE. L'attribut `data-ambiance-chargee`
 *    est posé au DÉCODAGE de l'image et non à l'approche, et la feuille l'exige
 *    pour ouvrir le fondu. On vérifie donc, sur une carte JAMAIS approchée,
 *    qu'à l'instant précis où l'attribut apparaît la couche est encore à zéro :
 *    c'est la forme mesurable de « le packshot reste net jusque-là ».
 *
 * 2. LA RESPIRATION EST CROISÉE. Le packshot s'ouvre pendant que la matière se
 *    pose. Un fondu sans mouvement était le geste jugé « peu fluide » ; le
 *    mouvement est ce qui porte la transition.
 */
test('l’ambiance d’une carte revient aussi lentement qu’elle est venue', async ({ page }) => {
  await ouvrir(page, '/boutique');
  await attendreMouvement(page);

  const carte = page.locator('.carte-produit').first();
  const ambiance = carte.locator('.carte-ambiance');
  const packshot = carte.locator('.visuel-produit');

  /*
   * L'ÉCHANTILLONNEUR ET LE GUETTEUR SONT POSÉS DANS LA PAGE, AVANT LE SURVOL.
   *
   * Lire l'opacité depuis le test donnerait quelques points au hasard de la
   * latence du protocole ; une boucle d'images rendues en donne une série. Le
   * guetteur, lui, est un `MutationObserver` : l'instant où l'attribut apparaît
   * ne se rattrape pas après coup, et c'est précisément cet instant qu'on veut
   * juger.
   */
  await carte.evaluate((noeud) => {
    const fenetre = window as unknown as {
      serieAmbiance: number[];
      opaciteAuDecodage: number | null;
    };
    fenetre.serieAmbiance = [];
    fenetre.opaciteAuDecodage = null;
    const couche = noeud.querySelector('.carte-ambiance');

    const guetteur = new MutationObserver(() => {
      if (
        (noeud as HTMLElement).dataset['ambianceChargee'] !== undefined &&
        fenetre.opaciteAuDecodage === null &&
        couche !== null
      ) {
        fenetre.opaciteAuDecodage = Number(getComputedStyle(couche).opacity);
        guetteur.disconnect();
      }
    });

    guetteur.observe(noeud, { attributes: true, attributeFilter: ['data-ambiance-chargee'] });

    const echantillonner = () => {
      if (couche !== null) {
        fenetre.serieAmbiance.push(Number(getComputedStyle(couche).opacity));
      }
      requestAnimationFrame(echantillonner);
    };

    requestAnimationFrame(echantillonner);
  });

  await carte.hover();
  await expect
    .poll(async () => ambiance.evaluate((n) => getComputedStyle(n).opacity), { timeout: 6000 })
    .toBe('1');

  const dureeAller = await ambiance.evaluate((n) => getComputedStyle(n).transitionDuration);

  /* 900 ms — le jeton `--ms-signature` de D37, monté depuis `--ms-revele` sur
     retour client. Les deux propriétés animées portent la même durée ; ce sont
     leurs COURBES qui diffèrent, et le raisonnement est à l'endroit de la
     règle. */
  expect(dureeAller).toContain('0.9s');

  /* LE PREMIER SURVOL PART SUR UNE IMAGE PRÊTE. Zéro n'est pas une commodité de
     seuil : tant que l'attribut n'est pas posé, la règle de survol ne
     s'applique pas du tout, et la couche est donc exactement à son repos. Une
     valeur non nulle ici signifierait que le fondu a commencé avant que
     l'image n'existe — le défaut mesuré à 0,158 en local et bien pire en
     ligne. */
  const opaciteAuDecodage = await page.evaluate(
    () => (window as unknown as { opaciteAuDecodage: number | null }).opaciteAuDecodage,
  );

  expect(
    opaciteAuDecodage,
    'l’attribut de décodage n’a jamais été observé : le guetteur a été posé trop tard',
  ).not.toBeNull();
  expect(
    opaciteAuDecodage ?? 1,
    'le fondu avait déjà commencé quand l’image est devenue peignable',
  ).toBeLessThan(0.02);

  /* LA RESPIRATION CROISÉE : le packshot s'est ouvert pendant que la matière se
     posait. On lit une ÉCHELLE, jamais une matrice entière — la valeur exacte
     appartient à la feuille. */
  const echelle = (matrice: string): number => {
    const nombres = matrice.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
    return nombres === null ? 1 : Number(nombres[0]);
  };

  const packshotAuSurvol = echelle(
    await packshot.evaluate((n) => getComputedStyle(n).transform),
  );

  expect(
    packshotAuSurvol,
    'le packshot ne respire pas : la transition entre les deux images est un simple fondu',
  ).toBeGreaterThan(1.005);

  const compteAller = await page.evaluate(() => {
    const serie = (window as unknown as { serieAmbiance: number[] }).serieAmbiance;
    const intermediaires = serie.filter((v) => v > 0.01 && v < 0.99).length;
    (window as unknown as { serieAmbiance: number[] }).serieAmbiance = [];
    return intermediaires;
  });

  expect(compteAller, 'l’entrée ne passe par aucune opacité intermédiaire').toBeGreaterThan(3);

  /* LE RETOUR, QUI EST TOUT LE SUJET. */
  await page.mouse.move(5, 5);
  await expect
    .poll(async () => ambiance.evaluate((n) => getComputedStyle(n).opacity), { timeout: 6000 })
    .toBe('0');

  const releve = await page.evaluate(() => {
    const serie = (window as unknown as { serieAmbiance: number[] }).serieAmbiance;
    return {
      intermediaires: serie.filter((v) => v > 0.01 && v < 0.99).length,
      minimum: Math.min(...serie),
      maximum: Math.max(...serie),
    };
  });

  expect(
    releve.intermediaires,
    `le retour n’a montré que ${String(releve.intermediaires)} valeur(s) intermédiaire(s) : ` +
      'la couche a disparu au lieu de fondre',
  ).toBeGreaterThan(3);

  /* ET LA RESPIRATION EST SYMÉTRIQUE : le packshot revient à son échelle de
     repos. Un geste qui n'irait que dans un sens laisserait la vignette
     agrandie derrière un pointeur parti. */
  await expect
    .poll(async () => echelle(await packshot.evaluate((n) => getComputedStyle(n).transform)), {
      timeout: 4000,
    })
    .toBe(1);

  /* ET LA COUCHE PORTE TOUJOURS SON IMAGE APRÈS LE RETOUR — sans quoi le
     prochain survol repartirait d'un téléchargement. */
  const image = await ambiance.evaluate((n) => getComputedStyle(n).backgroundImage !== 'none');

  expect(image).toBe(true);
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA MOLETTE DÉFILE LE TIROIR, ET NE DÉFILE QUE LUI (C24)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE CAS N'EXISTE QUE DANS CE FICHIER, ET C'EST TOUT LE SUJET. Les six autres
 * campagnes jouent sous `reducedMotion: 'reduce'` — Lenis n'y est jamais
 * instancié, la molette y est donc native, et le défaut est invisible. Il a
 * fallu qu'un humain ouvre le site publié pour le voir : « la molette de la
 * souris n'interagit pas avec la fenêtre du panier, on est obligé de cliquer
 * sur le rail à côté ».
 *
 * DEUX ASSERTIONS, PARCE QUE LE DÉFAUT ÉTAIT DOUBLE. Mesuré avant correctif,
 * molette au centre du tiroir ouvert :
 *
 *   sans Lenis — tiroir +447 px, page IMMOBILE   (le natif est parfait)
 *   avec Lenis — tiroir    0 px, page +592 px    (le delta part à la page)
 *
 * Le tiroir ne défilait pas, ET la page défilait derrière un dialogue MODAL,
 * c'est-à-dire derrière un écran que la plateforme déclare inerte. Vérifier
 * seulement le premier laisserait passer le second, qui est le plus gênant :
 * on revient d'un tiroir sur une page qui a bougé sous lui.
 *
 * ON MESURE LE DÉPLACEMENT, PAS LA POSITION. La position de départ n'est pas
 * zéro — Playwright a fait défiler la page pour atteindre le bouton d'ajout.
 * Un cas écrit sur `toBe(0)` passerait ou échouerait selon la hauteur de la
 * fenêtre, ce qui n'a rien à voir avec ce qu'il prétend prouver.
 */
test('la molette défile le tiroir d’ajout, et la page ne bouge pas derrière lui', async ({
  page,
}) => {
  await ouvrir(page, FICHE);
  await attendreMouvement(page);

  /* Lenis doit être là : sans lui, ce cas ne prouve rien. */
  await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));

  await page.getByRole('button', { name: 'Ajouter au panier' }).click();

  const tiroir = page.locator('[data-tiroir-ajout]');
  await expect(tiroir).toBeVisible();

  /* Le tiroir doit VRAIMENT déborder, sinon il n'y a rien à faire défiler et
     le cas rendrait vert sur un site cassé. */
  const debordement = await tiroir.evaluate(
    (noeud) => noeud.scrollHeight - noeud.clientHeight,
  );

  expect(
    debordement,
    'le tiroir ne déborde pas : ce cas ne mesurerait rien',
  ).toBeGreaterThan(100);

  const boite = await tiroir.boundingBox();

  if (boite === null) {
    throw new Error('le tiroir n’a pas de boîte');
  }

  const avant = await page.evaluate(() => ({
    tiroir: document.querySelector('[data-tiroir-ajout]')?.scrollTop ?? -1,
    page: window.scrollY,
  }));

  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await page.mouse.wheel(0, 600);

  /* Lenis anime : on attend l'immobilité plutôt qu'un délai écrit à la main. */
  await page.waitForTimeout(600);

  const apres = await page.evaluate(() => ({
    tiroir: document.querySelector('[data-tiroir-ajout]')?.scrollTop ?? -1,
    page: window.scrollY,
  }));

  expect(
    apres.tiroir - avant.tiroir,
    'la molette n’a pas fait défiler le tiroir — Lenis a repris le delta',
  ).toBeGreaterThan(100);

  expect(
    apres.page,
    'la page a défilé derrière un dialogue modal, qui est censé la rendre inerte',
  ).toBe(avant.page);
});
