import Link from 'next/link';

import { PastillePanier } from '@/composants/panier/PastillePanier';
import { marchand } from '@/donnees/marchand';

/**
 * L'EN-TÊTE QUI SE SCELLE.
 *
 * ---------------------------------------------------------------------------
 * Ce que la tranche C13 change, et ce qu'elle ne change pas
 * ---------------------------------------------------------------------------
 *
 * L'en-tête devient COLLANT et gagne deux états : au sommet, il ne se
 * distingue de la page par rien ; passé la sentinelle, il monte sur le verre
 * et laisse descendre son filet. Le raisonnement complet — pourquoi la
 * transparence littérale du plan directeur a été arbitrée, et ce qui la
 * remplace — est en tête du bloc « LA COQUILLE » de `globals.css`.
 *
 * ⚠ CETTE PREMIÈRE PHRASE A CESSÉ D'ÊTRE VRAIE EN C19, ET ELLE RESTE ÉCRITE
 * POUR QU'ON SACHE POURQUOI. « Au sommet, il ne se distingue de la page par
 * rien » supposait une page en APLAT de coquille : l'en-tête peignait la même
 * couleur, donc aucune frontière. Depuis que le fond est un MARBRE et que sa
 * matière est franche (écart veine-champ 37,9 points), l'aplat de coquille de
 * l'en-tête se lit comme une bande de papier posée en haut de la table — une
 * frontière nette, sans filet, qui n'était voulue par personne.
 *
 * ON NE LA CORRIGE PAS ICI, ET LE MOTIF EST QU'ELLE EST UN ARBITRAGE ÉCRIT.
 * C13 a REFUSÉ la transparence littérale sur trois mesures : le fil d'Ariane
 * d'une fiche traversait la navigation sur quarante-huit pixels, un fond
 * transparent n'a pas de contraste MESURABLE à tout instant du défilement, et
 * la coquille de l'en-tête EST la coquille du site. Les deux premières valent
 * toujours ; la troisième est morte. Rendre l'en-tête transparent au sommet
 * demanderait donc de rouvrir l'arbitrage complet ET de passer à l'encre le
 * petit texte qu'il porte (sous-titre et navigation en encre douce, 12,7 px) —
 * c'est une tranche, pas une ligne. L'écart est déclaré au rapport.
 *
 * Ce qui ne change pas : les trois destinations, l'ordre dans lequel elles sont
 * écrites, la place de la pastille en fin de liste, et le fait que cet en-tête
 * reste un COMPOSANT SERVEUR. Le seul îlot client qu'il contient est la
 * pastille du panier, comme depuis C4.
 *
 * ---------------------------------------------------------------------------
 * La sentinelle, et pourquoi elle est ici plutôt qu'ailleurs
 * ---------------------------------------------------------------------------
 *
 * Le scellement demande de savoir qu'on a défilé. Deux manières : écouter le
 * défilement, ou regarder un repère sortir de la fenêtre. La première coûte un
 * gestionnaire d'événement appelé des dizaines de fois par seconde sur le fil
 * principal ; la seconde coûte un observateur que le navigateur réveille deux
 * fois — quand le repère sort, quand il rentre. Le plan directeur tranche pour
 * la seconde, et c'est le SEUL JavaScript nouveau de cette tranche.
 *
 * Le repère est ce `<div>` vide : quatre-vingts pixels au sommet du document,
 * hors flux, invisible et inatteignable. Il est écrit ICI, à côté de l'en-tête
 * qu'il commande, plutôt que dans la mise en page racine où personne ne
 * saurait plus à quoi il sert. L'observateur, lui, vit dans
 * `src/lib/fournisseurs.tsx` — la frontière cliente unique de la mise en page
 * (décision D26) : un composant client de plus ici rouvrirait le second groupe
 * de morceaux que ce projet ferme depuis C6.
 *
 * ---------------------------------------------------------------------------
 * LA NAVIGATION NE SE REPLIE PAS TOUTE SEULE, et c'est un correctif mesuré
 * ---------------------------------------------------------------------------
 *
 * La première rédaction de cette tranche laissait la liste en `flex-wrap`,
 * comme depuis C1. Elle a coûté un décalage cumulé de 0,0089 — quatre fois le
 * plafond de la refonte —, et le mécanisme mérite d'être écrit parce qu'il se
 * reproduira ailleurs :
 *
 *   les libellés passent au registre mono capitales, avec un interlettrage de
 *   +0,14 em. Le repli de la mono est une Arial à métriques ajustées : ses
 *   proportions VERTICALES coïncident (c'est ce qu'`adjustFontFallback`
 *   règle), ses LARGEURS non — une proportionnelle n'a pas les chasses d'une
 *   monospace. Au moment de l'échange, la navigation cessait de tenir sur deux
 *   rangs et passait à un seul. Toute la liste sautait de trente-trois pixels.
 *
 * Le défaut n'est donc pas la police : c'est une mise en page dont le NOMBRE DE
 * RANGS dépend de la largeur du texte. La correction supprime cette dépendance
 * plutôt que de compenser ses effets :
 *
 *   - en dessous de `md`, la liste est une GRILLE à deux colonnes. Deux rangs,
 *     toujours, quelle que soit la police rendue ;
 *   - à partir de `md`, un rang unique en `flex-nowrap`, avec assez de marge
 *     pour que les deux polices y tiennent (mesuré : 582 px de contenu pour
 *     704 px disponibles à 768 px de large, et le repli est plus étroit que la
 *     mono, pas plus large).
 *
 * Le repli du bloc marque / navigation lui-même suit la même règle : colonne en
 * dessous de `md`, rang au-dessus, décidé par un point d'arrêt et non par une
 * largeur de texte.
 *
 * ---------------------------------------------------------------------------
 * Historique des trois liens (conservé : il dit pourquoi ils sont des `<Link>`)
 * ---------------------------------------------------------------------------
 *
 * Les pages qui n'existaient pas encore étaient des ancres HTML ordinaires et
 * non des `<Link>`. La raison n'était pas typographique mais mesurable —
 * `<Link>` précharge une route dès qu'elle entre dans la fenêtre, soit autant
 * de requêtes qui auraient répondu 404 sur chaque page vue. La bascule s'est
 * faite route par route : « Boutique » en C2, « Livraison » en C3, « Suivi de
 * commande » en C6, quand `/suivi` a existé. Les trois sont des `<Link>` depuis,
 * et l'adresse du suivi a été raccourcie de `/suivi-de-commande` à `/suivi` en
 * même temps qu'elle devenait réelle : une adresse courte se dicte au téléphone
 * comme la référence qu'on y tape.
 */
