import type { MetadataRoute } from 'next';

import { DATE_PUBLICATION, URL_SITE } from '@/donnees/site';

/**
 * Plan du site.
 *
 * Une seule adresse en tranche C1, et c'est volontaire : annoncer aux moteurs
 * des pages qui répondent 404 coûte plus cher que de ne rien annoncer. Chaque
 * tranche qui livre une page l'ajoute ici, jamais avant.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL('/', URL_SITE).toString(),
      lastModified: DATE_PUBLICATION,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
