import { Silhouette } from '@/composants/illustrations/Silhouette';
import type { Illustration, NomVueVisuel, VueVisuel } from '@/lib/types';

/**
 * LE VISUEL D'UN PRODUIT — composant SERVEUR, zéro octet de JavaScript.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'IL REND, ET CE QU'IL NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un `<picture>` avec une source AVIF, un repli JPEG, un `srcset` et des
 * dimensions intrinsèques — et, dans le même conteneur, la silhouette SVG que
 * la feuille d'impression rétablira. C'est tout. Aucun état, aucun effet,
 * aucune frontière cliente : la balise part dans le HTML prérendu, et le
 * First Load JS de la fiche ne bouge pas d'un octet.
 *
 * Ce qu'il ne fait PAS, et qui mérite d'être dit parce que c'est le réflexe
 * qu'on attend d'un projet Next : il n'emploie pas `next/image`. Le plan de
 * refonte l'a écarté. `next/image` redimensionne à la demande sur le serveur —
 * c'est-à-dire qu'il remet sharp dans le graphe d'exécution, met une fonction
 * dynamique sur le chemin d'une page statique, et rend la sortie dépendante
 * d'un cache d'hébergeur. Ici les dérivés sont produits hors ligne, versionnés,
 * et servis comme des fichiers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE DÉCALAGE CUMULÉ EST TENU PAR LA GÉOMÉTRIE, PAS PAR UNE PROMESSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `width` et `height` portent les dimensions INTRINSÈQUES du dérivé. Le
 * navigateur en déduit le rapport et réserve la place avant d'avoir reçu le
 * premier octet — c'est le mécanisme, et il ne demande aucune classe
 * particulière. `height: auto` en CSS complète le dispositif : sans lui, une
 * largeur fluide écraserait la hauteur réservée et rouvrirait le décalage que
 * les deux attributs viennent de fermer.
 *
 * La couleur de réservation ne sert PAS à ça — les dimensions s'en chargent.
 * Elle sert à ce que la place réservée ne soit pas un rectangle blanc qui
 * clignote : c'est la couleur moyenne du recadrage, mesurée par le pipeline.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES CHEMINS SE RECOMPOSENT, ILS NE SE LISENT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/produits/<slug>/<vue>-<largeur>.<format>`. Le catalogue ne porte aucun
 * chemin : il porte un slug, des largeurs et des dimensions. C'est la même
 * convention que la garde des images fait respecter de l'autre côté — elle
 * refuse tout nom hors de ce vocabulaire fermé, précisément pour qu'une fiche
 * puisse calculer ses adresses au lieu de lire un dossier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA SILHOUETTE EST DANS LE MÊME CONTENEUR, ET C'EST VOULU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Décision D35 : les silhouettes ne disparaissent pas, elles deviennent la
 * structure de repli. La feuille d'impression écrite en C12 — AVANT les
 * images, pour qu'elle existe — masque `.visuel-produit img` et rétablit
 * `[data-repli-silhouette]`. Les deux sélecteurs ne valent que si les deux
 * éléments cohabitent : la silhouette est donc rendue ici, cachée à l'écran,
 * et non ajoutée par la page appelante qui oublierait de le faire.
 *
 * Elle est `aria-hidden` : à l'écran elle n'existe pas, et à l'impression le
 * texte alternatif de la photographie n'a plus de destinataire.
 */

