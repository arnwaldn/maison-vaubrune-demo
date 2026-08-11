/**
 * Lien d'évitement : premier élément focalisable de la page, invisible tant
 * qu'il n'a pas le focus. Il permet à quelqu'un qui navigue au clavier ou au
 * lecteur d'écran de sauter l'en-tête et d'atterrir directement sur le
 * contenu. C'est une ancre HTML pure : aucune ligne de JavaScript.
 *
 * ---------------------------------------------------------------------------
 * C13 : le registre, et un rang au-dessus de l'en-tête collant
 * ---------------------------------------------------------------------------
 *
 * Le lien prend la forme sérielle du reste de la coquille — mono capitales sur
 * l'encre, coquille pour le texte (13,93:1), un filet porteur autour. Il garde
 * son `z-50`, et c'est devenu une nécessité plutôt qu'une précaution : depuis
 * que l'en-tête est collant et monte à `z-40`, un lien d'évitement au rang par
 * défaut apparaîtrait DERRIÈRE lui. Le premier élément que le clavier atteint
 * serait invisible — exactement le défaut que ce lien existe pour corriger.
 *
 * `sr-only` puis `focus-visible:not-sr-only` et non `focus:` : un clic de
 * souris sur le haut de la page ne doit pas faire surgir un lien que personne
 * n'a demandé.
 */
export function LienSaut() {
  return (
    <a
      href="#contenu"
      className="etiquette sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-sm focus-visible:border focus-visible:border-filet-fort focus-visible:bg-encre focus-visible:px-4 focus-visible:py-3 focus-visible:text-coquille"
    >
      Aller au contenu principal
    </a>
  );
}
