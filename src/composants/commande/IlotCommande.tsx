'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MentionRetractation } from '@/composants/panier/MentionRetractation';
import { RecapitulatifTotaux } from '@/composants/panier/RecapitulatifTotaux';
import { formaterEuros } from '@/lib/argent';
import {
  trouverArticle,
  unionAllergenes,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import { calculerTotaux, type LigneCalculee } from '@/lib/panier/totaux';
import { LIBELLE_ZONE } from '@/lib/types';
import { zoneDepuisCodePostal } from '@/lib/zones';

/**
 * LE RÉCAPITULATIF DE COMMANDE — l'unique îlot client de la route.
 *
 * ---------------------------------------------------------------------------
 * Ce que cette page démontre, et ce qu'elle refuse de simuler
 * ---------------------------------------------------------------------------
 *
 * Elle démontre l'obligation de l'article L. 221-5 du code de la consommation :
 * avant de s'engager, l'acheteur voit le détail de sa commande, le prix total,
 * les frais de livraison et les exceptions au droit de rétractation. Et elle
 * démontre l'article L. 221-14 : le bouton d'engagement porte la mention
 * « Commander avec obligation de paiement », sans variante ni raccourci.
 *
 * Elle refuse en revanche de simuler ce qui n'existe pas encore. Le bouton
 * final est INERTE en C4 et le dit ; le formulaire n'envoie rien nulle part et
 * le dit ; les coordonnées ne quittent pas la mémoire de l'onglet — elles ne
 * sont même pas écrites dans le stockage local, contrairement au panier, parce
 * qu'un nom et une adresse laissés dans un navigateur de démonstration n'ont
 * aucune raison d'y traîner.
 *
 * ---------------------------------------------------------------------------
 * Un récapitulatif NON MODIFIABLE, recalculé depuis le même état
 * ---------------------------------------------------------------------------
 *
 * Aucun champ de quantité, aucun bouton « retirer » : on modifie son panier
 * dans le panier, on relit sa commande dans la commande. Les montants sortent
 * du MÊME appel à `calculerTotaux()` avec le MÊME état — il ne s'agit pas de
 * deux calculs qui tombent d'accord, mais d'un seul calcul affiché deux fois.
 * `RecapitulatifTotaux` est d'ailleurs le composant de la page panier, repris
 * tel quel.
 */

/** Assez pour rejeter une saisie qui n'est pas une adresse ; pas plus. */
const FORME_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function IlotCommande({
  catalogue,
}: {
  readonly catalogue: readonly ArticlePanier[];
}) {
  const { etat, pretALEmploi } = usePanier();

  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [courriel, setCourriel] = useState('');
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);

  if (!pretALEmploi) {
    return (
      <div
        aria-hidden="true"
        className="mt-10 min-h-96 rounded-sm border border-filet bg-papier"
      />
    );
  }

  const totaux = calculerTotaux(etat.lignes, catalogue, etat.zone);

  if (totaux.lignes.length === 0) {
    return (
      /* Même hauteur minimale que la place réservée ci-dessus : c'est ce qui
         empêche le pied de page de remonter à l'hydratation (voir le
         raisonnement chiffré dans `IlotPanier`). */
      <div className="mt-10 min-h-96 max-w-lisible pb-4">
        <p className="text-chapeau text-encre-douce">
          Il n’y a rien à commander&nbsp;: votre panier est vide.
        </p>
        <Link
          href="/boutique"
          className="mt-6 inline-block rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme no-underline hover:bg-olive-clair"
        >
          Voir la boutique
        </Link>
      </div>
    );
  }

  const zoneDuCodePostal = zoneDepuisCodePostal(codePostal);
  const codePostalIncoherent = zoneDuCodePostal !== null && zoneDuCodePostal !== etat.zone;
  const codePostalMalForme = codePostal.trim() !== '' && zoneDuCodePostal === null;
  const courrielMalForme = courriel.trim() !== '' && !FORME_COURRIEL.test(courriel.trim());

  const coordonneesCompletes =
    nom.trim() !== '' &&
    adresse.trim() !== '' &&
    zoneDuCodePostal !== null &&
    !codePostalIncoherent &&
    FORME_COURRIEL.test(courriel.trim());

  return (
    <div className="mt-10 grid gap-x-12 gap-y-10 pb-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-12">
        <section aria-labelledby="titre-articles">
          <h2 id="titre-articles" className="text-titre font-semibold text-encre">
            Votre commande
          </h2>

          <p className="mt-3 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Ce récapitulatif n’est pas modifiable.{' '}
            <Link
              href="/panier"
              className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
            >
              Revenir au panier
            </Link>{' '}
            pour changer une quantité ou une destination.
          </p>

          <ul className="mt-6 border-t border-filet">
            {totaux.lignes.map((calculee) => (
              <LigneFigee key={calculee.cle} calculee={calculee} catalogue={catalogue} />
            ))}
          </ul>

          <p className="mt-4 text-sm text-encre-douce">
            Destination&nbsp;: {LIBELLE_ZONE[etat.zone]}.
          </p>
        </section>

        <Coordonnees
          nom={nom}
          adresse={adresse}
          codePostal={codePostal}
          courriel={courriel}
          codePostalIncoherent={codePostalIncoherent}
          codePostalMalForme={codePostalMalForme}
          courrielMalForme={courrielMalForme}
          zone={LIBELLE_ZONE[etat.zone]}
          setNom={setNom}
          setAdresse={setAdresse}
          setCodePostal={setCodePostal}
          setCourriel={setCourriel}
        />
      </div>

      <div className="min-w-0 space-y-8 lg:sticky lg:top-8 lg:self-start">
        <RecapitulatifTotaux totaux={totaux} />

        <MentionRetractation articles={totaux.articlesSansRetractation} />

        <Engagement
          conditionsAcceptees={conditionsAcceptees}
          setConditionsAcceptees={setConditionsAcceptees}
          expeditionPossible={totaux.expedition.statut === 'calcule'}
          coordonneesCompletes={coordonneesCompletes}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Le récapitulatif figé                                                       */
/* -------------------------------------------------------------------------- */

function LigneFigee({
  calculee,
  catalogue,
}: {
  readonly calculee: LigneCalculee;
  readonly catalogue: readonly ArticlePanier[];
}) {
  const { article, ligne } = calculee;
  const composition = ligne.composition;

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-filet py-4">
      <div className="min-w-0">
        <p className="text-encre">
          <span className="font-semibold">{article.nomProduit}</span>
          <span className="text-encre-douce">, {article.format}</span>
        </p>
        <p className="mt-1 text-sm text-encre-douce">
          {ligne.quantite} × {formaterEuros(article.prixCentimes)}
        </p>

        {composition === undefined ? null : (
          <div className="mt-2 border-l-2 border-filet pl-4 text-sm text-encre-douce">
            <ul className="space-y-0.5">
              {composition.map((sku) => {
                const piece = trouverArticle(catalogue, sku);

                return piece === undefined ? null : (
                  <li key={sku}>
                    {piece.nomProduit}, {piece.format}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-xs">
              Allergènes&nbsp;: {unionAllergenes(composition, catalogue).join(', ')}.
            </p>
          </div>
        )}
      </div>

      <p className="font-semibold text-encre tabular-nums">
        {formaterEuros(calculee.sousTotalCentimes)}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Les coordonnées                                                             */
/* -------------------------------------------------------------------------- */

const CLASSE_CHAMP =
  'mt-2 w-full rounded-sm border border-filet bg-creme px-3 py-2 text-sm text-encre';
const CLASSE_ETIQUETTE =
  'block text-xs font-semibold tracking-[0.12em] text-encre-douce uppercase';

function Coordonnees({
  nom,
  adresse,
  codePostal,
  courriel,
  codePostalIncoherent,
  codePostalMalForme,
  courrielMalForme,
  zone,
  setNom,
  setAdresse,
  setCodePostal,
  setCourriel,
}: {
  readonly nom: string;
  readonly adresse: string;
  readonly codePostal: string;
  readonly courriel: string;
  readonly codePostalIncoherent: boolean;
  readonly codePostalMalForme: boolean;
  readonly courrielMalForme: boolean;
  readonly zone: string;
  readonly setNom: (valeur: string) => void;
  readonly setAdresse: (valeur: string) => void;
  readonly setCodePostal: (valeur: string) => void;
  readonly setCourriel: (valeur: string) => void;
}) {
  return (
    <section aria-labelledby="titre-coordonnees">
      <h2 id="titre-coordonnees" className="text-titre font-semibold text-encre">
        Vos coordonnées
      </h2>

      <p className="mt-3 max-w-lisible rounded-sm border border-filet bg-papier px-4 py-3 text-sm leading-relaxed text-encre">
        <span className="font-semibold">La démonstration n’envoie rien.</span> Ce que
        vous saisissez ici reste dans la mémoire de cet onglet&nbsp;: aucun serveur
        n’est appelé, aucun courriel n’est expédié, rien n’est même écrit dans votre
        navigateur. Rafraîchir la page efface ces champs.
      </p>

      {/* Un vrai `<form>` pour que les navigateurs et les lecteurs d'écran
          reconnaissent un groupe de saisie — mais l'envoi est neutralisé : la
          touche Entrée dans un champ rechargerait sinon la page avec les
          coordonnées inscrites dans l'URL, ce qui serait exactement le contraire
          de ce que la note ci-dessus promet. */}
      <form
        className="mt-6 grid max-w-lisible gap-5"
        onSubmit={(evenement) => {
          evenement.preventDefault();
        }}
      >
        <div>
          <label htmlFor="champ-nom" className={CLASSE_ETIQUETTE}>
            Prénom et nom
          </label>
          <input
            id="champ-nom"
            type="text"
            autoComplete="name"
            value={nom}
            onChange={(evenement) => {
              setNom(evenement.target.value);
            }}
            className={CLASSE_CHAMP}
          />
        </div>

        <div>
          <label htmlFor="champ-adresse" className={CLASSE_ETIQUETTE}>
            Adresse de livraison
          </label>
          <textarea
            id="champ-adresse"
            rows={3}
            autoComplete="street-address"
            value={adresse}
            onChange={(evenement) => {
              setAdresse(evenement.target.value);
            }}
            className={CLASSE_CHAMP}
          />
        </div>

        <div>
          <label htmlFor="champ-code-postal" className={CLASSE_ETIQUETTE}>
            Code postal
          </label>
          <input
            id="champ-code-postal"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={codePostal}
            aria-describedby="aide-code-postal"
            aria-invalid={codePostalIncoherent || codePostalMalForme}
            onChange={(evenement) => {
              setCodePostal(evenement.target.value);
            }}
            className={`${CLASSE_CHAMP} w-32 tabular-nums`}
          />
          <p
            id="aide-code-postal"
            aria-live="polite"
            className="mt-2 text-xs leading-relaxed text-encre-douce"
          >
            {messageCodePostal(codePostalIncoherent, codePostalMalForme, zone)}
          </p>
        </div>

        <div>
          <label htmlFor="champ-courriel" className={CLASSE_ETIQUETTE}>
            Courriel
          </label>
          <input
            id="champ-courriel"
            type="email"
            autoComplete="email"
            value={courriel}
            aria-describedby="aide-courriel"
            aria-invalid={courrielMalForme}
            onChange={(evenement) => {
              setCourriel(evenement.target.value);
            }}
            className={CLASSE_CHAMP}
          />
          <p
            id="aide-courriel"
            aria-live="polite"
            className="mt-2 text-xs leading-relaxed text-encre-douce"
          >
            {courrielMalForme
              ? 'Cette adresse ne ressemble pas à un courriel.'
              : 'Il servirait à envoyer la confirmation de commande.'}
          </p>
        </div>
      </form>
    </section>
  );
}

function messageCodePostal(
  incoherent: boolean,
  malForme: boolean,
  zone: string,
): string {
  if (incoherent) {
    return `Ce code postal ne correspond pas à la destination choisie (${zone}). Corrigez l’un ou l’autre : c’est la destination qui a servi à calculer les frais de port.`;
  }

  if (malForme) {
    return 'Cinq chiffres sont attendus.';
  }

  return 'Il doit correspondre à la destination retenue au panier.';
}

/* -------------------------------------------------------------------------- */
/* L'engagement                                                                */
/* -------------------------------------------------------------------------- */

/**
 * La case des conditions générales et le bouton d'engagement.
 *
 * ÉCART CONSIGNÉ — le lien des conditions générales de vente pointe vers
 * `#cgv`, une ancre de cette page, et non vers `/cgv` qui n'existe pas encore.
 * Les documents légaux sont la tranche C7. Trois voies avaient été pesées : un
 * lien mort vers `/cgv` (404 pour le visiteur comme pour les robots), un
 * détournement vers `/livraison` (qui n'est pas les conditions générales et
 * ferait passer un document pour un autre), ou l'ancre honnête retenue ici —
 * elle mène à un paragraphe qui dit ce qu'il en est, et ce paragraphe décrit
 * aussi le lien via `aria-describedby`, si bien qu'un lecteur d'écran annonce
 * l'échéance avant même l'activation.
 *
 * LE BOUTON RESTE ÉTEINT EN TOUTES CIRCONSTANCES, et la raison affichée dit
 * laquelle des quatre s'applique. Les trois premières sont de VRAIES règles,
 * déjà en vigueur : expédition impossible, coordonnées incomplètes, conditions
 * non acceptées. La quatrième est l'aveu de la tranche : le paiement arrive
 * ensuite. Un bouton qui s'allumerait pour ne rien faire serait pire qu'un
 * bouton éteint.
 */
function Engagement({
  conditionsAcceptees,
  setConditionsAcceptees,
  expeditionPossible,
  coordonneesCompletes,
}: {
  readonly conditionsAcceptees: boolean;
  readonly setConditionsAcceptees: (valeur: boolean) => void;
  readonly expeditionPossible: boolean;
  readonly coordonneesCompletes: boolean;
}) {
  return (
    <section
      aria-labelledby="titre-engagement"
      className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
    >
      <h2 id="titre-engagement" className="font-titre text-base font-semibold text-encre">
        Votre engagement
      </h2>

      <label className="mt-4 flex items-baseline gap-2.5 text-sm leading-relaxed text-encre">
        <input
          type="checkbox"
          checked={conditionsAcceptees}
          onChange={(evenement) => {
            setConditionsAcceptees(evenement.target.checked);
          }}
          className="mt-1 shrink-0 accent-olive"
        />
        <span>
          J’ai lu et j’accepte les{' '}
          <a
            href="#cgv"
            aria-describedby="cgv"
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            conditions générales de vente
          </a>
          .
        </span>
      </label>

      {/* TODO-C7 : remplacer `#cgv` par `/cgv` quand la page existera, et
          retirer ce paragraphe. Voir l'en-tête de ce composant pour l'arbitrage. */}
      <p
        id="cgv"
        className="mt-4 scroll-mt-8 rounded-sm border border-filet bg-creme px-4 py-3 text-xs leading-relaxed text-encre-douce"
      >
        <span className="font-semibold text-ocre">Page en cours de construction.</span>{' '}
        Les conditions générales de vente, les mentions légales, la politique de
        données personnelles et le formulaire de rétractation sont rédigés à la
        tranche C7 de ce chantier. Ce lien mène pour l’instant à ce paragraphe
        plutôt qu’à une page absente&nbsp;: la démonstration préfère dire ce qui
        manque.
      </p>

      <button
        type="button"
        disabled
        aria-describedby="motif-bouton-final"
        className="mt-5 w-full cursor-not-allowed rounded-sm border border-encre-douce/40 bg-creme px-4 py-3 text-sm font-semibold text-encre-douce"
      >
        Commander avec obligation de paiement
      </button>

      <p
        id="motif-bouton-final"
        aria-live="polite"
        className="mt-3 text-xs leading-relaxed text-encre-douce"
      >
        {motifBoutonEteint(expeditionPossible, coordonneesCompletes, conditionsAcceptees)}
      </p>

      <p className="mt-3 text-xs leading-relaxed text-encre-douce">
        Le libellé de ce bouton est celui qu’impose l’article L. 221-14 du code de la
        consommation à toute commande en ligne&nbsp;: l’acheteur doit lire qu’il
        s’engage à payer, et non un verbe de son choix.
      </p>
    </section>
  );
}

function motifBoutonEteint(
  expeditionPossible: boolean,
  coordonneesCompletes: boolean,
  conditionsAcceptees: boolean,
): string {
  if (!expeditionPossible) {
    return 'Ce panier ne peut pas être expédié vers la destination choisie : revenez au panier pour changer de destination ou retirer l’article en cause.';
  }

  if (!coordonneesCompletes) {
    return 'Complétez vos coordonnées : prénom et nom, adresse, code postal cohérent avec la destination, et courriel.';
  }

  if (!conditionsAcceptees) {
    return 'Cochez la case d’acceptation des conditions générales de vente : elle est obligatoire.';
  }

  return 'Tout est en ordre. Ce bouton reste néanmoins inerte : le paiement arrive à la tranche suivante, et cette démonstration ne fait semblant de rien.';
}
