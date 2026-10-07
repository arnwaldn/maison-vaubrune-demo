/**
 * LA MINIATURE CARRÉE D'UN PRODUIT — arithmétique et mesures PURES (C27).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE FICHIER EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première rédaction des miniatures du panier posait la vue `principal`
 * (5:8 pour les pots et les bouteilles, 4:3 pour les coffrets) dans un carré en
 * `object-fit: cover`. Un carré central retire 37,5 % de la hauteur d'un 5:8 :
 * la bouteille perdait son bouchon et sa base, le miel le bas du pot, le coffret
 * ses coins. La règle de la maison tient en une phrase — « un produit coupé
 * serait une faute » — et un `cover` la viole par construction.
 *
 * La miniature est donc COMPOSÉE, sur le patron de l'image de partage de C15
 * (`produirePartage`, voir `preparer-images.mjs`) : on pose le produit ENTIER
 * dans un carré, et on complète avec le papier. La différence avec l'image de
 * partage tient en une phrase : là-bas le papier est UN aplat prélevé au pourtour
 * (la couture mesurée y valait de 5 à 20 niveaux sur 255, et le fromage n'est
 * descendu sous 20 qu'avec son propre dégradé) ; ici la couture doit tenir sous
 * 8 niveaux sur chaque côté, MESURÉE sur les octets livrés, et le directeur
 * artistique avait mesuré 24 sur le bord droit du coffret avec un aplat unique.
 * Le papier n'est donc pas un aplat : chaque côté étendu recopie SA ligne de
 * bord, lissée le long du bord — voir `composer`.
 *
 * Ce module ne connaît que des octets (un tampon RVB déjà décodé) : sharp n'y
 * entre pas, pour la raison de `etincelle.mjs` et de `dimensions-image.mjs` —
 * un outil de poste ne tourne jamais en intégration continue, donc ce qu'il
 * décide doit se prouver sans lui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE PRODUIT EST CHERCHÉ PAR SES ARÊTES, PAS PAR SON ÉCART AU PAPIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le brief proposait un écart au papier prélevé au pourtour. Essayé d'abord, et
 * rendu faux par la photographie elle-même : chaque produit pose une OMBRE
 * PORTÉE qui court vers le bord droit du recadrage. Mesuré sur les quinze
 * masters, un écart de 18 niveaux (le bruit du pourtour va jusqu'à 17-20 à cause
 * d'elle) déclare « produit » une ombre qui touche le bord, donc une boîte
 * englobante pleine largeur ; à 25 niveaux la bouteille d'huile d'olive mesure
 * encore 315 points de large pour 200 réels ; et le sachet de lentilles, d'un
 * kraft proche du papier, tombe sous le même seuil que l'ombre. Aucun seuil
 * d'écart ne sépare l'ombre du sachet.
 *
 * Ce qui les sépare est la NETTETÉ : une ombre est une rampe de quelques niveaux
 * sur des dizaines de points, un bord de produit est un saut de dizaines de
 * niveaux sur un ou deux points. On cherche donc les pixels dont le GRADIENT
 * (sur l'image légèrement adoucie, pour que le grain du papier ne compte pas)
 * dépasse un seuil, et la boîte englobante est l'étendue de ces pixels.
 *
 * LE SEUIL EST MESURÉ, PAS CHOISI. Sur les quinze masters, le gradient maximal
 * du POURTOUR (là où il n'y a que du papier, de l'ombre et du grain) vaut de 2,2 à
 * 5,7 niveaux par point quand aucun produit n'y touche ; la boîte englobante des
 * produits, elle, ne bouge presque plus entre 10 et 20 (`REGLAGES.seuilGradient`,
 * 12, soit plus de deux fois le pire pourtour mesuré). Le quorum de trois pixels
 * par rangée ou par colonne écarte une poussière isolée.
 *
 * LE PRODUIT NE DOIT JAMAIS ÊTRE COUPÉ. Si la boîte englobante touche un bord du
 * recadrage — le produit déborde, ou on ne sait plus où il finit —, le
 * cadrage serré est ABANDONNÉ et la boîte entière est gardée : on perd de la
 * taille, jamais de produit.
 */