const LIENS_NAVIGATION = [
  { libelle: 'Boutique', adresse: '/boutique' },
  { libelle: 'Livraison', adresse: '/livraison' },
  { libelle: 'Suivi de commande', adresse: '/suivi' },
] as const;

const CLASSE_LIEN =
  'lien-nav etiquette inline-block text-encre-douce no-underline hover:text-encre';

export function EnTete() {
  return (
    <>
      <div data-sentinelle-entete aria-hidden="true" />

      {/* `data-chrome-entete` : la MARQUE DU CHROME DU SITE, et elle existe pour
          la feuille d'impression. Celle-ci masquait `header, footer` au
          sélecteur nu — donc aussi le `<header>` du bloc titre/prix d'une fiche
          produit, qui n'a rien à voir avec la coquille. Un attribut posé ici dit
          ce que l'élément EST plutôt que la profondeur à laquelle il se trouve :
          il survivra aux enveloppes que C15 à C18 poseront autour de la mise en
          page (contrôleur de mouvement, Lenis, transitions de vue), là où un
          `body > header` cesserait de correspondre sans que rien ne le dise. */}
      <header className="entete" data-chrome-entete>
        {/* UN SEUL RANG, TROIS ENFANTS, `flex-nowrap` — ET C'EST LA LEÇON DE
            C13 POUSSÉE D'UN CRAN (C23).

            C13 avait corrigé un décalage cumulé de 0,0089 en remplaçant un
            `flex-wrap` par une grille à deux colonnes FIXE : le nombre de rangs
            cessait de dépendre de la largeur du texte rendu, donc du repli de
            police mono vers Arial. Ici il n'y a plus qu'UN RANG, par
            construction — un flex `nowrap` ne se replie jamais. Le mécanisme du
            défaut de C13 n'a plus de prise du tout.

            L'ORDRE DU DOM EST L'ORDRE VISUEL. Aucun `order` nulle part : la
            marque, puis le bouton de menu, puis la pastille. Le clavier
            traverse ce qu'on voit.

            LA PASTILLE EST SORTIE DE LA LISTE, et c'est le geste qui débloque
            l'écart laissé ouvert par C17. Son expérience avait montré qu'un
            repliable fermé par défaut « retire leur boîte aux trois liens ET à
            la pastille du panier, et la campagne GELÉE clique l'un et lit
            l'autre sur ce profil ». On ne répare pas le test : on sort la
            pastille du repliable. Elle devient un frère permanent du bouton,
            visible à toute largeur et à toute position de défilement — et c'est
            précisément le bénéfice que cette tranche vend, l'accès permanent au
            panier sur téléphone. */}
        <div className="entete-rang mx-auto flex max-w-page flex-nowrap items-center gap-4 px-5 sm:px-8">
          <Link href="/" className="group mr-auto inline-flex flex-col no-underline">
            <span className="font-titre text-xl font-medium tracking-tight text-encre [font-variant-caps:small-caps] group-hover:text-terre md:text-2xl">
              {marchand.nom}
            </span>
            {/* LA BASELINE NE S'AFFICHE QU'À PARTIR DE `md`, et son retrait sur
                téléphone est ce qui fait tenir l'en-tête sur une ligne. C17
                désignait déjà le bloc de marque comme ce qui pèse — replier la
                seule navigation ne rendait que 38,6 px sur 160,9.

                VÉRIFIÉ AVANT DE LA RETIRER : aucun test, aucune garde, aucun
                décompte ne lit cette phrase. Et le mot « démonstration » reste
                porté par l'encart permanent de l'accueil, les mentions légales,
                le pied de page, et la description de chacune des 46 pages — que
                `liens.spec.ts` garde déjà. */}
            <span className="etiquette mt-1 hidden text-encre-douce md:block">
              Épicerie fine — démonstration
            </span>
          </Link>

          {/* LE REPLIABLE EST EN CSS PUR, ET LE BOUTON EXISTE À TOUTE LARGEUR.

              C'est la feuille qui le retire au-dessus de `md`, jamais le rendu :
              un test décide alors sur une BOÎTE (`isVisible()`) et non sur une
              largeur de fenêtre — c'est-à-dire sur un nombre que la feuille de
              style connaît, au lieu d'un nombre qu'elle ignore.

              PAS de `role="button"` sur le `<summary>` : il écraserait l'état
              `expanded` que le moteur gère seul. PAS de `<nav>` NI de `<ul>`
              DANS le `<summary>` : du contenu interactif imbriqué déclenche
              `nested-interactive`, de gravité « serious », donc l'échec du
              seuil d'accessibilité du projet. */}
          <details data-menu-entete className="menu-entete">
            <summary className="menu-bouton" aria-label="Menu">
              <span className="menu-glyphe" aria-hidden="true" />
            </summary>

            <div className="menu-panneau">
              <nav aria-label="Navigation principale">
                <ul className="menu-liste">
                  {LIENS_NAVIGATION.map((lien) => (
                    <li key={lien.adresse}>
                      <Link href={lien.adresse} className={CLASSE_LIEN}>
                        <span className="lien-nav-fenetre">
                          <span className="lien-nav-ligne">{lien.libelle}</span>
                          <span className="lien-nav-ligne" aria-hidden="true">
                            {lien.libelle}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </details>

          <PastillePanier />
        </div>
      </header>
    </>
  );
}
