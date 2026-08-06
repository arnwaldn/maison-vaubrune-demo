/**
 * Les emplacements à compléter qui reviennent dans PLUSIEURS documents.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce fichier existe
 * ---------------------------------------------------------------------------
 *
 * Le rédacteur juridique a compté 85 libellés distincts dans ses brouillons et
 * signalé, dans ses notes d'intégration (§ 2.1), que plusieurs d'entre eux
 * désignent LA MÊME VALEUR sous des formulations voisines. Laisser les deux
 * formulations en place aurait un effet très concret : le marchand saisit deux
 * fois la même chose, puis met à jour l'une des deux le jour de son
 * déménagement. Ce fichier est la fusion demandée, et il n'a d'autre rôle que
 * celui-là : un libellé, un endroit.
 *
 * Le cas le plus sensible est `FRAIS_RENVOI`. Le rédacteur écrit qu'il « doit
 * impérativement rester une seule et même valeur » : une divergence entre les
 * conditions générales et la page de rétractation sur la question de savoir qui
 * paie le renvoi serait un écart OPPOSABLE au marchand. Il est donc déclaré ici
 * et nulle part ailleurs.
 *
 * ---------------------------------------------------------------------------
 * Les fusions retenues, et celle qu'il a fallu arbitrer
 * ---------------------------------------------------------------------------
 *
 * Quatre fusions étaient proposées et sont appliquées telles quelles :
 * l'identité du professionnel, son adresse, l'hébergeur, le prestataire de
 * paiement.
 *
 * La cinquième était laissée « à trancher : une seule adresse de courrier
 * électronique, ou deux distinctes assumées ». Retenu : UNE SEULE, celle de
 * `COURRIEL_CONTACT`. Motif — une petite maison d'épicerie tient une boîte, pas
 * deux ; deux emplacements distincts auraient invité à saisir la même valeur
 * deux fois, ce qui est exactement le défaut que cette fusion corrige. Le
 * marchand qui tient réellement deux adresses distinctes remplace ce libellé
 * par deux, en un endroit, et les pages suivent.
 *
 * Restent délibérément SÉPARÉS les cinq « pays de traitement » de la page
 * Données personnelles : ils portent des valeurs différentes (hébergeur,
 * paiement, transport, courriels, comptabilité), et les fusionner effacerait
 * une information que le règlement général sur la protection des données
 * demande précisément de distinguer.
 */

export const CHAMPS = {
  /**
   * L'identité du vendeur. Fusionne quatre libellés voisins : « dénomination
   * sociale ou nom et prénom du professionnel » (mentions légales),
   * « dénomination sociale ou nom du professionnel » (conditions générales),
   * « nom du professionnel » (formulaire de rétractation) et « dénomination
   * sociale ou nom du responsable de traitement » (données personnelles).
   */
  PROFESSIONNEL: 'dénomination sociale ou nom et prénom du professionnel',

  /**
   * L'adresse du vendeur. Fusionne « adresse postale complète du siège »,
   * « adresse postale du siège », « adresse géographique du professionnel »
   * (formulaire) et « adresse postale du responsable de traitement ».
   */
  SIEGE: 'adresse postale complète du siège',

  /**
   * La boîte du vendeur. Fusionne « adresse de courrier électronique de
   * contact », « adresse de courrier électronique du service client » et
   * « adresse électronique du professionnel » (formulaire).
   */
  COURRIEL_CONTACT: 'adresse de courrier électronique de contact',

  /** Fusionne « hébergeur » et « dénomination sociale de l'hébergeur ». */
  HEBERGEUR: 'dénomination sociale de l’hébergeur',

  /**
   * Fusionne « prestataire de services de paiement » et « nom du prestataire de
   * services de paiement ».
   */
  PRESTATAIRE_PAIEMENT: 'nom du prestataire de services de paiement',

  /**
   * QUI PAIE LE RENVOI. Une seule valeur, conditions générales et page de
   * rétractation confondues — voir l'en-tête de ce fichier.
   */
  FRAIS_RENVOI:
    'préciser si les frais de renvoi restent à la charge du client ou sont pris en charge, et dans quelles conditions',

  /** L'adresse où le client renvoie les produits. Conditions générales et page de rétractation. */
  ADRESSE_RENVOI: 'adresse postale de renvoi des produits',
} as const;
