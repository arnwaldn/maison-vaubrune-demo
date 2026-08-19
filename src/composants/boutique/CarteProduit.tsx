import Link from 'next/link';

import { Silhouette } from '@/composants/illustrations/Silhouette';
import { Visuel } from '@/composants/illustrations/Visuel';
import {
  EtiquettesVitrine,
  PrixLePlusBasVitrine,
  ResumeVitrine,
} from '@/composants/surcouche/FeuillesVitrine';
import { CATALOGUE } from '@/donnees/catalogue';
import { fondImage, ligneDeGarde, rangInventaire, styleDeFamille } from '@/lib/vitrine';
import { exigeChaineDuFroid, type Produit } from '@/lib/types';

/**
 * UNE VIGNETTE DU RAYON.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUI NE CHANGE PAS DEPUIS C6
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - Le prix affiché est un « à partir de » DÉRIVÉ des variantes, jamais une
 *   valeur saisie une seconde fois. Un prix recopié dans la grille finit par
 *   contredire la fiche.
 * - Le badge « frais » se déduit de la chaîne du froid, pas de la famille
 *   (décision D9) : le jour où un coffret contiendra du beurre, il portera le
 *   badge sans qu'on y touche.
 * - La carte entière est cliquable, mais le nom du produit reste le texte du
 *   lien : c'est lui qu'annonce un lecteur d'écran, pas « lire la suite ».
 * - La carte reste un composant SERVEUR. Trois de ses valeurs (le résumé, le
 *   « à partir de », les étiquettes) passent par des feuilles clientes qui
 *   rendent la valeur d'origine puis basculent sur celle de la surcouche
 *   marchand après montage — MÊMES CLASSES, MÊMES ÉLÉMENTS (invariant C6). Les
 *   variantes ne traversent la frontière que réduites à `{ sku, prixCentimes }`
 *   (décision D17).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CE QUE C15 AJOUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA PHOTOGRAPHIE, et un fondu croisé vers la vue d'ambiance au survol. La
 * mécanique complète — pourquoi la seconde image est un fond CSS et non une
 * balise, ce que cela coûte et ce que cela économise — est écrite dans
 * `globals.css`, section « la vitrine ». En deux lignes : quinze ambiances de
 * plus en `<img>` feraient passer le rayon de 128 à 250 Ko d'images pour un
 * plafond de 180 (décision D36), et le chargement paresseux ne fait que
 * différer la dépense. Ici, elle n'a lieu qu'au survol.
 *
 * LE REGISTRE, qui monte au survol : le poids et la garde, calculés depuis le
 * catalogue (`ligneDeGarde`), et le rang d'inventaire, qui est la position
 * réelle du produit dans `CATALOGUE`. Rien d'inventé — c'est la contrainte que
 * la nomenclature sérielle du plan directeur devait respecter, et le seul
 * moyen de la respecter était de ne rien saisir.
 *
 * LE BADGE « SÉLECTION » EST DEVENU CE QU'IL ÉTAIT. Il s'écrivait
 * `text-[0.6875rem] uppercase tracking-…` — c'est-à-dire la définition exacte
 * de l'utilitaire `etiquette` de C13, recopiée à la main. Une étiquette qui
 * s'ignore : elle vivait à côté du jeton au lieu d'en descendre, et elle ne
 * suivait donc aucune des évolutions du système. Corrigé dans `FeuillesVitrine`,
 * où il est écrit, et non ici.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA HAUTEUR EST RÉSERVÉE, TOUJOURS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le cadre de l'image porte `aspect-ratio` et la couleur de réservation du
 * visuel : la place existe avant le premier octet. Le registre, lui, est dans
 * le flux EN PERMANENCE — il ne se révèle qu'en opacité et en translation, deux
 * propriétés qui ne poussent rien. C'est la leçon de C13 : un décalage cumulé
 * naît d'une mise en page dont les dimensions dépendent du contenu, pas d'une
 * animation.
 */

