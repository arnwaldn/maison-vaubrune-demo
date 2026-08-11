import { describe, expect, it } from 'vitest';

import {
  dimensionsAnnonceesParLeNom,
  dimensionsDepuisOctets,
} from '../../scripts/dimensions-image.mjs';

/**
 * LE LECTEUR DE DIMENSIONS, ÉPROUVÉ SUR DES EN-TÊTES DESSINÉS.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi aucune image n'est ouverte ici
 * ---------------------------------------------------------------------------
 *
 * Même doctrine que le détecteur d'étincelle de C14 : `npm run controle` tourne
 * en intégration continue, et sharp n'y est JAMAIS exécuté. Les octets de ces
 * cas sont donc écrits à la main, ce qui a l'avantage de rendre visible la
 * chose même que le lecteur doit savoir traverser — un segment de bourrage, un
 * marqueur sans charge utile, une boîte `ispe` de vignette avant celle de
 * l'image.
 *
 * ---------------------------------------------------------------------------
 * Ce que chaque cas défend, et contre quelle faute
 * ---------------------------------------------------------------------------
 *
 * Ce module est né d'un défaut précis (round 1 de C15) : seize images de
 * partage nommées `partage-1200x630.jpg`, déclarées 1200 × 630 au relevé,
 * annoncées 1200 × 630 dans le HTML, et mesurant 1280 × 710. Il n'existe qu'une
 * façon d'empêcher cela de revenir — ouvrir le fichier —, et une seule façon de
 * faire confiance à ce lecteur-là : l'éprouver sur les formes qui le piègent.
 */

/* -------------------------------------------------------------------------- */
/* Les en-têtes, dessinés octet par octet                                      */
/* -------------------------------------------------------------------------- */

/** Le segment de début de cadre, dont le marqueur est paramétrable. */
function sof(marqueur: number, largeur: number, hauteur: number): Buffer {
  const segment = Buffer.alloc(11);
  segment.writeUInt8(0xff, 0);
  segment.writeUInt8(marqueur, 1);
  segment.writeUInt16BE(9, 2);
  segment.writeUInt8(8, 4);
  segment.writeUInt16BE(hauteur, 5);
  segment.writeUInt16BE(largeur, 7);
  segment.writeUInt8(1, 9);
  segment.writeUInt8(1, 10);

  return segment;
}

/** Un segment quelconque, avec sa longueur — de quoi devoir sauter par-dessus. */
function segment(marqueur: number, charge: Buffer): Buffer {
  const entete = Buffer.alloc(4);
  entete.writeUInt8(0xff, 0);
  entete.writeUInt8(marqueur, 1);
  entete.writeUInt16BE(charge.length + 2, 2);

  return Buffer.concat([entete, charge]);
}

const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

/** La boîte `ispe` d'un ISO-BMFF, avec sa taille annoncée en tête. */
function ispe(largeur: number, hauteur: number, taille = 20): Buffer {
  const boite = Buffer.alloc(20);
  boite.writeUInt32BE(taille, 0);
  boite.write('ispe', 4, 'latin1');
  boite.writeUInt32BE(0, 8);
  boite.writeUInt32BE(largeur, 12);
  boite.writeUInt32BE(hauteur, 16);

  return boite;
}

/** L'en-tête de type de fichier d'un AVIF. */
function ftypAvif(): Buffer {
  const boite = Buffer.alloc(20);
  boite.writeUInt32BE(20, 0);
  boite.write('ftyp', 4, 'latin1');
  boite.write('avif', 8, 'latin1');
  boite.writeUInt32BE(0, 12);
  boite.write('mif1', 16, 'latin1');

  return boite;
}

/* -------------------------------------------------------------------------- */
/* JPEG                                                                        */
/* -------------------------------------------------------------------------- */

