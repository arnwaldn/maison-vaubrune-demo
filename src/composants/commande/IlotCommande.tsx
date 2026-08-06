'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MentionRetractation } from '@/composants/panier/MentionRetractation';
import { RecapitulatifTotaux } from '@/composants/panier/RecapitulatifTotaux';
import { formaterEuros } from '@/lib/argent';
import { prixAffiche } from '@/lib/catalogue-navigateur';
import { mettreEnAttente } from '@/lib/commandes/depot-local';
import { useSurcouche } from '@/lib/contexte-surcouche';
import {
  trouverArticle,
  unionAllergenes,
  type ArticlePanier,
} from '@/lib/panier/catalogue-panier';
import { usePanier } from '@/lib/panier/contexte-panier';
import { calculerTotaux, type LigneCalculee, type Totaux } from '@/lib/panier/totaux';
import { stockageLocal } from '@/lib/stockage-navigateur';
import { LIBELLE_ZONE, type CodeZone } from '@/lib/types';
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
 * ---------------------------------------------------------------------------
 * CE QUI PART SUR LE RÉSEAU, ET CE QUI N'EN PART JAMAIS (décision D2)
 * ---------------------------------------------------------------------------
 *
 * Depuis la tranche C5, le bouton final agit : il demande une session de
 * paiement à `/api/paiement/session`. Le corps envoyé contient TROIS choses, et
 * trois seulement — les lignes réduites à `{ sku, quantite, composition? }`, la
 * destination, et le total annoncé. Ni nom, ni adresse, ni code postal, ni
 * courriel : les coordonnées saisies ci-dessous restent dans ce navigateur et
 * rejoignent la commande rangée dans son stockage local. Le prestataire de
 * paiement collecte les siennes de son côté, sur sa page hébergée.
 *
 * Le total annoncé n'est pas de la confiance : le serveur relit le catalogue,
 * refait le calcul complet, et refuse la demande si un centime diffère. La
 * page ne fixe pas les prix — elle les affiche.
 *
 * ORDRE DES DEUX ÉCRITURES, écart consigné. La commande en attente est écrite
 * APRÈS la réponse du serveur, et non avant l'envoi : c'est le serveur qui
 * fabrique la référence (elle n'est pas dans le corps envoyé, justement parce
 * que rien de ce que le navigateur affirme ne fait autorité), et écrire une
 * commande sous une référence provisoire qu'il faudrait ensuite réécrire
 * ferait exister deux références pour une même commande. L'écriture est
 * synchrone et précède immédiatement la redirection.
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

/** L'unique route serveur du projet. */
const ROUTE_SESSION = '/api/paiement/session';

/** Ce que la route rend quand tout va bien, lu sans rien supposer. */
interface ReponseSession {
  readonly url: string;
  readonly reference: string;
  readonly mode: 'test' | 'simule';
}

function lireReponseSession(charge: unknown): ReponseSession | null {
  if (typeof charge !== 'object' || charge === null) {
    return null;
  }

  const { url, reference, mode } = charge as {
    readonly url?: unknown;
    readonly reference?: unknown;
    readonly mode?: unknown;
  };

  if (typeof url !== 'string' || typeof reference !== 'string') {
    return null;
  }

  if (mode !== 'test' && mode !== 'simule') {
    return null;
  }

  return { url, reference, mode };
}

/** Le message d'un refus, tel que la route l'a rédigé, ou un repli honnête. */
function lireMessageRefus(charge: unknown): string | null {
  if (typeof charge !== 'object' || charge === null) {
    return null;
  }

  const { message } = charge as { readonly message?: unknown };

  return typeof message === 'string' && message !== '' ? message : null;
}