/**
 * LA LARGEUR SERVIE DANS LA CARTE — pour les DEUX vues, et c'est un plafond.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'ARITHMÉTIQUE QUI DÉCIDE, ET ELLE NE LAISSE PAS LE CHOIX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La décision D36 plafonne `/boutique` à 180 Ko d'images. Le rayon en montre
 * QUINZE. Les trois largeurs produites, additionnées quinze fois :
 *
 *   | largeur | AVIF     | repli JPEG |
 *   |---------|----------|------------|
 *   | 320     | 128,6 Ko |  178,9 Ko  |
 *   | 480     | 247,7 Ko |  344,6 Ko  |
 *   | 640     | 387,0 Ko |  551,9 Ko  |
 *
 * 320 est la SEULE largeur qui tienne, et elle tient jusque dans son repli
 * JPEG, à 1,1 Ko près. Il n'y a donc rien à arbitrer : la vignette est bridée à
 * 320 sur tous les profils, et le plafond cesse d'être une propriété de
 * l'appareil qui mesure. Sans ce bridage, un bureau à la densité 2 téléchargeait
 * 387 Ko — le `sizes` annonce 20 rem, le navigateur double, et il a raison.
 *
 * CE QUE CE BRIDAGE COÛTE, écrit plutôt que tu : sur un écran dense, la vignette
 * est servie en 320 pour une place de 403 points, donc adoucie. C'est le prix du
 * mur, et c'est le bon échange — la fiche, elle, sert du 640, et c'est là qu'on
 * regarde le produit. L'écart est au rapport de tranche.
 */
const LARGEUR_CARTE = 320;

/**
 * LE PLAFOND DE LA CASCADE, ET IL EST TENU ICI (D37).
 *
 * Soixante-dix millisecondes entre deux vignettes, six rangs au plus. Le
 * plafond n'est pas une coquetterie : sans lui, une famille de sept références
 * ferait attendre la dernière une demi-seconde de plus que la première, ce qui
 * n'est plus une cascade mais une file d'attente. Il est tenu par le composant
 * qui COMPTE, jamais par la feuille de style — une feuille ne sait pas
 * combien d'éléments une famille contient.
 */
const RANGS_DE_CASCADE = 6;

/**
 * La place que la carte occupe VRAIMENT, selon qui la pose.
 *
 * Le rayon la range en grille (trois colonnes au plus) ; le rail de l'accueil
 * la range en file, où elle vaut 74 % de la fenêtre sur un téléphone. Deux
 * places différentes, donc deux `sizes` — et `Visuel` avertit qu'« un `sizes`
 * faux est pire qu'absent ».
 *
 * En pratique `largeurMaximale` réduit le `srcset` à une seule entrée, donc
 * `sizes` n'a rien à départager et reste inerte. Il est quand même juste :
 * laisser dans le HTML livré une chaîne qui décrit une grille à trois colonnes
 * sous un rail à 30 % serait un commentaire faux, et un commentaire faux
 * survit à la raison qui l'avait rendu inoffensif.
 */
const SIZES_RAYON = '(min-width: 64rem) 25rem, (min-width: 40rem) 45vw, 81vw';

