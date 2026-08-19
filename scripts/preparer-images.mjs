/**
 * LE PIPELINE DES VISUELS — `npm run preparer-images`
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL FAIT, ET POURQUOI IL EST HORS LIGNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cinq étapes, de la sortie brute d'un moteur d'images au fichier que le site
 * sert : ingestion et vérification des hachages, recadrage, déshabillage des
 * métadonnées et conversion sRGB, encodage AVIF et JPEG, relevé de livraison.
 *
 * Il tourne SUR LE POSTE, à la main, quand les masters changent. Ni la
 * construction ni l'intégration continue ne l'appellent, et `npm run controle`
 * ne l'exécute jamais. Le plan de refonte l'a décidé en même temps qu'il
 * écartait `next/image` : les dérivés sont VERSIONNÉS, servis comme des
 * fichiers statiques, et personne ne redimensionne une image à l'exécution.
 *
 * La conséquence la plus utile n'est pas la vitesse, c'est la SURFACE. sharp
 * reste une devDependency, absente du graphe d'exécution comme de la CI — ce
 * qui rend vraie, et non seulement rassurante, la ligne du CLAUDE.md qui parle
 * des vulnérabilités hautes de ses dépendances embarquées : aucune image n'est
 * traitée par le serveur, jamais, sur aucune requête.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ÉTAPE 1 — INGESTION : LE HACHAGE FAIT FOI, PAS LE NOM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les masters vivent dans `travaux-images/brut/`, hors du dépôt. Le manifeste,
 * lui, est versionné, et il porte le SHA-256 de chaque master. Un fichier
 * absent, ou présent mais modifié, fait échouer l'ingestion EN LE NOMMANT.
 *
 * Ce n'est pas de la méfiance envers l'opérateur : c'est la seule façon
 * qu'ait une image versionnée de rester rattachée à la relecture humaine qui
 * l'a validée. La décision D35 interdit des choses qu'aucune garde ne sait
 * lire — un visage, une marque, un signe officiel de qualité. Ces interdits
 * sont tenus par une relecture À L'ŒIL, master par master, et la relecture
 * porte sur un OCTET précis. Sans hachage, on relit un fichier et on livre
 * peut-être l'autre.
 *
 * La série a d'ailleurs produit son cas d'école pendant cette tranche : le
 * master B01 v2 écrivait « premiére » avec un accent aigu. Le journal avait
 * posé la réserve, la relecture au zoom l'a confirmée, et le master a été
 * ré-engendré. Sans hachage au manifeste, rien n'aurait distingué la v2 de la
 * v3 une fois les dérivés produits.
 *
 * Aucun nom d'origine ne survit non plus : les dérivés s'appellent
 * `<vue>-<largeur>.<format>`, un vocabulaire fermé que la garde des images
 * connaît et qu'une fiche RECOMPOSE depuis son slug. Rien du canal de
 * génération n'entre au dépôt, ni dans un nom de fichier, ni dans un octet de
 * métadonnée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ÉTAPE 3 — LE DÉSHABILLAGE EST TOTAL, ET IL EST VÉRIFIÉ APRÈS COUP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * sharp ne recopie aucune métadonnée par défaut : ne pas appeler `.withMetadata()`
 * suffit à produire un fichier nu. « Suffit » est une affirmation sur une
 * bibliothèque, donc une affirmation qui peut vieillir — le pipeline REVÉRIFIE
 * donc chaque fichier produit avec le détecteur partagé
 * `metadonnees-binaires.mjs`, celui-là même que les gardes emploient. Un
 * marqueur trouvé fait échouer la préparation, sur place, avec le nom du
 * fichier.
 *
 * La conversion sRGB, elle, est explicite (`toColourspace('srgb')`) : un
 * master en Display P3 servi tel quel s'affiche désaturé sur les écrans qui ne
 * gèrent pas les profils, et le profil lui-même est une métadonnée que l'étape
 * précédente vient de retirer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ÉTAPE 4 — LES QUALITÉS, ET COMMENT ELLES ONT ÉTÉ CHOISIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux formats, pas trois : AVIF d'abord, JPEG en repli. WebP est écarté par le
 * plan — il ne gagne rien contre AVIF là où AVIF est lu, et il double le nombre
 * de fichiers à produire, à peser et à garder.
 *
 * Les qualités ne sont pas des valeurs par défaut, et elles n'ont pas été
 * choisies au poids : elles ont été choisies EN REGARDANT L'ÉTIQUETTE, qui est
 * l'endroit le plus exigeant de la série — du texte en didone, avec des déliés
 * d'un pixel et un accent grave, sur un fond clair. Trois encodages du même
 * dérivé, agrandis trois fois, ont été comparés côte à côte :
 *
 * | AVIF | principal-640 | rendu de l'étiquette                        |
 * |------|---------------|---------------------------------------------|
 * | 52   |  9,1 Ko       | déliés empâtés, accent grave épaissi        |
 * | 66   | 13,4 Ko       | serifs nets, accent lisible                 |
 * | 78   | 20,7 Ko       | à peine mieux que 66                        |
 *
 * 66 est retenu : c'est la marche qui rend le texte, et la suivante ne rend
 * plus rien. Le budget n'était pas le facteur limitant — la fiche pilote tient
 * très largement sous les 120 Ko de la décision D36 dans les trois cas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ÉTAPE 5 — LE RELEVÉ, ET CE QU'IL PERMET À LA GARDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `public/produits/manifeste-livre.json` est versionné. Il porte la liste plate
 * que `verifier-images.mjs` confronte au disque DANS LES DEUX SENS, et, à côté,
 * le détail de chaque dérivé — dimensions, octets, hachage du fichier produit
 * et hachage du master dont il descend. C'est cette dernière colonne qui rend
 * la chaîne traçable de bout en bout : d'un fichier servi, on remonte au master
 * relu.
 *
 * Usage : `npm run preparer-images` (`--verifier` relit sans réécrire).
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import {
  fenetreDeRecherche,
  localiserSignature,
  verdictSignature,
} from './etincelle.mjs';
import { lireDimensions } from './dimensions-image.mjs';
import { detecterMetadonnees, libelleMarqueur } from './metadonnees-binaires.mjs';
import { refaireSortie } from './sortie-images.mjs';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MASTERS = join(RACINE, 'travaux-images', 'brut');
const MANIFESTE = join(RACINE, 'travaux-images', 'manifeste.json');

/**
 * DEUX RACINES DE SORTIE, ET C'EST C15 QUI OUVRE LA SECONDE.
 *
 * `public/produits/<slug>/` porte ce qui appartient à un produit : son packshot
 * et sa vue d'ambiance. `public/editorial/<clef>/` porte ce qui n'appartient à
 * aucun — les sept macros de famille et le héros de l'accueil. La séparation
 * n'est pas cosmétique : la garde des images contrôle que chaque dossier de
 * `produits/` est un slug EXACT du catalogue, et une macro de famille n'en est
 * pas un. Les mélanger aurait forcé à relâcher ce contrôle-là, qui est le
 * premier des cinq.
 *
 * Chaque racine porte son propre relevé de livraison, du même nom : la garde
 * les confronte au disque l'une après l'autre, avec le même code.
 */
