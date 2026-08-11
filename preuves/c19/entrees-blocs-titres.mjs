#!/usr/bin/env node
/**
 * L'ENTRÉE DES BLOCS-TITRES, PROUVÉE SUR PIÈCES (retour client n° 18, C19-ter).
 *
 * ---------------------------------------------------------------------------
 * Ce que cet outil vérifie, et pourquoi chacun des quatre points
 * ---------------------------------------------------------------------------
 *
 * 1. ELLE JOUE, ET ELLE JOUE À FROID. L'échantillonneur est posé AVANT le
 *    premier script de la page (`addInitScript`) : la séquence part au premier
 *    calcul de style, c'est-à-dire avant tout ce qu'un contrôle pourrait faire
 *    après `goto`. Une lecture après coup ne verrait que l'état final et
 *    conclurait, à tort, qu'il ne s'est rien passé — le contrôle serait vert sur
 *    un site parfaitement immobile. C'est la leçon de C19 sur le héros,
 *    appliquée aux vingt et une autres pages.
 *
 * 2. RIEN N'EST MASQUÉ DE FAÇON PERSISTANTE. À la fin de la course, chaque
 *    texte doit valoir opacité 1 et `transform: none`. `animation-fill-mode:
 *    backwards` n'applique l'état de départ que PENDANT le retard ; si un jour
 *    quelqu'un écrivait `both` ou `forwards`, le texte resterait tenu par
 *    l'animation et la dégradation cesserait d'être « pas d'animation ».
 *
 * 3. LES RANGS SONT CEUX QU'ON CROIT. Les retards sont LUS DANS LE MOTEUR
 *    (`getComputedTiming().delay`) et non devinés aux images : c'est le seul
 *    relevé de l'étagement qui ne dépende pas de la cadence d'échantillonnage.
 *
 * 4. SOUS `reduce`, TOUT EST VISIBLE ET IMMOBILE. Pas « l'animation est
 *    rapide » : AUCUNE animation n'existe, et l'opacité vaut 1 dès la première
 *    image. La règle vit sous `@media (prefers-reduced-motion: no-preference)`,
 *    donc elle ne s'écrit tout simplement pas — et c'est ce qu'on mesure.
 *
 * Usage : node preuves/c19/entrees-blocs-titres.mjs [--base http://…]
 */
import { chromium } from 'playwright';

const arguments_ = process.argv.slice(2);
const lire = (nom, defaut) => {
  const rang = arguments_.indexOf(nom);

  return rang === -1 ? defaut : (arguments_[rang + 1] ?? defaut);
};

const BASE = lire('--base', 'http://localhost:3000');

/**
 * Les pages regardées, et ce qu'on attend du TITRE sur chacune.
 *
 * `titreAnime` n'est pas une préférence : c'est la conséquence d'une mesure.
 * Le plus grand affichage de contenu attend la FIN de l'animation qui le porte
 * (relevé au rapport, +1 s sur les pages où le titre est mesuré). Le titre entre
 * donc là où une IMAGE porte la mesure, et reste en place là où c'est lui — la
 * règle et son tableau sont dans `globals.css`. Ce contrôle vérifie que les deux
 * familles sont bien celles qu'on croit ; sans lui, la règle se perdrait au
 * premier héros ajouté ou retiré.
 */
const PAGES = [
  ['/boutique', 'le rayon', true],
  ['/livraison', 'une page de confiance', true],
  ['/boutique/huile-olive-premiere-pression', 'une fiche produit', true],
  ['/gestion', 'un écran marchand', false],
  ['/conditions-generales-de-vente', 'un document légal', false],
  ['/panier', 'le tunnel', true],
];

const SONDE = () => {
  const fenetre = window;

  fenetre.serieEntree = [];
  fenetre.retardsEntree = null;

  const translation = (matrice) => {
    if (matrice === 'none') return 0;
    const nombres = matrice.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);

    return nombres === null || nombres.length < 6 ? 0 : Number(nombres[5]);
  };

  const echantillonner = () => {
    const lignes = [...document.querySelectorAll('[data-signature="ligne"]')];

    if (lignes.length > 0) {
      if (fenetre.retardsEntree === null) {
        /* Les retards sont lus dans le MOTEUR et non devinés aux images. Une
           ligne sans animation rend `null` : c'est le cas du titre sur les pages
           où il porte la mesure, et le relevé doit le montrer plutôt que de
           renoncer. */
        const lus = lignes.map((noeud) => {
          const texte = noeud.querySelector('[data-signature="texte"]');
          if (texte === null) return null;
          const animations = texte.getAnimations();
          if (animations.length === 0) return null;

          return Math.max(
            ...animations.map((a) => Number(a.effect?.getComputedTiming().delay ?? 0)),
          );
        });

        if (lus.some((valeur) => valeur !== null)) {
          fenetre.retardsEntree = lus;
        }
      }

      fenetre.serieEntree.push({
        instant: Math.round(performance.now()),
        opacites: lignes.map((noeud) => {
          const texte = noeud.querySelector('[data-signature="texte"]');

          return texte === null ? -1 : Number(getComputedStyle(texte).opacity);
        }),
        montees: lignes.map((noeud) => {
          const texte = noeud.querySelector('[data-signature="texte"]');

          return texte === null ? 0 : Math.round(translation(getComputedStyle(texte).transform));
        }),
      });
    }

    if (performance.now() < 2600) requestAnimationFrame(echantillonner);
  };

  requestAnimationFrame(echantillonner);
};