export function IlotCommande({
  catalogue,
}: {
  readonly catalogue: readonly ArticlePanier[];
}) {
  const { etat, pretALEmploi } = usePanier();
  const { surcouche } = useSurcouche();

  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [courriel, setCourriel] = useState('');
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

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

  /* Décision D24 — au moins une ligne dont le prix de VITRINE a été modifié
     depuis l'espace de gestion. La comparaison porte sur les prix de la
     projection du catalogue versionné, ceux-là mêmes qui viennent d'être
     facturés : c'est donc l'écart réel entre ce que le visiteur a vu au rayon
     et ce qu'il s'apprête à payer. */
  const prixVitrineModifie = totaux.lignes.some(
    ({ article }) =>
      prixAffiche(surcouche, article.slug, article.sku, article.prixCentimes) !==
      article.prixCentimes,
  );

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

  /**
   * LA SOUMISSION. Une demande de session, une écriture locale, une redirection.
   *
   * Aucun `try` autour de la redirection elle-même : `location.assign()` ne
   * rend pas la main. Le `finally` qui rallume le bouton n'est donc atteint que
   * sur les chemins d'échec, ce qui est exactement ce qu'on veut — rallumer un
   * bouton d'engagement pendant qu'une redirection est en cours inviterait à
   * cliquer deux fois.
   */
  const soumettre = async () => {
    const { expedition } = totaux;

    /* Le bouton est déjà éteint dans ces deux cas ; la garde est ici parce
       qu'un état impossible ne doit pas produire un appel réseau bancal. */
    if (expedition.statut !== 'calcule' || totaux.totalCentimes === null) {
      return;
    }

    setEnvoiEnCours(true);
    setErreur(null);

    try {
      const reponse = await fetch(ROUTE_SESSION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpsDeLaDemande(totaux, etat.zone, totaux.totalCentimes)),
      });

      const charge: unknown = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        setErreur(
          lireMessageRefus(charge) ??
            'La demande de paiement a été refusée par le serveur, sans explication lisible. Votre panier est intact.',
        );
        return;
      }

      const session = lireReponseSession(charge);

      if (session === null) {
        setErreur(
          'Le serveur a répondu quelque chose que cette page ne sait pas lire. Aucun paiement n’a été engagé, votre panier est intact.',
        );
        return;
      }

      /* L'écriture locale précède immédiatement la redirection : c'est elle
         qui portera les coordonnées et le récapitulatif jusqu'à la page de
         confirmation, puisque cet onglet va être détruit. Voir l'écart
         consigné en tête de fichier sur l'ORDRE des deux écritures. */
      const stockage = stockageLocal();

      if (stockage !== null) {
        mettreEnAttente(stockage, {
          reference: session.reference,
          lignes: totaux.lignes,
          zone: etat.zone,
          totaux: {
            sousTotal: totaux.sousTotalCentimes,
            port: expedition.fraisCentimes,
            total: totaux.totalCentimes,
          },
          coordonnees: {
            prenomNom: nom.trim(),
            adresse: adresse.trim(),
            codePostal: codePostal.trim(),
            courriel: courriel.trim(),
          },
          modePaiement: session.mode,
        });
      }

      window.location.assign(session.url);
    } catch {
      setErreur(
        'Le serveur n’a pas répondu. Aucun paiement n’a été engagé et votre panier est intact : vérifiez votre connexion, puis réessayez.',
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

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

          {prixVitrineModifie ? <NotePrixMarchand /> : null}
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
          envoiEnCours={envoiEnCours}
          erreur={erreur}
          soumettre={soumettre}
        />
      </div>
    </div>
  );
}

/**
 * Le corps envoyé au serveur — les trois seuls champs qu'il accepte.
 *
 * Les lignes viennent de `totaux.lignes`, c'est-à-dire des lignes DÉJÀ
 * RAPPROCHÉES du catalogue, et non de `etat.lignes` : une référence retirée du
 * rayon depuis que le panier a été rempli est ainsi écartée ici, comme elle
 * l'est à l'affichage. Envoyer une ligne que la page n'a pas chiffrée ferait
 * refuser la demande pour un article que le visiteur ne voit nulle part.
 *
 * `composition` n'est posée que lorsqu'elle existe : `exactOptionalPropertyTypes`
 * distingue le champ absent du champ à `undefined`, et `JSON.stringify` non.
 */
function corpsDeLaDemande(totaux: Totaux, zone: CodeZone, totalCentimes: number) {
  return {
    lignes: totaux.lignes.map(({ ligne }) =>
      ligne.composition === undefined
        ? { sku: ligne.sku, quantite: ligne.quantite }
        : { sku: ligne.sku, quantite: ligne.quantite, composition: ligne.composition },
    ),
    zone,
    totalAnnonceCentimes: totalCentimes,
  };
}

/* -------------------------------------------------------------------------- */
/* La note des prix marchand (décision D24)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Le moment pédagogique de la démonstration.
 *
 * Elle n'apparaît que si le visiteur a réellement modifié le prix d'un article
 * qu'il a au panier — sinon elle avertirait de rien. Elle ne s'excuse pas d'une
 * limite : elle nomme la règle qui produit l'écart, et cette règle est
 * exactement ce que le projet vend. Le visiteur vient de tenter, sans le
 * vouloir, une falsification de prix côté client ; il constate qu'elle ne
 * passe pas.
 */
