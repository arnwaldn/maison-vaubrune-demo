import localFont from 'next/font/local';

/**
 * LE TRIO DE LA REFONTE — Bodoni Moda, Schibsted Grotesk, Spline Sans Mono.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI TROIS FAMILLES LÀ OÙ IL Y EN AVAIT DEUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le duo précédent — Newsreader (titres) + Work Sans (texte) — était juste
 * pour ce que le socle avait à faire : une vitrine sobre, lisible, sans
 * intention graphique forte. La refonte porte un concept, « la mise en
 * conserve » : l'étiquette, le registre, la matière lente. Ce concept demande
 * trois registres d'écriture et non deux, et chacun a un emploi que les deux
 * autres ne savent pas tenir :
 *
 * - L'ÉTIQUETTE — Bodoni Moda, une didone. Contraste de graisse extrême,
 *   empattements filiformes : c'est l'écriture des étiquettes d'apothicaire et
 *   des bocaux d'épicerie fine. Newsreader était une serif de LABEUR, dessinée
 *   pour être lue longtemps en petit corps ; elle ne fait pas d'affiche. Bodoni
 *   fait exactement l'inverse, et c'est pour cela qu'elle est cantonnée aux
 *   grandes tailles (voir l'interdit n° 10 de la décision D37 : jamais sous
 *   20 px — une didone perd ses déliés en petit corps).
 * - LE TEXTE — Schibsted Grotesk. Grotesque contemporaine à faible contraste,
 *   chasse ouverte, dessinée par Bakken & Bæck pour la presse en ligne : elle
 *   tient les mentions légales, qui font le gros du volume de ce projet, sans
 *   se battre avec la didone au-dessus d'elle. Work Sans faisait ce travail
 *   correctement ; Schibsted le fait avec une personnalité qui répond mieux à
 *   la sécheresse de Bodoni.
 * - LE REGISTRE — Spline Sans Mono. C'est la famille NOUVELLE, et la raison
 *   d'être du passage de deux à trois. Une conserverie tient un registre :
 *   des références, des poids, des dates, des lots. Ces informations
 *   s'écrivent en chasse fixe et en chiffres alignés — c'est ce qui les fait
 *   lire comme des DONNÉES et non comme de la prose. Les jetons `--text-meta`
 *   et `--text-label` de `globals.css` sont dessinés pour elle.
 *
 * DIFFÉRENCIATION VIS-À-VIS DU PORTFOLIO, qui reste la contrainte de fond :
 * le site portfolio est en Fraunces + Bricolage Grotesque, deux dessins des
 * années 2020 à axes expressifs (SOFT, WONK, largeur variable). Le trio
 * retenu ici part d'ailleurs — une didone néoclassique, une grotesque neutre,
 * une mono technique. Les deux vitrines ne peuvent pas être confondues, ce qui
 * est l'objet même de la règle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE MÉCANISME NE CHANGE PAS — ET C'EST UN CORRECTIF MESURÉ, PAS UN GOÛT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les fichiers restent ceux de @fontsource-variable (un seul fichier variable
 * par famille, sous-ensemble latin), mais ils passent par `next/font/local`
 * plutôt que par une règle @font-face écrite à la main.
 *
 * Première mesure Lighthouse à blanc (2026-08-06, avant correction) :
 * rapidité 87, à cause d'un décalage de mise en page cumulé de 0,220 — le
 * texte se recomposait quand les polices arrivaient, et l'encart de fiction
 * sautait de plusieurs dizaines de pixels. `font-display: swap` est imposé (on
 * refuse le texte invisible), donc la seule façon de supprimer le saut est que
 * la police de repli occupe exactement la même place que la police définitive.
 *
 * `adjustFontFallback` fait ce calcul : Next lit les métriques du fichier
 * (hauteur d'oeil, jambages, chasse moyenne) et engendre une @font-face de
 * repli avec les propriétés `size-adjust`, `ascent-override`,
 * `descent-override` et `line-gap-override` qui alignent le repli sur la
 * police finale. Écrire ces quatre nombres à la main aurait supposé de les
 * recalculer à chaque changement de police — et de les recalculer juste. Le
 * changement de trio est précisément le moment où cette dette se serait
 * présentée : elle ne se présente pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE `preload` FAIT RÉELLEMENT ICI — vérifié, pas supposé
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La documentation de `next/font` annonce un `<link rel="preload">` par
 * fichier préchargé. CE N'EST PAS CE QUE CE PROJET OBSERVE, et il faut
 * l'écrire plutôt que de recopier la promesse : sur la construction du 10/08
 * (Next 15.5.22, App Router, feuille de style globale importée par la mise en
 * page racine), le HTML prérendu comme le HTML servi par `next start` ne
 * portent AUCUN lien de préchargement de police — zéro sur l'accueil, relevé
 * au `fetch` sur le serveur de production. Next se contente de marquer les
 * fichiers concernés d'un suffixe `.p.` dans `/_next/static/media`.
 *
 * Deux conséquences, toutes deux favorables, et une vigilance :
 *
 * - LE CORRECTIF DE DÉCALAGE CUMULÉ NE DÉPEND PAS DU PRÉCHARGEMENT. Il tient
 *   entièrement à `adjustFontFallback`, c'est-à-dire à des métriques de repli
 *   justes. C'est heureux : c'est le mécanisme qui a fait tomber 0,220 à
 *   0,002, et il est intact.
 * - LA MONO NE COÛTE RIEN À CETTE TRANCHE. Déclarée mais référencée par aucun
 *   élément rendu avant C13, elle n'est ni préchargée ni téléchargée. Aucun
 *   octet dépensé, et aucun avertissement « preloaded but not used » dans la
 *   console — celui-là même que la recette de C19 traque.
 * - VIGILANCE : le jour où Next rétablirait l'injection des liens, la mono
 *   deviendrait un préchargement inutile tant que rien ne l'emploie. Le
 *   contrôle est celui de C19 (parcours console, zéro message).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'ITALIQUE EST LA SEULE À N'ÊTRE PAS MARQUÉE PRÉCHARGEABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bodoni Moda italique est un SECOND fichier (53,8 Ko), et un italique
 * n'apparaît jamais dans le plus grand affichage de contenu : c'est une
 * respiration typographique, posée sur un mot ou une ligne au fil de la page.
 * Le précharger reviendrait à faire payer 53,8 Ko à tout visiteur, sur le
 * chemin critique, pour un glyphe qui arrive plus bas — l'inverse de
 * l'engagement de décalage cumulé que ce fichier documente. Il est donc
 * déclaré, disponible, et téléchargé le jour où un caractère le demande. Le
 * drapeau est posé pour le jour où il aura un effet ; il en a déjà un
 * aujourd'hui, visible dans le nom des fichiers produits (trois `-s.p.woff2`,
 * un `-s.woff2`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  SOUS-ENSEMBLE LATIN, ET COUVERTURE DU FRANÇAIS VÉRIFIÉE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La version 5.3.0 de @fontsource-variable ne publie plus de feuille par
 * sous-ensemble : on ne se sert donc pas de ses feuilles, on désigne
 * directement le seul fichier latin. Sa plage relevée dans les trois paquets
 * (`U+0000-00FF, U+0131, U+0152-0153, …, U+2000-206F, U+20AC, …`) couvre tout
 * le français : lettres accentuées, ligature oe (U+0153), guillemets
 * (U+00AB/U+00BB), apostrophe typographique (U+2019) et espace insécable
 * (U+00A0) — les quatre derniers étant des conventions écrites de ce projet
 * (décision D11).
 *
 * Bodoni Moda est prise dans sa variante « standard », qui porte DEUX axes :
 * `opsz` 6→96 et `wght` 400→900. L'axe optique n'est pas décoratif sur une
 * didone — c'est lui qui épaissit les déliés en petit corps et les affine en
 * grand. Il est piloté par `font-optical-sizing: auto` (posé sur `body` dans
 * `globals.css`), sans une ligne de plus.
 */

