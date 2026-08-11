/* L'ACCESSIBILITÉ SUR UN SITE QUI BOUGE (tranche C17).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI UNE PASSE DE PLUS, ALORS QUE LA CAMPAGNE EN FAIT DÉJÀ SEPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/e2e/accessibilite.spec.ts` passe axe-core sur sept pages, deux
 * profils — et les deux profils tournent sous `reducedMotion: 'reduce'`, donc
 * sur un site où AUCUNE révélation n'existe. Elle prouve que le site immobile
 * est accessible ; elle ne peut rien dire du site en mouvement.
 *
 * Or les révélations posent `opacity: 0` sur des blocs qui portent du texte.
 * Un élément à opacité nulle reste dans l'arbre d'accessibilité et reste
 * focalisable : c'est précisément la situation qu'axe-core sait juger — et
 * celle qui, mal faite, produit un lien invisible qu'on peut atteindre au
 * clavier, ou un contraste calculé sur un texte transparent.
 *
 * Cette passe joue donc SANS mouvement réduit, sur l'accueil hydraté, et sur
 * les deux autres routes qui portent des révélations. Elle est faite DEUX FOIS
 * par page : une fois au sommet (des blocs sont encore masqués) et une fois
 * après défilement (tout est révélé). L'état intermédiaire est celui qui
 * n'existe nulle part ailleurs.
 *
 * Emploi :  node preuves/c17/axe-sous-mouvement.mjs
 */
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * `--sortie <fichier>` (ajouté en C18).
 *
 * Sans cette option, cet outil écrasait SON PROPRE RELEVÉ de C17 — c'est-à-dire
 * la pièce versionnée qui prouve ce que C17 avait mesuré. Une tranche qui rejoue
 * l'outil de la précédente doit pouvoir le faire sans détruire ce qu'elle vient
 * comparer.
 */
const sortieChoisie = (defaut) => {
  const rang = process.argv.indexOf('--sortie');

  return rang === -1 ? defaut : process.argv[rang + 1];
};


const PORT = 3994;
const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const PAGES = [
  ['accueil', '/'],
  ['rayon', '/boutique'],
  ['fiche huile d’olive', '/boutique/huile-olive-premiere-pression'],
];

const navigateur = await chromium.launch({ channel: 'chromium' });
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'no-preference',
});
const page = await contexte.newPage();

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

dire('AXE-CORE SOUS MOUVEMENT ACTIF — tranche C17');
dire('Profil : bureau 1280 × 900, prefers-reduced-motion: no-preference.');
dire('Deux relevés par page : au sommet (blocs encore masqués) et après');
dire('défilement complet (tout révélé).');
dire('');

let graves = 0;

