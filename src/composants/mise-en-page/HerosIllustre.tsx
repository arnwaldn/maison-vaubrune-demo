import type { ReactNode } from 'react';

import { VideoHeros } from '@/composants/illustrations/VideoHeros';
import { Visuel } from '@/composants/illustrations/Visuel';
import type { HerosEditorial } from '@/donnees/visuels-editoriaux';

/**
 * LE HÉROS À DEUX COLONNES — le bloc-titre à gauche, une matière à droite.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES DEUX RETOURS CLIENT QUI L'ONT FAIT NAÎTRE (n° 14 et n° 17, 11/08)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « /boutique : grand vide à droite du titre — une belle photo animée comme le
 * filet d'huile » et « /livraison, /suivi, /panier : vides à droite du titre ».
 * Quatre pages ouvraient sur une colonne de texte et une moitié de page nue.
 *
 * Un seul composant les sert, et ce n'est pas de l'économie de lignes : c'est
 * la seule manière que ces pages ouvrent TOUTES de la même façon. Autant de
 * compositions écrites à la main auraient divergé au premier réglage — c'est
 * exactement ce qui est arrivé aux « étiquettes qui s'ignorent » de C13, quinze
 * fois. Elles étaient quatre au retour n° 17 ; le tunnel en a fait sept au
 * retour n° 21, sans qu'une ligne de ce fichier ait eu à le savoir, et AUCUN
 * décompte n'est écrit ici — il vieillirait au prochain retour client.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA GÉOMÉTRIE, ET CE QU'ELLE DOIT À L'ACCUEIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'accueil partage sa grille en deux moitiés parce que son monument
 * typographique a besoin d'une demi-page. Ces pages-ci n'ont pas de
 * monument : leur bloc-titre est un titre d'affiche et un chapeau, qui se
 * lisent mieux sur une colonne de texte que sur une demi-page. La colonne
 * d'image est donc BORNÉE (26 rem) plutôt qu'égale, et le texte prend le reste.
 *
 * En dessous de `lg`, une seule colonne : l'image passe SOUS le bloc-titre.
 * L'ordre du DOM est déjà celui de la lecture — on lit le titre, puis on voit
 * la matière — donc rien n'a à être réordonné, et c'est ce qui garantit que
 * l'ordre de tabulation suit l'ordre visuel aux deux largeurs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'IMAGE EST PRIORITAIRE, ET C'EST UNE DÉCISION DE MESURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur toutes ces pages, l'image est le plus grand affichage de contenu : 416
 * points de large sur un bureau, contre un titre d'affiche qui n'en couvre que
 * deux cents. La retarder retarderait donc la mesure elle-même. Elle part en
 * chargement empressé et en priorité haute, comme le héros de l'accueil, et le
 * plafond d'images de `/boutique` (180 Ko, D36) reste tenu : le rayon passe de
 * 129 à 155 Ko.
 *
 * VÉRIFIÉ UNE SECONDE FOIS EN C21a, sur des pages de TEXTE cette fois — le
 * tunnel. Le plus grand affichage y était un bloc de prose, qui attend la
 * police d'affichage ; il devient l'image, et il ARRIVE PLUS TÔT :
 * `/commande` 1 736 → 1 068 ms, `/commande/confirmation` 2 112 → 1 020, sous
 * le bridage de `mesurer-notes`. La seule des trois qui paie (+124 ms) est
 * celle dont l'ancien plus grand affichage était DÉJÀ rendu au premier
 * affichage : il n'y avait rien à y gagner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA VIDÉO, QUAND IL Y EN A UNE, SUIT LE PATRON EXACT DU HÉROS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La photographie et la vidéo occupent la même boîte, dans cet ordre : la
 * première décide de la hauteur et reste ce que tout le monde voit ; la seconde
 * est posée par-dessus, à l'opacité nulle, et ne se montre qu'une fois qu'elle
 * joue réellement. Aucun attribut `poster` — l'affiche est l'image qui est déjà
 * là, dans la largeur que le `sizes` a choisie pour cet écran ; le raisonnement
 * complet est en tête de `VideoHeros`. Sous mouvement réduit, la frontière
 * cliente sort avant même de chercher l'élément : `preload="none"` n'est jamais
 * levé, pas un octet ne part.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA VUE N'EST PAS UNE PROPRIÉTÉ : ELLE SE DÉDUIT (C20)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une page qui porte une vidéo montre l'image 0 de sa boucle (`affiche`) ; une
 * page immobile montre sa nature morte entière (`illustration`). Ce n'étaient
 * hier que deux propriétés voisines qu'un appelant devait tenir d'accord, et
 * les mélanger donne un cadrage qui SAUTE à la première image jouée — un 3:2
 * remplacé par un 16:9 recadré au centre. Un couple qu'on peut désaccorder
 * finit par l'être : le composant le déduit désormais du seul champ `video`.
 * C'est le geste des « étiquettes qui s'ignorent » de C13, pris à l'envers —
 * on ne répare pas quinze copies, on retire la possibilité de la seizième.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE TUNNEL GAGNE UNE IMAGE, PAS UNE MISE EN SCÈNE (C21a)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `data-titre-anime` dit une chose et une seule, et la règle qui le lit le dit
 * en toutes lettres : « le titre entre là où une IMAGE porte la mesure ». Il
 * était donc juste PAR CONSTRUCTION tant que ce composant ne servait que des
 * pages de vitrine — celui qui apporte l'image apporte le marqueur, et une page
 * qui perdrait son image perdrait les deux d'un coup.
 *
 * Les trois pages du tunnel cassent cette coïncidence, et elles la cassent
 * proprement : elles ont l'image, et elles n'ont pas le droit de la mise en
 * scène. Ce n'est pas une mesure qui l'interdit — l'image y porte
 * vraisemblablement la mesure comme ailleurs — c'est l'interdit n° 19 de D37,
 * « un document juridique et un formulaire de paiement se lisent ; ils ne se
 * mettent pas en scène », et la doctrine C16 qui en découle. Une raison de
 * DOCTRINE ne se déduit d'aucune propriété du visuel : elle doit s'écrire.
 *
 * D'où `titreAnime`, vrai par défaut — le cas de vitrine reste celui qu'on
 * obtient sans rien dire. Et parce qu'un drapeau qu'on peut oublier de poser
 * est un drapeau qui finira par manquer, un cas de `tunnel.spec.ts` LIT LE
 * STYLE CALCULÉ des deux côtés : `animation-name: none` sur le `<h1>` des trois
 * pages du tunnel, `signature-montee` sur celui de `/livraison`. Sans la
 * seconde moitié, le cas resterait vert le jour où l'entrée cesserait de jouer
 * PARTOUT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE CARTOUCHE EST PARTI, ET L'ALTERNATIVE EST RESTÉE (retour client n° 22)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Huile d'olive de première pression — matière », « Colis ficelé — ce qui
 * part » : la légende sous l'image nommait le sujet à un visiteur qui le VOIT
 * déjà, dans une voix de catalogue de musée que rien d'autre sur ce site ne
 * parle. Le client l'a dit en trois mots — « cela fait bizarre pour un
 * visiteur » — et c'est le genre de défaut qu'aucune mesure n'attrape.
 *
 * CE QUI PART EST LE CARTOUCHE, PAS L'ALTERNATIVE. Les deux disaient la même
 * chose à deux publics différents, et un seul des deux était de trop : l'`alt`
 * décrit la scène pour qui ne la voit pas, il ne se lit jamais à l'écran, et il
 * n'a donc rien coûté à personne. Aucun `alt` n'a été touché — la sortie de
 * `preuves/c21/cartouches-heros.mjs` les relit un par un, avant et après.
 *
 * LE PÉRIMÈTRE S'ARRÊTE ICI, ET LA FRONTIÈRE EST UN ORGANE, PAS UNE CLASSE. Les
 * figures d'une FICHE PRODUIT gardent le leur : rang d'inventaire, référence,
 * poids, ligne de garde — de l'information de fiche qui ne se lit nulle part
 * ailleurs, et que le client n'a pas visée. Elles portent la même classe
 * `etiquette` dans le même `.cadre-photo` : un retrait guidé par la classe les
 * aurait emportées sans qu'aucune revue de code ne le voie.
 */
