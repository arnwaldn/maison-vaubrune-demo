import type { Metadata } from 'next';

import { BasculeAffichage } from '@/composants/boutique/BasculeAffichage';
import { CarteProduit } from '@/composants/boutique/CarteProduit';
import { BlocTitre } from '@/composants/mise-en-page/BlocTitre';
import { HerosIllustre } from '@/composants/mise-en-page/HerosIllustre';
import { BornesPrixVitrine } from '@/composants/surcouche/FeuillesVitrine';
import { CATALOGUE } from '@/donnees/catalogue';
import { HEROS_BOUTIQUE } from '@/donnees/visuels-editoriaux';
import { styleDeFamille } from '@/lib/vitrine';
import { FAMILLES, LIBELLE_FAMILLE } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Boutique',
  description:
    'Les quinze références de la boutique de démonstration Maison Vaubrune, ' +
    'rangées par famille : huiles et vinaigres, conserves salées, miels et ' +
    'confitures, épicerie sèche, infusions, frais et coffrets.',
  alternates: { canonical: '/boutique' },
};

/**
 * LE RAYON, RANGÉ PAR FAMILLE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI TOUJOURS PAS DE FILTRE, ET CE QUE C15 AJOUTE À LA PLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un filtre par famille est un composant client : de l'état, un gestionnaire
 * d'événement, du JavaScript envoyé à tous les visiteurs — pour quinze produits
 * qui tiennent sur un écran et demi. La même fonction est rendue par sept
 * sections ancrées et un sommaire de liens ordinaires : cela marche sans
 * JavaScript, cela s'indexe, cela se partage (« /boutique#rayon-coffrets » est
 * une adresse), et cela ne coûte pas un octet de paquet. Le jour où le
 * catalogue comptera deux cents références, le filtre se justifiera.
 *
 * Ce que C15 ajoute est d'un autre ordre : une BASCULE DE FORME (grille ou
 * liste), qui ne change pas ce qui est montré mais comment. Elle coûte un îlot
 * de quelques centaines d'octets et n'emporte aucune donnée du catalogue avec
 * elle — les quinze vignettes restent du HTML de serveur, la bascule ne fait
 * que poser un attribut que la feuille de style lit.
 *
 * Le regroupement est calculé une fois au chargement du module, donc à la
 * construction : la page est entièrement statique.
 */
const RAYONS = FAMILLES.map((famille) => ({
  famille,
  ancre: `rayon-${famille}`,
  produits: CATALOGUE.filter((produit) => produit.famille === famille),
})).filter((rayon) => rayon.produits.length > 0);

/**
 * Tous les formats du catalogue, réduits à ce dont la ligne des bornes a
 * besoin. Le calcul lui-même a quitté cette page en C6 : les bornes doivent
 * suivre la surcouche marchand comme les cartes, sans quoi le pied du rayon
 * contredirait les prix affichés juste au-dessus.
 */
const FORMATS = CATALOGUE.flatMap((produit) =>
  produit.variantes.map((variante) => ({
    slug: produit.slug,
    sku: variante.sku,
    prixCentimes: variante.prixCentimes,
  })),
);

const NOMBRE_FORMATS = FORMATS.length;