/**
 * Les réglages, exportés pour que les tests et les mesures lisent LES MÊMES
 * nombres que le pipeline.
 */
export const REGLAGES = {
  /** Le gradient, en niveaux par point, au-dessus duquel un pixel est une arête de produit. */
  seuilGradient: 10,
  /** Le nombre minimal de pixels d'arête par rangée ou colonne pour qu'elle compte. */
  quorum: 3,
  /** L'air gardé autour du produit, en part de sa plus grande dimension (de chaque côté). */
  air: 0.06,
  /** Les côtés livrés, en points : 72 px CSS à la densité 2 et 3 sur bureau, 64 sous 40 rem. */
  cotes: [160, 320],
  /** La couture maximale tolérée, en niveaux sur 255. */
  coutureMax: 8,
  /** La longueur, en points, des fenêtres sur lesquelles la couture est moyennée. */
  fenetreCouture: 16,
};

/* -------------------------------------------------------------------------- */
/* Détection de la boîte englobante du produit                                 */
/* -------------------------------------------------------------------------- */

/** Un adoucissement séparable [1 4 6 4 1] / 16, bords recopiés. Rend un tampon flottant. */
function adoucir(pixels, largeur, hauteur, canaux) {
  const noyau = [1, 4, 6, 4, 1];
  const horizontal = new Float32Array(pixels.length);
  const rendu = new Float32Array(pixels.length);

  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      for (let c = 0; c < canaux; c += 1) {
        let somme = 0;

        for (let k = -2; k <= 2; k += 1) {
          const xs = Math.min(largeur - 1, Math.max(0, x + k));
          somme += (noyau[k + 2] ?? 0) * (pixels[(y * largeur + xs) * canaux + c] ?? 0);
        }

        horizontal[(y * largeur + x) * canaux + c] = somme / 16;
      }
    }
  }

  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      for (let c = 0; c < canaux; c += 1) {
        let somme = 0;

        for (let k = -2; k <= 2; k += 1) {
          const ys = Math.min(hauteur - 1, Math.max(0, y + k));
          somme += (noyau[k + 2] ?? 0) * (horizontal[(ys * largeur + x) * canaux + c] ?? 0);
        }

        rendu[(y * largeur + x) * canaux + c] = somme / 16;
      }
    }
  }

  return rendu;
}

/**
 * La boîte englobante du produit dans un recadrage, ou `null` s'il ne s'y voit
 * aucune arête.
 *
 * `image` : `{ pixels, largeur, hauteur, canaux }`, `pixels` entrelacé (RVB).
 * Rend `{ x, y, largeur, hauteur, gradientDuPourtour }` en points du recadrage ;
 * `gradientDuPourtour` est le gradient maximal relevé dans la bande de 10 points
 * qui longe le bord — c'est l'instrument qui a servi à régler le seuil, rendu
 * avec le résultat pour qu'un test puisse le lire.
 */
export function boiteDuProduit(image, reglages = REGLAGES) {
  const { pixels, largeur, hauteur, canaux } = image;
  const lisses = adoucir(pixels, largeur, hauteur, canaux);
  const colonnes = new Array(largeur).fill(0);
  const rangees = new Array(hauteur).fill(0);
  let pourtour = 0;

  for (let y = 1; y < hauteur - 1; y += 1) {
    for (let x = 1; x < largeur - 1; x += 1) {
      let gradient = 0;

      for (let c = 0; c < canaux; c += 1) {
        const gx =
          ((lisses[(y * largeur + x + 1) * canaux + c] ?? 0) -
            (lisses[(y * largeur + x - 1) * canaux + c] ?? 0)) /
          2;
        const gy =
          ((lisses[((y + 1) * largeur + x) * canaux + c] ?? 0) -
            (lisses[((y - 1) * largeur + x) * canaux + c] ?? 0)) /
          2;
        gradient = Math.max(gradient, Math.hypot(gx, gy));
      }

      if (x < 10 || y < 10 || x >= largeur - 10 || y >= hauteur - 10) {
        pourtour = Math.max(pourtour, gradient);
      }

      if (gradient > reglages.seuilGradient) {
        colonnes[x] += 1;
        rangees[y] += 1;
      }
    }
  }

  const premiere = (tableau) => tableau.findIndex((n) => n >= reglages.quorum);
  const derniere = (tableau) => {
    for (let i = tableau.length - 1; i >= 0; i -= 1) {
      if ((tableau[i] ?? 0) >= reglages.quorum) {
        return i;
      }
    }

    return -1;
  };

  const x0 = premiere(colonnes);
  const x1 = derniere(colonnes);
  const y0 = premiere(rangees);
  const y1 = derniere(rangees);

  if (x0 === -1 || y0 === -1 || x1 === -1 || y1 === -1) {
    return null;
  }

  return {
    x: x0,
    y: y0,
    largeur: x1 - x0 + 1,
    hauteur: y1 - y0 + 1,
    gradientDuPourtour: pourtour,
  };
}

