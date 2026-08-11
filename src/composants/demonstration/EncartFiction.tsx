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
 *
 * ---------------------------------------------------------------------------
 * C13 : le panneau devient une LIGNE DE REGISTRE
 * ---------------------------------------------------------------------------
 *
 * Jusqu'ici, l'aveu était un panneau : deux pixels de bordure terre, un fond
 * papier, une barre de titre en aplat terre. Un panneau est ce qu'on met autour
 * d'un message dont on doute qu'il soit lu — et c'est précisément le mauvais
 * réflexe ici. Un avertissement encadré ressemble à une bannière publicitaire,
 * et la première chose qu'un visiteur apprend à faire d'une bannière est de ne
 * pas la voir.
 *
 * Le concept directeur donne la forme juste : le REGISTRE. L'aveu devient une
 * ligne de registre — étiquette en mono capitales, filet au-dessus, filet en
 * dessous, aucun aplat. Il ne crie plus, il CONSIGNE. Sur la coquille nue, une
 * ligne bornée par deux filets se lit comme l'entrée d'un cahier, pas comme
 * une réclame.
 *
 * TROIS CHOSES NE BOUGENT PAS, et deux d'entre elles sont sous garde :
 *
 * 1. `<aside>` — donc le rôle `complementary`, que la campagne d'achat
 *    interroge sur l'accueil ;
 * 2. l'étiquette « Démonstration — épicerie fictive », qui est le NOM
 *    ACCESSIBLE de cet aside par `aria-labelledby`, au caractère près ;
 * 3. la phrase, au caractère près elle aussi.
 *
 * L'aveu reste par ailleurs dit sur TOUTES les pages, et pas seulement ici :
 * l'en-tête porte « Épicerie fine — démonstration » dans le même registre mono
 * capitales, sous la marque, et le pied de page le répète deux fois. Cette
 * ligne-ci est l'aveu DÉVELOPPÉ, à l'endroit où le visiteur arrive.
 *
 * Le filet retenu est `--color-filet-fort` (3,17:1 sur coquille) et non
 * `--color-filet` (1,31:1) : celui-ci est déclaré DÉCOR SEUL depuis C12, et un
 * trait qui délimite un avertissement porte du sens.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  C19 — LA LIGNE DE REGISTRE DEVIENT UN PANNEAU, ET C'EST LA PRÉMISSE DE C13
 *  QUI A CHANGÉ, PAS SA CONCLUSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le raisonnement de C13 est écrit six paragraphes plus haut, et il porte sa
 * propre condition : « SUR LA COQUILLE NUE, une ligne bornée par deux filets se
 * lit comme l'entrée d'un cahier ». Le fond de la page n'est plus une coquille
 * nue depuis cette tranche : c'est un marbre veiné. Deux filets posés sur une
 * matière ne bornent plus rien — ils se noient dedans, et cinq lignes de prose
 * traversent le veinage.
 *
 * Le panneau de verre rend à cette ligne ce que les deux filets lui donnaient
 * sur un aplat : une surface à elle. Ce qui reste interdit, et qui était le
 * VRAI motif de C13, n'a pas bougé d'un pouce — pas d'aplat COLORÉ, pas de
 * cadre d'alerte, pas de réclame. Le verre est plus clair que la page ; il
 * pose, il ne crie pas.
 *
 * Les trois choses sous garde ne bougent pas non plus : `<aside>`, l'étiquette
 * qui nomme l'aside, et la phrase au caractère près.
 */
export function EncartFiction() {
  return (
    <aside
      aria-labelledby="etiquette-fiction"
      className="panneau border-filet-fort"
    >
      <p id="etiquette-fiction" className="etiquette text-terre">
        Démonstration — épicerie fictive
      </p>
      <p className="mt-4 max-w-lisible text-chapeau text-encre">
        L’épicerie est fictive. Ce projet est une démonstration&nbsp;: il sert à
        montrer, en conditions réelles, ce que contient une boutique en ligne livrée
        dans les règles. Aucune commande n’est expédiée, aucun paiement n’est
        encaissé.
      </p>
    </aside>
  );
}