const navigateur = await chromium.launch();
const rapport = [];

for (const [chemin, role, titreAnime] of PAGES) {
  /* ------------------------------------------------- LE RÉGIME QUI BOUGE */
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  await page.addInitScript(SONDE);
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);

  const releve = await page.evaluate(() => {
    const lignes = [...document.querySelectorAll('[data-signature="ligne"]')];

    return {
      lignes: lignes.length,
      retards: window.retardsEntree,
      serie: window.serieEntree,
      /* Le titre porte-t-il une animation ? La question a une réponse dans le
         moteur, pas dans la feuille : `animation-name: none` retire l'animation
         de la liste de l'élément. */
      titreAnime: (() => {
        const texte = document.querySelector('h1[data-signature="ligne"] [data-signature="texte"]');

        return texte === null ? null : getComputedStyle(texte).animationName !== 'none';
      })(),
      final: lignes.map((noeud) => {
        const texte = noeud.querySelector('[data-signature="texte"]');
        if (texte === null) return null;
        const style = getComputedStyle(texte);

        return { opacite: Number(style.opacity), transformation: style.transform };
      }),
      /* Aucun pseudo-élément coloré ne doit se poser sur le bloc — la leçon des
         « grands rectangles noirs » de C19, contrôlée ailleurs qu'à l'accueil. */
      pseudos: lignes.filter((noeud) => {
        const avant = getComputedStyle(noeud, '::before').content;
        const apres = getComputedStyle(noeud, '::after').content;

        return avant !== 'none' || apres !== 'none';
      }).length,
    };
  });

  await contexte.close();

  /* ------------------------------------------------ LE RÉGIME IMMOBILE */
  const contexteFige = await navigateur.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const pageFigee = await contexteFige.newPage();

  await pageFigee.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await pageFigee.waitForTimeout(400);

  const fige = await pageFigee.evaluate(() =>
    [...document.querySelectorAll('[data-signature="texte"]')].map((noeud) => ({
      opacite: Number(getComputedStyle(noeud).opacity),
      transformation: getComputedStyle(noeud).transform,
      animations: noeud.getAnimations().length,
    })),
  );

  await contexteFige.close();

  /* --------------------------------------------------------- LE VERDICT */
  const depart = releve.serie[0] ?? { opacites: [], montees: [] };
  const arrivee = releve.final;

  const titreConforme = releve.titreAnime === titreAnime;
  const monteesInitiales = depart.montees.filter((valeur) => valeur > 0).length;
  const toutesArrivees = arrivee.every(
    (etat) => etat !== null && etat.opacite === 1 && etat.transformation === 'none',
  );
  const toutFigeVisible = fige.every(
    (etat) => etat.opacite === 1 && etat.transformation === 'none' && etat.animations === 0,
  );

  rapport.push({
    chemin,
    role,
    lignes: releve.lignes,
    retardsMs: releve.retards,
    pseudosColores: releve.pseudos,
    premiereImage: { opacites: depart.opacites, montees: depart.montees },
    lignesQuiMontent: monteesInitiales,
    aucunEtatPersistant: toutesArrivees,
    sousReduce: { lignes: fige.length, toutVisibleImmobile: toutFigeVisible },
    titreAnime: releve.titreAnime,
    titreConforme,
  });

  const marque = (valeur) => (valeur ? 'OK  ' : 'ÉCHEC');

  console.log(`\n── ${chemin}  (${role})`);
  console.log(`   lignes d’entrée ............. ${String(releve.lignes)}`);
  console.log(`   retards lus dans le moteur .. ${JSON.stringify(releve.retards)} ms`);
  console.log(`   montées à la 1re image ...... ${JSON.stringify(depart.montees)} px`);
  console.log(`   opacités à la 1re image ..... ${JSON.stringify(depart.opacites)}`);
  console.log(`   ${marque(releve.pseudos === 0)} aucun pseudo-élément coloré`);
  console.log(`   ${marque(toutesArrivees)} rien de persistant : tout à 1 / none à l’arrivée`);
  console.log(
    `   ${marque(titreConforme)} le titre ${releve.titreAnime === true ? 'ENTRE' : 'reste en place'} ` +
      `— attendu ${titreAnime ? 'qu’il entre (une image porte la mesure)' : 'qu’il reste (il EST la mesure)'}`,
  );
  console.log(`   ${marque(toutFigeVisible)} sous reduce : ${String(fige.length)} lignes visibles et immobiles`);
}

await navigateur.close();

const echecs = rapport.filter(
  (ligne) =>
    ligne.lignes === 0 ||
    ligne.pseudosColores > 0 ||
    !ligne.aucunEtatPersistant ||
    !ligne.titreConforme ||
    !ligne.sousReduce.toutVisibleImmobile,
);

console.log(`\n${'-'.repeat(74)}`);
console.log(
  echecs.length === 0
    ? `${String(rapport.length)} pages contrôlées, aucune anomalie.`
    : `${String(echecs.length)} page(s) en anomalie : ${echecs.map((l) => l.chemin).join(', ')}`,
);

process.exitCode = echecs.length === 0 ? 0 : 1;
