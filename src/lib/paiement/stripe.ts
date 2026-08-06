import Stripe from 'stripe';

import type {
  AdaptateurPaiement,
  CommandePreparee,
  SessionPaiement,
} from '@/lib/paiement/adaptateur';
import { typographier } from '@/lib/typographie';

/**
 * L'ADAPTATEUR STRIPE — page de paiement hébergée, mode test EXCLUSIVEMENT.
 *
 * ---------------------------------------------------------------------------
 * CE FICHIER NE DOIT JAMAIS ATTEINDRE LE NAVIGATEUR
 * ---------------------------------------------------------------------------
 *
 * La bibliothèque officielle qu'il importe est une bibliothèque SERVEUR : elle
 * manipule la clé secrète. Sa présence dans un paquet client serait à la fois
 * un poids mort de plusieurs centaines de kilo-octets et une faute de
 * conception. Trois choses la tiennent à sa place, et il faut les trois :
 * ce module n'est importé que par `adaptateur.ts`, lui-même importé que par la
 * route serveur ; la route déclare `runtime = 'nodejs'` ; et la vérification de
 * sortie de la tranche C5 cherche la bibliothèque dans `.next/static/` avant de
 * déclarer la tranche livrée. Aucun composant portant `'use client'` ne doit
 * jamais importer ce fichier, même pour un type.
 *
 * ---------------------------------------------------------------------------
 * UNE CLÉ LIVE JETTE. Ce n'est pas une précaution, c'est la garantie
 * ---------------------------------------------------------------------------
 *
 * Cette boutique est une démonstration : elle ne doit JAMAIS encaisser un
 * centime réel. Une clé qui ne commence pas par `sk_test_` est donc refusée à
 * la CONSTRUCTION de l'adaptateur, avant tout appel réseau. Le refus est
 * bruyant — une exception avec un message qui dit quoi faire — parce qu'une
 * démonstration qui se mettrait silencieusement à encaisser serait le pire
 * défaut imaginable de ce projet, et qu'un collage de clé malheureux dans une
 * interface d'hébergeur est une manœuvre de dix secondes.
 *
 * ---------------------------------------------------------------------------
 * Ce que la session Checkout contient, et pourquoi
 * ---------------------------------------------------------------------------
 *
 * - `mode: 'payment'` EXCLUSIF (décision D7) : un paiement unique, jamais un
 *   engagement récurrent. La récurrence appartient à l'offre « application en
 *   ligne » du portfolio, pas à l'offre « boutique ». Un test de la tranche
 *   monte la garde sur cette frontière.
 * - `locale: 'fr'` : la page du prestataire s'affiche dans la langue du site.
 * - `line_items` en `price_data` EN LIGNE, jamais des identifiants de prix
 *   créés d'avance chez le prestataire. Le catalogue de cette démonstration
 *   vit dans un fichier versionné (décision D2) : dupliquer chaque prix chez le
 *   prestataire créerait une seconde vérité qu'il faudrait synchroniser, et
 *   c'est exactement la panne qui fait payer à un client un prix qu'il n'a pas
 *   vu. Les montants envoyés sont ceux que le serveur vient de RECALCULER.
 * - Les frais de port passent par `shipping_options` à tarif unique, et non
 *   par une ligne d'article : c'est la place que le prestataire leur donne, et
 *   celle qui les fait apparaître comme des frais dans son récapitulatif comme
 *   sur le reçu.
 * - `shipping_address_collection` limitée à la France : le moteur de frais de
 *   port de ce projet ne connaît que trois zones françaises (décision D9).
 *   Laisser choisir un autre pays afficherait une adresse que la boutique ne
 *   sait pas desservir.
 * - `client_reference_id` porte NOTRE référence : c'est le seul fil qui relie
 *   la session du prestataire à la commande rangée dans le navigateur.
 */

/** Le seul préfixe de clé accepté. Voir l'en-tête. */
export const PREFIXE_CLE_TEST = 'sk_test_';

/**
 * Construit l'adaptateur, ou jette si la clé n'est pas une clé de test.
 *
 * @throws {Error} si `cleSecrete` ne commence pas par `sk_test_`.
 */
export function creerAdaptateurStripe(cleSecrete: string): AdaptateurPaiement {
  if (!cleSecrete.startsWith(PREFIXE_CLE_TEST)) {
    throw new Error(
      typographier(
        'Clé de paiement refusée : Maison Vaubrune est une démonstration et ne ' +
          `doit jamais encaisser de paiement réel. Seules les clés de test ` +
          `(préfixe « ${PREFIXE_CLE_TEST} ») sont acceptées. Remplacez la valeur ` +
          'de STRIPE_SECRET_KEY par une clé de test, ou retirez-la : sans clé, ' +
          'la boutique bascule sur son écran de paiement simulé.',
      ),
    );
  }

  /* La version d'API n'est pas imposée ici : la bibliothèque est épinglée dans
     `package.json` et embarque la version d'API sur laquelle ses types ont été
     engendrés. Fixer une chaîne à la main ouvrirait la porte au désaccord
     classique entre les types compilés et la version réellement appelée. */
  const client = new Stripe(cleSecrete);

  return {
    nom: 'stripe',

    async creerSession(
      commande: CommandePreparee,
      urlBase: string,
    ): Promise<SessionPaiement> {
      const reference = encodeURIComponent(commande.reference);

      const session = await client.checkout.sessions.create({
        mode: 'payment',
        locale: 'fr',
        line_items: commande.lignes.map((calculee) => ({
          quantity: calculee.ligne.quantite,
          price_data: {
            currency: 'eur',
            product_data: {
              name: typographier(
                `${calculee.article.nomProduit}, ${calculee.article.format}`,
              ),
            },
            unit_amount: calculee.article.prixCentimes,
          },
        })),
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              display_name: typographier('Frais de port'),
              fixed_amount: {
                amount: commande.fraisPortCentimes,
                currency: 'eur',
              },
            },
          },
        ],
        shipping_address_collection: { allowed_countries: ['FR'] },
        client_reference_id: commande.reference,
        success_url: `${urlBase}/commande/confirmation?reference=${reference}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${urlBase}/commande/annulee?reference=${reference}`,
      });

      /* `url` est nulle quand la session est créée pour un affichage intégré,
         ce qui n'est pas notre cas — mais le type le permet, et rediriger vers
         `null` donnerait une page blanche sans explication. */
      if (session.url === null) {
        throw new Error(
          typographier(
            'Le prestataire de paiement a créé une session sans adresse de ' +
              'redirection. Aucun paiement n’a été engagé.',
          ),
        );
      }

      return { url: session.url, reference: commande.reference, mode: 'test' };
    },
  };
}