/* -------------------------------------------------------------------------- */
/* Le cadrage, le placement, la composition                                    */
/* -------------------------------------------------------------------------- */

/**
 * Le cadre à prélever dans le recadrage de la vue principale, en points de ce
 * recadrage : la boîte du produit et son air, bornée par le recadrage — on ne
 * prélève jamais hors de la boîte que le manifeste a écrite pour exclure
 * l'étincelle du moteur d'images.
 *
 * Rend `{ x, y, largeur, hauteur, entier }`. `entier` vaut `true` quand le
 * cadrage serré est abandonné : produit introuvable, ou boîte englobante qui
 * touche un bord (à deux points près, la précision de l'arête). Le produit n'est
 * alors pas resserré, il est gardé ENTIER dans le recadrage.
 */
export function cadrageMiniature(produit, recadrage, reglages = REGLAGES) {
  const entier = { x: 0, y: 0, largeur: recadrage.largeur, hauteur: recadrage.hauteur, entier: true };

  if (produit === null) {
    return entier;
  }

  const touche =
    produit.x <= 2 ||
    produit.y <= 2 ||
    produit.x + produit.largeur >= recadrage.largeur - 2 ||
    produit.y + produit.hauteur >= recadrage.hauteur - 2;

  if (touche) {
    return entier;
  }

  const marge = Math.round(reglages.air * Math.max(produit.largeur, produit.hauteur));
  const x = Math.max(0, produit.x - marge);
  const y = Math.max(0, produit.y - marge);
  const droite = Math.min(recadrage.largeur, produit.x + produit.largeur + marge);
  const bas = Math.min(recadrage.hauteur, produit.y + produit.hauteur + marge);

  return { x, y, largeur: droite - x, hauteur: bas - y, entier: false };
}

/**
 * Où la photographie se pose dans le carré de côté `cote` : la plus grande des
 * deux dimensions du cadre vaut exactement `cote`, l'autre est centrée et le
 * reste est étendu. C'est le `contain` de `produirePartage`, avec l'arithmétique
 * écrite plutôt que laissée à l'encodeur : on sait où est la couture.
 */
export function placerPhoto(cadre, cote) {
  const echelle = cote / Math.max(cadre.largeur, cadre.hauteur);
  const largeur = cadre.largeur >= cadre.hauteur ? cote : Math.max(1, Math.round(cadre.largeur * echelle));
  const hauteur = cadre.hauteur >= cadre.largeur ? cote : Math.max(1, Math.round(cadre.hauteur * echelle));

  return {
    largeur,
    hauteur,
    gauche: Math.floor((cote - largeur) / 2),
    haut: Math.floor((cote - hauteur) / 2),
  };
}

/**
 * La part du produit dans le carré : sa plus grande dimension, rapportée au
 * côté. C'est le chiffre que le directeur artistique a fixé (au moins ~85 %).
 */
export function partDuProduit(produit, cadre) {
  return Math.max(produit.largeur, produit.hauteur) / Math.max(cadre.largeur, cadre.hauteur);
}

