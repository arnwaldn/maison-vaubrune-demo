/**
 * LA DÉTECTION DE MÉTADONNÉES DANS UN BINAIRE IMAGE — pièce partagée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE CONTRÔLE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La garde des marques (tranche C8) lit le TEXTE du dépôt : les fiches, les
 * décisions, les modèles de courriels, les noms de fichiers. Elle est aveugle
 * aux binaires, et elle avait raison de l'être tant que le dépôt n'en portait
 * aucun.
 *
 * La décision D35 (visuels engendrés) ouvre ce canal, et il n'est pas
 * théorique : les moteurs d'images écrivent couramment, dans les métadonnées
 * du fichier qu'ils produisent, LE TEXTE DE LA CONSIGNE qui l'a engendré —
 * en XMP, en Exif, ou dans un manifeste de provenance C2PA. Une image
 * visuellement irréprochable peut donc transporter, en clair et invisible à
 * l'œil, une phrase citant une maison qui existe. C'est-à-dire exactement ce
 * que la garde des marques empêche depuis C8, contournée par une porte qu'elle
 * ne regardait pas.
 *
 * S'y ajoutent deux motifs plus ordinaires et tout aussi valables : les
 * métadonnées pèsent (plusieurs kilooctets pour un manifeste de provenance,
 * sur un budget d'image compté en dizaines), et elles peuvent porter des
 * données personnelles — nom d'auteur, logiciel, coordonnées de prise de vue —
 * que la garde d'honnêteté ne saurait pas davantage lire.
 *
 * La règle est donc simple et sans nuance : **les binaires livrés sont NUS.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI EST CHERCHÉ : DES MARQUEURS ANCRÉS, JAMAIS DES MOTS DE QUATRE LETTRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dix marqueurs, choisis parce qu'ils identifient un CONTENANT de métadonnées
 * et non son contenu — chercher des marques dans une image reviendrait à
 * refaire la garde des marques sur des octets compressés, ce qui ne marche
 * pas. On refuse le contenant : s'il n'y a pas de wagon, il n'y a rien dedans.
 *
 * La première rédaction cherchait `Exif`, `jumb` et `c2pa` NUS. C'est une
 * faute d'arithmétique, et elle a été relevée en revue avant d'avoir coûté
 * quoi que ce soit. Quatre octets donnés apparaissent au hasard dans des
 * données compressées avec une probabilité d'environ 2⁻³² par position ; sur
 * 128 Ko lus, cela fait ~3 × 10⁻⁵ par marqueur et par fichier, soit près de
 * 10⁻⁴ pour les trois — et le train C12-C19 va livrer des centaines de
 * fichiers. Une garde qui se déclenche à tort une fois est une garde qu'on
 * désactive ; c'est écrit noir sur blanc en tête de la garde des marques, et
 * cela vaut pour celle-ci.
 *
 * La deuxième rédaction a corrigé l'arithmétique et PERDU la couverture, ce
 * qui n'est pas un progrès. Elle allongeait les chaînes au lieu d'ancrer les
 * structures : `Exif\0\0` est le préfixe du segment APP1 des **JPEG** et de
 * personne d'autre, alors que la section suivante de ce fichier fait
 * précisément des PNG et des WebP l'argument central de la lecture de queue.
 * Or un chunk PNG `eXIf` et un tronçon WebP `EXIF` portent la charge TIFF
 * **NUE**, sans préfixe : ni l'un ni l'autre n'était plus vu. De même, le type
 * de la superboîte JUMBF fait QUATRE lettres, `jumb` — la chaîne `jumbf`
 * n'apparaît dans aucun fichier réel, et la chercher revenait à ne rien
 * chercher.
 *
 * Les dix marqueurs sont donc ancrés sur une STRUCTURE réelle, et la
 * structure suffit à l'arithmétique : une SÉQUENCE de huit octets contraints
 * tombe au hasard avec une probabilité de 2⁻⁶⁴, que ces huit octets soient
 * contigus ou séparés par un champ de longueur qu'on saute. Rien n'oblige donc
 * à chercher une chaîne plus longue — il faut chercher au bon endroit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'AVIF EST COUVERT INTENTIONNELLEMENT, ET NON PLUS PAR ACCIDENT (C14)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cette phrase est la dixième entrée, et elle mérite son propre paragraphe
 * parce qu'elle corrige une couverture qui MARCHAIT pour la mauvaise raison.
 *
 * Un AVIF est un fichier ISO-BMFF : ses métadonnées Exif ne forment pas un
 * segment, elles se déclarent dans la table des items — `meta` → `iinf` →
 * `infe` — et leur charge vit ailleurs, dans `mdat`. La déclaration s'écrit
 * `<longueur:4> infe <version:1><drapeaux:3> <item_ID> <protection:2>
 * <item_type:4> <item_name…>`, où `item_type` vaut « Exif » et où `item_ID`
 * fait DEUX octets en version 2, QUATRE en version 3. Entre `infe` et `Exif`
 * il y a donc 8 ou 10 octets, jamais autre chose : c'est la seule constante
 * exploitable du format, et c'est elle qu'on ancre.
 *
 * Jusqu'à C13, aucun marqueur ne visait cette structure — et pourtant les AVIF
 * porteurs d'Exif étaient attrapés. Par quoi ? Par `Exif\0\0`, le marqueur du
 * segment APP1 des JPEG, qui n'a rien à faire dans un ISO-BMFF. La raison est
 * une ADJACENCE : libavif, libheif, sharp et ImageMagick écrivent tous un
 * `item_name` VIDE, soit l'octet nul seul ; la suite lue devient « Exif », le
 * nul du nom, puis le premier octet de longueur de la boîte suivante, qui vaut
 * zéro pour toute boîte de moins de 16 Mo. `Exif\0\0` se forme donc tout seul,
 * et la garde le trouve.
 *
 * Ce qui rend la chose inacceptable n'est pas qu'elle échoue — c'est qu'elle
 * dépend d'une HABITUDE D'ENCODEUR et non d'une règle de format. Un encodeur
 * qui nommerait son item (« Exif », « exif data », un identifiant de
 * bibliothèque) sortirait du champ sans que rien d'autre change, et le jour où
 * cela arriverait, la garde se tairait sur un fichier porteur. C14 étant la
 * tranche qui livre les premiers `.avif` du dépôt, la couverture devient
 * explicite AVANT que les fichiers existent : trois cas de test la fixent, dont
 * un positif à nom d'item NON VIDE qui échouait avant ce marqueur.
 *
 * - `Exif\0\0`     — la signature complète d'un segment APP1 de JPEG,
 *                    terminateur compris. `Exif` seul est un mot de quatre
 *                    lettres ; `Exif\0\0` est un en-tête.
 * - `eXIf` + en-tête TIFF — le chunk PNG. Un chunk s'écrit
 *                    `<longueur:4> <type:4> <données>` : le type est donc
 *                    COLLÉ à sa charge, qui commence par `II*\0` ou `MM\0*`.
 *                    Huit octets contigus.
 * - `EXIF` + en-tête TIFF — le tronçon WebP. Un tronçon RIFF s'écrit
 *                    `<FourCC:4> <taille:4> <charge>` : quatre octets de
 *                    taille séparent le type de l'en-tête TIFF, et ils sont
 *                    sautés. Huit octets contraints sur douze.
 * - `infe` + `Exif` — la déclaration d'item Exif d'un ISO-BMFF (AVIF, HEIF).
 *                    Huit octets d'en-tête d'item en version 2, dix en
 *                    version 3 : l'intervalle est sauté, `Exif` est le type
 *                    d'item. Huit octets contraints sur douze au pire.
 * - `<x:xmpmeta`   — un nom d'élément XML, dix caractères.
 * - `photoshop:`   — un préfixe d'espace de noms, dix caractères.
 * - `xmp:`         — quatre caractères, mais dont trois sont une séquence rare
 *                    et le quatrième un deux-points : conservé tel quel.
 * - `jumb` + `jumd` — la superboîte JUMBF. La norme impose que son PREMIER
 *                    enfant soit une boîte de description de type `jumd` ; les
 *                    quatre octets de longueur qui les séparent sont sautés.
 *                    Huit octets contraints, là encore.
 * - `c2pa.` et `urn:uuid:` — la forme réellement écrite dans un manifeste de
 *                    provenance (`c2pa.assertions`, `c2pa.claim`…) et
 *                    l'identifiant d'instance qui l'accompagne toujours.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  SUR QUELLE ÉTENDUE : LA TÊTE **ET** LA QUEUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 64 Ko au début, 64 Ko à la fin. Lire la tête seule était une deuxième faute,
 * et elle laissait passer les deux cas les plus probables de notre chaîne :
 *
 * - un PNG autorise `eXIf`, `iTXt` et `caBX` **après** le bloc `IDAT`, donc
 *   après les données d'image ;
 * - le format WebP **recommande** de placer les tronçons `EXIF` et `XMP ` à la
 *   FIN du conteneur RIFF.
 *
 * Lire le fichier entier resterait inutile : les métadonnées se placent en
 * tête ou en queue, jamais au milieu d'un flux compressé. Sur un fichier de
 * moins de 128 Ko les deux fenêtres se recouvrent, et le fichier est alors lu
 * une seule fois — c'est le cas de toutes nos images, que la décision D36
 * plafonne à 240 Ko au pire.
 */

