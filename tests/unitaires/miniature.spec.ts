import { describe, expect, it } from 'vitest';

import {
  REGLAGES,
  boiteDuProduit,
  cadrageMiniature,
  composer,
  coutures,
  papierDuCarre,
  partDuProduit,
  placerPhoto,
  type ImageBrute,
} from '../../scripts/miniature.mjs';

/**
 * LA MINIATURE CARRÉE, ÉPROUVÉE SUR DES IMAGES DESSINÉES (C27).
 *
 * ---------------------------------------------------------------------------
 * Pourquoi aucune image n'est ouverte ici
 * ---------------------------------------------------------------------------
 *
 * Même doctrine que `etincelle.spec.ts` : `npm run controle` tourne en
 * intégration continue, où sharp n'est jamais exécuté. `miniature.mjs` ne
 * connaît que des tampons RVB ; ces cas les DESSINENT — un papier en dégradé,
 * un produit à arêtes franches, une ombre portée en rampe — et le module doit
 * dire où est le produit, comment le cadrer et si la couture tient.
 *
 * ---------------------------------------------------------------------------
 * Le cas qui compte : l'ombre
 * ---------------------------------------------------------------------------
 *
 * Le détecteur a été écrit parce qu'un écart au papier confond l'ombre portée
 * (qui court vers le bord du recadrage) avec le produit. Le premier cas dessine
 * exactement cela : une ombre qui traverse tout le bord droit. Une boîte
 * englobante qui l'inclurait toucherait le bord, et le cadrage serré serait
 * abandonné pour rien.
 */

const LARGEUR = 240;
const HAUTEUR = 360;

/** Le papier : un dégradé horizontal doux, plus un grain déterministe de ±1. */
function papier(x: number, y: number): readonly [number, number, number] {
  const grain = ((x * 7 + y * 13) % 3) - 1;
  const base = 226 + (x / LARGEUR) * 8;

  return [base + grain, base - 8 + grain, base - 24 + grain];
}

interface Dessin {
  /** Le rectangle du produit, ou `null` pour un papier nu. */
  readonly produit: { x: number; y: number; largeur: number; hauteur: number } | null;
  /** Une ombre molle qui part du pied du produit et court jusqu’au bord droit. */
  readonly ombre: boolean;
}

function dessiner({ produit, ombre }: Dessin): ImageBrute {
  const pixels = new Uint8Array(LARGEUR * HAUTEUR * 3);

  for (let y = 0; y < HAUTEUR; y += 1) {
    for (let x = 0; x < LARGEUR; x += 1) {
      let [r, v, b] = papier(x, y);

      if (ombre && produit !== null && x > produit.x + produit.largeur) {
        /* Une ombre au sol, MOLLE dans les deux sens : elle monte en 40 points,
           s'éteint à 40 % en 50 de plus et va jusqu'au bord droit ; sa hauteur
           est une cloche de ±14 points autour de la base du produit. Sa pente la
           plus raide fait 2 niveaux par point, contre 40 à 200 pour l'arête
           d'un produit — c'est exactement l'écart que le détecteur exploite. */
        const dx = x - (produit.x + produit.largeur);
        const horizontal = Math.min(1, dx / 40) * (1 - (0.6 * dx) / 90);
        const vertical = Math.exp(-(((y - (produit.y + produit.hauteur + 10)) / 14) ** 2));
        const facteur = 1 - 0.27 * horizontal * vertical;
        r *= facteur;
        v *= facteur;
        b *= facteur;
      }

      if (
        produit !== null &&
        x >= produit.x &&
        x < produit.x + produit.largeur &&
        y >= produit.y &&
        y < produit.y + produit.hauteur
      ) {
        r = 40;
        v = 62;
        b = 30;
      }

      const o = (y * LARGEUR + x) * 3;
      pixels[o] = Math.round(r);
      pixels[o + 1] = Math.round(v);
      pixels[o + 2] = Math.round(b);
    }
  }

  return { pixels, largeur: LARGEUR, hauteur: HAUTEUR, canaux: 3 };
}

const PRODUIT = { x: 70, y: 60, largeur: 80, hauteur: 250 };

