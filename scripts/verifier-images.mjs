/**
 * GARDE DES IMAGES PRODUIT — `npm run verifier-images`
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ELLE GARDE, ET POURQUOI ELLE EXISTE AVANT LA PREMIÈRE IMAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La décision D35 ouvre la porte aux visuels engendrés ; la décision D36 leur
 * donne des plafonds de poids. Ni l'une ni l'autre ne se tient toute seule :
 * un dossier d'images est le genre d'endroit où une convention se perd en trois
 * livraisons — un dossier mal nommé, un `principal-2.jpg` ajouté « en
 * attendant », un fichier de 900 Ko qui passe parce que personne ne l'a pesé.
 *
 * Cette garde est écrite en C11, c'est-à-dire AVANT que `public/produits/`
 * existe. Ce n'est pas un excès de zèle, c'est le seul ordre qui marche : une
 * convention écrite après les fichiers est une convention qu'on ajuste aux
 * fichiers. Tant que le dossier est absent, la garde passe en le disant.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES SIX CONTRÔLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. UN DOSSIER PAR SLUG. Le nom du dossier est un slug EXACT du catalogue —
 *    pas approchant, pas ancien, pas au pluriel. C'est ce qui garantit qu'une
 *    fiche trouvera ses images en composant son chemin depuis son slug, sans
 *    table de correspondance à tenir à jour.
 * 2. UN VOCABULAIRE FERMÉ de noms de fichiers. Une fiche calcule ses adresses
 *    d'image ; elle ne les lit pas dans un dossier. Un nom hors vocabulaire est
 *    donc un fichier que personne ne servira jamais — du poids mort dans le
 *    dépôt, et un doute à chaque relecture.
 * 3. LE MANIFESTE, DANS LES DEUX SENS. S'il existe, tout ce qu'il annonce est
 *    livré et tout ce qui est livré y figure. Un seul sens laisserait passer
 *    l'oubli le plus fréquent — le fichier supprimé du disque et resté au
 *    manifeste, ou l'inverse.
 * 4. LE POIDS, FICHIER PAR FICHIER. Les plafonds sont ceux de la décision D36.
 *    Un format livré sans plafond déclaré fait ÉCHOUER la garde : c'est la
 *    seule façon d'empêcher qu'un format nouveau entre sans qu'on l'ait pesé.
 * 5. AUCUNE MÉTADONNÉE. Même détection que la garde des marques, importée du
 *    même fichier — le motif est écrit en tête de `metadonnees-binaires.mjs`,
 *    et il est le plus important des cinq.
 * 6. LES DIMENSIONS, LUES SUR LES OCTETS. Ajouté au round 1 de C15, et il a une
 *    histoire précise : les seize images de partage s'appelaient
 *    `partage-1200x630.jpg`, le relevé les déclarait `1200 × 630`, le HTML servi
 *    annonçait `width: 1200 height: 630` — et elles mesuraient 1280 × 710. Trois
 *    affirmations d'accord entre elles, et pas une mesure. Ce contrôle ouvre
 *    donc chaque fichier : la largeur (ou les deux dimensions) que son NOM
 *    annonce doit être celle de ses octets, et le couple `largeur`/`hauteur` du
 *    relevé de livraison doit l'être aussi.
 *
 *    C'est la leçon de C13 sous un troisième déguisement — « contrôler la
 *    propriété, pas son indice » — et celle de la police mono de C14, dont le
 *    répertoire annonçait 145 points de code pour un fichier qui en portait 143.
 *    Le lecteur de dimensions est PUR (`dimensions-image.mjs`, aucun sharp) :
 *    une garde qui aurait besoin de l'outil de poste ne tournerait pas en
 *    intégration continue, c'est-à-dire ne tournerait pas.
 *
 * Exécution par `tsx` : le script importe le catalogue TypeScript tel quel,
 * comme `verifier-catalogue.mjs`, pour que la liste des slugs soit CELLE des
 * pages et non une copie qui divergerait.
 *
 * Usage : `tsx scripts/verifier-images.mjs [--base <dossier>]`
 * Sortie : 0 si tout est conforme, 1 sinon.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { CATALOGUE } from '@/donnees/catalogue';

import { dimensionsAnnonceesParLeNom, lireDimensions } from './dimensions-image.mjs';
import {
  detecterMetadonnees,
  estBinaireExaminable,
  libelleMarqueur,
} from './metadonnees-binaires.mjs';

/* -------------------------------------------------------------------------- */
/* Le vocabulaire et les plafonds                                              */
/* -------------------------------------------------------------------------- */

