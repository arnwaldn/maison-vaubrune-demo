export type FormeSilhouette = 'bouteille' | 'bocal' | 'pot' | 'sachet' | 'coffret';
export type TeinteSilhouette = 'olive' | 'ocre' | 'terre' | 'encre';

interface ProprietesSilhouette {
  readonly forme: FormeSilhouette;
  /** Une teinte de la palette, jamais une couleur libre. */
  readonly teinte?: TeinteSilhouette;
  /** Hauteur en pixels ; la largeur suit le rapport 2:3 du gabarit. */
  readonly hauteur?: number;
  /**
   * Nom accessible. Absent, la silhouette est purement décorative et se
   * retire de l'arbre d'accessibilité — c'est le cas le plus fréquent :
   * répéter en alternative textuelle ce que le titre voisin dit déjà est
   * une nuisance pour un lecteur d'écran.
   */
  readonly titre?: string;
  readonly className?: string;
}

/**
 * Cinq contenants d'épicerie, dessinés au trait.
 *
 * Décision D6 du projet : aucune photographie de banque d'images. Les visuels
 * sont des SVG paramétrés, donc nets à toute taille, teintables par les jetons
 * de la palette, et pesant quelques centaines d'octets dans le HTML plutôt que
 * plusieurs dizaines de kilo-octets sur le réseau.
 *
 * Version C1 : le trait est propre mais élémentaire. Le dessin sera repris en
 * C2, quand les fiches produit diront quels contenants existent vraiment dans
 * le catalogue.
 */

/** Gabarit commun : toutes les formes sont dessinées dans cette boîte. */
const LARGEUR_GABARIT = 64;
const HAUTEUR_GABARIT = 96;

/**
 * Classes écrites en toutes lettres : Tailwind lit les fichiers source pour
 * décider quels utilitaires produire, et ne devine pas une classe composée à
 * l'exécution.
 */
const CLASSE_TEINTE: Record<TeinteSilhouette, string> = {
  olive: 'text-olive',
  ocre: 'text-ocre',
  terre: 'text-terre',
  encre: 'text-encre',
};

const TRACE: Record<FormeSilhouette, readonly string[]> = {
  bouteille: [
    'M25 4h14a2 2 0 0 1 2 2v6H23V6a2 2 0 0 1 2-2z',
    'M26 12h12v16c0 6 10 10 10 20v38a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V48c0-10 10-14 10-20V12z',
    'M19 56h26v20H19z',
  ],
  bocal: [
    'M13 6h38a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z',
    'M17 19h30v6H17z',
    'M18 25h28a6 6 0 0 1 6 6v53a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V31a6 6 0 0 1 6-6z',
    'M16 48h32v22H16z',
  ],
  pot: [
    'M12 30q20-14 40 0v5q-20-11-40 0z',
    'M15 35h34l-4 49a6 6 0 0 1-6 6H25a6 6 0 0 1-6-6z',
    'M20 58h24v18H20z',
  ],
  sachet: [
    // Soudure du haut, puis épaules tombantes : un sachet debout ne doit pas
    // se confondre avec le bocal quand les deux sont côte à côte à 80 px.
    'M13 5h38v9H13z',
    'M19 5v9M25 5v9M32 5v9M39 5v9M45 5v9',
    'M16 14c-2 9-3 17-3 26v44a6 6 0 0 0 6 6h26a6 6 0 0 0 6-6V40c0-9-1-17-3-26z',
    'M21 46h22v24H21z',
  ],
  coffret: [
    'M10 44h44v36a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z',
    'M7 30h50a3 3 0 0 1 3 3v11H4V33a3 3 0 0 1 3-3z',
    'M28 30h8v54h-8z',
    'M32 30c-5-9-13-8-11-2M32 30c5-9 13-8 11-2',
  ],
};

export function Silhouette({
  forme,
  teinte = 'olive',
  hauteur = 96,
  titre,
  className = '',
}: ProprietesSilhouette) {
  const largeur = Math.round((hauteur * LARGEUR_GABARIT) / HAUTEUR_GABARIT);
  const estDecorative = titre === undefined;
  const identifiantTitre = `silhouette-${forme}-${teinte}`;

  return (
    <svg
      viewBox={`0 0 ${LARGEUR_GABARIT} ${HAUTEUR_GABARIT}`}
      width={largeur}
      height={hauteur}
      className={`${CLASSE_TEINTE[teinte]} ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(estDecorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-labelledby': identifiantTitre })}
    >
      {titre === undefined ? null : <title id={identifiantTitre}>{titre}</title>}
      {TRACE[forme].map((trace) => (
        <path key={trace} d={trace} />
      ))}
    </svg>
  );
}
