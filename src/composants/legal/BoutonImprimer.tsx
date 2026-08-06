'use client';

/**
 * Le SEUL îlot client des cinq documents légaux de la tranche C7.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi il existe, et pourquoi il n'y en a pas d'autre
 * ---------------------------------------------------------------------------
 *
 * Le budget de la tranche interdit les îlots clients sur les pages légales :
 * ce sont des documents, ils se lisent, ils n'ont rien d'interactif. Une seule
 * exception a été retenue, et c'est celle-ci — la page de rétractation porte le
 * formulaire type de l'annexe R. 221-1, que le client remplit À LA MAIN et
 * renvoie par courrier. Un document fait pour être imprimé mérite son bouton
 * d'impression : renvoyer le lecteur au menu de son navigateur pour la seule
 * page du site qui s'imprime vraiment serait une économie mal placée.
 *
 * ---------------------------------------------------------------------------
 * Ce qu'il coûte, et ce qu'il ne fait pas
 * ---------------------------------------------------------------------------
 *
 * Un bouton, un appel à `window.print()`, aucun état, aucun effet, aucune
 * dépendance. Le module client du projet est déjà chargé sur toutes les pages
 * (le fournisseur de panier et de surcouche, décision D26) : le coût marginal
 * est celui de ces quelques lignes, mesuré dans le compte rendu de la tranche.
 *
 * Il est MASQUÉ À L'IMPRESSION (`print:hidden`) : un bouton imprimé sur une
 * feuille de papier est un rectangle qui ne sert à rien et prend la place du
 * cadre de signature.
 *
 * Il n'y a pas de repli sans JavaScript, et c'est assumé : sans JavaScript le
 * bouton reste affiché mais inerte, exactement comme la commande d'impression
 * du navigateur reste, elle, disponible. La page entière est lisible et
 * imprimable sans lui — c'est la feuille de style d'impression qui fait le
 * travail, pas ce bouton.
 */
export function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => {
        window.print();
      }}
      className="inline-flex items-center rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme hover:bg-olive-clair print:hidden"
    >
      Imprimer cette page
    </button>
  );
}
