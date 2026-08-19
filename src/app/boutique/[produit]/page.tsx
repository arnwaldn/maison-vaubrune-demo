import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import { Visuel } from '@/composants/illustrations/Visuel';
import { LigneEntree } from '@/composants/mise-en-page/BlocTitre';
import { DonneesStructurees } from '@/composants/mise-en-page/DonneesStructurees';
import { BoutonAjouter } from '@/composants/panier/BoutonAjouter';
import { MeublesTiroir } from '@/composants/panier/MeublesTiroir';
import {
  EtiquettesVitrine,
  PrixLePlusBasVitrine,
  PrixVarianteVitrine,
  ResumeVitrine,
  StockVarianteVitrine,
} from '@/composants/surcouche/FeuillesVitrine';
import { CATALOGUE } from '@/donnees/catalogue';
import { URL_SITE } from '@/donnees/site';
import { formaterEuros } from '@/lib/argent';
import { trouverProduitParSlug, trouverReferenceParSku } from '@/lib/catalogue';
import { donneesProduit, filArianeProduit } from '@/lib/donnees-structurees';
import {
  prixDepuisCatalogue,
  projeterCatalogue,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { typographier } from '@/lib/typographie';
import { ligneDeGarde, rangInventaire } from '@/lib/vitrine';
import {
  exigeChaineDuFroid,
  LIBELLE_FAMILLE,
  type Conservation,
  type NomVueVisuel,
  type Produit,
} from '@/lib/types';

/**
 * La fiche produit.
 *
 * Quinze pages engendrées à la construction (`generateStaticParams`), servies
 * en HTML pur : aucune requête à l'exécution, aucune donnée à charger, aucun
 * JavaScript de page. `dynamic = 'force-static'` le grave — si une future
 * modification introduisait un appel dynamique, la construction échouerait au
 * lieu de basculer silencieusement la page en rendu à la demande, ce qui est
 * la manière habituelle de perdre une note de rapidité sans s'en apercevoir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA FICHE NE PORTE PLUS DE MENTION DE RÉTRACTATION (décision client, C19)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle en portait une jusqu'en C18 : un encadré en pied de colonne, dont la
 * phrase venait de `regimeRetractation()`. Le client l'a fait retirer en
 * totalité, y compris sur les quatre produits périssables — motif de vente :
 * une fiche épurée, et rien qui ressemble à une réserve au moment où l'on
 * regarde un produit.
 *
 * CE QUI N'A PAS BOUGÉ, ET C'EST CE QUI REND LE RETRAIT DÉFENDABLE :
 * l'information précontractuelle reste portée par ses TROIS porteurs — les
 * conditions générales de vente, la page `/retractation` et son tableau des
 * quinze régimes, et le tunnel de commande, qui affiche la mention avant le
 * paiement, c'est-à-dire au moment où elle engage. `regimeRetractation()`
 * (décision D12) reste la source unique de ces trois-là ; elle n'a pas été
 * touchée, et c'est elle qui permettrait de réafficher une mention par fiche
 * en une ligne, le jour où le besoin juridique d'un client réel l'exige.
 *
 * Ce n'est donc pas un reliquat : l'architecture à source unique fait tenir
 * les deux versions du site, et le choix redevient un réglage.
 */

export const dynamic = 'force-static';

interface ProprietesPage {
  readonly params: Promise<{ readonly produit: string }>;
}

export function generateStaticParams(): { produit: string }[] {
  return CATALOGUE.map((produit) => ({ produit: produit.slug }));
}

export async function generateMetadata({ params }: ProprietesPage): Promise<Metadata> {
  const { produit: slug } = await params;
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    return {};
  }

  /* Le résumé du rédacteur, SUIVI du rappel de fiction. Les quinze fiches
     étaient les seules pages du site dont la description ne portait pas le
     mot « démonstration » : un extrait de résultat de recherche qui vante
     une huile d'olive sans dire qu'elle n'existe pas est exactement le
     malentendu que ce projet passe son temps à écarter. La phrase est
     ajoutée plutôt que substituée — le résumé reste ce qui décrit le
     produit, et il vient en premier. */
  const description = `${produit.resume} Fiche produit de Maison Vaubrune, boutique de démonstration.`;

  return {
    title: produit.nom,
    description,
    alternates: { canonical: `/boutique/${produit.slug}` },
    /* L'IMAGE DE PARTAGE (C15). Le site n'en avait aucune : un lien collé dans
       une conversation n'affichait qu'un rectangle vide. Elle est engendrée par
       le pipeline depuis le master relu — même chaîne, même déshabillage, même
       plafond de poids que le reste — et son adresse est ABSOLUE, parce qu'un
       aperçu se fabrique sur un serveur qui n'a pas le contexte de la page.
       Le texte alternatif est celui du visuel principal, jamais une phrase
       écrite pour l'occasion. */
    openGraph: {
      type: 'website',
      title: produit.nom,
      description,
      url: `${URL_SITE}/boutique/${produit.slug}`,
      images: [
        {
          url: `${URL_SITE}/produits/${produit.slug}/partage-1200x630.jpg`,
          width: 1200,
          height: 630,
          alt: produit.visuel?.principal.alt ?? produit.nom,
        },
      ],
    },
  };
}

