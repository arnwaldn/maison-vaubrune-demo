import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  estProduitParLePipelineDImages,
  refaireSortie,
} from '../../scripts/sortie-images.mjs';

/**
 * LA GARDE D'ORDRE ENTRE LES DEUX PIPELINES (constat de la revue de clôture C20).
 *
 * ---------------------------------------------------------------------------
 * Ce que ces cas défendent, et contre quelle faute
 * ---------------------------------------------------------------------------
 *
 * `public/editorial/` a DEUX auteurs depuis C19 : `preparer-images.mjs` y pose
 * les dérivés d'images, `preparer-video.mjs` y pose les rendus vidéo et leur
 * relevé. Le premier refaisait sa racine d'un `rmSync` récursif et emportait les
 * seconds — silencieusement. Seule la construction rattrapait, parce que
 * `VideoHeros` lit `videos-livrees.json` au build : un filet qui arrive tard, ne
 * nomme pas la cause, et suppose qu'on construise avant de committer.
 *
 * L'INVARIANT ÉPROUVÉ ICI : le pipeline d'images ne supprime que les fichiers
 * qu'il sait produire. Tout autre fichier déjà livré sous ses racines de sortie
 * survit à un rejeu.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi des dossiers temporaires et non des fixtures versionnées
 * ---------------------------------------------------------------------------
 *
 * Même raison qu'en C11 pour les gardes : ces cas éprouvent une SUPPRESSION.
 * Le seul moyen honnête de prouver qu'un fichier survit est de le poser, de
 * lancer le geste pour de vrai, et de relire le disque — jamais de relire une
 * intention. Un dépôt miniature construit par le test se lit dans le test ; une
 * fixture versionnée demanderait un LISEZ-MOI de plus, c'est-à-dire un document
 * qui se désynchronise.
 */

const dossiers: string[] = [];

function sortieMiniature(): string {
  const base = mkdtempSync(join(tmpdir(), 'mv-sortie-'));
  dossiers.push(base);
  return base;
}

function poser(base: string, relatif: string, contenu = 'x'): void {
  const chemin = join(base, ...relatif.split('/'));
  mkdirSync(join(chemin, '..'), { recursive: true });
  writeFileSync(chemin, contenu, 'utf8');
}

function existe(base: string, relatif: string): boolean {
  return existsSync(join(base, ...relatif.split('/')));
}

afterEach(() => {
  for (const dossier of dossiers.splice(0)) {
    rmSync(dossier, { recursive: true, force: true });
  }
});

describe('le vocabulaire de sortie du pipeline d’images', () => {
  it('reconnaît ce qu’il produit — les deux formats et son relevé', () => {
    expect(estProduitParLePipelineDImages('principal-640.avif')).toBe(true);
    expect(estProduitParLePipelineDImages('principal-640.jpg')).toBe(true);
    expect(estProduitParLePipelineDImages('partage-1200x630.jpg')).toBe(true);
    expect(estProduitParLePipelineDImages('manifeste-livre.json')).toBe(true);
    /* Une casse différente désigne le MÊME fichier sur un système insensible :
       la laisser passer livrerait un orphelin que la garde signalerait. */
    expect(estProduitParLePipelineDImages('principal-640.AVIF')).toBe(true);
  });

  it('ne reconnaît RIEN d’autre — le défaut par défaut est la préservation', () => {
    expect(estProduitParLePipelineDImages('boucle-1280.av1.mp4')).toBe(false);
    expect(estProduitParLePipelineDImages('boucle-1280.h264.mp4')).toBe(false);
    expect(estProduitParLePipelineDImages('videos-livrees.json')).toBe(false);
    /* Le jour où un troisième pipeline écrira l’un de ceux-ci, il survivra sans
       que personne ait eu à ajouter une exception. */
    expect(estProduitParLePipelineDImages('boucle-1280.webm')).toBe(false);
    expect(estProduitParLePipelineDImages('sous-titres.vtt')).toBe(false);
  });
});

describe('refaire la sortie du pipeline d’images', () => {
  it('LES RENDUS VIDÉO ET LEUR RELEVÉ SURVIVENT — le défaut de la revue C20', () => {
    const base = sortieMiniature();
    poser(base, 'videos-livrees.json', '{"videos":{}}');
    poser(base, 'accueil/boucle-1280.av1.mp4', 'av1');
    poser(base, 'accueil/boucle-1280.h264.mp4', 'h264');
    poser(base, 'accueil/hero-640.avif');

    const bilan = refaireSortie(base);

    expect(existe(base, 'videos-livrees.json')).toBe(true);
    expect(existe(base, 'accueil/boucle-1280.av1.mp4')).toBe(true);
    expect(existe(base, 'accueil/boucle-1280.h264.mp4')).toBe(true);
    /* Les octets aussi, pas seulement l’entrée de dossier. */
    expect(readFileSync(join(base, 'accueil', 'boucle-1280.av1.mp4'), 'utf8')).toBe('av1');
    expect(bilan.preserves).toEqual([
      'accueil/boucle-1280.av1.mp4',
      'accueil/boucle-1280.h264.mp4',
      'videos-livrees.json',
    ]);
  });

  it('retire les dérivés d’images de la livraison précédente, et son relevé', () => {
    const base = sortieMiniature();
    poser(base, 'manifeste-livre.json', '{"fichiers":[]}');
    poser(base, 'huile-olive/principal-320.avif');
    poser(base, 'huile-olive/principal-320.jpg');
    poser(base, 'huile-olive/partage-1200x630.jpg');

    const bilan = refaireSortie(base);

    expect(existe(base, 'manifeste-livre.json')).toBe(false);
    expect(existe(base, 'huile-olive/principal-320.avif')).toBe(false);
    expect(existe(base, 'huile-olive/principal-320.jpg')).toBe(false);
    expect(bilan.supprimes).toHaveLength(4);
    expect(bilan.preserves).toHaveLength(0);
  });

  it('fait disparaître un dossier vidé, et garde celui qui abrite une vidéo', () => {
    const base = sortieMiniature();
    poser(base, 'produit-retire/principal-320.avif');
    poser(base, 'boutique/affiche-640.avif');
    poser(base, 'boutique/boucle-1280.av1.mp4');

    refaireSortie(base);

    /* L’intention d’origine est tenue : un dossier qui quitte le manifeste ne
       laisse pas d’orphelin derrière lui. */
    expect(existe(base, 'produit-retire')).toBe(false);
    /* Et celui qui porte une vidéo reste, vidé de ses seules images. */
    expect(existe(base, 'boutique')).toBe(true);
    expect(existe(base, 'boutique/affiche-640.avif')).toBe(false);
    expect(existe(base, 'boutique/boucle-1280.av1.mp4')).toBe(true);
  });

  it('crée la racine absente — le pipeline peut écrire tout de suite après', () => {
    const base = sortieMiniature();
    const racine = join(base, 'jamais-livre');

    const bilan = refaireSortie(racine);

    expect(existsSync(racine)).toBe(true);
    expect(bilan.supprimes).toHaveLength(0);
    expect(bilan.preserves).toHaveLength(0);
  });
});
