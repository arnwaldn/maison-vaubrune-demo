import { BAREMES, type BaremeZone, type Tranche } from '@/donnees/bareme-expedition';
import { formaterEuros } from '@/lib/argent';
import { typographier } from '@/lib/typographie';
import { LIBELLE_ZONE, type CodeZone } from '@/lib/types';

/**
 * LE MOTEUR DE FRAIS DE PORT. Fonctions pures, aucun état, aucune date.
 *
 * ---------------------------------------------------------------------------
 * Ce que ce module ne contient pas
 * ---------------------------------------------------------------------------
 *
 * Pas un seul montant. Pas un seul seuil. Pas un seul délai. Tout cela vit
 * dans `src/donnees/bareme-expedition.ts`, que ce fichier ne fait que lire.
 * La conséquence pratique est celle qu'on vend au client : changer de
 * transporteur ne demande pas de rouvrir le moteur, et rouvrir le moteur ne
 * risque pas de déplacer un prix par accident.
 *
 * ---------------------------------------------------------------------------
 * L'ORDRE D'APPLICATION — cinq étapes, dans cet ordre, et pas un autre
 * ---------------------------------------------------------------------------
 *
 * Un moteur de frais de port n'est pas difficile ; c'est son ORDRE qui l'est.
 * Facturer l'isotherme avant de vérifier que la zone accepte le frais, ou
 * appliquer le franco avant d'avoir ajouté l'isotherme, donne des résultats
 * différents sur les mêmes données. L'ordre est donc écrit ici, et chaque
 * étape est vérifiée par au moins un test qui échouerait si on la déplaçait.
 *
 *   0. PANIER VIDE. Zéro gramme n'est pas un colis : les frais valent zéro et
 *      le détail est vide. Cette garde précède tout le reste parce que la
 *      première tranche du barème facture « de 0 à 1 000 g » et rendrait donc
 *      4,90 € pour un panier qu'on vient de vider — un prix faux affiché à
 *      l'écran, et la manière la plus banale de perdre la confiance d'un
 *      acheteur. C'est le seul écart avec les cinq étapes ci-dessous, et il
 *      est ici pour être vu.
 *
 *   1. POIDS TOTAL. Somme des poids unitaires multipliés par les quantités.
 *      Rien d'autre n'entre : ni le prix, ni la famille, ni le volume.
 *
 *   2. PÉRISSABLE CONTRE ZONE. Si le panier contient au moins une ligne
 *      périssable et que la zone refuse ces envois, l'expédition est
 *      IMPOSSIBLE — on s'arrête là, sans calculer de prix. Une boutique qui
 *      chiffre d'abord et refuse ensuite fait espérer pour rien.
 *
 *   3. TRANCHE DE POIDS. La première tranche dont la borne haute (INCLUSE)
 *      couvre le poids. Aucune tranche ne convient — le colis dépasse le
 *      barème — et l'expédition est IMPOSSIBLE, avec un message qui invite à
 *      écrire plutôt qu'un prix extrapolé que personne n'a fixé.
 *
 *   4. SUPPLÉMENT ISOTHERME. Ajouté si le panier contient au moins une ligne
 *      périssable. À cette étape, la zone a forcément accepté le frais
 *      (étape 2), donc la question ne se pose plus.
 *
 *   5. FRANCO DE PORT. Si la zone a un seuil et que le sous-total l'atteint,
 *      les frais tombent à ZÉRO — supplément isotherme compris. Voir
 *      `contenu/decisions/004-franco-couvre-isotherme.md` : « offerts au-delà
 *      de 69 € » se dit sans astérisque, ou ne se dit pas.
 *
 * ---------------------------------------------------------------------------
 * Deux résultats possibles, et un type qui l'impose
 * ---------------------------------------------------------------------------
 *
 * `ResultatExpedition` est une union discriminée sur `statut`. L'appelant ne
 * peut pas lire `fraisCentimes` sans avoir prouvé au compilateur qu'il tient
 * un résultat calculé, et ne peut pas afficher `message` sur un panier
 * livrable. C'est le même parti pris que `Conservation` dans `types.ts` : un
 * champ « erreur » optionnel à côté d'un champ « prix » optionnel finit
 * toujours par être lu du mauvais côté.
 *
 * Le `message` d'un refus est une PHRASE FRANÇAISE PRÊTE À AFFICHER, passée
 * par `typographier()` (décision D11). L'appelant n'a rien à formuler : le
 * moteur sait pourquoi il refuse, et c'est lui qui doit savoir le dire.
 */

