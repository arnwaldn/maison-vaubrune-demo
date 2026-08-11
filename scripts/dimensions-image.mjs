/**
 * LES DIMENSIONS D'UNE IMAGE, LUES DANS SES OCTETS — module PUR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE FICHIER EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le round 1 de la tranche C15 a livré seize images de partage nommées
 * `partage-1200x630.jpg`, déclarées `1200 × 630` dans le relevé de livraison,
 * annoncées `width: 1200, height: 630` dans le HTML servi — et mesurant
 * 1280 × 710. Trois affirmations concordantes, aucune mesure. C'est la même
 * faute que la garde de la police mono avait trouvée une tranche plus tôt (un
 * répertoire de 145 points de code pour un fichier qui en portait 143), et
 * c'est celle que ce module ferme : on ne croit plus un nom de fichier, on
 * ouvre le fichier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI SANS sharp
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * sharp sait lire des dimensions en une ligne, et sharp est un OUTIL DE POSTE :
 * il n'est ni dans le graphe d'exécution, ni dans l'intégration continue, et
 * `npm run controle` ne l'appelle jamais (CLAUDE.md, tranche C14). Une garde qui
 * en dépendrait ne tournerait pas en CI, c'est-à-dire ne tournerait pas là où
 * elle sert. Les deux formats livrés par ce projet — JPEG et AVIF — écrivent
 * leurs dimensions à un endroit fixe de leur en-tête ; les lire tient en
 * cinquante lignes, et ces cinquante lignes sont éprouvées par des cas de test.
 *
 * C'est la même doctrine que `metadonnees-binaires.mjs`, qui parcourt déjà les
 * en-têtes des mêmes fichiers à la main.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE CHAQUE FORMAT DIT, ET OÙ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * JPEG — une suite de segments `FF xx`. Le segment de DÉBUT DE CADRE (SOF)
 * porte la hauteur puis la largeur, sur deux octets chacune, aux positions 5 et
 * 7 de sa charge utile. Il y a treize marqueurs SOF possibles (`C0`-`CF` moins
 * `C4`, `C8` et `CC`, qui sont des tables de Huffman, une extension JPEG et une
 * table arithmétique) : les confondre est l'erreur classique, et le mode
 * progressif employé ici écrit `C2` et non `C0`.
 *
 * AVIF — un ISO-BMFF, c'est-à-dire un arbre de boîtes `[taille][type]…`. Les
 * dimensions vivent dans la boîte `ispe` (« image spatial extent »), en deux
 * entiers de quatre octets après un octet de version et trois de drapeaux. Un
 * fichier en porte souvent PLUSIEURS — une par item : l'image, son canal alpha,
 * une éventuelle vignette. On retient la plus grande surface, qui est l'image
 * elle-même ; retenir la première rendrait la dimension d'une miniature le jour
 * où un encodeur en écrirait une avant.
 *
 * Aucune rotation n'est prise en compte (`irot`) : ce projet n'en produit
 * aucune, et une rotation non lue rendrait des dimensions permutées — donc un
 * ÉCHEC bruyant de la garde, jamais un succès silencieux. C'est le bon sens de
 * l'erreur.
 *
 * Usage : `lireDimensions(chemin)` → `{ largeur, hauteur }` ou `null` si le
 * format n'est pas reconnu. `null` n'est pas « tout va bien » : c'est à
 * l'appelant de décider, et la garde des images en fait une anomalie.
 */

import { readFileSync } from 'node:fs';

/** Les marqueurs de début de cadre JPEG. `C4`, `C8` et `CC` n'en sont pas. */
const MARQUEURS_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/**
 * Les dimensions d'un JPEG, ou `null`.
 *
 * Le parcours saute de segment en segment par leur longueur déclarée plutôt que
 * de chercher un motif : un octet `FF C2` peut parfaitement apparaître dans les
 * données comprimées d'un segment précédent, et une recherche naïve le lirait
 * comme un en-tête.
 */
