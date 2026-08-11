/**
 * LA SIGNATURE DU MOTEUR D'IMAGES — localisation par les pixels.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE FICHIER EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tous les masters de la série portent, dans leur coin bas-droit, une petite
 * étoile à quatre branches : la signature du moteur qui les a engendrés. Les
 * boîtes de recadrage du manifeste sont écrites pour l'exclure, et C14 l'avait
 * localisée À LA MAIN — un relevé juste, mais fait une fois, sur deux masters,
 * et recopié en commentaire. Rien ne le vérifiait ensuite : vingt-neuf masters
 * n'avaient jamais été relus, et AUCUNE GARDE NE REGARDAIT LES PIXELS. Entre le
 * bord droit de la boîte `portrait` et le début de l'étincelle, il y avait
 * quatre points, et personne pour s'en apercevoir si l'un des deux bougeait.
 *
 * Ce module est la réponse : la signature est CHERCHÉE dans chaque master
 * ingéré, sa position est consignée au relevé de livraison, et le pipeline
 * ÉCHOUE EN NOMMANT LE FICHIER si elle entre dans la boîte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ON NE CHERCHE PAS « UNE TACHE CLAIRE », ON CHERCHE CETTE FORME-LÀ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première rédaction cherchait le plus fort écart de luminance du quadrant
 * bas-droit. Mesuré sur les masters réels, ce critère désigne le bord du
 * produit, l'ombre portée ou le grain du papier une fois sur deux : l'étincelle
 * ne dépasse le fond que de cinq à onze niveaux de gris, là où l'arête d'une
 * bouteille en dépasse quarante. Un détecteur de maximum trouve toujours
 * quelque chose, et rarement ce qu'on lui demande.
 *
 * Ce qui distingue l'étincelle n'est pas son intensité, c'est sa FORME : une
 * astroïde (|x|^⅔ + |y|^⅔ ≤ 1), de côté constant — 5,4 % de la largeur du
 * master, quel que soit le format. On corrèle donc la vignette avec ce gabarit,
 * en corrélation croisée NORMALISÉE, ce qui rend le score indépendant du
 * contraste : une étincelle pâle sur papier écru et une étincelle nette sur
 * fond sombre obtiennent le même score.
 *
 * Deux critères, et il en faut deux :
 *
 *   - le SCORE (forme) dit « c'est bien une astroïde » ;
 *   - l'AMPLITUDE (contraste local, en niveaux de gris) dit « et elle est
 *     réellement là ». Sans elle, le bruit d'un fond parfaitement lisse finit
 *     par former, quelque part, une astroïde de très faible relief.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES SEUILS SONT MESURÉS, PAS CHOISIS — ET B01 v3 EST LE TÉMOIN NÉGATIF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Relevé sur la série entière (fenêtre du coin, vignette de 192 points).
 * CES CHIFFRES SONT CEUX DU RELEVÉ DE LIVRAISON, PAS UNE RECOPIE : la première
 * rédaction de cette table arrondissait de mémoire et se trompait sur six de ses
 * onze lignes, ce qui est la pire chose qu'un tableau de calibrage puisse faire —
 * un mainteneur qui re-règle les seuils dessus les règle sur des valeurs qui
 * n'existent pas. Ils sont re-mesurés en C15 sur les quarante-six masters et
 * consignés dans `public/produits/manifeste-livre.json` pour ceux qu'on livre.
 *
 * | master                        | score | amplitude | verdict             |
 * |-------------------------------|-------|-----------|---------------------|
 * | A01 v3 huile d'olive          | 0,552 | 10,93     | localisée           |
 * | A02 huile de noix             | 0,563 | 10,18     | localisée           |
 * | A03 vinaigre                  | 0,742 |  9,10     | localisée           |
 * | A12 beurre                    | 0,623 |  4,80     | localisée           |
 * | A14 coffret                   | 0,869 |  4,15     | localisée           |
 * | A15 coffret composé           | 0,864 |  4,19     | localisée           |
 * | B13 fromage                   | 0,880 |  4,31     | localisée           |
 * | B01 v2 (rejetée en C14)       | 0,754 |  8,31     | localisée           |
 * | **B01 v3 (engendrée en C14)** | 0,483 |  2,01     | **AUCUNE**          |
 * | E01 zénithal                  | 0,348 | 41,40     | aucune (composition)|
 * | C01 macro huiles              | 0,439 |  1,78     | aucune              |
 * | D01 héros                     | 0,341 |  2,73     | aucune              |
 *
 * B01 v3 est le témoin qui vaut le plus cher, et il n'a pas été fabriqué pour
 * l'occasion : ce master a été ré-engendré pendant C14 avec l'étincelle ajoutée
 * aux interdits de la consigne, et le journal note qu'elle est « absente du
 * résultat ». Le détecteur le dit tout seul — 0,483 et 2,01 contre 0,754 et 8,31
 * pour la v2, qui la porte.
 *
 * MAIS LA MARGE N'EST PAS LA MÊME DES DEUX CÔTÉS, et il faut l'écrire : sur le
 * SCORE, B01 v3 passe à 0,017 du seuil (3,4 %) ; c'est l'AMPLITUDE qui tranche
 * vraiment, à 2,01 contre 3,0 (33 %). Un réglage qui abaisserait le seuil de
 * score sans toucher à celui d'amplitude ne changerait donc RIEN au verdict de
 * B01 v3 — et c'est exactement pour cela qu'un huitième cas de test tient
 * désormais le voisinage du seuil de score, sur une étincelle assez franche pour
 * que l'amplitude ne le sauve pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL NE SAIT PAS FAIRE, DIT ICI PLUTÔT QUE DÉCOUVERT PLUS TARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur une composition qui remplit le coin — les zénithaux E, les macros C, le
 * héros D —, la corrélation ne reconnaît plus la forme : le verdict est « AUCUNE
 * SIGNATURE RECONNUE », et il ne veut pas dire « il n'y en a pas ». Le pipeline
 * ne transforme donc JAMAIS une non-détection en succès silencieux : il l'écrit
 * au relevé et la dit à l'écran. La relecture à l'œil exigée par D35 reste due,
 * et la re-génération du master reste l'outil de la tranche suivante là où le
 * cadrage ne peut rien.
 *
 * IL EXISTE AUSSI DES FAUX POSITIFS, et C15 en a rencontré un pour de vrai. Sur
 * le master B09 (confiture ouverte), la meilleure corrélation ne tombait pas sur
 * l'étincelle — qui est bien là, à sa place habituelle, hors de la boîte — mais
 * sur le REFLET du couvercle doré, à l'intérieur du cadre, avec 0,509 de score,
 * neuf millièmes au-dessus du seuil. La relecture au zoom ×4 a tranché : un
 * dégradé de métal, pas une astroïde. Le pipeline a refusé de livrer, ce qui est
 * la bonne issue — une garde qui laisse passer parce qu'elle doute ne garde
 * rien —, et le master a été ré-engendré, ce que le message d'échec propose
 * précisément pour ce cas. À retenir : le seuil de score travaille ici à sa
 * résolution ; l'amplitude et l'œil sont les deux critères qui portent.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE PUR — AUCUN sharp ICI, ET C'EST LA CONDITION DE SON TEST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier ne connaît que des octets : il reçoit une VIGNETTE en niveaux de
 * gris déjà réduite, et rend des coordonnées. C'est `preparer-images.mjs` —
 * outil de poste — qui appelle sharp pour la fabriquer.
 *
 * La séparation n'est pas cosmétique : `npm run controle` tourne en intégration
 * continue, et la doctrine de ce dépôt est que sharp n'y soit JAMAIS exécuté.
 * Les cas de test de ce module fabriquent donc leurs vignettes en JavaScript
 * pur, à la main, sans décoder une seule image.
 */

