import Link from 'next/link';
import type { ReactNode } from 'react';

import { typographier } from '@/lib/typographie';

/**
 * Les pièces communes aux documents légaux (tranche C7).
 *
 * ---------------------------------------------------------------------------
 * Pourquoi un module de mise en forme plutôt que cinq pages autonomes
 * ---------------------------------------------------------------------------
 *
 * Les cinq documents partagent une grille : un titre d'affiche, un encadré
 * d'ouverture, des articles numérotés, des tableaux « Information / Valeur »
 * dont la colonne de droite est presque toujours un emplacement à compléter.
 * Recopier les classes utilitaires cinq fois aurait produit cinq documents qui
 * se ressemblent AUJOURD'HUI et divergent au premier ajustement. Ces pièces
 * sont des composants SERVEUR : aucune n'expédie une ligne de JavaScript.
 *
 * ---------------------------------------------------------------------------
 * La typographie (décision D11)
 * ---------------------------------------------------------------------------
 *
 * Les brouillons juridiques sont écrits avec des espaces ORDINAIRES, comme les
 * fiches produits. La prose est donc reprise telle quelle dans des chaînes de
 * caractères, et `typographier()` pose les insécables au rendu — devant les
 * deux-points, dans « 300 000 euros », dans « 10 % ». Aucun caractère invisible
 * n'est saisi à la main, et la règle qui vaut pour le catalogue vaut pour les
 * mentions légales : c'était l'objet même de D11.
 *
 * Corollaire pratique : là où un paragraphe mêle du texte et un composant
 * (`<AComplete>`, un lien), il est découpé en morceaux et chaque morceau de
 * texte passe par `<T>`. Une phrase découpée reste une phrase ; une phrase où
 * l'on aurait posé l'insécable à la main serait une dette invisible.
 */

/* -------------------------------------------------------------------------- */
/* Classes partagées                                                           */
/* -------------------------------------------------------------------------- */

export const CLASSE_ARTICLE = 'mt-12 scroll-mt-8';
export const CLASSE_TITRE_ARTICLE = 'text-titre font-semibold text-encre';
export const CLASSE_SOUS_TITRE =
  'mt-8 font-titre text-base font-semibold text-encre';
export const CLASSE_TEXTE =
  'mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce';
export const CLASSE_LISTE =
  'mt-4 max-w-lisible list-disc space-y-2 pl-5 text-sm leading-relaxed text-encre-douce';
export const CLASSE_LIEN =
  'underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre';

/* -------------------------------------------------------------------------- */
/* Texte typographié                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Un morceau de prose, passé par la règle typographique du projet.
 *
 * Volontairement nommé d'une lettre : il apparaît plusieurs centaines de fois
 * dans les cinq documents, et un nom long y aurait noyé le texte qu'il porte —
 * or c'est le texte qu'on relit dans un document légal, pas son emballage.
 */
export function T({ children }: { readonly children: string }) {
  return <>{typographier(children)}</>;
}

/* -------------------------------------------------------------------------- */
/* En-tête de document                                                         */
/* -------------------------------------------------------------------------- */

