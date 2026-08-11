/**
 * LE RÉGIME (b) DES VIGNETTES — les alternatives textuelles des visuels.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CETTE LOGIQUE VIT DANS SON PROPRE FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle a été écrite en C11, et elle ne peut s'exercer qu'en C14 : le champ
 * `visuel` n'existe pas encore au catalogue, et le schéma zod de la garde —
 * un `strictObject` — REFUSERAIT une clé qu'il ne connaît pas. Le régime (b)
 * était donc, à sa naissance, du code que rien n'exécutait et que rien ne
 * pouvait exécuter. La revue de C11 l'a relevé : une règle non éprouvée est
 * une règle dont on découvre les fautes le jour où on comptait sur elle.
 *
 * Extraite ici, elle devient une fonction PURE qui prend un catalogue en
 * paramètre. Les tests lui donnent un catalogue SYNTHÉTIQUE portant déjà le
 * champ `visuel` — ce que le catalogue réel ne pourra pas faire avant C14 —
 * et vérifient les deux verdicts. Le jour où C14 ouvrira le schéma, la règle
 * aura déjà été éprouvée, et il n'y aura qu'à la brancher.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES DEUX EXIGENCES, ET POURQUOI LA SECONDE EST LA PLUS UTILE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Une alternative textuelle NON VIDE. Une image de produit sans alternative
 *    est une fiche muette pour qui navigue à l'oreille.
 * 2. Des alternatives toutes DISTINCTES. C'est celle qu'on oublie : quinze
 *    fiches dont l'image porterait « Photographie du produit » satisfont la
 *    première, ne disent rien à personne, et passent TOUS les audits
 *    automatiques — aucun outil ne sait qu'un texte correct est inutile.
 *
 * La comparaison se fait sur la forme rognée et en minuscules : « Bocal de
 * miel » et « bocal de miel  » sont la même phrase pour une oreille, et les
 * traiter comme deux alternatives distinctes rendrait la règle contournable
 * par une espace.
 */

/**
 * Les produits qui portent déjà un champ `visuel`.
 *
 * Le régime (b) est TOLÉRANT par construction : il ne dit rien des produits
 * sans visuel, parce qu'à l'heure où il est écrit ils sont les quinze.
 */
function produitsIllustres(catalogue) {
  return catalogue.filter(
    (produit) => produit.visuel !== undefined && produit.visuel !== null,
  );
}

/**
 * Contrôle le régime (b) sur un catalogue.
 *
 * @param {readonly Record<string, unknown>[]} catalogue
 * @returns {{ anomalies: string[], illustres: number, alternatives: number }}
 */
export function controlerVisuels(catalogue) {
  const illustres = produitsIllustres(catalogue);
  const anomalies = [];
  /** Alternative normalisée → slug du premier produit qui la porte. */
  const vues = new Map();

  for (const produit of illustres) {
    const alt = produit.visuel?.principal?.alt;
    const slug = String(produit.slug);

    if (typeof alt !== 'string' || alt.trim() === '') {
      anomalies.push(
        `${slug} : visuel.principal.alt vide ou absent — une image de produit ` +
          'sans alternative textuelle est une fiche muette pour un lecteur d’écran',
      );
      continue;
    }

    const clef = alt.trim().toLowerCase();
    const dejaVu = vues.get(clef);

    if (dejaVu === undefined) {
      vues.set(clef, slug);
      continue;
    }

    anomalies.push(
      `${slug} et ${dejaVu} partagent l’alternative « ${alt.trim()} » : deux ` +
        'images décrites de la même façon ne se distinguent pas à l’oreille',
    );
  }

  return { anomalies, illustres: illustres.length, alternatives: vues.size };
}