/* -------------------------------------------------------------------------- */
/* Entrées                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Une ligne de panier, réduite à ce qui décide des frais de port.
 *
 * Volontairement PAS un `Produit` ni une `Variante` : le moteur n'a pas besoin
 * du catalogue pour travailler, il a besoin de quatre nombres et d'un drapeau.
 * On peut donc le tester sans construire quinze fiches, et une future source
 * de données (un vrai dépôt produits) n'aura qu'à produire cette forme-là.
 *
 * `perissable` se calcule chez l'appelant avec `exigeChaineDuFroid()` — le
 * seul prédicat autorisé (voir `types.ts`) : la règle se branche sur le régime
 * de conservation, jamais sur la famille.
 */
export interface LigneExpediable {
  readonly sku: string;
  readonly quantite: number;
  readonly poidsUnitaireGrammes: number;
  readonly perissable: boolean;
}

/* -------------------------------------------------------------------------- */
/* Sorties                                                                     */
/* -------------------------------------------------------------------------- */

/** Une ligne du décompte affiché au client. */
export interface LigneDetail {
  readonly libelle: string;
  readonly montantCentimes: number;
}

export type MotifImpossible = 'perissable-hors-metropole' | 'poids-hors-bareme';

export type ResultatExpedition =
  | {
      readonly statut: 'calcule';
      readonly zone: CodeZone;
      readonly poidsTotalGrammes: number;
      readonly fraisCentimes: number;
      readonly francoApplique: boolean;
      /** Ce qu'il reste à ajouter au panier pour l'offre ; `null` sans franco. */
      readonly resteAvantFrancoCentimes: number | null;
      readonly detail: readonly LigneDetail[];
    }
  | {
      readonly statut: 'impossible';
      readonly zone: CodeZone;
      readonly motif: MotifImpossible;
      /** Phrase française prête à afficher, insécables posées. */
      readonly message: string;
    };

/* -------------------------------------------------------------------------- */
/* Étape 1 — le poids                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Poids total d'un panier, en grammes.
 *
 * Le poids unitaire est celui du COLIS de la variante, emballage compris
 * (voir `Variante.poidsGrammes`) : le moteur n'ajoute aucune tare, elle est
 * déjà dedans. Un panier sans ligne pèse zéro, ce qui est la bonne réponse et
 * non un cas particulier.
 */
export function poidsTotal(lignes: readonly LigneExpediable[]): number {
  return lignes.reduce(
    (total, ligne) => total + ligne.poidsUnitaireGrammes * ligne.quantite,
    0,
  );
}

/* -------------------------------------------------------------------------- */
/* Étape 3 — la tranche                                                        */
/* -------------------------------------------------------------------------- */

/**
 * La tranche qui s'applique à un poids, ou `null` s'il dépasse le barème.
 *
 * Les tranches sont triées et leurs bornes hautes sont INCLUSES : la première
 * dont la borne couvre le poids est la bonne. À 1 000 g exactement on paie
 * encore la première tranche ; à 1 001 g on passe à la deuxième.
 */
