import Link from 'next/link';

import { marchand } from '@/donnees/marchand';

/**
 * Navigation squelette. Les trois destinations sont celles d'une boutique :
 * le rayon, la promesse de livraison, le suivi d'une commande déjà passée.
 *
 * Les pages n'existent pas encore (tranches C2 et suivantes) : ce sont donc
 * des ancres HTML ordinaires et non des `<Link>`. La raison n'est pas
 * typographique mais mesurable — `<Link>` préchargerait ces trois routes dès
 * qu'elles entrent dans la fenêtre, soit trois requêtes qui répondraient 404
 * sur chaque page vue. La bascule vers `<Link>` se fera route par route, à
 * mesure que chaque page existe.
 */
const LIENS_NAVIGATION = [
  { libelle: 'Boutique', adresse: '/boutique' },
  { libelle: 'Livraison', adresse: '/livraison' },
  { libelle: 'Suivi de commande', adresse: '/suivi-de-commande' },
] as const;

export function EnTete() {
  return (
    <header className="border-b border-filet bg-creme">
      <div className="mx-auto flex max-w-page flex-wrap items-baseline justify-between gap-x-8 gap-y-3 px-5 py-5 sm:px-8">
        <Link href="/" className="group inline-flex flex-col no-underline">
          <span className="font-titre text-2xl font-semibold tracking-tight text-encre group-hover:text-terre">
            {marchand.nom}
          </span>
          <span className="text-xs tracking-[0.14em] text-encre-douce uppercase">
            Épicerie fine — démonstration
          </span>
        </Link>

        <nav aria-label="Navigation principale">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LIENS_NAVIGATION.map((lien) => (
              <li key={lien.adresse}>
                <a
                  href={lien.adresse}
                  className="text-sm font-medium text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                >
                  {lien.libelle}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