function dimensionsJpeg(octets) {
  if (octets.length < 4 || octets[0] !== 0xff || octets[1] !== 0xd8) {
    return null;
  }

  let position = 2;

  while (position + 3 < octets.length) {
    if (octets[position] !== 0xff) {
      return null;
    }

    const marqueur = octets[position + 1];

    /* Les octets de bourrage `FF` s'ignorent, et les marqueurs sans charge
       utile (`D0`-`D9`, `01`) n'ont pas de longueur à lire. */
    if (marqueur === 0xff) {
      position += 1;
      continue;
    }

    if (marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd9)) {
      position += 2;
      continue;
    }

    const longueur = octets.readUInt16BE(position + 2);

    if (longueur < 2) {
      return null;
    }

    if (MARQUEURS_SOF.has(marqueur)) {
      if (position + 9 > octets.length) {
        return null;
      }

      return {
        hauteur: octets.readUInt16BE(position + 5),
        largeur: octets.readUInt16BE(position + 7),
      };
    }

    position += 2 + longueur;
  }

  return null;
}

/** `true` si les douze premiers octets annoncent un ISO-BMFF de marque AVIF. */
function estAvif(octets) {
  return (
    octets.length >= 12 &&
    octets.toString('latin1', 4, 8) === 'ftyp' &&
    ['avif', 'avis', 'mif1', 'msf1'].includes(octets.toString('latin1', 8, 12))
  );
}

/**
 * Les dimensions d'un AVIF, ou `null`.
 *
 * La boîte `ispe` est cherchée par son TYPE dans le flux d'octets plutôt que
 * par descente de l'arbre : elle vit sous `meta > iprp > ipco`, quatre niveaux
 * dont aucun n'apporte d'information ici, et la chaîne « ispe » suivie d'une
 * taille de boîte cohérente (20 octets) ne se rencontre pas par hasard. La
 * cohérence est VÉRIFIÉE — la taille annoncée quatre octets avant le type doit
 * valoir 20 —, faute de quoi la chaîne serait lue n'importe où.
 */
function dimensionsAvif(octets) {
  let meilleure = null;
  let position = 0;

  for (;;) {
    const trouve = octets.indexOf('ispe', position, 'latin1');

    if (trouve === -1 || trouve < 4 || trouve + 16 > octets.length) {
      return meilleure;
    }

    position = trouve + 4;

    if (octets.readUInt32BE(trouve - 4) !== 20) {
      continue;
    }

    const largeur = octets.readUInt32BE(trouve + 8);
    const hauteur = octets.readUInt32BE(trouve + 12);

    if (largeur === 0 || hauteur === 0) {
      continue;
    }

    if (meilleure === null || largeur * hauteur > meilleure.largeur * meilleure.hauteur) {
      meilleure = { largeur, hauteur };
    }
  }
}

/** `true` si les douze premiers octets annoncent un ISO-BMFF de marque MP4. */
function estMp4(octets) {
  return (
    octets.length >= 12 &&
    octets.toString('latin1', 4, 8) === 'ftyp' &&
    ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'av01'].includes(
      octets.toString('latin1', 8, 12),
    )
  );
}

/**
 * Les dimensions d'un MP4, ou `null` (tranche C19, pour la vidéo du héros).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE LECTURE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Exactement la raison qui a fait écrire ce module en C15 : un nom de fichier
 * annonçait 1200 × 630 et les octets disaient 1280 × 710, sur seize fichiers,
 * pendant toute une tranche, sans que trois écrits d'accord entre eux ne s'en
 * aperçoivent. Une vidéo n'échappe pas à la règle — elle l'aggrave, puisqu'on
 * ne l'ouvre pas au hasard d'une relecture comme on ouvre une image.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA BOÎTE `tkhd`, ET LES DEUX PIÈGES QU'ELLE POSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Même méthode que pour `ispe` : la boîte est cherchée par son TYPE dans le
 * flux plutôt que par descente de l'arbre (`moov > trak > tkhd`, trois niveaux
 * qui n'apprennent rien ici), et la COHÉRENCE est vérifiée — la taille annoncée
 * quatre octets avant le type doit valoir 92 (version 0) ou 104 (version 1),
 * les deux seules tailles que la norme laisse à cette boîte. Sans ce contrôle,
 * les quatre lettres se liraient n'importe où dans un flux compressé.
 *
 * PIÈGE 1 — LA VERSION DÉPLACE TOUT. La version 1 porte ses dates et sa durée
 * sur soixante-quatre bits : le champ `width` glisse de douze octets. On lit
 * donc l'octet de version, on ne le suppose pas.
 *
 * PIÈGE 2 — LES DIMENSIONS SONT EN VIRGULE FIXE 16.16, et non en entiers comme
 * partout ailleurs dans ce fichier. Un lecteur qui l'oublierait annoncerait
 * 83 886 080 points de large pour une vidéo de 1280.
 *
 * Un fichier porte AUTANT de `tkhd` que de pistes, et une piste sonore y écrit
 * des dimensions nulles : on retient la plus grande surface, comme pour les
 * `ispe` multiples d'un AVIF.
 */