function NotePrixMarchand() {
  return (
    <p className="mt-6 max-w-lisible rounded-sm border border-ocre-clair bg-papier px-4 py-3 text-sm leading-relaxed text-encre">
      <span className="font-semibold">
        Vos essais de prix marchand ne s’appliquent pas au paiement de
        démonstration&nbsp;:
      </span>{' '}
      sur une boutique livrée, les prix vivent côté serveur — c’est précisément ce
      que le contrôle d’intégrité du paiement vérifie. Les montants ci-contre sont
      donc ceux du catalogue d’origine, et ce sont eux que le serveur recalculera
      avant d’ouvrir quoi que ce soit.
    </p>
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
        <span className="font-semibold">
          La démonstration n’envoie rien&nbsp;: vos coordonnées restent dans votre
          navigateur.
        </span>{' '}
        Ouvrir le paiement appelle bien le serveur, mais la demande ne contient que
        les articles, la destination et le total&nbsp;: pas votre nom, pas votre
        adresse, pas votre courriel. Ce que vous saisissez ici rejoint la commande
        rangée dans ce navigateur, et rien d’autre. Aucun courriel n’est expédié.
        Vous pouvez le vérifier vous-même dans l’onglet réseau de votre navigateur.
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
 * ÉCART LEVÉ EN C7 — le lien des conditions générales de vente pointait vers
 * `#cgv`, une ancre de CETTE page, faute de document à ouvrir : les documents
 * légaux étaient la tranche C7. Elle est livrée. Le lien vise désormais
 * `/conditions-generales-de-vente#cgv`, l'ancre du titre du document, et le
 * paragraphe provisoire qui annonçait l'échéance — ainsi que l'`aria-describedby`
 * qui le faisait annoncer avant l'activation — ont disparu avec elle.
 *
 * Il s'ouvre dans un NOUVEL ONGLET. C'est le seul lien du projet qui le fasse,
 * et la raison est étroite : partir lire les conditions générales depuis cet
 * écran-ci ferait perdre l'adresse saisie et la case cochée, puisque le
 * formulaire de commande vit dans l'état React de cet îlot et non dans le
 * stockage. Un client renvoyé à son panier vide parce qu'il a voulu lire le
 * contrat qu'on lui demande d'accepter, c'est la faute que ce lien évite. Le
 * `rel` accompagne la cible, et le libellé annonce l'ouverture.
 *
 * LE BOUTON AGIT DEPUIS LA TRANCHE C5. Il reste éteint tant que l'une des
 * TROIS VRAIES RÈGLES n'est pas satisfaite — expédition possible, coordonnées
 * complètes, conditions acceptées — et la phrase affichée dit laquelle
 * manque. La quatrième raison qui l'éteignait en C4, « le paiement arrive à la
 * tranche suivante », a disparu avec la tranche.
 *
 * Pendant l'envoi, le bouton est éteint et son libellé change : c'est la
 * protection contre le double clic sur un bouton d'engagement, et elle est
 * visible plutôt que silencieuse.
 */
function Engagement({
  conditionsAcceptees,
  setConditionsAcceptees,
  expeditionPossible,
  coordonneesCompletes,
  envoiEnCours,
  erreur,
  soumettre,
}: {
  readonly conditionsAcceptees: boolean;
  readonly setConditionsAcceptees: (valeur: boolean) => void;
  readonly expeditionPossible: boolean;
  readonly coordonneesCompletes: boolean;
  readonly envoiEnCours: boolean;
  readonly erreur: string | null;
  readonly soumettre: () => void;
}) {
  const pret = expeditionPossible && coordonneesCompletes && conditionsAcceptees;

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
          <Link
            href="/conditions-generales-de-vente#cgv"
            target="_blank"
            rel="noopener"
            className="underline decoration-filet decoration-2 underline-offset-4 hover:text-terre hover:decoration-terre"
          >
            conditions générales de vente
            <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
          </Link>
          .
        </span>
      </label>

      <button
        type="button"
        disabled={!pret || envoiEnCours}
        onClick={soumettre}
        aria-describedby="motif-bouton-final"
        className="mt-5 w-full rounded-sm border border-olive bg-olive px-4 py-3 text-sm font-semibold text-creme hover:bg-olive-clair disabled:cursor-not-allowed disabled:border-encre-douce/40 disabled:bg-creme disabled:text-encre-douce"
      >
        {envoiEnCours
          ? 'Ouverture du paiement…'
          : 'Commander avec obligation de paiement'}
      </button>

      <p
        id="motif-bouton-final"
        aria-live="polite"
        className="mt-3 text-xs leading-relaxed text-encre-douce"
      >
        {motifBouton(
          expeditionPossible,
          coordonneesCompletes,
          conditionsAcceptees,
          envoiEnCours,
        )}
      </p>

      {erreur === null ? null : (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-terre/40 bg-creme px-4 py-3 text-xs leading-relaxed text-encre"
        >
          {erreur}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-encre-douce">
        Le libellé de ce bouton est celui qu’impose l’article L. 221-14 du code de la
        consommation à toute commande en ligne&nbsp;: l’acheteur doit lire qu’il
        s’engage à payer, et non un verbe de son choix.
      </p>
    </section>
  );
}

function motifBouton(
  expeditionPossible: boolean,
  coordonneesCompletes: boolean,
  conditionsAcceptees: boolean,
  envoiEnCours: boolean,
): string {
  if (envoiEnCours) {
    return 'Demande de session de paiement en cours. Ne fermez pas cet onglet : vous allez être redirigé.';
  }

  if (!expeditionPossible) {
    return 'Ce panier ne peut pas être expédié vers la destination choisie : revenez au panier pour changer de destination ou retirer l’article en cause.';
  }

  if (!coordonneesCompletes) {
    return 'Complétez vos coordonnées : prénom et nom, adresse, code postal cohérent avec la destination, et courriel.';
  }

  if (!conditionsAcceptees) {
    return 'Cochez la case d’acceptation des conditions générales de vente : elle est obligatoire.';
  }

  return 'Ce bouton ouvre le paiement. Vos coordonnées ne partent pas : seuls les articles, la destination et le total sont envoyés, et le serveur recalcule ce total avant d’ouvrir quoi que ce soit.';
}