/**
 * LES RÉGLAGES, tous mesurés (voir le tableau de l'en-tête).
 *
 * `fraction` : la fenêtre de recherche est le coin bas-droit, un quart de la
 * largeur par un quart de la hauteur. Le quadrant entier a été essayé d'abord ;
 * il fait entrer le produit et son ombre dans la fenêtre, et c'est ce qui
 * faisait désigner l'arête d'une bouteille à la place de la signature. Le coin,
 * lui, est du fond sur toute la série — et une signature de moteur se pose dans
 * un coin, pas au milieu de la scène.
 */
export const REGLAGES = {
  fraction: 0.25,
  largeurReduite: 192,
  /** Côté du gabarit, en fraction de la largeur du MASTER (mesuré : 50/928). */
  coteRelatif: 0.054,
  scoreMinimum: 0.5,
  amplitudeMinimum: 3,
};

/**
 * La fenêtre de recherche d'un master, et la vignette qu'on en attend.
 *
 * @param {number} largeur largeur du master, en points
 * @param {number} hauteur hauteur du master, en points
 */
export function fenetreDeRecherche(largeur, hauteur) {
  const x = Math.round(largeur * (1 - REGLAGES.fraction));
  const y = Math.round(hauteur * (1 - REGLAGES.fraction));
  const fenetreLargeur = largeur - x;
  const fenetreHauteur = hauteur - y;
  const facteur = REGLAGES.largeurReduite / fenetreLargeur;

  return {
    x,
    y,
    largeur: fenetreLargeur,
    hauteur: fenetreHauteur,
    /* Dimensions de la vignette attendue. */
    largeurReduite: REGLAGES.largeurReduite,
    hauteurReduite: Math.max(1, Math.round(fenetreHauteur * facteur)),
    facteur,
    /* Côté du gabarit dans la vignette, forcé IMPAIR pour avoir un centre. */
    cote: forcerImpair(Math.max(5, Math.round(REGLAGES.coteRelatif * largeur * facteur))),
  };
}