/**
 * Compose le carré : la photographie à sa place, et chaque côté étendu avec SA
 * ligne de bord.
 *
 * `photo` : `{ pixels, largeur, hauteur }`, RVB entrelacé, déjà à sa taille
 * finale (`placement.largeur` × `placement.hauteur`). Rend un tampon RVB de
 * `cote × cote`.
 *
 * Pourquoi pas un aplat : le papier d'un master n'est pas uniforme — vignettage
 * léger, ombre portée qui court vers un bord, dégradé propre du fromage. Un
 * aplat unique laisse, sur un côté, un saut égal à l'écart entre sa valeur
 * moyenne et la valeur locale du bord : 24 niveaux au bord droit du coffret.
 * Recopier la ligne de bord (moyennée sur deux points de profondeur pour le
 * grain, lissée le long du bord pour que le grain ne devienne pas des rayures)
 * fait de la couture une différence entre un pixel et la moyenne de ses voisins.
 */
export function composer(photo, cote, placement) {
  const { largeur: pw, hauteur: ph, gauche, haut } = placement;
  const profondeur = 2;
  const rayon = Math.max(2, Math.round(cote / 100));

  /** Moyenne d'un bord sur `profondeur` points, lissée le long du bord (fenêtre de ±rayon). */
  const lisserLigne = (valeurs) => {
    const longueur = valeurs.length;
    const lissee = new Array(longueur);

    for (let i = 0; i < longueur; i += 1) {
      const a = Math.max(0, i - rayon);
      const b = Math.min(longueur - 1, i + rayon);
      const somme = [0, 0, 0];

      for (let j = a; j <= b; j += 1) {
        const v = valeurs[j];
        somme[0] += v[0];
        somme[1] += v[1];
        somme[2] += v[2];
      }

      const n = b - a + 1;
      lissee[i] = [somme[0] / n, somme[1] / n, somme[2] / n];
    }

    return lissee;
  };

  const pixel = (x, y) => {
    const i = (y * pw + x) * 3;

    return [photo.pixels[i] ?? 0, photo.pixels[i + 1] ?? 0, photo.pixels[i + 2] ?? 0];
  };

  const moyenne = (points) => {
    const somme = [0, 0, 0];

    for (const p of points) {
      somme[0] += p[0];
      somme[1] += p[1];
      somme[2] += p[2];
    }

    return [somme[0] / points.length, somme[1] / points.length, somme[2] / points.length];
  };

  const prof = (limite) => Math.min(profondeur, limite);

  const lignes = {
    haut: lisserLigne(
      Array.from({ length: pw }, (_, x) =>
        moyenne(Array.from({ length: prof(ph) }, (_, d) => pixel(x, d))),
      ),
    ),
    bas: lisserLigne(
      Array.from({ length: pw }, (_, x) =>
        moyenne(Array.from({ length: prof(ph) }, (_, d) => pixel(x, ph - 1 - d))),
      ),
    ),
    gauche: lisserLigne(
      Array.from({ length: ph }, (_, y) =>
        moyenne(Array.from({ length: prof(pw) }, (_, d) => pixel(d, y))),
      ),
    ),
    droite: lisserLigne(
      Array.from({ length: ph }, (_, y) =>
        moyenne(Array.from({ length: prof(pw) }, (_, d) => pixel(pw - 1 - d, y))),
      ),
    ),
  };

  const sortie = new Uint8Array(cote * cote * 3);

  for (let y = 0; y < cote; y += 1) {
    for (let x = 0; x < cote; x += 1) {
      const px = x - gauche;
      const py = y - haut;
      const dedansX = px >= 0 && px < pw;
      const dedansY = py >= 0 && py < ph;
      let valeur;

      if (dedansX && dedansY) {
        valeur = pixel(px, py);
      } else if (!dedansY) {
        const colonne = Math.min(pw - 1, Math.max(0, px));
        valeur = (py < 0 ? lignes.haut : lignes.bas)[colonne];
      } else {
        valeur = (px < 0 ? lignes.gauche : lignes.droite)[py];
      }

      const o = (y * cote + x) * 3;
      sortie[o] = Math.round(valeur[0]);
      sortie[o + 1] = Math.round(valeur[1]);
      sortie[o + 2] = Math.round(valeur[2]);
    }
  }

  return sortie;
}