/**
 * LE VOCABULAIRE FERMÉ, ET IL Y EN A DEUX DEPUIS C15.
 *
 * `public/produits/` porte ce qui appartient à un produit : le paquet sur fond
 * neutre (`principal`) et sa mise en situation (`ambiance`). `public/editorial/`
 * porte ce qui n'appartient à aucun : les macros de famille (`macro`) et le
 * héros de l'accueil (`hero`). Deux espaces, deux vocabulaires, DEUX RÈGLES DE
 * NOMMAGE DE DOSSIER — et c'est la vraie raison de la séparation : le contrôle
 * n° 1 exige que chaque dossier de `produits/` soit un slug EXACT du catalogue,
 * et une macro de famille n'en est pas un. Les mélanger aurait forcé à relâcher
 * ce contrôle-là, qui est le premier des cinq et le plus utile.
 *
 * Cinq largeurs, deux formats d'encodage. Plus une image de partage, à la
 * taille imposée par les réseaux sociaux, qui n'existe qu'en `jpg` parce que
 * c'est le seul format que tous acceptent.
 */
const LARGEURS = ['320', '480', '640', '960', '1024', '1440'];
const ENCODAGES = ['avif', 'jpg'];
const PARTAGE = 'partage-1200x630.jpg';

/**
 * LE VOCABULAIRE DE LA VIDÉO (C19) — une vue, une largeur, deux codecs.
 *
 * Le codec s'écrit ENTRE la largeur et l'extension, et ce n'est pas un
 * ornement : deux fichiers de même vue, de même largeur et de même conteneur
 * cohabitent, ce qui n'arrive jamais pour une image (là, c'est l'extension qui
 * distingue l'AVIF de son repli). Il fallait donc un segment de plus, et le
 * mettre AVANT l'extension laisse `.mp4` en dernier — c'est-à-dire laisse le
 * serveur choisir le bon type de contenu sans configuration.
 */
const VUES_VIDEO = ['boucle'];
const LARGEURS_VIDEO = ['1280'];
const CODECS = ['av1', 'h264'];

function motifDeNom(vues) {
  return new RegExp(
    `^(?:(${vues.join('|')})-(${LARGEURS.join('|')})\\.(?:${ENCODAGES.join('|')})` +
      `|${PARTAGE.replace('.', '\\.')})$`,
  );
}

function motifDeNomVideo() {
  return new RegExp(
    `^(${VUES_VIDEO.join('|')})-(${LARGEURS_VIDEO.join('|')})\\.(?:${CODECS.join('|')})\\.mp4$`,
  );
}

/** Le nom du relevé, s'il est livré. Il vit à la racine de chaque espace. */
const MANIFESTE = 'manifeste-livre.json';

/**
 * Le relevé des vidéos, écrit par `npm run preparer-video`.
 *
 * Il vit à côté du manifeste plutôt que dedans, parce que les deux pipelines
 * sont séparés — sharp d'un côté, ffmpeg de l'autre — et qu'un fichier écrit
 * par deux outils qui ne se connaissent pas est un fichier que le second
 * écrase.
 */
const MANIFESTE_VIDEO = 'videos-livrees.json';

/**
 * LES CLEFS ÉDITORIALES QUI NE SONT PAS DES FAMILLES.
 *
 * Liste fermée, et elle doit le rester : `public/editorial/` n'a pas de source
 * externe qui le contraigne comme le catalogue contraint `public/produits/`.
 * Sans cette liste, n'importe quel dossier y passerait.
 */
const CLEFS_EDITORIALES = [
  'accueil',
  'boutique',
  'livraison',
  'panier',
  'suivi',
  /* LES TROIS PAGES DU TUNNEL (C21a, retour client n° 21). Leur clef est le
     CHEMIN de la page, tiret à la place de la barre — `commande`,
     `paiement-simulation`, `commande-confirmation`. C'est la seule règle qui
     rende la liste devinable : une clef éditoriale n'a pas de source externe
     qui la contraigne (là est toute la différence avec `produits/`, dont
     chaque dossier est un slug du catalogue), donc elle doit au moins se
     déduire de la page qu'elle sert. */
  'commande',
  'paiement-simulation',
  'commande-confirmation',
];

/**
 * LES PLAFONDS DE POIDS, en kibioctets (1 Ko = 1024 octets), décision D36.
 *
 * La clef est `famille-largeur`, ou `partage`. Les formats du vocabulaire qui
 * n'y figurent pas — `principal-1024`, `principal-1440`, `ambiance-320`,
 * `ambiance-960` — ne sont PAS interdits : ils sont simplement non pesés, et
 * la garde le dit au lieu de les laisser passer. Le jour où l'un d'eux sera
 * livré, il faudra écrire son plafond ici, ce qui prend dix secondes et oblige
 * à se poser la question.
 *
 * Le plafond porte sur le fichier tel qu'il est servi. Aucune distinction
 * entre `avif` et `jpg` : le second est le repli du premier, et un repli qui
 * pèse le double du plafond coûte le même réseau au visiteur qui le reçoit.
 */
