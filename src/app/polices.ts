import localFont from 'next/font/local';

/**
 * Chargement des deux familles.
 *
 * Les fichiers restent ceux de @fontsource-variable (un seul fichier variable
 * par famille, sous-ensemble latin), mais ils passent par `next/font/local`
 * plutôt que par une règle @font-face écrite à la main. Ce n'est pas un
 * raffinement : c'est un correctif mesuré.
 *
 * Première mesure Lighthouse à blanc (2026-08-06, avant correction) :
 * rapidité 87, à cause d'un décalage de mise en page cumulé de 0,220 — le
 * texte se recomposait quand les deux polices arrivaient, et l'encart de
 * fiction sautait de plusieurs dizaines de pixels. `font-display: swap` est
 * imposé (on refuse le texte invisible), donc la seule façon de supprimer le
 * saut est que la police de repli occupe exactement la même place que la
 * police définitive.
 *
 * `adjustFontFallback` fait ce calcul : Next lit les métriques du fichier
 * (hauteur d'oeil, jambages, chasse moyenne) et engendre une @font-face de
 * repli avec les propriétés `size-adjust`, `ascent-override`,
 * `descent-override` et `line-gap-override` qui alignent le repli sur la
 * police finale. Écrire ces quatre nombres à la main aurait supposé de les
 * recalculer à chaque changement de police — et de les recalculer juste.
 *
 * `next/font` ajoute au passage un `<link rel="preload">` sur chaque fichier :
 * les polices partent en même temps que la feuille de style au lieu d'attendre
 * qu'elle soit analysée.
 */

export const policeTitre = localFont({
  src: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  variable: '--police-titre',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Iowan Old Style', 'Palatino Linotype', 'Georgia', 'serif'],
  preload: true,
});

export const policeTexte = localFont({
  src: '../../node_modules/@fontsource-variable/work-sans/files/work-sans-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--police-texte',
  adjustFontFallback: 'Arial',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
  preload: true,
});