function forcerImpair(valeur) {
  return valeur % 2 === 0 ? valeur + 1 : valeur;
}

/**
 * LE GABARIT — une astroïde de côté donné, centrée réduite.
 *
 * Centrée (moyenne nulle) et réduite (norme 1) une fois pour toutes : la
 * corrélation normalisée n'a plus alors qu'un produit scalaire à faire.
 */
export function gabaritAstroide(cote) {
  const gabarit = new Float64Array(cote * cote);
  const rayon = (cote - 1) / 2;

  for (let ligne = 0; ligne < cote; ligne += 1) {
    for (let colonne = 0; colonne < cote; colonne += 1) {
      const u = Math.abs((colonne - rayon) / rayon);
      const v = Math.abs((ligne - rayon) / rayon);
      gabarit[ligne * cote + colonne] = Math.cbrt(u * u) + Math.cbrt(v * v) <= 1 ? 1 : 0;
    }
  }

  let somme = 0;
  for (const valeur of gabarit) somme += valeur;
  const moyenne = somme / gabarit.length;

  let norme = 0;
  for (let rang = 0; rang < gabarit.length; rang += 1) {
    gabarit[rang] -= moyenne;
    norme += gabarit[rang] * gabarit[rang];
  }
  norme = Math.sqrt(norme);
  for (let rang = 0; rang < gabarit.length; rang += 1) gabarit[rang] /= norme;

  return gabarit;
}

/**
 * LE FOND LOCAL, par image intégrale.
 *
 * On retire à chaque point la moyenne d'un carré de côté `2 × rayon + 1`
 * centré sur lui. Ce passe-haut efface le dégradé du fond de papier — qui vaut
 * plusieurs dizaines de niveaux d'un bord à l'autre du cadre — sans effacer une
 * marque de cinquante points. L'image intégrale rend l'opération exacte et
 * linéaire en nombre de points, quel que soit le rayon.
 */
function residu(vignette, largeur, hauteur, rayon) {
  const integrale = new Float64Array((largeur + 1) * (hauteur + 1));

  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    let cumul = 0;
    for (let colonne = 0; colonne < largeur; colonne += 1) {
      cumul += vignette[ligne * largeur + colonne];
      integrale[(ligne + 1) * (largeur + 1) + colonne + 1] =
        integrale[ligne * (largeur + 1) + colonne + 1] + cumul;
    }
  }

  const somme = (x1, y1, x2, y2) =>
    integrale[y2 * (largeur + 1) + x2] -
    integrale[y1 * (largeur + 1) + x2] -
    integrale[y2 * (largeur + 1) + x1] +
    integrale[y1 * (largeur + 1) + x1];

  const sortie = new Float64Array(largeur * hauteur);

  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    const haut = Math.max(0, ligne - rayon);
    const bas = Math.min(hauteur, ligne + rayon + 1);

    for (let colonne = 0; colonne < largeur; colonne += 1) {
      const gauche = Math.max(0, colonne - rayon);
      const droite = Math.min(largeur, colonne + rayon + 1);
      const aire = (droite - gauche) * (bas - haut);
      const fond = somme(gauche, haut, droite, bas) / aire;
      sortie[ligne * largeur + colonne] = vignette[ligne * largeur + colonne] - fond;
    }
  }

  return sortie;
}

