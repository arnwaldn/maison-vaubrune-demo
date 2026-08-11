import { describe, expect, it } from 'vitest';

import {
  fenetreDeRecherche,
  gabaritAstroide,
  localiserSignature,
  REGLAGES,
  verdictSignature,
  type Fenetre,
} from '../../scripts/etincelle.mjs';

/**
 * LE DÉTECTEUR DE SIGNATURE, ÉPROUVÉ SUR DES ÉTINCELLES FABRIQUÉES.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi aucune image n'est ouverte ici
 * ---------------------------------------------------------------------------
 *
 * `npm run controle` tourne en intégration continue, et la doctrine de ce dépôt
 * est que sharp n'y soit JAMAIS exécuté : les dérivés sont produits sur le
 * poste, versionnés, et servis comme des fichiers. Un cas de test qui décoderait
 * un PNG ferait entrer sharp dans la chaîne de vérification par la petite porte.
 *
 * C'est la raison d'être de la séparation : `etincelle.mjs` ne connaît que des
 * octets — une vignette en niveaux de gris déjà réduite —, et ces cas la
 * DESSINENT en JavaScript pur. Un fond en dégradé, une astroïde posée dessus,
 * et le détecteur doit dire où elle est.
 *
 * ---------------------------------------------------------------------------
 * Les deux cas qui comptent, et ils sont symétriques
 * ---------------------------------------------------------------------------
 *
 * L'étincelle DANS la boîte doit faire tomber le verdict ; l'étincelle HORS la
 * boîte doit le laisser passer. Un test qui ne montrerait que le second sens
 * serait satisfait par un détecteur qui ne trouve jamais rien — c'est-à-dire
 * par la panne exacte qu'on veut exclure.
 */

/** Le master de la série : celui dont toutes les mesures de C14 parlent. */
const LARGEUR_MASTER = 928;
const HAUTEUR_MASTER = 1152;

/** La boîte `portrait` du manifeste, après le déplacement du round 1. */
const BOITE_PORTRAIT = { x: 132, y: 66, largeur: 640, hauteur: 1024 };

/**
 * Une vignette de fond : un dégradé doux, sans rien dessus.
 *
 * Le dégradé n'est pas décoratif — il est la difficulté même. Sur les masters
 * réels, le fond de papier perd une dizaine de niveaux d'un bord à l'autre du
 * cadre, soit bien plus que le relief de l'étincelle (quatre à onze niveaux).
 * Un détecteur qui comparerait à une moyenne globale ne verrait que le dégradé.
 */
function vignetteDeFond(fenetre: Fenetre, grainFacteur = 4): Uint8Array {
  const vignette = new Uint8Array(fenetre.largeurReduite * fenetre.hauteurReduite);

  for (let ligne = 0; ligne < fenetre.hauteurReduite; ligne += 1) {
    for (let colonne = 0; colonne < fenetre.largeurReduite; colonne += 1) {
      /* Le grain du papier, reproductible parce que calculé et non tiré au
         sort : un fond parfaitement lisse est un fond que le détecteur n'aura
         jamais à traiter, et le cas négatif ne prouverait rien.
         `grainFacteur` monte le bruit — c'est le levier qui permet de POSER un
         cas au voisinage du seuil de score (voir le dernier cas du fichier) :
         le score étant une corrélation NORMALISÉE, il ne dépend pas de
         l'intensité de l'étincelle mais de son rapport au bruit. */
      const grain =
        ((Math.sin(colonne * 12.9898 + ligne * 78.233) * 43758.5453) % 1) * grainFacteur;

      vignette[ligne * fenetre.largeurReduite + colonne] = Math.round(
        198 + colonne * 0.06 + ligne * 0.05 + grain,
      );
    }
  }

  return vignette;
}

/**
 * Pose une astroïde de `cote` points, coin haut-gauche en (`x`, `y`) DANS LA
 * VIGNETTE, plus claire que le fond de `relief` niveaux.
 */
function poserEtincelle(
  vignette: Uint8Array,
  fenetre: Fenetre,
  x: number,
  y: number,
  relief: number,
): void {
  const cote = fenetre.cote;
  const rayon = (cote - 1) / 2;

  for (let ligne = 0; ligne < cote; ligne += 1) {
    for (let colonne = 0; colonne < cote; colonne += 1) {
      const u = Math.abs((colonne - rayon) / rayon);
      const v = Math.abs((ligne - rayon) / rayon);

      if (Math.cbrt(u * u) + Math.cbrt(v * v) > 1) {
        continue;
      }

      const rang = (y + ligne) * fenetre.largeurReduite + x + colonne;
      vignette[rang] = Math.min(255, (vignette[rang] ?? 0) + relief);
    }
  }
}

/** Les coordonnées de vignette qui rendent un point de master donné. */
function versVignette(fenetre: Fenetre, xMaster: number, yMaster: number) {
  return {
    x: Math.round((xMaster - fenetre.x) * fenetre.facteur),
    y: Math.round((yMaster - fenetre.y) * fenetre.facteur),
  };
}

describe('le gabarit de l’astroïde', () => {
  it('est centré et réduit — la corrélation n’a plus qu’un produit scalaire à faire', () => {
    const gabarit = gabaritAstroide(41);

    let somme = 0;
    let energie = 0;
    for (const valeur of gabarit) {
      somme += valeur;
      energie += valeur * valeur;
    }

    expect(somme).toBeCloseTo(0, 8);
    expect(energie).toBeCloseTo(1, 8);
  });
});

