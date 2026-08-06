---
titre: Données personnelles
chemin: /donnees-personnelles
statut: brouillon rédactionnel — reprise en page prévue en tranche C7
famille-jetons: A_COMPLETER
---

# Données personnelles

> Ce document est un gabarit pour sa seconde moitié. La première moitié décrit
> le fonctionnement réel de cette démonstration et ne comporte aucun
> emplacement à remplir. Les emplacements surlignés de la seconde moitié sont
> ceux que remplit le marchand ; sa relecture par un juriste reste la sienne.
>
> Maison Vaubrune est une épicerie fine **fictive** et ce site est une
> **démonstration**.

---

## Partie 1 — Ce que cette démonstration collecte : rien

C’est la particularité de ce site, et elle est vraie, pas rhétorique. Il n’y a
ici ni compte client, ni base de données, ni serveur qui reçoive une identité.

### 1.1 Aucun traitement côté serveur

- **Aucun compte.** Il n’y a pas d’inscription, pas de mot de passe, pas de
  profil. Une commande d’essai se passe sans s’identifier.
- **Aucune base de données.** Le site n’en possède pas. Les pages sont
  construites à l’avance à partir d’un catalogue versionné avec le code.
- **Aucun formulaire d’envoi.** Il n’existe pas de formulaire de contact, pas
  d’inscription à une lettre d’information, pas de champ dont le contenu partirait
  vers un serveur.
- **Aucun courriel.** Rien n’est envoyé, donc aucune adresse de courrier
  électronique n’est nécessaire ni conservée.
- **Aucune journalisation applicative.** Le site n’écrit ni journal de
  navigation, ni identifiant de session, ni empreinte de visiteur.

Une unique route serveur existe : celle qui ouvre la session de paiement chez
le prestataire. Elle ne conserve rien et n’écrit nulle part ; ce qu’elle
transmet est décrit au point 1.4.

### 1.2 Aucun cookie de suivi, aucune mesure d’audience

Le site ne dépose aucun cookie de mesure d’audience, aucun cookie publicitaire,
aucun traceur tiers, et n’intègre aucun bouton de réseau social. Il n’y a donc
pas de bandeau de consentement, parce qu’il n’y a rien à consentir.

Les polices de caractères sont servies depuis le site lui-même : la
consultation d’une page ne provoque aucune requête vers un domaine tiers, hors
la redirection vers le prestataire de paiement lorsque le visiteur va jusqu’au
bout d’un essai de commande.

### 1.3 Ce qui est écrit dans votre navigateur, et rien d’autre

Les essais du visiteur sont conservés dans le stockage local de son navigateur
(`localStorage`) :

| Ce qui est stocké | À quoi cela sert | Où cela vit |
|---|---|---|
| Le panier en cours | Retrouver sa sélection d’une page à l’autre et d’une visite à l’autre | Navigateur du visiteur |
| Les commandes d’essai et leur état | Faire fonctionner le suivi de commande sans serveur | Navigateur du visiteur |
| Les modifications du catalogue faites depuis l’espace marchand de démonstration | Montrer qu’un marchand tient son catalogue lui-même | Navigateur du visiteur |

Ces informations ne quittent jamais l’appareil. Personne d’autre que le
visiteur n’y a accès : ni le concepteur du site, ni l’hébergeur. Elles
disparaissent lorsque le visiteur vide les données de son navigateur, et il
existe sur la page de suivi un bouton qui les efface et un bouton qui les
exporte au format JSON.

Ce stockage relève de la catégorie des opérations strictement nécessaires à la
fourniture d’un service expressément demandé par l’utilisateur, telle que
définie par l’article 82 de la loi n° 78-17 du 6 janvier 1978 modifiée : sans
lui, il n’y aurait ni panier ni suivi. Aucune de ces entrées ne sert à mesurer,
à profiler ou à reconnaître un visiteur d’une visite à l’autre à d’autres fins.

### 1.4 Le paiement

Lorsque le visiteur va jusqu’au paiement, il est redirigé vers la page hébergée
par le prestataire de paiement, en mode test. Ce qui est transmis au
prestataire pour ouvrir la session se limite aux éléments nécessaires à
l’opération : le contenu du panier et son montant. Les données de carte sont
saisies chez le prestataire, sur ses pages, et ne transitent jamais par ce site.

Le prestataire applique sa propre politique de confidentialité à cette étape.

### 1.5 L’hébergeur

L’hébergement du site produit des journaux techniques de connexion (adresses
IP, dates, pages appelées), comme tout serveur web. Ils relèvent du
fonctionnement et de la sécurité de l’hébergement, et non d’un traitement mis
en œuvre par la démonstration. Le nom de l’hébergeur figure dans les
[mentions légales](/mentions-legales).

### 1.6 Vos droits ici

Le règlement général sur la protection des données (règlement (UE) 2016/679)
et la loi n° 78-17 du 6 janvier 1978 modifiée ouvrent au visiteur des droits
d’accès, de rectification, d’effacement, de limitation, d’opposition et de
portabilité sur les données le concernant.

Sur cette démonstration, ces droits sont sans objet faute de traitement : il
n’existe aucune donnée personnelle à consulter, à rectifier ou à effacer, et
les seules informations existantes sont déjà entre les mains du visiteur, dans
son navigateur, où il peut les lire, les exporter et les supprimer lui-même.

---

## Partie 2 — Ce qui change sur une boutique livrée

