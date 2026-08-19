import { expect, test, type Page } from '@playwright/test';

import { ouvrir } from './aides';

/**
 * LE TUNNEL, LU AU STYLE CALCULÉ ET À LA GÉOMÉTRIE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CETTE CAMPAGNE GARDE, ET CE QU'ELLE NE GARDE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle ne vérifie AUCUN montant : les montants du parcours d'achat sont gardés
 * par `parcours.spec.ts`, aux valeurs exactes (69,80 €), et deux campagnes qui
 * affirment le même chiffre finissent par diverger. Celle-ci vérifie ce que la
 * tranche C16 a réellement posé, et qui n'était vérifiable nulle part :
 *
 * 1. que les chiffres du tunnel sortent RÉELLEMENT en chasse fixe — une classe
 *    `font-mono` qui n'engendrerait aucun utilitaire serait indiscernable, dans
 *    un fichier, d'une classe qui marche ;
 * 2. que la largeur réservée aux montants tient sa promesse — un montant qui
 *    gagne un chiffre ne doit déplacer NI son libellé, NI son bord droit ;
 * 3. que la micro-transition existe sous `no-preference` ET s'éteint sous
 *    mouvement réduit ;
 * 4. que l'écran de paiement simulé ne porte aucun organe de saisie (D22) ;
 * 5. (C21a) que les trois pages du tunnel portent bien leur héros illustré, et
 *    que leur TITRE n'entre pas pour autant — l'image est venue, la mise en
 *    scène non, et c'est une décision de doctrine que rien d'autre ne garde.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI ON NE COMPARE PAS À UN NOM DE POLICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `next/font/local` engendre des noms de famille HACHÉS (`__policeMono_a1b2c3`)
 * qui changent à chaque construction. Écrire le nom attendu ferait un test qui
 * tombe au premier rebuild sans qu'aucun défaut n'existe.
 *
 * La comparaison porte donc sur des RAPPORTS, qui eux sont stables et disent
 * exactement l'intention : le montant parle de la même voix qu'une étiquette du
 * registre, et d'une AUTRE voix que la prose qui l'entoure. Les deux moitiés
 * comptent — sans la seconde, un test resterait vert le jour où les trois
 * familles se confondraient.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE MOUVEMENT, SOUS LES DEUX RÉGIMES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les deux profils de `playwright.config.ts` jouent sous `reducedMotion:
 * 'reduce'` (C11) : la règle de fondu n'y est jamais active, et une campagne
 * fonctionnelle n'a donc rien à attendre. C'est précisément pourquoi le cas qui
 * la concerne DEMANDE l'autre régime, le temps d'une lecture, puis rétablit
 * celui du profil. Il vérifie les deux sens — une transition qui existe sous
 * `no-preference` et une durée nulle sous `reduce` —, parce qu'une règle qui
 * ignorerait la préférence de l'utilisateur serait un défaut d'accessibilité que
 * rien d'autre ici n'attraperait.
 */

const FICHE = '/boutique/huile-olive-premiere-pression';

/**
 * Un panier d'UNE ligne, monté par l'interface et jamais par le stockage.
 *
 * Écrire directement dans `localStorage` irait plus vite et vérifierait moins :
 * la forme persistée est un détail d'implémentation versionné, et un test qui
 * la connaît se met à garder le mauvais objet.
 */
async function panierDUneLigne(page: Page): Promise<void> {
  await ouvrir(page, FICHE);
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeVisible();
  /* LE TIROIR SE FERME AVANT DE RENDRE LA MAIN (C23). Il est MODAL : tant
     qu'il est ouvert, le reste du document est inerte et Playwright échoue à
     l'actionnabilité sur le premier élément cliqué ensuite. Le geste appartient
     au parcours du visiteur, pas à un contournement — il continue ses achats. */
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouté au panier' })).toBeHidden();

  await ouvrir(page, '/panier');
}

/** La famille de caractères réellement calculée pour un élément. */
async function famille(page: Page, selecteur: string): Promise<string> {
  return page.evaluate((cible) => {
    const element = document.querySelector(cible);

    return element === null ? '(élément absent)' : getComputedStyle(element).fontFamily;
  }, selecteur);
}

