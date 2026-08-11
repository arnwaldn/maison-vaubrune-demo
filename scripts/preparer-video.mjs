/**
 * LA VIDÉO DU HÉROS — `npm run preparer-video` (tranche C19)
 *
 * ===========================================================================
 * CE QUE FAIT CE SCRIPT, ET POURQUOI IL N'EST PAS DANS `preparer-images`
 * ===========================================================================
 *
 * Il prend les masters vidéo — les boucles H.264 montées hors dépôt — et livre
 * pour chacune les DEUX fichiers que la page servira : un AV1, qu'il encode, et
 * un H.264, qu'il ré-emballe. Les deux sont déshabillés de leurs métadonnées et
 * remis à plat pour la lecture progressive.
 *
 * C'est un SCRIPT FRÈRE de `preparer-images.mjs`, pas une sixième étape :
 * l'outil n'est pas le même (ffmpeg contre sharp), le format d'entrée n'est
 * pas le même, et surtout la cadence n'est pas la même — le pipeline d'images
 * se rejoue en entier à chaque tranche pour vérifier son déterminisme, un
 * encodage AV1 prend des minutes et ne se rejoue que si le master change.
 * Les mêler aurait fait payer l'un pour l'autre.
 *
 * ===========================================================================
 * C'EST UN OUTIL DE POSTE, comme sharp et fontTools
 * ===========================================================================
 *
 * ffmpeg n'est pas une dépendance du projet : aucun fichier de `src/` ne
 * l'appelle, `npm run controle` ne l'invoque jamais, l'intégration continue ne
 * l'installe pas. Les deux fichiers produits sont VERSIONNÉS et servis comme
 * des fichiers statiques — exactement la doctrine posée en C14 pour les images,
 * et la raison pour laquelle `next/image` avait été écarté.
 *
 * ===========================================================================
 * LE HACHAGE FAIT FOI, JAMAIS LE NOM
 * ===========================================================================
 *
 * Le master vit hors du dépôt (`travaux-images/`, écarté par `.gitignore` :
 * il pèse un mégaoctet et il porte le nom d'un fichier de travail). Son
 * empreinte est écrite ici. Un master absent, ou modifié, fait ÉCHOUER
 * l'exécution en le nommant — plutôt que de livrer une vidéo qui n'est pas
 * celle qu'on a regardée image par image.
 *
 * ===========================================================================
 * DEUX CODECS, ET CE N'EST PAS UNE COQUETTERIE
 * ===========================================================================
 *
 * AV1 seul laisserait un tiers du parc iPhone devant l'affiche seule ; H.264
 * seul coûterait une fois et demie à deux fois le poids à tout le monde. Les
 * deux sources sont donc déclarées, AV1 d'abord, et le navigateur prend la
 * première qu'il sait lire. Le plafond de D37 porte sur LE RENDU RÉELLEMENT
 * TÉLÉCHARGÉ, quel que soit le codec : c'est `verifier-images` qui le tient,
 * sur les deux fichiers, avec la même valeur.
 *
 * ===========================================================================
 * LE CHOIX DU FACTEUR DE QUALITÉ, ET IL A ÉTÉ REGARDÉ
 * ===========================================================================
 *
 * Cinq encodages d'essai (CRF 26, 30, 34, 38, 42), une planche de comparaison
 * montée à quatre, agrandie deux fois sur la zone la plus fragile — les ondes
 * concentriques, c'est-à-dire des dégradés lents, là où un encodeur bande.
 * 38 et au-delà aplatissent les ondes extérieures et effacent les micro-bulles.
 * 34 tient. 30 est retenu, et le motif est une MARGE et non une hésitation :
 * la vidéo s'affiche sur ~704 points CSS, donc 1408 sur un écran dense — le
 * fichier de 1280 y est LÉGÈREMENT AGRANDI, et un agrandissement révèle ce
 * qu'un encodeur a lissé. 30 pèse 417 Ko contre 1 077 pour le H.264 : le gain
 * reste d'un facteur 2,6, largement de quoi payer la prudence.
 *
 * Emploi :  node scripts/preparer-video.mjs [--verifier]
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detecterMetadonnees, libelleMarqueur } from './metadonnees-binaires.mjs';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const RELEVE = join(RACINE, 'public', 'editorial', 'videos-livrees.json');

/**
 * LES VIDÉOS DU SITE — une liste depuis C19-ter, une seule auparavant.
 *
 * ===========================================================================
 * POURQUOI UNE LISTE PLUTÔT QU'UN SECOND SCRIPT
 * ===========================================================================
 *
 * Le retour client n° 14 demande « une belle photo animée » à droite du titre
 * de `/boutique`, comme le filet d'huile de l'accueil. Deux voies s'offraient :
 * recopier ce script sous un autre nom, ou lui donner une liste. La copie
 * aurait dupliqué le choix du facteur de qualité, la construction de la chaîne
 * `codecs`, le déshabillage et sa contre-vérification — c'est-à-dire quatre
 * décisions mesurées, désormais entretenues à deux endroits. La liste ne
 * duplique QUE ce qui diffère : un master, une empreinte, un dossier.
 *
 * ===========================================================================
 * L'EMPREINTE DE CHAQUE MASTER RELU
 * ===========================================================================
 *
 * Le hachage fait foi, jamais le nom. Un master absent, ou modifié, fait
 * ÉCHOUER l'exécution en le nommant — plutôt que de livrer une vidéo qui n'est
 * pas celle qu'on a regardée image par image.
 */