function dimensionsMp4(octets) {
  let meilleure = null;
  let position = 0;

  for (;;) {
    const trouve = octets.indexOf('tkhd', position, 'latin1');

    if (trouve === -1 || trouve < 4) {
      return meilleure;
    }

    position = trouve + 4;

    const taille = octets.readUInt32BE(trouve - 4);

    if (taille !== 92 && taille !== 104) {
      continue;
    }

    const version = octets[trouve + 4];
    const debut = trouve - 4 + (version === 1 ? 96 : 84);

    if (debut + 8 > octets.length) {
      continue;
    }

    const largeur = Math.round(octets.readUInt32BE(debut) / 65_536);
    const hauteur = Math.round(octets.readUInt32BE(debut + 4) / 65_536);

    if (largeur === 0 || hauteur === 0) {
      continue;
    }

    if (meilleure === null || largeur * hauteur > meilleure.largeur * meilleure.hauteur) {
      meilleure = { largeur, hauteur };
    }
  }
}

/**
 * Les dimensions du fichier, lues dans ses octets. `null` si le format n'est
 * pas reconnu — l'appelant tranche.
 */
export function lireDimensions(chemin) {
  return dimensionsDepuisOctets(readFileSync(chemin));
}

/** La même lecture, sur un tampon déjà en mémoire (c'est ce que les tests emploient). */
export function dimensionsDepuisOctets(octets) {
  if (estAvif(octets)) {
    return dimensionsAvif(octets);
  }

  if (estMp4(octets)) {
    return dimensionsMp4(octets);
  }

  return dimensionsJpeg(octets);
}

/**
 * LES DIMENSIONS QUE LE NOM ANNONCE, s'il en annonce.
 *
 * Deux formes dans le vocabulaire fermé de `verifier-images.mjs` :
 * `<vue>-<largeur>.<format>` n'annonce qu'une LARGEUR, `partage-1200x630.jpg`
 * annonce les deux. Rendre `null` pour le reste laisse la garde dire « nom hors
 * vocabulaire » sous son propre intitulé, au lieu de le redire ici.
 */
export function dimensionsAnnonceesParLeNom(nom) {
  const complet = /-(\d+)x(\d+)\.[a-z0-9]+$/.exec(nom);

  if (complet !== null) {
    return { largeur: Number(complet[1]), hauteur: Number(complet[2]) };
  }

  /* TROISIÈME FORME, ajoutée en C19 : la vidéo porte son CODEC entre la largeur
     et l'extension (`boucle-1280.av1.mp4`), parce que deux fichiers de même
     largeur et de même conteneur cohabitent — c'est tout l'objet de la double
     source. L'expression à une seule extension ci-dessous ne la voyait pas, et
     un nom que le lecteur ne comprend pas est un nom que personne ne vérifie. */
  const avecCodec = /-(\d+)\.[a-z0-9]+\.[a-z0-9]+$/.exec(nom);

  if (avecCodec !== null) {
    return { largeur: Number(avecCodec[1]), hauteur: null };
  }

  const largeurSeule = /-(\d+)\.[a-z0-9]+$/.exec(nom);

  if (largeurSeule !== null) {
    return { largeur: Number(largeurSeule[1]), hauteur: null };
  }

  return null;
}
