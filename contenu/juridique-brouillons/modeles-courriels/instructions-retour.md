---
titre: Courriel — instructions de retour
declencheur: envoi immédiatement après l’accusé de rétractation, ou sur demande de retour pour non-conformité
statut: brouillon rédactionnel — reprise en tranche C7
---

# Instructions de retour

> **La démonstration n’envoie aucun courriel ; voici le texte qu’une boutique
> livrée expédie.** Sur ce site, ce message est affiché à l’écran, dans l’état
> où il partirait, au lieu d’être remis à un serveur de courrier.

Ce message est pratique, non juridique : il détaille l’acheminement du retour.
Il ne pose aucune condition qui viendrait s’ajouter à la loi. En particulier,
il ne subordonne pas le remboursement à un emballage d’origine, à un numéro
d’autorisation ou à un état neuf : le client répond seulement de la
dépréciation résultant de manipulations autres que celles nécessaires pour
établir la nature et les caractéristiques du produit (article L. 221-23 du code
de la consommation).

---

## Objet

`Comment nous renvoyer votre commande {{REFERENCE_COMMANDE}}`

## Corps

Bonjour {{PRENOM_CLIENT}},

Voici la marche à suivre pour nous renvoyer les produits de la commande
{{REFERENCE_COMMANDE}}.

**1. Ce que vous renvoyez**

{{ARTICLES_A_RENVOYER}}

**2. Comment les emballer**

Un carton propre suffit ; celui de la livraison convient parfaitement s’il est
en bon état. Calez les contenants en verre pour qu’ils ne se heurtent pas.
Glissez à l’intérieur ce message imprimé, ou une note portant votre nom et la
référence {{REFERENCE_COMMANDE}} : c’est ce qui nous permet de rapprocher le
colis de votre dossier sans vous rappeler.

**3. Où l’envoyer**

{{A_COMPLETER:adresse postale de renvoi des produits}}

**4. Avant quelle date**

Au plus tard le {{DATE_LIMITE_RENVOI}}. C’est la date d’envoi qui compte, pas
la date d’arrivée.

**5. Qui paie le renvoi**

{{A_COMPLETER:préciser si les frais de renvoi restent à la charge du client ou sont pris en charge, et dans quelles conditions}}

{{BLOC_ETIQUETTE_PREPAYEE}}

**6. Gardez votre preuve d’expédition**

Conservez le récépissé du transporteur. Il vous sert de preuve d’envoi, et il
nous permet de déclencher votre remboursement dès que vous nous le
transmettez, sans attendre l’arrivée du colis.

**Un point à connaître**

Les denrées qui se périment rapidement et les produits scellés ouverts après
livraison ne peuvent pas être repris — c’est le seul cas où un colis nous
reviendrait sans effet. Si un article de votre commande est dans cette
situation, nous vous l’avons signalé dans l’accusé de réception de votre
rétractation.

**Une question ?**

Écrivez-nous à {{A_COMPLETER:adresse de courrier électronique du service client}}
ou appelez le {{A_COMPLETER:numéro de téléphone du service client}} —
{{A_COMPLETER:jours et horaires du service client}}.

Bien à vous,

{{A_COMPLETER:signature du courriel, nom du service ou de la personne qui signe}}
{{A_COMPLETER:nom commercial de la boutique}}

---

## Variables employées

`{{REFERENCE_COMMANDE}}`, `{{PRENOM_CLIENT}}`, `{{ARTICLES_A_RENVOYER}}`,
`{{DATE_LIMITE_RENVOI}}`, `{{BLOC_ETIQUETTE_PREPAYEE}}`.

## Notes

- `{{BLOC_ETIQUETTE_PREPAYEE}}` n’apparaît que si le marchand fournit une
  étiquette de retour. Il porte alors le lien de téléchargement et le point de
  dépôt.
- Le paragraphe « Un point à connaître » décrit le régime général sans nommer
  de référence : la liste des articles concernés vient de l’accusé de
  rétractation, qui la tient de la source unique des mentions.
- Ce même modèle sert aux retours pour non-conformité, avec deux différences :
  les frais de renvoi sont alors à la charge du vendeur, et la date limite du
  point 4 disparaît.
