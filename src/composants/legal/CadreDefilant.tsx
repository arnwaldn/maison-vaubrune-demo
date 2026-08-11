import type { ReactNode } from 'react';

/**
 * UN TABLEAU QUI DÉFILE, ATTEIGNABLE AU CLAVIER.
 *
 * ---------------------------------------------------------------------------
 * Le défaut que ce composant corrige, et comment il a été trouvé
 * ---------------------------------------------------------------------------
 *
 * Trouvé par la campagne axe-core de la tranche C8, sur le PROFIL MOBILE
 * uniquement (390 px) : `scrollable-region-focusable`, gravité « serious ».
 * Le mécanisme est simple et se serait vu à l'œil si on avait pensé à
 * regarder. Un conteneur en `overflow-x-auto` qui déborde se fait défiler à
 * la souris ou au doigt — mais au CLAVIER, il faut d'abord pouvoir y poser le
 * focus, et un `<div>` n'est pas focalisable. Quelqu'un qui navigue au clavier
 * ne peut donc atteindre ni les colonnes de droite du tableau des quinze
 * régimes de rétractation, ni celles du tableau des finalités de traitement.
 *
 * La règle ne se déclenche que si le conteneur ne contient AUCUN élément
 * focalisable : un tableau de commandes rempli de liens se parcourt à la
 * tabulation, il défile tout seul en suivant le focus. C'est pour cela que les
 * tableaux de l'espace marchand, eux, n'ont pas besoin de ce cadre.
 *
 * ---------------------------------------------------------------------------
 * POURQUOI IL N'EST PAS APPLIQUÉ À TOUS LES TABLEAUX DU SITE
 * ---------------------------------------------------------------------------
 *
 * Onze conteneurs de ce genre existent dans le projet. Trois seulement
 * débordent à 390 px sans porter d'élément focalisable — mesuré, pas supposé :
 * le tableau des régimes de rétractation, celui des finalités de traitement et
 * celui des destinataires. Les autres tiennent dans l'écran (les tableaux
 * « Information / Valeur » des documents légaux, les barèmes de livraison, les
 * formats d'une fiche) ou contiennent des liens et des champs (l'espace
 * marchand).
 *
 * Poser ce cadre partout aurait donc ajouté huit arrêts de tabulation sur des
 * blocs que personne n'a besoin de faire défiler — un coût réel pour un
 * utilisateur de clavier, payé pour une uniformité de code. Le composant est
 * appliqué là où la mesure le réclame, et cette phrase existe pour qu'on
 * refasse la mesure plutôt que de le généraliser par réflexe.
 *
 * ---------------------------------------------------------------------------
 * Ce que le cadre porte
 * ---------------------------------------------------------------------------
 *
 * `tabIndex={0}` le rend atteignable ; `role="region"` en fait un repère
 * annoncé plutôt qu'un `<div>` focalisable sans raison apparente ; et le nom
 * de ce repère est celui de la LÉGENDE DU TABLEAU (`aria-labelledby`), reprise
 * telle quelle plutôt que recopiée — deux textes pour une même chose finissent
 * toujours par diverger.
 */
export function CadreDefilant({
  idLegende,
  className,
  children,
}: {
  /** L'`id` du `<caption>` du tableau : c'est lui qui nomme le repère. */
  readonly idLegende: string;
  readonly className: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      /* `data-cadre-defilant` : l'organe se DÉCLARE, comme l'en-tête et le pied
         depuis C14. La feuille d'impression a besoin de le désigner — un cadre
         qui défile n'a aucun sens sur du papier, où il ne fait que COUPER ce
         qu'il ne peut pas montrer. Un sélecteur de position ou de classe
         utilitaire aurait cessé de correspondre à la première refonte. */
      data-cadre-defilant=""
      className={`${className} overflow-x-auto`}
      tabIndex={0}
      role="region"
      aria-labelledby={idLegende}
    >
      {children}
    </div>
  );
}
