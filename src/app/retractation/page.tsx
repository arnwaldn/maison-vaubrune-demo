import type { Metadata } from 'next';

import { AComplete } from '@/composants/demonstration/AComplete';
import { BoutonImprimer } from '@/composants/legal/BoutonImprimer';
import {
  CLASSE_ARTICLE,
  CLASSE_LIEN,
  CLASSE_LISTE,
  CLASSE_SOUS_TITRE,
  CLASSE_TEXTE,
  CLASSE_TITRE_ARTICLE,
  EncadreGabarit,
  EnTeteLegale,
  LienLegal,
  SommaireInterne,
  T,
  type EntreeSommaire,
} from '@/composants/legal/PageLegale';
import { CATALOGUE } from '@/donnees/catalogue';
import { CHAMPS } from '@/lib/champs-a-completer';
import { regimeRetractation, type Fondement } from '@/lib/retractation';

/**
 * DROIT DE RÉTRACTATION — le seul document du lot qui contient du GÉNÉRÉ.
 *
 * Reprise des brouillons `04-retractation.md` et `05-formulaire-retractation.md`,
 * prose intacte. Sept `<AComplete>` : quatre venus du premier, trois du modèle
 * officiel de formulaire.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi les deux brouillons ne font qu'une page
 * ---------------------------------------------------------------------------
 *
 * Les brouillons visaient deux adresses, `/retractation` et
 * `/formulaire-retractation`. La tranche C7 en livre une seule, et le
 * formulaire y devient la section 6. Motif : le formulaire type ne se lit
 * jamais seul — il se remplit APRÈS avoir vérifié qu'on est dans le délai et
 * que le produit n'est pas sous exception, c'est-à-dire après avoir lu les
 * sections 1 à 5. Deux pages auraient obligé le client à faire l'aller-retour
 * au moment précis où il compte ses quatorze jours. Les liens des brouillons
 * qui pointaient vers `/formulaire-retractation` visent l'ancre `#formulaire`.
 *
 * Conséquence de numérotation, signalée au compte rendu : « Sur cette
 * démonstration », section 6 du brouillon, devient la section 7.
 *
 * ---------------------------------------------------------------------------
 * Le tableau de la section 5.4 est ENGENDRÉ (décision D12)
 * ---------------------------------------------------------------------------
 *
 * Aucune phrase de rétractation n'est écrite dans ce fichier. Les quinze lignes
 * du tableau sortent de `regimeRetractation()` appliquée au catalogue —
 * la même fonction qui écrit la mention de chaque fiche produit et celle du
 * panier. C'est ce qui rend IMPOSSIBLE le défaut que ce document redoute :
 * qu'une référence soit annoncée dans un régime ici et vendue dans un autre
 * là-bas.
 *
 * Le décompte affiché au-dessus du tableau est calculé lui aussi. Écrire
 * « deux denrées relèvent du 4° » à la main serait une quinzième vérité à
 * maintenir, et la première à devenir fausse le jour d'un seizième produit.
 *
 * ---------------------------------------------------------------------------
 * L'impression
 * ---------------------------------------------------------------------------
 *
 * Cette page est faite pour sortir sur une feuille : le modèle de formulaire se
 * remplit à la main et se signe. La feuille de style d'impression (voir
 * `src/app/globals.css`) retire l'en-tête, le pied de page, les bandeaux et les
 * sommaires ; l'encadré d'ouverture, lui, RESTE — un gabarit imprimé sans son
 * avertissement est exactement le document qu'on ne veut pas voir circuler.
 *
 * Page STATIQUE et INDEXABLE. Un seul îlot client, le bouton d'impression.
 */

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Droit de rétractation',
  description:
    'Droit de rétractation sur la démonstration Maison Vaubrune : délai de ' +
    'quatorze jours, exercice, remboursement, exceptions produit par produit ' +
    'et formulaire type de l’annexe R. 221-1, imprimable et téléchargeable.',
  alternates: { canonical: '/retractation' },
};