const VIDEOS = [
  {
    clef: 'accueil',
    fichier: 'hero-filet-huile-boucle.mp4',
    /* Boucle de 6,125 s, 147 images à 24 i/s, 1280 × 720, sans piste sonore,
       dont le raccord a été CHERCHÉ et non choisi (le coût de la couture vaut
       4 % de plus qu'une transition ordinaire du même plan, c'est-à-dire moins
       que le bruit). Le procédé et les mesures vivent au journal de génération,
       hors dépôt : ce qui devait entrer ici est l'empreinte, et elle y est. */
    empreinte: '6ea52b0bac038c3790efdc717ffaf3de8cf170bdc13b863b2c5e2d955aedeecd',
    dossier: ['public', 'editorial', 'accueil'],
  },
  {
    clef: 'boutique',
    fichier: 'boutique-miel-boucle.mp4',
    /* Boucle de 5,583 s, 134 images, 1280 × 720, un seul flux. Le miel qui
       coule — la matière lente de D37 prise au mot. L'AFFICHE N'EST PAS UNE
       MACRO DU CATALOGUE mais l'IMAGE 0 DE CETTE BOUCLE, livrée par le
       pipeline d'images sous `editorial/boutique/affiche-*` : le moteur a
       recadré la vidéo en 16:9 par le centre, et une affiche prise ailleurs
       ferait sauter le cadrage à la première image jouée. */
    empreinte: '3fcb4e3123125d81f04a5e26330e0c5a5d2a79fc7d79fc588d612937af09c736',
    dossier: ['public', 'editorial', 'boutique'],
  },
  {
    clef: 'livraison',
    fichier: 'livraison-colis-boucle-h264.mp4',
    /* Boucle de 7,917 s, 190 images, 1280 × 720, un seul flux — retour client
       n° 19 (C20). LE MASTER EST LE H.264 : l'opérateur livre aussi un AV1,
       qui n'est PAS repris ici. Deux motifs, et aucun n'est une coquetterie —
       un AV1 ré-encodé depuis un AV1 empile deux générations de perte, et le
       facteur de qualité de ce script est celui qui a été REGARDÉ sur planche
       (voir plus haut). Le repli, lui, est ré-emballé sans ré-encodage : les
       octets d'image du master sortent tels quels.

       PATRON NEUF POUR CETTE BOUCLE, et il appartient à l'opérateur, pas à ce
       script : la couture est un ALLER-RETOUR et non un fondu croisé. Le plan
       est quasi immobile sous une lumière qui dérive, cas où le xfade coûtait
       de six à douze fois le plancher. Restreint par écrit aux plans SANS
       direction — jamais un filet qui coule, jamais un objet qui tourne. */
    empreinte: '90459cf410e4ad2d3752ca58f26302809bc902081d14a30c0cd4c50b9de4fd3c',
    dossier: ['public', 'editorial', 'livraison'],
  },
  {
    clef: 'suivi',
    fichier: 'suivi-registre-boucle-h264.mp4',
    /* Boucle de 7,917 s, 190 images, 1280 × 720, un seul flux. Même patron
       aller-retour, même règle sur le master. L'affiche est l'image 0 de CETTE
       boucle, livrée par le pipeline d'images sous `editorial/suivi/affiche-*` :
       la vidéo est un 16:9 et l'illustration de C19-ter un 3:2, si bien qu'une
       affiche prise dans l'ancienne nature morte ferait sauter le cadrage à la
       première image jouée. */
    empreinte: 'e84079f72a2b57c2fbfc2507fe6a818ec8c6591a6af3b79f53344217aeff147c',
    dossier: ['public', 'editorial', 'suivi'],
  },
  {
    clef: 'panier',
    fichier: 'panier-cagette-boucle-h264.mp4',
    /* Boucle de 7,917 s, 190 images, 1280 × 720, un seul flux — la troisième et
       dernière des images de tête du retour n° 19. Même règle sur le master que
       ses deux voisines : c'est le H.264 qui entre ici, jamais l'AV1 livré à
       côté.

       LA FENÊTRE DE BOUCLE NE COMMENCE PAS À L'IMAGE 0 DU BRUT, et il faut le
       savoir pour comprendre l'affiche : la caméra DÉRIVE sur le premier tiers
       du plan malgré la consigne, si bien que l'opérateur a démarré à l'image
       140 pour l'éviter. L'image 0 de LA BOUCLE — celle qui est livrée en
       affiche sous `editorial/panier/affiche-*` — est donc l'image 140 du brut.
       Prendre l'affiche ailleurs ferait sauter le cadrage au démarrage, et la
       prendre dans le brut ferait en plus sauter le point de vue.

       Même patron de couture ALLER-RETOUR que `livraison` et `suivi` : le plan
       est sans direction, et la mesure le confirme au-delà des deux autres —
       la couture vaut 0,26 fois la transition la plus forte du plan lui-même. */
    empreinte: '3a7a6604ecab00dcf8111d57e5fed5aa692e2aed5537b62b0a85bcdf9fd9890f',
    dossier: ['public', 'editorial', 'panier'],
  },
];