const SORTIE_PRODUITS = join(RACINE, 'public', 'produits');
const SORTIE_EDITORIAL = join(RACINE, 'public', 'editorial');
const NOM_RELEVE = 'manifeste-livre.json';

/* -------------------------------------------------------------------------- */
/* Les largeurs et les qualités                                                */
/* -------------------------------------------------------------------------- */

/**
 * LES LARGEURS PAR VUE, bornées par la boîte de recadrage.
 *
 * Le plan annonçait `principal` en 320/640/928 et `ambiance` en 640/1024/1440.
 * Ces largeurs supposaient qu'on livre le master entier ; la boîte qui retire
 * l'étincelle plafonne la matière à 640 points de large sur les masters
 * portrait. Livrer du 928 depuis une source de 640 serait un AGRANDISSEMENT :
 * plus d'octets pour moins d'image. Le pipeline REFUSE d'agrandir, et le dit.
 */
const LARGEURS = {
  /* 320 puis 480, et les deux ajouts racontent la même leçon en deux temps.
     Premier temps (livraison C14) : `ambiance` n'existait qu'en 640, et un
     téléphone téléchargeait 17,2 Ko pour une place de 240 points — non parce
     que le `sizes` mentait, mais parce que le `srcset` ne proposait rien de
     plus petit. Un srcset à une seule entrée n'est pas un srcset.
     Second temps (round 1) : 320 n'a rien changé À LA MESURE. La place vaut
     240 points CSS, le profil mobile de Lighthouse a une densité de 1,75, le
     besoin réel est donc de 420 points — et devant 320 ou 640, le navigateur
     prend 640. Il avait raison ; c'est l'échelle qui était trop grossière. 480
     est la marche qui manquait : elle sert exactement 240 × 2 (la densité de
     la plupart des téléphones) et couvre le 1,75 du profil mesuré. */
  principal: [320, 480, 640],
  ambiance: [320, 480, 640],
  /* La macro de famille ne sert QU'UNE place, et une seule : le cadre d'aperçu
     de la rangée des familles, sur l'accueil, large de 560 points au plus. 1024
     la sert à deux fois la densité ; 1440 avait été produite d'abord et ne
     servait rien — sept familles, deux formats, presque un mégaoctet de dépôt
     pour des fichiers qu'aucun `sizes` ne demande. Retirée. */
  macro: [320, 640, 1024],
  /* Le héros, lui, est PLEINE LARGEUR : 1440 le sert vraiment. */
  hero: [640, 1024, 1440],
  /* AJOUTÉES EN C19-ter (retours client 14 et 17).

     `illustration` sert la colonne droite d'un héros à DEUX colonnes sur
     `/livraison`, `/suivi` et `/panier` : une demi-largeur de page, soit 640
     points CSS au plus sur un bureau de 1 440 et 350 sur un téléphone de 390.
     1024 la sert à deux fois la densité ; 1440 n'aurait servi aucune place et
     aurait coûté trois fichiers de plus au dépôt, exactement la faute que la
     macro de famille a payée en C15.

     `affiche` s'arrête à 1024 pour une raison différente et plus dure : le
     master EST la première image d'une vidéo de 1 280 points, et le pipeline
     refuse d'agrandir. Au-delà de 1 024 il ne resterait qu'une marche, et elle
     serait servie à un écran qui, lui, aura déjà la vidéo. */
  illustration: [640, 1024],
  affiche: [640, 1024],
};

