import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable',
};

/**
 * Page 404. Elle sera très visitée pendant la construction : la navigation
 * annonce des rayons qui n'existent pas encore. Autant qu'elle le dise
 * franchement plutôt que de laisser croire à une panne.
 */
export default function PageIntrouvable() {
  return (
    <div className="mx-auto max-w-page px-5 py-20 sm:px-8 sm:py-28">
      <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
        Erreur 404
      </p>
      <h1 className="mt-5 text-affiche font-semibold text-encre">
        Cette page n’existe pas encore
      </h1>
      <p className="mt-6 max-w-lisible text-chapeau text-encre-douce">
        La démonstration se construit par tranches&nbsp;: le socle d’abord, les rayons
        ensuite. Si vous avez suivi un lien de la navigation, la page correspondante
        est simplement à venir.
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="font-medium text-terre underline decoration-2 underline-offset-4 hover:text-encre"
        >
          Revenir à l’accueil
        </Link>
      </p>
    </div>
  );
}