/** La largeur écrite dans le nom des fichiers livrés — et dans leurs octets. */
const LARGEUR = 1280;

/**
 * LES DEUX RENDUS.
 *
 * `codecs` n'est pas décoratif : sans lui, un navigateur sans AV1 prendrait la
 * PREMIÈRE source (il ne voit qu'un `video/mp4`) et n'afficherait rien. C'est
 * la chaîne qui fait fonctionner le repli, et elle se lit dans le fichier
 * produit — profil, indice de niveau, palier, profondeur — jamais recopiée.
 */
const RENDUS = [
  {
    codec: 'av1',
    nom: `boucle-${String(LARGEUR)}.av1.mp4`,
    /* `preset 4` : le compromis de SVT-AV1 entre le temps d'encodage et la
       densité. Au-delà de 6 la qualité par octet se dégrade nettement sur des
       dégradés lents ; en deçà de 3 l'encodage double sans gain visible ici. */
    arguments: (entree, sortie) => [
      '-i', entree,
      '-c:v', 'libsvtav1',
      '-crf', '30',
      '-preset', '4',
      '-g', '48',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-map_metadata', '-1',
      '-movflags', '+faststart',
      '-y', sortie,
    ],
  },
  {
    codec: 'h264',
    nom: `boucle-${String(LARGEUR)}.h264.mp4`,
    /* LE REPLI EST RÉ-EMBALLÉ, PAS RÉ-ENCODÉ. `-c:v copy` recopie le flux tel
       qu'il a été monté : même image, même poids, aucune génération de perte
       supplémentaire. Ce que ce passage APPORTE est justement ce qu'on lui
       demande — le déshabillage des métadonnées et la remise à plat de l'index
       en tête de fichier, sans quoi le navigateur télécharge tout avant la
       première image. */
    arguments: (entree, sortie) => [
      '-i', entree,
      '-c:v', 'copy',
      '-an',
      '-map_metadata', '-1',
      '-movflags', '+faststart',
      '-y', sortie,
    ],
  },
];

/* -------------------------------------------------------------------------- */

const anomalies = [];
const observations = [];

const anomalie = (message) => anomalies.push(message);
const noter = (message) => observations.push(message);

function sha256(chemin) {
  return createHash('sha256').update(readFileSync(chemin)).digest('hex');
}

function ko(octets) {
  return `${(octets / 1024).toFixed(1)} Ko`;
}

/** Interroge ffprobe et rend un objet plat. Jette si l'outil manque. */
function sonder(chemin) {
  const brut = execFileSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries',
      'stream=codec_name,profile,level,width,height,pix_fmt,nb_frames:format=duration,nb_streams',
      '-of', 'json',
      chemin,
    ],
    { encoding: 'utf8' },
  );

  const analyse = JSON.parse(brut);
  const flux = analyse.streams?.[0] ?? {};

  return {
    codec: flux.codec_name,
    profil: flux.profile,
    niveau: flux.level,
    largeur: flux.width,
    hauteur: flux.height,
    pixels: flux.pix_fmt,
    images: Number(flux.nb_frames ?? 0),
    duree: Number(analyse.format?.duration ?? 0),
    fluxTotaux: Number(analyse.format?.nb_streams ?? 0),
  };
}

