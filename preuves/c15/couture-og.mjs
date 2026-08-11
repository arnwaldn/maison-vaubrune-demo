/**
 * LA COUTURE DES IMAGES DE PARTAGE, MESURÉE SUR LES OCTETS LIVRÉS.
 *
 * ---------------------------------------------------------------------------
 * Ce que ce script mesure, et pourquoi il ne mesure pas le master
 * ---------------------------------------------------------------------------
 *
 * Une image de partage est un panneau photographique POSÉ sur un fond uni. Il y
 * a donc une couture, et une seule question : se voit-elle ? La réponse ne se
 * lit ni dans le master ni dans le code du pipeline — elle se lit dans le
 * fichier livré, de part et d'autre de la ligne de jonction.
 *
 * Le relevé prend deux échantillons par image, à MI-HAUTEUR, là où la couture
 * est la plus longue et la plus exposée :
 *
 *   - DEHORS : une bande collée au bord gauche de l'image, dans la marge ;
 *   - DEDANS : une bande collée au bord gauche du PANNEAU, à deux points de la
 *     jonction.
 *
 * L'écart entre les deux est donné canal par canal, et c'est le maximum des
 * trois qui compte : c'est lui que l'œil voit comme une arête. La géométrie du
 * panneau est CALCULÉE depuis le recadrage du manifeste et le format de sortie,
 * jamais devinée.
 *
 * Ordre de grandeur utile : sous 5 points sur 255, la jonction ne se distingue
 * pas du grain de la photographie ; au-delà de 15, c'est une arête franche.
 *
 * Le round 1 de C15 a servi de cas d'école : le pipeline prélevait son fond
 * avec `sharp(chemin).extract(coin).stats()`, et `stats()` ignore le pipeline —
 * il mesurait donc la moyenne du master ENTIER, sujet compris. Écarts relevés
 * avant correction : 12 à 39 points. Après : voir la colonne de droite.
 *
 * Usage : node preuves/c15/couture-og.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const RACINE = process.cwd();
const FORMAT = { largeur: 1200, hauteur: 630, marge: 40 };

const manifeste = JSON.parse(readFileSync(join(RACINE, 'travaux-images/manifeste.json'), 'utf8'));

/** La moyenne d'une zone, calculée sur les octets bruts — jamais par `stats()`. */
async function moyenne(chemin, zone) {
  const { data, info } = await sharp(chemin)
    .extract(zone)
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0;
  let v = 0;
  let b = 0;
  let points = 0;

  for (let position = 0; position + 2 < data.length; position += info.channels) {
    r += data[position];
    v += data[position + 1];
    b += data[position + 2];
    points += 1;
  }

  return [r / points, v / points, b / points];
}

const ecart = (a, b) => Math.max(...a.map((valeur, rang) => Math.abs(valeur - b[rang])));

console.log('');
console.log('Couture des images de partage — écart maximal de part et d’autre de la jonction');
console.log('-'.repeat(80));

let pire = 0;
const lignes = [];

for (const entree of manifeste.entrees.filter((candidate) => candidate.partage === true)) {
  const boite =
    typeof entree.boite === 'string' ? manifeste.boites[entree.boite] : entree.boite;
  const dossier = entree.produit ?? entree.editorial;
  const espace = entree.produit === undefined ? 'editorial' : 'produits';
  const chemin = join(RACINE, 'public', espace, dossier, 'partage-1200x630.jpg');

  /* La géométrie du panneau : le recadrage entre en `contain` dans la boîte
     intérieure (le format moins deux marges), puis on étend de la marge. */
  const interieure = {
    largeur: FORMAT.largeur - 2 * FORMAT.marge,
    hauteur: FORMAT.hauteur - 2 * FORMAT.marge,
  };
  const echelle = Math.min(interieure.largeur / boite.largeur, interieure.hauteur / boite.hauteur);
  const panneau = {
    largeur: Math.round(boite.largeur * echelle),
    hauteur: Math.round(boite.hauteur * echelle),
  };
  const gauche = FORMAT.marge + Math.round((interieure.largeur - panneau.largeur) / 2);
  const haut = FORMAT.marge + Math.round((interieure.hauteur - panneau.hauteur) / 2);
  const milieu = haut + Math.round(panneau.hauteur / 2) - 60;

  const dehors = await moyenne(chemin, { left: 4, top: milieu, width: 8, height: 120 });
  const dedans = await moyenne(chemin, {
    left: gauche + 2,
    top: milieu,
    width: 8,
    height: 120,
  });

  const delta = ecart(dehors, dedans);
  pire = Math.max(pire, delta);

  lignes.push({ dossier, gauche, delta, dehors, dedans });
}

const rond = (couleur) => couleur.map((valeur) => String(Math.round(valeur)).padStart(3)).join(',');

for (const ligne of lignes.sort((a, b) => b.delta - a.delta)) {
  console.log(
    `${ligne.dossier.padEnd(32)} panneau à x=${String(ligne.gauche).padStart(3)}  ` +
      `dehors ${rond(ligne.dehors)}  dedans ${rond(ligne.dedans)}  ` +
      `écart ${ligne.delta.toFixed(1).padStart(5)}`,
  );
}

/* LES IMAGES SANS JONCTION SE DISENT, ELLES NE SE TAISENT PAS (C16).
 *
 * La boucle ci-dessus ne retient que les entrées `partage === true`, c'est-à-dire
 * les images COMPOSÉES — un panneau posé sur un fond uni, donc une jonction à
 * mesurer. Depuis C16, le héros est recadré en plein cadre (`partage:
 * 'plein-cadre'`) : aucun fond n'est posé, il n'y a rien à mesurer, et l'outil
 * l'écarterait EN SILENCE.
 *
 * Or c'est précisément cette image que le compte rendu de C15 donnait à 37
 * points de jonction, la pire des seize. Une disparition muette du relevé se
 * lirait comme une amélioration mesurée alors que c'est un changement de
 * régime. Elle est donc nommée, avec son motif. */
const pleinCadre = manifeste.entrees.filter(
  (candidate) => candidate.partage === 'plein-cadre',
);

for (const entree of pleinCadre) {
  console.log(
    `${(entree.produit ?? entree.editorial).padEnd(32)} AUCUNE JONCTION — recadrée en ` +
      `plein cadre (C16), aucun fond n’est posé`,
  );
}

console.log('-'.repeat(80));
console.log(
  `${String(lignes.length)} image(s) composée(s), écart maximal ${pire.toFixed(1)} point(s) ` +
    `sur 255 ; ${String(pleinCadre.length)} recadrée(s) en plein cadre, sans jonction.`,
);
console.log('');
