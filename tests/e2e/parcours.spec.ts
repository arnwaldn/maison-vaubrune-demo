import { expect, test, type Page } from '@playwright/test';

import {
  attendrePage,
  cliquerNavigation,
  euros,
  ouvrir,
  pastillePanier,
} from './aides';

/**
 * LE PARCOURS FUMIGATOIRE — une seule histoire, racontée en entier.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi UN test long plutôt que quinze courts
 * ---------------------------------------------------------------------------
 *
 * Quinze tests indépendants qui partiraient chacun d'un panier fabriqué à la
 * main vérifieraient quinze écrans et zéro parcours. Or ce que la
 * démonstration vend, c'est justement la CONTINUITÉ : que le prix vu au rayon
 * soit celui du panier, que le total du panier soit celui du récapitulatif,
 * que la référence rendue par le serveur soit celle qu'on retrouve au suivi
 * puis dans l'espace marchand. Chacune de ces égalités relie deux écrans ; les
 * couper reviendrait à ne plus les vérifier.
 *
 * Le prix de ce choix est assumé : quand ce test échoue, il faut lire à quelle
 * étape. Les blocs `test.step()` sont là pour ça — le rapport nomme l'étape
 * fautive avant même qu'on ouvre la trace.
 *
 * ---------------------------------------------------------------------------
 * LES MONTANTS SONT EXACTS, ET CALCULÉS À LA MAIN
 * ---------------------------------------------------------------------------
 *
 * Aucune expression floue, aucun « contient un prix ». Le panier de ce
 * parcours est arrêté une fois pour toutes, et son chiffrage est écrit
 * ci-dessous à la main, à partir du catalogue et du barème versionnés :
 *
 *   2 × huile d'olive 50 cl (MV-HV-OLI-50CL)  2 × 22,50 € = 45,00 €   1 900 g
 *   1 × fromage de brebis 250 g (MV-FR-BRE-250G)        11,90 €         400 g
 *   ────────────────────────────────────────────────────────────────────────
 *   Sous-total                                          56,90 €       2 300 g
 *   Expédition métropole, tranche « jusqu'à 3 kg »        6,90 €
 *   Emballage isotherme (le fromage est périssable)       6,00 €
 *   ────────────────────────────────────────────────────────────────────────
 *   Frais de port                                       12,90 €
 *   TOTAL                                               69,80 €
 *
 * Le franco de port ne s'applique pas : il est à 69,00 €, et c'est le
 * SOUS-TOTAL (56,90 €) qui le déclenche, pas le total. Ce panier a d'ailleurs
 * été choisi pour être juste en dessous — un panier au-dessus du franco
 * n'aurait vérifié ni la tranche de poids ni le supplément isotherme, les deux
 * étant écrasés par l'offre (décision D14).
 *
 * Le fromage sert une seconde fois : c'est lui qui rend l'expédition IMPOSSIBLE
 * vers la Corse (décision D9), ce qui permet de vérifier le refus et le bouton
 * éteint sans changer de panier.
 */

/* -------------------------------------------------------------------------- */
/* Le panier du parcours, et son chiffrage                                     */
/* -------------------------------------------------------------------------- */

const HUILE = {
  slug: 'huile-olive-premiere-pression',
  nom: 'Huile d’olive de première pression',
  sku50cl: 'MV-HV-OLI-50CL',
  prixUnitaire: euros('22,50'),
  sousTotal: euros('45,00'),
} as const;

const FROMAGE = {
  slug: 'fromage-fermier-brebis',
  nom: 'Fromage fermier de brebis',
  prixUnitaire: euros('11,90'),
} as const;

const SOUS_TOTAL = euros('56,90');
const PORT_TRANCHE = euros('6,90');
const PORT_ISOTHERME = euros('6,00');
const TOTAL = euros('69,80');

/** Trois articles : deux huiles et un fromage. La pastille compte les unités. */
const ARTICLES_AU_PANIER = '3';

/** Le motif de `src/lib/commandes/reference.ts`, recopié à dessein. */
const MOTIF_REFERENCE = /^MVB-\d{8}-[2-9A-HJ-NP-Z]{4}$/;

