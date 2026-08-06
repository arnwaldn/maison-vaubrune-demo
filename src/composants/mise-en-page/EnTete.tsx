import Link from 'next/link';

import { PastillePanier } from '@/composants/panier/PastillePanier';
import { marchand } from '@/donnees/marchand';

/**
 * Navigation squelette. Les trois destinations sont celles d'une boutique :
 * le rayon, la promesse de livraison, le suivi d'une commande déjà passée.
 *
 * Les pages qui n'existent pas encore sont des ancres HTML ordinaires et non
 * des `<Link>`. La raison n'est pas typographique mais mesurable — `<Link>`
 * préchargerait ces routes dès qu'elles entrent dans la fenêtre, soit autant
 * de requêtes qui répondraient 404 sur chaque page vue. La bascule se fait
 * route par route, à mesure que chaque page existe.
 *
 * Bascule C2 : « Boutique » est désormais un `<Link>`, la route existe et son
 * préchargement est même souhaitable — c'est la page vers laquelle tout le
 * site pousse. Restent deux ancres ordinaires, jusqu'aux tranches C3 et C5.
 *
 * Bascule C3 : « Livraison » passe à son tour en `<Link>`. Reste une seule
 * ancre ordinaire : le suivi de commande.
 *
 * Report C5 : cette dernière ancre était annoncée pour C5. La tranche C5 livre
 * le paiement, les états et le journal — de quoi ALIMENTER un suivi — mais la
 * page qui les affiche relève de C6. L'ancre est restée ordinaire une tranche
 * de plus, et le dire valait mieux que laisser un commentaire promettre une
 * bascule qui n'avait pas eu lieu.
 *
 * Bascule C6 : la page existe, à `/suivi`. Les trois liens sont désormais des
 * `<Link>`, plus une seule ancre ordinaire dans cet en-tête. L'adresse a été
 * raccourcie de `/suivi-de-commande` à `/suivi` en même temps qu'elle
 * devenait réelle : rien ne pointait dessus, et une adresse courte se dicte au
 * téléphone comme la référence qu'on y tape.
 *
 * Ajout C4 : la pastille du panier, dernier élément de la navigation. C'est le
 * SEUL îlot client de cet en-tête — le reste, y compris cette liste, demeure
 * rendu côté serveur. Elle est placée en fin de liste parce que c'est là qu'on
 * la cherche, et qu'un lien qui bouge d'une page à l'autre ne se retrouve pas.
 */
const LIENS_NAVIGATION = [
  { libelle: 'Boutique', adresse: '/boutique', livree: true },
  { libelle: 'Livraison', adresse: '/livraison', livree: true },
  { libelle: 'Suivi de commande', adresse: '/suivi', livree: true },
] as const;

const CLASSE_LIEN =
  'text-sm font-medium text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre';

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
                {lien.livree ? (
                  <Link href={lien.adresse} className={CLASSE_LIEN}>
                    {lien.libelle}
                  </Link>
                ) : (
                  <a href={lien.adresse} className={CLASSE_LIEN}>
                    {lien.libelle}
                  </a>
                )}
              </li>
            ))}
            <li>
              <PastillePanier />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
