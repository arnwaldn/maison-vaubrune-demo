/**
 * LE BALISAGE JSON-LD, posé dans le HTML servi.
 *
 * Composant SERVEUR, sans état et sans JavaScript de page : la balise
 * `<script type="application/ld+json">` n'est pas exécutée par le navigateur,
 * elle est lue par les robots d'indexation. Elle ne coûte donc rien au budget
 * JavaScript du projet — c'est du HTML —, mais elle pèse dans la page, et ce
 * poids est relevé tranche par tranche comme le reste.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi `dangerouslySetInnerHTML`, et pourquoi ce n'est pas dangereux ici
 * ---------------------------------------------------------------------------
 *
 * React échapperait les guillemets et les esperluettes d'un texte ordinaire,
 * ce qui produirait du JSON illisible pour un analyseur. Le contenu doit donc
 * être posé brut. Deux garde-fous, et ils sont suffisants :
 *
 * 1. LA SOURCE EST INTERNE. Les objets sérialisés viennent de
 *    `src/lib/donnees-structurees.ts`, alimenté par le catalogue versionné et
 *    par `marchand.ts`. Aucune saisie de visiteur n'entre ici, et il n'y a pas
 *    de chemin par lequel elle le pourrait.
 * 2. LE CHEVRON OUVRANT EST ÉCHAPPÉ quand même. `JSON.stringify` laisse passer
 *    « < » tel quel : une chaîne contenant « </script> » refermerait la balise
 *    et le reste serait interprété comme du balisage. L'échappement en
 *    séquence Unicode reste du JSON parfaitement valide et supprime la
 *    possibilité, plutôt que de compter sur le fait qu'elle ne se présente
 *    pas. Une garantie qui ne dépend d'aucune relecture vaut mieux qu'une
 *    relecture.
 */

const CHEVRON_OUVRANT = /</g;

/** « < » en séquence d'échappement JSON : du JSON valide, inerte en HTML. */
const CHEVRON_ECHAPPE = '\\u003c';

function serialiser(donnees: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(donnees).replace(CHEVRON_OUVRANT, CHEVRON_ECHAPPE);
}

export function DonneesStructurees({
  donnees,
}: {
  readonly donnees: Readonly<Record<string, unknown>>;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiser(donnees) }}
    />
  );
}
