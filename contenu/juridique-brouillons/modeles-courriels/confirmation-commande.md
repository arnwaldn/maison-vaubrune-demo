---
titre: Courriel — confirmation de commande
declencheur: paiement confirmé par le prestataire (notification serveur à serveur)
statut: brouillon rédactionnel — reprise en tranche C7
---

# Confirmation de commande

> **La démonstration n’envoie aucun courriel ; voici le texte qu’une boutique
> livrée expédie.** Sur ce site, ce message est affiché à l’écran, dans l’état
> où il partirait, au lieu d’être remis à un serveur de courrier.

Ce message est celui qui confirme le contrat sur un support durable. Le
professionnel fournit au consommateur cette confirmation, reprenant les
informations précontractuelles, au plus tard au moment de la livraison du bien
(articles L. 221-5 et L. 221-13 du code de la consommation). C’est la raison
pour laquelle il porte le récapitulatif complet et rappelle le droit de
rétractation, et non un simple remerciement.

---

## Objet

`Votre commande {{REFERENCE_COMMANDE}} est confirmée`

## Corps

Bonjour {{PRENOM_CLIENT}},

Nous avons bien reçu votre commande {{REFERENCE_COMMANDE}}, passée le
{{DATE_COMMANDE}}, et votre paiement a été accepté. Voici le détail de ce que
vous avez commandé.

**Votre commande**

{{LISTE_ARTICLES}}

Total des articles : {{TOTAL_ARTICLES}}
Frais de livraison : {{FRAIS_PORT}}
**Total payé : {{TOTAL_PAYE}}**

**Livraison**

{{ADRESSE_LIVRAISON}}

Mode de livraison : {{MODE_LIVRAISON}}
Délai annoncé : {{DELAI_ANNONCE}}

Vous recevrez un second message lorsque votre colis partira, avec son numéro de
suivi. Vous pouvez à tout moment consulter l’état de votre commande ici :
{{LIEN_SUIVI_COMMANDE}}

**Votre droit de rétractation**

Vous disposez de quatorze jours à compter de la réception de votre commande
pour changer d’avis, sans avoir à motiver votre décision (article L. 221-18 du
code de la consommation). Le formulaire type de rétractation est joint à ce
message et disponible sur notre site.

{{MENTIONS_RETRACTATION_ARTICLES}}

**Une question ?**

Écrivez-nous à {{A_COMPLETER:adresse de courrier électronique du service client}}
ou appelez le {{A_COMPLETER:numéro de téléphone du service client}} —
{{A_COMPLETER:jours et horaires du service client}}.

Merci de votre confiance,

{{A_COMPLETER:signature du courriel, nom du service ou de la personne qui signe}}
{{A_COMPLETER:nom commercial de la boutique}}
{{A_COMPLETER:adresse postale du siège}}

---

## Pièces jointes

| Pièce | Contenu |
|---|---|
| Formulaire de rétractation | Le modèle officiel annexé à l’article R. 221-1 du code de la consommation, prérempli des coordonnées du professionnel |
| Conditions générales de vente | La version en vigueur au jour de la commande, celle qui est archivée avec elle |
| Facture | {{A_COMPLETER:préciser si la facture est jointe à ce message ou envoyée séparément}} |

## Variables employées

`{{REFERENCE_COMMANDE}}`, `{{DATE_COMMANDE}}`, `{{PRENOM_CLIENT}}`,
`{{LISTE_ARTICLES}}`, `{{TOTAL_ARTICLES}}`, `{{FRAIS_PORT}}`,
`{{TOTAL_PAYE}}`, `{{ADRESSE_LIVRAISON}}`, `{{MODE_LIVRAISON}}`,
`{{DELAI_ANNONCE}}`, `{{LIEN_SUIVI_COMMANDE}}`,
`{{MENTIONS_RETRACTATION_ARTICLES}}`.

## Notes

- `{{MENTIONS_RETRACTATION_ARTICLES}}` n’est **pas** un texte à rédiger ici :
  c’est le bloc produit par la source unique des mentions de rétractation, qui
  signale les articles de la commande relevant d’une exception et le motif
  applicable. Il est vide lorsque toute la commande ouvre droit à rétractation.
- Ce message part une fois le paiement confirmé par la notification serveur à
  serveur du prestataire, jamais sur le seul retour du client sur le site.
- Un même message ne doit pas être envoyé deux fois si la notification est
  rejouée par le prestataire : l’envoi est conditionné au passage effectif de
  la commande à l’état payé.
