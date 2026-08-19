import type { Metadata } from 'next';
import Link from 'next/link';

import { EncartFiction } from '@/composants/demonstration/EncartFiction';
import { VideoHeros } from '@/composants/illustrations/VideoHeros';
import { Visuel } from '@/composants/illustrations/Visuel';
import { CATALOGUE } from '@/donnees/catalogue';
import { marchand } from '@/donnees/marchand';
import { URL_SITE } from '@/donnees/site';
import { CLEF_ACCUEIL, HEROS_ACCUEIL, MACROS_FAMILLE } from '@/donnees/visuels-editoriaux';
import { styleDeFamille } from '@/lib/vitrine';
import { FAMILLES, LIBELLE_FAMILLE } from '@/lib/types';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: URL_SITE,
    images: [
      {
        url: `${URL_SITE}/editorial/${CLEF_ACCUEIL}/partage-1200x630.jpg`,
        width: 1200,
        height: 630,
        alt: HEROS_ACCUEIL.alt,
      },
    ],
  },
};

/**
 * L'ACCUEIL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE HÉROS EST À CÔTÉ DU MONUMENT, PAS DESSOUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le plan directeur décrit un monument typographique posé sur la moitié droite
 * vide de la macro. Le texte SUR l'image a été écarté, et pour la raison qui a
 * déjà écarté l'en-tête transparent en C13 : un texte posé sur une photographie
 * n'a pas de contraste MESURABLE — il a celui du pixel qui passe derrière, et
 * ce projet vend des contrastes mesurés. Un voile dégradé aurait rendu le
 * contraste calculable au prix d'un voile sur la photographie, c'est-à-dire en
 * abîmant ce qu'on venait montrer.
 *
 * Le monument est donc à CÔTÉ, sur la coquille (encre sur coquille, 13,93:1), et
 * la moitié droite vide de la macro fait ce qu'elle sait faire : de l'air dans
 * l'image, en face du texte. La composition tient la promesse du geste, sans le
 * défaut.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LE HÉROS EST PRIORITAIRE, ET IL EST LE SEUL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le plus grand affichage de contenu de la page : il part en chargement
 * empressé et en priorité haute. Les sept macros de famille, elles, ne partent
 * jamais tant que personne ne survole (voir `globals.css`, section « la
 * vitrine ») : sept images de bandeau téléchargées d'avance sur un premier
 * écran coûteraient plus cher que tout le reste de la page.
 *
 * PAS DE LQIP. Le plan l'autorisait pour le héros seul ; il n'est pas posé. La
 * couleur de réservation, mesurée sur le recadrage, fait déjà ce qu'un LQIP
 * fait — empêcher le rectangle blanc — et un aperçu en base64 aurait ajouté un
 * ou deux kilooctets À L'INTÉRIEUR DU HTML, donc sur le chemin critique, sur la
 * page dont la note de rapidité est mesurée. « Autorisé » n'est pas « requis »,
 * et la tranche a pour consigne de ne plus ouvrir de gisement d'octets.
 */

/** Les sept familles, avec leur rang — le rang sert aux sélecteurs `:has()`. */
const RANGEE = FAMILLES.map((famille, position) => ({
  famille,
  rang: position + 1,
  nombre: CATALOGUE.filter((produit) => produit.famille === famille).length,
}));