/** Le fichier texte du formulaire, servi depuis `public/`. */
const FICHIER_FORMULAIRE = '/formulaire-retractation.txt';

const SOMMAIRE: readonly EntreeSommaire[] = [
  { ancre: 'delai', libelle: '1. Le délai : quatorze jours' },
  { ancre: 'depart', libelle: '2. À partir de quand il court' },
  { ancre: 'exercice', libelle: '3. Comment l’exercer' },
  { ancre: 'suites', libelle: '4. Ce qui se passe ensuite' },
  { ancre: 'exceptions', libelle: '5. Les exceptions' },
  { ancre: 'formulaire', libelle: '6. Le formulaire type' },
  { ancre: 'demonstration', libelle: '7. Sur cette démonstration' },
];

/* -------------------------------------------------------------------------- */
/* Le tableau produit par produit — engendré                                   */
/* -------------------------------------------------------------------------- */

/**
 * Le libellé court d'un fondement, DÉRIVÉ de son identifiant.
 *
 * Volontairement mécanique : `L221-28-4` donne « L. 221-28, 4° » par découpe,
 * jamais par une table de correspondance écrite à la main. Une table serait une
 * seconde source pour une information que le code porte déjà — exactement ce
 * que la décision D12 interdit pour les phrases.
 */
function libelleFondement(fondement: Fondement): string {
  return `L. 221-28, ${fondement.slice('L221-28-'.length)}°`;
}

/** Les quinze lignes du tableau, calculées une fois à la construction. */
const LIGNES_REGIME = CATALOGUE.map((produit) => ({
  slug: produit.slug,
  nom: produit.nom,
  regime: regimeRetractation(produit),
}));

const NOMBRE_DROIT_OUVERT = LIGNES_REGIME.filter(
  (ligne) => ligne.regime.ouvreDroit,
).length;

/** Combien de références par fondement, dans l'ordre des fondements rencontrés. */
const DECOMPTE_PAR_FONDEMENT: readonly { readonly fondement: Fondement; readonly nombre: number }[] =
  (['L221-28-3', 'L221-28-4', 'L221-28-5'] as const)
    .map((fondement) => ({
      fondement,
      nombre: LIGNES_REGIME.filter((ligne) => ligne.regime.fondement === fondement)
        .length,
    }))
    .filter((entree) => entree.nombre > 0);

/** « une référence » / « deux références » — le décompte se lit, il ne se compte pas. */
const EN_LETTRES: readonly string[] = [
  'aucune',
  'une',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
];

function enLettres(nombre: number): string {
  return EN_LETTRES[nombre] ?? String(nombre);
}