/**
 * CHERCHE LA SIGNATURE dans une vignette du coin, et rend des coordonnées MASTER.
 *
 * @param {Uint8Array|Buffer} vignette niveaux de gris, `largeurReduite × hauteurReduite`
 * @param {ReturnType<typeof fenetreDeRecherche>} fenetre
 * @returns {{
 *   localisee: boolean, score: number, amplitude: number, precision: number,
 *   boite: { x: number, y: number, largeur: number, hauteur: number } | null,
 * }}
 */
export function localiserSignature(vignette, fenetre) {
  const { largeurReduite: largeur, hauteurReduite: hauteur, cote, facteur } = fenetre;

  if (vignette.length !== largeur * hauteur) {
    throw new Error(
      `vignette de ${String(vignette.length)} points pour une fenêtre de ` +
        `${String(largeur)}×${String(hauteur)} — les deux doivent concorder`,
    );
  }

  const ecarts = residu(vignette, largeur, hauteur, cote);
  const gabarit = gabaritAstroide(cote);

  let meilleur = { score: -1, amplitude: 0, x: 0, y: 0 };

  for (let y = 0; y + cote <= hauteur; y += 1) {
    for (let x = 0; x + cote <= largeur; x += 1) {
      let somme = 0;

      for (let ligne = 0; ligne < cote; ligne += 1) {
        const depart = (y + ligne) * largeur + x;
        for (let colonne = 0; colonne < cote; colonne += 1) somme += ecarts[depart + colonne];
      }

      const moyenne = somme / (cote * cote);
      let produit = 0;
      let energie = 0;

      for (let ligne = 0; ligne < cote; ligne += 1) {
        const depart = (y + ligne) * largeur + x;
        const departGabarit = ligne * cote;
        for (let colonne = 0; colonne < cote; colonne += 1) {
          const valeur = ecarts[depart + colonne] - moyenne;
          produit += valeur * gabarit[departGabarit + colonne];
          energie += valeur * valeur;
        }
      }

      const score = energie <= 1e-9 ? 0 : produit / Math.sqrt(energie);

      if (score > meilleur.score) {
        meilleur = { score, amplitude: Math.sqrt(energie / (cote * cote)), x, y };
      }
    }
  }

  const localisee =
    meilleur.score >= REGLAGES.scoreMinimum && meilleur.amplitude >= REGLAGES.amplitudeMinimum;

  /* La précision de la localisation : un point de vignette vaut `1 / facteur`
     points de master. On la rend au lieu de la taire, et la boîte consignée en
     tient compte des deux côtés. */
  const precision = Math.ceil(1 / facteur);

  return {
    localisee,
    score: Number(meilleur.score.toFixed(3)),
    amplitude: Number(meilleur.amplitude.toFixed(2)),
    precision,
    boite: localisee
      ? {
          x: fenetre.x + Math.round(meilleur.x / facteur) - precision,
          y: fenetre.y + Math.round(meilleur.y / facteur) - precision,
          largeur: Math.round(cote / facteur) + 2 * precision,
          hauteur: Math.round(cote / facteur) + 2 * precision,
        }
      : null,
  };
}

/**
 * LE VERDICT — la signature entre-t-elle dans la boîte de recadrage ?
 *
 * Rend aussi la MARGE : le nombre de points qui séparent le bord droit de la
 * boîte du bord gauche de la signature (ou le bord bas du bord haut, selon
 * l'axe par lequel elle sort). Elle vaut d'être consignée : sur les masters
 * portrait de cette série, elle ne fait que quelques points, et c'est un chiffre
 * qu'on veut voir bouger.
 */
export function verdictSignature(signature, boite) {
  if (signature.boite === null) {
    return { dansLaBoite: false, marge: null };
  }

  const s = signature.boite;
  const chevauche =
    s.x < boite.x + boite.largeur &&
    s.x + s.largeur > boite.x &&
    s.y < boite.y + boite.hauteur &&
    s.y + s.hauteur > boite.y;

  /* Hors chevauchement, la marge est la plus courte distance qui sépare les deux
     rectangles sur l'un ou l'autre axe. */
  const ecartHorizontal = Math.max(boite.x - (s.x + s.largeur), s.x - (boite.x + boite.largeur));
  const ecartVertical = Math.max(boite.y - (s.y + s.hauteur), s.y - (boite.y + boite.hauteur));

  return {
    dansLaBoite: chevauche,
    marge: chevauche ? 0 : Math.max(ecartHorizontal, ecartVertical),
  };
}
