/**
 * LA COUTURE ET LA PART DU PRODUIT, RE-MESURÉES SUR LES OCTETS LIVRÉS (C27).
 *
 * `npm run preparer-images` mesure déjà la couture en sortie d'encodeur et fait
 * échouer la livraison au-delà de 8 niveaux sur 255. Ce script-ci est le second
 * regard, et il ne croit pas le premier : il rouvre CHAQUE fichier miniature du
 * disque, le décode, et refait les mesures sans rien reprendre du relevé que le
 * PLACEMENT (où la photographie est posée) — qu'il recalcule d'ailleurs depuis
 * le cadre consigné et compare à celui du relevé.
 *
 * Deux relevés, sur les 60 fichiers (15 produits × deux côtés × deux formats) :
 *
 *   - la COUTURE de chaque côté étendu (`coutures` de `scripts/miniature.mjs`),
 *     par fenêtres de 16 points ;
 *   - la PART du produit dans le carré, mesurée une seconde fois dans le fichier
 *     de 320 points par la même détection d'arêtes que le pipeline (le papier
 *     étendu est lisse : il n'ajoute aucune arête), puis comparée à la part
 *     calculée par le pipeline.
 *
 * Usage : `node preuves/c27/coutures-miniatures.mjs > preuves/c27/coutures-miniatures.txt`
 * Sortie : 0 si tout tient, 1 sinon. Outil de poste (sharp), jamais en CI.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { REGLAGES, boiteDuProduit, coutures, placerPhoto } from '../../scripts/miniature.mjs';

const RACINE = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const releve = JSON.parse(readFileSync(join(RACINE, 'public/produits/manifeste-livre.json'), 'utf8'));
const miniatures = releve.derives.filter((derive) => derive.vue === 'miniature');

const lignes = [];
const ecrire = (texte = '') => lignes.push(texte);
const fmt = (valeur) => (valeur === null ? '   —' : valeur.toFixed(1).padStart(4));
let echecs = 0;
let pireCouture = 0;
const parts = [];

ecrire('COUTURES DES MINIATURES — mesurées sur les octets livrés (C27)');
ecrire('-'.repeat(100));
ecrire(`Maximum toléré : ${String(REGLAGES.coutureMax)} niveaux sur 255, fenêtres de ${String(REGLAGES.fenetreCouture)} points.`);
ecrire('Chaque valeur est le plus grand écart de fenêtre, sur le plus grand des trois canaux, entre la');
ecrire('rangée de photographie qui touche le côté et la rangée étendue voisine. « — » : la photographie');
ecrire('touche ce côté, il n’y a rien à coudre.');
ecrire('');
ecrire('produit'.padEnd(32) + 'fichier'.padEnd(20) + '  haut   bas  gauche droite   (niveaux sur 255)');
ecrire('-'.repeat(100));

for (const derive of miniatures) {
  const [dossier, nom] = derive.fichier.split('/');
  const chemin = join(RACINE, 'public/produits', derive.fichier);
  const cote = derive.largeur;

  const { data, info } = await sharp(chemin)
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== cote || info.height !== cote) {
    ecrire(`ÉCHEC ${derive.fichier} : ${String(info.width)}×${String(info.height)} décodés, carré de ${String(cote)} attendu`);
    echecs += 1;
    continue;
  }

  const placement = placerPhoto(derive.cadre, cote);
  const memePlacement = ['largeur', 'hauteur', 'gauche', 'haut'].every(
    (clef) => placement[clef] === derive.placement[clef],
  );

  if (!memePlacement) {
    ecrire(`ÉCHEC ${derive.fichier} : placement recalculé ${JSON.stringify(placement)} ≠ relevé ${JSON.stringify(derive.placement)}`);
    echecs += 1;
  }

  const mesure = coutures(data, cote, placement);
  const valeurs = Object.values(mesure).filter((valeur) => valeur !== null);
  const pire = Math.max(0, ...valeurs);
  pireCouture = Math.max(pireCouture, pire);

  if (pire > REGLAGES.coutureMax) {
    echecs += 1;
  }

  ecrire(
    `${dossier}`.padEnd(32) +
      `${nom}`.padEnd(20) +
      `  ${fmt(mesure.haut)}  ${fmt(mesure.bas)}   ${fmt(mesure.gauche)}   ${fmt(mesure.droite)}` +
      (pire > REGLAGES.coutureMax ? '   ÉCHEC' : ''),
  );

  /* La part du produit, une fois par produit, dans le plus grand fichier JPEG. */
  if (nom === 'miniature-320.jpg') {
    const detecte = boiteDuProduit({ pixels: data, largeur: cote, hauteur: cote, canaux: info.channels });
    const mesuree = detecte === null ? null : Math.max(detecte.largeur, detecte.hauteur) / cote;

    parts.push({ dossier, annoncee: derive.part, mesuree, entier: derive.cadre.entier });
  }
}

ecrire('-'.repeat(100));
ecrire(`${String(miniatures.length)} fichier(s) mesuré(s) ; plus forte couture : ${pireCouture.toFixed(1)} sur ${String(REGLAGES.coutureMax)} tolérés.`);
ecrire('');
ecrire('PART DU PRODUIT DANS LE CARRÉ — sa plus grande dimension rapportée au côté (cible du directeur artistique : ≥ ~85 %)');
ecrire('-'.repeat(100));
ecrire('produit'.padEnd(32) + 'calculée'.padEnd(12) + 'mesurée sur miniature-320.jpg'.padEnd(34) + 'recadrage entier');

for (const { dossier, annoncee, mesuree, entier } of parts) {
  ecrire(
    dossier.padEnd(32) +
      `${(annoncee * 100).toFixed(1)} %`.padEnd(12) +
      (mesuree === null ? 'illisible' : `${(mesuree * 100).toFixed(1)} %`).padEnd(34) +
      (entier ? 'oui' : 'non'),
  );
}

const calculees = parts.map((p) => p.annoncee);
const mesurees = parts.map((p) => p.mesuree).filter((v) => v !== null);
ecrire('-'.repeat(100));
ecrire(
  `calculée : min ${(Math.min(...calculees) * 100).toFixed(1)} %, max ${(Math.max(...calculees) * 100).toFixed(1)} % — ` +
    `mesurée : min ${(Math.min(...mesurees) * 100).toFixed(1)} %, max ${(Math.max(...mesurees) * 100).toFixed(1)} %`,
);

const sousLaCible = parts.filter((p) => p.annoncee < 0.85);

if (sousLaCible.length > 0) {
  ecrire(`SOUS LA CIBLE : ${sousLaCible.map((p) => p.dossier).join(', ')}`);
  echecs += sousLaCible.length;
}

ecrire(echecs === 0 ? 'AUCUN ÉCHEC.' : `${String(echecs)} ÉCHEC(S).`);
console.log(lignes.join('\n'));
process.exit(echecs === 0 ? 0 : 1);
