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
 * La tranche C6 en apporte une : la page « Suivi de commande ». Elle est
 * INDEXABLE et annoncée, contrairement aux pages du tunnel qui sont hors plan
 * (décision D19) : un client cherche « suivi commande Maison Vaubrune » dans un
 * moteur, il ne cherche jamais son propre panier. L'espace de gestion
 * (`/gestion`), lui, reste absent du plan ET interdit aux robots
 * (`src/app/robots.ts`), avec la note `noindex` que porte sa mise en page.
 *
 * La tranche C7 en apporte CINQ : les quatre documents de vente et la page
 * « À propos de cette démonstration ». Elles sont INDEXABLES (décision D19) et
 * annoncées, pour deux raisons distinctes. Les documents légaux d'abord :
 * l'obligation d'information du consommateur n'a de sens que si le document est
 * atteignable, et une page de conditions générales se cherche parfois dans un
 * moteur plutôt que dans un pied de page. La page « À propos » ensuite : c'est
 * elle qui dit que la maison est fictive et où passe la frontière entre ce qui
 * fonctionne et ce qui est simulé — la dernière page qu'on voudrait cacher aux
 * moteurs sur un site de démonstration.
 *
 * Priorités : l'accueil à 1, le rayon à 0,9 (c'est la page qui vend), les
 * fiches à 0,8, la livraison et le suivi à 0,7 — pages de confiance,
 * consultées autour de l'achat mais rarement cherchées pour elles-mêmes —, la
 * page « À propos » à 0,6 et les quatre documents légaux à 0,4 : ils doivent
 * être trouvables, ils ne sont pas ce qui amène quelqu'un sur la boutique. Ce
 * ne sont que des indications de hiérarchie interne, aucun moteur n'en fait un
 * classement.
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

  const suivi = {
    url: new URL('/suivi', URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  };

  const aPropos = {
    url: new URL('/a-propos-de-cette-demonstration', URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  };

  const documentsLegaux = [
    '/mentions-legales',
    '/conditions-generales-de-vente',
    '/donnees-personnelles',
    '/retractation',
  ].map((chemin) => ({
    url: new URL(chemin, URL_SITE).toString(),
    lastModified: DATE_PUBLICATION,
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  }));

  return [accueil, rayon, ...fiches, livraison, suivi, aPropos, ...documentsLegaux];
}
