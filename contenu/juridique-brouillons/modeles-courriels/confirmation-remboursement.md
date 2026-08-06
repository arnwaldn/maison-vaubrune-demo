---
titre: Courriel — confirmation de remboursement
declencheur: remboursement émis auprès du prestataire de paiement
statut: brouillon rédactionnel — reprise en tranche C7
---

# Confirmation de remboursement

> **La démonstration n’envoie aucun courriel ; voici le texte qu’une boutique
> livrée expédie.** Sur ce site, ce message est affiché à l’écran, dans l’état
> où il partirait, au lieu d’être remis à un serveur de courrier.

Ce message clôt le dossier. Il est envoyé au moment où le remboursement est
émis auprès du prestataire de paiement, et il distingue cette date de celle où
la somme apparaîtra sur le relevé du client — les deux ne coïncident pas, et
confondre les deux est la première cause de relance. Le cadre du remboursement
est celui de l’article L. 221-24 du code de la consommation.

---

## Objet

`Votre remboursement pour la commande {{REFERENCE_COMMANDE}}`

## Corps

Bonjour {{PRENOM_CLIENT}},

Votre remboursement a été émis le {{DATE_REMBOURSEMENT}} pour la commande
{{REFERENCE_COMMANDE}}. Le dossier est clos de notre côté.

**Détail**

{{DETAIL_REMBOURSEMENT}}

**Montant remboursé : {{MONTANT_REMBOURSE}}**

Moyen de remboursement : {{MOYEN_PAIEMENT}} — celui que vous aviez utilisé pour
régler la commande.

**Quand le verrez-vous ?**

Comptez {{DELAI_BANCAIRE}} pour que la somme apparaisse sur votre relevé. Ce
délai est celui de votre banque : de notre côté, l’opération est faite.

{{BLOC_MOTIF_ECART}}

**Une question ?**

Écrivez-nous à {{A_COMPLETER:adresse de courrier électronique du service client}}
ou appelez le {{A_COMPLETER:numéro de téléphone du service client}} —
{{A_COMPLETER:jours et horaires du service client}}.

Merci de nous avoir laissé une chance,

{{A_COMPLETER:signature du courriel, nom du service ou de la personne qui signe}}
{{A_COMPLETER:nom commercial de la boutique}}

---

## Variables employées

`{{REFERENCE_COMMANDE}}`, `{{PRENOM_CLIENT}}`, `{{DATE_REMBOURSEMENT}}`,
`{{DETAIL_REMBOURSEMENT}}`, `{{MONTANT_REMBOURSE}}`, `{{MOYEN_PAIEMENT}}`,
`{{DELAI_BANCAIRE}}`, `{{BLOC_MOTIF_ECART}}`.

## Notes

- `{{DETAIL_REMBOURSEMENT}}` ventile le montant : prix des articles repris,
  frais de livraison initiaux remboursés à hauteur du mode standard, et toute
  retenue le cas échéant. Une ligne par poste, jamais un total sec.
- `{{BLOC_MOTIF_ECART}}` n’apparaît que si le montant remboursé diffère du
  montant payé pour les articles concernés. Il énonce alors le motif de l’écart
  en une phrase et son montant. Un écart sans explication est un litige en
  puissance.
- Le message est envoyé à l’émission du remboursement chez le prestataire, et
  non à la décision de rembourser : la date annoncée doit être vérifiable dans
  le tableau de bord du prestataire.
- La formule de politesse finale est un choix rédactionnel, pas une obligation.
  Elle peut être remplacée sans conséquence juridique.