interface ProprietesVisuel {
  readonly slug: string;
  /**
   * LA RACINE, ET POURQUOI ELLE EST DEVENUE UN PARAMÈTRE (C15).
   *
   * `produits` par défaut — c'est le cas de vingt-neuf visuels sur trente et un.
   * `editorial` sert ce qui n'appartient à aucun produit : le héros de
   * l'accueil, les macros de famille. Les deux racines existent parce que la
   * garde des images contrôle que chaque dossier de `public/produits/` est un
   * slug EXACT du catalogue, et une macro de famille n'en est pas un.
   */
  readonly racine?: 'produits' | 'editorial';
  readonly vue: NomVueVisuel | 'macro' | 'hero' | 'illustration' | 'affiche';
  readonly donnees: VueVisuel;
  /**
   * La silhouette de repli — celle du produit, jamais une générique.
   *
   * OPTIONNELLE depuis C15 : un visuel éditorial n'a pas de produit derrière
   * lui, donc pas de dessin qui le remplacerait. Il sort alors du papier par
   * `impression="masquer"`, ce que la page qui le pose doit dire.
   */
  readonly illustration?: Illustration;
  /**
   * L'IMAGE EST-ELLE DU CONTENU, OU UN DOUBLON DU TEXTE QUI L'ENTOURE ?
   *
   * `'texte'` par défaut : l'alternative du catalogue est rendue, et c'est le
   * cas sur une fiche, où la photographie EST l'information.
   *
   * `'decorative'` rend `alt=""`, et ce n'est pas un renoncement : dans une
   * carte du rayon, la photographie est À L'INTÉRIEUR d'un lien dont le texte
   * nomme déjà le produit. Rendre l'alternative y ferait commencer le nom
   * accessible du lien par « Bouteille de verre vert foncé… » au lieu de
   * « Huile d'olive de première pression » — le défaut exact que la carte évite
   * depuis C6 en gardant le nom du produit comme texte du lien. Deux campagnes
   * d'achat l'ont attrapé le jour où la carte a reçu sa photographie.
   */
  readonly alternative?: 'texte' | 'decorative';
  /**
   * L'attribut `sizes`, obligatoire dès qu'il y a plusieurs largeurs.
   *
   * Il n'a pas de valeur par défaut, et c'est délibéré : un `sizes` faux est
   * pire qu'absent — il fait télécharger la mauvaise largeur en silence. La
   * page qui pose l'image est la seule à savoir quelle place elle lui donne.
   */
  readonly sizes: string;
  /**
   * LA PLUS GRANDE LARGEUR QUE CETTE PLACE A LE DROIT DE DEMANDER.
   *
   * Ajoutée au round 1 de C15, et elle répare une faute de raisonnement plus
   * qu'un bogue. `sizes` dit au navigateur la place qu'occupera l'image ; il en
   * déduit, avec la densité de l'écran, la largeur qu'il lui faut, et il PREND
   * CELLE-LÀ. C'est exactement ce qu'on veut sur une fiche, où une seule image
   * compte. Sur un rayon de quinze vignettes, cela veut dire que le poids de la
   * page suit la densité de l'écran du visiteur — et le plafond de 180 Ko de la
   * décision D36 n'était tenu que sur le profil mesuré : 129 Ko sur un téléphone
   * à la densité 1,75, 387 sur un bureau à la densité 2.
   *
   * Un plafond qui ne vaut que sur un profil n'est pas un plafond. Cette
   * propriété le rend vrai partout, en RETIRANT du `srcset` les largeurs que la
   * place n'a pas le droit de coûter. Ce n'est pas un `sizes` corrigé : un
   * `sizes` juste demanderait DAVANTAGE (la vignette occupe 403 points de large
   * sur un bureau de 1440, pas les 320 qu'elle annonçait). C'est une décision de
   * budget, écrite là où elle s'applique.
   */
  readonly largeurMaximale?: number;
  /**
   * `true` pour la vue qui est, ou peut être, le plus grand affichage de
   * contenu. Elle passe alors en chargement empressé et en priorité haute ;
   * toutes les autres restent paresseuses.
   */
  readonly prioritaire?: boolean;
  /**
   * `true` pour une vue qui ne doit JAMAIS disputer le tuyau au plus grand
   * affichage (C23). `loading="lazy"` ne suffit pas à l'en empêcher : sous
   * connexion bridée, le seuil de préchargement de Chrome porte à ~1 250 px
   * devant la fenêtre, et une tuile posée juste sous la flottaison est donc
   * demandée PENDANT la fenêtre de mesure — en priorité `auto`, c'est-à-dire en
   * concurrence avec le héros. Mesuré sur l'accueil : +150 à +300 ms de plus
   * grand affichage, constants sur six tirages, à l'entrée des sept tuiles de
   * famille. `fetchPriority="low"` laisse la tuile se charger dans le même
   * seuil, mais derrière tout ce qui compte.
   *
   * Incompatible avec `prioritaire`, et le type ne peut pas l'interdire sans
   * une union discriminée disproportionnée : l'appelant qui poserait les deux
   * obtiendrait `prioritaire`, qui gagne — c'est écrit à l'endroit du calcul.
   */
  readonly arrierePlan?: boolean;
  /**
   * CE QUE CETTE VUE DEVIENT SUR LE PAPIER.
   *
   * `'silhouette'` (défaut) : la photographie sort, le dessin de repli entre —
   * la convention D35 écrite en C12. `'masquer'` : la vue disparaît entièrement,
   * dessin compris.
   *
   * Le second cas existe parce que la silhouette est celle du PRODUIT et non
   * celle de la vue : `principal` et `ambiance` rendent exactement le même
   * dessin, à la même taille. Les rétablir toutes les deux imprimait deux fois
   * la même bouteille sur une même A4 — ce que D35 n'a jamais demandé. Elle
   * demande qu'un produit imprimé reste identifiable, ce qu'un seul dessin fait
   * aussi bien que deux, et sans le ridicule du doublon.
   */
  readonly impression?: 'silhouette' | 'masquer';
  readonly className?: string;
}

