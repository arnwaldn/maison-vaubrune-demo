/**
 * Lien d'évitement : premier élément focalisable de la page, invisible tant
 * qu'il n'a pas le focus. Il permet à quelqu'un qui navigue au clavier ou au
 * lecteur d'écran de sauter l'en-tête et d'atterrir directement sur le
 * contenu. C'est une ancre HTML pure : aucune ligne de JavaScript.
 */
export function LienSaut() {
  return (
    <a
      href="#contenu"
      className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-sm focus-visible:bg-encre focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-creme"
    >
      Aller au contenu principal
    </a>
  );
}