export default function PageAccueil() {
  return (
    <div className="mx-auto max-w-page px-5 sm:px-8">
      {/*
        « LA MISE EN BOUTEILLE » — la signature ① du plan, VERSION MASQUÉE (C19).

        Chaque ligne monte de sa propre hauteur derrière un masque INVISIBLE,
        découpé au ras d'elle-même. Rien n'apparaît par-dessus le premier écran :
        le texte sort de sous une ligne de coupe, et c'est tout ce qui bouge.

        DEUX RETOURS CLIENT ONT CONDUIT ICI. Le premier, le 10/08 au matin sur le
        fondu de C18 : « beaucoup trop discrète » — l'orchestrateur avait
        d'abord vérifié que le geste JOUAIT (il jouait, série relevée sur le
        déployé), donc pas une panne, une intensité. La réponse fut un geste
        d'une autre nature : un bloc plein qui balayait chaque ligne. Le second,
        le même soir, sur ce bloc : « de grands rectangles noirs pas très
        esthétiques », confirmé de visu — à mi-course les cinq blocs se
        chevauchaient en une masse d'encre difforme. Le bloc est ABANDONNÉ.

        CE QUI EST GARDÉ DE LA VERSION REJETÉE : l'énergie (une course d'une
        hauteur de ligne, pas un fondu de vingt pixels), l'étagement, le
        découpage mot par mot du monument. CE QUI EST SUPPRIMÉ : toute matière
        colorée. Le masque n'est qu'un `clip-path`.

        DEUX ÉLÉMENTS PAR LIGNE, ET C'EST NÉCESSAIRE : l'enveloppe porte le
        masque et ne bouge jamais, l'élément intérieur porte le texte et monte.
        Les mêler ferait monter le masque avec ce qu'il masque.

        LES RANGS SONT ESPACÉS — 1, 3, 5, 6 au lieu de 0, 1, 2, 3. Le vocabulaire
        de D37 est inchangé (`--decalage-cascade` de 70 ms, plafond de six rangs,
        atteint ici par la dernière ligne) : c'est l'ÉTAGEMENT qui change, de
        210 ms d'écart total à 420, pour qu'on voie quatre gestes et non un seul
        épais.

        CE QUE CETTE SIGNATURE NE FAIT PAS : elle ne touche pas à l'image. Le
        raisonnement — et les trois manières fermées d'animer un premier écran —
        est écrit à l'endroit de la règle, dans `globals.css`.
      */}
      <section className="grid items-center gap-8 pt-10 pb-12 sm:pt-14 lg:grid-cols-2 lg:gap-x-14 lg:pt-16 lg:pb-16">
        {/* `colonne-monument` fait de cette colonne un CONTENEUR DE REQUÊTE, et
            c'est tout ce que le composant a à savoir : le corps du monument est
            plafonné en pour-cent de cette largeur, dans `globals.css`, à
            l'endroit où le raisonnement et les mesures sont écrits. Sans ce
            conteneur, le mot « Vaubrune » sort de sa colonne et passe sur la
            carte au-delà de 1 472 px de fenêtre — retour client du 10/08. */}
        {/* LE HÉROS RESTE SUR LE MARBRE, ENTIÈREMENT, ET LE DÉCLARE (C19).
            Trois raisons, dont deux sont mécaniques et non esthétiques :

            1. `colonne-monument` est un CONTENEUR DE REQUÊTE et le corps du
               monument est plafonné en `cqi` de sa largeur. Un panneau à
               remplissage RÉTRÉCIT le conteneur, donc RAPETISSE le monument —
               c'est-à-dire défait le réglage arraché au retour client de C18.
            2. Les lignes de la signature montent derrière un `clip-path`. Un
               fond posé derrière le masque change ce qui est peint pendant le
               geste, et la mesure « aucun pixel d'encre ajouté » cesse d'être
               vérifiable.
            3. Un héros est une COMPOSITION, pas de la lecture suivie. La
               matière est ce qu'on doit y voir.

            Mesuré au pixel, pas supposé : le pire couple du héros vaut 5,67
            contre la veine la plus sombre, pour un seuil AA petit texte de
            4,50. */}
        <div className="colonne-monument lg:order-1" data-sur-marbre data-titre-anime>
          <p
            className="etiquette text-ocre"
            data-signature="ligne"
            style={{ '--rang-signature': 1 } as React.CSSProperties}
          >
            <span data-signature="texte">Épicerie fine régionale</span>
          </p>
          {/* LE MONUMENT MONTE MOT PAR MOT, ET CE N'EST PAS UN RAFFINEMENT.
              Écrit d'un seul tenant, il tiendrait dans UNE enveloppe, donc sous
              UN masque — et un masque qui enferme deux lignes de cent quarante
              pixels ferait monter le second mot depuis le bas du premier, sur
              deux hauteurs de ligne. Deux mots, deux masques, deux rangs :
              chacun sort de sa propre ligne. La granularité s'arrête là —
              jamais la lettre, qui ferait quatorze rangs pour un plafond de six
              et transformerait « la matière lente » en machine à écrire. */}
          <h1 className="monument-heros mt-5 text-monument text-encre">
            {marchand.nom.split(' ').map((mot, position) => (
              <span
                key={mot}
                className="monument-mot"
                data-signature="ligne"
                style={{ '--rang-signature': 2 + position } as React.CSSProperties}
              >
                <span data-signature="texte">{mot}</span>
              </span>
            ))}
          </h1>
          {/* LA BASELINE EST À L'ENCRE PLEINE, ET C'EST LE MARBRE QUI L'A
              DÉCIDÉ. Elle héritait de `data-sur-marbre` posé sur la colonne,
              donc elle repose sur la matière ; à vingt-deux pixels, elle est du
              PETIT texte au sens de WCAG 1.4.3 (le seuil de 3,00 commence à
              vingt-quatre). En encre douce elle valait 4,09 contre la veine la
              plus sombre — sous les 4,50 requis dès que le voile s'est ouvert.
              L'encre pleine vaut 8,48 au même endroit, et 7,0 encore à 0,60 de
              voile : la ligne cesse de dépendre du réglage du fond. */}
          <p
            className="mt-6 max-w-lisible text-chapeau text-encre"
            data-signature="ligne"
            style={{ '--rang-signature': 5 } as React.CSSProperties}
          >
            <span data-signature="texte">{marchand.baseline}.</span>
          </p>
          {/* LA SEULE LIGNE QUI N'EST PAS MASQUÉE, ET C'EST L'ACCESSIBILITÉ QUI
              LE DÉCIDE. Le masque des autres lignes est un `clip-path`, et un
              `clip-path` coupe tout ce que ses descendants peignent — la bague
              de focus comprise, qui déborde de douze pixels sur ce site. Ce
              bouton est le seul élément focalisable du premier écran :
              `data-signature-libre` lui laisse la montée et le fondu, sans
              masque et avec une course courte. Le raisonnement complet est à
              l'endroit de la règle, dans `globals.css`. */}
          <p
            className="mt-8"
            data-signature="ligne"
            data-signature-libre
            style={{ '--rang-signature': 6 } as React.CSSProperties}
          >
            <Link
              href="/boutique"
              className="etiquette inline-block rounded-sm bg-encre px-5 py-3 text-coquille no-underline hover:bg-olive-clair hover:text-encre"
              data-signature="texte"
            >
              Voir le rayon
            </Link>
          </p>
        </div>

        <figure className="cadre-photo rounded-sm lg:order-2" data-signature="macro">
          {/* LA PHOTOGRAPHIE ET LA VIDÉO OCCUPENT LA MÊME BOÎTE, dans cet
              ordre. La première est le plus grand affichage de contenu de la
              page et le reste : elle part en priorité haute, elle décide de la
              hauteur, elle est ce que tout le monde voit. La seconde est posée
              par-dessus, à l'opacité nulle, et ne se montre qu'une fois qu'elle
              joue réellement — donc bien après la mesure. Le raccord entre les
              deux (la macro montre une couronne pleine, la vidéo ouvre sur un
              creux d'impact) se règle par ce fondu, jamais par un saut. */}
          <div className="scene-heros">
            <Visuel
              slug={CLEF_ACCUEIL}
              racine="editorial"
              vue="hero"
              donnees={HEROS_ACCUEIL}
              sizes="(min-width: 64rem) 44rem, 92vw"
              prioritaire
              impression="masquer"
            />
            <VideoHeros />
          </div>
          {/* PLUS DE LÉGENDE SOUS LA MATIÈRE (retour client n° 22). Elle disait
              « Huile d'olive de première pression — matière » à un visiteur qui
              voit l'huile couler ; l'alternative textuelle, elle, reste entière
              pour qui ne la voit pas. Le raisonnement complet est en tête de
              `HerosIllustre`, qui porte le même retrait sur les sept autres. */}
        </figure>
      </section>

      {/* LA PREMIÈRE ZONE RÉVÉLÉE DE L'ACCUEIL. L'enveloppe est un `div` nu :
          il ne pose ni bordure, ni remplissage, si bien que les marges de
          l'encart le traversent et que rien ne bouge d'un pixel. Poser
          l'attribut sur l'encart lui-même aurait demandé de rendre
          `EncartFiction` conscient du mouvement, pour un composant dont c'est
          le contraire du sujet. */}
      <div data-revelation>
        <EncartFiction />
      </div>

      {/*
        LA RANGÉE DES FAMILLES.

        Sept noms, un cadre, et le survol d'un nom fait monter sa macro dans le
        cadre. Tout le mécanisme est dans `globals.css` : `:has()` sur le
        conteneur, une couche par famille, et l'image déclarée seulement dans la
        règle de survol — donc téléchargée seulement au survol.

        Le cadre est `aria-hidden` et il le mérite : ce qu'il montre est une
        matière, le contenu est le nom de la famille et le lien qui le porte. Un
        lecteur d'écran lit sept liens vers sept ancres du rayon, ce qui est
        exactement ce que cette section fait.
      */}
      {/* LE BANDEAU DÉFILANT DES SEPT FAMILLES A ÉTÉ RETIRÉ (décision client,
          C19). Il vivait ici, entre l'encart de fiction et la rangée : une
          piste typographique pilotée par le défilement, sans un octet de
          JavaScript. Verdict du client sur la prévisualisation : « ne sert pas
          grand-chose » — la rangée ci-dessous, qui porte les mêmes sept noms en
          sept liens ET leurs macros, assure déjà la navigation, et le bandeau
          n'était qu'un écho muet posé au-dessus d'elle.

          Ce qui part avec lui : la piste dupliquée, la translation de −50 %,
          `animation-timeline: view()` et son garde `@supports`. La démonstration
          technique reste écrite dans l'ADR 011 — le site, lui, n'a pas à porter
          un ornement pour prouver qu'on savait le faire. */}

      <section aria-labelledby="titre-familles" className="familles py-14 sm:py-20">
        <div
          className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2"
          data-revelation
        >
          <h2 id="titre-familles" className="text-titre text-encre">
            Sept familles
          </h2>
          <p className="etiquette text-encre tabular-nums">
            {CATALOGUE.length} références
          </p>
        </div>

        {/* LES SEPT FAMILLES SE VOIENT, SANS QU'ON AIT RIEN À SURVOLER (C23).

            CE QUI ÉTAIT LÀ, ET POURQUOI ÇA NE POUVAIT PAS MARCHER. Les macros
            montaient dans un cadre d'aperçu unique, au survol du nom, par un
            `:has()` en CSS pur — un mécanisme élégant et mesuré, qui ne coûtait
            rien à qui ne survolait pas. Mais le cadre portait `hidden lg:block`,
            donc en deçà de 64 rem il était en `display: none` et AUCUNE image
            n'était jamais demandée. Pas « pas de survol sur téléphone » : zéro
            image sur tout écran sous 1 024 px, quel que soit le geste. Sept noms
            de famille en texte nu, et un professionnel du commerce en ligne qui
            écrit « d'un œil on ne comprend pas ce que fait la marque ».

            LA GRILLE NE LAISSE JAMAIS D'ORPHELIN, ET C'EST CE QUI FIXE SA FORME.
            Sept tuiles, c'est un nombre premier — toute grille régulière laisse
            un trou. La première occupe DEUX colonnes : il reste six tuiles, donc
            trois rangs pleins à deux colonnes et un rang et demi à quatre. Deux
            paliers suffisent, et le remplissage est exact aux deux.

            LE BRIDAGE EST ASYMÉTRIQUE, ET C'EST LUI QUI TIENT LE BUDGET. Les six
            petites tuiles sont servies en 320 (`largeurMaximale`), la première en
            1024 — elle est deux fois plus large, et se trouve être la plus légère
            des sept (3,7 Ko contre 10,9 pour les infusions). Sans bridage, un
            écran dense demanderait 131,7 Ko ; avec, ~60 Ko sur TOUS les profils.
            C'est la leçon de C15 rejouée : le plafond cesse d'être une propriété
            de l'appareil qui mesure. Prix assumé, écrit plutôt que tu — sur un
            bureau à densité 2, les six petites tuiles sont adoucies d'un facteur
            2, exactement l'échange que C15 a consenti pour les vignettes du
            rayon, et sur des macros, qui sont floues par nature.

            LE LIBELLÉ EST EN SURIMPRESSION, PAS SOUS LA TUILE. Ce n'est pas un
            parti pris graphique : un libellé dans le flux, rendu en registre
            mono, change de nombre de lignes à l'arrivée des polices et fait
            refluer sept tuiles d'un coup. Hors du flux, il ne peut pas. C'est le
            correctif de C13 appliqué d'avance plutôt que mesuré après. */}
        <ul className="tuiles-familles mt-8">
          {RANGEE.map((entree) => (
            <li
              key={entree.famille}
              data-revelation
              data-revelation-retard={Math.min(entree.rang, 6)}
              style={styleDeFamille(entree.famille)}
            >
              <Link
                href={`/boutique#rayon-${entree.famille}`}
                className="tuile-famille no-underline"
              >
                <Visuel
                  slug={entree.famille}
                  racine="editorial"
                  vue="macro"
                  donnees={MACROS_FAMILLE[entree.famille]}
                  alternative="decorative"
                  largeurMaximale={entree.rang === 1 ? 1024 : 320}
                  sizes={
                    entree.rang === 1
                      ? '(min-width: 90rem) 42rem, (min-width: 40rem) 46vw, calc(100vw - 2.5rem)'
                      : '(min-width: 90rem) 20rem, (min-width: 40rem) 22vw, calc(50vw - 1.6rem)'
                  }
                />
                <span className="tuile-cartouche">
                  <span className="font-titre text-titre text-coquille">
                    {LIBELLE_FAMILLE[entree.famille]}
                  </span>
                  <span className="etiquette text-coquille tabular-nums">
                    {String(entree.nombre).padStart(2, '0')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
