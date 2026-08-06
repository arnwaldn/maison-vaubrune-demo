import { creerAdaptateurStripe } from '@/lib/paiement/stripe';
import { ADAPTATEUR_SIMULE } from '@/lib/paiement/simule';
import type { LigneCalculee } from '@/lib/panier/totaux';
import type { CodeZone } from '@/lib/types';

/**
 * L'ADAPTATEUR DE PAIEMENT — le contrat, et le choix de l'implémentation.
 *
 * ---------------------------------------------------------------------------
 * Ce que la décision D3 achète vraiment
 * ---------------------------------------------------------------------------
 *
 * Tout le tunnel — la validation serveur, la commande en attente, la page de
 * confirmation, les états, le journal — se construit et se vérifie SANS AUCUNE
 * CLÉ. Le prestataire n'est pas au centre du système, il en est une pièce
 * remplaçable derrière une interface de deux membres. Conséquences concrètes,
 * dans l'ordre où elles se sont vérifiées :
 *
 * 1. La démonstration se montre à quelqu'un sans compte marchand et sans
 *    connexion réseau : l'écran simulé s'annonce comme simulé, et le parcours
 *    va jusqu'au bout.
 * 2. Les tests unitaires tournent sans appeler personne.
 * 3. Le jour où un client veut un autre prestataire — et il y en a d'autres en
 *    France — c'est un fichier à écrire, pas un tunnel à refaire.
 *
 * ---------------------------------------------------------------------------
 * `choisirAdaptateur()` lit l'environnement À L'APPEL, jamais à l'import
 * ---------------------------------------------------------------------------
 *
 * Une constante de module `const CLE = process.env.STRIPE_SECRET_KEY` serait
 * évaluée au premier import du module — c'est-à-dire, dans Next, pendant la
 * CONSTRUCTION. La variable est alors absente de l'environnement de build, le
 * module figerait « pas de clé », et la clé posée dans l'hébergeur n'aurait
 * plus aucun effet à l'exécution. La lecture est donc faite dans le corps de la
 * fonction, à chaque requête. Le coût est nul ; l'erreur évitée est de celles
 * qu'on ne comprend qu'après avoir douté de tout le reste.
 */

/* -------------------------------------------------------------------------- */
/* Le contrat                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Une commande prête à être payée : ce que le SERVEUR a recalculé, jamais ce
 * que le navigateur a annoncé.
 *
 * Aucune coordonnée n'y figure — ni nom, ni adresse, ni courriel. C'est la
 * traduction en types de la décision D2 : le serveur de cette démonstration ne
 * voit pas les coordonnées de ses visiteurs, et un champ qu'on n'a pas ne
 * fuite pas.
 */
export interface CommandePrepareeSansReference {
  /** Les lignes chiffrées par `calculerTotaux()`, côté serveur. */
  readonly lignes: readonly LigneCalculee[];
  readonly zone: CodeZone;
  readonly fraisPortCentimes: number;
  readonly totalCentimes: number;
}

export type CommandePreparee = CommandePrepareeSansReference & {
  readonly reference: string;
};

export interface SessionPaiement {
  /** Où envoyer le visiteur. Absolue chez le prestataire, relative en simulation. */
  readonly url: string;
  readonly reference: string;
  readonly mode: 'test' | 'simule';
}

export interface AdaptateurPaiement {
  readonly nom: 'stripe' | 'simule';
  creerSession(commande: CommandePreparee, urlBase: string): Promise<SessionPaiement>;
}

/* -------------------------------------------------------------------------- */
/* Le choix                                                                    */
/* -------------------------------------------------------------------------- */

/** Le nom de la variable d'environnement, écrit une fois. */
export const NOM_VARIABLE_CLE = 'STRIPE_SECRET_KEY';

/**
 * L'adaptateur qui s'applique ici et maintenant.
 *
 * Une clé absente, vide ou faite d'espaces vaut « pas de clé » : une variable
 * posée à la chaîne vide dans une interface d'hébergeur est une variable
 * oubliée, pas une intention.
 */
export function choisirAdaptateur(): AdaptateurPaiement {
  const cle = process.env[NOM_VARIABLE_CLE]?.trim() ?? '';

  if (cle === '') {
    return ADAPTATEUR_SIMULE;
  }

  return creerAdaptateurStripe(cle);
}