export function CarteProduit({
  produit,
  rangDansLaFamille = 0,
  sizes = SIZES_RAYON,
}: {
  readonly produit: Produit;
  /** La place occupée, si l'appelant ne range pas la carte comme le rayon. */
  readonly sizes?: string;
  /**
   * Le rang de la vignette dans sa famille, pour la cascade de révélation.
   *
   * Il a une VALEUR PAR DÉFAUT, et c'est ce qui permet à un appelant qui ne
   * cascade pas d'employer la carte sans rien savoir du mouvement : elle se
   * révèle alors sans retard, ce qui est le comportement juste pour une carte
   * isolée.
   */
  readonly rangDansLaFamille?: number;
}) {
  const frais = exigeChaineDuFroid(produit.conservation);
  const prix = produit.variantes.map((variante) => ({
    sku: variante.sku,
    prixCentimes: variante.prixCentimes,
  }));
  const rang = rangInventaire(CATALOGUE, produit.slug);
  const garde = ligneDeGarde(produit);
  const principal = produit.visuel?.principal;
  const ambiance = produit.visuel?.ambiance;

  /**
   * LE FONDU CROISÉ A LIEU DÈS QU'IL Y A DEUX VUES — L'EXCLUSION DES COFFRETS
   * EST ANNULÉE (retour client n° 16, C19-ter).
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *  CE QUE C15 AVAIT DÉCIDÉ, ET POURQUOI CE N'ÉTAIT PAS UNE FAUTE
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * La vue principale d'un coffret est un 4:3 de coffret fermé, sa seconde vue
   * le zénithal 4:5 de la série E : deux rapports, deux points de vue, deux
   * distances. C15 en avait conclu que les faire passer l'un dans l'autre
   * « ferait sauter l'objet », et avait écrit la condition sur les DONNÉES
   * plutôt que sur la famille — les deux vues devaient partager le rapport.
   * L'écart était DÉCLARÉ au rapport de tranche (écart n° 2), pas subi.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *  LE CLIENT L'ANNULE, ET IL A REGARDÉ LES DEUX CARTES
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Retour du 11/08 : « les coffrets n'ont pas d'image de transition au
   * survol ». Deux vignettes sur quinze restaient inertes là où les treize
   * autres respirent, et cette inertie se lit comme une panne bien avant de se
   * lire comme une intention. C'est un ARBITRAGE DE GOÛT, et il appartient au
   * client : l'exclusion tombe.
   *
   * CE QUI REND LA BASCULE TENABLE, ET IL FAUT LE DIRE : `background-size:
   * cover` sur `.carte-ambiance` absorbe l'écart de rapport. La couche occupe
   * la boîte de la vue principale ; un zénithal 4:5 y est recadré par le haut
   * et par le bas, centré, jamais déformé. Ce qui « sauterait » serait un
   * changement de CADRAGE brutal — la respiration croisée de C19 (le packshot
   * s'ouvre de 1 à 1,03, la matière se pose de 1,05 à 1, 900 ms) est
   * précisément le geste qui le porte, et elle n'existait pas quand C15 a
   * tranché. La prémisse a changé, la conclusion suit.
   *
   * VÉRIFIÉ À L'ŒIL, pas seulement calculé : capture du coffret À MI-FONDU
   * (`preuves/c19/coffret-mi-fondu.png`, survol figé par l'API Web Animations),
   * regardée avant de livrer. Le cadrage `cover` centré garde le coffret entier
   * dans la boîte, sans rogner un angle ni couper un couvercle.
   *
   * La condition qui reste est la seule qui compte : il faut DEUX vues. Un
   * produit sans vue d'ambiance n'a rien à faire fondre.
   */
  const fonduCroise = principal !== undefined && ambiance !== undefined;

  /**
   * L'ANCRAGE DU RECADRAGE, ET IL SE DÉDUIT DES DONNÉES.
   *
   * `background-size: cover` retire de la matière dès que les deux vues n'ont
   * pas le même rapport. Quand la seconde est PLUS HAUTE que la boîte — c'est
   * le cas des deux zénithaux 4:5 dans une boîte 4:3 —, il retire une bande EN
   * HAUT et une EN BAS, à parts égales si l'ancrage reste au centre.
   *
   * Sur la série zénithale, ces deux bandes ne se valent pas, et la comparaison
   * a été faite SUR IMAGE (les quatre fenêtres possibles mises en planche,
   * `travaux-images/planche-crops-table.png`, regardées) : le haut du cadre
   * porte le COUVERCLE FERMÉ — c'est-à-dire une redite du packshot qu'on est en
   * train de quitter — et le bas porte le CONTENU, c'est-à-dire ce qu'on vient
   * voir. Au centre, le recadrage coupe le troisième bocal ; en bas, la caisse
   * ouverte tient entière dans la boîte.
   *
   * La condition porte sur les RAPPORTS et non sur la famille : un produit
   * qu'on illustrerait un jour d'un second frontal garderait l'ancrage centré
   * sans qu'on y touche, et un coffret dont la seconde vue redeviendrait un
   * frontal aussi.
   */
  const memeCadre =
    principal !== undefined &&
    ambiance !== undefined &&
    principal.largeur * ambiance.hauteur === ambiance.largeur * principal.hauteur;

  const style = {
    ...styleDeFamille(produit.famille),
    ...(fonduCroise
      ? { '--ambiance': fondImage('produits', produit.slug, 'ambiance', LARGEUR_CARTE) }
      : {}),
    ...(fonduCroise && !memeCadre ? { '--ambiance-ancrage': 'center bottom' } : {}),
  } as React.CSSProperties;

  return (
    <li
      /* PAS de `border-filet` ici, et c'est délibéré : la couleur du trait est
         posée par `.carte-produit` dans `globals.css`, faute de quoi le
         changement de couleur au survol perdrait contre l'utilitaire — il l'a
         perdu de la livraison au round 1. Le raisonnement complet est écrit à
         l'endroit de la règle. */
      className="carte-produit rounded-sm border p-3 sm:p-4"
      /* LE GESTE DE RÉVÉLATION EST UN ATTRIBUT POSÉ PAR LE SERVEUR (C17, D37).
         Il ne rend pas ce composant client, il ne coûte pas un octet de
         JavaScript, et sans script il ne fait rien : l'état masqué n'existe que
         sous `html.mouvement`, que le fournisseur pose après hydratation. Le
         contrôleur, lui, ne fait qu'ajouter `data-revele` — un attribut, jamais
         un style en ligne. */
      data-revelation
      data-revelation-retard={Math.min(rangDansLaFamille, RANGS_DE_CASCADE)}
      style={style}
    >
      <Link
        href={`/boutique/${produit.slug}`}
        className="group flex h-full flex-col gap-4 no-underline"
      >
        <span className="carte-visuel block rounded-sm">
          {produit.visuel === undefined ? (
            <span className="flex items-center justify-center py-6">
              <Silhouette
                forme={produit.illustration.forme}
                teinte={produit.illustration.teinte}
                hauteur={120}
              />
            </span>
          ) : (
            <>
              <Visuel
                slug={produit.slug}
                vue="principal"
                donnees={produit.visuel.principal}
                illustration={produit.illustration}
                /* DÉCORATIVE ICI, ET SEULEMENT ICI. Le texte du lien nomme déjà
                   le produit ; rendre l'alternative ferait commencer le nom
                   accessible du lien par « Bouteille de verre vert foncé… ». */
                alternative="decorative"
                /* La place RÉELLE, mesurée au navigateur sur les deux profils
                   de la campagne : 403 points sur un bureau de 1440 (trois
                   colonnes, gouttières et marges déduites), 316 sur un téléphone
                   de 390. L'ancienne valeur (20 rem / 16 rem / 40vw) sous-disait
                   la place partout, ce qui est une façon de tenir un budget sans
                   le dire. Le budget est désormais tenu par `largeurMaximale`,
                   qui est une décision ; `sizes` peut donc redire la vérité.
                   Depuis C23, la valeur vient de l'appelant : le rail de
                   l'accueil range la même carte tout autrement. */
                sizes={sizes}
                largeurMaximale={LARGEUR_CARTE}
                className="block"
              />
              {/* La couche de survol : vide tant que personne ne survole, et
                  absente pour les produits qui n'ont pas de seconde vue (voir
                  `fonduCroise` ci-dessus). */}
              {fonduCroise ? <span aria-hidden="true" className="carte-ambiance" /> : null}
            </>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          {rang === null ? null : (
            <span aria-hidden="true" className="etiquette text-encre-douce tabular-nums">
              N<sup>o</sup>&nbsp;{rang.rang} / {rang.total}
            </span>
          )}

          <span className="mt-2 block font-titre text-titre leading-tight text-encre">
            {produit.nom}
          </span>

          <ResumeVitrine
            slug={produit.slug}
            resume={produit.resume}
            className="mt-2 block text-sm leading-relaxed text-encre-douce"
          />

          {/* `mt-auto` colle le pied de carte au bas : sur une même rangée, les
              prix s'alignent quelle que soit la longueur des résumés. */}
          <span className="mt-auto block pt-4">
            <span className="carte-registre etiquette block text-encre-douce tabular-nums">
              {garde.map((segment, rangSegment) => (
                <span key={segment}>
                  {rangSegment === 0 ? null : (
                    <span aria-hidden="true" className="px-2 text-filet-fort">
                      ·
                    </span>
                  )}
                  {segment}
                </span>
              ))}
            </span>

            <span className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="registre text-encre">
                dès <PrixLePlusBasVitrine slug={produit.slug} variantes={prix} />
              </span>
              <EtiquettesVitrine
                slug={produit.slug}
                frais={frais}
                miseEnAvant={produit.miseEnAvant}
              />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
