import type { ArticleSansRetractation } from '@/lib/panier/totaux';

/**
 * LES ARTICLES QUI N'OUVRENT PAS DROIT À RÉTRACTATION.
 *
 * ---------------------------------------------------------------------------
 * Pas une phrase écrite ici
 * ---------------------------------------------------------------------------
 *
 * Les textes affichés viennent de `regimeRetractation()` (décision D12,
 * source unique des mentions juridiques), transportés jusqu'ici par la
 * projection du catalogue puis par `calculerTotaux()`. Ce composant ne
 * reformule rien, n'abrège rien, n'ajoute aucun « environ » : il nomme les
 * produits concernés et pose la phrase du code de la consommation à côté.
 * Une mention recopiée à la main dans un gabarit de panier serait la
 * treizième copie d'une phrase qui n'en admet qu'une.
 *
 * ---------------------------------------------------------------------------
 * Groupé par fondement, et pas par produit
 * ---------------------------------------------------------------------------
 *
 * Un panier contenant le beurre ET le fromage relève deux fois du même article
 * L. 221-28, 4°. Répéter la phrase donnerait un pavé illisible où l'important
 * — QUELS produits sont concernés — se noierait. Les produits sont donc
 * regroupés sous leur fondement, la phrase n'étant écrite qu'une fois par
 * fondement invoqué.
 *
 * Le bloc disparaît quand le panier n'a que des produits rétractables : une
 * boutique n'a pas à agiter une exception qui ne s'applique pas.
 */

export function MentionRetractation({
  articles,
}: {
  readonly articles: readonly ArticleSansRetractation[];
}) {
  if (articles.length === 0) {
    return null;
  }

  const groupes = grouperParFondement(articles);

  return (
    <section
      aria-labelledby="titre-retractation-panier"
      className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
    >
      <h2
        id="titre-retractation-panier"
        className="font-titre text-base font-semibold text-encre"
      >
        Droit de rétractation
      </h2>

      <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
        Les articles ci-dessous n’ouvrent pas droit aux quatorze jours de
        rétractation. Le reste du panier, s’il y en a, y ouvre droit normalement.
      </p>

      <ul className="mt-4 space-y-5">
        {groupes.map((groupe) => (
          <li key={groupe.fondement}>
            <p className="text-sm font-semibold text-encre">
              {groupe.noms.join(', ')}
            </p>
            <p className="mt-1.5 max-w-lisible text-sm leading-relaxed text-encre-douce">
              {groupe.phrase}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface GroupeRetractation {
  readonly fondement: string;
  readonly phrase: string;
  readonly noms: readonly string[];
}

function grouperParFondement(
  articles: readonly ArticleSansRetractation[],
): readonly GroupeRetractation[] {
  const groupes = new Map<string, { phrase: string; noms: string[] }>();

  for (const article of articles) {
    const existant = groupes.get(article.fondement);

    if (existant === undefined) {
      groupes.set(article.fondement, { phrase: article.phrase, noms: [article.nom] });
    } else {
      existant.noms.push(article.nom);
    }
  }

  return [...groupes.entries()].map(([fondement, { phrase, noms }]) => ({
    fondement,
    phrase,
    noms,
  }));
}
