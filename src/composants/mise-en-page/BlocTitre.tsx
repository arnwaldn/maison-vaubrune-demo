import type { CSSProperties, ReactNode } from 'react';

/**
 * LE BLOC-TITRE DE TOUTES LES PAGES, ET SON ENTRÉE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE RETOUR CLIENT QUI L'A FAIT NAÎTRE (n° 18, 11/08)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Les textes manquent d'animation à l'ouverture et au défilement — tu peux
 * faire mieux. » L'accueil avait reçu, en C19, une entrée arrachée à trois
 * retours successifs (le fondu discret, le bloc plein rejeté, puis la montée
 * masquée). Les vingt et une autres pages, elles, s'affichaient d'un bloc,
 * immobiles. Un site de portfolio dont une seule page respire ne se lit pas
 * comme un parti pris : il se lit comme un travail inachevé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  UN COMPOSANT, ET NON QUINZE COPIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bloc d'ouverture est le même partout, au caractère près, depuis C13 :
 * une étiquette d'ocre, un titre d'affiche, un chapeau sur le marbre. Il était
 * recopié dans dix-neuf fichiers. Décliner l'entrée à la main aurait donc
 * demandé dix-neuf modifications identiques, et garanti qu'un jour l'une des
 * dix-neuf diverge — le défaut exact que C13 avait payé sur les « étiquettes
 * qui s'ignorent » (quinze occurrences d'un degré recopié à la main).
 *
 * Le composant PORTE le patron : les classes, les rangs de cascade, et les
 * attributs que la feuille de style lit. Une page qui ouvre autrement (la 404,
 * l'écran de paiement simulé) compose avec `LigneEntree`, la même pièce prise
 * à l'unité.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE MÉCANISME EST CELUI DU HÉROS, À L'IDENTIQUE — AUCUN VOCABULAIRE NEUF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucune règle CSS n'est ajoutée pour ce composant : il réemploie les attributs
 * `data-signature="ligne"` / `data-signature="texte"` et l'animation
 * `signature-montee` écrites en C19 pour l'accueil. C'est la QUATRIÈME VOIE de
 * D37 (amendement C18) : une animation d'images-clés en `fill: backwards`, sans
 * porte `html.mouvement`, donc jouée À FROID, à la seule arrivée qui compte.
 *
 * Ce que cela garantit, et c'est la propriété qui décide : **rien n'est masqué
 * de façon persistante.** `backwards` n'applique l'état de départ que PENDANT
 * le retard ; le texte n'a aucun style de repos qui le cache. Sans JavaScript,
 * avec un paquet qui échoue, sur un moteur qui ignore la règle : le bloc-titre
 * est là, entier, lisible. La dégradation est « pas d'animation », jamais
 * « invisible ».
 *
 * DEUX PROPRIÉTÉS ANIMÉES, ET PAS UNE DE PLUS (D37) : `opacity` et
 * `transform: translateY`. Aucune géométrie ne bouge, donc aucun décalage
 * cumulé — re-mesuré sous les deux régimes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI LE CHAPEAU EST UNE LIGNE *LIBRE*, ET LES DEUX AUTRES MASQUÉES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le masque du héros est un `clip-path` découpé au ras de la ligne, et la
 * course vaut 110 % de la hauteur de l'élément. C'est juste pour une ligne
 * UNIQUE — l'élément fait une hauteur de texte, il monte d'une hauteur de
 * texte, il sort de sous la coupe.
 *
 * Un chapeau fait deux, trois ou quatre lignes selon la page et la fenêtre.
 * 110 % de sa hauteur vaut alors trois cents pixels : le geste cesse d'être une
 * ligne qui se pose et devient un paragraphe qui glisse. Et si l'on bornait la
 * course, le masque laisserait dépasser le haut du paragraphe au premier
 * instant — un demi-mot visible sous une ligne de coupe, c'est-à-dire le
 * contraire de ce que le masque existe pour faire.
 *
 * Le chapeau emprunte donc la ligne LIBRE, celle que C19 avait écrite pour le
 * bouton du héros (dont la bague de focus ne supporte aucun découpage) : montée
 * courte et bornée, fondu, aucun masque. Le vocabulaire est inchangé, seul son
 * emploi s'élargit — et il s'élargit à un cas de la même famille, celui d'un
 * élément dont la hauteur n'est pas celle d'une ligne.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES RANGS SONT SERRÉS, ET C'EST LE PLUS GRAND AFFICHAGE DE CONTENU QUI L'A
 *  DÉCIDÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'accueil espace ses rangs (1, 3, 5, 6 — 420 ms d'écart total) parce que son
 * monument est une composition de cinq lignes qu'on regarde. Un bloc-titre en
 * compte trois, et sur ces pages-là le TITRE EST LE PLUS GRAND AFFICHAGE DE
 * CONTENU : chaque rang de retard est du temps pendant lequel `backwards`
 * maintient l'opacité à zéro, donc pendant lequel le navigateur n'a rien à
 * mesurer.
 *
 * Les rangs valent donc 1, 2 et 3 — 70 ms de retard sur le titre —, et le coût
 * a été MESURÉ avant/après sur deux pages témoins plutôt qu'estimé (relevé
 * `preuves/c19/lcp-blocs-titres.txt`). Le vocabulaire de D37 est intact : le
 * décalage de cascade reste 70 ms, le plafond de six est loin.
 */

