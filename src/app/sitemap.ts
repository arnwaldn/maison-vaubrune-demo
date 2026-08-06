import type { MetadataRoute } from 'next';

import { CATALOGUE } from '@/donnees/catalogue';
import { DATE_PUBLICATION, URL_SITE } from '@/donnees/site';

/**
 * Plan du site.
 *
 * Règle posée en C1 et tenue depuis : chaque tranche qui livre une page
 * l'ajoute ici, jamais avant. Annoncer aux moteurs des adresses qui répondent
 * 404 coûte plus cher que de ne rien annoncer.
 *
 * La tranche C2 en apporte seize : le rayon et les quinze fiches. Les fiches
 * sont dérivées du catalogue et non listées à la main — une liste recopiée
 * oublierait le seizième produit le jour où il arrivera.
 *
 * La tranche C3 en apporte une : la page « Livraison ».
 *
 * Priorités : l'accueil à 1, le rayon à 0,9 (c'est la page qui vend), les
 * fiches à 0,8, la livraison à 0,7 — page de confiance, consultée avant
 * l'achat mais rarement cherchée pour elle-même. Ce ne sont que des
 * indications de hiérarchie interne, aucun moteur n'en fait un classement.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const accueil = {
    url: new URL('/', URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'monthly' as const,
    priority: 1,
  };

  const rayon = {
    url: new URL('/boutique', URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  };

  const fiches = CATALOGUE.map((produit) => ({
    url: new URL(`/boutique/${produit.slug}`, URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const livraison = {
    url: new URL('/livraison', URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  };

  return [accueil, rayon, ...fiches, livraison];
}
