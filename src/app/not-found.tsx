import type { Metadata } from 'next';
import Link from 'next/link';

import { LigneEntree } from '@/composants/mise-en-page/BlocTitre';

export const metadata: Metadata = {
  title: 'Page introuvable',
};

/**
 * Page 404. Elle sera très visitée pendant la construction : la navigation
 * annonce des rayons qui n'existent pas encore. Autant qu'elle le dise
 * franchement plutôt que de laisser croire à une panne.
 *
 * C13 : re-skin aux jetons, aucune logique. Le code d'erreur passe au registre
 * (mono capitales, filet dessous) — c'est une DONNÉE, pas un titre, et le
 * registre est la forme que ce système donne aux données. Le lien de retour
 * prend l'accent bleu (6,58:1 sur coquille), qui est la couleur d'interface de
 * cette palette là où la terre n'est plus qu'une matière.
 *
 * C19 : LE TEXTE EST REPRIS, et c'était la dette la plus visible du lot.
 * Il annonçait « les rayons ensuite », donc des tranches à venir — vrai en C1,
 * faux depuis C15 : les quinze fiches existent, le rayon est rangé, la
 * boutique est complète. Un site fini qui s'excuse d'être en chantier sur sa
 * page d'erreur dit au visiteur qu'il ne faut pas trop compter sur le reste.
 *
 * La nouvelle prose ne promet rien et n'invente rien : elle constate qu'une
 * adresse ne correspond à rien et propose les deux chemins qui existent —
 * le rayon et l'accueil. C'est ce qu'une page 404 a à faire.
 */
export default function PageIntrouvable() {
  return (
    <div className="mx-auto max-w-page px-5 py-20 sm:px-8 sm:py-28">
      {/* LE FILET RESTE PLEINE LARGEUR, ET C'EST POURQUOI IL EST SUR UNE
          ENVELOPPE (C19-ter). Une ligne d'entrée porte `width: fit-content` —
          un masque plus large que son texte laisserait voir la montée à côté
          de la ligne —, si bien qu'un `border-b` posé dessus s'arrêterait au
          dernier caractère de « Erreur 404 ». Le filet est un élément de mise
          en page, pas de texte : il reste dehors, et la ligne monte dessous. */}
      <div className="border-b border-filet-fort pb-3">
        <LigneEntree rang={1} className="etiquette text-ocre" enfants="Erreur 404" />
      </div>
      <LigneEntree
        rang={2}
        balise="h1"
        className="mt-8 text-affiche text-encre"
        enfants="Cette page n’existe pas"
      />
      <LigneEntree
        rang={3}
        libre
        surMarbre
        className="mt-6 max-w-lisible text-chapeau text-encre"
        enfants={
          <>
            L’adresse demandée ne correspond à aucune page de cette démonstration.
            Elle a peut-être été mal recopiée, ou vous avez suivi un lien qui ne mène
            plus nulle part.
          </>
        }
      />
      <p className="panneau mt-6 max-w-lisible leading-relaxed text-encre-douce">
        Les quinze références de la maison sont rangées au rayon, en sept familles.
      </p>
      <p className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
        <Link
          href="/boutique"
          className="etiquette text-encre underline decoration-filet-fort decoration-2 underline-offset-4 hover:decoration-encre"
        >
          Voir le rayon
        </Link>
        <Link
          href="/"
          className="etiquette text-encre underline decoration-filet-fort decoration-2 underline-offset-4 hover:decoration-encre"
        >
          Revenir à l’accueil
        </Link>
      </p>
    </div>
  );
}
