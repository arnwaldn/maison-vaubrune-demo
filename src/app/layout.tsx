import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { EnTete } from '@/composants/mise-en-page/EnTete';
import { LienSaut } from '@/composants/mise-en-page/LienSaut';
import { PiedDePage } from '@/composants/mise-en-page/PiedDePage';
import { marchand } from '@/donnees/marchand';
import { URL_SITE } from '@/donnees/site';

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

export default function MiseEnPageRacine({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" className={`${policeTitre.variable} ${policeTexte.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <LienSaut />
        <EnTete />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <PiedDePage />
      </body>
    </html>
  );
}
