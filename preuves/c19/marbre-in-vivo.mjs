/* LE MARBRE, VU DE L'ÉCRAN — captures et contraste AU PIXEL (C19).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CET OUTIL MESURE, ET POURQUOI AUCUN AUTRE NE LE PEUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fond de la page est une IMAGE. Aucun outil du harnais ne sait lire le
 * pixel qui se trouve derrière une ligne de texte :
 *
 * - `axe-core` remonte la cascade jusqu'à un `background-color` opaque. Il
 *   trouvera `--color-coquille` et rendra le même verdict avec ou sans marbre.
 *   Son « 0 violation » reste vrai pour ce qu'il mesure — et ne dit rien.
 * - Lighthouse ne mesure pas le contraste au pixel non plus.
 * - `grain-contraste.mjs` (première écriture de C19) relevait le pire pixel
 *   dans des BANDES DE FOND SANS TEXTE. C'était juste pour un grain uniforme ;
 *   ça ne l'est plus pour un marbre, dont les veines passent quelque part et
 *   pas ailleurs. Le pire fond de la page n'est pas le pire fond SOUS UN MOT.
 *
 * D'où la méthode d'ici, en trois temps :
 *
 *   1. RECENSER. On parcourt tous les éléments qui portent du texte, on résout
 *      leur taille et leur graisse EFFECTIVES, et on remonte leurs ancêtres
 *      jusqu'au corps de page pour savoir s'ils reposent sur un PANNEAU (un
 *      ancêtre qui peint quelque chose) ou directement sur le marbre.
 *   2. EFFACER L'ENCRE. On passe toute la page en `color: transparent`, ce qui
 *      laisse EXACTEMENT les fonds en place. La capture qui suit montre donc
 *      ce qu'il y a DERRIÈRE chaque mot.
 *   3. RELEVER LE PIRE. Pour chaque bloc de texte, on cherche le pixel le plus
 *      sombre de sa boîte dans cette capture, et on recalcule le ratio contre
 *      la couleur d'encre réelle de l'élément.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DEUX PIÈGES PAYÉS À L'ÉCRITURE, ET LES DEUX FAUSSAIENT LE VERDICT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (a) `fullPage: true` NE PHOTOGRAPHIE PAS LA PAGE QU'ON A MESURÉE. Playwright
 *     agrandit la fenêtre à la hauteur du document ; toute règle qui dépend de
 *     la hauteur de fenêtre — ici `min-h-screen` sur la mise en page — remet
 *     donc la page en page, et les boîtes relevées AVANT ne désignent plus les
 *     mêmes pixels. Premier symptôme : une bande de fond nu de cinq cents
 *     pixels sous le pied, qui n'existe sur AUCUNE capture de fenêtre. Second
 *     symptôme, plus vicieux : un ratio de 1,00 relevé sous une étiquette,
 *     c'est-à-dire une encre sur elle-même — la boîte était tombée ailleurs.
 *     On photographie donc la FENÊTRE, en descendant la page par paliers, et
 *     on ne mesure un bloc que là où il tient tout entier dans la fenêtre.
 *
 * (b) LA BORDURE N'EST PAS LE FOND. Le pixel le plus sombre de la boîte d'une
 *     étiquette encadrée est son FILET, qui n'est jamais derrière une lettre.
 *     La zone échantillonnée est donc rentrée des épaisseurs de bordure, plus
 *     un pixel de garde pour l'anticrénelage.
 *
 * Les deux seuils de WCAG 1.4.3 sont appliqués à la lettre : 3,00 pour le
 * GRAND texte (≥ 24 px, ou ≥ 18,66 px en graisse ≥ 700), 4,50 pour tout le
 * reste. La graisse 600 des titres didone n'est PAS « bold » au sens de la
 * norme : un titre de 20 px en 600 est du petit texte, et il est compté comme
 * tel — c'est la lecture stricte, et c'est celle qu'on veut se voir opposer.
 *
 * Emploi :  node preuves/c19/marbre-in-vivo.mjs [--sortie <fichier.txt>]
 */
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE = process.env['BASE'] ?? 'http://127.0.0.1:3000';

