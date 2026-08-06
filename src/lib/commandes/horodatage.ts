/**
 * LES HORODATAGES, DITS EN FRANÇAIS.
 *
 * Le journal d'une commande enregistre des instants ISO 8601 — la forme sans
 * ambiguïté, celle qui se compare, se trie et se relit dans dix ans. C'est
 * aussi une forme illisible sur un écran : « 2026-07-18T09:12:00.000Z » ne dit
 * rien à personne.
 *
 * La conversion est donc faite À L'AFFICHAGE et jamais à l'écriture. Ce qui est
 * ENREGISTRÉ reste un instant, ce qui est AFFICHÉ est une phrase. Trois écrans
 * en avaient besoin en C6 — la confirmation de commande, le détail marchand, la
 * frise du suivi client — et une quatrième copie de six lignes aurait fini par
 * diverger des trois autres.
 *
 * FUSEAU DU VISITEUR, délibérément. `Intl` sans `timeZone` rend l'heure locale
 * de celui qui lit : un client à La Réunion voit l'heure à laquelle sa commande
 * lui est parvenue, pas celle du serveur. Le seul endroit du projet qui impose
 * `Europe/Paris` est la fabrication de la référence (`reference.ts`), et c'est
 * pour la raison inverse — une référence doit être la même pour tout le monde.
 *
 * UNE DATE ILLISIBLE REND LA CHAÎNE REÇUE, sans lever. Le cas se produit pour
 * de vrai : un journal recopié à la main dans le stockage local, un export
 * réimporté d'une version antérieure. Afficher la valeur brute est laid et
 * honnête ; lever casserait l'écran entier d'une commande pour une entrée de
 * journal.
 */

const JOUR_ET_HEURE = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const JOUR_SEUL = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function formater(horodatage: string, format: Intl.DateTimeFormat): string {
  const instant = new Date(horodatage);

  return Number.isNaN(instant.getTime()) ? horodatage : format.format(instant);
}

/** « 18 juillet 2026 à 11:12 » — le journal, la frise, le détail d'une commande. */
export function formaterHorodatage(horodatage: string): string {
  return formater(horodatage, JOUR_ET_HEURE);
}

/** « 18 juillet 2026 » — les tableaux, où l'heure n'apporte rien et prend une colonne. */
export function formaterJour(horodatage: string): string {
  return formater(horodatage, JOUR_SEUL);
}