Une boutique qui vend réellement ne peut pas rester sans traitement de données :
livrer suppose une adresse, encaisser suppose une facture, répondre à une
réclamation suppose de retrouver la commande. Les emplacements ci-dessous sont
ceux que le marchand remplit avant l’ouverture.

### 2.1 Responsable de traitement

| Information | Valeur |
|---|---|
| Responsable de traitement | {{A_COMPLETER:dénomination sociale ou nom du responsable de traitement}} |
| Adresse | {{A_COMPLETER:adresse postale du responsable de traitement}} |
| Contact pour les questions de données personnelles | {{A_COMPLETER:adresse de courrier électronique dédiée aux demandes relatives aux données personnelles}} |
| Délégué à la protection des données, s’il en existe un | {{A_COMPLETER:identité et coordonnées du délégué à la protection des données, ou mention de son absence}} |

### 2.2 Ce qui est collecté, pourquoi, sur quelle base et pour combien de temps

| Finalité | Données concernées | Base légale | Durée de conservation |
|---|---|---|---|
| Traiter et livrer la commande | {{A_COMPLETER:catégories de données de commande collectées}} | Exécution du contrat | {{A_COMPLETER:durée de conservation des données de commande}} |
| Encaisser le paiement | {{A_COMPLETER:données transmises au prestataire de paiement}} | Exécution du contrat | {{A_COMPLETER:durée de conservation des données de paiement}} |
| Établir et conserver les pièces comptables | {{A_COMPLETER:données figurant sur les factures}} | Obligation légale | {{A_COMPLETER:durée légale de conservation comptable retenue}} |
| Gérer les réclamations, retours et garanties | {{A_COMPLETER:données de réclamation}} | Exécution du contrat et intérêt légitime | {{A_COMPLETER:durée de conservation des dossiers de réclamation}} |
| Gérer le compte client, s’il en existe un | {{A_COMPLETER:données de compte}} | Exécution du contrat | {{A_COMPLETER:durée de conservation du compte inactif}} |
| Envoyer une lettre d’information, si elle existe | {{A_COMPLETER:données de prospection}} | Consentement | {{A_COMPLETER:durée de conservation des consentements de prospection}} |
| Mesurer l’audience, si une mesure est mise en place | {{A_COMPLETER:outil de mesure retenu et données collectées}} | {{A_COMPLETER:base légale retenue pour la mesure d’audience}} | {{A_COMPLETER:durée de conservation des données de mesure}} |

### 2.3 Destinataires et sous-traitants

| Rôle | Prestataire | Ce qu’il reçoit | Localisation des données |
|---|---|---|---|
| Hébergement | {{A_COMPLETER:hébergeur}} | {{A_COMPLETER:données hébergées}} | {{A_COMPLETER:pays d’hébergement}} |
| Paiement | {{A_COMPLETER:prestataire de services de paiement}} | {{A_COMPLETER:données transmises pour le paiement}} | {{A_COMPLETER:pays de traitement du prestataire de paiement}} |
| Transport | {{A_COMPLETER:transporteurs}} | {{A_COMPLETER:données transmises au transporteur}} | {{A_COMPLETER:pays de traitement du transporteur}} |
| Envoi des courriels transactionnels | {{A_COMPLETER:prestataire d’envoi de courriels}} | {{A_COMPLETER:données transmises pour l’envoi}} | {{A_COMPLETER:pays de traitement du prestataire de courriels}} |
| Comptabilité | {{A_COMPLETER:cabinet ou outil comptable}} | {{A_COMPLETER:données transmises à la comptabilité}} | {{A_COMPLETER:pays de traitement}} |

Transferts hors Union européenne, le cas échéant, et garanties encadrant ces
transferts : {{A_COMPLETER:transferts hors Union européenne et garanties applicables}}.

Un contrat de sous-traitance conforme à l’article 28 du règlement général sur
la protection des données est conclu avec chacun de ces prestataires.

### 2.4 Cookies et traceurs

{{A_COMPLETER:liste des cookies et traceurs déposés, leur finalité, leur durée et le mécanisme de recueil du consentement}}

### 2.5 Droits des personnes et modalités d’exercice

Sur une boutique livrée, les droits d’accès, de rectification, d’effacement, de
limitation, d’opposition et de portabilité s’exercent réellement, ainsi que le
droit de définir des directives relatives au sort des données après le décès.

| Élément | Valeur |
|---|---|
| Adresse d’exercice des droits | {{A_COMPLETER:adresse de courrier électronique ou postale pour l’exercice des droits}} |
| Justificatif demandé, le cas échéant | {{A_COMPLETER:pièces demandées pour vérifier l’identité du demandeur}} |
| Délai de réponse annoncé | {{A_COMPLETER:délai de réponse annoncé, dans la limite du délai réglementaire}} |

Toute personne peut introduire une réclamation auprès de la Commission
nationale de l’informatique et des libertés, autorité de contrôle française.

### 2.6 Sécurité

Mesures techniques et organisationnelles mises en œuvre :
{{A_COMPLETER:mesures de sécurité retenues, par exemple chiffrement des échanges, contrôle des accès, sauvegardes, journalisation des accès administrateur}}.

Procédure applicable en cas de violation de données :
{{A_COMPLETER:procédure de notification à l’autorité de contrôle et, le cas échéant, aux personnes concernées}}.

---

## Ce que cette page devient à l’intégration

La partie 1 est écrite en dur : elle décrit un fait vérifiable du site, pas une
promesse. La partie 2 est un gabarit intégral, composé de tableaux dont chaque
cellule vide est un emplacement à remplir. Sur une boutique livrée, la partie 1
disparaît et la partie 2 devient la page entière.
