---
titre: À propos de cette démonstration
chemin: /a-propos
statut: brouillon rédactionnel — reprise en page prévue en tranche C7
mise-en-page: trois colonnes à parts égales sur grand écran, empilées sur mobile
famille-jetons: aucun jeton dans cette page
---

# À propos de cette démonstration

Maison Vaubrune est une épicerie fine fictive. Ce site est une boutique en
ligne complète, construite pour être regardée de près : le catalogue, le
panier, le calcul des frais de port, le passage de commande et les documents
légaux y fonctionnent réellement. Ce qui ne peut pas exister sans marchand
réel — l’encaissement, l’expédition, les courriels — est simulé, et le site le
dit à l’endroit où cela se produit plutôt que dans une note en bas de page.

Cette page dresse la frontière exacte entre les trois : ce qui fonctionne, ce
qui est simulé, et ce qu’ajoute une boutique livrée à un marchand réel.

---

## Ce que la démonstration fait vraiment

**Un catalogue tenu par le marchand.** Quinze produits, vingt-trois formats,
sept familles. Chaque fiche porte sa composition, ses allergènes, son origine,
son poids expédié, son mode de conservation et son régime de rétractation. Un
espace marchand permet d’en modifier le contenu depuis le navigateur, pour
montrer que le catalogue appartient au commerçant et non au prestataire.

**Un panier qui calcule juste.** Les prix sont stockés en centimes, jamais
recomposés par un calcul à virgule flottante. Les totaux, les quantités et les
formats se comportent comme sur une boutique réelle, y compris pour les
coffrets, dont le prix est une donnée saisie et non une addition de leurs
pièces.

**Des frais de port calculés par des règles, affichés avant de payer.** Le
barème travaille sur trois zones et sur le poids expédié réel des articles. Il
sait refuser : une denrée sous température dirigée destinée à une adresse hors
France métropolitaine produit un cas d’expédition impossible, avec l’indication
du produit en cause, avant tout paiement.

**Un tunnel de commande complet.** Panier, adresse, récapitulatif, validation
par un bouton portant la mention d’obligation de paiement, redirection vers le
paiement, retour sur la boutique. Aucune étape n’est sautée ni maquettée.

**Un suivi d’états.** Une commande passe d’un état à l’autre — enregistrée,
payée, préparée, expédiée, livrée, rétractée, remboursée — avec ses dates. Le
suivi est consultable, et les données de la commande sont exportables au format
JSON.

**Des pages légales rédigées, pas figurées.** Mentions légales, conditions
générales de vente, données personnelles, rétractation et formulaire type sont
écrits en entier. Le tableau des exceptions de rétractation est produit à partir
du catalogue lui-même : une référence ne peut pas être annoncée dans un régime
sur une page et vendue dans un autre sur sa fiche.

**Des mesures publiées.** Les quatre notes de qualité technique sont mesurées,
datées et versionnées dans le dépôt, avec la commande qui permet de les
reproduire.

---

## Ce qu’elle simule, et le dit

**Le paiement.** Le passage à la caisse redirige vers la page hébergée du
prestataire de paiement en mode test, ou vers un écran de simulation qui
s’annonce comme tel lorsque aucune clé n’est configurée. Aucune somme n’est
débitée, aucun encaissement n’a lieu. Le comportement du reste du site est
identique dans les deux cas : c’est la même mécanique, branchée sur un
prestataire réel ou sur son doublure.

**L’enregistrement des commandes.** Il n’y a ni base de données ni serveur qui
conserve quoi que ce soit. Les essais du visiteur — panier, commandes,
modifications du catalogue — vivent dans le stockage local de son navigateur.
Ils ne quittent jamais son appareil, ne sont visibles de personne d’autre, et
disparaissent s’il vide les données de son navigateur. Un bandeau permanent le
rappelle, et la page de suivi offre un bouton d’export et un bouton
d’effacement.

