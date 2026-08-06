import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { typographier } from '@/lib/typographie';

/**
 * LES CINQ MODÈLES DE COURRIELS, LUS À LA CONSTRUCTION.
 *
 * ---------------------------------------------------------------------------
 * `fs` dans un composant serveur, et pourquoi c'est le bon outil ici
 * ---------------------------------------------------------------------------
 *
 * Les cinq modèles sont des fichiers Markdown rédigés en C4
 * (`contenu/juridique-brouillons/modeles-courriels/`). Ils sont lus par le
 * SYSTÈME DE FICHIERS, au moment de la construction, dans un composant serveur
 * marqué `force-static` : ce qui part au navigateur est du HTML, la page ne
 * fait aucune requête à l'exécution, et `node:fs` n'entre dans aucun paquet
 * client.
 *
 * Les deux alternatives ont été pesées et écartées. Recopier les textes en
 * TypeScript aurait créé une seconde source pour des documents juridiques
 * — exactement ce que la décision D12 interdit pour les mentions de
 * rétractation, et pour la même raison : deux copies divergent. Les importer
 * par un chargeur Markdown aurait ajouté une dépendance de construction pour
 * lire cinq fichiers dont on ne veut ni la mise en forme riche, ni les liens,
 * ni les images.
 *
 * ---------------------------------------------------------------------------
 * LE RENDU : volontairement pauvre, et exact
 * ---------------------------------------------------------------------------
 *
 * Ces fichiers ne sont pas convertis en HTML riche. Ils sont découpés en lignes
 * et rendus selon six formes seulement — titre, sous-titre, citation, code,
 * séparateur, paragraphe. C'est suffisant pour les lire, et cela évite
 * d'introduire un convertisseur Markdown (donc un analyseur, donc une surface
 * d'injection) pour afficher cinq documents versionnés.
 *
 * Les JETONS `{{…}}` sont repérés et rendus VISUELLEMENT DISTINCTS. C'est le
 * point de l'écran : un modèle de courriel se lit en distinguant d'un coup
 * d'œil ce qui est écrit une fois pour toutes de ce que le système remplace à
 * l'envoi. Sans cette distinction, un marchand recopie le modèle en laissant
 * `{{PRENOM_CLIENT}}` dans le texte partant à ses clients.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Modèles de courriels',
  description:
    'Les cinq courriels qu’une boutique livrée expédie, en lecture. La ' +
    'démonstration Maison Vaubrune n’en envoie aucun.',
};

const DOSSIER = join(
  process.cwd(),
  'contenu',
  'juridique-brouillons',
  'modeles-courriels',
);

interface Modele {
  readonly fichier: string;
  readonly titre: string;
  readonly declencheur: string;
  readonly lignes: readonly string[];
}

/**
 * Les cinq modèles, dans l'ordre du parcours client plutôt que dans l'ordre
 * alphabétique des fichiers : on confirme, on expédie, on accuse réception
 * d'une rétractation, on explique le retour, on rembourse.
 */
const ORDRE = [
  'confirmation-commande.md',
  'expedition.md',
  'accuse-retractation.md',
  'instructions-retour.md',
  'confirmation-remboursement.md',
] as const;

/**
 * Le frontmatter YAML, réduit à ce dont l'écran a besoin.
 *
 * Aucun analyseur YAML : deux champs de premier niveau, `titre` et
 * `declencheur`, lus par découpage au premier deux-points. Ajouter une
 * dépendance pour cela reviendrait à installer une bibliothèque afin de couper
 * une chaîne en deux.
 */
function lireModele(fichier: string): Modele {
  const brut = readFileSync(join(DOSSIER, fichier), 'utf8');
  const lignes = brut.split(/\r?\n/);

  let titre = fichier;
  let declencheur = '';
  let debutCorps = 0;

  if (lignes[0] === '---') {
    const fin = lignes.indexOf('---', 1);
    debutCorps = fin === -1 ? 1 : fin + 1;

    for (const ligne of lignes.slice(1, debutCorps === 1 ? 1 : debutCorps - 1)) {
      const separateur = ligne.indexOf(':');

      if (separateur === -1) {
        continue;
      }

      const cle = ligne.slice(0, separateur).trim();
      const valeur = ligne.slice(separateur + 1).trim();

      if (cle === 'titre') {
        titre = valeur;
      } else if (cle === 'declencheur') {
        declencheur = valeur;
      }
    }
  }

  return { fichier, titre, declencheur, lignes: lignes.slice(debutCorps) };
}

/**
 * La liste des modèles réellement présents, dans l'ordre voulu.
 *
 * Le dossier est relu plutôt que la constante `ORDRE` suivie aveuglément : un
 * fichier renommé ou ajouté ne doit pas faire échouer la construction en
 * silence, ni disparaître de l'écran sans qu'on le sache. Les fichiers hors
 * liste sont rendus après les cinq, dans l'ordre alphabétique.
 */
const MODELES: readonly Modele[] = (() => {
  const presents = readdirSync(DOSSIER)
    .filter((nom) => nom.endsWith('.md'))
    .sort();

  const attendus = ORDRE.filter((nom) => presents.includes(nom));
  const autres = presents.filter((nom) => !(ORDRE as readonly string[]).includes(nom));

  return [...attendus, ...autres].map(lireModele);
})();

