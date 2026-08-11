import Link from 'next/link';

import { CATALOGUE } from '@/donnees/catalogue';
import { marchand } from '@/donnees/marchand';
import { CODES_ZONE } from '@/lib/types';

/**
 * LE PIED DE PAGE — la signature monument et le registre.
 *
 * ---------------------------------------------------------------------------
 * LE FOND EST L'ENCRE, et c'est un arbitrage : le plan directeur ne le fixait pas
 * ---------------------------------------------------------------------------
 *
 * Le plan directeur décrit une signature monument et une organisation en
 * registre ; il laisse le fond du pied ouvert. Trois candidats, un seul tient :
 *
 * - la COQUILLE (le fond du site) ne clôt rien. Un pied de la même couleur que
 *   la page est un paragraphe de plus, et la page finit par s'éteindre au lieu
 *   de se fermer ;
 * - le PAPIER (#EDE8DC, le fond doux, celui du pied de C1 à C12) ferme d'un
 *   ton, à 1,12:1 de la coquille. C'est un fond d'encart, pas une fermeture ;
 * - l'ENCRE (#1C211A) ferme pour de bon. Le concept directeur est la mise en
 *   conserve : le pied est le fond de la boîte, et une boîte ne se termine pas
 *   par une nuance de son couvercle.
 *
 * Et l'encre fait une chose qu'aucun des deux autres ne fait : elle DONNE ENFIN
 * SON EMPLOI À `--color-bleu-clair`. C12 a posé cet accent en écrivant qu'il ne
 * vaut rien sur coquille (2,10:1) et 6,65:1 sur encre, et qu'il est « réservé
 * aux fonds encre » — alors qu'aucun fond encre n'existait dans le site. Le
 * pied de page est le premier, et le survol des liens légaux est le premier
 * emploi juste de ce jeton.
 *
 * TROIS ENCRES ET PAS UNE DE PLUS, toutes recalculées sur #1C211A :
 *
 *   coquille    #F2ECE1  13,93:1  tout le texte, sans exception
 *   bleu-clair  #7FA6E8   6,65:1  le survol des liens
 *   filet-fort  #8B8471   4,40:1  les filets — et RIEN d'autre : c'est au-dessus
 *                                 du seuil de 3:1 des éléments graphiques, en
 *                                 dessous des 4,5:1 du texte
 *
 * `--color-filet`, lui, n'entre pas : C12 l'a déclaré DÉCOR SEUL, et le
 * promouvoir en couleur de texte parce qu'il se trouve valoir 10,60:1 sur
 * l'encre reviendrait à lui donner deux doctrines selon le fond. Un pied de
 * page à deux tons de texte aurait été plus riche ; il aurait aussi été moins
 * vrai.
 *
 * La bague de focus à deux tons de C12 trouve ici sa raison d'être : sur
 * l'encre, le trait d'encre disparaît et c'est le halo de coquille qui montre
 * où est le clavier. Ce pied de page est le premier endroit du site où le
 * second ton sert.
 *
 * ---------------------------------------------------------------------------
 * Le registre : trois nombres, tous CALCULÉS, aucun écrit
 * ---------------------------------------------------------------------------
 *
 * Les trois lignes du registre se déduisent du catalogue versionné et de la
 * liste des zones. Elles ne sont pas recopiées : un nombre recopié se périme au
 * premier produit ajouté, et un pied de page qui annonce quinze produits devant
 * seize est exactement le genre de petit mensonge que ce projet passe son temps
 * à écarter.
 *
 * ---------------------------------------------------------------------------
 * Ce qui ne change pas : tout ce que ce pied doit DIRE
 * ---------------------------------------------------------------------------
 *
 * Les cinq documents légaux (bascule C7 : ils étaient en texte avec la mention
 * « à venir » tant qu'ils n'existaient pas — un lien mort valant moins qu'un
 * inventaire honnête, et coûtant en plus une page 404 aux robots), l'aveu de
 * fiction, la phrase sur les gabarits et la ligne de copyright sont conservés
 * au mot près. Le pied de page change de forme, jamais de propos.
 *
 * Le lien vers le formulaire de rétractation téléchargeable n'est toujours PAS
 * ici : il vit sur `/retractation`, à côté du modèle qu'il reproduit. Proposer
 * le téléchargement d'un formulaire à quelqu'un qui n'a pas lu à quelles
 * conditions il s'exerce serait le pousser à l'envoyer pour rien.
 */
const DOCUMENTS_LEGAUX = [
  { libelle: 'Mentions légales', adresse: '/mentions-legales' },
  {
    libelle: 'Conditions générales de vente',
    adresse: '/conditions-generales-de-vente',
  },
  { libelle: 'Données personnelles et cookies', adresse: '/donnees-personnelles' },
  { libelle: 'Droit de rétractation', adresse: '/retractation' },
  {
    libelle: 'À propos de cette démonstration',
    adresse: '/a-propos-de-cette-demonstration',
  },
] as const;

const ANNEE_COURANTE = 2026;

const NOMBRE_FORMATS = CATALOGUE.reduce(
  (total, produit) => total + produit.variantes.length,
  0,
);