import { closeSync, openSync, readSync, statSync } from 'node:fs';

/**
 * Les extensions binaires que ce contrôle sait examiner.
 *
 * `.mp4` ENTRE EN C19, avec la vidéo du héros, et il n'y entre pas par symétrie :
 * un MP4 est un ISO-BMFF, exactement comme un AVIF. Les deux marqueurs
 * structurels de cette famille — la déclaration d'item Exif (`infe`) et la
 * superboîte de provenance (`jumb`/`jumd`) — s'y écrivent avec la même
 * grammaire, et les moteurs vidéo écrivent leur consigne au même endroit que
 * les moteurs d'images. Il aurait été plus long d'expliquer pourquoi on ne
 * regarde pas dedans que de regarder.
 */
export const EXTENSIONS_EXAMINEES = ['.jpg', '.jpeg', '.png', '.avif', '.webp', '.mp4'];

/**
 * L'en-tête TIFF, en fragment d'expression : `II*\0` pour le petit-boutien,
 * `MM\0*` pour le gros-boutien. TOUTE charge Exif nue commence par l'un des
 * deux — c'est ce qui rend le couple « type de chunk + en-tête » aussi sûr
 * qu'une chaîne de huit lettres, et beaucoup plus fidèle aux formats.
 */
const ENTETE_TIFF = '(?:II\\*\\x00|MM\\x00\\*)';

