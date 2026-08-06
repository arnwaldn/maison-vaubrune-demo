import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BandeauDemonstration } from '@/composants/demonstration/BandeauDemonstration';

/**
 * L'ESPACE MARCHAND — la coulisse, ouverte volontairement.
 *
 * ---------------------------------------------------------------------------
 * Pas de mot de passe, et c'est une décision (pas un oubli)
 * ---------------------------------------------------------------------------
 *
 * Une boutique livrée met cet espace derrière un compte et un mot de passe.
 * Cette démonstration l'ouvre, et l'écrit sur la page plutôt que de le laisser
 * découvrir. La raison est commerciale autant que technique : un prospect qui
 * doit demander un accès pour voir l'écran qui l'intéresse le plus ne le
 * demande pas — il ferme l'onglet. Et il n'y a rien à protéger ici : le
 * catalogue est public, les six commandes sont un jeu d'essai qui se dit tel,
 * et tout ce que le visiteur modifie reste dans son navigateur.
 *
 * ---------------------------------------------------------------------------
 * `noindex`, et pourquoi c'est cohérent avec D19 plutôt que contraire
 * ---------------------------------------------------------------------------
 *
 * La décision D19 a RETIRÉ `noindex` de `/panier` et `/commande`, mesures à
 * l'appui : la consigne fait tomber la note de référencement de 100 à 66, et un
 * projet qui vend quatre notes ne peut pas publier une note effondrée par une
 * consigne volontaire — elle est indiscernable, dans un rapport, d'une note
 * effondrée par une faute.
 *
 * Ici, c'est l'inverse et c'est la même règle. `/gestion` n'est pas une page de
 * boutique présentable, c'est la coulisse du marchand : elle porte donc
 * `noindex`, elle est déjà interdite dans `src/app/robots.ts`, elle est absente
 * du plan du site — et elle N'ENTRE PAS dans les mesures publiées. Sa note de
 * référencement en retrait est relevée dans le compte rendu de la tranche et
 * expliquée, pas corrigée : la corriger reviendrait à retirer la consigne, donc
 * à ouvrir l'espace de gestion aux moteurs pour faire un joli chiffre.
 */

export const metadata: Metadata = {
  title: { default: 'Espace marchand', template: '%s — Espace marchand' },
  robots: { index: false, follow: false },
};

const ONGLETS = [
  { libelle: 'Tableau de bord', adresse: '/gestion' },
  { libelle: 'Commandes', adresse: '/gestion/commandes' },
  { libelle: 'Catalogue', adresse: '/gestion/catalogue' },
  { libelle: 'Modèles de courriels', adresse: '/gestion/modeles-de-courriels' },
  { libelle: 'Prise en main', adresse: '/gestion/prise-en-main' },
] as const;

export default function MiseEnPageGestion({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <BandeauDemonstration
        texte={
          'Vos essais restent dans votre navigateur et disparaissent si vous videz ' +
          'son cache. Rien n’est envoyé nulle part, aucun courriel ne part.'
        }
      />

      <div className="mx-auto max-w-page px-5 sm:px-8">
        <nav aria-label="Fil d’Ariane" className="pt-8 text-sm text-encre-douce">
          <Link
            href="/"
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            Boutique
          </Link>
          <span aria-hidden="true"> / </span>
          <Link
            href="/gestion"
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            Espace marchand
          </Link>
        </nav>

        <nav
          aria-label="Sections de l’espace marchand"
          className="mt-6 border-y border-filet py-4"
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {ONGLETS.map((onglet) => (
              <li key={onglet.adresse}>
                <Link
                  href={onglet.adresse}
                  className="text-sm font-medium text-encre-douce underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                >
                  {onglet.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section
          aria-labelledby="titre-acces-libre"
          className="mt-6 rounded-sm border border-ocre-clair bg-papier p-5 sm:p-6"
        >
          <h2
            id="titre-acces-libre"
            className="font-titre text-base font-semibold text-encre"
          >
            Pourquoi cet espace n’a pas de mot de passe
          </h2>
          <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre">
            Sur une boutique livrée, cet espace est derrière un compte et un mot de
            passe. La démonstration l’ouvre volontairement, pour que vous puissiez
            regarder sans me demander un accès.
          </p>
          <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Il n’y a du reste rien à protéger&nbsp;: le catalogue est déjà public, les
            six commandes affichées sont un jeu d’essai qui se dit tel, et tout ce que
            vous modifiez ici ne quitte pas votre navigateur. Une boutique réelle y
            ajouterait un compte, des rôles et un journal des accès — trois choses qui
            n’ont de sens qu’avec un serveur derrière.
          </p>
        </section>

        {children}
      </div>
    </>
  );
}
