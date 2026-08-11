/**
 * REFAIRE LA SORTIE DU PIPELINE D'IMAGES SANS EMPORTER CE QUI N'EST PAS À LUI.
 *
 * ===========================================================================
 * LE DÉFAUT QUE CE MODULE FERME (constat de la revue de clôture C20)
 * ===========================================================================
 *
 * `preparer-images.mjs` refaisait ses deux racines de sortie d'un
 * `rmSync(racine, { recursive: true })`. Le geste est juste pour `public/produits/`,
 * dont il est le seul auteur. Il est FAUX pour `public/editorial/`, que DEUX
 * pipelines alimentent depuis C19 : les dérivés d'images d'un côté, les rendus
 * vidéo de `preparer-video.mjs` et leur relevé `videos-livrees.json` de l'autre.
 * Un rejeu du pipeline d'images effaçait donc les rendus vidéo — sans un mot, et
 * sans que le pipeline vidéo, qui n'était pas lancé, puisse s'en apercevoir.
 *
 * Rien ne le rattrapait sauf la construction : `VideoHeros` lit le relevé au
 * build (`node:fs`), et un relevé absent fait échouer `next build`. C'est un
 * filet, pas une garde — il ne dit pas ce qui s'est passé, il arrive tard, et il
 * suppose qu'on construise avant de committer.
 *
 * ===========================================================================
 * PRÉSERVER PLUTÔT QUE REFUSER, ET POURQUOI
 * ===========================================================================
 *
 * L'autre issue serait de REFUSER de tourner tant que des rendus vidéo sont
 * présents, en imprimant l'ordre requis. Elle est écartée, et pas pour une
 * question de confort :
 *
 * 1. les rendus vidéo sont VERSIONNÉS et donc TOUJOURS présents. Un refus
 *    conditionné à leur présence est un refus permanent : le pipeline d'images
 *    ne tournerait plus jamais sans un geste manuel de destruction préalable,
 *    c'est-à-dire exactement le geste dangereux qu'on cherche à retirer ;
 * 2. l'ordre « vidéos après images » n'est pas tenable non plus, parce que la
 *    dépendance va DANS LES DEUX SENS : l'affiche de chaque boucle est l'image 0
 *    de cette boucle, livrée par le pipeline d'IMAGES depuis un master extrait
 *    de la vidéo. Imposer un ordre unique entre deux outils qui se nourrissent
 *    l'un l'autre déplacerait le piège au lieu de le fermer ;
 * 3. une garde qui se déclenche à chaque exécution normale n'est pas une garde,
 *    c'est un mur : elle finit contournée par une option, et l'option finit
 *    dans le script d'appel.
 *
 * ===========================================================================
 * LE CRITÈRE EST INVERSÉ, ET C'EST LÀ QUE TIENT LA ROBUSTESSE
 * ===========================================================================
 *
 * On n'énumère PAS ce qu'il faut épargner (`.mp4`, `videos-livrees.json`) — une
 * liste d'exceptions vieillit à la première extension nouvelle, et son défaut
 * par défaut est la DESTRUCTION. On énumère ce que le pipeline d'images PRODUIT,
 * c'est-à-dire ce dont il est le seul auteur légitime, et il n'efface rien
 * d'autre. Le défaut par défaut devient la PRÉSERVATION : le jour où un
 * troisième pipeline écrira un `.webm`, un `.vtt` ou une piste sonore sous
 * `public/editorial/`, il survivra sans que personne ait eu à y penser.
 *
 * L'intention d'origine est intégralement tenue : un dérivé d'image d'une
 * livraison précédente que le manifeste n'annonce plus est retiré, donc la garde
 * des images ne le signalera pas en orphelin.
 *
 * INVARIANT : `npm run preparer-images` ne supprime que les fichiers qu'il sait
 * produire. Tout autre fichier déjà livré sous ses racines de sortie survit à un
 * rejeu.
 */
import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LE VOCABULAIRE DE SORTIE DU PIPELINE D'IMAGES — fermé, et le seul.
 *
 * `produire()` n'écrit que deux formats (`avif` et son repli `jpg`) et
 * `produirePartage()` écrit un `jpg`. Toute extension qui ne figure pas ici est,
 * par construction, l'ouvrage de quelqu'un d'autre.
 */
const EXTENSIONS_PRODUITES = ['.avif', '.jpg'];

/** Le relevé de livraison, écrit par le pipeline d'images à chaque racine. */
const RELEVE_IMAGES = 'manifeste-livre.json';

/**
 * Le fichier porte-t-il la signature du pipeline d'images ?
 *
 * La comparaison est insensible à la casse : sur un système de fichiers qui l'est
 * lui-même, `vue-640.JPG` et `vue-640.jpg` désignent le même fichier, et le
 * laisser passer reviendrait à livrer un orphelin que la garde signalerait.
 */
export function estProduitParLePipelineDImages(nom) {
  const minuscule = nom.toLowerCase();

  if (minuscule === RELEVE_IMAGES) {
    return true;
  }

  return EXTENSIONS_PRODUITES.some((extension) => minuscule.endsWith(extension));
}

/**
 * Balaye un dossier et rend le nombre d'entrées qui y SURVIVENT.
 *
 * Le compte sert à retirer les dossiers devenus vides — un dossier de produit
 * qui quitte le catalogue disparaît donc du disque, comme avec l'ancien geste —
 * sans jamais toucher à celui qui garde une vidéo.
 */
function balayer(racine, relatif, bilan) {
  const chemin = relatif === '' ? racine : join(racine, relatif);
  let survivants = 0;

  for (const entree of readdirSync(chemin, { withFileTypes: true })) {
    const sous = relatif === '' ? entree.name : `${relatif}/${entree.name}`;

    if (entree.isDirectory()) {
      if (balayer(racine, sous, bilan) === 0) {
        rmdirSync(join(racine, sous));
      } else {
        survivants += 1;
      }

      continue;
    }

    if (estProduitParLePipelineDImages(entree.name)) {
      unlinkSync(join(racine, sous));
      bilan.supprimes.push(sous);
      continue;
    }

    bilan.preserves.push(sous);
    survivants += 1;
  }

  return survivants;
}

/**
 * Refait une racine de sortie : retire ce que le pipeline d'images a produit,
 * laisse tout le reste en place, et garantit que la racine existe.
 *
 * Rend le bilan des deux listes, en chemins relatifs à la racine — l'appelant
 * l'imprime, pour qu'une préservation soit VUE plutôt que supposée.
 */
export function refaireSortie(racine) {
  const bilan = { supprimes: [], preserves: [] };

  if (!existsSync(racine)) {
    mkdirSync(racine, { recursive: true });
    return bilan;
  }

  balayer(racine, '', bilan);

  bilan.supprimes.sort();
  bilan.preserves.sort();

  return bilan;
}