/**
 * Les dix marqueurs, avec ce que chacun trahit.
 *
 * Deux régimes, et la nature du porteur décide :
 *
 * - `motif` seul, avec `ascii` — une CHAÎNE cherchée telle quelle. `ascii` dit
 *   si la casse doit être ignorée : les marqueurs faits de mots ASCII sont
 *   cherchés dans les deux casses parce qu'un encodeur écrit `XMP:` là où un
 *   autre écrit `xmp:` ; `<x:xmpmeta` garde la sienne, c'est un nom d'élément
 *   XML et il est sensible à la casse par définition.
 * - `expression` — une STRUCTURE, quand le porteur est un type de conteneur
 *   suivi de sa charge. Ces marqueurs-là sont TOUJOURS sensibles à la casse,
 *   et pas par commodité : dans un chunk PNG la casse de chaque lettre du type
 *   porte un sens normatif, un FourCC RIFF est en capitales, un type de boîte
 *   ISO-BMFF est en minuscules. Ignorer la casse y perdrait de la précision
 *   sans rien gagner. `motif` n'est alors qu'un LIBELLÉ, celui qui s'imprime
 *   dans le message d'erreur.
 */
export const MARQUEURS_METADONNEES = [
  { motif: 'Exif\0\0', ascii: true, trahit: 'un segment Exif APP1 (appareil, logiciel, date, parfois position)' },
  {
    motif: 'eXIf + en-tête TIFF',
    expression: new RegExp(`eXIf${ENTETE_TIFF}`),
    trahit: 'un chunk Exif de PNG, à charge TIFF nue (appareil, logiciel, date, parfois position)',
  },
  {
    motif: 'EXIF + en-tête TIFF',
    expression: new RegExp(`EXIF[\\s\\S]{4}${ENTETE_TIFF}`),
    trahit: 'un tronçon Exif de WebP, à charge TIFF nue (appareil, logiciel, date, parfois position)',
  },
  {
    motif: 'infe + type Exif',
    expression: /infe[\s\S]{8,10}Exif/,
    trahit:
      'une déclaration d’item Exif d’ISO-BMFF (AVIF, HEIF) — appareil, logiciel, date, parfois position',
  },
  { motif: '<x:xmpmeta', ascii: false, trahit: 'un paquet XMP — le contenant habituel du texte de consigne' },
  { motif: 'photoshop:', ascii: true, trahit: 'un espace de noms XMP d’éditeur d’images' },
  { motif: 'xmp:', ascii: true, trahit: 'un espace de noms XMP' },
  {
    motif: 'jumb + jumd',
    expression: /jumb[\s\S]{4}jumd/,
    trahit: 'une superboîte JUMBF — le conteneur d’un manifeste de provenance',
  },
  { motif: 'c2pa.', ascii: true, trahit: 'un manifeste de provenance C2PA (signature, historique, consigne)' },
  { motif: 'urn:uuid:', ascii: true, trahit: 'un identifiant d’instance de manifeste de provenance' },
];

/** La taille de CHACUNE des deux fenêtres lues, en octets. */
export const ETENDUE_LUE = 64 * 1024;

