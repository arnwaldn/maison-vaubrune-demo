import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LA VIDÉO DU HÉROS — composant SERVEUR, zéro octet de JavaScript de page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QU'ELLE EST, ET CE QU'ELLE N'EST PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le filet d'huile de l'accueil coulait dans une photographie ; il coule
 * désormais pour de bon. Décision du client du 10/08, contre le plan directeur
 * qui excluait la vidéo du héros et qui avait écrit ses conditions de retour :
 * poids borné, affiche, `preload="none"`, chargement par observateur,
 * `media-src` justifié. Les cinq sont tenues, et l'interdit n° 17 de D37 est
 * amendé plutôt que contourné.
 *
 * ELLE N'EST PAS UN CONTENU : elle est une matière. Aucun texte n'est posé
 * dessus (décision confirmée trois fois — un texte sur une image mouvante n'a
 * pas de contraste mesurable, et ce projet vend des contrastes mesurés), elle
 * ne porte aucune information que la page ne dise ailleurs, elle est
 * `aria-hidden` et ne prend jamais le focus. Un visiteur qui ne la verra
 * jamais — mouvement réduit, réseau coupé, navigateur sans AV1 ni H.264 — voit
 * la photographie, c'est-à-dire ce que le site montrait hier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'AFFICHE EST L'IMAGE QUI EST DÉJÀ LÀ — ET IL N'Y A PAS D'ATTRIBUT `poster`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La consigne demandait « l'affiche = le dérivé AVIF actuel de la macro ». Son
 * INTENTION est que le plus grand affichage de contenu reste l'image
 * d'aujourd'hui et que la vidéo ne le devienne jamais. C'est exactement ce que
 * la superposition obtient, et elle l'obtient mieux que l'attribut :
 *
 * - le `<Visuel>` est DÉJÀ téléchargé, en priorité haute, dans la largeur que
 *   le `sizes` a choisie pour cet écran-là ;
 * - un attribut `poster` désigne UNE adresse fixe. Sur un écran où la vignette
 *   choisie n'est pas celle-là, il déclencherait un SECOND téléchargement de la
 *   même image, pour une affiche que personne ne verra jamais — la vidéo étant
 *   à l'opacité nulle jusqu'à sa première image jouée ;
 * - et le raccord que l'affiche devait résoudre est résolu autrement, mieux :
 *   la vidéo ouvre sur un creux d'impact là où la macro montre une couronne
 *   pleine, donc elle ne peut pas apparaître d'un coup. Elle FOND par-dessus,
 *   sur `--ms-revele`, une fois qu'elle joue réellement.
 *
 * L'écart avec la lettre est donc assumé et il sert la même fin : pas un octet
 * de plus sur le chemin critique de la page dont la note est publiée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DEUX SOURCES, ET LA CHAÎNE `codecs` N'EST PAS DÉCORATIVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * AV1 d'abord, H.264 en repli — le second est toujours le plus lourd des deux,
 * et c'est lui que paie le visiteur qui n'a pas l'AV1. Aucun poids n'est écrit
 * ici : ce composant sert autant de pages qu'il y a de boucles, chacune pèse ce
 * qu'elle pèse, et un chiffre recopié dans un commentaire vieillit à la boucle
 * suivante. Les poids réels sont au relevé, et la garde des images les tient
 * sous leur plafond.
 *
 * Sans l'attribut `type` complet, un navigateur sans AV1 ne verrait que deux
 * `video/mp4`, prendrait le premier et n'afficherait rien — c'est la chaîne qui
 * fait fonctionner le repli. Elle est LUE dans le relevé écrit par
 * `npm run preparer-video`, qui la tient lui-même de `ffprobe` sur le fichier
 * produit. Jamais recopiée : un niveau d'encodeur qui changerait ferait écarter,
 * en silence, une source parfaitement lisible.
 *
 * La lecture a lieu à la CONSTRUCTION (`node:fs`, comme les modèles de
 * courriels de C6). Le relevé est versionné ; rien n'est lu à l'exécution.
 */

interface SourceVideo {
  readonly fichier: string;
  readonly codec: string;
  readonly type: string;
  readonly largeur: number;
  readonly hauteur: number;
}

interface EntreeVideo {
  readonly dossier: string;
  readonly sources: readonly SourceVideo[];
}

interface ReleveVideos {
  readonly videos: Readonly<Record<string, EntreeVideo>>;
}

function lireReleve(): ReleveVideos {
  const brut = readFileSync(
    join(process.cwd(), 'public', 'editorial', 'videos-livrees.json'),
    'utf8',
  );

  return JSON.parse(brut) as ReleveVideos;
}

/**
 * PLUSIEURS VIDÉOS, ET LA PAGE N'EN CONNAÎT QUE LA CLEF.
 *
 * Les retours client n° 14 puis n° 19 ont demandé aux autres pages ce que
 * l'accueil avait déjà : « une belle photo animée » à droite du titre, comme le
 * filet d'huile. Le composant ne change donc PAS de nature à chaque ajout — il
 * change de source, et la source se nomme par une clef du relevé versionné.
 * Rien d'autre ne circule entre la page et le fichier : ni un chemin, ni un
 * codec, ni une dimension. AUCUN DÉCOMPTE N'EST ÉCRIT ICI, et c'est délibéré :
 * un nombre de vidéos dans un commentaire vieillit à la tranche suivante.
 *
 * Une clef inconnue rend `null` plutôt que de jeter. Le site perd alors sa
 * matière animée et garde sa photographie — c'est-à-dire l'état de repli déjà
 * prévu pour le mouvement réduit, le réseau coupé et les moteurs sans AV1.
 */
export function VideoHeros({ clef = 'accueil' }: { readonly clef?: string }) {
  const entree = lireReleve().videos[clef];
  const premiere = entree?.sources[0];

  if (entree === undefined || premiere === undefined) {
    return null;
  }

  return (
    /* eslint-disable-next-line jsx-a11y/media-has-caption -- aucune piste
       sonore n'existe (une seule piste dans le fichier, vérifiée par le
       pipeline), et le contenu est décoratif : il n'y a rien à sous-titrer. */
    <video
      className="video-heros"
      data-video-heros="attente"
      aria-hidden="true"
      /* `muted` est écrit alors que le fichier n'a PAS de piste sonore, et ce
         n'est pas une redondance : sans lui, la lecture automatique est refusée
         par le navigateur avant même qu'il n'ouvre le fichier. */
      muted
      playsInline
      loop
      /* RIEN NE PART SUR LE RÉSEAU TANT QUE PERSONNE NE DEMANDE. C'est la
         condition qui rend la vidéo compatible avec la note de rapidité, et
         c'est aussi ce qui fait qu'un visiteur sous mouvement réduit ne
         télécharge RIEN : la frontière cliente ne l'appelle pas, donc elle
         n'existe que comme quatre lignes de HTML. */
      preload="none"
      width={premiere.largeur}
      height={premiere.hauteur}
    >
      {entree.sources.map((source) => (
        <source
          key={source.codec}
          src={`/${entree.dossier}/${source.fichier}`}
          type={source.type}
        />
      ))}
    </video>
  );
}
