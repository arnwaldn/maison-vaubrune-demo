/**
 * Adresse publique du site.
 *
 * Sert de base aux URL absolues (métadonnées, plan du site, fichier robots).
 * La valeur vient de l'environnement pour que la préproduction ne se déclare
 * jamais sous l'adresse de la production ; le repli permet de construire le
 * projet sans aucune variable définie.
 *
 * Depuis la mise en ligne (tranche C9, 2026-08-06), ce repli est l'adresse de
 * PRODUCTION et non plus `http://localhost:3000`. Motif : le plan du site, les
 * adresses canoniques et le balisage JSON-LD sont engendrés à la construction,
 * et une construction qui oublierait la variable publierait un plan du site
 * pointant vers la machine du développeur — une faute silencieuse, qui ne se
 * voit qu'une fois indexée. Un repli faux ne se remarque pas ; un repli juste
 * ne coûte rien.
 *
 * Le développement local reprend la main en définissant `NEXT_PUBLIC_URL_SITE`
 * (voir `.env.example`) : l'environnement PRIME toujours sur le repli.
 */
const REPLI_PRODUCTION = 'https://maison-vaubrune-demo.vercel.app';

export const URL_SITE: string = process.env['NEXT_PUBLIC_URL_SITE'] ?? REPLI_PRODUCTION;

/**
 * Date de dernière modification publiée dans le plan du site.
 * Volontairement figée plutôt que calculée à la construction : deux
 * constructions du même code doivent produire exactement le même plan.
 */
export const DATE_PUBLICATION = '2026-08-06';
