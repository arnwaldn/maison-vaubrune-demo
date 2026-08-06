---
titre: Courriel — accusé de réception d’une rétractation
declencheur: réception d’une déclaration de rétractation, par formulaire ou par toute déclaration dénuée d’ambiguïté
statut: brouillon rédactionnel — reprise en tranche C7
---

# Accusé de réception d’une rétractation

> **La démonstration n’envoie aucun courriel ; voici le texte qu’une boutique
> livrée expédie.** Sur ce site, ce message est affiché à l’écran, dans l’état
> où il partirait, au lieu d’être remis à un serveur de courrier.

Lorsque le professionnel met à disposition un formulaire de rétractation en
ligne, il accuse réception de la rétractation sur un support durable et sans
délai (article L. 221-21 du code de la consommation). Ce message tient ce rôle.
Il vaut aussi trace pour le client, alors même que la charge de la preuve de
l’exercice du droit lui incombe (article L. 221-22 du même code).

---

## Objet

`Nous avons bien reçu votre rétractation — commande {{REFERENCE_COMMANDE}}`

## Corps

Bonjour {{PRENOM_CLIENT}},

Nous avons reçu le {{DATE_RECEPTION_DEMANDE}} votre décision de vous rétracter
pour la commande {{REFERENCE_COMMANDE}}. Ce message en accuse réception. Vous
n’avez aucune justification à nous donner.

**Ce qui est concerné**

{{ARTICLES_RETRACTES}}

Montant correspondant : {{MONTANT_REMBOURSEMENT_PREVU}}

{{BLOC_ARTICLES_HORS_RETRACTATION}}

**Ce qu’il vous reste à faire**

Renvoyez les produits au plus tard le {{DATE_LIMITE_RENVOI}}, soit quatorze
jours après votre déclaration (article L. 221-23 du code de la consommation).

Adresse de renvoi :
{{A_COMPLETER:adresse postale de renvoi des produits}}

Frais de renvoi :
{{A_COMPLETER:préciser si les frais de renvoi restent à la charge du client ou sont pris en charge, et dans quelles conditions}}

Le détail pratique — emballage, preuve d’expédition, cas particuliers — vous
est envoyé dans un second message.

**Ce que nous ferons ensuite**

Nous vous remboursons {{MONTANT_REMBOURSEMENT_PREVU}} au plus tard quatorze
jours après la réception de votre décision, par le moyen de paiement que vous
avez utilisé. Nous pouvons différer ce remboursement jusqu’à la réception des
produits ou jusqu’à ce que vous nous fournissiez une preuve de leur expédition,
selon ce qui intervient en premier (article L. 221-24 du code de la
consommation).

Les frais de livraison initiaux vous sont remboursés, à hauteur du mode de
livraison standard que nous proposons.

**Une question ?**

Écrivez-nous à {{A_COMPLETER:adresse de courrier électronique du service client}}
ou appelez le {{A_COMPLETER:numéro de téléphone du service client}} —
{{A_COMPLETER:jours et horaires du service client}}.

Bien à vous,

{{A_COMPLETER:signature du courriel, nom du service ou de la personne qui signe}}
{{A_COMPLETER:nom commercial de la boutique}}

---

## Variables employées

`{{REFERENCE_COMMANDE}}`, `{{PRENOM_CLIENT}}`, `{{DATE_RECEPTION_DEMANDE}}`,
`{{ARTICLES_RETRACTES}}`, `{{MONTANT_REMBOURSEMENT_PREVU}}`,
`{{DATE_LIMITE_RENVOI}}`, `{{BLOC_ARTICLES_HORS_RETRACTATION}}`.

## Notes

- `{{BLOC_ARTICLES_HORS_RETRACTATION}}` n’apparaît que si la demande portait
  aussi sur des articles couverts par une exception. Son contenu vient de la
  source unique des mentions de rétractation : il nomme l’article concerné et
  le motif, sans jamais être rédigé à la main dans ce modèle.
- Le message est envoyé « sans délai », c’est-à-dire de façon automatique à la
  réception de la déclaration, et non après examen de son bien-fondé. La
  vérification éventuelle vient ensuite et fait l’objet d’un autre message.
- Le ton reste neutre : un accusé de réception n’argumente pas et ne dissuade
  pas.