export function HerosIllustre({
  heros,
  className = 'pt-12 pb-8 sm:pt-16 sm:pb-10',
  titreAnime = true,
  children,
}: {
  /** L'entrée de `src/donnees/visuels-editoriaux.ts` — clef, vidéo, visuel. */
  readonly heros: HerosEditorial;
  readonly className?: string;
  /**
   * `false` sur les pages qui portent une image SANS avoir le droit de se
   * mettre en scène — les trois du tunnel, et elles seules à ce jour. Le motif
   * est de doctrine (D37 n° 19, C16) et non de mesure : voir l'en-tête.
   */
  readonly titreAnime?: boolean;
  readonly children: ReactNode;
}) {
  const image = (
    <Visuel
      slug={heros.clef}
      racine="editorial"
      vue={heros.video === undefined ? 'illustration' : 'affiche'}
      donnees={heros.visuel}
      /* La place RÉELLE : la colonne d'image est bornée à 26 rem au-delà de
         64 rem de fenêtre, et pleine largeur en deçà. Le `sizes` dit donc la
         vérité aux deux largeurs, et le `srcset` n'a que deux marches — 640
         sert le téléphone, 1024 sert les 416 points d'un bureau à double
         densité. */
      sizes="(min-width: 64rem) 26rem, 92vw"
      prioritaire
      impression="masquer"
    />
  );

  return (
    <section
      /* LE MARQUEUR DU TITRE ANIMÉ EST PORTÉ PAR CELUI QUI APPORTE L'IMAGE,
         et c'est ce qui le rend juste par construction : sur ces pages, le plus
         grand affichage de contenu est la figure ci-dessous, jamais le titre —
         mesuré, 160 ms avec l'entrée contre 168 sans. Le raisonnement complet et
         le tableau des pages mesurées sont à l'endroit de la règle, dans
         `globals.css`. Le tunnel est la seule famille qui le refuse, et par
         doctrine — voir `titreAnime` en tête de fichier. */
      {...(titreAnime ? { 'data-titre-anime': true } : {})}
      className={`grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-x-12 ${className}`}
    >
      <div className="min-w-0">{children}</div>

      {/* LE CADRE RESTE, LA LÉGENDE PART (retour client n° 22). Le passe-partout
          de verre et son filet ne sont pas un ornement du cartouche : ils
          rendent INTENTIONNEL l'écart entre le papier écru des photographies
          (#ebe0cc) et la coquille de la page (#f2ece1) — le raisonnement est à
          l'endroit de la règle, dans `globals.css`. Retirer le cadre avec la
          légende aurait rouvert le défaut que C15 a fermé. */}
      <figure className="cadre-photo rounded-sm">
        {heros.video === undefined ? (
          image
        ) : (
          <div className="scene-heros">
            {image}
            <VideoHeros clef={heros.video} />
          </div>
        )}
      </figure>
    </section>
  );
}