/** Trois données sérielles, lues du catalogue versionné et des zones. */
const REGISTRE = [
  { intitule: 'Catalogue', valeur: `${String(CATALOGUE.length)} produits` },
  { intitule: 'Références', valeur: `${String(NOMBRE_FORMATS)} formats` },
  { intitule: 'Expédition', valeur: `${String(CODES_ZONE.length)} zones` },
] as const;

/**
 * LES LIENS LÉGAUX SONT SOULIGNÉS AU REPOS, et ce n'est pas un détail de goût.
 *
 * Le premier jet les laissait nus, avec un soulignement au survol seulement.
 * Dans un pied de page où l'étiquette de colonne, les intitulés du registre et
 * les cinq liens partagent la même police, la même casse, le même corps et la
 * même couleur, RIEN ne disait plus lesquels étaient cliquables — et un survol
 * n'existe pas sous le doigt. C'était une régression contre C7, dont tout le
 * propos était que ces cinq documents cessent d'être du texte pour devenir cinq
 * vrais liens.
 *
 * Le patron est celui posé dans `not-found.tsx` à la même tranche : trait de
 * `--color-filet-fort`, deux pixels, décalé de quatre. Sur l'encre il vaut
 * 4,40:1 — au-dessus du seuil de 3:1 des éléments graphiques, et c'est la seule
 * chose qu'on lui demande. Au survol, le trait rejoint le texte sur
 * `--color-bleu-clair` (6,65:1).
 */
const CLASSE_LIEN =
  'etiquette text-coquille underline decoration-filet-fort decoration-2 underline-offset-4 hover:text-bleu-clair hover:decoration-bleu-clair';

export function PiedDePage() {
  return (
    /* `data-chrome-pied` : le pendant de `data-chrome-entete`. Voir l'en-tête
       pour le motif — la feuille d'impression ne masque plus des BALISES, elle
       masque les deux organes de la coquille, qui se déclarent. */
    <footer className="mt-16 bg-encre text-coquille" data-chrome-pied>
      <div className="mx-auto max-w-page px-5 pt-16 pb-12 sm:px-8 sm:pt-20">
        <p className="font-titre text-monument text-coquille uppercase">
          {marchand.nom.split(' ').map((mot) => (
            <span key={mot} className="block">
              {mot}
            </span>
          ))}
        </p>

        <div className="mt-12 grid gap-10 border-t border-filet-fort pt-10 sm:grid-cols-2 sm:gap-12">
          <div>
            <p className="etiquette border-b border-filet-fort pb-3 text-coquille">La maison</p>
            <p className="registre mt-3 text-coquille">{marchand.baseline}</p>
            <p className="mt-6 max-w-lisible text-sm leading-relaxed text-coquille">
              Démonstration — épicerie fictive. Aucune commande n’est expédiée, aucun
              paiement n’est encaissé.
            </p>

            <dl className="registre mt-8 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-filet-fort pt-4 text-coquille">
              {REGISTRE.map((ligne) => (
                <div key={ligne.intitule} className="col-span-2 grid grid-cols-subgrid">
                  <dt className="etiquette self-center text-coquille">
                    {ligne.intitule}
                  </dt>
                  <dd className="text-right">{ligne.valeur}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* DEUX INTITULÉS DE COLONNE, DEUX NATURES : le deferred m8 de C13.
              « La maison » était un `<p>`, « Documents légaux » un `<h2>` —
              même classe, même rang dans la même grille, et deux contributions
              différentes au plan du document.

              L'harmonisation se fait VERS LE BAS, et pour une raison qui se
              vérifie sur une page légale : cet organe est de la coquille, rendu
              sur les quarante-six routes. Un `<h2>` y place « Documents
              légaux » au rang exact de « Article 1 — Objet et champ
              d'application » dans le plan des conditions générales, où il n'a
              rien à faire.

              Ce que le titre servait vraiment — nommer un groupe de liens pour
              qui navigue au clavier ou à la synthèse vocale — est rendu par ce
              qu'il est : un point de repère de NAVIGATION. Un `<nav>` est un
              point de repère, il prend son nom de son intitulé, et ce nom
              s'annonce sans peser sur le plan. Les deux colonnes redeviennent
              symétriques. */}
          <div>
            <nav aria-labelledby="pied-documents-legaux">
              <p
                id="pied-documents-legaux"
                className="etiquette border-b border-filet-fort pb-3 text-coquille"
              >
                Documents légaux
              </p>
              <ul className="mt-4 space-y-2.5">
                {DOCUMENTS_LEGAUX.map((document) => (
                  <li key={document.adresse}>
                    <Link href={document.adresse} className={CLASSE_LIEN}>
                      {document.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {/* La note reste HORS du point de repère : un point de repère de
                navigation contient des liens, pas la prose qui les explique. */}
            <p className="mt-6 max-w-lisible text-sm leading-relaxed text-coquille">
              Ces documents sont des gabarits&nbsp;: les emplacements que remplit le
              marchand y sont surlignés, et aucune donnée d’entreprise n’a été inventée
              pour les remplir.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-filet-fort">
        <p className="registre mx-auto max-w-page px-5 py-5 text-coquille sm:px-8">
          © {ANNEE_COURANTE} {marchand.nom} — maison fictive, boutique de
          démonstration.
        </p>
      </div>
    </footer>
  );
}