export default function PageBoutique() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      {/* LE VIDE À DROITE DU TITRE EST COMBLÉ PAR LA MATIÈRE (retour client
          n° 14 : « une belle photo animée » comme le filet d’huile). La vidéo
          du miel qui coule suit le patron EXACT du héros de l’accueil —
          affiche = l’image déjà là, `preload="none"`, chargement par
          observateur, coupure sous mouvement réduit, AV1 puis H.264. */}
      <HerosIllustre heros={HEROS_BOUTIQUE}>
        {/* LA RÈGLE DU FOND DE C19, ICI COMME SUR LES CINQ DOCUMENTS LÉGAUX :
            l'étiquette, le titre et le chapeau sont la COMPOSITION d'ouverture
            et restent sur le marbre (le chapeau le déclare) ; la prose qui suit
            se lit, donc elle repose sur un panneau de verre. Depuis C19-ter,
            c'est aussi ce trio-là qui ENTRE — voir `BlocTitre`. */}
        <BlocTitre
          surtitre="Le rayon"
          titre="Boutique"
          chapeau={
            <>
              {CATALOGUE.length} références rangées en {RAYONS.length} familles. Les
              prix sont indiqués toutes taxes comprises, hors frais de port.
            </>
          }
          note={
            <>
              Le panier, la commande et le paiement de démonstration vont jusqu’au
              bout du parcours. Rappel utile&nbsp;: la maison est fictive, aucune
              commande ne serait expédiée et aucun montant n’est encaissé.
            </>
          }
        />

        {/* LA BASCULE D'AFFICHAGE QUITTE LE BANDEAU COLLANT (retour client 15).
            Elle y coûtait 242 points de largeur — mesurés —, et c'est
            exactement ce qui rendait la ligne unique impossible : les sept
            liens de famille en valent 975 à eux seuls, le libellé « Familles »
            74, et le conteneur 1 216 sur un bureau de 1 280. Sept liens plus un
            libellé tiennent sur une ligne ; les mêmes plus une bascule n'y
            tiennent à aucune largeur d'écran de bureau.

            Ce n'est pas un rangement de commodité : une PRÉFÉRENCE D'AFFICHAGE
            n'est pas une navigation par famille. Le bandeau retrouve un seul
            objet, donc une seule ligne ; la bascule retrouve sa place dans la
            composition d'ouverture, là où l'on décide comment on va lire le
            rayon — avant de le parcourir, et non pendant. */}
        {/* ALIGNÉE À GAUCHE, sur le bord du panneau qui la précède. Le premier
            jet la poussait à droite de la colonne de texte : elle y flottait au
            milieu de la page, sans rien à quoi s'accrocher — la colonne de
            texte s'arrête sous l'image, pas au bord de la page. Un bloc
            d'interface se pose sur un bord existant, jamais dans un vide. */}
        <div className="mt-8 flex justify-start">
          <BasculeAffichage />
        </div>
      </HerosIllustre>

      {/*
        LA BARRE DE FAMILLES COLLE (à partir de `md`, voir plus bas), et
        l'indicateur est une TRANSFORMATION : un filet posé sous chaque nom, à
        l'échelle horizontale nulle au repos, qui se déplie depuis la gauche au
        survol et au focus. Une échelle ne pousse rien — la ligne existe déjà,
        elle change de largeur. C'est le seul indicateur qu'un rayon sans
        JavaScript puisse offrir honnêtement : sans script, personne ne sait
        quelle section on traverse, et un indicateur qui prétendrait le savoir
        mentirait.

        SON APLAT PASSE DE `bg-coquille` À `bg-verre` EN C19. Elle colle, donc
        elle glisse par-dessus le marbre : un aplat à la couleur du FOND
        HISTORIQUE de la page se lisait comme un raccord raté dès l'instant où
        la page a cessé d'être un aplat. Le verre est la surface qui se pose sur
        la matière — c'est déjà ce que fait l'en-tête scellé depuis C13.

        LE BANDEAU EST COMPACTÉ (retour client n° 15 — « trop haut, il cache les
        cartes et gâche les transitions »).

        MESURE DE DÉPART, sur un bureau de 1 280 : 140,5 points de haut, dont
        42,6 pour les seuls liens — trois des sept libellés se repliaient sur
        DEUX lignes, parce que sept colonnes égales valent 157 points et que
        « Huiles et vinaigres (3) » en demande 190. Le bandeau colle sous un
        en-tête de 96 : à eux deux, ils recouvraient 236 points, soit plus d'un
        quart d'une fenêtre de portable.

        TROIS GESTES, ET CHACUN A SON CHIFFRE :
        1. la bascule d'affichage SORT du bandeau (voir plus haut) — 242 points
           de largeur rendus, sans quoi la ligne unique est arithmétiquement
           impossible ;
        2. les liens passent de sept colonnes ÉGALES à un rang FLEX à sept
           éléments réparti par `justify-between` : chacun prend sa largeur
           naturelle, aucun ne se replie, et la somme des sept vaut 975 pour
           1 216 disponibles ;
        3. le remplissage vertical passe de `py-4` à `py-2`.

        POURQUOI `flex` ET NON UNE GRILLE À COLONNES `auto` : un rang flex ne se
        replie JAMAIS (`flex-wrap` vaut `nowrap` par défaut), si bien que le
        NOMBRE DE RANGS ne dépend plus de la largeur du texte. C'est
        exactement l'invariant que C19 avait dû arracher ici même en remplaçant
        un `flex-wrap` par une grille : le repli de la mono est PROPORTIONNEL,
        les largeurs changent à l'arrivée de la police, et une mise en page dont
        le nombre de rangs en dépend décale tout le rayon (0,0036 de décalage
        cumulé sur 0,0046 relevés). La grille réglait le symptôme en figeant le
        nombre de colonnes ; le rang flex le règle à la racine en figeant le
        nombre de RANGS à un.

        Mesuré dans les deux régimes de police pour que la ligne unique ne soit
        pas un pari : sept liens valent 975 points avec la mono réelle et 924
        avec le repli, le libellé 74 et 93. Pire assemblage possible :
        93 + 16 + 975 = 1 084 pour 1 216 disponibles, soit 132 points de marge.

        LE SEUIL EST `xl` (1 280) ET NON `lg` : à 1 024, le conteneur ne vaut
        que 960 et la ligne unique ne rentre pas. En deçà, la grille à colonnes
        FIXES de C19 est conservée telle quelle — deux colonnes sur un
        téléphone, quatre à partir de 40 rem —, et le seul gain y est le
        remplissage. Un seuil qui promettrait la ligne unique là où elle
        déborde vaudrait moins que pas de seuil du tout.

        LE COLLAGE PASSE DE `sm` À `md`, ET C'EST UN DÉFAUT DE COHÉRENCE CORRIGÉ
        AU PASSAGE. `--hauteur-entete` vaut ZÉRO en dessous de `md` (l'en-tête y
        défile avec la page, mesure de C13) et `scroll-padding-top` n'existe
        qu'à partir de `md` pour la même raison. Une barre qui collait dès `sm`
        s'arrêtait donc à `top: 0` sur une fenêtre où les ancres ne réservent
        aucune place au-dessus d'elles : entre 640 et 767 points, une section
        visée par une ancre atterrissait SOUS la barre. Le commentaire d'origine
        invoquait l'en-tête « qui ne colle pas non plus à cette largeur » —
        c'était le bon motif, appliqué au mauvais seuil.
      */}
      <nav
        aria-labelledby="titre-familles"
        className="z-30 border-y border-filet bg-verre py-2 md:sticky md:top-[var(--hauteur-entete)]"
      >
        <div className="flex flex-col gap-y-1 xl:flex-row xl:items-baseline xl:gap-x-4">
          <div className="min-w-0 xl:flex xl:flex-1 xl:items-baseline xl:gap-x-4">
            <h2 id="titre-familles" className="etiquette shrink-0 text-encre">
              Familles
            </h2>
            {/* UNE GRILLE, ET NON UN RANG QUI SE REPLIE — correctif de décalage
                cumulé (C19). Ces sept liens sont en MONO, dont le repli est
                PROPORTIONNEL : les proportions verticales coïncident, les
                LARGEURS non. Dans un `flex-wrap`, le nombre de rangs dépend donc
                de la largeur du texte, c'est-à-dire de la police réellement
                chargée — et il changeait à l'échange, décalant tout le rayon.
                C'était le plus gros des deux décalages de `/boutique`
                (0,0036 sur 0,0046 relevés sous bridage).

                C'est le défaut de C13 à un troisième endroit, et le correctif
                est le même : le nombre de rangs ne dépend plus que du nombre
                d'éléments. Deux colonnes sur un téléphone, quatre à partir de
                40 rem, sept au-delà de 64 — soit quatre, deux, puis un rang,
                quelle que soit la police qui finit par arriver. */}
            <ul className="mt-1 grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-4 xl:mt-0 xl:flex xl:flex-1 xl:justify-between xl:gap-x-4">
              {RAYONS.map((rayon) => (
                <li key={rayon.famille} style={styleDeFamille(rayon.famille)}>
                  <a href={`#${rayon.ancre}`} className="lien-famille registre text-encre-douce">
                    {LIBELLE_FAMILLE[rayon.famille]}{' '}
                    <span className="tabular-nums text-ocre">({rayon.produits.length})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/*
        UN SEUL `view-transition-name` POUR TOUT LE RAYON. Le navigateur
        photographie ce bloc avant et après le changement d'attribut et fond
        l'un dans l'autre. Le poser sur chaque grille aurait donné sept
        transitions indépendantes — donc sept animations concurrentes pour un
        seul geste, et un nom dupliqué fait échouer la transition entière.
      */}
      <div data-rayons className="[view-transition-name:rayon]">
        {RAYONS.map((rayon) => (
          <section
            key={rayon.famille}
            id={rayon.ancre}
            aria-labelledby={`titre-${rayon.ancre}`}
            className="scroll-mt-24 pt-12 pb-4 sm:pt-16"
            style={styleDeFamille(rayon.famille)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-filet pb-3">
              <h2 id={`titre-${rayon.ancre}`} className="text-titre text-encre">
                {LIBELLE_FAMILLE[rayon.famille]}
              </h2>
              <p className="etiquette text-encre tabular-nums">
                {rayon.produits.length}{' '}
                {rayon.produits.length > 1 ? 'références' : 'référence'}
              </p>
            </div>

            <ul className="rayon-grille mt-8 grid gap-6 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
              {/* LA CASCADE REPART À ZÉRO À CHAQUE FAMILLE, et c'est le bon
                  compte : un visiteur ne voit jamais quinze vignettes d'un
                  coup, il voit une section. Un rang continu de 1 à 15 aurait
                  donné à la dernière famille un retard qu'aucun œil ne relie à
                  la première — c'est-à-dire le plafond de six contourné par
                  l'endroit d'où l'on compte. */}
              {rayon.produits.map((produit, position) => (
                <CarteProduit
                  key={produit.slug}
                  produit={produit}
                  rangDansLaFamille={position}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-14 mb-4 registre text-encre" data-sur-marbre>
        {NOMBRE_FORMATS} formats vendables au total, de{' '}
        <BornesPrixVitrine articles={FORMATS} />.
      </p>
    </div>
  );
}