export default async function PageProduit({ params }: ProprietesPage) {
  const { produit: slug } = await params;
  const produit = trouverProduitParSlug(CATALOGUE, slug);

  if (produit === undefined) {
    notFound();
  }

  const rang = rangInventaire(CATALOGUE, produit.slug);

  /* Les variantes, réduites à ce que la feuille du « à partir de » exige : un
     SKU et un prix. Rien d'autre ne traverse la frontière (décision D17). */
  const prix = produit.variantes.map((variante) => ({
    sku: variante.sku,
    prixCentimes: variante.prixCentimes,
  }));

  return (
    <article className="mx-auto max-w-page px-5 pb-4 sm:px-8">
      {/* Les DONNÉES DE BASE, jamais celles de la surcouche marchand : un robot
          d'indexation n'a pas de `localStorage`, et baliser un prix que seul le
          navigateur du visiteur connaît reviendrait à publier un chiffre que
          personne d'autre ne voit. Le raisonnement complet — et la liste des
          champs volontairement absents, à commencer par toute note d'avis — est
          en tête de `src/lib/donnees-structurees.ts`. */}
      <DonneesStructurees donnees={donneesProduit(produit, URL_SITE)} />
      <DonneesStructurees donnees={filArianeProduit(produit, URL_SITE)} />

      {/* LE FIL D'ARIANE RESTE SUR LE MARBRE ET LE DÉCLARE (C19) : on le
          PARCOURT, on ne le lit pas. Un panneau sous trois mots de navigation
          poserait une feuille pour rien, juste sous l'en-tête scellé. Mesuré au
          pixel comme le reste : 6,11 au pire contre un seuil de 4,50. */}
      <nav aria-label="Fil d’Ariane" className="pt-8 text-sm text-encre" data-sur-marbre>
        <Link
          href="/boutique"
          className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          Boutique
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/boutique#rayon-${produit.famille}`}
          className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
        >
          {LIBELLE_FAMILLE[produit.famille]}
        </Link>
      </nav>

      {/* LE TITRE EST PLEINE LARGEUR, ET IL VIENT EN PREMIER.
          C14 empilait les photographies avant lui : sur un téléphone, le nom du
          produit passait sous la ligne de flottaison — on ouvrait une fiche
          sans savoir laquelle. Il ouvre désormais la page, à toute la largeur,
          suivi de sa ligne de registre. */}
      {/* LE TITRE DE LA FICHE ENTRE, parce que la galerie porte la mesure :
          l'image principale vaut 152 700 points carrés contre 27 000 pour le
          nom du produit, et le relevé le confirme (160 ms avec l'entrée contre
          168 sans). Voir la règle et son tableau dans `globals.css`. */}
      <header className="pt-8 pb-8 sm:pt-10" data-titre-anime>
        {/* LES TROIS LIGNES DE LA FICHE COMPOSENT AVEC `LigneEntree` ET NON
            AVEC `BlocTitre` (C19-ter), pour une raison de STRUCTURE et non de
            goût : cette étiquette-ci n'est pas du texte, c'est une RANGÉE de
            deux éléments (la famille, le rang d'inventaire) tenue par un flex.
            `BlocTitre` pose son texte dans l'élément intérieur qui monte ; y
            déposer un flex ferait porter le `display: flex` par le parent et
            l'unique enfant serait cet élément intérieur — les deux morceaux se
            recolleraient en une seule ligne de texte, gouttière comprise. Le
            flex descend donc d'un cran, DANS la ligne qui monte. */}
        <LigneEntree
          rang={1}
          className="etiquette text-ocre"
          enfants={
            <span className="flex flex-wrap items-baseline gap-x-4">
              <span>{LIBELLE_FAMILLE[produit.famille]}</span>
          {/* LE RANG PASSE À L'ENCRE — règle des deux encres du marbre (voir
              `.panneau` dans `globals.css`). Il était en encre douce pour se
              détacher de l'ocre de la famille ; à treize pixels sur la matière,
              l'encre douce ne tient plus 4,50 contre la veine la plus sombre.
              La distinction reste, elle change de sens : la famille est
              l'accent chaud, le rang est la donnée. */}
              {rang === null ? null : (
                <span aria-hidden="true" className="text-encre tabular-nums">
                  N<sup>o</sup>&nbsp;{rang.rang} / {rang.total}
                </span>
              )}
            </span>
          }
        />
        <LigneEntree
          rang={2}
          balise="h1"
          className="mt-4 max-w-[22ch] text-affiche text-encre"
          enfants={produit.nom}
        />
        {/* Le résumé ferme la composition d'ouverture (étiquette, nom, résumé)
            et reste sur le marbre avec elle — même règle que le chapeau des
            cinq documents légaux, même déclaration. */}
        <LigneEntree
          rang={3}
          libre
          surMarbre
          className="mt-5 max-w-lisible text-chapeau text-encre"
          enfants={
            <ResumeVitrine slug={produit.slug} resume={produit.resume} className="block" />
          }
        />
      </header>

      {/* DEUX COLONNES, TROIS BLOCS, ET AUCUNE COLONNE VIDE.
          La revue de C14 a relevé cinq cent cinquante pixels de vide dans la
          colonne de droite de la fiche de bureau : le texte y était court et les
          photographies, à gauche, étaient hautes. La cause n'était pas la
          hauteur des images, c'était la RÉPARTITION — un bloc court en face d'un
          bloc long.

          La colonne de droite porte donc maintenant tout ce qui sert à acheter
          (prix, formats, ajout au panier) et elle COLLE ; la colonne de gauche
          porte la galerie PUIS la prose, ce qui la rend naturellement longue.
          Le panneau ne quitte jamais l'écran, et le vide n'existe plus parce que
          rien ne s'arrête avant la fin.

          L'ordre du DOM est celui de la lecture sur un téléphone — galerie,
          bloc d'achat, prose —, et le placement explicite (`col-start`,
          `row-start`) le réorganise sur deux colonnes sans dupliquer une seule
          balise. */}
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <GalerieDeFiche produit={produit} />
        </div>

        {/* LA COLONNE D'ACHAT DEVIENT UN PANNEAU (C19). Le fond de la page est
            une matière de marbre depuis cette tranche, et cette colonne porte
            exactement ce que la consigne veut voir reposer sur une surface :
            un tableau de formats, des références de registre, une origine, une
            note de bas de bloc. Le panneau les tient ensemble et les décolle du
            veinage. Il est verre (#F8F4EA), donc plus CLAIR que la page — la
            feuille posée sur la table, pas l'encart posé sur la feuille (qui,
            lui, reste `bg-papier`, comme le bloc d'ajout au panier qu'elle
            contient). */}
        <aside
          aria-label="Achat"
          className="panneau min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-28 lg:self-start"
        >
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2 font-titre text-titre text-encre tabular-nums">
            <span>
              {produit.variantes.length > 1 ? 'à partir de ' : null}
              <PrixLePlusBasVitrine slug={produit.slug} variantes={prix} />
            </span>
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <EtiquettesVitrine
              slug={produit.slug}
              frais={exigeChaineDuFroid(produit.conservation)}
              miseEnAvant={produit.miseEnAvant}
            />
          </p>
          <p className="registre mt-4 text-encre-douce">Origine&nbsp;: {produit.origine}</p>

          <section aria-labelledby="titre-formats" className="mt-8">
            <h2 id="titre-formats" className="etiquette text-encre">
              Formats
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Formats disponibles, prix toutes taxes comprises, poids expédié et
                  référence
                </caption>
                <thead>
                  <tr className="border-b border-filet text-left">
                    <th scope="col" className="etiquette pb-2 text-encre-douce">
                      Format
                    </th>
                    <th scope="col" className="etiquette pb-2 text-right text-encre-douce">
                      Prix
                    </th>
                    <th scope="col" className="etiquette pb-2 text-right text-encre-douce">
                      Poids
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produit.variantes.map((variante) => (
                    <tr key={variante.sku} className="border-b border-filet/60">
                      <td className="py-3 text-encre">
                        {variante.format}
                        <span className="registre block text-encre-douce">{variante.sku}</span>
                      </td>
                      <td className="py-3 text-right font-semibold text-encre tabular-nums">
                        <PrixVarianteVitrine
                          slug={produit.slug}
                          sku={variante.sku}
                          prixCentimes={variante.prixCentimes}
                        />
                      </td>
                      <td className="py-3 text-right text-encre-douce tabular-nums">
                        {variante.poidsGrammes}&nbsp;g
                        <span className="registre block">
                          <StockVarianteVitrine
                            slug={produit.slug}
                            sku={variante.sku}
                            stock={variante.stock}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-encre-douce">
              Le poids indiqué est celui du colis, emballage compris&nbsp;: c’est lui
              qui servira au calcul des frais de port.
            </p>
          </section>

          {/* L'UNIQUE ÎLOT CLIENT DE CETTE ROUTE. Il ne reçoit que la
              PROJECTION du produit (voir `catalogue-panier.ts`) : ses
              variantes, et pour un coffret personnalisable les articles de sa
              liste blanche. Le catalogue complet reste côté serveur.

              `data-bloc-achat` LE DÉCLARE, et c'est la feuille d'impression qui
              s'en sert : le PDF de C14 sortait, page 3, un sélecteur de format,
              un champ de quantité et un bouton. Un bouton imprimé est un bouton
              mort ; sur une fiche produit, c'est même un bon de commande
              apparent. */}
          <div data-bloc-achat className="mt-8">
            {/* `meubles` PASSE DES NŒUDS DÉJÀ RENDUS PAR LE SERVEUR, et c'est
                ce qui permet à `<Visuel>` — composant serveur — d'entrer dans un
                tiroir client sans le rendre client. Mesuré : +501 octets gzip
                sur cette fiche, ZÉRO octet de premier chargement. La solution
                symétrique (passer des données, refaire la carte côté client)
                coûtait moins en charge RSC et 400 à 700 octets de JavaScript —
                et elle aurait fait naître une SECONDE fabrique de chemins
                d'image, la deuxième vérité que C14 et C15 ont payée trois fois.

                `prix` est un `Record<SKU, prix>` et non la projection complète :
                208 octets gzip contre 1 268 pour le même chiffre affiché, et
                c'est littéralement le corollaire écrit de D17. */}
            <BoutonAjouter
              articles={projeterCatalogue([produit])}
              pieces={piecesEligiblesProjetees(produit)}
              meubles={<MeublesTiroir slug={produit.slug} />}
              prix={prixDepuisCatalogue(projeterCatalogue(CATALOGUE))}
            />
          </div>
        </aside>

        {/* LES BLOCS SOUS LA GALERIE SE RÉVÈLENT ; LE BLOC D'ACHAT, JAMAIS.
            La colonne de droite porte le prix, les formats et le bouton — ce
            qu'on vient chercher. On ne fait pas attendre un achat derrière un
            fondu, et le panneau COLLE : il reste dans la fenêtre pendant tout
            le défilement, si bien qu'une révélation au défilement n'aurait de
            toute façon aucun moment pour se déclencher.

            La galerie non plus : elle est le plus grand affichage de contenu de
            la page (mesuré en C14), et la première chose que la fiche doit
            montrer. Restent la prose, la composition, les ingrédients, la
            conservation et l'encadré de rétractation — cinq blocs qui se lisent
            en descendant, c'est-à-dire exactement ce qu'une révélation au
            défilement accompagne. */}
        {/* LA COLONNE DE PROSE DEVIENT UN PANNEAU (C19), et c'est le cas le plus
            évident de la tranche : cinq blocs de lecture suivie, dont des
            paragraphes de dix lignes. Un œil qui suit une ligne n'a pas à
            traverser une veine.

            Le filet du haut CÈDE la place à la bordure du panneau : garder les
            deux aurait fait deux traits parallèles à trois pixels d'écart. Le
            remplissage du panneau remplace le `pt-10`, qui n'avait d'autre rôle
            que d'écarter la prose de ce filet. */}
        <div className="panneau min-w-0 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="titre-description" data-revelation data-revelation-retard={1}>
            <h2 id="titre-description" className="sr-only">
              Description
            </h2>
            {produit.description.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre first:mt-0"
              >
                {paragraphe}
              </p>
            ))}
          </section>

          {produit.composition === undefined ? null : (
            <CompositionCoffret produit={produit} composition={produit.composition} />
          )}

          {produit.piecesEligibles === undefined ? null : (
            <PiecesEligibles piecesEligibles={produit.piecesEligibles} />
          )}

          <section aria-labelledby="titre-ingredients" className="mt-12" data-revelation data-revelation-retard={2}>
            <h2 id="titre-ingredients" className="text-titre text-encre">
              Ingrédients
            </h2>
            {produit.ingredients.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre-douce"
              >
                {paragraphe}
              </p>
            ))}
            <p className="mt-4 max-w-lisible leading-relaxed text-encre">
              <span className="font-semibold">Allergènes&nbsp;:</span>{' '}
              {produit.allergenes.join(', ')}.
            </p>
          </section>

          <section aria-labelledby="titre-conservation" className="mt-12" data-revelation data-revelation-retard={3}>
            <h2 id="titre-conservation" className="text-titre text-encre">
              Conservation
            </h2>
            <p className="mt-4 max-w-lisible leading-relaxed text-encre">
              {phraseConservation(produit.conservation)}
            </p>
            {produit.conseilConservation.map((paragraphe) => (
              <p
                key={paragraphe.slice(0, 40)}
                className="mt-4 max-w-lisible leading-relaxed text-encre-douce"
              >
                {paragraphe}
              </p>
            ))}
          </section>

        </div>
      </div>
    </article>
  );
}

