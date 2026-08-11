import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * TRENTE SECONDES, ET NON LES CINQ PAR DÉFAUT.
 *
 * Les cas de ce fichier ne sont pas des tests unitaires : chacun LANCE UN
 * PROCESSUS — démarrer Node, parfois compiler le catalogue TypeScript par
 * `tsx`, parcourir le dépôt, écrire un rapport. Le budget de cinq secondes de
 * Vitest est calibré pour une fonction pure ; il a tenu ici par chance tant que
 * les gardes étaient deux, et il a lâché quand C11 en a ajouté une troisième
 * avec ses treize cas — les processus se disputent alors les mêmes cœurs.
 *
 * Ce délai n'est pas un budget de performance : c'est un filet contre un
 * BLOCAGE (une garde qui attendrait une entrée, un processus qui ne rendrait
 * jamais la main). Il doit donc être assez lâche pour ne jamais se déclencher
 * à tort — un test rouge un jour sur trois, sur un code identique, est pire
 * qu'un test absent.
 */
vi.setConfig({ testTimeout: 30_000 });


/**
 * LA GARDE DES IMAGES ET CELLE DES MÉTADONNÉES, ÉPROUVÉES SUR PIÈCES.
 *
 * ---------------------------------------------------------------------------
 * Même dispositif que les deux gardes précédentes, une différence de forme
 * ---------------------------------------------------------------------------
 *
 * Ce qui compte dans une garde n'est pas ce qu'elle trouve, c'est le CODE DE
 * SORTIE qu'elle rend quand elle trouve : c'est lui, et lui seul, qui arrête
 * `npm run controle`. Les cas ci-dessous lancent donc les scripts pour de vrai
 * sur des dépôts miniatures et lisent leur verdict.
 *
 * La différence : les dépôts miniatures sont CONSTRUITS PAR LE TEST, dans un
 * dossier temporaire, et non versionnés dans `tests/fixtures/` comme ceux de
 * C7 et C8. Trois raisons, et la dernière est la bonne :
 *
 * 1. Le cas « fichier trop lourd » demande un binaire de quarante kilooctets.
 *    Versionner du poids mort pour prouver qu'on refuse le poids mort serait
 *    une plaisanterie que le dépôt paierait à chaque clonage.
 * 2. Le cas « métadonnées » demande un binaire DÉLIBÉRÉMENT piégé. Il ne
 *    ferait échouer aucune garde de production — celles-ci ne parcourent que
 *    `src`, `contenu` et `public`, jamais `tests/`, et le dernier cas de ce
 *    fichier le vérifie explicitement — mais un binaire piégé qui dort dans un
 *    dépôt public finit toujours par être ouvert par quelqu'un qui ne sait pas
 *    ce que c'est.
 * 3. Un octet écrit dans le test SE LIT dans le test. La pièce à conviction et
 *    la raison de sa présence sont sur le même écran, alors qu'un `.jpg`
 *    versionné aurait demandé un `LISEZ-MOI` de plus pour dire ce qu'il
 *    contient — c'est-à-dire un document qui se désynchronise.
 */

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const GARDE_IMAGES = fileURLToPath(new URL('../../scripts/verifier-images.mjs', import.meta.url));
const GARDE_MARQUES = fileURLToPath(
  new URL('../../scripts/verifier-marques-reelles.mjs', import.meta.url),
);
const TSX = fileURLToPath(new URL('../../node_modules/tsx/dist/cli.mjs', import.meta.url));

interface Verdict {
  readonly code: number;
  readonly sortie: string;
}

function lancer(arguments_: readonly string[]): Verdict {
  try {
    const sortie = execFileSync(process.execPath, [...arguments_], {
      cwd: RACINE,
      encoding: 'utf8',
    });
    return { code: 0, sortie };
  } catch (erreur) {
    /* `execFileSync` JETTE quand le code de sortie n'est pas nul : c'est
       précisément le cas qu'on veut observer, pas un incident. */
    const echec = erreur as { status?: number; stdout?: string };
    return { code: echec.status ?? -1, sortie: echec.stdout ?? '' };
  }
}

/** La garde des images passe par `tsx` : elle importe le catalogue TypeScript. */
function lancerGardeImages(base: string): Verdict {
  return lancer([TSX, GARDE_IMAGES, '--base', base]);
}

/** La garde des marques est du Node pur, comme depuis C8. */
function lancerGardeMarques(base?: string): Verdict {
  return base === undefined
    ? lancer([GARDE_MARQUES])
    : lancer([GARDE_MARQUES, '--base', base]);
}

/* -------------------------------------------------------------------------- */
/* Les binaires de pacotille, construits octet par octet                       */
/* -------------------------------------------------------------------------- */