test('les chiffres du panier parlent la voix du registre, et pas celle de la prose', async ({
  page,
}) => {
  await panierDUneLigne(page);

  /* Le total : le chiffre le plus lu de la page. */
  const totalFamille = await page
    .getByRole('region', { name: 'Récapitulatif' })
    .locator('[data-chiffre]')
    .last()
    .evaluate((noeud) => getComputedStyle(noeud).fontFamily);

  /* Une étiquette du registre — « Qté » —, dont la mono est acquise depuis C13
     et sert ici de témoin POSITIF. */
  const etiquetteFamille = await page
    .getByText('Qté', { exact: true })
    .first()
    .evaluate((noeud) => getComputedStyle(noeud).fontFamily);

  /* Et la prose de la page, témoin NÉGATIF. */
  const proseFamille = await famille(page, 'main p.text-chapeau, main .text-chapeau');

  expect(totalFamille).toBe(etiquetteFamille);
  expect(totalFamille).not.toBe(proseFamille);
  expect(proseFamille).not.toBe('(élément absent)');

  /* Les chiffres tabulaires ne se voient pas non plus dans un fichier. */
  const variante = await page
    .getByRole('region', { name: 'Récapitulatif' })
    .locator('[data-chiffre]')
    .last()
    .evaluate((noeud) => getComputedStyle(noeud).fontVariantNumeric);

  expect(variante).toContain('tabular-nums');
});

test('la largeur d’un montant ne dépend pas des chiffres qu’il contient', async ({
  page,
}) => {
  await panierDUneLigne(page);

  const montant = page
    .getByRole('region', { name: 'Récapitulatif' })
    .locator('[data-chiffre]')
    .last();

  /* ═══════════════════════════════════════════════════════════════════════
     CE CAS A REMPLACÉ UN TEST QUI NE DISCRIMINAIT RIEN, ET C'EST L'ACQUIS.

     La première rédaction mesurait l'abscisse du libellé « Total » et le bord
     droit de son montant, avant et après un changement de quantité, pour
     prouver qu'une largeur minimale posée sur le parent empêchait le bloc de
     glisser. Elle est restée VERTE une fois cette largeur retirée : les deux
     points mesurés sont tenus par `justify-between`, qui colle un enfant à
     chaque bord quelle que soit la largeur du second. Le test affirmait donc
     quelque chose de vrai — rien ne bouge — pour une raison qui n'avait rien à
     voir avec ce qu'il prétendait garder. La largeur minimale a été retirée
     avec lui, relevé à l'appui (`preuves/c16/largeur-montants.mjs` : hauteur du
     récapitulatif 342 → 342 sur un bureau, 332 → 332 sur un téléphone).

     La « largeur figée » que la tranche promet aux données chiffrées est celle
     des CHIFFRES : dans une police à chasse fixe, tous les chiffres ont la même
     avance, donc deux montants de même longueur occupent exactement la même
     place — c'est ce qui fait qu'une colonne de prix s'aligne sur sa virgule
     sans qu'on l'y aide. C'est CELA qui est mesuré ici, et un montant rendu
     avec des chiffres proportionnels ferait tomber le cas.
     ═══════════════════════════════════════════════════════════════════════ */
  const largeurs = await montant.evaluate((modele) => {
    const calcule = getComputedStyle(modele);
    const mesurer = (texte: string): number => {
      const sonde = document.createElement('span');

      sonde.textContent = texte;
      sonde.style.font = calcule.font;
      sonde.style.fontVariantNumeric = calcule.fontVariantNumeric;
      sonde.style.letterSpacing = calcule.letterSpacing;
      sonde.style.position = 'absolute';
      sonde.style.visibility = 'hidden';
      sonde.style.whiteSpace = 'pre';

      document.body.append(sonde);
      const largeur = sonde.getBoundingClientRect().width;
      sonde.remove();

      return largeur;
    };

    /* Les deux extrêmes de la fonte : le « 1 » est le chiffre le plus étroit
       d'un dessin proportionnel, le « 0 » l'un des plus larges. Si les deux
       chaînes mesurent la même chose, la chasse est bien fixe. */
    return { etroit: mesurer('11 111,11'), large: mesurer('00 000,00') };
  });

  expect(largeurs.etroit).toBeCloseTo(largeurs.large, 1);

  /* Et la vraie mesure de contrôle : un montant qui gagne un chiffre décale ce
     qui doit l'être — sa propre largeur — sans jamais faire varier la hauteur
     du bloc, c'est-à-dire sans décalage cumulé. */
  const recapitulatif = page.getByRole('region', { name: 'Récapitulatif' });
  const hauteurAvant = await recapitulatif.evaluate((noeud) =>
    Math.round(noeud.getBoundingClientRect().height),
  );
  const texteAvant = await montant.innerText();

  await page.getByLabel('Qté').fill('5');
  await expect(montant).not.toHaveText(texteAvant);

  const hauteurApres = await recapitulatif.evaluate((noeud) =>
    Math.round(noeud.getBoundingClientRect().height),
  );

  expect(hauteurApres).toBe(hauteurAvant);
});

