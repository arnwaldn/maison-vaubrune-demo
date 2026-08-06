import type {
  AdaptateurPaiement,
  CommandePreparee,
  SessionPaiement,
} from '@/lib/paiement/adaptateur';

/**
 * L'ADAPTATEUR SIMULÉ — celui qui tourne quand aucune clé n'est posée.
 *
 * Il n'appelle personne. Il rend l'adresse d'un écran du site qui IMITE une
 * page de paiement et le dit en première ligne. C'est la seule manière
 * honnête de montrer le tunnel complet à quelqu'un qui n'a pas de compte
 * marchand : la redirection est réelle, le retour est réel, le journal de la
 * commande est réel — seul l'encaissement n'existe pas, et l'écran le déclare
 * avant qu'on ait le temps de s'y tromper.
 *
 * L'URL est RELATIVE. Elle ne quitte pas le site, donc l'origine n'a pas à
 * être devinée : ni `urlBase` mal configurée, ni redirection vers un domaine
 * qu'on n'aurait pas voulu. Le paramètre `urlBase` du contrat reste ignoré
 * ici, ce qui est le comportement juste et non un manque.
 *
 * Le total est passé en paramètre d'URL pour que l'écran l'affiche sans avoir
 * à relire le stockage : il ne sert qu'à l'affichage, aucune décision n'en
 * dépend, et il a déjà été recalculé côté serveur.
 */

/** L'adresse de l'écran simulé, écrite une fois. */
export const CHEMIN_SIMULATION = '/paiement/simulation';

export const ADAPTATEUR_SIMULE: AdaptateurPaiement = {
  nom: 'simule',

  creerSession(commande: CommandePreparee): Promise<SessionPaiement> {
    const parametres = new URLSearchParams({
      reference: commande.reference,
      total: String(commande.totalCentimes),
    });

    return Promise.resolve({
      url: `${CHEMIN_SIMULATION}?${parametres.toString()}`,
      reference: commande.reference,
      mode: 'simule',
    });
  },
};