const PLAFONDS_KO = {
  'principal-320': 30,
  /* AJOUTÉ AU ROUND 1 DE C14, avec `ambiance-480` : la marche de 320 à 640 était
     trop grossière. Une place de 240 points CSS à la densité 1,75 du profil
     mobile mesuré demande 420 points ; devant 320 et 640, le navigateur prend
     640 — et il a raison. 480 sert cette densité-là et le 2,0 de la plupart des
     téléphones. Plafond fixé entre les deux voisins, au prorata de la surface :
     mesuré à 12,4 Ko pour `principal-480`, 10,9 pour `ambiance-480`. */
  'principal-480': 45,
  'principal-640': 70,
  'principal-960': 130,
  /* AJOUTÉ EN C14, et c'est le mécanisme du contrôle 4 qui l'a exigé : la
     livraison a d'abord échoué sur « aucun plafond déclaré pour ambiance-320 »
     quand le pipeline a commencé à produire cette largeur. La garde a fait
     exactement ce pour quoi elle est écrite — obliger à peser un format avant
     de le livrer. 30 Ko, comme `principal-320` : c'est la même boîte, la même
     largeur et le même encodage ; seul le sujet change. Mesuré à 8,3 Ko. */
  'ambiance-320': 30,
  'ambiance-480': 50,
  'ambiance-640': 80,
  'ambiance-1024': 150,
  'ambiance-1440': 240,
  /* AJOUTÉS EN C15 avec l'ouverture de `public/editorial/`. Les macros et le
     héros descendent de masters 5056×2844 et servent des places PLEINE LARGEUR :
     leurs plafonds sont ceux d'une image de bandeau, pas d'une vignette. Mesurés
     à la livraison : macro 21,6 / 47,7 / 82,0 Ko et héros 22,0 / 47,3 / 80,4 Ko
     en AVIF ; le repli JPEG est le poste dimensionnant, et c'est lui que ces
     chiffres bornent. */
  'macro-320': 25,
  'macro-640': 60,
  'macro-1024': 110,
  'hero-640': 40,
  'hero-1024': 60,
  'hero-1440': 90,
  /* AJOUTÉS EN C19-ter avec les quatre actifs des retours client 14 et 17.

     `illustration` descend de masters 5056×3392 LIVRÉS ENTIERS (rapport 3:2,
     voir la boîte du même nom au manifeste) et sert une DEMI-largeur de page.
     Elle est donc plus haute qu'un héros à largeur égale — un 3:2 porte
     douze pour cent de pixels de plus qu'un 16:9 —, d'où des plafonds au-dessus
     de ceux de `hero`. Mesurés sur les octets livrés, repli JPEG dimensionnant.

     `affiche` est l'image 0 D'UNE BOUCLE — celle que la vidéo du même dossier
     ouvrira. Toute page qui porte une boucle en livre une, et elle ne peut pas
     être prise ailleurs : le cadre est un 16:9, et une affiche d'un autre
     cadrage sauterait à la première image jouée. Elle se pèse donc comme un
     héros, quel que soit le nombre de boucles du site.

     PRÉCISÉ EN C21a, sans changer un chiffre : `illustration` sert désormais
     DEUX géométries de master — le 3:2 entier de la série F (C19-ter) et le
     16:9 NATIF de la série G (le tunnel). Le second porte douze pour cent de
     pixels de MOINS à largeur égale, donc les plafonds ci-dessous le bornent
     largement ; ils restent calés sur le cas dimensionnant, qui est le 3:2.
     Le jour où plus aucun 3:2 ne sera livré, ces deux valeurs devront être
     re-mesurées à la baisse plutôt que laissées confortables — un plafond qui
     ne serre plus rien ne garde plus rien. */
  'illustration-640': 60,
  'illustration-1024': 130,
  'affiche-640': 40,
  'affiche-1024': 80,
  partage: 180,
  /* LA VIDÉO DU HÉROS (C19), ET UN SEUL PLAFOND POUR LES DEUX CODECS.
     L'interdit n° 17 de D37 est amendé dans les termes exacts que la revue de
     C18 a proposés : « ≤ 1,2 Mo pour le rendu réellement téléchargé, QUEL QUE
     SOIT LE CODEC ». Un plafond par codec aurait laissé le repli grossir en
     silence — or le visiteur qui reçoit le repli paie le repli, pas la
     moyenne. 1 200 kibioctets, dans l'unité employée par cette garde depuis
     C14.

     AUCUN POIDS MESURÉ N'EST RECOPIÉ ICI. Ils diffèrent d'une boucle à l'autre,
     ils changent au moindre ré-encodage, et une valeur écrite dans un
     commentaire vieillit à la boucle suivante — la première rédaction n'en
     nommait qu'une, et elle était déjà périmée quand la deuxième est arrivée.
     Le relevé du pipeline vidéo (`videos-livrees.json`, que ce même contrôle
     relit) porte le poids de chaque rendu ; le contrôle 4, lui, les pèse SUR LE
     DISQUE. C'est le seul endroit du dépôt où un poids de vidéo fait foi. */
  'boucle-1280': 1200,
};