describe('la fenêtre de recherche', () => {
  it('est le coin bas-droit, et son gabarit suit l’échelle du master', () => {
    const petite = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const grande = fenetreDeRecherche(5056, 3392);

    expect(petite.x).toBe(696);
    expect(petite.y).toBe(864);
    expect(petite.largeur).toBe(232);

    /* L'étincelle vaut 5,4 % de la largeur du master QUEL QUE SOIT le format :
       réduite à la même vignette, elle occupe donc le même nombre de points.
       C'est ce qui permet un seul gabarit pour les deux résolutions de la
       série — et un seul jeu de seuils. */
    expect(grande.cote).toBe(petite.cote);
  });
});

describe('la localisation de l’étincelle', () => {
  it('trouve une étincelle posée à la place de celle de la série', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const vignette = vignetteDeFond(fenetre);
    const place = versVignette(fenetre, 783, 1006);

    poserEtincelle(vignette, fenetre, place.x, place.y, 14);

    const signature = localiserSignature(vignette, fenetre);

    expect(signature.localisee).toBe(true);
    /* À la précision près, c'est bien là qu'on l'a posée. */
    expect(signature.boite?.x).toBeGreaterThan(775);
    expect(signature.boite?.x).toBeLessThan(790);
    expect(signature.boite?.y).toBeGreaterThan(998);
    expect(signature.boite?.y).toBeLessThan(1012);
  });

  it('ne trouve rien sur un fond nu — l’absence est une réponse, pas un silence', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const signature = localiserSignature(vignetteDeFond(fenetre), fenetre);

    expect(signature.localisee).toBe(false);
    expect(signature.boite).toBeNull();
  });

  /**
   * LE CAS QUI TIENT LE SEUIL DE SCORE, et il manquait.
   *
   * Les sept premiers cas éprouvent des extrêmes — un fond nu (score 0,069) et
   * une étincelle franche (0,937). Entre les deux, le seuil de 0,50 n'était
   * gardé par personne : on pouvait l'abaisser à 0,45 sans qu'un seul cas
   * rougisse, et faire de B01 v3 — le témoin de production, mesuré à 0,483 — un
   * faux positif silencieux.
   *
   * Ce cas-ci se tient DANS le voisinage : score 0,469, c'est-à-dire au-dessus
   * de 0,45 et en dessous de 0,50. Et son AMPLITUDE est franche (6,6 contre un
   * minimum de 3), ce qui est le point : le second critère ne peut pas le
   * sauver. Si quelqu'un abaisse `scoreMinimum` à 0,45, cette étincelle devient
   * « localisée » et ce cas tombe — ce qui est exactement le service qu'on lui
   * demande.
   */
  it('REFUSE une étincelle dont le score passe juste sous le seuil, et le seuil est gardé', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    /* Grain 10 (au lieu de 4) et relief 7 : mesuré à 0,469 / 6,59. */
    const vignette = vignetteDeFond(fenetre, 10);
    const place = versVignette(fenetre, 783, 1006);

    poserEtincelle(vignette, fenetre, place.x, place.y, 7);

    const signature = localiserSignature(vignette, fenetre);

    expect(signature.localisee).toBe(false);
    expect(signature.boite).toBeNull();

    /* Sous le seuil, mais PAS de beaucoup : c'est la garde du réglage. */
    expect(signature.score).toBeLessThan(REGLAGES.scoreMinimum);
    expect(signature.score).toBeGreaterThan(0.45);

    /* Et l'amplitude ne le sauve pas : seul le score le retient. */
    expect(signature.amplitude).toBeGreaterThan(REGLAGES.amplitudeMinimum);
  });
});

describe('le verdict vis-à-vis de la boîte de recadrage', () => {
  it('LAISSE PASSER une étincelle hors de la boîte, et mesure la marge', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const vignette = vignetteDeFond(fenetre);
    const place = versVignette(fenetre, 783, 1006);

    poserEtincelle(vignette, fenetre, place.x, place.y, 14);

    const verdict = verdictSignature(localiserSignature(vignette, fenetre), BOITE_PORTRAIT);

    expect(verdict.dansLaBoite).toBe(false);
    /* La marge est un chiffre qu'on veut voir : à x=132, la boîte ferme à 772
       et l'étincelle commence neuf points plus loin. C'est ce déplacement de
       huit points, décidé au round 1, qui a rendu la garde plus large que sa
       propre incertitude (±2). */
    expect(verdict.marge).toBeGreaterThanOrEqual(5);
  });

  it('FAIT TOMBER une étincelle qui entre dans la boîte', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const vignette = vignetteDeFond(fenetre);

    /* Même relief, même forme, mais posée cinquante points plus à gauche —
       c'est-à-dire à l'intérieur du cadre que le pipeline s'apprête à livrer. */
    const place = versVignette(fenetre, 705, 1006);
    poserEtincelle(vignette, fenetre, place.x, place.y, 14);

    const signature = localiserSignature(vignette, fenetre);
    const verdict = verdictSignature(signature, BOITE_PORTRAIT);

    expect(signature.localisee).toBe(true);
    expect(verdict.dansLaBoite).toBe(true);
    expect(verdict.marge).toBe(0);
  });

  it('ne prononce aucun verdict quand rien n’a été localisé', () => {
    const fenetre = fenetreDeRecherche(LARGEUR_MASTER, HAUTEUR_MASTER);
    const verdict = verdictSignature(localiserSignature(vignetteDeFond(fenetre), fenetre), BOITE_PORTRAIT);

    expect(verdict.dansLaBoite).toBe(false);
    expect(verdict.marge).toBeNull();
  });
});