export function EnTeteLegale({
  surtitre,
  titre,
  chapeau,
  identifiant,
}: {
  readonly surtitre: string;
  readonly titre: string;
  readonly chapeau: string;
  readonly identifiant?: string;
}) {
  return (
    <section
      {...(identifiant === undefined ? {} : { id: identifiant })}
      className="scroll-mt-8 pt-12 pb-8 sm:pt-16 sm:pb-10"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
        <T>{surtitre}</T>
      </p>
      <h1 className="mt-4 text-affiche font-semibold text-encre">
        <T>{titre}</T>
      </h1>
      <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
        <T>{chapeau}</T>
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* L'encadré d'ouverture : gabarit, puis fiction                               */
/* -------------------------------------------------------------------------- */

/**
 * L'encadré que porte chaque document légal, en tête, avant tout article.
 *
 * Il dit DEUX choses distinctes, et c'est pourquoi il a deux paragraphes :
 *
 * 1. ce document est un GABARIT — les emplacements surlignés sont ceux que
 *    remplit le marchand, et sa relecture par un juriste reste la sienne ;
 * 2. la maison est FICTIVE et le site est une démonstration.
 *
 * Le rédacteur juridique a posé cet encadré sur les cinq documents plutôt que
 * sur les seules mentions légales, et sa raison est reprise ici parce qu'elle
 * décide de la mise en œuvre : une page de conditions générales se lit SEULE,
 * souvent atteinte directement depuis un moteur de recherche. Un avertissement
 * porté ailleurs ne l'atteindrait pas (00-NOTES-INTEGRATION.md, § 5.3).
 *
 * Il n'est pas masqué à l'impression : un gabarit imprimé sans son avertissement
 * est précisément le document qu'on ne veut pas voir circuler.
 */
export function EncadreGabarit({
  gabarit,
  fiction,
}: {
  readonly gabarit: ReactNode;
  readonly fiction: ReactNode;
}) {
  return (
    <aside
      aria-labelledby="etiquette-gabarit"
      className="overflow-hidden rounded-sm border-2 border-terre bg-papier"
    >
      <p
        id="etiquette-gabarit"
        className="bg-terre px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-creme uppercase sm:px-7"
      >
        Gabarit — démonstration, épicerie fictive
      </p>
      <div className="space-y-4 px-5 py-6 sm:px-7">
        <p className="max-w-lisible text-sm leading-relaxed text-encre">{gabarit}</p>
        <p className="max-w-lisible text-sm leading-relaxed text-encre">{fiction}</p>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Note propre à la démonstration                                              */
/* -------------------------------------------------------------------------- */

/**
 * Les « notes propres à la démonstration » des conditions générales.
 *
 * Le rédacteur les a semées article par article, à l'endroit exact où le
 * contrat décrit quelque chose que ce site ne fait pas. Elles sont rendues
 * comme une note distincte du corps du contrat — un lecteur doit voir d'un
 * coup d'œil qu'il quitte le texte contractuel.
 */
export function NoteDemonstration({ children }: { readonly children: ReactNode }) {
  return (
    <p className="mt-5 max-w-lisible border-l-2 border-ocre-clair bg-papier/60 py-3 pr-4 pl-4 text-xs leading-relaxed text-encre-douce">
      <span className="font-semibold text-ocre">Note propre à la démonstration.</span>{' '}
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Tableau « Information / Valeur »                                            */
/* -------------------------------------------------------------------------- */

export interface LigneGabarit {
  /** L'intitulé de gauche, tel que le brouillon l'écrit. */
  readonly intitule: string;
  /**
   * La cellule de droite, RENDUE PAR LA PAGE et non par ce composant.
   *
   * C'est un choix d'auditabilité, pas d'ergonomie. La garde
   * `verifier-aucune-donnee-inventee` compte les `<AComplete>` écrits dans le
   * fichier de chaque page : si ce tableau les fabriquait lui-même à partir
   * d'un libellé, une page de vingt-deux emplacements n'en montrerait qu'un
   * seul à la lecture du source, et remplir vingt-et-une lignes avec des
   * valeurs inventées ne ferait pas bouger le décompte. En les écrivant dans
   * la page, on obtient l'égalité qui compte : un emplacement affiché,
   * un `<AComplete>` dans le fichier.
   */
  readonly valeur: ReactNode;
}

/**
 * Le tableau à deux colonnes des documents d'identité (mentions légales,
 * responsable de traitement, adresse d'exercice des droits).
 *
 * Accessibilité : la légende dit ce que le tableau contient, les en-têtes de
 * colonne portent `scope="col"`, et l'intitulé de chaque ligne est un en-tête
 * de LIGNE — c'est lui qui qualifie l'emplacement à sa droite, et c'est lui
 * qu'un lecteur d'écran doit annoncer avant. Même patron que les tableaux du
 * barème d'expédition (`src/app/livraison/page.tsx`).
 */
export function TableauGabarit({
  legende,
  lignes,
}: {
  readonly legende: string;
  readonly lignes: readonly LigneGabarit[];
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          <T>{legende}</T>
        </caption>
        <thead>
          <tr className="border-b border-filet text-left">
            <th scope="col" className="pb-2 pr-6 font-semibold text-encre">
              Information
            </th>
            <th scope="col" className="pb-2 font-semibold text-encre">
              Valeur
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.intitule} className="border-b border-filet/60 align-baseline">
              <th
                scope="row"
                className="py-3 pr-6 text-left font-normal text-encre-douce"
              >
                <T>{ligne.intitule}</T>
              </th>
              <td className="py-3">{ligne.valeur}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table des matières interne                                                  */
/* -------------------------------------------------------------------------- */

export interface EntreeSommaire {
  readonly ancre: string;
  readonly libelle: string;
}

/**
 * Le sommaire des conditions générales.
 *
 * Une page de quatorze articles ne se parcourt pas en faisant défiler : elle se
 * consulte à l'article. Ce sont des ancres HTML ordinaires et non des `<Link>` —
 * on ne navigue pas, on se déplace dans la page.
 */
export function SommaireInterne({
  titre,
  identifiant,
  entrees,
}: {
  readonly titre: string;
  readonly identifiant: string;
  readonly entrees: readonly EntreeSommaire[];
}) {
  return (
    <nav
      aria-labelledby={identifiant}
      className="mt-12 border-y border-filet py-5 print:hidden"
    >
      <h2
        id={identifiant}
        className="font-titre text-sm font-semibold tracking-[0.08em] text-encre uppercase"
      >
        <T>{titre}</T>
      </h2>
      <ol className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {entrees.map((entree) => (
          <li key={entree.ancre}>
            <a href={`#${entree.ancre}`} className={`text-sm text-encre-douce ${CLASSE_LIEN}`}>
              <T>{entree.libelle}</T>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Lien interne de prose                                                       */
/* -------------------------------------------------------------------------- */

/** Un lien de prose vers une autre page du site, à la classe commune. */
export function LienLegal({
  vers,
  children,
}: {
  readonly vers: string;
  readonly children: ReactNode;
}) {
  return (
    <Link href={vers} className={CLASSE_LIEN}>
      {children}
    </Link>
  );
}