for (const [intitule, chemin] of PAGES) {
  await page.goto(`http://localhost:${String(PORT)}${chemin}`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
    undefined,
    { timeout: 10_000 },
  );
  await page.waitForFunction(
    () => document.documentElement.classList.contains('mouvement'),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(() => document.fonts.ready);

  for (const moment of ['au sommet', 'après défilement']) {
    if (moment === 'après défilement') {
      /* On descend par paliers pour que l'observateur ait le temps de révéler,
         puis on remonte : c'est le parcours d'un vrai visiteur, et il laisse la
         page dans l'état où tout a été vu. */
      await page.evaluate(async () => {
        const pas = window.innerHeight * 0.8;

        for (let y = 0; y < document.body.scrollHeight; y += pas) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }

        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
    }

    /*
     * ON NE MESURE QUE DES ÉTATS STABLES, et c'est la leçon de cette passe.
     *
     * Les premières exécutions ont rendu des violations `color-contrast` qui
     * changeaient de page à chaque tour : `#titre-familles` à 1,34, un
     * paragraphe de fiche à 3,89. Les couleurs relevées le disent — #d1cdc3 et
     * #76766e ne sont dans aucun jeton : ce sont l'encre et l'encre douce
     * MÉLANGÉES au fond, c'est-à-dire des blocs saisis EN PLEIN FONDU.
     *
     * Un fondu n'est pas un état du site : c'est le chemin entre deux états.
     * axe-core prend un instantané, et un instantané d'animation ne dit rien
     * de ce que quelqu'un lit. Les deux états qui existent vraiment sont
     * « masqué » (opacité 0, qu'axe ignore comme il ignore tout élément
     * transparent) et « révélé » (opacité 1). On attend donc que chaque bloc
     * soit à l'un ou à l'autre.
     *
     * La note vaut au-delà de cette tranche : toute mesure d'accessibilité, de
     * contraste ou de capture d'écran sur un site animé doit d'abord attendre
     * l'immobilité, sans quoi elle mesure le hasard de l'ordonnanceur.
     */
    /*
     * ÉLARGI EN C18, ET LA LEÇON A DÛ ÊTRE RÉAPPRISE SUR UN AUTRE ORGANE.
     *
     * Le critère ne connaissait que `[data-revelation]`. C18 a donné au texte du
     * héros une entrée à froid — `[data-signature='ligne']`, quatre lignes en
     * cascade sur 1 400 ms — qui n'est pas une révélation et que ce critère ne
     * regardait donc pas. L'outil a rendu une violation « serious » de contraste
     * sur l'accueil, aux couleurs #9a7f4a et #a7a69a : elles ne sont dans AUCUN
     * jeton, ce sont l'ocre et l'encre douce MÉLANGÉES au fond. Exactement le
     * faux positif que ce bloc de commentaire décrit trois paragraphes plus
     * haut, sur un organe que sa liste ne couvrait pas.
     *
     * Un critère d'immobilité qui nomme des sélecteurs vieillit à chaque geste
     * ajouté. Celui-ci les nomme quand même — un critère générique (« aucune
     * animation en cours ») attendrait aussi le bandeau des familles, dont la
     * chronologie est le DÉFILEMENT et qui n'a donc pas de fin. Le prix est une
     * ligne à tenir à jour ; il est écrit ici pour que la prochaine tranche
     * sache qu'elle doit la relire.
     *
     * ET ELLE A VIEILLI, EXACTEMENT COMME ANNONCÉ (C19). Le retour client du
     * 10/08 a remplacé le bloc qui balayait par une MONTÉE MASQUÉE : l'opacité
     * a changé d'élément. Elle vivait sur l'enveloppe `[data-signature="ligne"]`
     * — celle que cette ligne interroge —, elle vit désormais sur le texte
     * intérieur, `[data-signature="texte"]`. Le critère serait donc redevenu
     * vert instantanément, sur une page en plein fondu : la panne que ce bloc
     * décrit, ressuscitée par un correctif visuel. Le sélecteur suit.
     *
     * ON ATTEND EN PLUS LA FIN DE LA MONTÉE, et pas seulement celle du fondu :
     * la course dure 1 400 ms quand le fondu en dure 140, et un texte qui glisse
     * encore décale ce qu'axe mesure. `transform: none` est l'état d'arrivée
     * écrit dans les images-clés — c'est donc l'immobilité, pas une valeur
     * choisie.
     */
    await page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll('[data-revelation], [data-signature="texte"]'),
        ].every((element) => {
          const style = getComputedStyle(element);
          const valeur = Number(style.opacity);

          return (
            (valeur === 0 || valeur === 1) &&
            (!element.matches('[data-signature="texte"]') || style.transform === 'none')
          );
        }),
      undefined,
      { timeout: 10_000 },
    );

    const masques = await page.evaluate(
      () => document.querySelectorAll('[data-revelation]:not([data-revele])').length,
    );

    const resultat = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const bloquantes = resultat.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    graves += bloquantes.length;

    dire(
      `${intitule.padEnd(22)} ${moment.padEnd(18)} ` +
        `${String(masques).padStart(2)} bloc(s) encore masqué(s) — ` +
        `${String(bloquantes.length)} violation(s) serious/critical, ` +
        `${String(resultat.violations.length)} au total`,
    );

    for (const violation of bloquantes) {
      dire(`   ✗ ${violation.id} (${String(violation.impact)}) — ${violation.help}`);

      for (const noeud of violation.nodes) {
        dire(`      cible : ${noeud.target.join(' ')}`);
        dire(`      ${String(noeud.failureSummary ?? '').replace(/\n/g, ' / ')}`);
      }
    }
  }
}

dire('');
dire(
  graves === 0
    ? 'VERDICT : 0 serious, 0 critical. Les révélations ne créent aucune violation.'
    : `VERDICT : ÉCHEC — ${String(graves)} violation(s) bloquante(s).`,
);

writeFileSync(sortieChoisie('preuves/c17/axe-sous-mouvement.txt'), `${lignes.join('\n')}\n`, 'utf8');

await navigateur.close();
serveur.kill();

process.exitCode = graves === 0 ? 0 : 1;