export function trancheApplicable(
  bareme: BaremeZone,
  poidsGrammes: number,
): Tranche | null {
  return bareme.tranches.find((tranche) => poidsGrammes <= tranche.jusquAGrammes) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Étape 5 — le franco                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Ce qu'il reste à ajouter au panier pour que le port soit offert.
 *
 * `null` quand la zone n'a pas de franco : c'est une information différente de
 * « il ne reste rien à ajouter », et les confondre afficherait « plus que 0 €
 * pour la livraison offerte » sur une zone qui n'offre jamais rien. Zéro
 * signifie donc, et seulement, que le seuil est atteint ou dépassé.
 */
export function resteAvantFranco(
  bareme: BaremeZone,
  sousTotalCentimes: number,
): number | null {
  if (bareme.seuilFrancoCentimes === null) {
    return null;
  }

  return Math.max(0, bareme.seuilFrancoCentimes - sousTotalCentimes);
}

/* -------------------------------------------------------------------------- */
/* Le calcul complet                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Les frais de port d'un panier vers une zone.
 *
 * Le barème est injectable pour une seule raison : la surcouche marchand de la
 * démonstration (décision D2) doit pouvoir proposer d'autres tarifs sans
 * toucher au fichier versionné. Il est censé porter la MÊME zone que le
 * paramètre `zone`, qui reste celle du résultat — le cas d'usage est un
 * marchand qui remplace ses tarifs, pas ses zones.
 */
export function calculerFraisPort(
  lignes: readonly LigneExpediable[],
  zone: CodeZone,
  sousTotalCentimes: number,
  bareme?: BaremeZone,
): ResultatExpedition {
  const bareme_ = bareme ?? BAREMES[zone];
  const poidsTotalGrammes = poidsTotal(lignes);

  // Étape 0 — un panier vide n'est pas un colis.
  if (poidsTotalGrammes === 0) {
    return {
      statut: 'calcule',
      zone,
      poidsTotalGrammes: 0,
      fraisCentimes: 0,
      francoApplique: false,
      resteAvantFrancoCentimes: resteAvantFranco(bareme_, sousTotalCentimes),
      detail: [],
    };
  }

  // Étape 2 — périssable contre zone, avant tout calcul de prix.
  const contientPerissable = lignes.some((ligne) => ligne.perissable);

  if (contientPerissable && !bareme_.acceptePerissable) {
    return {
      statut: 'impossible',
      zone,
      motif: 'perissable-hors-metropole',
      message: messagePerissableRefuse(bareme_),
    };
  }

  // Étape 3 — la tranche de poids.
  const tranche = trancheApplicable(bareme_, poidsTotalGrammes);

  if (tranche === null) {
    return {
      statut: 'impossible',
      zone,
      motif: 'poids-hors-bareme',
      message: messagePoidsHorsBareme(bareme_, poidsTotalGrammes),
    };
  }

  // Étape 4 — le supplément isotherme.
  const detail: LigneDetail[] = [
    {
      libelle: typographier(
        `Expédition — ${bareme_.libelle} (colis jusqu’à ${formaterPoids(tranche.jusquAGrammes)})`,
      ),
      montantCentimes: tranche.prixCentimes,
    },
  ];

  if (contientPerissable) {
    detail.push({
      libelle: typographier('Emballage isotherme (produit frais)'),
      montantCentimes: bareme_.supplementIsothermeCentimes,
    });
  }

  const fraisCentimes = detail.reduce(
    (total, ligne) => total + ligne.montantCentimes,
    0,
  );

  // Étape 5 — le franco, qui couvre AUSSI l'isotherme (décision 004).
  const seuil = bareme_.seuilFrancoCentimes;

  if (seuil !== null && sousTotalCentimes >= seuil) {
    return {
      statut: 'calcule',
      zone,
      poidsTotalGrammes,
      fraisCentimes: 0,
      francoApplique: true,
      resteAvantFrancoCentimes: 0,
      detail: [
        {
          libelle: typographier(
            `Frais de port offerts à partir de ${formaterEuros(seuil)}`,
          ),
          montantCentimes: 0,
        },
      ],
    };
  }

  return {
    statut: 'calcule',
    zone,
    poidsTotalGrammes,
    fraisCentimes,
    francoApplique: false,
    resteAvantFrancoCentimes: resteAvantFranco(bareme_, sousTotalCentimes),
    detail,
  };
}

/* -------------------------------------------------------------------------- */
/* Affichage des poids                                                         */
/* -------------------------------------------------------------------------- */

/** Insère l'espace de séparation des milliers, ordinaire (D11 la rendra insécable). */
const MILLIERS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Un poids, en français.
 *
 * Les multiples exacts de mille se disent en kilogrammes — « 1 kg » plutôt que
 * « 1 000 g », parce qu'un barème se lit en kilos. Le reste se dit en grammes,
 * séparateur de milliers compris : « 30 001 g ». Les espaces sont posées par
 * `typographier()`, jamais écrites en caractère invisible (décision D11).
 */
export function formaterPoids(grammes: number): string {
  if (grammes % 1000 === 0) {
    return typographier(`${String(grammes / 1000)} kg`);
  }

  return typographier(`${String(grammes).replace(MILLIERS, ' ')} g`);
}

/* -------------------------------------------------------------------------- */
/* Les deux refus, dits en français                                            */
/* -------------------------------------------------------------------------- */

function messagePerissableRefuse(bareme: BaremeZone): string {
  return typographier(
    'Ce panier contient un produit frais, expédié sous emballage isotherme et ' +
      'sous chaîne du froid continue : ces envois ne sont assurés qu’en ' +
      `${LIBELLE_ZONE.metropole}. La destination choisie (${bareme.libelle}) ` +
      'n’est pas desservie pour ces produits, et nous préférons refuser la ' +
      'commande plutôt que livrer une denrée douteuse. Retirez le produit frais ' +
      'du panier pour commander le reste.',
  );
}

function messagePoidsHorsBareme(bareme: BaremeZone, poidsGrammes: number): string {
  /* La borne du barème se prend par le maximum plutôt que par le dernier
     élément : `tranches[length - 1]` obligerait à un `??` que le compilateur
     réclame (index non garanti) et dont la branche droite serait à jamais
     morte — donc introuvable par la couverture. Le maximum ne suppose rien de
     l'ordre et ne coûte aucun embranchement. */
  const borneMaximale = Math.max(
    ...bareme.tranches.map((tranche) => tranche.jusquAGrammes),
  );

  return typographier(
    `Ce panier pèse ${formaterPoids(poidsGrammes)}. Le barème s’arrête à ` +
      `${formaterPoids(borneMaximale)} pour cette destination ` +
      `(${bareme.libelle}) : au-delà, l’expédition se chiffre au cas par cas. ` +
      'Écrivez-nous avec le contenu de votre panier, nous vous répondrons avec ' +
      'un prix ferme et un délai.',
  );
}
