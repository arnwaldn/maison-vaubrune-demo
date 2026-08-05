import type { MetadataRoute } from 'next';

import { URL_SITE } from '@/donnees/site';

/**
 * L'espace de gestion (`/gestion`) est interdit aux robots : c'est la
 * coulisse du marchand, elle n'a rien à faire dans un moteur de recherche —
 * même sur une démonstration, où elle ne protège aucune donnée réelle. La
 * boutique, elle, est faite pour être trouvée.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/gestion',
    },
    sitemap: new URL('/sitemap.xml', URL_SITE).toString(),
  };
}