describe('lecture des dimensions — JPEG', () => {
  it('lit un début de cadre de base', () => {
    const octets = Buffer.concat([SOI, sof(0xc0, 1200, 630), EOI]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 1200, hauteur: 630 });
  });

  it('lit un début de cadre PROGRESSIF, qui est celui du pipeline', () => {
    /* `mozjpeg` en mode progressif écrit `FF C2`. Un lecteur qui ne
       connaîtrait que `FF C0` ne trouverait la taille d'AUCUNE image de ce
       projet — et rendrait `null`, donc une anomalie, donc un faux échec
       bruyant. Le cas est là pour que le vrai marqueur soit couvert. */
    const octets = Buffer.concat([SOI, sof(0xc2, 640, 1024), EOI]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 640, hauteur: 1024 });
  });

  it('ne confond PAS une table de Huffman avec un début de cadre', () => {
    /* `FF C4` est une table de Huffman ; `FF C8` une extension JPEG ; `FF CC`
       une table arithmétique. Les trois sont dans la plage `C0`-`CF` et
       AUCUNE ne porte de dimensions. Un `Set` mal rempli lirait ici 2 × 3. */
    const huffman = segment(0xc4, Buffer.from([0x00, 0x02, 0x03]));
    const octets = Buffer.concat([SOI, huffman, sof(0xc2, 480, 768), EOI]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 480, hauteur: 768 });
  });

  it('saute par-dessus un segment dont la charge CONTIENT « FF C0 »', () => {
    /* Le piège du parcours naïf : chercher le motif `FF C0` au lieu de suivre
       les longueurs déclarées. Un commentaire ou des données comprimées
       peuvent porter ces deux octets, et le lecteur y lirait des dimensions
       tirées de rien. */
    const piege = segment(0xfe, Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x09, 0x09, 0x09]));
    const octets = Buffer.concat([SOI, piege, sof(0xc0, 320, 512), EOI]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 320, hauteur: 512 });
  });

  it('ignore les octets de bourrage et les marqueurs sans charge utile', () => {
    const octets = Buffer.concat([
      SOI,
      Buffer.from([0xff, 0xff, 0xff, 0x01]),
      sof(0xc1, 96, 96),
      EOI,
    ]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 96, hauteur: 96 });
  });

  it('rend null sur un fichier qui n’est pas un JPEG', () => {
    expect(dimensionsDepuisOctets(Buffer.from('pas une image du tout', 'latin1'))).toBeNull();
  });

  it('rend null sur un JPEG tronqué avant son début de cadre', () => {
    expect(dimensionsDepuisOctets(Buffer.concat([SOI, Buffer.from([0xff, 0xc0])]))).toBeNull();
  });

  it('rend null sur un segment de longueur impossible', () => {
    /* Une longueur inférieure à 2 ferait reculer le parcours, donc boucler
       sans fin. Le lecteur préfère rendre `null` — la garde en fait une
       anomalie, et une anomalie se corrige ; une boucle sans fin bloque une
       intégration continue sans rien dire. */
    const octets = Buffer.concat([SOI, Buffer.from([0xff, 0xe0, 0x00, 0x01]), EOI]);

    expect(dimensionsDepuisOctets(octets)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* AVIF                                                                        */
/* -------------------------------------------------------------------------- */

describe('lecture des dimensions — AVIF', () => {
  it('lit la boîte « ispe »', () => {
    const octets = Buffer.concat([ftypAvif(), ispe(1024, 1638)]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 1024, hauteur: 1638 });
  });

  it('retient la plus GRANDE des boîtes « ispe » quand il y en a plusieurs', () => {
    /* Un AVIF porte souvent une `ispe` par item : l'image, son canal alpha,
       parfois une vignette. Retenir la PREMIÈRE rendrait la taille de la
       vignette le jour où un encodeur en écrirait une avant — c'est-à-dire un
       chiffre faux, ce que ce module existe précisément pour empêcher. */
    const octets = Buffer.concat([ftypAvif(), ispe(64, 64), ispe(640, 1024), ispe(64, 64)]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 640, hauteur: 1024 });
  });

  it('ignore la chaîne « ispe » qui ne serait pas une boîte', () => {
    /* La cohérence est vérifiée : les quatre octets qui précèdent le type
       doivent annoncer une boîte de vingt octets. Sans ce contrôle, les quatre
       lettres rencontrées dans des données comprimées donneraient des
       dimensions inventées — la même faute que `Exif` nu, attrapée en C14. */
    const leurre = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x0c]),
      Buffer.from('ispe', 'latin1'),
      Buffer.alloc(12, 0x7f),
    ]);
    const octets = Buffer.concat([ftypAvif(), leurre, ispe(480, 768)]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 480, hauteur: 768 });
  });

  it('ignore une boîte « ispe » de dimension nulle', () => {
    const octets = Buffer.concat([ftypAvif(), ispe(0, 0), ispe(320, 512)]);

    expect(dimensionsDepuisOctets(octets)).toEqual({ largeur: 320, hauteur: 512 });
  });

  it('rend null sur un AVIF sans aucune boîte « ispe »', () => {
    expect(dimensionsDepuisOctets(Buffer.concat([ftypAvif(), Buffer.alloc(64, 0)]))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Ce que le nom annonce                                                       */
/* -------------------------------------------------------------------------- */

describe('les dimensions annoncées par le nom', () => {
  it('lit les DEUX dimensions d’une image de partage', () => {
    expect(dimensionsAnnonceesParLeNom('partage-1200x630.jpg')).toEqual({
      largeur: 1200,
      hauteur: 630,
    });
  });

  it('ne lit qu’une largeur sur un nom du vocabulaire ordinaire', () => {
    expect(dimensionsAnnonceesParLeNom('principal-640.avif')).toEqual({
      largeur: 640,
      hauteur: null,
    });
  });

  it('rend null quand le nom n’annonce aucun nombre', () => {
    expect(dimensionsAnnonceesParLeNom('manifeste-livre.json')).toBeNull();
  });
});