export default function PageRetractation() {
  return (
    <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <EnTeteLegale
        surtitre="Document légal"
        titre="Droit de rétractation"
        chapeau={
          'Quatorze jours pour changer d’avis, ce qui se passe ensuite, les ' +
          'trois exceptions du code de la consommation et le régime de chacune ' +
          'des quinze références du catalogue.'
        }
      />

      <EncadreGabarit
        gabarit={
          <T>
            {'Ce document est un gabarit pour les quelques emplacements ' +
              'surlignés qu’il comporte ; le reste décrit le régime légal ' +
              'applicable à une vente à distance de produits alimentaires. La ' +
              'relecture par un juriste reste celle du marchand.'}
          </T>
        }
        fiction={
          <>
            <T>{'Maison Vaubrune est une épicerie fine '}</T>
            <strong className="font-semibold">fictive</strong>
            <T>{' et ce site est une '}</T>
            <strong className="font-semibold">démonstration</strong>
            <T>
              {' : aucune commande n’y est expédiée, donc aucune rétractation n’y ' +
                'est réellement exercée. Le parcours existe, fonctionne et montre ' +
                'ce qu’une boutique livrée fait à cet endroit.'}
            </T>
          </>
        }
      />

      <SommaireInterne
        titre="Dans cette page"
        identifiant="titre-sommaire"
        entrees={SOMMAIRE}
      />

      {/* 1 ---------------------------------------------------------------- */}
      <section id="delai" className={CLASSE_ARTICLE} aria-labelledby="titre-delai">
        <h2 id="titre-delai" className={CLASSE_TITRE_ARTICLE}>
          1. Le délai : quatorze jours
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Dans une vente conclue à distance, le client dispose de quatorze ' +
              'jours pour revenir sur son achat, sans avoir à se justifier et sans ' +
              'pénalité (article L. 221-18 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ce délai est un droit d’ordre public : il n’est pas une faveur ' +
              'commerciale, et il ne peut pas être réduit par contrat. Le marchand ' +
              'peut en revanche l’allonger s’il le souhaite.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Extension commerciale du délai, le cas échéant : '}</T>
          <AComplete champ="délai commercial de retour plus favorable, s’il en est accordé un, et ses conditions" />
          <T>{'.'}</T>
        </p>
      </section>

      {/* 2 ---------------------------------------------------------------- */}
      <section id="depart" className={CLASSE_ARTICLE} aria-labelledby="titre-depart">
        <h2 id="titre-depart" className={CLASSE_TITRE_ARTICLE}>
          2. À partir de quand il court
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Pour l’achat d’un bien, le délai part du jour où le client, ou un ' +
              'tiers qu’il a désigné, reçoit physiquement le bien — et non du jour ' +
              'de la commande (article L. 221-19 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Trois situations méritent d’être distinguées, toutes réglées par le ' +
              'même article :'}
          </T>
        </p>

        <ul className={CLASSE_LISTE}>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Une commande, une livraison'}</T>
            </strong>
            <T>{' : le délai part du jour de la réception.'}</T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Une commande, plusieurs biens livrés séparément'}</T>
            </strong>
            <T>{' : le délai part de la réception du dernier bien.'}</T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Un bien livré en plusieurs lots'}</T>
            </strong>
            <T>{' : le délai part de la réception du dernier lot.'}</T>
          </li>
        </ul>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le jour de la réception ne compte pas : le délai commence le ' +
              'lendemain. S’il expire un samedi, un dimanche ou un jour férié ou ' +
              'chômé, il est prolongé jusqu’au premier jour ouvrable suivant.'}
          </T>
        </p>
      </section>

      {/* 3 ---------------------------------------------------------------- */}
      <section id="exercice" className={CLASSE_ARTICLE} aria-labelledby="titre-exercice">
        <h2 id="titre-exercice" className={CLASSE_TITRE_ARTICLE}>
          3. Comment l’exercer
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>{'Deux voies, au choix du client, également valables :'}</T>
        </p>

        <ol className="mt-4 max-w-lisible list-decimal space-y-2 pl-5 text-sm leading-relaxed text-encre-douce">
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Le formulaire type'}</T>
            </strong>
            <T>{', reproduit à la '}</T>
            <a href="#formulaire" className={CLASSE_LIEN}>
              <T>{'section 6 de cette page'}</T>
            </a>
            <T>{', à compléter et à renvoyer.'}</T>
          </li>
          <li>
            <strong className="font-semibold text-encre">
              <T>{'Toute autre déclaration dénuée d’ambiguïté'}</T>
            </strong>
            <T>
              {' exprimant la volonté de se rétracter : un courriel ou une lettre ' +
                'suffisent, dès lors que l’intention y est claire.'}
            </T>
          </li>
        </ol>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ces deux voies sont celles de l’article L. 221-21 du code de la ' +
              'consommation. Ce qui compte est que la déclaration soit envoyée ' +
              'avant l’expiration du délai de quatorze jours, non qu’elle soit ' +
              'reçue avant.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La preuve de l’exercice du droit de rétractation incombe au client ' +
              '(article L. 221-22 du code de la consommation) : garder une trace de ' +
              'l’envoi est donc utile.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Adresse à laquelle adresser la déclaration : '}</T>
          <AComplete champ="adresse de courrier électronique et adresse postale pour recevoir les rétractations" />
          <T>{'.'}</T>
        </p>
      </section>

      {/* 4 ---------------------------------------------------------------- */}
      <section id="suites" className={CLASSE_ARTICLE} aria-labelledby="titre-suites">
        <h2 id="titre-suites" className={CLASSE_TITRE_ARTICLE}>
          4. Ce qui se passe ensuite
        </h2>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'4.1 Le renvoi des produits'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client renvoie les produits au plus tard quatorze jours après ' +
              'avoir communiqué sa décision. Il supporte les coûts directs de ' +
              'renvoi, sauf si le marchand accepte de les prendre à sa charge ou ' +
              's’il a omis d’en informer le client avant la commande (article ' +
              'L. 221-23 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Frais de renvoi sur cette boutique : '}</T>
          <AComplete champ={CHAMPS.FRAIS_RENVOI} />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Adresse de renvoi : '}</T>
          <AComplete champ={CHAMPS.ADRESSE_RENVOI} />
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'La responsabilité du client peut être engagée si les produits ont ' +
              'perdu de leur valeur à cause de manipulations autres que celles ' +
              'nécessaires pour établir leur nature, leurs caractéristiques et leur ' +
              'bon fonctionnement.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'4.2 Le remboursement'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>{'Le marchand rembourse la totalité des sommes versées, '}</T>
          <strong className="font-semibold text-encre">
            <T>{'frais de livraison compris'}</T>
          </strong>
          <T>
            {', au plus tard quatorze jours après avoir été informé de la décision ' +
              'de rétractation (article L. 221-24 du code de la consommation).'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>{'Trois précisions tenant au même article :'}</T>
        </p>

        <ul className={CLASSE_LISTE}>
          <li>
            <T>
              {'Le remboursement peut être différé jusqu’à la récupération des ' +
                'produits ou jusqu’à ce que le client ait fourni une preuve de leur ' +
                'expédition, la date retenue étant celle du premier de ces deux ' +
                'faits.'}
            </T>
          </li>
          <li>
            <T>
              {'Le remboursement se fait par le même moyen de paiement que celui ' +
                'utilisé lors de l’achat, sauf accord exprès du client pour un ' +
                'autre moyen, et sans frais pour lui.'}
            </T>
          </li>
          <li>
            <T>
              {'Si le client avait choisi une livraison plus coûteuse que le mode ' +
                'standard proposé, les frais de livraison sont remboursés à hauteur ' +
                'du mode standard.'}
            </T>
          </li>
        </ul>
      </section>

      {/* 5 ---------------------------------------------------------------- */}
      <section id="exceptions" className={CLASSE_ARTICLE} aria-labelledby="titre-exceptions">
        <h2 id="titre-exceptions" className={CLASSE_TITRE_ARTICLE}>
          5. Les exceptions : trois cas, trois raisons différentes
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le droit de rétractation ne s’applique pas à tout. L’article ' +
              'L. 221-28 du code de la consommation énumère les contrats qui y ' +
              'échappent. Trois de ces cas concernent un catalogue d’épicerie fine.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'5.1 Le bien personnalisé (L. 221-28, 3°)'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sont exclus les biens confectionnés selon les spécifications du ' +
              'client ou nettement personnalisés. La raison est simple : un ' +
              'assemblage composé par le client ne peut pas être remis en vente tel ' +
              'quel à un autre.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sur cette boutique, c’est le régime du coffret dont le client ' +
              'choisit lui-même les pièces. Le choix opéré au moment de la commande ' +
              'est ce qui déclenche l’exception, et la fiche du produit le dit avant ' +
              'l’ajout au panier.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'5.2 Le bien qui se périme vite (L. 221-28, 4°)'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sont exclus les biens susceptibles de se détériorer ou de se périmer ' +
              'rapidement. Une denrée expédiée sous température dirigée, avec une ' +
              'date limite de consommation courte, ne survit pas à un aller-retour ' +
              'postal de plusieurs jours : la reprendre reviendrait à la remettre en ' +
              'vente sans garantie sanitaire.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sur cette boutique, c’est le régime des denrées fraîches, celles-là ' +
              'mêmes que le moteur d’expédition refuse d’envoyer hors de la France ' +
              'métropolitaine. Les deux règles reposent sur le même drapeau du ' +
              'catalogue, pas sur la famille de produits : un coffret qui ' +
              'contiendrait un jour une denrée fraîche serait traité de la même ' +
              'façon.'}
          </T>
        </p>

        <h3 className={CLASSE_SOUS_TITRE}>
          <T>{'5.3 Le bien scellé pour l’hygiène (L. 221-28, 5°)'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Sont exclus les biens scellés qui ne peuvent être renvoyés pour des ' +
              'raisons de protection de la santé ou d’hygiène, '}
          </T>
          <strong className="font-semibold text-encre">
            <T>{'et qui ont été descellés après la livraison'}</T>
          </strong>
          <T>{'.'}</T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ce cas est différent des deux précédents, et la nuance compte : tant ' +
              'que le scellé est intact, le droit de rétractation s’applique ' +
              'normalement. C’est l’ouverture par le client, et elle seule, qui fait ' +
              'tomber le droit. Une formulation qui annoncerait « pas de ' +
              'rétractation » sans cette condition serait plus restrictive que la ' +
              'loi.'}
          </T>
        </p>

        <h3 id="tableau" className={`${CLASSE_SOUS_TITRE} scroll-mt-8`}>
          <T>{'5.4 Le tableau produit par produit'}</T>
        </h3>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Ce tableau est construit à partir du catalogue par la fonction unique ' +
              'qui porte les mentions de rétractation, de sorte qu’une référence ne ' +
              'puisse jamais être annoncée dans un régime sur cette page et vendue ' +
              'dans un autre sur sa fiche. Les phrases affichées viennent de cette ' +
              'même source ; aucune n’est recopiée dans le présent document.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Il comporte, pour chaque référence du catalogue : le nom du produit, ' +
              'le régime applicable (droit ouvert ou exception), le fondement ' +
              'invoqué lorsqu’il y a exception, et la phrase correspondante.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {`Sur les ${enLettres(LIGNES_REGIME.length)} références du catalogue, ` +
              `${enLettres(NOMBRE_DROIT_OUVERT)} ouvrent droit à rétractation. Les ` +
              'autres relèvent d’une exception : '}
          </T>
          <T>
            {DECOMPTE_PAR_FONDEMENT.map(
              ({ fondement, nombre }) =>
                `${enLettres(nombre)} au titre de l’article ${libelleFondement(fondement)}`,
            ).join(', ')}
          </T>
          <T>{'.'}</T>
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <caption className="sr-only">
              <T>
                {'Régime de rétractation de chaque référence du catalogue : droit ' +
                  'ouvert ou exception, fondement et mention affichée'}
              </T>
            </caption>
            <thead>
              <tr className="border-b border-filet">
                <th scope="col" className="pb-2 pr-6 text-left font-semibold text-encre">
                  Produit
                </th>
                <th scope="col" className="pb-2 pr-6 text-left font-semibold text-encre">
                  Régime
                </th>
                <th scope="col" className="pb-2 pr-6 text-left font-semibold text-encre">
                  Fondement
                </th>
                <th scope="col" className="pb-2 text-left font-semibold text-encre">
                  Mention affichée
                </th>
              </tr>
            </thead>
            <tbody>
              {LIGNES_REGIME.map(({ slug, nom, regime }) => (
                <tr key={slug} className="border-b border-filet/60 align-baseline">
                  <th
                    scope="row"
                    className="w-56 py-3 pr-6 text-left font-normal text-encre"
                  >
                    {nom}
                  </th>
                  <td className="py-3 pr-6 whitespace-nowrap text-encre-douce">
                    {regime.ouvreDroit ? (
                      <T>{'Droit ouvert'}</T>
                    ) : (
                      <span className="font-semibold text-terre">
                        <T>{'Exception'}</T>
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap text-encre-douce">
                    {regime.fondement === null ? (
                      <span aria-hidden="true">—</span>
                    ) : (
                      libelleFondement(regime.fondement)
                    )}
                  </td>
                  <td className="py-3 leading-relaxed text-encre-douce">
                    {regime.phrase}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6 ---------------------------------------------------------------- */}
      <section id="formulaire" className={CLASSE_ARTICLE} aria-labelledby="titre-formulaire">
        <h2 id="titre-formulaire" className={CLASSE_TITRE_ARTICLE}>
          6. Le formulaire type
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le texte encadré ci-dessous est le modèle officiel annexé à ' +
              'l’article R. 221-1 du code de la consommation. C’est un modèle ' +
              'destiné à être reproduit : il n’est ni résumé, ni reformulé, ni ' +
              'amélioré. Seuls les éléments d’identité du professionnel, que le ' +
              'modèle demande expressément d’insérer, sont remplacés par des ' +
              'emplacements surlignés.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le client n’est pas obligé d’utiliser ce formulaire : toute ' +
              'déclaration dénuée d’ambiguïté exprimant la volonté de se rétracter ' +
              'produit le même effet (article L. 221-21 du code de la ' +
              'consommation). Les conditions du droit de rétractation, son délai et ' +
              'ses exceptions sont expliqués aux sections 1 à 5 ci-dessus.'}
          </T>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BoutonImprimer />
          <a
            href={FICHIER_FORMULAIRE}
            download
            className={`text-sm font-semibold text-encre-douce ${CLASSE_LIEN}`}
          >
            <T>{'Télécharger le formulaire au format texte'}</T>
          </a>
        </div>

        <p className="mt-3 max-w-lisible text-xs leading-relaxed text-encre-douce">
          <T>
            {'La feuille d’impression retire la navigation, le pied de page et les ' +
              'sommaires, et laisse la place d’écrire à la main en regard de chaque ' +
              'champ. Le fichier texte porte le même contenu, sans mise en forme, ' +
              'pour qui préfère le remplir dans un éditeur et l’envoyer en pièce ' +
              'jointe.'}
          </T>
        </p>

        <ModeleFormulaire />

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le modèle officiel écrit, à l’endroit de la première ligne : ' +
              '« À l’attention de [le professionnel insère ici son nom, son adresse ' +
              'géographique et, lorsqu’ils sont disponibles, son numéro de ' +
              'télécopieur et son adresse électronique] ». Cette phrase entre ' +
              'crochets est une instruction au professionnel, pas un texte à ' +
              'afficher : elle est donc remplacée par les valeurs correspondantes. ' +
              'Le numéro de télécopieur, que le modèle mentionne comme facultatif, ' +
              'n’est pas repris ; s’il devait l’être, un quatrième emplacement ' +
              's’ajouterait à la même ligne.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Aucun envoi n’est possible depuis ce site, qui n’expédie aucun ' +
              'courriel et ne comporte aucun formulaire d’envoi. Sur une boutique ' +
              'livrée, la déclaration arrive à l’adresse indiquée dans les '}
          </T>
          <LienLegal vers="/conditions-generales-de-vente#article-8">
            <T>{'conditions générales de vente'}</T>
          </LienLegal>
          <T>{' et déclenche un accusé de réception.'}</T>
        </p>
      </section>

      {/* 7 ---------------------------------------------------------------- */}
      <section
        id="demonstration"
        className={CLASSE_ARTICLE}
        aria-labelledby="titre-demonstration"
      >
        <h2 id="titre-demonstration" className={CLASSE_TITRE_ARTICLE}>
          7. Sur cette démonstration
        </h2>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Le parcours de rétractation existe et fonctionne : il fait passer une ' +
              'commande d’essai dans l’état correspondant, calcule les dates, et ' +
              'affiche les courriels qu’une boutique livrée aurait envoyés au ' +
              'client. Rien n’est renvoyé, rien n’est remboursé, aucun courriel ne ' +
              'part.'}
          </T>
        </p>

        <p className={CLASSE_TEXTE}>
          <T>
            {'Les modèles de ces courriels sont lisibles dans l’espace marchand de ' +
              'la démonstration, et le partage entre ce qui fonctionne et ce qui est ' +
              'simulé est détaillé sur la page '}
          </T>
          <LienLegal vers="/a-propos-de-cette-demonstration">
            <T>{'À propos de cette démonstration'}</T>
          </LienLegal>
          <T>{'.'}</T>
        </p>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Le modèle officiel de l'annexe R. 221-1                                     */
/* -------------------------------------------------------------------------- */

/**
 * Le formulaire type, reproduit tel quel.
 *
 * Les champs que le CLIENT remplit sont des lignes vides à hauteur d'écriture
 * (`min-h-*`) et non des champs de saisie : cette page ne comporte aucun
 * formulaire d'envoi, et poser un `<input>` inerte reviendrait à promettre un
 * envoi qui n'existe pas — même faute que celle écartée en C5 pour les champs
 * de carte de l'écran de paiement simulé (décision D22).
 *
 * Le cadre de signature est le plus haut de tous : le modèle le prévoit pour un
 * envoi papier, et une signature ne tient pas sur une interligne.
 *
 * Balisé `data-texte-reglementaire` pour que la garde « aucune donnée inventée »
 * n'aille pas prendre « R. 221-1 » ou une adresse de modèle pour une donnée
 * réelle.
 */
function ModeleFormulaire() {
  return (
    <section
      aria-labelledby="titre-modele"
      data-texte-reglementaire="annexe à l’article R. 221-1 du code de la consommation"
      className="mt-8 overflow-hidden rounded-sm border-2 border-encre-douce/40 bg-papier"
    >
      <h3
        id="titre-modele"
        className="border-b border-encre-douce/30 px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-encre uppercase sm:px-7"
      >
        Modèle de formulaire de rétractation
      </h3>

      <div className="px-5 py-6 sm:px-7">
        <p className="max-w-lisible text-sm leading-relaxed text-encre-douce italic">
          <T>
            {'(Veuillez compléter et renvoyer le présent formulaire uniquement si ' +
              'vous souhaitez vous rétracter du contrat.)'}
          </T>
        </p>

        <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre">
          <T>{'À l’attention de '}</T>
          <AComplete champ={CHAMPS.PROFESSIONNEL} />
          <T>{', '}</T>
          <AComplete champ={CHAMPS.SIEGE} />
          <T>{', '}</T>
          <AComplete champ={CHAMPS.COURRIEL_CONTACT} />
          <T>{' :'}</T>
        </p>

        <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre">
          <T>
            {'Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) ' +
              'rétractation du contrat portant sur la vente du bien (*)/pour la ' +
              'prestation de services (*) ci-dessous :'}
          </T>
        </p>

        <dl className="mt-6 space-y-5">
          <ChampAEcrire libelle="Commandé le (*)/reçu le (*) :" />
          <ChampAEcrire libelle="Nom du (des) consommateur(s) :" />
          <ChampAEcrire libelle="Adresse du (des) consommateur(s) :" hauteur="grande" />
          <ChampAEcrire
            libelle="Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :"
            hauteur="signature"
          />
          <ChampAEcrire libelle="Date :" />
        </dl>

        <p className="mt-6 text-xs text-encre-douce italic">
          <T>{'(*) Rayez la mention inutile.'}</T>
        </p>
      </div>
    </section>
  );
}

/** Un libellé, puis une réglure vide où écrire à la main. */
function ChampAEcrire({
  libelle,
  hauteur = 'normale',
}: {
  readonly libelle: string;
  readonly hauteur?: 'normale' | 'grande' | 'signature';
}) {
  const hauteurs = {
    normale: 'min-h-10',
    grande: 'min-h-20',
    signature: 'min-h-28',
  } as const;

  return (
    <div>
      <dt className="max-w-lisible text-sm leading-relaxed text-encre">
        <T>{libelle}</T>
      </dt>
      <dd
        aria-hidden="true"
        className={`mt-1 border-b border-encre-douce/40 ${hauteurs[hauteur]}`}
      />
    </div>
  );
}
