import type { NextConfig } from 'next';

/**
 * Configuration volontairement minimale : tout ce qui n'est pas justifié
 * n'est pas écrit. Les en-têtes de sécurité sont portés par `vercel.json`
 * (même jeu que le site portfolio) et non dupliqués ici.
 *
 * `typedRoutes` est stable depuis Next 15.5. Ce qu'il fait réellement, vérifié
 * sur cette installation (Next 15.5.22, le 2026-08-06) : il engendre
 * `.next/types/routes.d.ts` et les types globaux `PageProps` / `LayoutProps`,
 * qui donnent des paramètres d'URL typés dès qu'une route dynamique existera
 * (`/produit/[reference]` en C2). En revanche il ne restreint PAS le `href`
 * d'un `<Link>` : `next-env.d.ts` ne référence que `routes.d.ts`, et un lien
 * vers une route inexistante passe le `tsc --noEmit` comme le `next build`.
 * Le garde-fou « aucun lien mort » sera donc un test de la tranche C8, pas un
 * effet de bord du compilateur — on ne s'appuie pas sur une garantie qu'on
 * n'a pas mesurée.
 *
 * `poweredByHeader: false` retire l'en-tête `X-Powered-By: Next.js` : annoncer
 * sa pile applicative à qui la demande ne rend service qu'à celui qui cherche
 * une version vulnérable.
 */
const configuration: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
};

export default configuration;