/**
 * La couleur du papier de la miniature : la moyenne de la bande d'extension, ou,
 * s'il n'y en a pas, de la ligne de bord. C'est la couleur de RÉSERVATION que le
 * composant pose en fond avant le premier octet : celle du carré, pas celle du
 * recadrage de la vue principale (qui comprend le produit).
 */
export function papierDuCarre(carre, cote) {
  const somme = [0, 0, 0];
  let n = 0;

  for (let y = 0; y < cote; y += 1) {
    for (const x of [0, cote - 1]) {
      const o = (y * cote + x) * 3;
      somme[0] += carre[o] ?? 0;
      somme[1] += carre[o + 1] ?? 0;
      somme[2] += carre[o + 2] ?? 0;
      n += 1;
    }
  }

  for (let x = 1; x < cote - 1; x += 1) {
    for (const y of [0, cote - 1]) {
      const o = (y * cote + x) * 3;
      somme[0] += carre[o] ?? 0;
      somme[1] += carre[o + 1] ?? 0;
      somme[2] += carre[o + 2] ?? 0;
      n += 1;
    }
  }

  return { r: Math.round(somme[0] / n), g: Math.round(somme[1] / n), b: Math.round(somme[2] / n) };
}

/* -------------------------------------------------------------------------- */
/* La couture, mesurée sur des octets décodés                                  */
/* -------------------------------------------------------------------------- */

/**
 * LA COUTURE de chaque côté étendu, en niveaux sur 255, sur un carré DÉCODÉ.
 *
 * Elle compare, le long du bord de la photographie, la rangée (ou colonne) de la
 * photographie la plus proche du bord à la rangée étendue qui la touche. La
 * comparaison se fait par FENÊTRES de `reglages.fenetreCouture` points : on
 * moyenne chaque fenêtre sur ses deux rangées, on prend le plus grand écart des
 * trois canaux, et la couture d'un côté est la plus grande de ses fenêtres. Une
 * moyenne sur tout le bord laisserait passer un saut local compensé plus loin ;
 * un écart pixel à pixel mesurerait le grain de la photographie, qui n'est pas
 * une couture.
 *
 * Rend `{ haut, bas, gauche, droite }`, chaque valeur un nombre, ou `null` pour
 * un côté que la photographie touche (il n'y a rien à coudre : une couture
 * absente n'est pas une couture de zéro).
 */
export function coutures(carre, cote, placement, reglages = REGLAGES) {
  const { largeur: pw, hauteur: ph, gauche, haut } = placement;
  const valeur = (x, y, c) => carre[(y * cote + x) * 3 + c] ?? 0;
  const fenetre = reglages.fenetreCouture;

  /** Le plus grand écart de fenêtre le long d'un bord. `a` et `b` donnent le pixel d'une rangée. */
  const mesurer = (longueur, a, b) => {
    let pire = 0;

    for (let debut = 0; debut < longueur; debut += fenetre) {
      const fin = Math.min(longueur, debut + fenetre);
      const n = fin - debut;
      let ecart = 0;

      for (let c = 0; c < 3; c += 1) {
        let sa = 0;
        let sb = 0;

        for (let i = debut; i < fin; i += 1) {
          sa += a(i, c);
          sb += b(i, c);
        }

        ecart = Math.max(ecart, Math.abs(sa / n - sb / n));
      }

      pire = Math.max(pire, ecart);
    }

    return Math.round(pire * 10) / 10;
  };

  return {
    haut:
      haut > 0
        ? mesurer(pw, (i, c) => valeur(gauche + i, haut, c), (i, c) => valeur(gauche + i, haut - 1, c))
        : null,
    bas:
      haut + ph < cote
        ? mesurer(pw, (i, c) => valeur(gauche + i, haut + ph - 1, c), (i, c) => valeur(gauche + i, haut + ph, c))
        : null,
    gauche:
      gauche > 0
        ? mesurer(ph, (i, c) => valeur(gauche, haut + i, c), (i, c) => valeur(gauche - 1, haut + i, c))
        : null,
    droite:
      gauche + pw < cote
        ? mesurer(ph, (i, c) => valeur(gauche + pw - 1, haut + i, c), (i, c) => valeur(gauche + pw, haut + i, c))
        : null,
  };
}