/** Les classes du bloc, écrites UNE fois — c'est la raison d'être du fichier. */
const CLASSE_SURTITRE = 'etiquette text-ocre';
const CLASSE_TITRE = 'mt-4 text-affiche text-encre';
const CLASSE_CHAPEAU = 'mt-5 max-w-lisible text-chapeau text-encre';

/**
 * UNE LIGNE D'ENTRÉE, prise à l'unité.
 *
 * L'enveloppe porte le masque et ne bouge jamais ; l'élément intérieur porte le
 * texte et monte. Les mêler ferait monter le masque avec ce qu'il masque — le
 * raisonnement complet est à l'endroit de la règle, dans `globals.css`.
 *
 * `libre` retire le masque : la ligne garde la montée et le fondu, avec une
 * course courte. Employé pour ce qui déborde d'une hauteur de ligne (un
 * chapeau) et pour ce dont la bague de focus ne supporte pas d'être coupée (un
 * bouton, un lien).
 */
export function LigneEntree({
  rang,
  libre = false,
  balise: Balise = 'p',
  className,
  identifiant,
  surMarbre = false,
  enfants,
}: {
  readonly rang: number;
  readonly libre?: boolean;
  readonly balise?: 'p' | 'h1' | 'h2' | 'div';
  readonly className?: string;
  readonly identifiant?: string;
  readonly surMarbre?: boolean;
  readonly enfants: ReactNode;
}) {
  return (
    <Balise
      {...(identifiant === undefined ? {} : { id: identifiant })}
      {...(className === undefined ? {} : { className })}
      {...(surMarbre ? { 'data-sur-marbre': true } : {})}
      data-signature="ligne"
      {...(libre ? { 'data-signature-libre': true } : {})}
      style={{ '--rang-signature': rang } as CSSProperties}
    >
      <span data-signature="texte">{enfants}</span>
    </Balise>
  );
}

/**
 * LE QUATRIÈME RANG — « le premier contenu » (renfort client du 11/08).
 *
 * Le client a insisté une seconde fois sur ce retour : « n'oublie pas les
 * animations pour le texte, c'est une partie à améliorer ». Trois lignes
 * ouvrent la page ; la quatrième la fait commencer. C'est la note qui suit le
 * chapeau sur presque toutes les pages — le panneau de verre qui dit ce que la
 * démonstration fait et ne fait pas —, et l'enchaînement se lit alors comme une
 * composition en quatre temps plutôt que comme un titre suivi d'un bloc.
 *
 * Elle est LIBRE, comme le chapeau et pour la même raison : c'est une surface,
 * pas une ligne. Un masque découpé au ras d'un panneau de verre couperait le
 * panneau.
 *
 * Le plafond de six rangs de D37 reste très loin : quatre.
 */
const CLASSE_NOTE = 'panneau mt-6 max-w-lisible text-sm leading-relaxed text-encre-douce';

export function BlocTitre({
  surtitre,
  titre,
  chapeau,
  note,
  classeSurtitre,
  classeTitre,
  classeChapeau,
  classeNote,
  chapeauSurMarbre = true,
}: {
  readonly surtitre: ReactNode;
  readonly titre: ReactNode;
  /** Absent sur les rares pages qui ouvrent sur autre chose qu'un chapeau. */
  readonly chapeau?: ReactNode;
  /** Le premier contenu — la note de démonstration, quand la page en porte une. */
  readonly note?: ReactNode;
  readonly classeSurtitre?: string;
  readonly classeTitre?: string;
  readonly classeChapeau?: string;
  readonly classeNote?: string;
  readonly chapeauSurMarbre?: boolean;
}) {
  return (
    <>
      <LigneEntree
        rang={1}
        className={classeSurtitre === undefined ? CLASSE_SURTITRE : `${CLASSE_SURTITRE} ${classeSurtitre}`}
        enfants={surtitre}
      />
      <LigneEntree
        rang={2}
        balise="h1"
        className={classeTitre === undefined ? CLASSE_TITRE : `${CLASSE_TITRE} ${classeTitre}`}
        enfants={titre}
      />
      {chapeau === undefined ? null : (
        <LigneEntree
          rang={3}
          libre
          surMarbre={chapeauSurMarbre}
          className={
            classeChapeau === undefined ? CLASSE_CHAPEAU : `${CLASSE_CHAPEAU} ${classeChapeau}`
          }
          enfants={chapeau}
        />
      )}
      {note === undefined ? null : (
        <LigneEntree rang={4} libre className={classeNote ?? CLASSE_NOTE} enfants={note} />
      )}
    </>
  );
}