describe('boiteDuProduit', () => {
  it('trouve le rectangle du produit à quelques points près', () => {
    const boite = boiteDuProduit(dessiner({ produit: PRODUIT, ombre: false }));

    expect(boite).not.toBeNull();
    expect(Math.abs((boite?.x ?? 0) - PRODUIT.x)).toBeLessThanOrEqual(3);
    expect(Math.abs((boite?.y ?? 0) - PRODUIT.y)).toBeLessThanOrEqual(3);
    expect(Math.abs((boite?.largeur ?? 0) - PRODUIT.largeur)).toBeLessThanOrEqual(6);
    expect(Math.abs((boite?.hauteur ?? 0) - PRODUIT.hauteur)).toBeLessThanOrEqual(6);
  });

  it('ne prend PAS une ombre portée jusqu’au bord pour une partie du produit', () => {
    const boite = boiteDuProduit(dessiner({ produit: PRODUIT, ombre: true }));
    const droite = (boite?.x ?? 0) + (boite?.largeur ?? 0);

    /* L'ombre court jusqu'à x = 240 ; le produit s'arrête à 150. */
    expect(droite).toBeLessThanOrEqual(PRODUIT.x + PRODUIT.largeur + 4);
  });

  it('rend null sur un papier nu, et le grain ne suffit pas à fabriquer un produit', () => {
    expect(boiteDuProduit(dessiner({ produit: null, ombre: false }))).toBeNull();
  });

  it('relève le gradient du pourtour, qui reste bien sous le seuil quand rien n’y touche', () => {
    const boite = boiteDuProduit(dessiner({ produit: PRODUIT, ombre: true }));

    expect(boite?.gradientDuPourtour).toBeLessThan(REGLAGES.seuilGradient / 2);
  });
});

describe('cadrageMiniature', () => {
  const recadrage = { largeur: LARGEUR, hauteur: HAUTEUR };

  it('ajoute l’air demandé de chaque côté, en part de la plus grande dimension', () => {
    const cadre = cadrageMiniature(PRODUIT, recadrage);
    const marge = Math.round(REGLAGES.air * PRODUIT.hauteur);

    expect(cadre.entier).toBe(false);
    expect(cadre.x).toBe(PRODUIT.x - marge);
    expect(cadre.y).toBe(PRODUIT.y - marge);
    expect(cadre.largeur).toBe(PRODUIT.largeur + 2 * marge);
    expect(cadre.hauteur).toBe(PRODUIT.hauteur + 2 * marge);
  });

  it('ne sort jamais du recadrage', () => {
    const cadre = cadrageMiniature({ x: 5, y: 40, largeur: 120, hauteur: 250 }, recadrage);

    expect(cadre.x).toBe(0);
    expect(cadre.x + cadre.largeur).toBeLessThanOrEqual(LARGEUR);
    expect(cadre.y + cadre.hauteur).toBeLessThanOrEqual(HAUTEUR);
  });

  it('garde le recadrage ENTIER quand la boîte du produit touche un bord, quel qu’il soit', () => {
    const touchant = [
      { x: 0, y: 60, largeur: 80, hauteur: 200 },
      { x: 70, y: 1, largeur: 80, hauteur: 200 },
      { x: 150, y: 60, largeur: LARGEUR - 150, hauteur: 200 },
      { x: 70, y: 100, largeur: 80, hauteur: HAUTEUR - 100 },
    ];

    for (const produit of touchant) {
      expect(cadrageMiniature(produit, recadrage)).toEqual({
        x: 0,
        y: 0,
        largeur: LARGEUR,
        hauteur: HAUTEUR,
        entier: true,
      });
    }
  });

  it('garde le recadrage entier quand aucun produit n’a été trouvé', () => {
    expect(cadrageMiniature(null, recadrage).entier).toBe(true);
  });
});

describe('placerPhoto', () => {
  it('pose un cadre vertical : la hauteur vaut le côté, la largeur est centrée', () => {
    expect(placerPhoto({ largeur: 325, hauteur: 957 }, 160)).toEqual({
      largeur: 54,
      hauteur: 160,
      gauche: 53,
      haut: 0,
    });
  });

  it('pose un cadre horizontal : la largeur vaut le côté, la hauteur est centrée', () => {
    expect(placerPhoto({ largeur: 842, hauteur: 620 }, 320)).toEqual({
      largeur: 320,
      hauteur: 236,
      gauche: 0,
      haut: 42,
    });
  });

  it('ne produit jamais une dimension nulle, même pour un cadre très étroit', () => {
    expect(placerPhoto({ largeur: 1, hauteur: 2000 }, 160).largeur).toBe(1);
  });
});

describe('partDuProduit', () => {
  it('rapporte la plus grande dimension du produit à celle du cadre', () => {
    const cadre = cadrageMiniature(PRODUIT, { largeur: LARGEUR, hauteur: HAUTEUR });
    const part = partDuProduit(PRODUIT, cadre);

    /* Un air de 6 % de chaque côté : 1 / 1,12, soit un peu plus de 89 %. */
    expect(part).toBeGreaterThan(0.85);
    expect(part).toBeLessThan(0.92);
  });
});

/* -------------------------------------------------------------------------- */
/* La composition et la couture                                                */
/* -------------------------------------------------------------------------- */

const COTE = 160;

/**
 * Une photographie de 54 × 160 dont le bord droit a un VRAI dégradé vertical :
 * 200 en haut, 236 en bas — c'est ce qui rendait un aplat unique faux d'un côté
 * (24 niveaux au bord droit du coffret).
 */