/**
 * Un JPEG SAIN, et le mot « sain » a ici un sens précis : il ne contient aucun
 * des neuf marqueurs de métadonnées. Le remplissage est fait de zéros et non
 * d'octets tirés au sort — quarante kilooctets d'aléa finiraient un jour par
 * former « c2pa. » ou un en-tête TIFF quelque part, et ce test échouerait un
 * mardi sur mille sans que personne comprenne pourquoi.
 *
 * LES DIMENSIONS SONT DEVENUES OBLIGATOIRES (round 1 de C15). Ces fabriques
 * rendaient des binaires sans dimensions lisibles, ce qui suffisait tant que la
 * garde comptait cinq contrôles. Le sixième OUVRE les fichiers : une pièce à
 * conviction qui s'appelle `principal-640` doit vraiment mesurer 640 points de
 * large, sans quoi elle ferait échouer la garde pour une raison qui n'est pas
 * celle que son test observe. La valeur par défaut est 320 — la largeur de la
 * plupart des cas de ce fichier ; les autres la passent explicitement.
 */
function jpegNu(octets: number, largeur = 320, hauteur = 512): Buffer {
  const debut = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const jfif = Buffer.from('JFIF\0\0\0\0\0\0', 'latin1');
  const fin = Buffer.from([0xff, 0xd9]);
  const bourrage = Buffer.alloc(
    Math.max(0, octets - debut.length - jfif.length - TAILLE_SOF - fin.length),
    0x00,
  );

  return Buffer.concat([debut, jfif, sofJpeg(largeur, hauteur), bourrage, fin]);
}

/** La longueur du segment ci-dessous, retirée du bourrage pour tenir le poids visé. */
const TAILLE_SOF = 11;

/**
 * UN SEGMENT DE DÉBUT DE CADRE, en mode PROGRESSIF (`FF C2`).
 *
 * Le progressif est celui que le pipeline produit (`mozjpeg`), et c'est aussi le
 * piège classique du lecteur de dimensions : un parcours qui ne connaîtrait que
 * `FF C0` ne trouverait jamais la taille des images de ce projet. La pièce à
 * conviction porte donc le marqueur réel.
 */
function sofJpeg(largeur: number, hauteur: number): Buffer {
  const segment = Buffer.alloc(TAILLE_SOF);
  segment.writeUInt8(0xff, 0);
  segment.writeUInt8(0xc2, 1);
  segment.writeUInt16BE(9, 2);
  segment.writeUInt8(8, 4);
  segment.writeUInt16BE(hauteur, 5);
  segment.writeUInt16BE(largeur, 7);
  segment.writeUInt8(1, 9);
  segment.writeUInt8(1, 10);

  return segment;
}

/** La boîte `ispe` d'un ISO-BMFF : `[20][ispe][version + drapeaux][largeur][hauteur]`. */
function ispeAvif(largeur: number, hauteur: number): Buffer {
  const boite = Buffer.alloc(20);
  boite.writeUInt32BE(20, 0);
  boite.write('ispe', 4, 'latin1');
  boite.writeUInt32BE(0, 8);
  boite.writeUInt32BE(largeur, 12);
  boite.writeUInt32BE(hauteur, 16);

  return boite;
}

/** Une image AVIF de pacotille : l'en-tête de type de fichier, et son `ispe`. */
function avifNu(octets: number, largeur = 320, hauteur = 512): Buffer {
  const entete = Buffer.from('\0\0\0ftypavifavifmif1miaf', 'latin1');
  const ispe = ispeAvif(largeur, hauteur);
  const bourrage = Buffer.alloc(Math.max(0, octets - entete.length - ispe.length), 0x00);

  return Buffer.concat([entete, ispe, bourrage]);
}

/**
 * LE MÊME JPEG, AVEC SON PAQUET XMP — la pièce à conviction centrale.
 *
 * C'est, à quelques champs près, ce qu'un moteur d'images dépose dans le
 * fichier qu'il produit : un paquet XMP en clair, en tête, contenant la
 * consigne qui a engendré l'image. La consigne écrite ici est neutre, et c'est
 * volontaire — ce que la garde refuse est le CONTENANT, pas son contenu. Il
 * suffirait que la consigne d'une vraie livraison cite une maison qui existe
 * pour que la promesse des mentions légales soit rompue par un canal qu'aucune
 * garde de texte ne regardait.
 */
const PAQUET_XMP =
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
  '<x:xmpmeta xmlns:x="adobe:ns:meta/">' +
  '<rdf:RDF><rdf:Description>' +
  '<dc:description>bouteille d’huile sur fond de lin, lumière rasante</dc:description>' +
  '</rdf:Description></rdf:RDF>' +
  '</x:xmpmeta><?xpacket end="w"?>';