**Les courriels.** Aucun courriel ne part. Les cinq messages qu’une boutique
livrée envoie — confirmation de commande, expédition, accusé de rétractation,
instructions de retour, confirmation de remboursement — sont rédigés et
consultables, mais affichés à l’écran plutôt qu’expédiés.

**L’expédition.** Aucun colis n’est préparé ni remis à un transporteur. Les
numéros de suivi affichés sont fictifs et signalés comme tels ; les délais
affichés sont ceux du barème, pas ceux d’un transporteur contractualisé.

**L’identité du marchand.** Les pages légales sont des gabarits. Aucun numéro
d’entreprise, aucune adresse, aucun téléphone, aucun nom de personne n’a été
inventé pour les remplir : les emplacements sont surlignés et attendent les
valeurs d’un marchand réel. Une vérification automatique fait échouer la
construction du site si une donnée de ce type apparaissait dans le dépôt.

---

## Ce que change une boutique livrée

**Une base de données.** Les commandes, les clients et le catalogue quittent le
navigateur pour un serveur : ils survivent au changement d’appareil, se
retrouvent par recherche, se recoupent avec la comptabilité, et deviennent
consultables par le marchand depuis n’importe où.

**Des comptes marchand sécurisés.** L’espace de gestion du catalogue et des
commandes passe derrière une authentification, avec des rôles distincts si
plusieurs personnes y travaillent, et une trace des actions sensibles.

**Des courriels transactionnels réels.** Confirmation, expédition, retour et
remboursement partent par un prestataire d’envoi, avec un domaine authentifié
pour que les messages arrivent en boîte de réception plutôt qu’en indésirables,
et un suivi des envois en échec.

**Une notification serveur à serveur du prestataire de paiement.** C’est la
pièce la plus importante et la moins visible. Le retour du client sur la
boutique après paiement n’est pas une preuve de paiement : il peut fermer son
onglet, perdre son réseau, revenir par un lien périmé. Le prestataire notifie
donc directement le serveur du marchand, message signé à l’appui, et c’est
cette notification — vérifiée, et rejouée par le prestataire tant qu’elle n’a
pas été acquittée — qui fait passer une commande à l’état payé.

**Des sauvegardes et une restauration éprouvée.** Sauvegarde régulière de la
base et des fichiers, conservation sur une durée décidée, et surtout un essai
de restauration : une sauvegarde jamais restaurée n’est pas une sauvegarde.

**Un nom de domaine et sa messagerie.** Le domaine du marchand, son certificat,
ses enregistrements d’authentification de courriel, et les adresses de contact
et de service client qui figurent dans les documents légaux.

**Ce qui reste identique.** Le catalogue, le panier, le calcul des frais de
port, le tunnel de commande, les états de commande et les documents légaux : ce
que montre cette démonstration est ce qui est livré, non une maquette qu’il
faudrait refaire.

---

## Notes d’intégration

- **Mise en page** : trois colonnes à parts égales sur grand écran, dans
  l’ordre ci-dessus ; empilées sur mobile. Les titres de colonne sont
  exactement « Ce que la démonstration fait vraiment », « Ce qu’elle simule, et
  le dit », « Ce que change une boutique livrée ».
- Chaque entrée commence par une phrase en gras qui tient lieu de titre court :
  la colonne reste lisible en survol, sans lire les paragraphes.
- Cette page ne comporte **aucun jeton** : elle décrit le site lui-même et
  n’attend aucune valeur du marchand.
- Les chiffres cités (quinze produits, vingt-trois formats, sept familles,
  trois zones, cinq courriels, quatre notes) proviennent du catalogue et du
  barème. S’ils doivent figurer en dur, un contrôle doit les comparer aux
  sources ; sinon, ils sont calculés à la construction.
- La page est référencée depuis le bandeau permanent de démonstration et depuis
  le pied de page, au même rang que les documents légaux.