/**
 * L'IMAGE DE PARTAGE, ET POURQUOI ELLE EST COMPOSÉE ET NON RECADRÉE.
 *
 * 1200×630 est un rapport 40:21, c'est-à-dire presque deux fois plus large que
 * haut ; les masters de cette série sont des portraits 4:5. Y tailler une bande
 * couperait la bouteille aux épaules et aux pieds — ce qu'aucun aperçu de
 * partage ne pardonne, puisqu'il n'y a rien d'autre à regarder.
 *
 * Le pipeline POSE donc le recadrage sur un fond, en `contain`, et le fond n'est
 * pas choisi : il est PRÉLEVÉ sur le master, sur le POURTOUR du recadrage —
 * c'est-à-dire exactement là où la couture se produit (voir `papierDuMaster`, et
 * les deux fautes que le round 1 de C15 y a trouvées). Il suit donc le papier de
 * la série si celui-ci change un jour de ton, sans qu'aucune valeur ne soit
 * écrite ici.
 *
 * `marge` est la bande de papier garantie entre le sujet et le bord de l'image :
 * le sujet entre dans une boîte de 1120 × 550, le reste est étendu. C'est la
 * seule arithmétique de cette étape, et elle est exacte par construction.
 */
const PARTAGE = { largeur: 1200, hauteur: 630, marge: 40 };

/**
 * LES QUALITÉS D'ENCODAGE, arrêtées sur le rendu de l'étiquette (voir l'en-tête).
 *
 * `effort: 9` sur l'AVIF est le maximum : c'est du temps de POSTE dépensé une
 * fois contre des octets économisés à chaque visite. Le repli JPEG est encodé
 * en mode progressif et `mozjpeg`, pour la même raison.
 *
 * `chromaSubsampling: '4:4:4'` sur l'AVIF n'est pas une coquetterie : les
 * étiquettes de cette série portent du texte fin et sombre sur fond clair, et
 * c'est exactement ce que le sous-échantillonnage de chrominance abîme en
 * premier.
 */
const QUALITES = {
  avif: { quality: 66, effort: 9, chromaSubsampling: '4:4:4' },
  jpeg: { quality: 80, progressive: true, mozjpeg: true },
};

/* -------------------------------------------------------------------------- */
/* Outils                                                                      */
/* -------------------------------------------------------------------------- */

const anomalies = [];
const observations = [];

function anomalie(message) {
  anomalies.push(message);
}

function noter(message) {
  observations.push(message);
}

function sha256(chemin) {
  return createHash('sha256').update(readFileSync(chemin)).digest('hex');
}

function ko(octets) {
  return `${(octets / 1024).toFixed(1)} Ko`;
}

/**
 * Les dimensions du fichier PRODUIT, lues dans ses octets — jamais celles qu'on
 * a demandées.
 *
 * Le lecteur est le même module PUR que la garde des images emploie
 * (`dimensions-image.mjs`) : les deux bouts de la chaîne mesurent de la même
 * façon, donc un désaccord entre eux ne peut venir que du fichier.
 */
function mesurer(destination, etiquette) {
  const mesure = lireDimensions(destination);

  if (mesure === null) {
    anomalie(`${etiquette} — dimensions illisibles dans le fichier produit`);
  }

  return mesure;
}

/**
 * sharp, chargé PARESSEUSEMENT et avec un message qui dit quoi faire.
 *
 * L'import est dynamique pour que ce fichier reste lisible — et surtout
 * IMPORTABLE — sur une machine qui n'a pas sharp. Un `import` en tête ferait
 * échouer le module avant la première ligne de diagnostic.
 */
