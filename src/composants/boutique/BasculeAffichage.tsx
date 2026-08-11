'use client';

import { useEffect, useState } from 'react';

/**
 * LA BASCULE GRILLE / LISTE DU RAYON.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UNE VIEW TRANSITION SAME-DOCUMENT, ET RIEN D'AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `document.startViewTransition` est l'API du navigateur, sans drapeau ni
 * polyfill : on lui donne la fonction qui change le DOM, elle photographie
 * l'avant, applique le changement, photographie l'après et anime entre les
 * deux. La décision D37 l'autorise dans ce régime-là — c'est le CROSS-PAGE,
 * expérimental, qui reste réservé à C18.
 *
 * Amélioration progressive au sens strict : quand l'API n'existe pas (Firefox
 * jusqu'à peu, Safari ancien), on appelle la même fonction directement. Le rayon
 * change de forme, sans transition. Rien n'est conditionné à la présence de
 * l'API, et rien ne se casse en son absence.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'ÉTAT VIT SUR `<html>`, PAS DANS REACT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La forme du rayon est décrite par un attribut posé sur l'élément racine, que
 * la feuille de style lit. React n'en garde une copie que pour `aria-pressed` —
 * il ne rend AUCUNE carte, et les quinze vignettes restent du HTML de serveur.
 * C'est ce qui permet à cette bascule de peser quelques centaines d'octets au
 * lieu de rendre `/boutique` cliente (décision D17 : le catalogue ne traverse
 * pas la frontière).
 *
 * Le premier rendu client vaut `grille`, exactement comme le HTML servi : aucun
 * désaccord d'hydratation, patron des feuilles de vitrine (C6).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  … ET IL FAUT DONC LE RELIRE AU MONTAGE (correctif du round 1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'attribut vit sur `<html>`, qui SURVIT à une navigation cliente : la mise en
 * page racine ne se démonte pas. Ce composant, lui, se démonte en quittant
 * `/boutique` et se remonte en y revenant — avec son état initial `grille`.
 *
 * Écrire sans jamais relire donnait donc, au retour de navigation, un rayon
 * affiché EN LISTE sous un bouton « Grille » annoncé `aria-pressed="true"`. Le
 * défaut est plus grave que son apparence : `aria-pressed` est ce qu'un lecteur
 * d'écran ANNONCE, et il annonçait le contraire de ce qui était à l'écran.
 *
 * Deux réparations possibles — nettoyer l'attribut au démontage, ou le relire au
 * montage. La seconde est retenue : elle CONSERVE le choix du visiteur d'une
 * page à l'autre, ce qui est le comportement qu'on attend d'une préférence
 * d'affichage, là où la première l'aurait effacé à chaque aller-retour vers une
 * fiche. La lecture se fait dans un effet, donc après hydratation : le premier
 * rendu client reste identique au HTML servi, et l'accord se rétablit à l'image
 * suivante — exactement le patron des feuilles de vitrine.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE MOUVEMENT RÉDUIT EST RESPECTÉ PAR LA FEUILLE, PAS PAR CE FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `globals.css` neutralise l'animation des pseudo-éléments de transition sous
 * `prefers-reduced-motion: reduce`. Interroger la préférence ici en JavaScript
 * aurait fabriqué une seconde source de vérité, et c'est la feuille qui a
 * raison : elle suit un changement de réglage sans qu'on rejoue quoi que ce
 * soit.
 */

type Affichage = 'grille' | 'liste';

const FORMES: readonly { readonly valeur: Affichage; readonly libelle: string }[] = [
  { valeur: 'grille', libelle: 'Grille' },
  { valeur: 'liste', libelle: 'Liste' },
];

/**
 * La forme décrite par `<html>`, ou `grille` s'il n'en décrit aucune.
 *
 * La valeur inconnue retombe sur `grille` PAR LA LISTE des formes et non par un
 * `=== 'liste'` : le jour où une troisième forme existera, elle sera reconnue
 * ici sans qu'on y touche, et une valeur inventée par une extension ou un
 * historique de navigation restera sans effet.
 */
function formeAffichee(): Affichage {
  const pose = document.documentElement.dataset['affichageRayon'];

  return FORMES.some((forme) => forme.valeur === pose) ? (pose as Affichage) : 'grille';
}

export function BasculeAffichage() {
  const [affichage, setAffichage] = useState<Affichage>('grille');

  /* Le rattrapage d'après hydratation : l'attribut a pu survivre à un
     aller-retour vers une fiche, et c'est LUI qui décrit ce qui est à l'écran. */
  useEffect(() => {
    setAffichage(formeAffichee());
  }, []);

  const basculer = (valeur: Affichage) => {
    const appliquer = () => {
      document.documentElement.dataset['affichageRayon'] = valeur;
      setAffichage(valeur);
    };

    const document_ = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (typeof document_.startViewTransition === 'function') {
      document_.startViewTransition(appliquer);
      return;
    }

    appliquer();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="etiquette text-encre-douce">Affichage</span>
      <div className="flex rounded-sm border border-filet-fort">
        {FORMES.map((forme) => (
          <button
            key={forme.valeur}
            type="button"
            aria-pressed={affichage === forme.valeur}
            onClick={() => {
              basculer(forme.valeur);
            }}
            className={`etiquette px-3 py-1.5 ${
              affichage === forme.valeur
                ? 'bg-encre text-coquille'
                : 'text-encre-douce hover:text-encre'
            }`}
          >
            {forme.libelle}
          </button>
        ))}
      </div>
    </div>
  );
}