/**
 * LA GALERIE DE LA FICHE — photographies si le produit en a, silhouette sinon.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UN SEUL ENDROIT DÉCIDE, SUR LA SEULE QUESTION QUI VAILLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `produit.visuel` existe-t-il ? C'est ce qui a permis à C14 de brancher une
 * fiche sans en toucher quatorze, et à C15 de brancher les quatorze en ajoutant
 * des DONNÉES, pas du code. Un produit ajouté demain sans jeu de visuels
 * s'affichera à la silhouette et ne cassera rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE CADRE, ET CE QU'IL RÉPARE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fond des photographies (#ebe0cc mesuré) n'est pas celui de la page
 * (#f2ece1), et il ne doit pas l'être : le studio a son papier, la page a le
 * sien. Sans cadre, l'écart ressemble à une erreur de calibrage ; avec, il
 * devient la marge d'un passe-partout. Chaque vue est donc une `figure` qui
 * porte un fond de verre, un filet et un CARTOUCHE DE REGISTRE — le rang
 * d'inventaire et la référence sous la vue principale, le poids et la garde
 * sous la vue d'ambiance. Rien n'y est écrit qui ne soit calculé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  `sizes` DIT LA PLACE RÉELLE, ET LA VUE D'AMBIANCE RESTE PARESSEUSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux vues côte à côte au-delà de `sm`, empilées en dessous : c'est ce que les
 * trois bornes de `sizes` disent, et elles sont celles de la grille. Un `sizes`
 * faux ne casse rien de visible — il fait seulement télécharger la mauvaise
 * largeur, en silence, à chaque visite.
 *
 * La vue d'ambiance n'est pas prioritaire : sur une fiche, le plus grand
 * affichage de contenu est désormais une image, et la faire courir avec la
 * principale lui disputerait la bande passante. C'est le poste que la décision
 * D36 annonçait comme « le plus volatil d'une note de rapidité ».
 */