/**
 * Les coordonnées d'essai.
 *
 * Elles portent les mêmes marqueurs d'irréalité que le jeu d'essai du projet
 * (décision D30) : une voie qui n'existe pas, un destinataire qui se dit
 * d'essai, un domaine `.invalid` que la norme réserve et qui ne peut donc pas
 * exister. Le code postal est celui d'une commune de métropole, cohérent avec
 * la destination retenue au panier — sans quoi le formulaire refuserait, et il
 * a raison de le faire.
 */
const CLIENT = {
  nom: 'Client d’essai C8',
  adresse: '1, rue de l’Exemple',
  codePostal: '69001',
  courriel: 'client-essai@example.invalid',
} as const;

/* -------------------------------------------------------------------------- */
/* Gestes réutilisés                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ouvre une fiche depuis le rayon, en cliquant — jamais par `goto`.
 *
 * Le lien de la vignette porte le nom du produit ET son résumé ET son prix :
 * son nom accessible est donc long, et c'est voulu (voir `CarteProduit`). On
 * le désigne par le début de ce nom.
 */
async function ouvrirFicheDepuisLeRayon(
  page: Page,
  nom: string,
  chemin: string,
): Promise<void> {
  await cliquerNavigation(page, 'Boutique');
  await page.waitForURL((url) => url.pathname === '/boutique');
  await expect(page.getByRole('heading', { level: 1, name: 'Boutique' })).toBeVisible();

  await page.getByRole('link', { name: new RegExp(`^${echapper(nom)}`) }).click();
  await attendrePage(page, chemin);
  await expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible();
}

/** Les métacaractères d'une expression, neutralisés. */
function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Le bloc d'ajout au panier d'une fiche : format, quantité, bouton. */
async function ajouterAuPanier(
  page: Page,
  options: { readonly sku?: string; readonly quantite?: number } = {},
): Promise<void> {
  if (options.sku !== undefined) {
    await page.getByLabel('Format', { exact: true }).selectOption(options.sku);
  }

  if (options.quantite !== undefined) {
    await page.getByLabel('Quantité').fill(String(options.quantite));
  }

  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByText('Ajouté au panier.')).toBeVisible();
}

/** Le récapitulatif de la colonne de droite, sur `/panier` comme sur `/commande`. */
function recapitulatif(page: Page) {
  return page.getByRole('region', { name: 'Récapitulatif' });
}

/**
 * Les LIGNES DU PANIER, et elles seules.
 *
 * Un simple `getByRole('listitem')` en ramènerait trois autres familles : la
 * composition détaillée d'un coffret, la liste des articles privés de
 * rétractation, et les entrées du plan de navigation. Le critère retenu est
 * fonctionnel plutôt que structurel — une ligne de panier est une entrée qu'on
 * peut RETIRER —, ce qui la distingue de tout le reste sans dépendre d'une
 * classe de mise en forme.
 */
function lignesDuPanier(page: Page) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: /^Retirer/ }) });
}

/* -------------------------------------------------------------------------- */
/* L'histoire entière                                                          */
/* -------------------------------------------------------------------------- */