function jpegAvecXmp(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    Buffer.from(PAQUET_XMP, 'latin1'),
    /* Le début de cadre est là pour que cette pièce n'ait qu'UN défaut : sans
       lui, le sixième contrôle se plaindrait aussi de dimensions illisibles, et
       le test observerait deux causes en croyant n'en observer qu'une. */
    sofJpeg(320, 512),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/**
 * UN PNG DONT LES MÉTADONNÉES SONT EN QUEUE — le cas que la tête ne voit pas.
 *
 * Ce n'est pas une curiosité de laboratoire : le format PNG autorise `eXIf`,
 * `iTXt` et `caBX` APRÈS le bloc `IDAT`, et le format WebP RECOMMANDE de
 * placer `EXIF` et `XMP ` à la fin du conteneur RIFF. Une garde qui ne lit que
 * la tête laisse donc passer les deux encodeurs les plus probables de notre
 * chaîne. Le fichier fait 200 Ko pour que les deux fenêtres de 64 Ko ne se
 * recouvrent pas — sans quoi le test passerait pour la mauvaise raison.
 */
function pngMetadonneesEnQueue(): Buffer {
  /* La signature PNG, en OCTETS et non en echappements : elle contient un
     retour chariot et un saut de ligne. Ecrite en chaine litterale, elle se
     fait reecrire par le premier outil qui normalise des fins de ligne — et
     `.gitattributes` en normalise justement. En octets, elle traverse tout. */
  const entete = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const bourrage = Buffer.alloc(200_000 - entete.length - PAQUET_XMP.length, 0x00);

  return Buffer.concat([entete, bourrage, Buffer.from(PAQUET_XMP, 'latin1')]);
}

/**
 * UN JPEG QUI CONTIENT LE MOT « Exif » SANS ÊTRE UN SEGMENT Exif.
 *
 * La pièce à conviction de la revue : quatre octets donnés apparaissent au
 * hasard dans des données compressées avec une probabilité qui, multipliée par
 * les centaines de fichiers du train C12-C19, devient une quasi-certitude. Le
 * marqueur est donc ancré sur `Exif\0\0`, la signature complète d'un segment
 * APP1. Ce fichier-ci porte le mot nu, suivi de tout autre chose : il doit
 * PASSER.
 */
function jpegAvecLeMotExif(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from([0x4a, 0x46, 0x49, 0x46, 0x00]),
    Buffer.from('Exif-comme-suite-d-octets-quelconque', 'latin1'),
    Buffer.alloc(2_000, 0x00),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/**
 * UN PNG QUI PORTE UN CHUNK `eXIf` — le porteur que « Exif\0\0 » ne voit pas.
 *
 * Un chunk PNG s'écrit `<longueur:4> <type:4> <données> <CRC:4>`, et la charge
 * d'un chunk `eXIf` est le flux TIFF **NU** : elle commence directement par
 * `II*\0` (petit-boutien) ou `MM\0*` (gros-boutien). Le préfixe `Exif\0\0`,
 * lui, appartient au segment APP1 des JPEG et n'apparaît NULLE PART ici.
 *
 * C'est exactement le cas que la tête du fichier `metadonnees-binaires.mjs`
 * invoque pour justifier la lecture de la queue — il fallait encore que le
 * détecteur sache le reconnaître quand il tombe dessus.
 */
function pngAvecChunkExif(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  /* En-tête TIFF petit-boutien, suivi du décalage de la première IFD. */
  const charge = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(charge.length);

  return Buffer.concat([
    signature,
    /* Ce qui tiendrait lieu d'en-tête et de données d'image : le chunk `eXIf`
       est autorisé APRÈS `IDAT`, et c'est là que les encodeurs le posent. */
    Buffer.alloc(2_000, 0x00),
    longueur,
    Buffer.from('eXIf', 'latin1'),
    charge,
    Buffer.alloc(4, 0x00),
  ]);
}

/**
 * UN WEBP QUI PORTE UN TRONÇON `EXIF` — même charge nue, autre conteneur.
 *
 * Un conteneur RIFF s'écrit `RIFF <taille:4 petit-boutien> WEBP`, puis une
 * suite de tronçons `<FourCC:4> <taille:4 petit-boutien> <charge>`. Le format
 * RECOMMANDE de placer `EXIF` en fin de conteneur, et sa charge est le même
 * flux TIFF nu — ici en GROS-BOUTIEN, pour que les deux variantes d'en-tête
 * soient couvertes par les deux cas réunis.
 *
 * Noter les QUATRE octets de taille qui séparent le FourCC de la charge : ils
 * font que `EXIF` n'est jamais collé à `MM\0*` dans un fichier réel.
 */
function webpAvecTronconExif(): Buffer {
  const chargeExif = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
  const tailleExif = Buffer.alloc(4);
  tailleExif.writeUInt32LE(chargeExif.length);

  const chargeImage = Buffer.alloc(64, 0x00);
  const tailleImage = Buffer.alloc(4);
  tailleImage.writeUInt32LE(chargeImage.length);

  const troncons = Buffer.concat([
    Buffer.from('VP8 ', 'latin1'),
    tailleImage,
    chargeImage,
    Buffer.from('EXIF', 'latin1'),
    tailleExif,
    chargeExif,
  ]);

  const tailleRiff = Buffer.alloc(4);
  tailleRiff.writeUInt32LE(4 + troncons.length);

  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    tailleRiff,
    Buffer.from('WEBP', 'latin1'),
    troncons,
  ]);
}