function GalerieDeFiche({ produit }: { readonly produit: Produit }) {
  /* Sans photographies, la fiche rend ce qu'elle rendait avant C14 : la
     silhouette, une seule fois. */
  if (produit.visuel === undefined) {
    return (
      <Silhouette
        forme={produit.illustration.forme}
        teinte={produit.illustration.teinte}
        hauteur={168}
        className="h-24 w-auto sm:h-40"
      />
    );
  }

  const garde = ligneDeGarde(produit);
  const rang = rangInventaire(CATALOGUE, produit.slug);
  const vues: readonly { readonly nom: NomVueVisuel; readonly cartouche: readonly string[] }[] = [
    {
      nom: 'principal',
      cartouche:
        rang === null
          ? [produit.variantes[0].sku]
          : [`n° ${rang.rang} / ${rang.total}`, produit.variantes[0].sku],
    },
    { nom: 'ambiance', cartouche: garde },
  ];

  /* La place réellement donnée à chaque image : la moitié de la colonne de
     gauche au-delà de `sm`, la pleine largeur de la fenêtre en dessous. */
  const sizes = '(min-width: 64rem) 24rem, (min-width: 40rem) 40vw, 88vw';

  /* `items-start` — CHAQUE FIGURE PREND LA HAUTEUR DE SON IMAGE.
     Une grille étire ses éléments par défaut (`align-items: stretch`), ce qui
     donne aux deux cadres la hauteur du plus grand. Sur les treize produits à
     série B, les deux vues partagent la boîte du manifeste : même rapport, même
     hauteur, l'étirement ne se voyait pas. Sur les DEUX COFFRETS, la vue
     principale est un 4:3 et la seconde le zénithal 4:5 : le cadre de la
     première gagnait deux cents pixels de passe-partout vide sous son image et
     sous son cartouche — ce qui, dans une page finie, se lit comme une image qui
     n'a pas chargé. La cause n'était pas la galerie, c'était l'étirement. */
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-6">
      {vues.map((vue) => {
        const donnees = produit.visuel?.[vue.nom];

        if (donnees === undefined) {
          return null;
        }

        return (
          <figure
            key={vue.nom}
            /* Le cadre de la vue d'ambiance sort du papier AVEC elle : sans
               cette classe, l'impression garderait un passe-partout vide et son
               cartouche sous une image qui n'est plus là. */
            className={`cadre-photo rounded-sm${vue.nom === 'ambiance' ? ' print:hidden' : ''}`}
          >
            <Visuel
              slug={produit.slug}
              vue={vue.nom}
              donnees={donnees}
              illustration={produit.illustration}
              sizes={sizes}
              prioritaire={vue.nom === 'principal'}
              /* À L'IMPRESSION, UNE SEULE SILHOUETTE. Les deux vues partagent
                 le même dessin de repli — celui du produit —, si bien que les
                 rétablir toutes les deux imprimait deux fois la même bouteille.
                 La vue principale la porte, la vue d'ambiance sort du papier. */
              impression={vue.nom === 'principal' ? 'silhouette' : 'masquer'}
            />
            <figcaption className="etiquette tabular-nums">
              {vue.cartouche.map((segment, position) => (
                <span key={segment}>
                  {position === 0 ? null : (
                    <span aria-hidden="true" className="px-2 text-filet-fort">
                      ·
                    </span>
                  )}
                  {segment}
                </span>
              ))}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/**
 * Les articles que ce produit autorise à choisir, s'il est personnalisable.
 *
 * Vide pour les quatorze autres références : `BoutonAjouter` n'affiche alors
 * aucune case à cocher, et rien de la liste blanche ne traverse la frontière
 * client. Les pièces sont projetées depuis le catalogue complet — c'est le
 * même aplatissement que partout ailleurs, donc les mêmes libellés et les
 * mêmes allergènes qu'au panier.
 */
function piecesEligiblesProjetees(produit: Produit): readonly ArticlePanier[] {
  if (produit.piecesEligibles === undefined) {
    return [];
  }

  const eligibles = new Set(produit.piecesEligibles);

  return projeterCatalogue(CATALOGUE).filter((article) => eligibles.has(article.sku));
}

/**
 * Le régime de conservation, dit en français.
 *
 * L'union discriminée paie ici : chaque forme a sa phrase, le compilateur
 * refuse d'en oublier une, et personne ne peut lire une DLC sur une conserve
 * stérilisée.
 */
function phraseConservation(conservation: Conservation): string {
  switch (conservation.type) {
    case 'stable':
      return typographier(
        conservation.note === undefined
          ? `Produit stable, à conserver à température ambiante. Date de durabilité minimale : ${String(conservation.ddmMois)} mois.`
          : `Produit stable, à conserver à température ambiante. Date de durabilité minimale : ${String(conservation.ddmMois)} mois (${conservation.note}).`,
      );
    case 'perissable':
      return typographier(
        `Produit périssable, expédié sous emballage isotherme et à maintenir au froid sans rupture de la chaîne du froid. Date limite de consommation : ${String(conservation.dlcJours)} jours.`,
      );
    case 'scelle-hygiene':
      return typographier(
        'Produit scellé sous atmosphère protectrice, à conserver à température ambiante.',
      );
  }
}

function CompositionCoffret({
  produit,
  composition,
}: {
  readonly produit: Produit;
  readonly composition: NonNullable<Produit['composition']>;
}) {
  const sommeDesPieces = composition.reduce(
    (total, piece) => total + piece.prixCentimes,
    0,
  );
  const prixDuCoffret = produit.variantes[0].prixCentimes;
  const ecart = prixDuCoffret - sommeDesPieces;

  return (
    <section aria-labelledby="titre-composition" className="mt-12" data-revelation>
      <h2 id="titre-composition" className="text-titre text-encre">
        Ce que contient le coffret
      </h2>

      <ul className="mt-6 max-w-lisible">
        {composition.map((piece) => {
          const reference = trouverReferenceParSku(CATALOGUE, piece.sku);
          return (
            <li
              key={piece.sku}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-filet py-3 text-sm"
            >
              <span className="text-encre">
                {reference === undefined ? (
                  piece.nom
                ) : (
                  <Link
                    href={`/boutique/${reference.produit.slug}`}
                    className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                  >
                    {piece.nom}
                  </Link>
                )}
              </span>
              <span className="text-encre-douce">{formaterEuros(piece.prixCentimes)}</span>
            </li>
          );
        })}
      </ul>

      {/* Récapitulatif DÉRIVÉ : la somme et l'écart se calculent à partir des
          pièces et du prix saisi du coffret. La justification de cet écart est
          déjà dite plus haut, dans les mots du marchand ; on ne la répète pas,
          on donne les trois nombres. */}
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-filet pt-4 text-sm">
        <div>
          <dt className="text-encre-douce">Somme des pièces</dt>
          <dd className="font-semibold text-encre">{formaterEuros(sommeDesPieces)}</dd>
        </div>
        <div>
          <dt className="text-encre-douce">Prix du coffret</dt>
          <dd className="font-semibold text-encre">{formaterEuros(prixDuCoffret)}</dd>
        </div>
        <div>
          <dt className="text-encre-douce">Écart assumé</dt>
          <dd className="font-semibold text-terre">+{formaterEuros(ecart)}</dd>
        </div>
      </dl>

      <p className="mt-4 max-w-lisible text-sm leading-relaxed text-encre-douce">
        L’écart couvre l’écrin, le calage, l’assemblage et le mot manuscrit. Il est
        écrit plutôt que laissé à deviner&nbsp;: les pièces se commandent aussi à
        l’unité, ce sont exactement les mêmes.
      </p>
    </section>
  );
}

function PiecesEligibles({
  piecesEligibles,
}: {
  readonly piecesEligibles: NonNullable<Produit['piecesEligibles']>;
}) {
  return (
    <section aria-labelledby="titre-pieces" className="mt-12" data-revelation>
      <h2 id="titre-pieces" className="text-titre text-encre">
        Les pièces au choix
      </h2>

      <p className="mt-4 max-w-lisible leading-relaxed text-encre-douce">
        {piecesEligibles.length} références composent la liste, toutes stables et en
        petit format. Le prix du coffret est forfaitaire&nbsp;: il ne dépend pas des
        pièces retenues.
      </p>

      <ul className="mt-6 max-w-lisible">
        {piecesEligibles.map((sku) => {
          const reference = trouverReferenceParSku(CATALOGUE, sku);

          if (reference === undefined) {
            return null;
          }

          return (
            <li
              key={sku}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-filet py-3 text-sm"
            >
              <span className="text-encre">
                <Link
                  href={`/boutique/${reference.produit.slug}`}
                  className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
                >
                  {reference.produit.nom}
                </Link>
                <span className="text-encre-douce">, {reference.variante.format}</span>
              </span>
              <span className="text-encre-douce">
                {formaterEuros(reference.variante.prixCentimes)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre">
        Trois informations de ce coffret ne peuvent pas être affichées ici, parce
        qu’elles n’existent qu’une fois la composition connue&nbsp;: les allergènes
        sont l’union de ceux des pièces choisies, le poids expédié en est la somme
        augmentée de l’écrin, et la date de durabilité minimale est la plus courte
        d’entre elles. Les trois se calculent à la commande et figurent sur le
        récapitulatif, avant paiement.
      </p>
    </section>
  );
}
