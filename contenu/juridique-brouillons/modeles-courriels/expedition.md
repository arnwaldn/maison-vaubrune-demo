---
titre: Courriel — expédition de la commande
declencheur: passage de la commande à l’état expédié, numéro de suivi disponible
statut: brouillon rédactionnel — reprise en tranche C7
---

# Expédition de la commande

> **La démonstration n’envoie aucun courriel ; voici le texte qu’une boutique
> livrée expédie.** Sur ce site, ce message est affiché à l’écran, dans l’état
> où il partirait, au lieu d’être remis à un serveur de courrier.

Ce message n’est imposé par aucun texte : c’est un message de service. Il a
pourtant une portée juridique indirecte, puisqu’il annonce la date à partir de
laquelle le client peut attendre son colis, et que le point de départ du délai
de rétractation est la réception (article L. 221-19 du code de la
consommation), non l’expédition. Le texte ci-dessous évite donc soigneusement
de laisser croire que le délai part de l’envoi.

---

## Objet

`Votre commande {{REFERENCE_COMMANDE}} est en route`

## Corps

Bonjour {{PRENOM_CLIENT}},

Votre commande {{REFERENCE_COMMANDE}} a quitté nos ateliers le
{{DATE_EXPEDITION}}.

**Suivre votre colis**

Transporteur : {{TRANSPORTEUR}}
Numéro de suivi : {{NUMERO_SUIVI}}
Suivi en ligne : {{LIEN_SUIVI_TRANSPORTEUR}}

Livraison estimée : {{DATE_LIVRAISON_ESTIMEE}}

**Ce que contient ce colis**

{{LISTE_ARTICLES_EXPEDIES}}

Livré à : {{ADRESSE_LIVRAISON}}

{{BLOC_CHAINE_DU_FROID}}

**À la réception**

Vérifiez l’état du colis devant le livreur. Si l’emballage est endommagé,
signalez-le sur le bon de livraison et écrivez-nous avec quelques photographies :
nous nous en occupons.

Votre délai de rétractation de quatorze jours commence le jour où vous recevez
la commande, et non aujourd’hui. Le détail figure sur notre page consacrée à la
rétractation, et le formulaire type était joint à votre confirmation de
commande.

**Une question ?**

Écrivez-nous à {{A_COMPLETER:adresse de courrier électronique du service client}}
ou appelez le {{A_COMPLETER:numéro de téléphone du service client}} —
{{A_COMPLETER:jours et horaires du service client}}.

À bientôt,

{{A_COMPLETER:signature du courriel, nom du service ou de la personne qui signe}}
{{A_COMPLETER:nom commercial de la boutique}}

---

## Variables employées

`{{REFERENCE_COMMANDE}}`, `{{PRENOM_CLIENT}}`, `{{DATE_EXPEDITION}}`,
`{{TRANSPORTEUR}}`, `{{NUMERO_SUIVI}}`, `{{LIEN_SUIVI_TRANSPORTEUR}}`,
`{{DATE_LIVRAISON_ESTIMEE}}`, `{{LISTE_ARTICLES_EXPEDIES}}`,
`{{ADRESSE_LIVRAISON}}`, `{{BLOC_CHAINE_DU_FROID}}`.

## Notes

- `{{LISTE_ARTICLES_EXPEDIES}}` peut différer de la liste de la commande en cas
  d’expédition partielle. Dans ce cas, le message indique aussi ce qui reste à
  venir, et le délai de rétractation court à compter du dernier lot reçu
  (article L. 221-19 du code de la consommation).
- `{{BLOC_CHAINE_DU_FROID}}` n’apparaît que si la commande contient une denrée
  expédiée sous température dirigée. Il porte alors les consignes de réception
  et de remise au froid. Comme le refus d’expédition hors métropole, il se
  branche sur le drapeau du catalogue, jamais sur la famille de produits.
- Aucun numéro de suivi n’est réel sur la démonstration : ceux qui s’affichent
  sont générés et signalés comme fictifs.