/* -------------------------------------------------------------------------- */
/* Harnais de contrôles — même forme que les trois autres gardes               */
/* -------------------------------------------------------------------------- */

const controles = [];

function controle(intitule, executer) {
  const anomalies = [];
  const observations = [];

  const exiger = (condition, message) => {
    if (!condition) {
      anomalies.push(message);
    }
  };
  const noter = (message) => observations.push(message);

  try {
    executer(exiger, noter);
  } catch (erreur) {
    anomalies.push(
      `contrôle interrompu : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
    );
  }

  controles.push({ intitule, anomalies, observations });
}

/* -------------------------------------------------------------------------- */
/* Base d'exécution                                                            */
/* -------------------------------------------------------------------------- */

function lireBase(arguments_) {
  const rang = arguments_.indexOf('--base');

  if (rang === -1) {
    return resolve(fileURLToPath(new URL('..', import.meta.url)));
  }

  const valeur = arguments_[rang + 1];

  if (valeur === undefined) {
    throw new Error('--base attend un dossier');
  }

  return resolve(valeur);
}


const BASE = lireBase(process.argv.slice(2));

/** Les slugs du catalogue, source unique (aucune copie dans ce fichier). */
const SLUGS = new Set(CATALOGUE.map((produit) => produit.slug));

/** Les familles du catalogue, source unique elles aussi. */
const FAMILLES_CATALOGUE = new Set(CATALOGUE.map((produit) => produit.famille));

/**
 * LES DEUX ESPACES D'IMAGES, décrits par leurs différences et rien d'autre.
 *
 * Les six contrôles sont écrits UNE fois et joués sur chacun : c’est la seule
 * forme qui garantisse qu'un espace n'est pas moins gardé que l'autre. La seule
 * chose qui les distingue est ce tableau — la racine, les noms de vue admis, et
 * la règle qui dit ce qu'un nom de dossier a le droit d'être.
 */
const ESPACES = [
  {
    nom: 'produits',
    racine: join(BASE, 'public', 'produits'),
    vues: ['principal', 'ambiance'],
    dossiersAdmis: SLUGS,
    regleDossier: 'un slug exact du catalogue',
    tranche: 'C14',
  },
  {
    nom: 'editorial',
    racine: join(BASE, 'public', 'editorial'),
    /* `illustration` et `affiche` entrent en C19-ter : trois natures mortes
       thématiques (colis, registre, cagette) qui comblent le vide à droite du
       titre sur `/livraison`, `/suivi` et `/panier`, et l'affiche de la seconde
       vidéo. Un vocabulaire fermé n'est utile que si on l'ÉTEND explicitement —
       un nom hors liste fait échouer la garde, et c'est son travail. */
    vues: ['macro', 'hero', 'illustration', 'affiche'],
    /* SEUL L'ESPACE ÉDITORIAL PORTE DE LA VIDÉO, et il faut que ce soit écrit
       quelque part plutôt que déduit d'une absence : une vidéo de produit
       n'aurait aucun sens dans un rayon plafonné à 180 Ko d'images. */
    videos: true,
    dossiersAdmis: new Set([...FAMILLES_CATALOGUE, ...CLEFS_EDITORIALES]),
    regleDossier: `une famille du catalogue ou une clef éditoriale déclarée (${CLEFS_EDITORIALES.join(', ')})`,
    tranche: 'C15',
  },
];

/* -------------------------------------------------------------------------- */
/* Relevé d'un espace                                                          */
/* -------------------------------------------------------------------------- */

function estUnDossier(chemin) {
  try {
    return statSync(chemin).isDirectory();
  } catch {
    return false;
  }
}

/** `true` si le chemin existe, quel que soit son type. */
function existe(chemin) {
  try {
    statSync(chemin);
    return true;
  } catch {
    return false;
  }
}

/**
 * TROIS CAS, ET PAS DEUX.
 *
 * L'ABSENCE de la racine est le cas NORMAL tant que la tranche qui la livre n'a
 * pas livré : la garde passe en le disant, parce qu'une garde qui échouerait sur
 * l'absence de ce qu'elle surveille serait désactivée dans l'heure.
 *
 * Mais la racine PRÉSENTE SANS ÊTRE UN DOSSIER — un fichier, un lien — n'est pas
 * la même chose, et la première rédaction les confondait : elle annonçait
 * « aucune image livrée » et sortait en 0. Elle aurait donc dit « rien à
 * contrôler » à propos d'une anomalie franche, ce qui est exactement le mensonge
 * qu'une garde ne doit jamais faire. Ce cas échoue, et il le dit.
 */
function relever(espace) {
  if (existe(espace.racine) && !estUnDossier(espace.racine)) {
    return { etat: 'invalide' };
  }

  if (!estUnDossier(espace.racine)) {
    return { etat: 'absent' };
  }

  const entreesRacine = readdirSync(espace.racine, { withFileTypes: true });
  const dossiers = entreesRacine.filter((entree) => entree.isDirectory()).map((e) => e.name);
  const fichiersRacine = entreesRacine.filter((entree) => entree.isFile()).map((e) => e.name);
  const livres = [];

  for (const dossier of dossiers) {
    const chemin = join(espace.racine, dossier);

    for (const entree of readdirSync(chemin, { withFileTypes: true })) {
      livres.push({
        relatif: [dossier, entree.name].join('/'),
        absolu: join(chemin, entree.name),
        dossier,
        nom: entree.name,
        estDossier: entree.isDirectory(),
      });
    }
  }

  return { etat: 'present', dossiers, fichiersRacine, livres };
}

/* -------------------------------------------------------------------------- */
/* Les six contrôles, joués sur un espace                                      */
/* -------------------------------------------------------------------------- */

/** La clef de plafond d'un nom de fichier, ou `null` s'il est hors vocabulaire. */
function clefDePlafond(nom, motif, motifVideo) {
  if (nom === PARTAGE) {
    return 'partage';
  }

  /* LES DEUX CODECS PARTAGENT LEUR CLEF, et c'est la traduction en code du
     plafond unique : `boucle-1280.av1.mp4` et `boucle-1280.h264.mp4` rendent
     tous deux `boucle-1280`, donc se pèsent contre la même valeur. */
  const video = motifVideo.exec(nom);

  if (video !== null && video[1] !== undefined && video[2] !== undefined) {
    return `${video[1]}-${video[2]}`;
  }

  const trouve = motif.exec(nom);

  if (trouve === null || trouve[1] === undefined || trouve[2] === undefined) {
    return null;
  }

  return `${trouve[1]}-${trouve[2]}`;
}

function controlerEspace(espace, releve) {
  const prefixe = `public/${espace.nom}`;
  const motif = motifDeNom(espace.vues);
  const motifVideo = motifDeNomVideo();
  /** Un nom est admis s'il est une image du vocabulaire OU une vidéo. */
  const nomAdmis = (nom) => motif.test(nom) || (espace.videos && motifVideo.test(nom));
  const { dossiers, fichiersRacine, livres } = releve;
  const fichiers = livres.filter((livre) => !livre.estDossier);

  /* Contrôle 1 — le nom des dossiers. */
  controle(`[${espace.nom}] Chaque dossier porte un nom admis`, (exiger, noter) => {
    for (const dossier of dossiers) {
      exiger(
        espace.dossiersAdmis.has(dossier),
        `${prefixe}/${dossier}/ — « ${dossier} » n’est pas ${espace.regleDossier}`,
      );
    }

    const racineAdmise = espace.videos ? [MANIFESTE, MANIFESTE_VIDEO] : [MANIFESTE];

    for (const nom of fichiersRacine) {
      exiger(
        racineAdmise.includes(nom),
        `${prefixe}/${nom} — seul(s) « ${racineAdmise.join(' » et « ')} » admis à la racine ; ` +
          'les images et les vidéos vivent dans un dossier',
      );
    }

    for (const livre of livres) {
      exiger(
        !livre.estDossier,
        `${prefixe}/${livre.relatif}/ — l’arborescence est plate : un dossier, ses fichiers, rien de plus`,
      );
    }

    const couverts = dossiers.filter((dossier) => espace.dossiersAdmis.has(dossier)).length;

    noter(
      `${String(couverts)} dossier(s) conforme(s) sur ${String(espace.dossiersAdmis.size)} nom(s) admis`,
    );
  });

  /* Contrôle 2 — le vocabulaire des noms de fichiers. */
  controle(
    `[${espace.nom}] Chaque nom de fichier appartient au vocabulaire fermé`,
    (exiger, noter) => {
      const attendu =
        `« {${espace.vues.join('|')}}-{${LARGEURS.join('|')}}.{${ENCODAGES.join('|')}} » ou « ${PARTAGE} »` +
        (espace.videos
          ? ` ou « {${VUES_VIDEO.join('|')}}-{${LARGEURS_VIDEO.join('|')}}.{${CODECS.join('|')}}.mp4 »`
          : '');

      for (const livre of fichiers) {
        exiger(
          nomAdmis(livre.nom),
          `${prefixe}/${livre.relatif} — hors vocabulaire ; attendu ${attendu}`,
        );
      }

      noter(
        `${String(fichiers.length)} fichier(s) examiné(s), ` +
          `${String(espace.vues.length * LARGEURS.length * ENCODAGES.length + 1)} noms admis par dossier`,
      );
    },
  );

  /* Contrôle 3 — le relevé, dans les deux sens. */
  controle(`[${espace.nom}] Le relevé et le disque disent la même chose`, (exiger, noter) => {
    if (!fichiersRacine.includes(MANIFESTE)) {
      noter(`aucun ${MANIFESTE} : rien à confronter (il devient obligatoire quand il existe)`);
      return;
    }

    const brut = readFileSync(join(espace.racine, MANIFESTE), 'utf8');
    let contenu;

    try {
      contenu = JSON.parse(brut);
    } catch (erreur) {
      exiger(false, `${prefixe}/${MANIFESTE} n’est pas du JSON valide : ${String(erreur)}`);
      return;
    }

    const annonces = contenu?.fichiers;

    if (!Array.isArray(annonces)) {
      exiger(
        false,
        `${prefixe}/${MANIFESTE} : champ « fichiers » absent ou non tableau — forme attendue ` +
          '{ "fichiers": ["<dossier>/<nom>", …] }',
      );
      return;
    }

    /* Chaque entrée doit être une CHAÎNE. `annonces.map(String)` transformait
       silencieusement un nombre, un objet ou un `null` glissé dans le tableau en
       « 42 », « [object Object] » ou « null », puis se plaignait que le fichier
       correspondant manquait sur le disque — un message qui envoie chercher un
       fichier au lieu d'envoyer corriger le relevé. */
    for (const entree of annonces.filter((valeur) => typeof valeur !== 'string')) {
      exiger(
        false,
        `${prefixe}/${MANIFESTE} : entrée non textuelle (${typeof entree}) — chaque entrée ` +
          'de « fichiers » est un chemin « <dossier>/<nom> »',
      );
    }

    const surLeDisque = new Set(fichiers.map((livre) => livre.relatif));
    const auManifeste = new Set(annonces.filter((entree) => typeof entree === 'string'));

    /* LES DEUX RELEVÉS SE LISENT ENSEMBLE, jamais l'un sans l'autre.
       Les vidéos sont écrites par un pipeline distinct, donc dans un fichier
       distinct — mais la question posée par ce contrôle ne se découpe pas :
       « tout ce qui est livré est-il déclaré, et tout ce qui est déclaré est-il
       livré ». Confronter le disque au seul manifeste d'images aurait fait de
       chaque vidéo un orphelin ; ne pas relire du tout le second relevé aurait
       laissé une vidéo supprimée y figurer indéfiniment. */
    for (const relatif of videosDeclarees(espace, fichiersRacine).keys()) {
      auManifeste.add(relatif);
    }

    for (const annonce of auManifeste) {
      exiger(
        surLeDisque.has(annonce),
        `${prefixe}/${MANIFESTE} ou ${MANIFESTE_VIDEO} annonce « ${annonce} », absent du disque`,
      );
    }

    for (const present of surLeDisque) {
      exiger(
        auManifeste.has(present),
        `${prefixe}/${present} est livré mais absent des relevés — orphelin`,
      );
    }

    noter(
      `${String(auManifeste.size)} entrée(s) aux relevés, ${String(surLeDisque.size)} sur le disque`,
    );
  });

  /* Contrôle 4 — le poids, fichier par fichier. */
  controle(`[${espace.nom}] Chaque fichier tient sous son plafond de poids`, (exiger, noter) => {
    let peses = 0;
    let lePlusLourd = 0;
    let total = 0;

    for (const livre of fichiers) {
      const clef = clefDePlafond(livre.nom, motif, motifVideo);

      if (clef === null) {
        /* Hors vocabulaire : le contrôle 2 l'a déjà signalé, inutile de le
           compter deux fois sous un intitulé qui n'est pas le sien. */
        continue;
      }

      const plafond = PLAFONDS_KO[clef];

      if (plafond === undefined) {
        exiger(
          false,
          `${prefixe}/${livre.relatif} — aucun plafond déclaré pour « ${clef} » : ` +
            'ajoutez-le à PLAFONDS_KO (décision D36) avant de livrer ce format',
        );
        continue;
      }

      const octets = statSync(livre.absolu).size;
      const ko = octets / 1024;
      peses += 1;
      total += ko;
      lePlusLourd = Math.max(lePlusLourd, ko);

      exiger(
        octets <= plafond * 1024,
        `${prefixe}/${livre.relatif} — ${ko.toFixed(1)} Ko pour un plafond de ${String(plafond)} Ko`,
      );
    }

    noter(
      peses === 0
        ? 'aucun fichier pesé'
        : `${String(peses)} fichier(s) pesé(s), le plus lourd à ${lePlusLourd.toFixed(1)} Ko, ` +
            `${(total / 1024).toFixed(2)} Mo au dépôt`,
    );
  });

  /* Contrôle 5 — aucune métadonnée dans les binaires. */
  controle(`[${espace.nom}] Les binaires livrés sont nus`, (exiger, noter) => {
    let examines = 0;

    for (const livre of fichiers) {
      if (!estBinaireExaminable(livre.nom)) {
        continue;
      }

      examines += 1;

      for (const { motif: marqueur, trahit } of detecterMetadonnees(livre.absolu)) {
        exiger(
          false,
          `${prefixe}/${livre.relatif} — marqueur « ${libelleMarqueur(marqueur)} » : ${trahit}`,
        );
      }
    }

    noter(`${String(examines)} binaire(s) examiné(s) sur leurs 64 Ko de tête et de queue`);
  });

  /* Contrôle 6 — les dimensions, LUES SUR LES OCTETS. */
  controle(
    `[${espace.nom}] Chaque fichier mesure ce que son nom et le relevé annoncent`,
    (exiger, noter) => {
      const declarees = dimensionsDeclarees(espace, fichiersRacine);

      /* Les vidéos apportent les leurs, lues par ffprobe au moment de
         l'encodage : même confrontation, même exigence. */
      for (const [relatif, taille] of videosDeclarees(espace, fichiersRacine)) {
        declarees.set(relatif, taille);
      }
      let mesures = 0;
      let confrontesAuReleve = 0;

      for (const livre of fichiers) {
        if (!estBinaireExaminable(livre.nom)) {
          continue;
        }

        const mesure = lireDimensions(livre.absolu);

        if (mesure === null) {
          exiger(
            false,
            `${prefixe}/${livre.relatif} — dimensions illisibles : ni un JPEG ni un AVIF ` +
              'reconnaissable. Un fichier dont on ne sait pas mesurer la taille ne se livre pas',
          );
          continue;
        }

        mesures += 1;

        /* a) LE NOM. `partage-1200x630.jpg` annonce les deux dimensions,
              `principal-320.avif` n'annonce qu'une largeur. Un nom HORS
              VOCABULAIRE, lui, n'annonce rien du tout — même s'il se termine par
              un nombre : le contrôle 2 dit déjà ce qu'il y a à dire de
              `principal-2.jpg`, et le redire ici sous un second intitulé ferait
              chercher deux défauts là où il n'y en a qu'un. */
        const annonce = nomAdmis(livre.nom) ? dimensionsAnnonceesParLeNom(livre.nom) : null;

        if (annonce !== null) {
          exiger(
            mesure.largeur === annonce.largeur,
            `${prefixe}/${livre.relatif} — le nom annonce ${String(annonce.largeur)} points de ` +
              `large, le fichier en mesure ${String(mesure.largeur)}`,
          );

          if (annonce.hauteur !== null) {
            exiger(
              mesure.hauteur === annonce.hauteur,
              `${prefixe}/${livre.relatif} — le nom annonce ${String(annonce.hauteur)} points de ` +
                `haut, le fichier en mesure ${String(mesure.hauteur)}`,
            );
          }
        }

        /* b) LE RELEVÉ. C'est la moitié qui manquait : le relevé de C15 portait
              `largeur: 1200, hauteur: 630` pour un fichier de 1280 × 710, parce
              que ces deux nombres y étaient RECOPIÉS de la consigne au lieu
              d'être lus du produit. */
        const declaree = declarees.get(livre.relatif);

        if (declaree === undefined) {
          continue;
        }

        confrontesAuReleve += 1;

        exiger(
          declaree.largeur === mesure.largeur && declaree.hauteur === mesure.hauteur,
          `${prefixe}/${MANIFESTE} déclare ${String(declaree.largeur)}×${String(declaree.hauteur)} ` +
            `pour ${livre.relatif}, qui mesure ${String(mesure.largeur)}×${String(mesure.hauteur)}`,
        );
      }

      noter(
        `${String(mesures)} fichier(s) mesuré(s) sur leurs octets, ` +
          `${String(confrontesAuReleve)} confronté(s) au relevé`,
      );
    },
  );
}

/**
 * Les dimensions que le relevé DÉCLARE, par chemin relatif.
 *
 * Rend une table vide si le relevé est absent ou mal formé : le contrôle 3 dit
 * déjà ce qu'il faut dire de sa forme, et une seconde plainte sous un autre
 * intitulé enverrait chercher deux défauts là où il n'y en a qu'un.
 */
/**
 * Ce que le relevé des VIDÉOS déclare, par chemin relatif (C19).
 *
 * Rend une table vide dès que le fichier manque ou n'a pas la forme attendue :
 * comme pour son aîné, ce n'est pas ici qu'on dit ce qui ne va pas dans un
 * relevé — le contrôle 3 s'en charge, et deux plaintes pour un défaut envoient
 * chercher deux défauts.
 */
function videosDeclarees(espace, fichiersRacine) {
  const table = new Map();

  if (!espace.videos || !fichiersRacine.includes(MANIFESTE_VIDEO)) {
    return table;
  }

  let contenu;

  try {
    contenu = JSON.parse(readFileSync(join(espace.racine, MANIFESTE_VIDEO), 'utf8'));
  } catch {
    return table;
  }

  /* LE RELEVÉ EST INDEXÉ PAR CLEF DEPUIS C19-ter : il en portait UNE (l'accueil)
     et il en porte DEUX (l'accueil, la boutique). La forme est un objet de
     clefs plutôt qu'un tableau, parce que c'est la CLEF que `<VideoHeros>`
     reçoit en propriété — un tableau aurait obligé la page à connaître un rang,
     c'est-à-dire à dépendre de l'ordre d'un fichier engendré. */
  const videos =
    typeof contenu?.videos === 'object' && contenu.videos !== null ? contenu.videos : {};

  for (const entree of Object.values(videos)) {
    const dossier = typeof entree?.dossier === 'string' ? entree.dossier : null;
    const sources = Array.isArray(entree?.sources) ? entree.sources : [];

    if (dossier === null) {
      continue;
    }

    /* Le relevé porte `editorial/accueil` — le préfixe de l'espace en tête,
       parce qu'il se lit seul. Les chemins de ce contrôle-ci sont relatifs à
       l'espace : on retire donc le premier segment, et une seule fois. */
    const sousDossier = dossier.startsWith(`${espace.nom}/`)
      ? dossier.slice(espace.nom.length + 1)
      : dossier;

    for (const source of sources) {
      if (
        typeof source?.fichier !== 'string' ||
        typeof source.largeur !== 'number' ||
        typeof source.hauteur !== 'number'
      ) {
        continue;
      }

      table.set(`${sousDossier}/${source.fichier}`, {
        largeur: source.largeur,
        hauteur: source.hauteur,
      });
    }
  }

  return table;
}

function dimensionsDeclarees(espace, fichiersRacine) {
  const table = new Map();

  if (!fichiersRacine.includes(MANIFESTE)) {
    return table;
  }

  let contenu;

  try {
    contenu = JSON.parse(readFileSync(join(espace.racine, MANIFESTE), 'utf8'));
  } catch {
    return table;
  }

  for (const derive of Array.isArray(contenu?.derives) ? contenu.derives : []) {
    if (
      typeof derive?.fichier === 'string' &&
      Number.isInteger(derive.largeur) &&
      Number.isInteger(derive.hauteur)
    ) {
      table.set(derive.fichier, { largeur: derive.largeur, hauteur: derive.hauteur });
    }
  }

  return table;
}

/* -------------------------------------------------------------------------- */
/* Exécution                                                                   */
/* -------------------------------------------------------------------------- */

console.log('');
console.log(
  'Garde des images — un dossier par nom admis, un vocabulaire fermé, des dimensions mesurées',
);
console.log('-'.repeat(76));

for (const espace of ESPACES) {
  console.log(`          périmètre : ${espace.racine.split(sep).join('/')}`);

  const releve = relever(espace);

  if (releve.etat === 'invalide') {
    controle(`[${espace.nom}] La racine de l’espace est un dossier`, (exiger) => {
      exiger(
        false,
        `public/${espace.nom} existe mais n’est pas un dossier ; ` +
          'un fichier portant ce nom empêche toute livraison',
      );
    });
    continue;
  }

  if (releve.etat === 'absent') {
    controle(`[${espace.nom}] Rien à contrôler`, (exiger, noter) => {
      noter(
        `aucune image livrée : public/${espace.nom}/ n’existe pas encore ` +
          `(les contrôles reprendront à la première livraison, tranche ${espace.tranche})`,
      );
    });
    continue;
  }

  controlerEspace(espace, releve);
}

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

const enEchec = controles.filter((c) => c.anomalies.length > 0);

for (const { intitule, anomalies, observations } of controles) {
  console.log(`${anomalies.length === 0 ? '[ OK   ]' : '[ ÉCHEC]'} ${intitule}`);

  for (const observation of observations) {
    console.log(`          ${observation}`);
  }

  for (const anomalie of anomalies) {
    console.log(`   -> ${anomalie}`);
  }
}

console.log('-'.repeat(76));

if (enEchec.length === 0) {
  console.log(`${String(controles.length)} contrôles, aucune anomalie.`);
  console.log('');
} else {
  console.log(
    `${String(controles.length)} contrôles, ${String(enEchec.length)} en échec : ${enEchec.map((c) => c.intitule).join(' ; ')}`,
  );
  console.log('');
  process.exitCode = 1;
}
