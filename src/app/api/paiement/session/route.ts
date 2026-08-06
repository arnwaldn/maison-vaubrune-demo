import { CATALOGUE } from '@/donnees/catalogue';
import { genererReference } from '@/lib/commandes/reference';
import { choisirAdaptateur } from '@/lib/paiement/adaptateur';
import { catalogueDeValidation, validerCorps } from '@/lib/paiement/validation';

/**
 * LA SEULE ROUTE SERVEUR DU PROJET : elle ouvre une session de paiement.
 *
 * =============================================================================
 * CONTRAT DE CONFIDENTIALITÉ — ce qui entre ici, et ce qui n'y entre jamais
 * =============================================================================
 *
 * Le corps accepté ne contient QUE trois choses :
 *
 *   { lignes: [{ sku, quantite, composition? }], zone, totalAnnonceCentimes }
 *
 * Ni nom, ni adresse, ni code postal, ni courriel, ni téléphone. Ce n'est pas
 * une omission qu'on comblerait plus tard : c'est la traduction technique de la
 * décision D2. Les coordonnées saisies sur `/commande` restent dans le
 * navigateur du visiteur, rejoignent la commande rangée dans son stockage
 * local, et ne franchissent aucune frontière réseau. Le prestataire de
 * paiement, lui, collecte SA propre adresse de livraison sur sa page hébergée
 * (`shipping_address_collection`, France seule) : c'est son métier, il est
 * agréé pour cela, et le site n'a rien à transporter au milieu.
 *
 * La conséquence tient en une phrase que la page dit au visiteur : « la
 * démonstration n'envoie rien : vos coordonnées restent dans votre navigateur ».
 * Elle est vraie, et elle est vérifiable en ouvrant l'onglet réseau.
 *
 * =============================================================================
 * DOCTRINE — le serveur recalcule, il ne croit jamais un prix du navigateur
 * =============================================================================
 *
 * C'est la différence entre une boutique et un formulaire. Le corps porte un
 * `totalAnnonceCentimes` : ce nombre ne sert QU'À ÊTRE COMPARÉ au total que le
 * serveur recalcule lui-même, depuis le catalogue versionné et le moteur de
 * frais de port. Un écart d'un centime, et la requête est refusée avant tout
 * appel au prestataire.
 *
 * Le raisonnement complet — et la liste ordonnée des onze contrôles — est en
 * tête de `src/lib/paiement/validation.ts`. Toute la décision y vit, dans une
 * fonction pure qui se teste sans fabriquer de `Request` ; il ne reste ici que
 * la plomberie HTTP.
 *
 * =============================================================================
 * Pourquoi `nodejs` et `force-dynamic`
 * =============================================================================
 *
 * `nodejs` : la bibliothèque du prestataire est une bibliothèque serveur, elle
 * n'est pas garantie sur un exécuteur de périphérie. `force-dynamic` et
 * `Cache-Control: no-store` : une réponse contenant une adresse de session de
 * paiement mise en cache serait servie à un autre visiteur, qui paierait la
 * commande d'un inconnu. On ne compte pas sur le fait qu'une réponse POST
 * n'est « normalement » pas mise en cache.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Le catalogue de validation, préparé une fois au chargement du module. */
const CATALOGUE_VALIDATION = catalogueDeValidation(CATALOGUE);

const EN_TETES = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
} as const;

function reponse(charge: unknown, statut: number): Response {
  return new Response(JSON.stringify(charge), { status: statut, headers: EN_TETES });
}

/* -------------------------------------------------------------------------- */
/* Le seau à jetons                                                            */
/* -------------------------------------------------------------------------- */

/**
 * FREIN DE BONNE FOI, et rien de plus — la portée est dite honnêtement.
 *
 * Ce seau vit dans la MÉMOIRE DE L'INSTANCE. Sur un hébergement sans état,
 * chaque instance a le sien, les instances se multiplient sous la charge, et
 * elles s'éteignent après quelques minutes d'inactivité : dix requêtes par
 * minute et par adresse deviennent dix par minute PAR INSTANCE. Ce n'est donc
 * pas une protection contre une attaque distribuée, et l'écrire ici évite de
 * le croire. Ce que ce frein fait réellement : il empêche un script naïf ou un
 * bouton qui se répète de créer cent sessions de paiement d'affilée, ce qui
 * suffit à l'usage réel d'une démonstration.
 *
 * Une boutique livrée mettrait ce compteur dans un magasin partagé (Redis,
 * Durable Object, ou le pare-feu de l'hébergeur) — c'est une ligne de
 * configuration, pas une réécriture, parce que la décision reste ici.
 */
const CAPACITE_SEAU = 10;
const FENETRE_MS = 60_000;
/** Au-delà, l'entrée ne dit plus rien d'utile et n'a pas à occuper la mémoire. */
const OUBLI_MS = 5 * FENETRE_MS;