export default function PageModelesDeCourriels() {
  return (
    <>
      <section className="pt-12 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-ocre uppercase">
          Espace marchand
        </p>
        <h1 className="mt-4 text-affiche font-semibold text-encre">
          Modèles de courriels
        </h1>
        <p className="mt-5 max-w-lisible text-chapeau text-encre-douce">
          Les {MODELES.length} messages qu’une boutique livrée expédie au fil d’une
          commande, écrits et prêts à brancher.
        </p>

        <p className="mt-6 max-w-lisible rounded-sm border border-ocre-clair bg-papier px-4 py-3 text-sm leading-relaxed text-encre">
          <span className="font-semibold">
            La démonstration n’envoie aucun courriel&nbsp;;
          </span>{' '}
          voici le texte qu’une boutique livrée expédie. Sur ce site, ces messages
          sont affichés à l’écran, dans l’état où ils partiraient, au lieu d’être
          remis à un serveur de courrier.
        </p>

        <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
          Les passages sur fond clair, entre doubles accolades, sont les
          emplacements que le système remplit à l’envoi&nbsp;: référence, prénom,
          montants, dates. Tout le reste est écrit une fois pour toutes.
        </p>
      </section>

      <div className="mt-12 space-y-12 pb-4">
        {MODELES.map((modele) => (
          <article
            key={modele.fichier}
            aria-labelledby={`modele-${modele.fichier}`}
            className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
          >
            <h2
              id={`modele-${modele.fichier}`}
              className="text-titre font-semibold text-encre"
            >
              {typographier(modele.titre)}
            </h2>

            {modele.declencheur === '' ? null : (
              <p className="mt-2 text-sm text-encre-douce">
                <span className="font-semibold">Déclencheur&nbsp;:</span>{' '}
                {typographier(modele.declencheur)}
              </p>
            )}

            <div className="mt-6 max-w-lisible">{rendre(modele.lignes)}</div>
          </article>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Le rendu, six formes et pas une de plus                                     */
/* -------------------------------------------------------------------------- */

/**
 * DEUX expressions pour un même motif, et ce n'est pas une négligence.
 *
 * Celle du découpage porte le drapeau global — `split()` l'exige pour couper
 * partout — et elle est CAPTURANTE, ce qui fait conserver les séparateurs :
 * une seule passe suffit alors pour alterner texte ordinaire et jetons dans le
 * bon ordre.
 *
 * Celle du test ne porte PAS le drapeau global, et c'est le point : une
 * expression globale conserve son `lastIndex` d'un appel de `test()` au
 * suivant, si bien qu'un jeton sur deux serait déclaré non conforme. C'est le
 * piège le plus discret de `RegExp` en JavaScript, et il ne se voit qu'à
 * l'écran.
 */
const DECOUPAGE_JETON = /(\{\{[A-Z0-9_]+\}\})/g;
const EST_JETON = /^\{\{[A-Z0-9_]+\}\}$/;

/** Le texte d'une ligne, jetons mis en évidence. */
function avecJetons(texte: string): ReactNode {
  /* Le texte lu des cinq documents passe par `typographier()` (décision D11),
     et les JETONS n'y passent PAS : `{{TOTAL_ARTICLES}}` est un identifiant que
     le système remplace, pas une phrase française. Le découpage précède donc la
     transformation, ce qui garantit qu'aucune insécable ne se glisse dans un
     emplacement. Les documents eux-mêmes gardent leurs espaces ordinaires — ils
     sont écrits pour être relus en Markdown, et c'est l'affichage qui pose les
     insécables, jamais la source. */
  return texte.split(DECOUPAGE_JETON).map((morceau, rang) =>
    EST_JETON.test(morceau) ? (
      <code
        key={`${String(rang)}-${morceau}`}
        className="rounded-sm border border-ocre-clair bg-creme px-1 py-0.5 text-[0.8125rem] text-ocre"
      >
        {morceau}
      </code>
    ) : (
      typographier(morceau)
    ),
  );
}

function rendre(lignes: readonly string[]): ReactNode[] {
  const rendu: ReactNode[] = [];
  let rang = 0;

  for (const ligne of lignes) {
    const cle = `l${String(rang)}`;
    rang += 1;

    const nettoyee = ligne.trim();

    if (nettoyee === '') {
      continue;
    }

    if (nettoyee === '---') {
      rendu.push(<hr key={cle} className="my-6 border-filet" />);
      continue;
    }

    if (nettoyee.startsWith('### ')) {
      rendu.push(
        <h4 key={cle} className="mt-6 font-titre text-base font-semibold text-encre">
          {typographier(nettoyee.slice(4))}
        </h4>,
      );
      continue;
    }

    if (nettoyee.startsWith('## ')) {
      rendu.push(
        <h3 key={cle} className="mt-6 font-titre text-lg font-semibold text-encre">
          {typographier(nettoyee.slice(3))}
        </h3>,
      );
      continue;
    }

    if (nettoyee.startsWith('# ')) {
      /* Le titre de niveau 1 du fichier fait doublon avec le titre de l'article,
         déjà rendu depuis le frontmatter : on l'écarte plutôt que d'afficher la
         même phrase deux fois de suite. */
      continue;
    }

    if (nettoyee.startsWith('> ')) {
      rendu.push(
        <blockquote
          key={cle}
          className="mt-4 border-l-2 border-ocre-clair pl-4 text-sm leading-relaxed text-encre-douce"
        >
          {avecJetons(nettoyee.slice(2).replace(/\*\*/g, ''))}
        </blockquote>,
      );
      continue;
    }

    if (nettoyee.startsWith('`') && nettoyee.endsWith('`') && nettoyee.length > 2) {
      rendu.push(
        <p
          key={cle}
          className="mt-4 rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre"
        >
          {avecJetons(nettoyee.slice(1, -1))}
        </p>,
      );
      continue;
    }

    rendu.push(
      <p key={cle} className="mt-3 text-sm leading-relaxed text-encre">
        {avecJetons(nettoyee.replace(/\*\*/g, ''))}
      </p>,
    );
  }

  return rendu;
}
