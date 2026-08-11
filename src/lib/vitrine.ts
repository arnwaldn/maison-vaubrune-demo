import type { CSSProperties } from 'react';

import type { Famille, Produit } from '@/lib/types';

/**
 * LA NOMENCLATURE SÉRIELLE DE LA VITRINE — et rien d'inventé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE MODULE N'INVENTE AUCUNE DONNÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le plan directeur demande que la vitrine affiche, en mono capitales, ce
 * qu'une conserverie inscrit sur son registre : un rang d'inventaire, une
 * référence, une ligne de garde. Le piège est évident et il a un nom dans ce
 * projet — la garde d'honnêteté (décision D30) : un millésime, un numéro de
 * lot, un « depuis 1897 » sont exactement ce qui rendrait le registre crédible
 * et faux.
 *
 * Tout ce que ce module rend est donc CALCULÉ à partir du catalogue versionné :
 * le rang est la position réelle dans `CATALOGUE`, la garde vient de
 * `conservation`, le poids d'une variante. Rien n'est saisi une seconde fois,
 * et rien ne pourrait diverger de la fiche puisque rien n'y est recopié.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI DES SEGMENTS ET NON UNE PHRASE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `ligneDeGarde` rend un TABLEAU de segments, pas la chaîne
 * « 780 G · GARDE 24 MOIS ». Deux raisons, et la seconde est une contrainte du
 * dépôt :
 *
 * 1. le séparateur est décoratif — il doit être `aria-hidden`, ce qu'une chaîne
 *    ne permet pas ;
 * 2. la convention D11 interdit tout caractère invisible dans `src/`, et
 *    l'espace fine insécable que la typographie française mettrait autour du
 *    point médian n'existe DANS AUCUN des quatre fichiers de Spline Sans Mono
 *    (constat de C14). Une espace insécable ordinaire aurait une chasse
 *    étrangère dans une ligne à chasse fixe. Les segments sont donc espacés par
 *    la mise en page, jamais par un caractère.
 */

/* -------------------------------------------------------------------------- */
/* Les schemes de famille                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Le nom COURT de scheme d'une famille, tel que `globals.css` l'écrit.
 *
 * Les deux vocabulaires ne coïncident pas — la famille s'appelle
 * `huiles-et-vinaigres` et son scheme `huiles` — et cette table est le seul
 * endroit où ils se rencontrent. Elle est exhaustive par construction :
 * `Record<Famille, …>` fait échouer la compilation le jour où une huitième
 * famille entre au catalogue sans sa couleur.
 */
const NOM_DE_SCHEME: Record<Famille, string> = {
  'huiles-et-vinaigres': 'huiles',
  'conserves-salees': 'conserves',
  'miels-et-confitures': 'miels',
  'epicerie-seche': 'epicerie',
  infusions: 'infusions',
  frais: 'frais',
  coffrets: 'coffrets',
};

/**
 * Les deux couleurs d'une famille, en style en ligne.
 *
 * Le composant ne connaît pas les sept familles : il reçoit `--scheme-fond` et
 * `--scheme-trait`, et la feuille de style s'en sert au survol. C'est ce qui
 * permet à `.carte-produit` d'être écrite une fois pour toutes.
 */
export function styleDeFamille(famille: Famille): CSSProperties {
  const nom = NOM_DE_SCHEME[famille];

  return {
    '--scheme-fond': `var(--scheme-${nom}-fond)`,
    '--scheme-trait': `var(--scheme-${nom}-trait)`,
  } as CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Le rang d'inventaire                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `N⁰ 07 / 15` — la position RÉELLE du produit dans le catalogue.
 *
 * Rend `null` pour un produit absent du catalogue passé : mieux vaut ne rien
 * afficher qu'un rang faux, et le composant sait ne rien rendre.
 *
 * Les deux nombres sont rendus séparément, sur deux chiffres, pour que la
 * colonne s'aligne en chiffres tabulaires d'une carte à l'autre.
 */
export function rangInventaire(
  catalogue: readonly Produit[],
  slug: string,
): { readonly rang: string; readonly total: string } | null {
  const position = catalogue.findIndex((produit) => produit.slug === slug);

  if (position === -1) {
    return null;
  }

  return {
    rang: String(position + 1).padStart(2, '0'),
    total: String(catalogue.length).padStart(2, '0'),
  };
}

/* -------------------------------------------------------------------------- */
/* La ligne de garde                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Les segments de la ligne de garde d'un produit : son poids et sa garde.
 *
 * Le poids est celui du PREMIER format — c'est celui que la fiche annonce en
 * premier et celui du « à partir de ». La garde vient de `conservation`, dont
 * l'union discriminée interdit de lire une DLC sur une conserve stérilisée :
 * chaque forme a sa phrase, et le compilateur refuse d'en oublier une.
 *
 * Le produit scellé sous atmosphère n'annonce PAS de durée : le catalogue n'en
 * porte aucune pour lui, et en fabriquer une ici serait exactement la donnée
 * inventée que la garde d'honnêteté cherche.
 */
export function ligneDeGarde(produit: Produit): readonly string[] {
  const poids = `${String(produit.variantes[0].poidsGrammes)} g`;

  switch (produit.conservation.type) {
    case 'stable':
      return [poids, `garde ${String(produit.conservation.ddmMois)} mois`];
    case 'perissable':
      return [poids, `dlc ${String(produit.conservation.dlcJours)} jours`, 'chaîne du froid'];
    case 'scelle-hygiene':
      return [poids, 'scellé'];
  }
}

/* -------------------------------------------------------------------------- */
/* Les fonds d'image payés à l'usage                                           */
/* -------------------------------------------------------------------------- */

/**
 * Un `image-set()` AVIF + repli JPEG, prêt à poser en variable de style.
 *
 * C'est la forme que prend une image qui ne doit être demandée QUE lorsqu'elle
 * sert (voir l'en-tête de la section « vitrine » de `globals.css`) : une
 * `background-image` déclarée dans une règle de survol n'est téléchargée qu'au
 * survol, là où une balise `<img>` l'est toujours. `image-set()` rend au fond
 * CSS ce que `<picture>` donne à la balise : le choix du format par le
 * navigateur, sans script et sans requête perdue.
 *
 * Les chemins se RECOMPOSENT ici comme dans `<Visuel>`, depuis le slug, la vue
 * et la largeur : le catalogue ne porte aucun chemin, et le vocabulaire fermé
 * de la garde des images existe précisément pour qu'on puisse les calculer.
 */
export function fondImage(
  racine: string,
  dossier: string,
  vue: string,
  largeur: number,
): string {
  const base = `/${racine}/${dossier}/${vue}-${String(largeur)}`;

  return `image-set(url("${base}.avif") type("image/avif"), url("${base}.jpg") type("image/jpeg"))`;
}