interface Seau {
  jetons: number;
  dernier: number;
}

const SEAUX = new Map<string, Seau>();

function autoriser(adresse: string, maintenant: number): boolean {
  for (const [cle, seau] of SEAUX) {
    if (maintenant - seau.dernier > OUBLI_MS) {
      SEAUX.delete(cle);
    }
  }

  const seau = SEAUX.get(adresse);

  if (seau === undefined) {
    SEAUX.set(adresse, { jetons: CAPACITE_SEAU - 1, dernier: maintenant });
    return true;
  }

  const recharge = ((maintenant - seau.dernier) / FENETRE_MS) * CAPACITE_SEAU;
  const jetons = Math.min(CAPACITE_SEAU, seau.jetons + recharge);

  seau.dernier = maintenant;

  if (jetons < 1) {
    seau.jetons = jetons;
    return false;
  }

  seau.jetons = jetons - 1;
  return true;
}

/**
 * L'adresse du demandeur, telle que l'hébergeur la rapporte.
 *
 * `x-forwarded-for` peut être falsifié par le client quand aucun intermédiaire
 * de confiance ne le réécrit : le seau ci-dessus ne prétend donc pas identifier
 * qui que ce soit, il regroupe des requêtes. C'est cohérent avec ce qu'il est.
 */
function adresseDemandeur(requete: Request): string {
  const transmise = requete.headers.get('x-forwarded-for');

  return transmise === null ? 'inconnue' : (transmise.split(',')[0]?.trim() ?? 'inconnue');
}

/* -------------------------------------------------------------------------- */
/* L'origine de retour                                                         */
/* -------------------------------------------------------------------------- */

/**
 * L'origine vers laquelle le prestataire renverra le visiteur.
 *
 * Elle est prise sur l'URL de la requête reçue, et non sur une variable
 * d'environnement : c'est la seule valeur qui soit juste à la fois en local,
 * sur un aperçu de déploiement et en production, sans configuration.
 */
function urlBase(requete: Request): string {
  return new URL(requete.url).origin;
}

/* -------------------------------------------------------------------------- */
/* POST                                                                        */
/* -------------------------------------------------------------------------- */

export async function POST(requete: Request): Promise<Response> {
  if (!autoriser(adresseDemandeur(requete), Date.now())) {
    return reponse(
      {
        code: 'trop-de-requetes',
        message:
          'Trop de demandes de paiement en peu de temps. Patientez une minute avant de réessayer.',
      },
      429,
    );
  }

  let corps: unknown;

  try {
    corps = await requete.json();
  } catch {
    return reponse(
      {
        code: 'corps-illisible',
        message: 'Le corps de la requête n’est pas du JSON exploitable.',
      },
      400,
    );
  }

  const validation = validerCorps(corps, CATALOGUE_VALIDATION);

  if (!validation.ok) {
    /* 422 et non 400 : le corps est syntaxiquement recevable, c'est son SENS
       qui est refusé — un prix qui ne tombe pas juste, un stock dépassé, une
       destination que le moteur refuse. Le message est celui de la validation,
       en français, et il dit ce qui s'est passé plutôt que « erreur ». */
    return reponse({ code: validation.code, message: validation.message }, 422);
  }

  const reference = genererReference(new Date(), Math.random);

  /* `choisirAdaptateur()` est DANS le `try` : il jette quand une clé réelle est
     posée (voir `paiement/stripe.ts`), et ce refus est une faute de
     configuration de l'exploitant, pas du visiteur. Le laisser remonter
     donnerait à ce dernier une page d'erreur opaque ; ici il obtient la même
     phrase honnête que pour une panne du prestataire, tandis que le motif exact
     — « clés de test seulement » — part au journal du serveur, là où
     l'exploitant le lira. Constaté et corrigé au parcours de vérification C5. */
  try {
    const session = await choisirAdaptateur().creerSession(
      { ...validation.commandePreparee, reference },
      urlBase(requete),
    );

    return reponse(
      { url: session.url, reference: session.reference, mode: session.mode },
      200,
    );
  } catch (erreur) {
    /* Le détail de l'échec reste au journal du serveur : une clé refusée, une
       panne du prestataire ou une session sans adresse ne se racontent pas au
       visiteur, qui n'y peut rien et à qui on ne doit pas montrer les entrailles
       de l'installation. */
    console.error('Création de session de paiement impossible', erreur);

    return reponse(
      {
        code: 'prestataire-indisponible',
        message:
          'Le paiement n’a pas pu être ouvert. Aucun montant n’a été engagé, et votre panier est intact. Réessayez dans un instant.',
      },
      502,
    );
  }
}