/**
 * LA CHAÎNE `codecs`, CONSTRUITE DEPUIS LE FICHIER PRODUIT.
 *
 * Elle décide de tout le repli, et une valeur recopiée d'un article de blog
 * serait juste jusqu'au jour où l'encodeur changerait de niveau — après quoi
 * le navigateur écarterait une source parfaitement lisible, en silence.
 */
function chaineCodecs(sonde) {
  if (sonde.codec === 'av1') {
    /* av01.<profil>.<indice de niveau sur deux chiffres><palier>.<profondeur> */
    const profil = sonde.profil === 'Main' ? 0 : sonde.profil === 'High' ? 1 : 2;
    const niveau = String(sonde.niveau).padStart(2, '0');
    const profondeur = sonde.pixels?.includes('10') ? '10' : '08';
    return `av01.${String(profil)}.${niveau}M.${profondeur}`;
  }

  if (sonde.codec === 'h264') {
    /* avc1.<profil><contraintes><niveau>, en hexadécimal. Le niveau de ffprobe
       est déjà l'entier de la norme (31 = 3.1) : il s'écrit tel quel en hexa. */
    const profils = { Baseline: 0x42, Main: 0x4d, High: 0x64 };
    const profil = profils[sonde.profil] ?? 0x64;
    const contraintes = profil === 0x42 ? 0xe0 : 0x00;
    return `avc1.${profil.toString(16).padStart(2, '0')}${contraintes
      .toString(16)
      .padStart(2, '0')}${Number(sonde.niveau).toString(16).padStart(2, '0')}`;
  }

  return null;
}

/* -------------------------------------------------------------------------- */

const verifierSeulement = process.argv.includes('--verifier');

console.log('');
console.log(`Préparation des vidéos (${String(VIDEOS.length)})`);
console.log('-'.repeat(72));

const livrees = {};

