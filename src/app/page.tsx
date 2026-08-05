import type { Metadata } from 'next';

import { EncartFiction } from '@/composants/demonstration/EncartFiction';
import { Silhouette } from '@/composants/illustrations/Silhouette';
import type { FormeSilhouette, TeinteSilhouette } from '@/composants/illustrations/Silhouette';
import { marchand } from '@/donnees/marchand';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

interface Promesse {
  readonly forme: FormeSilhouette;
  readonly teinte: TeinteSilhouette;
  readonly titre: string;
  readonly texte: string;
}

/**
 * Ce que la démonstration montrera, dit au futur tant que ce n'est pas
 * construit. Rien ici ne prétend exister aujourd'hui : la tranche C1 ne livre
 * que le socle et la direction artistique.
 */
const PROMESSES: readonly Promesse[] = [
  {
    forme: 'bocal',
    teinte: 'olive',
    titre: 'Un catalogue tenu par le marchand',
    texte:
      'Fiches, prix et disponibilités se modifient depuis un espace de gestion, ' +
      'sans toucher au code ni rappeler le développeur.',
  },
  {
    forme: 'coffret',
    teinte: 'terre',
    titre: 'Un panier qui va jusqu’au paiement',
    texte:
      'Frais de port calculés par zone et affichés avant de payer, encaissement ' +
      'confié à un prestataire agréé, en mode d’essai.',
  },
  {
    forme: 'sachet',
    teinte: 'ocre',
    titre: 'Des commandes que l’on suit',
    texte:
      'Chaque commande passe d’un état à l’autre, et le client retrouve la sienne ' +
      'à partir de sa référence.',
  },
];

export default function PageAccueil() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Épicerie fine régionale
        </p>
        <h1 className="mt-5 text-affiche font-semibold text-encre">{marchand.nom}</h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          {marchand.baseline}.
        </p>
      </section>

      <EncartFiction />

      <section aria-labelledby="titre-programme" className="py-14 sm:py-20">
        <h2 id="titre-programme" className="text-titre font-semibold text-encre">
          Ce que la démonstration montrera
        </h2>
        <p className="mt-5 max-w-lisible leading-relaxed text-encre-douce">
          Le socle est posé&nbsp;: mise en page, palette, typographie, en-têtes de
          sécurité. Les rayons arrivent ensuite, par tranches, et chacune est mesurée
          avant d’être annoncée.
        </p>

        <ul className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {PROMESSES.map((promesse) => (
            <li key={promesse.forme} className="border-t border-filet pt-6">
              <Silhouette forme={promesse.forme} teinte={promesse.teinte} hauteur={80} />
              <h3 className="mt-5 font-titre text-lg font-semibold text-encre">
                {promesse.titre}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-encre-douce">
                {promesse.texte}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