const argument = (nom, defaut) => {
  const rang = process.argv.indexOf(nom);
  return rang === -1 ? defaut : (process.argv[rang + 1] ?? defaut);
};

const sortie = argument('--sortie', 'preuves/c19/marbre-in-vivo.txt');
const lignes = [];
const dire = (texte) => {
  console.log(texte);
  lignes.push(texte);
};

const canal = (valeur) => {
  const v = valeur / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, v, b]) => 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
const ratio = (a, b) => {
  const [clair, sombre] = luminance(a) >= luminance(b) ? [a, b] : [b, a];
  return (luminance(clair) + 0.05) / (luminance(sombre) + 0.05);
};
const luma = ([r, v, b]) => 0.2126 * r + 0.7152 * v + 0.0722 * b;
const hex = (p) => `#${p.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * LES PAGES DU RECENSEMENT. Les deux premières portent les CAPTURES (ce sont
 * celles que le client regarde) ; les suivantes ne sont là que pour le
 * recensement — mais elles y sont, parce qu'une règle de fond qui ne serait
 * tenue que sur les deux pages photographiées n'est pas une règle.
 *
 * Le tunnel est visité PANIER VIDE : c'est l'état où le plus de prose est
 * rendue (les places réservées et leurs explications), donc le pire cas pour
 * ce contrôle-ci.
 */
const PAGES = [
  { nom: 'accueil', chemin: '/', capture: true },
  { nom: 'fiche', chemin: '/boutique/huile-olive-premiere-pression', capture: true },
  { nom: 'rayon', chemin: '/boutique' },
  { nom: 'panier', chemin: '/panier' },
  { nom: 'commande', chemin: '/commande' },
  { nom: 'retractation', chemin: '/retractation' },
  { nom: 'cgv', chemin: '/conditions-generales-de-vente' },
  { nom: 'donnees', chemin: '/donnees-personnelles' },
  { nom: 'mentions', chemin: '/mentions-legales' },
  { nom: 'a-propos', chemin: '/a-propos-de-cette-demonstration' },
  { nom: 'livraison', chemin: '/livraison' },
  { nom: 'suivi', chemin: '/suivi' },
  { nom: 'gestion', chemin: '/gestion' },
  { nom: 'gestion-catalogue', chemin: '/gestion/catalogue' },
  { nom: 'gestion-commandes', chemin: '/gestion/commandes' },
  { nom: 'gestion-courriels', chemin: '/gestion/modeles-de-courriels' },
  { nom: 'gestion-prise-en-main', chemin: '/gestion/prise-en-main' },
  { nom: 'introuvable', chemin: '/cette-page-nexiste-pas' },
];

/**
 * LE RECENSEMENT, joué DANS la page. Il rend, pour chaque bloc de texte, sa
 * boîte, son encre, sa taille effective, sa graisse, et le verdict « panneau ou
 * marbre ». Un élément n'est retenu que s'il porte du texte EN PROPRE — sans
 * quoi chaque enveloppe compterait le texte de ses enfants une fois de plus.
 */
const RECENSEMENT = () => {
  const enRvb = (couleur) => {
    const m = /rgba?\(([^)]+)\)/.exec(couleur);
    if (!m) return null;
    const parties = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { rvb: parties.slice(0, 3), alpha: parties.length > 3 ? parties[3] : 1 };
  };

  /** Un ancêtre PEINT-il quelque chose ? Un panneau, un aplat, une image. */
  const peint = (element) => {
    const style = getComputedStyle(element);
    if (style.backgroundImage !== 'none') return true;
    const fond = enRvb(style.backgroundColor);
    return fond !== null && fond.alpha > 0.05;
  };

  const resultats = [];
  let rang = 0;
  for (const element of document.body.querySelectorAll('*')) {
    if (element.closest('[data-chrome-pied]')) continue; /* le pied est sur l'encre */
    const propre = [...element.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    if (propre.length < 2) continue;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    if (Number(style.opacity) < 0.5) continue;
    const boite = element.getBoundingClientRect();
    if (boite.width < 4 || boite.height < 4) continue;

    /* TROIS ÉTATS, ET IL FAUT LES TROIS.
       · `surPanneau` : un ancêtre PEINT quelque chose — le bloc n'est pas sur
         le marbre, il n'y a rien à mesurer.
       · `declare` : personne ne peint, mais un `data-sur-marbre` est en chemin.
         Le bloc EST sur la matière, donc il se mesure — mais un humain a
         tranché qu'il y reste, et le motif est écrit à l'endroit de l'attribut.
         L'attribut s'hérite, sans quoi il faudrait le poser sur chaque lien
         d'un fil d'Ariane.
       · ni l'un ni l'autre : le bloc est sur le marbre sans que personne l'ait
         voulu. Si c'est de la prose, c'est un panneau qui manque. */
    let surPanneau = false;
    let declare = false;
    for (let a = element; a && a !== document.body; a = a.parentElement) {
      if (a.hasAttribute('data-sur-marbre')) {
        declare = true;
        break;
      }
      if (peint(a)) {
        surPanneau = true;
        break;
      }
    }

    const encre = enRvb(style.color);
    if (!encre) continue;
    const taille = Number.parseFloat(style.fontSize);
    const graisse = Number(style.fontWeight) || 400;

    /* Le repère qui survivra aux défilements : on ne retrouvera plus ce bloc
       par ses coordonnées, mais par son nom. */
    rang += 1;
    element.setAttribute('data-sonde-marbre', String(rang));

    /* Une ÉTIQUETTE est du registre, pas de la prose : capitales de chasse
       fixe, très interlettrées, jamais en paragraphe. Le client les a
       explicitement laissées vivre sur le marbre, avec les grands titres. */
    const etiquette =
      (element.getAttribute('class') ?? '').split(/\s+/).includes('etiquette') ||
      style.textTransform === 'uppercase';

    resultats.push({
      sonde: rang,
      texte: propre.slice(0, 46),
      balise: element.tagName.toLowerCase(),
      classe: (element.getAttribute('class') ?? '').slice(0, 40),
      encre: encre.rvb,
      taille,
      graisse,
      grand: taille >= 24 || (taille >= 18.66 && graisse >= 700),
      etiquette,
      surPanneau,
      declare,
      bordures: [
        Number.parseFloat(style.borderTopWidth) || 0,
        Number.parseFloat(style.borderRightWidth) || 0,
        Number.parseFloat(style.borderBottomWidth) || 0,
        Number.parseFloat(style.borderLeftWidth) || 0,
      ],
    });
  }
  return resultats;
};

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await contexte.newPage();

dire('LE MARBRE, VU DE L’ÉCRAN — captures et contraste AU PIXEL');
dire('='.repeat(78));
dire(`  base : ${BASE}   fenêtre 1440 × 900, densité 1, mouvement réduit`);

/* ═══════════════════════════════════════════════════════════════════════════
   LA VEINE LA PLUS SOMBRE DE LA TUILE — le fond que le pire hasard peut poser
   ═══════════════════════════════════════════════════════════════════════════

   MESURER LE PIXEL QUI SE TROUVE SOUS UN MOT NE SUFFIT PAS, et c'est la leçon
   de cette passe. Le marbre est une image de fond : elle se cale sur la LARGEUR
   du document, donc une fenêtre plus étroite, un paragraphe d'une ligne de plus,
   une police de repli — n'importe lequel de ces trois — déplace la veine qui
   passe sous une étiquette. Un relevé « 4,76 sous ce mot-là » est donc vrai le
   jour où on le prend et ne promet rien pour le lendemain.

   CE QUI SE PROMET, C'EST LE PIRE FOND QUE LA TUILE PUISSE PRODUIRE. On le
   calcule ici sur les octets livrés, en appliquant le voile de la feuille — la
   valeur de `--marbre-opacite` étant LUE DANS LA PAGE, jamais recopiée. Tout
   petit texte posé sur la matière est alors confronté à ce fond-là : s'il tient
   4,50 contre lui, il tient partout, quel que soit le hasard de la mise en page.
   C'est cette mesure, et non la locale, qui autorise le client à bouger le
   curseur du fond sans qu'on recommence tout. */
await page.goto(`${BASE}/`, { waitUntil: 'load' });
const opaciteFeuille = Number(
  await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--marbre-opacite'),
  ),
);
const COQUILLE = [0xf2, 0xec, 0xe1];
const tuile = await sharp('public/fond/marbre-coquille.avif')
  .raw()
  .toBuffer({ resolveWithObject: true });
let veinePire = null;
{
  const c = tuile.info.channels;
  for (let i = 0; i < tuile.info.width * tuile.info.height; i += 1) {
    const vu = [0, 1, 2].map(
      (k) => (1 - opaciteFeuille) * COQUILLE[k] + opaciteFeuille * tuile.data[i * c + k],
    );
    if (veinePire === null || luma(vu) < luma(veinePire)) veinePire = vu;
  }
}
dire(
  `  voile lu dans la page : --marbre-opacite ${opaciteFeuille.toFixed(2)} — ` +
    `veine la plus sombre que la tuile puisse poser : ${hex(veinePire)}`,
);

let pireGrand = null;
let pireVraimentGrand = null;
let petitsSurMarbre = 0;
const coupablesPetits = [];
/* Le recensement de la passe « marbre franc » : TOUT bloc non-grand posé sur la
   matière, qu'il soit toléré ou non. C'est la liste dont la mission dépend —
   tant qu'elle contient une encre autre que celles qui tiennent contre
   `veinePire`, le curseur du fond n'est pas libre. */
const petitsTolerés = [];

/* `--pages accueil,rayon` restreint le recensement — pour itérer sur une page
   sans repayer les dix-huit autres. Sans l'option, tout le site passe. */
const filtre = argument('--pages', '');
const aVisiter =
  filtre === '' ? PAGES : PAGES.filter((p) => filtre.split(',').includes(p.nom));

for (const cible of aVisiter) {
  await page.goto(`${BASE}${cible.chemin}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset['hydratation'] === 'prete');
  await page.evaluate(() => document.fonts.ready);
  /* La tuile de fond doit être PEINTE avant qu'on la mesure : on la recharge
     dans une image témoin, ce qui ne coûte rien (elle est en cache) et rend la
     main quand le décodage est fait. */
  await page.evaluate(async () => {
    const image = new Image();
    image.src = '/fond/marbre-coquille.avif';
    await image.decode().catch(() => undefined);
  });
  await page.waitForTimeout(300);

  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  const recense = await page.evaluate(RECENSEMENT);

  /* LES CAPTURES DE L'ŒIL — la page telle qu'elle est, à 100 %, en haut puis
     à mi-page. Elles sont ÉCRITES EN AVIF et non en PNG, et c'est ce qui les
     rend versionnables : le `.gitignore` tient les images de recette dehors
     depuis C9 pour une raison qui est le POIDS, et deux PNG de 1440 × 900
     pèsent 1,2 Mo à eux seuls. En AVIF de haute qualité, la même preuve tient
     en quelques dizaines de kilooctets. Le motif de la règle est respecté, et
     la pièce du verdict entre au dépôt : ce retour a échoué trois fois, et
     « le fond se voit » n'est pas une affirmation qui se croit sur parole.

     La capture de mi-page est prise en FENÊTRE, après défilement, jamais en
     `fullPage` — voir le piège (a) en tête de fichier. */
  const capturer = async (zone, position) => {
    await page.evaluate((v) => window.scrollTo(0, v), position);
    await page.waitForTimeout(250);
    const png = await page.screenshot();
    await sharp(png)
      .avif({ quality: 78, effort: 6, chromaSubsampling: '4:4:4' })
      .toFile(`preuves/c19/marbre-${cible.nom}-${zone}.avif`);
  };
  if (cible.capture === true) {
    await capturer('haut', 0);
    await capturer('milieu', Math.min(1500, Math.max(0, hauteur - 900)));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
  }

  dire('');
  dire(`  ── ${cible.nom.toUpperCase()} (${cible.chemin})`);
  dire(`     ${String(recense.length)} blocs de texte recensés, page de ${String(hauteur)} px`);
  const direManquants = () => {
    if (manquants > 0) {
      dire(
        `     ${String(manquants)} bloc(s) plus haut(s) que la bande mesurable : non mesurés, et dits.`,
      );
    }
  };

  /* L'ENCRE S'EFFACE — les fonds restent exactement où ils sont. */
  await page.addStyleTag({
    content:
      '*, *::before, *::after { color: transparent !important; ' +
      'text-decoration-color: transparent !important; caret-color: transparent !important; }',
  });
  await page.waitForTimeout(150);

  const aMesurer = new Map(recense.filter((b) => !b.surPanneau).map((b) => [b.sonde, b]));
  const mesures = new Map();
  const PAS = 500;

  for (let position = 0; position <= Math.max(0, hauteur - 900) + PAS; position += PAS) {
    if (mesures.size === aMesurer.size) break;
    await page.evaluate((v) => window.scrollTo(0, v), position);
    await page.waitForTimeout(350);

    /* Les boîtes sont relues À CE PALIER, en coordonnées de FENÊTRE : elles
       désignent donc les pixels de la capture qui suit, sans conversion. */
    const boites = ({ connus, defilement }) => {
      const dedans = [];
      for (const sonde of connus) {
        const element = document.querySelector(`[data-sonde-marbre="${sonde}"]`);
        if (!element) continue;
        const r = element.getBoundingClientRect();
        /*
         * LA BANDE MESURABLE COMMENCE SOUS LA COQUILLE COLLANTE, et ce n'est
         * pas une marge de confort : c'est une correction de faute.
         *
         * L'en-tête se scelle (C13) et la barre des familles du rayon colle
         * sous lui (C15). Les deux FLOTTENT au-dessus du contenu qui défile.
         * Un bloc situé dans les cent soixante premiers pixels de la fenêtre
         * est donc RECOUVERT — et la barre du rayon porte le bouton d'affichage
         * actif, qui est un aplat d'encre. Le pixel « le plus sombre sous le
         * bloc » devenait alors #1c211a, c'est-à-dire l'encre elle-même : un
         * ratio de 1,00 relevé sur un titre parfaitement lisible.
         *
         * On ne mesure donc que ce qui est réellement visible. Le pas de
         * défilement (500) est plus court que la bande (680) : tout bloc plus
         * court que la bande y tombe entièrement à au moins un palier.
         */
        /*
         * … MAIS SEULEMENT QUAND LA PAGE A DÉFILÉ, et c'est la correction de
         * la passe « marbre franc ».
         *
         * La bande de deux cents pixels était appliquée à TOUS les paliers, y
         * compris au palier zéro. Or au sommet, rien n'est encore passé sous
         * l'en-tête : les organes collants sont à leur place naturelle et ne
         * recouvrent personne. La règle excluait donc l'en-tête et la barre du
         * rayon de TOUTE mesure, à tous les paliers — et le relevé le disait
         * sous la forme « 2 à 4 blocs plus hauts que la bande mesurable », que
         * trois livraisons ont lue comme une broutille de bord de page. Ce sont
         * les liens de navigation, et ils reposent sur le marbre comme le
         * reste. Au palier zéro, on les mesure.
         */
        if ((defilement > 0 && r.top < 200) || r.top < 0) continue;
        if (r.bottom > window.innerHeight - 20) continue;
        if (r.width < 4 || r.height < 4) continue;
        dedans.push({
          sonde,
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
      return dedans;
    };

    const restants = [...aMesurer.keys()].filter((s) => !mesures.has(s));
    const avant = await page.evaluate(boites, { connus: restants, defilement: position });
    if (avant.length === 0) continue;

    const fenetre = await page.screenshot();

    /*
     * LA BOÎTE EST RELUE APRÈS LA CAPTURE, ET ON JETTE CE QUI A BOUGÉ.
     *
     * Troisième déguisement de la leçon de C17 (« toute mesure sur un site
     * animé doit d'abord attendre l'immobilité »). Le relevé de boîtes et la
     * capture sont deux aller-retours distincts vers le navigateur : sur une
     * page de neuf mille pixels qui décode ses images au défilement, une boîte
     * peut se déplacer entre les deux, et la mesure porte alors sur des pixels
     * qui ne sont pas ceux du bloc. Symptôme observé, et il est parlant : un
     * ratio de 1,00 sous un titre de quarante pixels — c'est-à-dire une encre
     * relevée sur elle-même, à un endroit où le fond mesuré isolément vaut
     * 220 de luminance. Un attendu de plus n'aurait rien garanti ; l'égalité
     * des deux lectures, si.
     */
    const apres = await page.evaluate(boites, { connus: restants, defilement: position });
    const stables = new Map(apres.map((b) => [b.sonde, `${b.x}|${b.y}|${b.w}|${b.h}`]));
    const visibles = avant.filter(
      (b) => stables.get(b.sonde) === `${b.x}|${b.y}|${b.w}|${b.h}`,
    );
    if (visibles.length === 0) continue;
    const image = await sharp(fenetre).raw().toBuffer({ resolveWithObject: true });
    const { width: L, height: H, channels } = image.info;

    for (const vue of visibles) {
      const bloc = aMesurer.get(vue.sonde);
      const [hb, db, bb, gb] = bloc.bordures;
      const x0 = Math.max(0, Math.round(vue.x + gb + 1));
      const y0 = Math.max(0, Math.round(vue.y + hb + 1));
      const x1 = Math.min(L, Math.round(vue.x + vue.w - db - 1));
      const y1 = Math.min(H, Math.round(vue.y + vue.h - bb - 1));
      if (x1 <= x0 || y1 <= y0) continue;

      let sombre = null;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * L + x) * channels;
          const p = [image.data[i], image.data[i + 1], image.data[i + 2]];
          if (sombre === null || luma(p) < luma(sombre)) sombre = p;
        }
      }
      if (sombre === null) continue;
      mesures.set(vue.sonde, { ...bloc, fond: sombre, ratio: ratio(bloc.encre, sombre) });
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  /* CE QUI N'A PAS PU ÊTRE MESURÉ SE DIT. Un bloc plus haut que la bande
     mesurable n'y tombe à aucun palier ; le taire ferait passer un silence
     pour un succès. */
  const manquants = aMesurer.size - mesures.size;

  let pireIci = null;
  const petitsIci = [];

  for (const mesure of mesures.values()) {
    /* CE QUI A LE DROIT DE VIVRE SUR LA MATIÈRE : les grands titres didone,
       les étiquettes de registre, et ce qu'une déclaration `data-sur-marbre`
       assume nommément. Tout le reste — prose, tableaux, droit, formulaires —
       doit reposer sur un panneau. Les trois familles sont MESURÉES de la même
       façon ; seule la conséquence d'un manquement diffère. */
    if (mesure.grand || mesure.etiquette || mesure.declare) {
      if (pireIci === null || mesure.ratio < pireIci.ratio) pireIci = mesure;
      if (pireGrand === null || mesure.ratio < pireGrand.ratio) {
        pireGrand = { ...mesure, page: cible.nom };
      }
      /* Et le pire GRAND texte au sens strict de WCAG (≥ 24 px, ou ≥ 18,66 px
         en graisse ≥ 700), qui relève du seuil de 3,00 : c'est lui qui borne
         la matière une fois que le petit texte a cessé d'en dépendre. */
      if (mesure.grand && (pireVraimentGrand === null || mesure.ratio < pireVraimentGrand.ratio)) {
        pireVraimentGrand = { ...mesure, page: cible.nom };
      }
      /* CE QUI N'EST PAS GRAND EST DU PETIT TEXTE, TOLÉRÉ OU NON, et son
         contraste dépend alors du réglage du fond. On le confronte à la pire
         veine de la tuile, pas à celle qui passe dessous aujourd'hui. */
      if (!mesure.grand) {
        petitsTolerés.push({
          ...mesure,
          page: cible.nom,
          ratioPire: ratio(mesure.encre, veinePire),
        });
      }
    } else {
      petitsIci.push(mesure);
      coupablesPetits.push({ ...mesure, page: cible.nom });
    }
  }

  petitsSurMarbre += petitsIci.length;

  if (pireIci) {
    const seuil = pireIci.grand ? 3 : 4.5;
    dire('');
    dire('     PIRE COUPLE « GRAND TEXTE OU ÉTIQUETTE » SUR VEINE');
    dire(`       « ${pireIci.texte} »`);
    dire(
      `       <${pireIci.balise}> ${pireIci.taille.toFixed(1)} px / graisse ${String(pireIci.graisse)}` +
        `   encre ${hex(pireIci.encre)}   ` +
        `${pireIci.grand ? 'GRAND TEXTE, seuil 3,00' : 'étiquette, seuil strict 4,50'}`,
    );
    dire(`       fond le plus sombre sous ce bloc : ${hex(pireIci.fond)}`);
    dire(
      `       RATIO ${pireIci.ratio.toFixed(2)}   marge ` +
        `${(pireIci.ratio - seuil >= 0 ? '+' : '') + (pireIci.ratio - seuil).toFixed(2)}`,
    );
  } else {
    dire('     aucun grand texte ni étiquette posé directement sur le marbre.');
  }

  dire('');
  if (petitsIci.length === 0) {
    dire('     PROSE, TABLEAUX OU FORMULAIRES DIRECTEMENT SUR LE MARBRE : aucun.');
  } else {
    const pire = petitsIci.reduce((a, b) => (a.ratio < b.ratio ? a : b));
    dire(
      `     PROSE / TABLEAUX / FORMULAIRES SUR LE MARBRE : ${String(petitsIci.length)} bloc(s) ` +
        '— autant de panneaux qui manquent.',
    );
    dire(`       pire ratio ${pire.ratio.toFixed(2)} (seuil 4,50) — « ${pire.texte} »`);
    for (const p of petitsIci.slice(0, 14)) {
      dire(
        `       · ${p.ratio.toFixed(2)}  ${p.taille.toFixed(0)} px  <${p.balise}> ` +
          `${p.classe}  « ${p.texte} »`,
      );
    }
    if (petitsIci.length > 14) dire(`       … et ${String(petitsIci.length - 14)} autres`);
  }
  direManquants();
}

dire('');
dire('='.repeat(78));
dire('  VERDICT');
if (pireGrand) {
  const seuil = pireGrand.grand ? 3 : 4.5;
  dire(
    `    PIRE COUPLE SUR VEINE (grands textes et étiquettes), toutes pages : ` +
      `${pireGrand.ratio.toFixed(2)} pour un seuil de ${seuil.toFixed(2).replace('.', ',')}`,
  );
  dire(
    `      sur ${pireGrand.page} — « ${pireGrand.texte} », ` +
      `${pireGrand.taille.toFixed(0)} px, encre ${hex(pireGrand.encre)}, fond ${hex(pireGrand.fond)}`,
  );
}
dire(`    prose / tableaux / formulaires posés directement sur le marbre : ${String(petitsSurMarbre)}`);

/* ═══════════════════════════════════════════════════════════════════════════
   LE RECENSEMENT QUI LIBÈRE LE CURSEUR
   ═══════════════════════════════════════════════════════════════════════════
   Chaque ENCRE employée en petit texte sur la matière, avec le nombre de blocs
   qu'elle porte et son contraste contre la pire veine possible. Une encre qui
   tient 4,50 là ne dépend plus du réglage du fond ; une encre qui n'y tient pas
   est une butée sur le curseur, et il faut la nommer. */
const parEncre = new Map();
for (const bloc of petitsTolerés) {
  const clef = hex(bloc.encre);
  const connu = parEncre.get(clef);
  if (connu === undefined) {
    parEncre.set(clef, {
      encre: bloc.encre,
      blocs: 1,
      ratioPire: bloc.ratioPire,
      exemple: bloc,
      pages: new Set([bloc.page]),
    });
  } else {
    connu.blocs += 1;
    connu.pages.add(bloc.page);
    if (bloc.ratio < connu.exemple.ratio) connu.exemple = bloc;
  }
}

dire('');
dire('    LES ENCRES QUI PORTENT DU PETIT TEXTE SUR LA MATIÈRE');
dire('      (contraste contre la PIRE veine que la tuile puisse poser, seuil 4,50 —');
dire('       c’est cette colonne, et non la mesure locale, qui libère le curseur du fond)');
const encresFragiles = [];
for (const [clef, groupe] of [...parEncre.entries()].sort(
  (a, b) => a[1].ratioPire - b[1].ratioPire,
)) {
  if (groupe.ratioPire < 4.5) encresFragiles.push(clef);
  dire(
    `      ${clef}  ${groupe.ratioPire.toFixed(2).padStart(5)}  ` +
      `${String(groupe.blocs).padStart(3)} bloc(s) sur ${String(groupe.pages.size)} page(s)  ` +
      `${groupe.ratioPire >= 4.5 ? 'LIBRE ' : 'BUTÉE '}` +
      `« ${groupe.exemple.texte.slice(0, 34)} »`,
  );
}
if (parEncre.size === 0) dire('      aucune : il ne reste que du grand texte sur la matière.');

const pireStructurel =
  petitsTolerés.length > 0
    ? petitsTolerés.reduce((a, b) => (a.ratioPire < b.ratioPire ? a : b))
    : null;

const pireDesPetits =
  coupablesPetits.length > 0
    ? coupablesPetits.reduce((a, b) => (a.ratio < b.ratio ? a : b))
    : null;
if (pireDesPetits) {
  dire(
    `    dont le pire ratio : ${pireDesPetits.ratio.toFixed(2)} — ` +
      `« ${pireDesPetits.texte} » (${pireDesPetits.page})`,
  );
}

const echec =
  (pireGrand !== null && pireGrand.ratio < (pireGrand.grand ? 3 : 4.5)) ||
  coupablesPetits.some((p) => p.ratio < 4.5) ||
  petitsSurMarbre > 0 ||
  encresFragiles.length > 0;

if (pireVraimentGrand !== null) {
  dire('');
  dire(
    `    PIRE GRAND TEXTE (≥ 24 px, seuil 3,00) : ${pireVraimentGrand.ratio.toFixed(2)} — ` +
      `« ${pireVraimentGrand.texte} » (${pireVraimentGrand.page}), ` +
      `${pireVraimentGrand.taille.toFixed(0)} px, encre ${hex(pireVraimentGrand.encre)}, ` +
      `fond ${hex(pireVraimentGrand.fond)}`,
  );
}

if (pireStructurel !== null) {
  dire('');
  dire(
    `    PIRE PETIT TEXTE CONTRE LA PIRE VEINE : ${pireStructurel.ratioPire.toFixed(2)} — ` +
      `« ${pireStructurel.texte} » (${pireStructurel.page}), encre ${hex(pireStructurel.encre)}`,
  );
}

dire('');
dire(
  echec
    ? '    ÉCHEC : il reste du texte courant sur le marbre, ou un couple sous son seuil.'
    : '    Aucun texte courant sur le marbre ; tous les couples tiennent WCAG 1.4.3 ;\n' +
        '    et tout le petit texte de la matière tient 4,50 contre la PIRE veine de la\n' +
        '    tuile — le curseur `--marbre-opacite` peut donc bouger sans rien casser.',
);
if (echec) process.exitCode = 1;

await navigateur.close();
dire('');
writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');
console.log(`Relevé écrit dans ${sortie}`);