for (const video of VIDEOS) {
  const source = join(RACINE, 'travaux-images', 'videos', video.fichier);
  const sortie = join(RACINE, ...video.dossier);

  console.log(`  ${video.clef} — ${video.fichier}`);

  if (!existsSync(source)) {
    anomalie(
      `${video.clef} : master introuvable (${basename(source)}) — il vit hors du ` +
        'dépôt, dans travaux-images/videos/, et c’est voulu',
    );
    continue;
  }

  const empreinte = sha256(source);

  if (empreinte !== video.empreinte) {
    anomalie(
      `${video.clef} : le master ne porte pas l’empreinte attendue ` +
        `(${empreinte.slice(0, 12)}… au lieu de ${video.empreinte.slice(0, 12)}…) — ` +
        'ce n’est pas la vidéo qui a été relue image par image',
    );
    continue;
  }

  const sondeSource = sonder(source);

  noter(
    `${video.clef} — master ${String(sondeSource.largeur)}×${String(sondeSource.hauteur)}, ` +
      `${String(sondeSource.images)} images, ${sondeSource.duree.toFixed(3)} s, ` +
      `${String(sondeSource.fluxTotaux)} flux, ${ko(statSync(source).size)}`,
  );

  /* UNE PISTE ET UNE SEULE. La vidéo n'a pas de son, et c'est ce qui la met
     hors de portée de WCAG 1.4.2 — pas une promesse, une mesure. */
  if (sondeSource.fluxTotaux !== 1) {
    anomalie(
      `${video.clef} : le master porte ${String(sondeSource.fluxTotaux)} flux — ` +
        'une piste sonore s’est glissée dans le montage',
    );
    continue;
  }

  mkdirSync(sortie, { recursive: true });

  const livres = [];

  for (const rendu of RENDUS) {
    const destination = join(sortie, rendu.nom);

    if (!verifierSeulement) {
      console.log(`    encodage ${rendu.codec}…`);
      execFileSync(
        'ffmpeg',
        ['-hide_banner', '-loglevel', 'error', ...rendu.arguments(source, destination)],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      );
    }

    if (!existsSync(destination)) {
      anomalie(`${video.clef}/${rendu.nom} : absent après l’étape`);
      continue;
    }

    const octets = statSync(destination).size;
    const sonde = sonder(destination);
    const codecs = chaineCodecs(sonde);

    /* LE PIPELINE MESURE CE QU'IL ÉCRIT — leçon C15, appliquée ici avant
       qu'une garde n'ait à la rappeler. Le nom annonce 1280 : les octets
       doivent le dire. */
    if (sonde.largeur !== LARGEUR) {
      anomalie(
        `${video.clef}/${rendu.nom} : le nom annonce ${String(LARGEUR)} points, ` +
          `les octets en portent ${String(sonde.largeur)}`,
      );
    }

    if (sonde.fluxTotaux !== 1) {
      anomalie(
        `${video.clef}/${rendu.nom} : ${String(sonde.fluxTotaux)} flux au lieu d’un seul`,
      );
    }

    if (codecs === null) {
      anomalie(`${video.clef}/${rendu.nom} : codec « ${String(sonde.codec)} » non reconnu`);
    }

    /* LE DÉSHABILLAGE EST REVÉRIFIÉ APRÈS COUP, avec le détecteur PARTAGÉ des
       quatre autres gardes. Ne pas demander de métadonnées et ne pas en avoir
       sont deux affirmations différentes — règle écrite en C14 pour les images,
       et elle vaut ici. La première rédaction de ce script cherchait des
       chaînes en clair, dont « XMP » : trois octets qui se forment tout seuls
       dans un flux compressé, et qui s'y étaient formés. Ancrer sur la
       STRUCTURE est la seule parade. */
    for (const trouvaille of detecterMetadonnees(destination)) {
      anomalie(
        `${video.clef}/${rendu.nom} : « ${libelleMarqueur(trouvaille.motif)} » à ` +
          `l’octet ${String(trouvaille.position)} — ${trouvaille.trahit}`,
      );
    }

    livres.push({
      fichier: rendu.nom,
      codec: sonde.codec,
      type: `video/mp4; codecs="${String(codecs)}"`,
      largeur: sonde.largeur,
      hauteur: sonde.hauteur,
      images: sonde.images,
      secondes: Number(sonde.duree.toFixed(3)),
      octets,
      empreinte: sha256(destination),
    });

    noter(
      `${video.clef}/${rendu.nom} — ${ko(octets)}, ` +
        `${String(sonde.largeur)}×${String(sonde.hauteur)}, type « ${String(codecs)} »`,
    );
  }

  if (livres.length !== RENDUS.length) {
    continue;
  }

  const av1 = livres.find((livre) => livre.codec === 'av1');
  const h264 = livres.find((livre) => livre.codec === 'h264');

  livrees[video.clef] = {
    masterEmpreinte: video.empreinte,
    dossier: video.dossier.slice(1).join('/'),
    sources: [av1, h264],
    gainAv1:
      av1 !== undefined && h264 !== undefined
        ? `${(h264.octets / av1.octets).toFixed(2)}×`
        : null,
  };
}

if (anomalies.length === 0 && Object.keys(livrees).length === VIDEOS.length) {
  writeFileSync(
    RELEVE,
    `${JSON.stringify(
      {
        $commentaire: [
          'RELEVÉ DES VIDÉOS LIVRÉES — écrit par `npm run preparer-video`, versionné.',
          '',
          'Il porte ce que les pages ont besoin de savoir et que personne ne doit',
          'recopier : la chaîne `codecs` de chaque source, lue dans le fichier produit.',
          'Sans elle, un navigateur sans AV1 prendrait la première source et',
          'n’afficherait rien.',
          '',
          'LE RELEVÉ EST INDEXÉ PAR CLEF, et cette clef est la seule chose qui circule',
          'entre une page et ce fichier : ni un chemin, ni un codec, ni une dimension.',
          'Ajouter une vidéo au site, c’est donc ajouter UNE entrée à la liste `VIDEOS`',
          'de `scripts/preparer-video.mjs` — ce fichier suit tout seul, et la page ne',
          'nomme que la clef. Aucun décompte n’est écrit ici : il vieillirait.',
          '',
          'L’empreinte du master dont chaque paire descend est écrite ici ET dans',
          '`scripts/preparer-video.mjs`. Les masters, eux, restent hors du dépôt.',
        ],
        videos: livrees,
      },
      null,
      2,
    )}
`,
    'utf8',
  );

  noter(`relevé écrit : public/editorial/videos-livrees.json (${String(VIDEOS.length)} vidéos)`);
}

/* -------------------------------------------------------------------------- */

for (const observation of observations) {
  console.log(`  ${observation}`);
}

console.log('-'.repeat(72));

if (anomalies.length === 0) {
  console.log('Vidéo prête.');
  console.log('');
} else {
  for (const message of anomalies) {
    console.log(`  -> ${message}`);
  }
  console.log(`${String(anomalies.length)} anomalie(s).`);
  console.log('');
  process.exitCode = 1;
}
