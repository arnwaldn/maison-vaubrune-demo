/**
 * L'aveu, en haut de l'accueil, avant toute autre chose.
 *
 * Le texte est figé au caractère près : c'est la phrase qui protège le
 * visiteur (il ne croit pas commander chez un vrai marchand) et le projet
 * (aucune ambiguïté sur ce qui est simulé).
 *
 * Convention de typographie du projet : l'espace insécable qui précède le
 * deux-points s'écrit `&nbsp;` et jamais en caractère littéral. Une espace
 * insécable littérale est invisible à la relecture, se perd au premier
 * copier-coller, et personne ne s'en aperçoit. Les apostrophes typographiques
 * (U+2019), elles, restent en littéral — on les voit.
 */
export function EncartFiction() {
  return (
    <aside
      aria-labelledby="etiquette-fiction"
      className="overflow-hidden rounded-sm border-2 border-terre bg-papier"
    >
      <p
        id="etiquette-fiction"
        className="bg-terre px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-creme uppercase sm:px-7"
      >
        Démonstration — épicerie fictive
      </p>
      <p className="px-5 py-6 text-chapeau text-encre sm:px-7">
        L’épicerie est fictive. Ce projet est une démonstration&nbsp;: il sert à
        montrer, en conditions réelles, ce que contient une boutique en ligne livrée
        dans les règles. Aucune commande n’est expédiée, aucun paiement n’est
        encaissé.
      </p>
    </aside>
  );
}