/**
 * Lit une fenêtre d'octets et la rend en `latin1`.
 *
 * L'encodage `latin1` est délibéré : il fait correspondre un octet à un
 * caractère, sans jamais échouer ni remplacer une séquence invalide. Un
 * décodage `utf8` sur des octets compressés produirait des caractères de
 * remplacement au milieu des chaînes cherchées, et laisserait donc passer
 * exactement ce qu'on cherche.
 *
 * @param {number} descripteur
 * @param {number} depart  décalage depuis le début du fichier
 * @param {number} taille
 * @returns {string}
 */
function lireFenetre(descripteur, depart, taille) {
  const tampon = Buffer.alloc(taille);
  const lus = readSync(descripteur, tampon, 0, taille, depart);

  return tampon.subarray(0, lus).toString('latin1');
}

/**
 * Lit la TÊTE et la QUEUE d'un fichier, et rend les marqueurs qui s'y trouvent.
 *
 * Les positions rendues sont des décalages RÉELS depuis le début du fichier,
 * pas des index dans la fenêtre : un message d'erreur qui dirait « octet 412 »
 * pour une trouvaille située à 900 000 octets de la fin ferait chercher au
 * mauvais endroit.
 *
 * @param {string} chemin
 * @returns {readonly { motif: string, trahit: string, position: number }[]}
 */
export function detecterMetadonnees(chemin) {
  const taille = statSync(chemin).size;
  const descripteur = openSync(chemin, 'r');

  /** Les fenêtres, avec le décalage auquel chacune commence dans le fichier. */
  const fenetres = [];

  try {
    fenetres.push({ depart: 0, texte: lireFenetre(descripteur, 0, ETENDUE_LUE) });

    /* La queue n'est lue QUE si le fichier dépasse une fenêtre : en dessous,
       la tête l'a déjà entièrement couvert et relire ne ferait que doubler
       les signalements. */
    if (taille > ETENDUE_LUE) {
      const depart = taille - ETENDUE_LUE;
      fenetres.push({ depart, texte: lireFenetre(descripteur, depart, ETENDUE_LUE) });
    }
  } finally {
    closeSync(descripteur);
  }

  const trouves = [];

  for (const marqueur of MARQUEURS_METADONNEES) {
    for (const { depart, texte } of fenetres) {
      const rang = rangDansFenetre(marqueur, texte);

      if (rang !== -1) {
        trouves.push({ motif: marqueur.motif, trahit: marqueur.trahit, position: depart + rang });
        /* Un marqueur signalé une fois suffit : le but est d'échouer, pas de
           dresser l'inventaire de toutes ses occurrences. */
        break;
      }
    }
  }

  return trouves;
}

/**
 * Le rang du marqueur dans une fenêtre, ou -1 s'il n'y est pas.
 *
 * Les deux régimes décrits en tête de `MARQUEURS_METADONNEES` se rejoignent
 * ici, et rendent la même chose : un décalage dans la fenêtre. `search` d'une
 * expression non globale rend déjà -1 quand elle échoue, comme `indexOf` —
 * aucun état à remettre à zéro entre deux fenêtres.
 *
 * @param {{ motif: string, ascii?: boolean, expression?: RegExp }} marqueur
 * @param {string} texte
 * @returns {number}
 */
function rangDansFenetre(marqueur, texte) {
  if (marqueur.expression !== undefined) {
    return texte.search(marqueur.expression);
  }

  const dans = marqueur.ascii === true ? texte.toLowerCase() : texte;
  const cherche = marqueur.ascii === true ? marqueur.motif.toLowerCase() : marqueur.motif;

  return dans.indexOf(cherche);
}

/**
 * Le marqueur, rendu lisible dans un message d'erreur.
 *
 * `Exif\0\0` contient deux octets nuls, qui s'impriment au mieux comme rien du
 * tout et au pire comme un caractère de contrôle qui tronque la ligne dans un
 * terminal. On les écrit donc en toutes lettres. Les marqueurs structurels,
 * eux, portent déjà un libellé lisible et traversent la fonction sans changer.
 *
 * @param {string} motif
 * @returns {string}
 */
export function libelleMarqueur(motif) {
  return motif.replace(/\0/g, '\\0');
}

/**
 * Le fichier porte-t-il une extension de binaire examinable ?
 *
 * (Le nom disait « image » jusqu'en C19, quand la vidéo du héros est entrée au
 * dépôt. Il disait alors la vérité et il aurait cessé de la dire en silence —
 * c'est le genre de nom qui fait croire, six mois plus tard, qu'un format
 * n'est pas gardé.)
 *
 * @param {string} chemin
 * @returns {boolean}
 */
export function estBinaireExaminable(chemin) {
  const minuscule = chemin.toLowerCase();

  return EXTENSIONS_EXAMINEES.some((extension) => minuscule.endsWith(extension));
}