test('le fondu du nombre suit la préférence de mouvement, dans les deux sens', async ({
  page,
}) => {
  await panierDUneLigne(page);

  const montant = page
    .getByRole('region', { name: 'Récapitulatif' })
    .locator('[data-chiffre]')
    .last();

  /* LE RÉGIME DU PROFIL — et une valeur qui surprend, apprise en écrivant ce
     test : sous `reduce`, la durée calculée n'est pas `0s` mais `1e-05s`.

     Ce n'est pas un résidu de la règle de fondu, qui vit dans une requête
     `no-preference` et ne s'applique donc pas du tout. C'est le FILET de C12,
     qui neutralise `transition-duration` à 0,01 ms sur `*` avec `!important` :
     tout élément de la page porte cette valeur sous mouvement réduit, qu'il ait
     ou non une transition à lui. Attendre `0s` reviendrait à vérifier
     l'implémentation du filet plutôt que la promesse, et le test tomberait le
     jour où le filet écrirait `0ms`.

     Ce qui est vérifié est donc la PROMESSE : sous mouvement réduit, rien ne
     dure assez longtemps pour être vu. */
  const sousReduit = await montant.evaluate(
    (noeud) => getComputedStyle(noeud).transitionDuration,
  );

  expect(Number.parseFloat(sousReduit)).toBeLessThanOrEqual(0.001);

  await page.emulateMedia({ reducedMotion: 'no-preference' });

  /* 320 ms — `--ms-etat`, la durée de ce qui passe d'un état à un autre. Le
     plan directeur écrivait 260, qui n'appartient pas au vocabulaire fermé de
     D37 ; l'arbitrage est écrit dans `globals.css`, et ce nombre-ci le fixe. */
  expect(await montant.evaluate((noeud) => getComputedStyle(noeud).transitionDuration)).toBe(
    '0.32s',
  );

  expect(await montant.evaluate((noeud) => getComputedStyle(noeud).transitionProperty)).toBe(
    'opacity',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('l’écran de paiement simulé ne porte aucun organe de saisie (D22)', async ({ page }) => {
  await panierDUneLigne(page);

  await page.goto('/paiement/simulation?reference=MVB-20260810-4F2B&total=6980');

  /* Le décor compte autant que le fonctionnel : un champ désactivé, barré ou
     purement décoratif finit par être rempli, avertissement lu ou non. La
     décision D22 dit AUCUN, et c'est ce mot-là qui est vérifié. */
  const organes = await page.evaluate(
    () => document.querySelectorAll('input, select, textarea').length,
  );

  expect(organes).toBe(0);
});

test('les libellés sériels du tunnel sortent en capitales, à la voix du registre', async ({
  page,
}) => {
  await panierDUneLigne(page);

  const legende = page.getByText('Zone de livraison', { exact: true });

  const rendu = await legende.evaluate((noeud) => {
    const calcule = getComputedStyle(noeud);

    return {
      famille: calcule.fontFamily,
      casse: calcule.textTransform,
      graisse: calcule.fontWeight,
    };
  });

  const qte = await page
    .getByText('Qté', { exact: true })
    .first()
    .evaluate((noeud) => getComputedStyle(noeud).fontFamily);

  expect(rendu.casse).toBe('uppercase');
  expect(rendu.famille).toBe(qte);

  /* LA GRAISSE EST UN INVARIANT DE FABRICATION, pas un goût. La mono livrée par
     `npm run preparer-police-mono` a son axe RESTREINT aux graisses 400 et 500
     réellement employées (C14) ; le script les lit dans `globals.css`. Une
     graisse posée hors de cet intervalle depuis un composant ne serait pas vue
     par lui et serait ramenée dans l'axe par le navigateur, EN SILENCE. */
  expect(Number(rendu.graisse)).toBeGreaterThanOrEqual(400);
  expect(Number(rendu.graisse)).toBeLessThanOrEqual(500);
});

/* ========================================================================== */
/* LE HÉROS ILLUSTRÉ DU TUNNEL (C21a, retour client n° 21)                    */
/* ========================================================================== */

/** Les trois pages du tunnel et le dossier d'images que chacune doit servir. */
const PAGES_ILLUSTREES = [
  ['/commande', 'commande'],
  ['/paiement/simulation?reference=MVB-20260810-4F2B&total=6980', 'paiement-simulation'],
  ['/commande/confirmation', 'commande-confirmation'],
] as const;

test('les trois pages du tunnel ouvrent sur leur héros illustré', async ({ page }) => {
  /* CE QUE CE CAS GARDE, ET QUI NE SE VOIT PAS DANS UN FICHIER : que l'image
     SERVIE vient bien du dossier de LA page. Une entrée de données recopiée
     d'une page à l'autre — le geste le plus probable quand trois entrées se
     ressemblent — donnerait trois pages illustrées, toutes justes en revue de
     code, dont deux montrant l'image d'une autre. `currentSrc` est l'endroit où
     cela se voit, et le seul. */
  for (const [chemin, dossier] of PAGES_ILLUSTREES) {
    await ouvrir(page, chemin);

    const figure = page.locator('figure.cadre-photo').first();

    await expect(figure).toHaveCount(1);

    const rendu = await figure.evaluate((noeud) => {
      const image = noeud.querySelector('img');

      return {
        servie: image === null ? '(aucune image)' : image.currentSrc,
        alt: image === null ? '' : image.alt,
        largeur: image === null ? 0 : Math.round(image.getBoundingClientRect().width),
        cartouches: noeud.querySelectorAll('figcaption').length,
      };
    });

    expect(rendu.servie).toContain(`/editorial/${dossier}/illustration-`);

    /* Une image de tête est du CONTENU : son alternative est rendue, jamais
       vidée comme celle d'une vignette de rayon (qui doublerait le lien qui
       l'entoure). Et elle occupe une place réelle — un cadre replié à zéro
       passerait toutes les assertions ci-dessus. */
    expect(rendu.alt.length).toBeGreaterThan(40);
    expect(rendu.largeur).toBeGreaterThan(200);

    /* ═══════════════════════════════════════════════════════════════════════
       AUCUN CARTOUCHE, ET L'ALTERNATIVE INTACTE (retour client n° 22).

       Ce cas exigeait l'inverse hier — « un cartouche d'au moins dix
       caractères ». Le client a tranché : la légende sous l'image « fait
       bizarre pour un visiteur ». Les deux assertions vivent ensemble et c'est
       tout l'intérêt de les avoir posées ici : elles disent que ce qui est parti
       est la LÉGENDE VISIBLE, et que ce qui décrit l'image à qui ne la voit pas
       est resté. Un retrait qui aurait vidé l'`alt` du même geste rendrait cette
       ligne-ci verte et la précédente rouge. */
    expect(rendu.cartouches).toBe(0);
  }
});

test('le tunnel gagne son image sans gagner sa mise en scène', async ({ page }) => {
  /* ═══════════════════════════════════════════════════════════════════════
     LES DEUX MOITIÉS COMPTENT, ET LA SECONDE EST CELLE QU'ON OUBLIE.

     `data-titre-anime` dit « une image porte la mesure ici, le titre peut donc
     entrer ». Les trois pages du tunnel ont l'image et n'ont PAS le droit de la
     mise en scène : interdit n° 19 de D37, « un document juridique et un
     formulaire de paiement se lisent ; ils ne se mettent pas en scène ». C'est
     une raison de DOCTRINE, qui ne se déduit d'aucune propriété du visuel — donc
     un drapeau posé à la main, donc un drapeau qu'on peut oublier.

     Vérifier seulement que le tunnel ne s'anime pas laisserait ce cas VERT le
     jour où l'entrée cesserait de jouer partout — c'est la leçon de C16 sur les
     familles de police. `/livraison` sert donc de témoin POSITIF : elle a la
     même image de tête, le même composant, et elle DOIT s'animer.

     Le régime est demandé explicitement : les deux profils jouent sous
     `reducedMotion: 'reduce'` (C11), où aucune animation n'existe et où ce cas
     ne prouverait rien.
     ═══════════════════════════════════════════════════════════════════════ */
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const animationDuTitre = async (chemin: string): Promise<string> => {
    await ouvrir(page, chemin);

    return page
      .locator('h1[data-signature="ligne"] [data-signature="texte"]')
      .evaluate((noeud) => getComputedStyle(noeud).animationName);
  };

  for (const [chemin] of PAGES_ILLUSTREES) {
    expect(await animationDuTitre(chemin), chemin).toBe('none');
  }

  expect(await animationDuTitre('/livraison')).toBe('signature-montee');

  await page.emulateMedia({ reducedMotion: 'reduce' });
});