/** `/<racine>/<slug>/<vue>-<largeur>.<format>` — la seule fabrique de chemins. */
function chemin(
  racine: string,
  slug: string,
  vue: string,
  largeur: number,
  format: 'avif' | 'jpg',
): string {
  return `/${racine}/${slug}/${vue}-${String(largeur)}.${format}`;
}

function srcset(
  racine: string,
  slug: string,
  vue: string,
  largeurs: readonly number[],
  format: 'avif' | 'jpg',
): string {
  return largeurs
    .map((largeur) => `${chemin(racine, slug, vue, largeur, format)} ${String(largeur)}w`)
    .join(', ');
}

export function Visuel({
  slug,
  racine = 'produits',
  vue,
  donnees,
  illustration,
  alternative = 'texte',
  sizes,
  largeurMaximale,
  prioritaire = false,
  arrierePlan = false,
  impression = 'silhouette',
  className = '',
}: ProprietesVisuel) {
  const { alt, couleurDominante, largeur, hauteur, largeurs } = donnees;

  /* Le bridage ne peut pas vider le `srcset` : si aucune largeur ne passe sous
     le plafond, on garde la plus petite. Une place trop étroite pour tout ce
     qu'on sait produire reste une place à remplir. */
  const bridees = largeurs.filter((candidate) => candidate <= (largeurMaximale ?? largeur));
  const servies = bridees.length === 0 ? [Math.min(...largeurs)] : bridees;

  /* Les dimensions INTRINSÈQUES sont celles du fichier réellement désigné par
     `src`. Le rapport ne change pas — c'est lui qui réserve la place et tient le
     décalage cumulé —, mais annoncer 640 pour un fichier de 320 serait la faute
     même que le round 1 vient de corriger sur les images de partage : un chiffre
     qu'on déclare au lieu de le dériver. */
  const largeurServie = Math.max(...servies);
  const hauteurServie = Math.round((hauteur * largeurServie) / largeur);

  return (
    <div
      className={`visuel-produit overflow-hidden rounded-sm ${className}`.trim()}
      style={{ backgroundColor: couleurDominante }}
      {...(impression === 'masquer' ? { 'data-visuel-impression': 'masquer' } : {})}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={srcset(racine, slug, vue, servies, 'avif')}
          sizes={sizes}
        />
        <img
          src={chemin(racine, slug, vue, largeurServie, 'jpg')}
          srcSet={srcset(racine, slug, vue, servies, 'jpg')}
          sizes={sizes}
          width={largeurServie}
          height={hauteurServie}
          alt={alternative === 'decorative' ? '' : alt}
          /* `loading` et `fetchPriority` disent la même chose dans deux
             registres : le premier décide SI l'image est demandée tout de
             suite, le second dans quel ordre elle passe. Une image de premier
             écran a besoin des deux ; les autres n'ont besoin d'aucun. */
          loading={prioritaire ? 'eager' : 'lazy'}
          /* `prioritaire` gagne si les deux sont poses — voir la doc de `arrierePlan`. */
          fetchPriority={prioritaire ? 'high' : arrierePlan ? 'low' : 'auto'}
          decoding="async"
          className="block h-auto w-full"
        />
      </picture>

      {/* Masquée à l'écran, rétablie par `@media print` (décision D35). */}
      {/* Absente quand le visuel n'a pas de produit derrière lui : il n'existe
          alors aucun dessin qui LE représente, et en poser un générique serait
          pire que rien — c'est exactement ce que D35 refuse. La page qui pose un
          visuel éditorial le sort donc du papier par `impression="masquer"`. */}
      {illustration === undefined ? null : (
        <div data-repli-silhouette className="hidden py-6">
          <Silhouette
            forme={illustration.forme}
            teinte={illustration.teinte}
            hauteur={168}
            className="mx-auto"
          />
        </div>
      )}
    </div>
  );
}
