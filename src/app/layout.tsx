import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { EnTete } from '@/composants/mise-en-page/EnTete';
import { LienSaut } from '@/composants/mise-en-page/LienSaut';
import { PiedDePage } from '@/composants/mise-en-page/PiedDePage';
import { CATALOGUE } from '@/donnees/catalogue';
import { marchand } from '@/donnees/marchand';
import { URL_SITE } from '@/donnees/site';
import {
  projeterCatalogue,
  stocksDepuisCatalogue,
} from '@/lib/panier/catalogue-panier';
import { FournisseurPanier } from '@/lib/panier/contexte-panier';

import { policeTexte, policeTitre } from './polices';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: `${marchand.nom} — épicerie fine de démonstration`,
    template: `%s — ${marchand.nom}`,
  },
  description:
    'Boutique en ligne de démonstration. Maison Vaubrune est une épicerie fine ' +
    'régionale fictive. Aucune commande n’est expédiée, aucun paiement n’est ' +
    'encaissé.',
  applicationName: marchand.nom,
  authors: [{ name: 'Arnaud Porcel' }],
  creator: 'Arnaud Porcel',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: marchand.nom,
    title: `${marchand.nom} — épicerie fine de démonstration`,
    description:
      'Une boutique en ligne complète, montée en démonstration sur une épicerie ' +
      'fine fictive.',
    url: '/',
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf6ef',
};

/**
 * Les stocks, calculés une fois à la construction.
 *
 * C'est la SEULE chose que le panier emprunte au catalogue sur toutes les
 * pages : vingt-trois paires `SKU → nombre`, transmises au fournisseur en
 * propriété. Elles voyagent donc dans la charge utile RSC, aplatie dans le
 * HTML, et non dans le paquet JavaScript — un `import` du catalogue depuis un
 * composant client y aurait embarqué les quinze fiches entières. Le
 * raisonnement complet est en tête de `src/lib/panier/reducteur.ts`.
 */
const STOCKS = stocksDepuisCatalogue(projeterCatalogue(CATALOGUE));

/**
 * La mise en page racine RESTE UN COMPOSANT SERVEUR. `<FournisseurPanier>`
 * porte la directive `'use client'`, mais `children` lui est passé en
 * propriété : React le traite comme un arbre déjà rendu côté serveur, si bien
 * que l'accueil, le rayon et les quinze fiches ne deviennent pas clients pour
 * autant. C'est ce patron — et lui seul — qui permet une pastille de panier
 * dans l'en-tête sans expédier les pages au navigateur.
 */
export default function MiseEnPageRacine({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" className={`${policeTitre.variable} ${policeTexte.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <FournisseurPanier stocks={STOCKS}>
          <LienSaut />
          <EnTete />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <PiedDePage />
        </FournisseurPanier>
      </body>
    </html>
  );
}
