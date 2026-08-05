/**
 * Adresse publique du site.
 *
 * Sert de base aux URL absolues (métadonnées, plan du site, fichier robots).
 * La valeur vient de l'environnement pour que la préproduction ne se déclare
 * jamais sous l'adresse de la production ; le repli local permet de construire
 * le projet sans aucune variable définie.
 */
const REPLI_LOCAL = 'http://localhost:3000';

export const URL_SITE: string = process.env['NEXT_PUBLIC_URL_SITE'] ?? REPLI_LOCAL;

/**
 * Date de dernière modification publiée dans le plan du site.
 * Volontairement figée plutôt que calculée à la construction : deux
 * constructions du même code doivent produire exactement le même plan.
 */
export const DATE_PUBLICATION = '2026-08-06';