test('de l’accueil au suivi : commander, payer, préparer, suivre', async ({ page }) => {
  await test.step('l’accueil avoue la fiction avant toute autre chose', async () => {
    await ouvrir(page, '/');

    const encart = page.getByRole('complementary', {
      name: 'Démonstration — épicerie fictive',
    });

    await expect(encart).toBeVisible();
    await expect(encart).toContainText('L’épicerie est fictive.');
    await expect(pastillePanier(page)).toHaveText('0');
  });

  await test.step('deux huiles d’olive de 50 cl entrent au panier', async () => {
    await ouvrirFicheDepuisLeRayon(page, HUILE.nom, `/boutique/${HUILE.slug}`);

    await ajouterAuPanier(page, { sku: HUILE.sku50cl, quantite: 2 });
    await expect(pastillePanier(page)).toHaveText('2');
  });

  await test.step('un fromage de brebis les rejoint', async () => {
    await ouvrirFicheDepuisLeRayon(page, FROMAGE.nom, `/boutique/${FROMAGE.slug}`);

    await ajouterAuPanier(page);
    await expect(pastillePanier(page)).toHaveText(ARTICLES_AU_PANIER);
  });

  await test.step('le panier chiffre 56,90 € + 12,90 € de port = 69,80 €', async () => {
    await page.getByRole('link', { name: /^Panier/ }).click();
    await attendrePage(page, '/panier');

    /* Les deux lignes, à leur prix unitaire et à leur sous-total. */
    const lignes = lignesDuPanier(page).filter({ hasText: HUILE.nom });
    await expect(lignes.first()).toContainText(`${HUILE.prixUnitaire} l’unité`);
    await expect(lignes.first()).toContainText(HUILE.sousTotal);
    await expect(page.getByText(`${FROMAGE.prixUnitaire} l’unité`)).toBeVisible();

    const recap = recapitulatif(page);
    await expect(recap).toContainText(`Sous-total (${ARTICLES_AU_PANIER} articles)`);
    await expect(recap.getByText(SOUS_TOTAL, { exact: true })).toBeVisible();

    /* Le port n'est PAS affiché en un montant : le moteur rend son détail, et
       le récapitulatif l'affiche ligne à ligne. 6,90 + 6,00 = 12,90. */
    await expect(recap).toContainText('Expédition — France métropolitaine');
    await expect(recap.getByText(PORT_TRANCHE, { exact: true })).toBeVisible();
    await expect(recap).toContainText('Emballage isotherme (produit frais)');
    await expect(recap.getByText(PORT_ISOTHERME, { exact: true })).toBeVisible();

    await expect(recap.getByText(TOTAL, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Passer commande' })).toBeVisible();
  });

  await test.step('la Corse refuse le fromage, et le bouton s’éteint', async () => {
    await page.getByRole('radio', { name: 'Corse' }).check();

    const recap = recapitulatif(page);
    await expect(recap).toContainText('Expédition impossible');
    await expect(recap).toContainText('Ce panier contient un produit frais');

    /* Ni frais, ni total : la phrase du moteur prend toute la place. */
    await expect(recap.getByText(TOTAL, { exact: true })).toHaveCount(0);

    const bouton = page.getByRole('button', { name: 'Passer commande' });
    await expect(bouton).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Passer commande' })).toHaveCount(0);
  });

  await test.step('le retour en métropole rétablit le total exact', async () => {
    await page.getByRole('radio', { name: 'France métropolitaine' }).check();

    const recap = recapitulatif(page);
    await expect(recap.getByText(SOUS_TOTAL, { exact: true })).toBeVisible();
    await expect(recap.getByText(TOTAL, { exact: true })).toBeVisible();
  });

  await test.step('le récapitulatif de commande dit le même total', async () => {
    await page.getByRole('link', { name: 'Passer commande' }).click();
    await attendrePage(page, '/commande');

    const recap = recapitulatif(page);
    await expect(recap.getByText(SOUS_TOTAL, { exact: true })).toBeVisible();
    await expect(recap.getByText(TOTAL, { exact: true })).toBeVisible();

    /* Le bouton porte le libellé qu'impose l'article L. 221-14, et il est
       éteint tant que les coordonnées et les conditions manquent. */
    const engagement = page.getByRole('button', {
      name: 'Commander avec obligation de paiement',
    });
    await expect(engagement).toBeDisabled();

    await page.getByLabel('Prénom et nom').fill(CLIENT.nom);
    await page.getByLabel('Adresse de livraison').fill(CLIENT.adresse);
    await page.getByLabel('Code postal').fill(CLIENT.codePostal);
    await page.getByLabel('Courriel').fill(CLIENT.courriel);
    await expect(engagement).toBeDisabled();

    await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
    await expect(engagement).toBeEnabled();

    await engagement.click();
  });

  await test.step('l’écran de paiement s’annonce comme simulé', async () => {
    await attendrePage(page, '/paiement/simulation');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Écran de paiement simulé' }),
    ).toBeVisible();
    await expect(
      page.getByText('Aucun prestataire n’est appelé, aucune carte n’est demandée'),
    ).toBeVisible();

    /* Aucun champ de carte, pas même décoratif (décision D22). */
    await expect(page.locator('input')).toHaveCount(0);

    const montants = page.getByRole('region', { name: 'Ce qui serait payé' });
    await expect(montants.getByText(TOTAL, { exact: true })).toBeVisible();
  });

  const reference = await test.step('« Payer » rend une référence et vide le panier', async () => {
    await page.getByRole('link', { name: 'Payer' }).click();
    await attendrePage(page, '/commande/confirmation');

    const attendue = new URL(page.url()).searchParams.get('reference') ?? '';
    expect(attendue).toMatch(MOTIF_REFERENCE);

    const bloc = page.getByRole('region', { name: 'Votre référence de commande' });
    await expect(bloc).toContainText(attendue);

    /* ═══════════════════════════════════════════════════════════════════════
       LA RÉFÉRENCE EST L'INFORMATION REINE, ET ELLE SE LIT SANS DÉFILER.

       Le héros illustré de C21a met une image de 332 × 185 points et son cadre
       entre le chapeau et cette référence sur un téléphone : au premier jet,
       elle finissait à 897 px pour une fenêtre de 844, c'est-à-dire qu'il fallait
       défiler pour lire ce que la page existe pour donner. Quatre retraits
       mesurés l'ont ramenée à 836 — huit points de marge.

       HUIT POINTS NE SE SURVEILLENT PAS À L'ŒIL, d'où ce contrôle. Il ne vit pas
       dans `tunnel.spec.ts` parce qu'il lui faudrait rejouer un achat entier
       pour obtenir une référence, et qu'un second achat scripté finirait par
       diverger de celui-ci. Ici, l'achat est déjà fait.

       Le critère est la FENÊTRE du profil, jamais un nombre écrit : à 1280 × 800
       comme à 390 × 844, ce qui est promis est « on la lit sans défiler ».

       Et il porte sur la LIGNE de la référence, pas sur le panneau qui
       l'entoure : celui-ci porte en plus trois lignes de prose (« C'est elle qui
       désigne cette commande partout… ») dont personne n'a promis qu'elles
       tiendraient au-dessus de la ligne. Mesurer le panneau ferait échouer le
       contrôle pour une raison qui n'est pas celle qu'il annonce.

       ───────────────────────────────────────────────────────────────────────
       LE SEUIL EST RESSERRÉ EN C21b, PARCE QUE LE RETRAIT L'AVAIT DÉTENDU.

       Les huit points de marge étaient le prix d'un cadre QUI PORTAIT UN
       CARTOUCHE. Le retour client n° 22 l'a emporté, et la référence remonte de
       trente points : 836 → 806 sur un téléphone, soit trente-huit points de
       marge (`preuves/c21/vu-tunnel-c21b.txt`). Laisser le critère à « au-dessus
       de la flottaison » reviendrait à ne plus rien garder du gain — la marge
       pourrait fondre de trente points sans qu'une ligne rougisse.

       Le seuil resserré reste sans nombre écrit : la référence doit être lue
       entièrement AVEC, EN PLUS, DE QUOI COMMENCER LA LIGNE SUIVANTE — la
       hauteur de son propre libellé, prise dans le DOM. Ce n'est pas une marge
       de confort choisie à l'œil : c'est ce que la page elle-même mesure, donc
       une quantité qui suit la typographie du jour et la largeur de l'écran.

       Il MORD, et ce n'est pas une figure de style : le libellé mesure 24 points
       sur un téléphone (mesuré en faisant échouer l'assertion exprès), donc
       806 + 24 = 830 aujourd'hui pour une fenêtre de 844 — quatorze points de
       marge —, contre 836 + 24 = 860 sur l'état d'hier. Le contrôle d'hier
       restait vert avec le cartouche ; celui-ci serait rouge. */
    const flottaison = await bloc
      .getByText(attendue, { exact: true })
      .evaluate((noeud) => {
        const libelle = document.querySelector('#titre-reference');

        return {
          basDeLaReference: Math.round(noeud.getBoundingClientRect().bottom),
          hauteurDuLibelle:
            libelle === null ? 0 : Math.round(libelle.getBoundingClientRect().height),
          hauteurFenetre: window.innerHeight,
        };
      });

    /* Un libellé introuvable rendrait zéro et détendrait le seuil en silence —
       le contrôle vérifie donc d'abord qu'il a bien mesuré quelque chose. */
    expect(flottaison.hauteurDuLibelle).toBeGreaterThan(0);
    expect(flottaison.basDeLaReference + flottaison.hauteurDuLibelle).toBeLessThanOrEqual(
      flottaison.hauteurFenetre,
    );

    await expect(page.getByText('Votre panier a été vidé.')).toBeVisible();
    await expect(pastillePanier(page)).toHaveText('0');

    return attendue;
  });

  await test.step('le suivi montre la frise arrêtée à « Payée »', async () => {
    await page.getByRole('link', { name: 'Suivre cette commande' }).click();
    await attendrePage(page, '/suivi');

    await expect(page.getByRole('heading', { level: 2, name: `Commande ${reference}` })).toBeVisible();

    const frise = friseDuSuivi(page);
    await expect(frise).toHaveCount(3);
    await expect(frise.nth(0)).toContainText('Payée');
    await expect(frise.nth(0)).not.toContainText('à venir');
    await expect(frise.nth(1)).toContainText('Préparée');
    await expect(frise.nth(1)).toContainText('à venir');
    await expect(frise.nth(2)).toContainText('Expédiée');
    await expect(frise.nth(2)).toContainText('à venir');
  });

  await test.step('le marchand la marque préparée', async () => {
    await ouvrir(page, '/gestion/commandes');

    await page.getByRole('link', { name: reference }).click();
    await attendrePage(page, `/gestion/commandes/${reference}`);

    const etat = page.getByRole('region', { name: 'État' });
    await expect(etat).toContainText('Payée');
    await expect(etat.getByText(TOTAL, { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Marquer préparée' }).click();
    await expect(etat).toContainText('Préparée');

    /* Le journal s'ajoute, il ne se réécrit pas : deux entrées après ce geste. */
    await expect(
      page.locator('section[aria-labelledby="titre-journal"] ol > li'),
    ).toHaveCount(2);
  });

  await test.step('le suivi montre la frise à deux états', async () => {
    await ouvrir(page, `/suivi?reference=${reference}`);

    const frise = friseDuSuivi(page);
    await expect(frise).toHaveCount(3);
    await expect(frise.nth(0)).not.toContainText('à venir');
    await expect(frise.nth(1)).toContainText('Préparée');
    await expect(frise.nth(1)).not.toContainText('à venir');
    await expect(frise.nth(2)).toContainText('Expédiée');
    await expect(frise.nth(2)).toContainText('à venir');
  });
});

/** Les trois étapes du parcours ordinaire, sur la page de suivi. */
function friseDuSuivi(page: Page) {
  return page.locator('section[aria-labelledby="titre-resultat"] ol > li');
}

/* -------------------------------------------------------------------------- */
/* Les deux tests courts                                                       */
/* -------------------------------------------------------------------------- */

/**
 * L'ANNULATION laisse le panier INTACT.
 *
 * C'est la promesse écrite sur l'écran simulé et sur la page de retour. Elle
 * ne va pas de soi : c'est la page de CONFIRMATION qui vide le panier, et la
 * seule façon de s'assurer que l'annulation ne le fait pas est de passer par
 * elle et de recompter.
 */
test('l’annulation du paiement laisse le panier intact', async ({ page }) => {
  await ouvrir(page, `/boutique/${HUILE.slug}`);
  await ajouterAuPanier(page, { sku: HUILE.sku50cl, quantite: 2 });
  await expect(pastillePanier(page)).toHaveText('2');

  await ouvrir(page, '/commande');
  await page.getByLabel('Prénom et nom').fill(CLIENT.nom);
  await page.getByLabel('Adresse de livraison').fill(CLIENT.adresse);
  await page.getByLabel('Code postal').fill(CLIENT.codePostal);
  await page.getByLabel('Courriel').fill(CLIENT.courriel);
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
  await page.getByRole('button', { name: 'Commander avec obligation de paiement' }).click();

  await attendrePage(page, '/paiement/simulation');
  await page.getByRole('link', { name: 'Annuler' }).click();
  await attendrePage(page, '/commande/annulee');
  await expect(pastillePanier(page)).toHaveText('2');

  await ouvrir(page, '/panier');
  await expect(recapitulatif(page).getByText(HUILE.sousTotal, { exact: true })).toBeVisible();
});

/**
 * LE COFFRET « COMPOSEZ LE VÔTRE » : trois pièces exactes, deux lignes.
 *
 * Deux invariants en un test, parce qu'ils tiennent au même mécanisme — la
 * clé de ligne du réducteur, qui inclut la composition triée (`cleLigne`) :
 *
 * - le bouton d'ajout reste INERTE tant que le compte exact n'est pas atteint,
 *   ni en dessous ni au-dessus ;
 * - deux compositions différentes du même format font DEUX LIGNES et non une
 *   ligne de quantité deux. Fusionner reviendrait à expédier deux fois le même
 *   coffret à quelqu'un qui en a composé deux.
 */
const COFFRET = {
  slug: 'coffret-composez-le-votre',
  skuTroisPieces: 'MV-CO-LIB-3P',
  prix: euros('34,00'),
  premiere: ['Huile d’olive de première pression', 'Terrine de campagne', 'Miel de châtaignier'],
  seconde: ['Vinaigre de cidre', 'Rillettes de canard', 'Confiture d’abricots'],
} as const;

test('le coffret composé exige trois pièces et fait deux lignes', async ({ page }) => {
  await ouvrir(page, `/boutique/${COFFRET.slug}`);
  await page.getByLabel('Format', { exact: true }).selectOption(COFFRET.skuTroisPieces);

  const bouton = page.getByRole('button', { name: 'Ajouter au panier' });
  await expect(bouton).toBeDisabled();
  await expect(page.getByText('Choisissez 3 pièces pour composer ce coffret.')).toBeVisible();

  const composition = page.getByRole('group', { name: /Composition/ });

  await test.step('deux pièces ne suffisent pas, quatre non plus', async () => {
    await composition.getByRole('checkbox', { name: new RegExp(echapper(COFFRET.premiere[0])) }).check();
    await composition.getByRole('checkbox', { name: new RegExp(echapper(COFFRET.premiere[1])) }).check();
    await expect(page.getByText('2 pièces sur 3')).toBeVisible();
    await expect(bouton).toBeDisabled();

    await composition.getByRole('checkbox', { name: new RegExp(echapper(COFFRET.premiere[2])) }).check();
    await expect(bouton).toBeEnabled();

    await composition.getByRole('checkbox', { name: new RegExp(echapper(COFFRET.seconde[0])) }).check();
    await expect(page.getByText('décochez-en pour revenir au compte')).toBeVisible();
    await expect(bouton).toBeDisabled();

    await composition.getByRole('checkbox', { name: new RegExp(echapper(COFFRET.seconde[0])) }).uncheck();
    await expect(bouton).toBeEnabled();
  });

  await bouton.click();
  await expect(page.getByText('Ajouté au panier.')).toBeVisible();

  await test.step('une seconde composition fait une seconde ligne', async () => {
    for (const piece of COFFRET.seconde) {
      await composition.getByRole('checkbox', { name: new RegExp(echapper(piece)) }).check();
    }
    await expect(bouton).toBeEnabled();
    await bouton.click();

    await ouvrir(page, '/panier');

    const lignes = lignesDuPanier(page).filter({ hasText: 'Composez le vôtre' });
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toContainText(COFFRET.premiere[2]);
    await expect(lignes.nth(1)).toContainText(COFFRET.seconde[2]);

    /* Deux coffrets à 34,00 € : le sous-total du panier vaut 68,00 €. */
    await expect(recapitulatif(page)).toContainText('Sous-total (2 articles)');
    await expect(recapitulatif(page).getByText(euros('68,00'), { exact: true })).toBeVisible();
  });
});