/**
 * UNE SUPERBOÎTE JUMBF — dont le type est `jumb`, et jamais `jumbf`.
 *
 * Une boîte ISO-BMFF s'écrit `<longueur:4> <type:4> <charge>`. Le type de la
 * superboîte JUMBF fait QUATRE lettres, `jumb`, et son premier enfant est
 * toujours une boîte de description de type `jumd` — la norme l'impose. La
 * chaîne « jumbf » ne se rencontre donc dans aucun fichier réel : la chercher
 * revenait à ne rien chercher.
 */
function jpegAvecSuperboiteJumbf(): Buffer {
  const description = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x19]),
    Buffer.from('jumd', 'latin1'),
    /* Le type de contenu, en UUID, puis l'octet de bascules. */
    Buffer.alloc(16, 0x00),
    Buffer.from([0x03]),
  ]);
  const superboite = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x21]),
    Buffer.from('jumb', 'latin1'),
    description,
  ]);

  return Buffer.concat([
    /* APP11, le segment JPEG qui transporte le JUMBF. */
    Buffer.from([0xff, 0xd8, 0xff, 0xeb]),
    superboite,
    Buffer.alloc(1_000, 0x00),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/**
 * UN AVIF QUI PORTE UN `infe` DE TYPE `Exif` — À NOM D'ITEM NON VIDE.
 *
 * ---------------------------------------------------------------------------
 * Le cas que la couverture INCIDENTE laissait passer, et pourquoi il est ici
 * ---------------------------------------------------------------------------
 *
 * Un AVIF est un fichier ISO-BMFF : ses métadonnées Exif ne sont pas un
 * segment, ce sont DEUX choses distinctes — une DÉCLARATION dans la table des
 * items (`meta` → `iinf` → `infe`) et une CHARGE ailleurs (`mdat`). La
 * déclaration s'écrit :
 *
 *   <longueur:4> `infe` <version:1><drapeaux:3> <item_ID> <protection:2>
 *   <item_type:4 = « Exif »> <item_name: chaîne terminée par un octet nul>
 *
 * `item_ID` fait DEUX octets en version 2 et QUATRE en version 3 : entre
 * `infe` et `Exif` il y a donc 8 ou 10 octets, jamais autre chose. C'est la
 * seule constante exploitable, et c'est celle que le marqueur ancre.
 *
 * Ce qui rendait la couverture actuelle INCIDENTE : libavif, libheif, sharp et
 * ImageMagick écrivent tous un `item_name` VIDE, c'est-à-dire l'octet nul seul.
 * La suite lue est alors « Exif » + `\0` + le premier octet de longueur de la
 * boîte suivante, qui vaut zéro sur toute boîte de moins de 16 Mo — soit
 * `Exif\0\0`, le marqueur du segment APP1 des JPEG, formé par ACCIDENT
 * D'ADJACENCE. La garde attrapait donc le cas courant sans l'avoir voulu, et
 * un encodeur qui nommerait son item (« Exif », « exif data », un identifiant
 * de bibliothèque) sortait du champ sans rien changer d'autre.
 *
 * Ce fichier-ci est cet encodeur : `item_name` non vide, aucun `Exif\0\0` nulle
 * part. Il doit ÉCHOUER — il passait avant le réancrage.
 */
function avifAvecInfeExif(version: 2 | 3): Buffer {
  /* `item_ID` : deux octets en version 2, quatre en version 3. C'est LA
     différence entre les deux versions à cet endroit, et la raison pour
     laquelle le marqueur saute un intervalle et non un nombre fixe. */
  const identifiant = Buffer.alloc(version === 2 ? 2 : 4, 0x00);
  identifiant.writeUIntBE(1, identifiant.length - 1, 1);

  const corps = Buffer.concat([
    Buffer.from([version, 0x00, 0x00, 0x00]),
    identifiant,
    Buffer.from([0x00, 0x00]),
    Buffer.from('Exif', 'latin1'),
    /* LE NOM D'ITEM, NON VIDE : c'est tout l'objet du cas. Avec un nom vide,
       « Exif\0 » suivi du zéro de longueur suivant reformerait « Exif\0\0 » et
       le marqueur JPEG attraperait le fichier pour la mauvaise raison. */
    Buffer.from('Exif data\0', 'latin1'),
  ]);

  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(corps.length + 8);

  const infe = Buffer.concat([longueur, Buffer.from('infe', 'latin1'), corps]);

  return Buffer.concat([
    Buffer.from('\0\0\0 ftypavifavifmif1miaf', 'latin1'),
    Buffer.from('\0\0\0(meta\0\0\0\0', 'latin1'),
    infe,
    Buffer.alloc(2_000, 0x00),
  ]);
}

/**
 * UN BINAIRE QUI PORTE LES MOTS « infe » ET « Exif », SANS LA STRUCTURE.
 *
 * Le pendant négatif du cas précédent, sur le modèle de `jpegAvecLeMotExif` :
 * les deux mots sont là, mais séparés par vingt octets au lieu des huit ou dix
 * qu'impose la boîte. Sans cet écart mesuré, on n'aurait pas ancré une
 * structure — on aurait juste cherché deux mots dans le même fichier, ce qui
 * ramène l'arithmétique là où la revue de C11 refusait de la laisser.
 */
function avifAvecLesMotsInfeEtExif(): Buffer {
  return Buffer.concat([
    Buffer.from('\0\0\0 ftypavifavifmif1miaf', 'latin1'),
    Buffer.from('infe', 'latin1'),
    Buffer.from('--vingt-octets-ici--', 'latin1'),
    Buffer.from('Exif-nom-quelconque', 'latin1'),
    Buffer.alloc(2_000, 0x00),
  ]);
}

/**
 * UN BINAIRE QUI CONTIENT LE MOT « jumbf » SANS PORTER DE BOÎTE.
 *
 * Le pendant de `jpegAvecLeMotExif` pour le nouvel ancrage : ce qui remplace
 * la chaîne « jumbf » est `jumb`, quatre octets de longueur, `jumd` — huit
 * octets contraints, donc la même arithmétique en 2⁻⁶⁴ que le reste. Ce
 * fichier-ci porte le mot et rien de la structure : il doit PASSER.
 */
function jpegAvecLeMotJumbf(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from('jumbf-comme-suite-d-octets-quelconque', 'latin1'),
    Buffer.alloc(2_000, 0x00),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Le dépôt miniature                                                          */
/* -------------------------------------------------------------------------- */

const temporaires: string[] = [];

/** Crée un dépôt jetable et y écrit les fichiers demandés, chemin par chemin. */
function depot(fichiers: Readonly<Record<string, Buffer | string>>): string {
  const base = mkdtempSync(join(tmpdir(), 'maison-vaubrune-images-'));
  temporaires.push(base);

  for (const [relatif, contenu] of Object.entries(fichiers)) {
    const absolu = join(base, ...relatif.split('/'));
    mkdirSync(join(absolu, '..'), { recursive: true });
    writeFileSync(absolu, contenu);
  }

  return base;
}

afterEach(() => {
  while (temporaires.length > 0) {
    const base = temporaires.pop();

    if (base !== undefined) {
      rmSync(base, { recursive: true, force: true });
    }
  }
});

/* Deux slugs RÉELS du catalogue. La garde les lit dans `src/donnees/catalogue.ts`
   du vrai dépôt — c'est elle qui dit ce qui est un slug, pas la fixture. */
const SLUG = 'miel-chataignier';
const AUTRE_SLUG = 'huile-olive-premiere-pression';

/* -------------------------------------------------------------------------- */

describe('garde des images produit', () => {
  it('passe en le disant quand aucune image n’est livrée', () => {
    const verdict = lancerGardeImages(depot({ 'public/formulaire.txt': 'sans importance' }));

    expect(verdict.code).toBe(0);
    expect(verdict.sortie).toContain('aucune image livrée');
  });

  it('laisse passer un dossier d’images conforme', () => {
    const base = depot({
      [`public/produits/${SLUG}/principal-320.avif`]: avifNu(8_000),
      [`public/produits/${SLUG}/principal-640.avif`]: avifNu(40_000, 640, 1024),
      [`public/produits/${SLUG}/principal-640.jpg`]: jpegNu(60_000, 640, 1024),
      [`public/produits/${SLUG}/ambiance-1024.avif`]: avifNu(120_000, 1024, 1638),
      [`public/produits/${SLUG}/partage-1200x630.jpg`]: jpegNu(90_000, 1200, 630),
      [`public/produits/${AUTRE_SLUG}/principal-320.avif`]: avifNu(9_000),
      'public/produits/manifeste-livre.json': JSON.stringify({
        fichiers: [
          `${SLUG}/principal-320.avif`,
          `${SLUG}/principal-640.avif`,
          `${SLUG}/principal-640.jpg`,
          `${SLUG}/ambiance-1024.avif`,
          `${SLUG}/partage-1200x630.jpg`,
          `${AUTRE_SLUG}/principal-320.avif`,
        ],
      }),
    });

    const verdict = lancerGardeImages(base);

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
    /* Les SIX contrôles de l'espace « produits » ont bien tourné, et pas
       seulement le premier ; le septième est celui de l'espace « editorial »,
       absent de ce dépôt miniature, qui passe en le disant. */
    expect(verdict.sortie).toContain('7 contrôles');
    expect(verdict.sortie).toContain('6 binaire(s) examiné(s)');
    /* Et le sixième a bien OUVERT les six fichiers, au lieu de croire leurs
       noms : c'est la seule ligne qui distingue une mesure d'une déclaration. */
    expect(verdict.sortie).toContain('6 fichier(s) mesuré(s) sur leurs octets');
  });

  it('échoue sur un dossier qui n’est pas un slug du catalogue', () => {
    const verdict = lancerGardeImages(
      depot({ 'public/produits/huile-de-noix/principal-320.avif': avifNu(5_000) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('n’est pas un slug exact du catalogue');
    expect(verdict.sortie).toContain('huile-de-noix');
    /* Le nom du fichier, lui, est conforme : un seul contrôle doit tomber. */
    expect(verdict.sortie).toContain('1 en échec');
  });

  /* ------------------------------------------------------------------------ */
  /* L'espace éditorial, ouvert en C15                                         */
  /* ------------------------------------------------------------------------ */

  it('laisse passer un dossier éditorial conforme — famille et clef déclarée', () => {
    const base = depot({
      'public/editorial/infusions/macro-640.avif': avifNu(20_000, 640, 360),
      'public/editorial/accueil/hero-1440.avif': avifNu(30_000, 1440, 810),
      'public/editorial/manifeste-livre.json': JSON.stringify({
        fichiers: ['infusions/macro-640.avif', 'accueil/hero-1440.avif'],
      }),
    });

    const verdict = lancerGardeImages(base);

    expect(verdict.code).toBe(0);
    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.sortie).toContain('2 dossier(s) conforme(s)');
  });

  it('échoue sur un dossier éditorial qui n’est ni une famille ni une clef déclarée', () => {
    const verdict = lancerGardeImages(
      depot({ 'public/editorial/bandeau-promo/macro-640.avif': avifNu(5_000, 640, 360) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('bandeau-promo');
    expect(verdict.sortie).toContain('clef éditoriale déclarée');
  });

  /**
   * LES DEUX VOCABULAIRES NE SE MÉLANGENT PAS, et c'est la raison d'être de la
   * séparation en deux espaces : une macro dans un dossier de produit serait un
   * fichier qu'aucune fiche ne sait composer, et un packshot dans l'éditorial un
   * fichier qu'aucune page ne sait nommer.
   */
  it('refuse une vue éditoriale dans l’espace des produits, et l’inverse', () => {
    const cote = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/macro-640.avif`]: avifNu(5_000, 640, 360) }),
    );

    expect(cote.code).toBe(1);
    expect(cote.sortie).toContain('hors vocabulaire');
    expect(cote.sortie).toContain('macro-640.avif');

    const autre = lancerGardeImages(
      depot({ 'public/editorial/infusions/principal-320.avif': avifNu(5_000) }),
    );

    expect(autre.code).toBe(1);
    expect(autre.sortie).toContain('hors vocabulaire');
    expect(autre.sortie).toContain('principal-320.avif');
  });

  it('échoue sur un nom de fichier hors vocabulaire', () => {
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-2.jpg`]: jpegNu(5_000) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('hors vocabulaire');
    expect(verdict.sortie).toContain('principal-2.jpg');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue sur un fichier au-delà de son plafond de poids', () => {
    /* `principal-320` plafonne à 30 Ko (décision D36) ; celui-ci en pèse 40. */
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-320.jpg`]: jpegNu(40 * 1024) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('pour un plafond de 30 Ko');
    expect(verdict.sortie).toContain('principal-320.jpg');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue sur un format livré sans plafond déclaré', () => {
    /* `principal-1440` appartient au vocabulaire mais n'a pas de plafond : la
       garde le REFUSE au lieu de le laisser passer non pesé. C'est le contraire
       du réflexe habituel, et c'est le point. */
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-1440.avif`]: avifNu(5_000, 1440, 2304) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('aucun plafond déclaré');
    expect(verdict.sortie).toContain('principal-1440');
  });

  it('échoue dans les DEUX sens sur un manifeste qui ment', () => {
    const base = depot({
      [`public/produits/${SLUG}/principal-320.avif`]: avifNu(5_000),
      'public/produits/manifeste-livre.json': JSON.stringify({
        fichiers: [`${SLUG}/principal-640.avif`],
      }),
    });

    const verdict = lancerGardeImages(base);

    expect(verdict.code).toBe(1);
    /* Sens 1 : annoncé, jamais livré. */
    expect(verdict.sortie).toContain('absent du disque');
    /* Sens 2 : livré, jamais annoncé. */
    expect(verdict.sortie).toContain('orphelin');
  });

  it('échoue sur un binaire qui porte ses métadonnées', () => {
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-320.jpg`]: jpegAvecXmp() }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('<x:xmpmeta');
    expect(verdict.sortie).toContain('le contenant habituel du texte de consigne');
  });

  /* ------------------------------------------------------------------------ */
  /* Le sixième contrôle — les dimensions, lues sur les octets (round 1 de C15) */
  /* ------------------------------------------------------------------------ */

  it('échoue quand le fichier ne mesure pas la largeur que son nom annonce', () => {
    /* Le défaut du round 1, réduit à sa forme minimale : un nom qui promet une
       chose et des octets qui en disent une autre. Aucun des cinq contrôles
       précédents ne pouvait le voir — le dossier est un slug, le nom est du
       vocabulaire, le relevé est absent, le poids tient, le binaire est nu. */
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-640.avif`]: avifNu(20_000, 512, 819) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('le nom annonce 640 points de large');
    expect(verdict.sortie).toContain('le fichier en mesure 512');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue quand une image de partage n’est pas au format que son nom promet', () => {
    /* Le cas RÉEL : 1280 × 710 sous un nom qui dit 1200 × 630, exactement ce que
       le double `resize()` du pipeline produisait. */
    const verdict = lancerGardeImages(
      depot({
        [`public/produits/${SLUG}/partage-1200x630.jpg`]: jpegNu(30_000, 1280, 710),
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('le nom annonce 1200 points de large');
    expect(verdict.sortie).toContain('le nom annonce 630 points de haut');
  });

  it('échoue quand le relevé DÉCLARE des dimensions que le fichier n’a pas', () => {
    /* La seconde moitié du contrôle, et la plus insidieuse : ici le nom ne
       promet rien de faux — c'est le RELEVÉ qui recopie une intention. Un
       lecteur du relevé (le HTML servi, un rapport, une revue) hériterait du
       chiffre sans jamais toucher le fichier. */
    const verdict = lancerGardeImages(
      depot({
        [`public/produits/${SLUG}/principal-320.avif`]: avifNu(8_000, 320, 512),
        'public/produits/manifeste-livre.json': JSON.stringify({
          fichiers: [`${SLUG}/principal-320.avif`],
          derives: [
            { fichier: `${SLUG}/principal-320.avif`, largeur: 320, hauteur: 999 },
          ],
        }),
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('déclare 320×999');
    expect(verdict.sortie).toContain('qui mesure 320×512');
    /* Le contrôle 3 est vert — le relevé et le disque disent bien la même
       chose sur la LISTE des fichiers. C'est la mesure qui diverge. */
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue sur un binaire dont les dimensions sont illisibles', () => {
    const verdict = lancerGardeImages(
      depot({
        [`public/produits/${SLUG}/principal-320.jpg`]: Buffer.alloc(4_000, 0x00),
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('dimensions illisibles');
  });

  it('ne reproche AUCUNE dimension à un nom hors vocabulaire', () => {
    /* `principal-2.jpg` se termine par un nombre, mais ce n'est pas une
       largeur : c'est un nom que le contrôle 2 refuse déjà. Le sixième doit se
       taire, sans quoi une seule faute ferait tomber deux contrôles et
       enverrait chercher deux défauts. */
    const verdict = lancerGardeImages(
      depot({ [`public/produits/${SLUG}/principal-2.jpg`]: jpegNu(5_000, 320, 512) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('1 en échec');
    expect(verdict.sortie).toContain('hors vocabulaire');
    expect(verdict.sortie).not.toContain('le nom annonce 2 points de large');
  });
});

describe('contrôle des métadonnées, dans la garde des marques', () => {
  it('échoue sur une image porteuse d’un paquet XMP', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.jpg`]: jpegAvecXmp() }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Aucune métadonnée dans les binaires images');
    expect(verdict.sortie).toContain('<x:xmpmeta');
    /* Le TEXTE du dépôt miniature est propre et son nom de fichier aussi :
       seul le contrôle des métadonnées doit tomber. C'est ce qui prouve que le
       nouveau contrôle est réellement distinct des six autres. */
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('laisse passer des binaires nus', () => {
    const verdict = lancerGardeMarques(
      depot({
        [`public/produits/${SLUG}/principal-640.jpg`]: jpegNu(20_000, 640, 1024),
        [`public/produits/${SLUG}/ambiance-1024.avif`]: avifNu(30_000, 1024, 1638),
      }),
    );

    expect(verdict.sortie).toContain('2 binaire(s) examiné(s)');
    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('attrape un marqueur placé en QUEUE de fichier', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/ambiance-1440.png`]: pngMetadonneesEnQueue() }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('<x:xmpmeta');
    /* La position annoncée est un décalage RÉEL depuis le début du fichier, et
       non un index dans la fenêtre : elle doit donc dépasser les 64 Ko de tête,
       sans quoi le message enverrait chercher au mauvais endroit. */
    const position = /à l’octet (\d+)/.exec(verdict.sortie)?.[1] ?? '0';
    expect(Number(position)).toBeGreaterThan(64 * 1024);
  });

  it('ne se déclenche PAS sur le mot « Exif » nu', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.jpg`]: jpegAvecLeMotExif() }),
    );

    /* Le marqueur est ancré sur « Exif\0\0 », la signature complète d'un
       segment APP1. Sans cet ancrage, ce fichier échouerait — et avec lui un
       fichier sur quelques milliers, au hasard des octets compressés. */
    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('attrape un chunk PNG « eXIf » à charge TIFF nue', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/ambiance-1024.png`]: pngAvecChunkExif() }),
    );

    /* Aucun « Exif\0\0 » dans ce fichier : le porteur est le TYPE DE CHUNK
       suivi de l'en-tête TIFF. Un détecteur qui ne cherche que la signature
       APP1 des JPEG passe à côté de tous les PNG du train C12-C19. */
    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('eXIf');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('attrape un tronçon WebP « EXIF » à charge TIFF nue', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.webp`]: webpAvecTronconExif() }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('EXIF');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('attrape une superboîte JUMBF, dont le type fait quatre lettres', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.jpg`]: jpegAvecSuperboiteJumbf() }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('jumb');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('attrape un `infe` AVIF de type Exif à nom d’item NON VIDE (version 2)', () => {
    /* LE CAS QUI MOTIVE LA TRANCHE. C14 livre les premiers `.avif` du dépôt :
       la garde doit les voir AVANT qu'ils existent, et les voir POUR LA BONNE
       RAISON. Avant le réancrage, ce fichier passait — non parce qu'il était
       propre, mais parce que l'unique marqueur capable de l'attraper
       (« Exif\0\0 ») dépend d'un nom d'item vide, c'est-à-dire d'une habitude
       d'encodeur et non d'une règle de format. */
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.avif`]: avifAvecInfeExif(2) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('infe');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('attrape le même `infe` en version 3, où l’identifiant fait quatre octets', () => {
    /* Deux octets de plus entre `infe` et `Exif`. Un marqueur qui sauterait un
       nombre FIXE couvrirait une version et manquerait l'autre — l'intervalle
       8-10 est la forme juste, et ce cas est ce qui l'atteste. */
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.avif`]: avifAvecInfeExif(3) }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('infe');
  });

  it('ne se déclenche PAS sur « infe » et « Exif » sans la structure', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.avif`]: avifAvecLesMotsInfeEtExif() }),
    );

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('ne se déclenche PAS sur le mot « jumbf » nu', () => {
    const verdict = lancerGardeMarques(
      depot({ [`public/produits/${SLUG}/principal-640.jpg`]: jpegAvecLeMotJumbf() }),
    );

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('ne parcourt jamais tests/, où dorment les pièces à conviction', () => {
    /* `tests/fixtures/marques-reelles/marque-dans-une-fiche/` contient une
       marque réelle, écrite exprès depuis C8. Si le périmètre des gardes de
       production s'élargissait un jour à `tests/`, le dépôt échouerait sur ses
       propres pièces à conviction — et quelqu'un finirait par les affaiblir
       plutôt que de restreindre le périmètre. Ce cas tient la porte fermée. */
    const verdict = lancerGardeMarques();

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.sortie).not.toContain('tests/fixtures');
    expect(verdict.code).toBe(0);
  });
});