async function chargerSharp() {
  try {
    const module = await import('sharp');
    return module.default;
  } catch {
    throw new Error(
      'sharp est introuvable. C’est un OUTIL DE POSTE :\n' +
        '       npm install -D sharp\n' +
        '   Les dérivés sont VERSIONNÉS : ni la construction ni l’intégration\n' +
        '   continue n’en ont besoin.',
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Étape 1 — ingestion                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Lit le manifeste, résout les boîtes nommées, vérifie les hachages.
 *
 * Rend les seules entrées à livrer. Les autres sont comptées et dites : une
 * entrée déclarée `livrer: false` n'est pas un oubli, c'est une décision, et
 * elle porte sa note dans le manifeste.
 */
function ingerer() {
  const brut = JSON.parse(readFileSync(MANIFESTE, 'utf8'));
  const boites = brut.boites ?? {};
  const retenues = [];
  let ecartees = 0;

  for (const entree of brut.entrees ?? []) {
    if (entree.livrer !== true) {
      ecartees += 1;
      continue;
    }

    const chemin = join(MASTERS, entree.master);

    let taille;

    try {
      taille = statSync(chemin).size;
    } catch {
      anomalie(
        `${entree.master} — master absent de travaux-images/brut/ ; ` +
          'le manifeste l’annonce, le disque ne l’a pas',
      );
      continue;
    }

    const empreinte = sha256(chemin);

    if (empreinte !== entree.sha256) {
      anomalie(
        `${entree.master} — le master a changé depuis la relecture : ` +
          `manifeste ${String(entree.sha256).slice(0, 12)}…, disque ${empreinte.slice(0, 12)}…`,
      );
      continue;
    }

    const boite = typeof entree.boite === 'string' ? boites[entree.boite] : entree.boite;

    if (boite === undefined || boite === null) {
      anomalie(`${entree.master} — boîte de recadrage « ${String(entree.boite)} » introuvable`);
      continue;
    }

    if (typeof entree.alt !== 'string' || entree.alt.trim() === '') {
      anomalie(`${entree.master} — alternative textuelle vide (décision D35, régime (b))`);
      continue;
    }

    /* La DESTINATION se déduit du manifeste, et l'entrée doit en nommer une
       seule : un visuel appartient à un produit, ou il est éditorial. Les deux
       à la fois n'a pas de sens et laisserait le fichier livré à deux endroits. */
    const estProduit = typeof entree.produit === 'string' && entree.produit !== '';
    const estEditorial = typeof entree.editorial === 'string' && entree.editorial !== '';

    if (estProduit === estEditorial) {
      anomalie(
        `${entree.master} — destination ambiguë : une entrée nomme « produit » (slug du ` +
          'catalogue) OU « editorial » (clef de public/editorial/), jamais les deux ni aucune',
      );
      continue;
    }

    retenues.push({
      ...entree,
      chemin,
      boite,
      octetsMaster: taille,
      racine: estProduit ? SORTIE_PRODUITS : SORTIE_EDITORIAL,
      dossier: estProduit ? entree.produit : entree.editorial,
      espace: estProduit ? 'produits' : 'editorial',
    });
  }

  noter(
    `${String(retenues.length)} entrée(s) retenue(s), ${String(ecartees)} écartée(s) par le manifeste`,
  );

  return retenues;
}

/* -------------------------------------------------------------------------- */
/* Étape 1 bis — la signature du moteur, CHERCHÉE dans le master               */
/* -------------------------------------------------------------------------- */

/**
 * LOCALISE L'ÉTINCELLE, ET REFUSE DE LA LIVRER.
 *
 * C14 avait relevé sa position à la main, sur deux masters, et l'avait recopiée
 * en commentaire du manifeste. Le relevé était juste ; ce qui manquait, c'est
 * que rien ne le VÉRIFIAIT — vingt-neuf masters n'avaient jamais été relus, et
 * quatre points seulement séparaient le bord de la boîte `portrait` du début de
 * la signature.
 *
 * Chaque master ingéré passe désormais par le détecteur (`etincelle.mjs`).
 * Trois issues, et aucune n'est silencieuse :
 *
 *   - signature localisée DANS la boîte  → anomalie nommée, livraison arrêtée ;
 *   - signature localisée HORS la boîte  → la marge est mesurée et consignée ;
 *   - signature non reconnue             → dit à l'écran et consigné `null`,
 *     parce que « je ne l'ai pas vue » n'est pas « il n'y en a pas ».
 *
 * sharp n'intervient QUE pour fabriquer la vignette du coin ; toute la décision
 * est dans un module pur, éprouvé par des cas de test qui n'ouvrent aucune
 * image (l'intégration continue n'exécute jamais sharp).
 */
async function examinerSignature(sharp, entree) {
  const meta = await sharp(entree.chemin).metadata();
  const fenetre = fenetreDeRecherche(meta.width, meta.height);

  const vignette = await sharp(entree.chemin)
    .extract({ left: fenetre.x, top: fenetre.y, width: fenetre.largeur, height: fenetre.hauteur })
    .greyscale()
    .resize({ width: fenetre.largeurReduite, height: fenetre.hauteurReduite, fit: 'fill' })
    .raw()
    .toBuffer();

  const signature = localiserSignature(vignette, fenetre);
  const verdict = verdictSignature(signature, entree.boite);

  return {
    master: entree.master,
    sha256: entree.sha256,
    dimensions: { largeur: meta.width, hauteur: meta.height },
    boite: entree.boite,
    signature: {
      localisee: signature.localisee,
      score: signature.score,
      amplitude: signature.amplitude,
      precision: signature.precision,
      boite: signature.boite,
    },
    dansLaBoite: verdict.dansLaBoite,
    marge: verdict.marge,
  };
}

/** Rend un rectangle lisible : `x 132-772, y 66-1090`. */
function rectangle(boite) {
  return (
    `x ${String(boite.x)}-${String(boite.x + boite.largeur)}, ` +
    `y ${String(boite.y)}-${String(boite.y + boite.hauteur)}`
  );
}

/**
 * Le verdict, master par master : anomalie si la signature entre dans la boîte,
 * observation dans les deux autres cas — jamais de silence.
 */
function verdictDeSignature(masters) {
  for (const releve of masters) {
    if (releve.dansLaBoite === true) {
      anomalie(
        `${releve.master} — LA SIGNATURE DU MOTEUR ENTRE DANS LA BOÎTE : étincelle ` +
          `localisée ${rectangle(releve.signature.boite)} (score ${String(releve.signature.score)}, ` +
          `amplitude ${String(releve.signature.amplitude)}, précision ±${String(releve.signature.precision)}) ` +
          `contre une boîte ${rectangle(releve.boite)}. Recadrez — ou, si la relecture à ` +
          'l’œil ne trouve rien à cet endroit, re-engendrez le master (C15) : ce pipeline ' +
          'ne livre pas la signature d’un moteur d’images.',
      );
      continue;
    }

    noter(
      releve.signature.localisee
        ? `${releve.master} — étincelle ${rectangle(releve.signature.boite)}, ` +
            `${String(releve.marge)} point(s) hors de la boîte (score ${String(releve.signature.score)}, ` +
            `amplitude ${String(releve.signature.amplitude)}, précision ±${String(releve.signature.precision)})`
        : `${releve.master} — AUCUNE SIGNATURE RECONNUE (score ${String(releve.signature.score)}, ` +
            `amplitude ${String(releve.signature.amplitude)}) : soit le master n’en porte pas, soit le ` +
            'détecteur l’a manquée. La relecture à l’œil (D35) reste due.',
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Étapes 2 à 4 — recadrage, déshabillage, encodage                            */
/* -------------------------------------------------------------------------- */

/**
 * LA COULEUR DU PAPIER, prélevée SUR LE POURTOUR DU RECADRAGE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DEUX FAUTES SUPERPOSÉES, TROUVÉES AU ROUND 1 DE C15
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première rédaction prélevait « un carré de 64 points juste à l'intérieur du
 * coin supérieur gauche » avec `sharp(chemin).extract(coin).stats()`. Deux
 * choses n'allaient pas, et la seconde annulait la première.
 *
 * 1. `stats()` NE VOIT PAS LE PIPELINE. Il mesure l'image D'ENTRÉE, pas le
 *    résultat des opérations enchaînées avant lui — l'`extract()` était donc
 *    ignoré, et ce qui partait en fond de l'image de partage était la moyenne
 *    du MASTER ENTIER, bouteille comprise. D'où un pourtour nettement plus
 *    sombre et plus gris que le papier, et une couture visible à l'œil sur les
 *    seize images. Mesuré : 6 à 39 points sur 255 d'écart entre ce que le
 *    pipeline posait et le papier réel.
 *
 *    La leçon est celle des gardes de ce projet, encore : une bibliothèque qui
 *    rend un chiffre sans se plaindre ne dit pas pour autant le chiffre qu'on
 *    croit lui demander. Ici on n'appelle plus `stats()` du tout — on additionne
 *    les octets bruts du recadrage, ce qui ne peut pas mentir sur ce qui a été
 *    mesuré.
 *
 * 2. LE COIN N'EST PAS LE BON ENDROIT. Même correctement prélevé, il ne
 *    répondait pas à la question. La couture ne se produit pas dans un coin :
 *    elle se produit tout le long du POURTOUR du recadrage, là où l'image
 *    rencontre le fond qu'on étend. C'est donc le pourtour qu'on prélève — une
 *    bande fine collée aux quatre bords, moyennée au prorata de sa surface.
 *    Sur les masters de studio c'est du papier ; sur le héros, qui est une
 *    scène et non un packshot, c'est le ton moyen de ses bords, ce qui reste la
 *    meilleure valeur possible pour un raccord (voir l'écart assumé du rapport).
 */
async function papierDuMaster(sharp, entree) {
  const { x, y, largeur, hauteur } = entree.boite;
  const bande = Math.max(4, Math.round(Math.min(largeur, hauteur) / 100));

  const bandes = [
    { left: x, top: y, width: largeur, height: bande },
    { left: x, top: y + hauteur - bande, width: largeur, height: bande },
    { left: x, top: y + bande, width: bande, height: hauteur - 2 * bande },
    { left: x + largeur - bande, top: y + bande, width: bande, height: hauteur - 2 * bande },
  ];

  let sommeR = 0;
  let sommeV = 0;
  let sommeB = 0;
  let points = 0;

  for (const zone of bandes) {
    const { data, info } = await sharp(entree.chemin)
      .extract(zone)
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let position = 0; position + 2 < data.length; position += info.channels) {
      sommeR += data[position];
      sommeV += data[position + 1];
      sommeB += data[position + 2];
      points += 1;
    }
  }

  return {
    r: Math.round(sommeR / points),
    g: Math.round(sommeV / points),
    b: Math.round(sommeB / points),
  };
}

async function produire(sharp, entree) {
  const derives = [];
  const largeurs = LARGEURS[entree.vue];

  if (largeurs === undefined) {
    anomalie(`${entree.master} — vue « ${String(entree.vue)} » sans largeurs déclarées`);
    return derives;
  }

  const dossier = join(entree.racine, entree.dossier);
  mkdirSync(dossier, { recursive: true });

  const rapport = entree.boite.hauteur / entree.boite.largeur;

  for (const largeur of largeurs) {
    if (largeur > entree.boite.largeur) {
      /* AGRANDIR EST REFUSÉ, ET DIT. Un dérivé plus large que sa boîte coûte
         des octets pour de l'information qui n'existe pas. */
      anomalie(
        `${entree.master} — largeur ${String(largeur)} demandée pour une boîte de ` +
          `${String(entree.boite.largeur)} : le pipeline n’agrandit pas`,
      );
      continue;
    }

    const hauteur = Math.round(largeur * rapport);

    for (const format of ['avif', 'jpg']) {
      const nom = `${entree.vue}-${String(largeur)}.${format}`;
      const destination = join(dossier, nom);

      /* Étape 2 : recadrage manifesté. Étape 3 : sRGB explicite, et AUCUN
         appel à `.withMetadata()` — c'est son absence qui produit un binaire
         nu. Étape 4 : encodage. */
      const canal = sharp(entree.chemin)
        .extract({
          left: entree.boite.x,
          top: entree.boite.y,
          width: entree.boite.largeur,
          height: entree.boite.hauteur,
        })
        .resize({ width: largeur, height: hauteur, fit: 'fill' })
        .toColourspace('srgb');

      await (format === 'avif'
        ? canal.avif(QUALITES.avif)
        : canal.jpeg(QUALITES.jpeg)
      ).toFile(destination);

      /* Étape 3, VÉRIFIÉE : ne pas demander de métadonnées et ne pas en avoir
         sont deux affirmations différentes. La seconde se contrôle. */
      for (const { motif, trahit } of detecterMetadonnees(destination)) {
        anomalie(
          `${entree.dossier}/${nom} — marqueur « ${libelleMarqueur(motif)} » survivant : ${trahit}`,
        );
      }

      /* LE RELEVÉ PORTE UNE MESURE, PLUS UNE INTENTION. `largeur` et `hauteur`
         étaient les nombres DEMANDÉS à sharp ; ce sont désormais ceux qu'on lit
         dans le fichier écrit. La nuance a coûté seize images de partage au
         round 1 de C15 — elles étaient déclarées 1200 × 630 et mesuraient
         1280 × 710, et rien dans le relevé ne pouvait le dire. */
      const mesure = mesurer(destination, `${entree.dossier}/${nom}`);

      derives.push({
        espace: entree.espace,
        fichier: `${entree.dossier}/${nom}`,
        vue: entree.vue,
        largeur: mesure?.largeur ?? null,
        hauteur: mesure?.hauteur ?? null,
        format,
        octets: statSync(destination).size,
        sha256: sha256(destination),
        master: entree.sha256,
      });

      if (mesure !== null && (mesure.largeur !== largeur || mesure.hauteur !== hauteur)) {
        anomalie(
          `${entree.dossier}/${nom} — ${String(largeur)}×${String(hauteur)} demandés, ` +
            `${String(mesure.largeur)}×${String(mesure.hauteur)} produits`,
        );
      }
    }
  }

  if (entree.partage === true || entree.partage === 'plein-cadre') {
    derives.push(await produirePartage(sharp, entree, dossier));
  }

  return derives;
}

/**
 * L'IMAGE DE PARTAGE — 1200×630, le sujet POSÉ sur son papier.
 *
 * Le site n'en avait aucune : un lien partagé n'affichait qu'un rectangle vide.
 * Une seule taille, un seul format — JPEG, le seul que tous les réseaux
 * acceptent —, et pas de variante : personne ne « choisit » une image de partage
 * à la densité de son écran.
 */
async function produirePartage(sharp, entree, dossier) {
  const nom = `partage-${String(PARTAGE.largeur)}x${String(PARTAGE.hauteur)}.jpg`;
  const destination = join(dossier, nom);
  const fond = await papierDuMaster(sharp, entree);

  /* UN SEUL `resize()` DANS LA CHAÎNE, et c'est tout le correctif du round 1.
     La première rédaction en enchaînait deux, avec un `extend()` entre les
     deux, et croyait décrire trois étapes successives. sharp ne fonctionne pas
     ainsi : il applique ses opérations dans un ORDRE FIXE (extraction, rotation,
     redimensionnement, extension…) et ne retient QUE LE DERNIER `resize()` — il
     l'annonce même sur sa sortie d'erreur, que personne ne lisait. Le fichier
     produit était donc le master mis en boîte 1200 × 630, PUIS agrandi de
     40 points sur chaque bord : 1280 × 710. Les seize images de partage du site
     étaient hors format, sous un nom, un relevé et un `<meta>` qui juraient
     tous les trois le contraire.

     La chaîne juste tient en deux gestes : on met le sujet dans la boîte
     INTÉRIEURE (1120 × 550, c'est-à-dire le format moins les deux marges), puis
     on étend de la marge. 1120 + 80 = 1200, 550 + 80 = 630, par construction.

     `contain` et non `inside` : `inside` rend une image AU PLUS 1120 × 550 sans
     la compléter, et l'étendre de 40 points ne donnerait alors 1200 × 630 que si
     le rapport du recadrage tombait juste — c'est-à-dire jamais. `contain`
     complète avec le MÊME fond que l'extension : le sujet est à la même échelle,
     le papier est le même, et le format est exact au lieu d'être espéré.

     ═══════════════════════════════════════════════════════════════════════════
     DEUX RÉGIMES DEPUIS C16, PARCE QU'UNE SCÈNE N'EST PAS UN OBJET
     ═══════════════════════════════════════════════════════════════════════════
     La composition ci-dessus est la règle, et sa raison tient au SUJET : les
     quinze packshots sont des portraits 4:5 où tailler une bande de 40:21
     couperait la bouteille aux épaules. Sur eux, composer est la seule issue.

     Le héros n'est pas un objet, c'est une SCÈNE en plein cadre, et le rapport
     de sa boîte `bandeau` est 16:9. Le rapport de l'image de partage est 40:21.
     Passer de l'un à l'autre en `cover` retire 6,7 % de la HAUTEUR — cent
     quatre-vingt-dix points sur deux mille huit cent quarante-quatre — et pas
     un point de largeur. La moitié droite vide, celle que le manifeste réserve
     au monument typographique de l'accueil et qui interdit de recadrer par la
     droite, est donc intégralement préservée.

     Le compte rendu de C15 présentait le cadre de cette image comme CONTRAINT
     (« il n'y a aucun papier à prélever, toute couleur unie y est un cadre ») :
     c'était vrai pour la seconde moitié de la phrase et faux pour la première.
     Il n'y a pas de papier à prélever, mais il n'y a pas non plus besoin d'en
     prélever — il suffit de ne pas en poser. Le cadre était donc CHOISI et
     présenté comme subi, ce qui est la seule chose qu'un compte rendu ne doit
     pas faire.

     Il est retiré. Sur les quinze packshots la couture ne se voit pas (douze
     sous 7,2 points sur 255) ; sur le héros elle se voyait à 37, c'est-à-dire
     que la même règle produisait un passe-partout discret sur quinze cartes et
     un encadrement franc sur la seizième. Le régime suit désormais le sujet, ce
     qui est exactement la distinction que le manifeste faisait déjà entre les
     boîtes `portrait`/`coffret`/`zenithal` et la boîte `bandeau`. */
  const pleinCadre = entree.partage === 'plein-cadre';

  const chaine = sharp(entree.chemin).extract({
    left: entree.boite.x,
    top: entree.boite.y,
    width: entree.boite.largeur,
    height: entree.boite.hauteur,
  });

  if (pleinCadre) {
    chaine.resize({
      width: PARTAGE.largeur,
      height: PARTAGE.hauteur,
      fit: 'cover',
      position: 'centre',
    });
  } else {
    chaine
      .resize({
        width: PARTAGE.largeur - 2 * PARTAGE.marge,
        height: PARTAGE.hauteur - 2 * PARTAGE.marge,
        fit: 'contain',
        background: fond,
      })
      .extend({
        top: PARTAGE.marge,
        bottom: PARTAGE.marge,
        left: PARTAGE.marge,
        right: PARTAGE.marge,
        background: fond,
      });
  }

  await chaine.toColourspace('srgb').jpeg(QUALITES.jpeg).toFile(destination);

  for (const { motif, trahit } of detecterMetadonnees(destination)) {
    anomalie(
      `${entree.dossier}/${nom} — marqueur « ${libelleMarqueur(motif)} » survivant : ${trahit}`,
    );
  }

  const mesure = mesurer(destination, `${entree.dossier}/${nom}`);

  /* Le format est CONTRÔLÉ ici aussi, et pas seulement par la garde. Une image
     de partage hors format ne casse rien qui se voie au dépôt : elle se voit
     chez le destinataire du lien, une fois recadrée par le réseau social. */
  if (
    mesure !== null &&
    (mesure.largeur !== PARTAGE.largeur || mesure.hauteur !== PARTAGE.hauteur)
  ) {
    anomalie(
      `${entree.dossier}/${nom} — le nom promet ${String(PARTAGE.largeur)}×${String(PARTAGE.hauteur)}, ` +
        `le fichier produit mesure ${String(mesure.largeur)}×${String(mesure.hauteur)}`,
    );
  }

  return {
    espace: entree.espace,
    fichier: `${entree.dossier}/${nom}`,
    vue: 'partage',
    largeur: mesure?.largeur ?? null,
    hauteur: mesure?.hauteur ?? null,
    format: 'jpg',
    octets: statSync(destination).size,
    sha256: sha256(destination),
    master: entree.sha256,
  };
}

/* -------------------------------------------------------------------------- */
/* Exécution                                                                   */
/* -------------------------------------------------------------------------- */

const verifierSeulement = process.argv.includes('--verifier');

console.log('');
console.log('Pipeline des visuels — ingestion, recadrage, déshabillage, encodage, relevé');
console.log('-'.repeat(76));

try {
  const entrees = ingerer();

  if (anomalies.length > 0) {
    throw new Error('ingestion interrompue');
  }

  let derives = [];
  let masters = [];

  if (verifierSeulement) {
    const releveLu = JSON.parse(readFileSync(join(SORTIE_PRODUITS, NOM_RELEVE), 'utf8'));
    const releveEditorial = JSON.parse(readFileSync(join(SORTIE_EDITORIAL, NOM_RELEVE), 'utf8'));
    derives = [...(releveLu.derives ?? []), ...(releveEditorial.derives ?? [])];
    /* Le relevé porte la position consignée : on rejoue le VERDICT sans rouvrir
       un seul master, ce qui permet de contrôler qu'une boîte modifiée à la
       main dans le manifeste n'est pas venue mordre une signature déjà connue. */
    masters = (releveLu.masters ?? []).map((releve) => {
      const entree = entrees.find((candidate) => candidate.sha256 === releve.sha256);

      if (entree === undefined) {
        return releve;
      }

      const verdict = verdictSignature(releve.signature, entree.boite);
      return { ...releve, boite: entree.boite, ...verdict };
    });
  } else {
    const sharp = await chargerSharp();

    for (const entree of entrees) {
      masters.push(await examinerSignature(sharp, entree));
    }

    /* LE VERDICT DE SIGNATURE PASSE AVANT LA PRODUCTION, et l'ordre est le
       point : un dérivé qui porte la signature du moteur ne doit pas exister,
       pas même le temps d'un rapport d'échec. On regarde d'abord, on écrit
       ensuite — et on n'efface pas la livraison précédente pour rien. */
    verdictDeSignature(masters);

    if (anomalies.length > 0) {
      throw new Error('signature du moteur dans la boîte — aucune image produite');
    }

    /* Le dossier de sortie est REFAIT : un dérivé d'une livraison précédente
       que le manifeste n'annonce plus resterait sinon sur le disque, et la
       garde des images le signalerait en orphelin — ce qui est une bonne garde
       et une mauvaise expérience.

       MAIS ON N'EFFACE QUE CE QU'ON PRODUIT, et c'est un correctif de la revue
       de clôture C20. `public/editorial/` a DEUX auteurs depuis C19 : ce
       pipeline, et `preparer-video.mjs` qui y pose les rendus vidéo et leur
       relevé. Un `rmSync` récursif emportait les seconds sans un mot — seule la
       construction rattrapait, et tard (`VideoHeros` lit le relevé au build).
       Le raisonnement complet, et le motif du critère INVERSÉ (on énumère ce
       qu'on produit, jamais ce qu'on épargne), sont dans `sortie-images.mjs`. */
    for (const racine of [SORTIE_PRODUITS, SORTIE_EDITORIAL]) {
      const bilan = refaireSortie(racine);

      noter(
        `${racine.slice(RACINE.length + 1)} refait : ${String(bilan.supprimes.length)} dérivé(s) ` +
          `d’images retiré(s), ${String(bilan.preserves.length)} fichier(s) d’un autre pipeline ` +
          'préservé(s)',
      );

      /* Une préservation qui ne se voit pas est une préservation qu'on croit
         sur parole. Les fichiers d'un autre auteur sont NOMMÉS. */
      for (const preserve of bilan.preserves) {
        noter(`   préservé (autre pipeline) : ${preserve}`);
      }
    }

    for (const entree of entrees) {
      derives = derives.concat(await produire(sharp, entree));
    }
  }

  /* En mode `--verifier`, le verdict est rejoué depuis les positions consignées. */
  if (verifierSeulement) {
    verdictDeSignature(masters);
  }

  /* Étape 5 — le relevé. `fichiers` est la liste plate que la garde confronte
     au disque ; `derives` porte le détail, dont le hachage du master ; `masters`
     porte la POSITION MESURÉE de la signature du moteur, master par master. */
  for (const [espace, racine] of [
    ['produits', SORTIE_PRODUITS],
    ['editorial', SORTIE_EDITORIAL],
  ]) {
    const siens = derives.filter((derive) => derive.espace === espace);

    const releve = {
      $commentaire:
        'Relevé de livraison — écrit par scripts/preparer-images.mjs, jamais à la main. ' +
        'La liste « fichiers » est celle que verifier-images.mjs confronte au disque dans ' +
        'les deux sens ; « derives » porte le détail et rattache chaque fichier au hachage ' +
        'du master relu dont il descend ; « masters » porte la position MESURÉE de la ' +
        'signature du moteur d’images (l’étincelle) et la marge qui la sépare de la boîte ' +
        'de recadrage — une signature qui entre dans la boîte arrête la livraison. Les ' +
        'masters sont listés dans les DEUX relevés : ils sont examinés en une seule passe.',
      genere: 'npm run preparer-images',
      espace,
      qualites: QUALITES,
      fichiers: siens.map((derive) => derive.fichier).sort(),
      derives: [...siens].sort((a, b) => a.fichier.localeCompare(b.fichier)),
      masters: [...masters].sort((a, b) => a.master.localeCompare(b.master)),
    };

    if (!verifierSeulement) {
      writeFileSync(join(racine, NOM_RELEVE), `${JSON.stringify(releve, null, 2)}\n`, 'utf8');
    }
  }

  /* Rapport de poids, par dossier. */
  const parDossier = new Map();

  for (const derive of derives) {
    const clef = `${derive.espace}/${derive.fichier.split('/')[0]}`;
    parDossier.set(clef, (parDossier.get(clef) ?? 0) + derive.octets);
  }

  for (const derive of derives) {
    console.log(
      `          ${`${derive.espace}/${derive.fichier}`.padEnd(58)} ${String(derive.largeur).padStart(4)}×${String(derive.hauteur).padEnd(4)} ${ko(derive.octets).padStart(9)}`,
    );
  }

  console.log('-'.repeat(76));

  for (const [clef, octets] of parDossier) {
    console.log(`          ${clef.padEnd(46)} ${ko(octets).padStart(9)} tous formats et largeurs`);
  }

  /* CE QU'UNE PAGE CHARGE RÉELLEMENT : un seul format (AVIF) et une seule
     largeur par balise. Les totaux ci-dessus additionnent des variantes qui ne
     se téléchargent jamais ensemble ; ceux-ci sont ceux que D36 plafonne.
     Le rayon ne charge QUE la vue principale : la vue d'ambiance du survol est
     posée en fond CSS et n'est demandée qu'au survol (voir CarteProduit). */
  const somme = (predicat) =>
    derives.filter(predicat).reduce((total, derive) => total + derive.octets, 0);

  const fiche = (largeur) =>
    somme(
      (d) =>
        d.espace === 'produits' &&
        d.format === 'avif' &&
        d.largeur === largeur &&
        d.fichier.startsWith('huile-olive'),
    );

  const rayon = (largeur) =>
    somme(
      (d) =>
        d.espace === 'produits' && d.format === 'avif' && d.largeur === largeur && d.vue === 'principal',
    );

  console.log('-'.repeat(76));
  console.log(
    `          fiche pilote, deux vues AVIF 640 (pire cas) : ${ko(fiche(640))} sur 120 Ko`,
  );
  console.log(`          fiche pilote, deux vues AVIF 480 (profil mesuré) : ${ko(fiche(480))}`);
  console.log(
    `          rayon entier, quinze principales AVIF 320 : ${ko(rayon(320))} sur 180 Ko`,
  );
  console.log(`          rayon entier, quinze principales AVIF 480 : ${ko(rayon(480))}`);

  for (const observation of observations) {
    console.log(`          ${observation}`);
  }

  if (anomalies.length > 0) {
    for (const message of anomalies) {
      console.log(`   -> ${message}`);
    }

    console.log(`${String(anomalies.length)} anomalie(s).`);
    console.log('');
    process.exit(1);
  }

  console.log(
    `${String(derives.length)} dérivé(s) ${verifierSeulement ? 'relus' : 'produits'}, aucune anomalie.`,
  );
  console.log('');
} catch (erreur) {
  for (const message of anomalies) {
    console.log(`   -> ${message}`);
  }

  console.log(`[ ÉCHEC] ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  console.log('-'.repeat(76));
  console.log('');
  process.exit(1);
}

export {};
