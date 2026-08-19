import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ouvrir } from './aides';

/**
 * L'ACCESSIBILITÉ, MESURÉE PAR UN OUTIL PUBLIC.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi axe-core en plus des 100 de Lighthouse
 * ---------------------------------------------------------------------------
 *
 * Lighthouse annonce déjà 100 en accessibilité sur toutes les pages mesurées.
 * Ce n'est pas la même mesure, et la différence vaut d'être dite : la note de
 * Lighthouse est une MOYENNE PONDÉRÉE d'un sous-ensemble d'audits, tandis
 * qu'axe-core rend la LISTE des violations, classées par gravité, sur un jeu
 * de règles plus large. Une page peut afficher 100 et porter deux violations
 * mineures ; l'inverse n'existe pas.
 *
 * Surtout, Lighthouse mesure le HTML SERVI. Cette campagne-ci mesure la page
 * HYDRATÉE, après que les îlots ont lu le stockage et remplacé leurs places
 * réservées — c'est-à-dire l'écran que le visiteur a réellement sous les yeux,
 * avec son tableau de commandes et son formulaire de suivi.
 *
 * ---------------------------------------------------------------------------
 * LE SEUIL : zéro « serious », zéro « critical ». Les mineures sont PUBLIÉES
 * ---------------------------------------------------------------------------
 *
 * Faire échouer la campagne sur la moindre violation « minor » aurait un
 * défaut connu : la première qui arrive se règle en la désactivant, et la
 * garde meurt. Faire échouer sur « serious » et « critical » — les deux
 * gravités qui empêchent réellement quelqu'un d'utiliser la page — et
 * IMPRIMER les autres dans le rapport donne le bon compromis : rien n'est
 * caché, et ce qui bloque bloque.
 *
 * Les violations mineures sont donc listées dans la sortie de la campagne et
 * attachées au rapport HTML. Une liste qui s'allonge se voit.
 */

/** Les gravités qui arrêtent la campagne. Les deux autres sont publiées. */
const GRAVITES_BLOQUANTES = new Set(['serious', 'critical']);

/**
 * SEPT PAGES, choisies pour ce qu'elles portent de différent.
 *
 * L'accueil (la mise en page commune), le rayon (une grille de liens et une
 * navigation par ancres), une fiche (deux tableaux et un formulaire d'ajout),
 * le panier (des boutons radio, des champs numériques, une région vivante),
 * l'espace marchand (un tableau trié et un filtre) et la rétractation (le
 * document le plus long du site, avec son sommaire, son tableau de quinze
 * lignes et son formulaire type). Ajouter les quatorze autres fiches ne
 * mesurerait rien de plus : elles partagent le même gabarit.
 *
 * La SEPTIÈME, `/donnees-personnelles`, a été ajoutée en cours de tranche et
 * pas au hasard : c'est là que la première campagne a trouvé deux des trois
 * violations « serious » du site (`scrollable-region-focusable`, profil mobile
 * seulement). Une page où l'on vient de corriger un défaut et qui resterait
 * hors mesure est une page où le défaut peut revenir sans bruit.
 */
const PAGES = [
  { chemin: '/', intitule: 'accueil' },
  { chemin: '/boutique', intitule: 'rayon' },
  {
    chemin: '/boutique/huile-olive-premiere-pression',
    intitule: 'fiche produit',
  },
  { chemin: '/panier', intitule: 'panier' },
  { chemin: '/gestion/commandes', intitule: 'espace marchand — commandes' },
  { chemin: '/retractation', intitule: 'droit de rétractation' },
  { chemin: '/donnees-personnelles', intitule: 'données personnelles' },
] as const;

for (const { chemin, intitule } of PAGES) {
  test(`${intitule} (${chemin}) — aucune violation grave d’accessibilité`, async ({
    page,
  }, informations) => {
    await ouvrir(page, chemin);

    const resultats = await new AxeBuilder({ page }).analyze();

    const bloquantes = resultats.violations.filter(
      (violation) => violation.impact !== null && GRAVITES_BLOQUANTES.has(violation.impact ?? ''),
    );
    const mineures = resultats.violations.filter(
      (violation) => !GRAVITES_BLOQUANTES.has(violation.impact ?? ''),
    );

    if (mineures.length > 0) {
      const rapport = mineures
        .map(
          (violation) =>
            `[${violation.impact ?? 'sans gravité'}] ${violation.id} — ${violation.help} ` +
            `(${String(violation.nodes.length)} élément(s))\n    ${violation.helpUrl}`,
        )
        .join('\n');

      console.log(`\n  ${chemin} — ${String(mineures.length)} violation(s) mineure(s) :`);
      console.log(`  ${rapport.split('\n').join('\n  ')}\n`);

      await informations.attach(`violations-mineures${chemin.replaceAll('/', '_')}.txt`, {
        body: rapport,
        contentType: 'text/plain',
      });
    }

    expect(
      bloquantes.map((violation) => `${violation.impact ?? '?'} : ${violation.id}`),
    ).toEqual([]);
  });

  /**
   * L'UNICITÉ DES IDENTIFIANTS, QU'AXE NE CONTRÔLE PLUS.
   *
   * `duplicate-id` et `duplicate-id-active` ont été dépréciées dans axe-core
   * 4.10, `duplicate-id-aria` retirée ensuite : la campagne ci-dessus balaye
   * cette page depuis C8 et n'aurait rien dit. Constaté sur le site publié le
   * 19/08 — le bloc de réassurance de C25, posé une seconde fois sur la fiche
   * produit, y rendait deux `<section aria-labelledby>` liées au même
   * identifiant, seul doublon du document.
   *
   * Un identifiant dupliqué n'est pas une question de goût : `aria-labelledby`,
   * `aria-describedby`, `<label for>` et les ancres résolvent tous vers le
   * PREMIER élément trouvé. Le jour où deux titres homonymes cessent de porter
   * le même texte, le nom annoncé devient faux sans qu'aucune ligne n'ait
   * changé à l'endroit qu'on lit.
   *
   * Le contrôle porte sur le document ENTIER — un doublon né dans la coquille
   * serait tout aussi faux — et il ne nomme aucun identifiant : il compte.
   */
  test(`${intitule} (${chemin}) — aucun identifiant dupliqué`, async ({ page }) => {
    await ouvrir(page, chemin);

    const doublons = await page.evaluate(() => {
      const vus = new Map<string, number>();
      for (const element of document.querySelectorAll('[id]')) {
        vus.set(element.id, (vus.get(element.id) ?? 0) + 1);
      }
      return [...vus.entries()]
        .filter(([, combien]) => combien > 1)
        .map(([identifiant, combien]) => `${identifiant} (${String(combien)} fois)`);
    });

    expect(doublons).toEqual([]);
  });
}