function photoEnDegrade(largeur: number, hauteur: number) {
  const pixels = new Uint8Array(largeur * hauteur * 3);

  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      const niveau = 200 + (36 * y) / hauteur + (x % 2);
      const o = (y * largeur + x) * 3;
      pixels[o] = niveau;
      pixels[o + 1] = niveau - 8;
      pixels[o + 2] = niveau - 24;
    }
  }

  return { pixels, largeur, hauteur };
}

describe('composer et coutures', () => {
  const placement = placerPhoto({ largeur: 325, hauteur: 957 }, COTE);
  const photo = photoEnDegrade(placement.largeur, placement.hauteur);

  it('rend un carré complet, la photographie intacte à sa place', () => {
    const carre = composer(photo, COTE, placement);

    expect(carre.length).toBe(COTE * COTE * 3);

    const o = (80 * COTE + (placement.gauche + 10)) * 3;
    const p = (80 * photo.largeur + 10) * 3;
    expect([carre[o], carre[o + 1], carre[o + 2]]).toEqual([
      photo.pixels[p],
      photo.pixels[p + 1],
      photo.pixels[p + 2],
    ]);
  });

  it('étend CHAQUE côté avec sa ligne de bord : la couture tient sous le maximum, de haut en bas du dégradé', () => {
    const carre = composer(photo, COTE, placement);
    const mesure = coutures(carre, COTE, placement);

    expect(mesure.gauche).not.toBeNull();
    expect(mesure.droite).not.toBeNull();
    expect(mesure.gauche ?? 99).toBeLessThanOrEqual(REGLAGES.coutureMax);
    expect(mesure.droite ?? 99).toBeLessThanOrEqual(REGLAGES.coutureMax);
    /* La hauteur est entièrement occupée : rien à coudre en haut ni en bas. */
    expect(mesure.haut).toBeNull();
    expect(mesure.bas).toBeNull();
  });

  it('CONTRE-ÉPREUVE : un aplat unique laisse, sur ce même dégradé, une couture bien au-delà du maximum', () => {
    /* Ce que faisait la première idée, et ce que le directeur artistique a
       mesuré (24 niveaux au bord droit du coffret) : une seule couleur, la
       moyenne du bord, pour tout le côté. */
    const carre = composer(photo, COTE, placement);
    const moyenne = [0, 0, 0];

    for (let y = 0; y < COTE; y += 1) {
      for (let c = 0; c < 3; c += 1) {
        moyenne[c] = (moyenne[c] ?? 0) + (carre[(y * COTE + placement.gauche - 1) * 3 + c] ?? 0) / COTE;
      }
    }

    for (let y = 0; y < COTE; y += 1) {
      for (let x = 0; x < placement.gauche; x += 1) {
        for (let c = 0; c < 3; c += 1) {
          carre[(y * COTE + x) * 3 + c] = Math.round(moyenne[c] ?? 0);
        }
      }
    }

    expect(coutures(carre, COTE, placement).gauche ?? 0).toBeGreaterThan(REGLAGES.coutureMax);
  });

  it('mesure une couture réelle : un saut de 30 niveaux d’un côté est lu comme tel', () => {
    const carre = composer(photo, COTE, placement);

    for (let y = 0; y < COTE; y += 1) {
      for (let c = 0; c < 3; c += 1) {
        const i = (y * COTE + placement.gauche + placement.largeur) * 3 + c;
        carre[i] = Math.min(255, (carre[i] ?? 0) + 30);
      }
    }

    const mesure = coutures(carre, COTE, placement);

    expect(mesure.droite ?? 0).toBeGreaterThan(25);
    expect(mesure.gauche ?? 99).toBeLessThanOrEqual(REGLAGES.coutureMax);
  });

  it('couture horizontale : un cadre large est étendu en haut et en bas', () => {
    const large = placerPhoto({ largeur: 842, hauteur: 620 }, COTE);
    const carre = composer(photoEnDegrade(large.largeur, large.hauteur), COTE, large);
    const mesure = coutures(carre, COTE, large);

    expect(mesure.gauche).toBeNull();
    expect(mesure.droite).toBeNull();
    expect(mesure.haut ?? 99).toBeLessThanOrEqual(REGLAGES.coutureMax);
    expect(mesure.bas ?? 99).toBeLessThanOrEqual(REGLAGES.coutureMax);
  });

  it('étend aussi les coins, sans trou ni noir', () => {
    const large = placerPhoto({ largeur: 400, hauteur: 600 }, COTE);
    const petit = photoEnDegrade(large.largeur, 40);
    const carre = composer(petit, COTE, { ...large, hauteur: 40, haut: 60 });

    expect(carre.some((v) => v === 0)).toBe(false);
  });
});

describe('papierDuCarre', () => {
  it('rend la moyenne du pourtour du carré', () => {
    const carre = new Uint8Array(4 * 4 * 3).fill(200);

    expect(papierDuCarre(carre, 4)).toEqual({ r: 200, g: 200, b: 200 });
  });
});