export const policeTitre = localFont({
  src: '../../node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-standard-normal.woff2',
  weight: '400 900',
  style: 'normal',
  display: 'swap',
  variable: '--police-titre',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Didot', 'Bodoni MT', 'Iowan Old Style', 'Georgia', 'serif'],
  preload: true,
});

export const policeTitreItalique = localFont({
  src: '../../node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-standard-italic.woff2',
  weight: '400 900',
  style: 'italic',
  display: 'swap',
  variable: '--police-titre-italique',
  adjustFontFallback: 'Times New Roman',
  fallback: ['Didot', 'Bodoni MT', 'Iowan Old Style', 'Georgia', 'serif'],
  preload: false,
});

export const policeTexte = localFont({
  src: '../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2',
  weight: '400 900',
  style: 'normal',
  display: 'swap',
  variable: '--police-texte',
  adjustFontFallback: 'Arial',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
  preload: true,
});

/**
 * LA MONO EST LA SEULE À NE PAS VENIR DE `node_modules` — et c'est le correctif
 * de poids de C14.
 *
 * Les trois autres fichiers sont désignés dans le paquet @fontsource-variable
 * tel qu'il est publié. Celui-ci est PRÉPARÉ : `npm run preparer-police-mono`
 * restreint l'axe de graisse aux deux valeurs que le site emploie (400 pour le
 * registre, 500 pour l'étiquette — le script les LIT dans `globals.css`) et ne
 * garde que le répertoire de caractères que la convention D11 autorise ce
 * projet à écrire. Le résultat est versionné dans `src/polices/`.
 *
 * Le motif est mesuré : C13 a fait entrer cette famille sur le chemin critique
 * pour 36 476 octets par page, et la note de rapidité est passée de 98 à 96.
 * C14 pose les images sur ce même chemin ; la marge se referme par les deux
 * bouts. Le fichier préparé pèse 13 176 octets, soit 22,8 Ko de moins par page,
 * sans qu'un seul pixel change — les métriques du fichier (unitsPerEm 2000,
 * ascender 1927, descender −473, hauteur d'œil 1091, chasse 1200) sont
 * IDENTIQUES à l'octet près, donc `adjustFontFallback` calcule exactement le
 * même repli et le décalage cumulé ne bouge pas. C'est vérifié, pas supposé.
 *
 * `weight` déclare la plage RÉELLE de l'axe du fichier. Annoncer « 300 700 »
 * au-dessus d'un fichier qui s'arrête à 500 n'échouerait nulle part : le
 * navigateur bornerait la valeur et rendrait un poids qui n'est pas celui
 * demandé. Le script de préparation refuse de rendre vert si les deux
 * divergent.
 */
export const policeMono = localFont({
  src: '../polices/spline-sans-mono-registre.woff2',
  weight: '400 500',
  style: 'normal',
  display: 'swap',
  variable: '--police-mono',
  adjustFontFallback: 'Arial',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace'],
  preload: true,
});
