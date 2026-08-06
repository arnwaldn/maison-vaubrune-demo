# Notes d’intégration — brouillons juridiques pour la tranche C7

- **Date** : 2026-08-06
- **Portée** : sept documents et cinq modèles de courriels, dans
  `contenu/juridique-brouillons/`
- **Statut** : brouillons rédactionnels, en attente de reprise en pages
- **Ce que ces notes ne sont pas** : un avis juridique. Les doutes de la
  section 4 sont signalés, pas tranchés. La relecture par un juriste reste
  celle du marchand, et chaque document le dit dans son encadré d’ouverture.

---

## 1. Fichiers écrits

| Fichier | Page visée | Jetons `A_COMPLETER` (occurrences) | Renvoie à du généré |
|---|---|---|---|
| `01-mentions-legales.md` | `/mentions-legales` | 22 | non |
| `02-conditions-generales-de-vente.md` | `/cgv` | 11 | barème de port, tableau des exceptions |
| `03-donnees-personnelles.md` | `/donnees-personnelles` | 41 | non |
| `04-retractation.md` | `/retractation` | 4 | tableau des exceptions |
| `05-formulaire-retractation.md` | `/formulaire-retractation` | 3 | non |
| `06-a-propos-de-cette-demonstration.md` | `/a-propos` | 0 | chiffres du catalogue et du barème |
| `modeles-courriels/confirmation-commande.md` | courriel | 7 | mentions de rétractation, formulaire |
| `modeles-courriels/expedition.md` | courriel | 5 | bloc chaîne du froid |
| `modeles-courriels/accuse-retractation.md` | courriel | 7 | bloc articles hors rétractation |
| `modeles-courriels/instructions-retour.md` | courriel | 7 | — |
| `modeles-courriels/confirmation-remboursement.md` | courriel | 5 | — |

Total : **112 occurrences de jetons `A_COMPLETER`, pour 85 libellés distincts**,
et **32 jetons de variable**.

---

## 2. Les jetons, et ce qu’ils deviennent

### 2.1 Famille 1 — `{{A_COMPLETER:libellé}}` → composant `<AComplete>`

Un emplacement que **le marchand remplit une fois** et qui ne dépend d’aucune
donnée de commande. Le libellé est une phrase en français, pas une clé
technique : il est destiné à être lu par le marchand tel quel.

Rendu attendu : un composant `<AComplete>` qui surligne visiblement
l’emplacement et affiche le libellé, de façon qu’un visiteur comprenne
immédiatement qu’il regarde un gabarit et non une valeur cachée.

**85 libellés distincts.** Quatre-vingts d’entre eux n’apparaissent qu’une ou
deux fois ; cinq reviennent dans tous les courriels
(`nom commercial de la boutique`, `adresse de courrier électronique du service
client`, `numéro de téléphone du service client`, `jours et horaires du service
client`, `signature du courriel…`).

**Normalisation à faire avant l’intégration.** Des libellés voisins désignent
la même valeur et doivent être fusionnés, sinon le marchand saisira deux fois
la même chose et les deux divergeront :

| Libellés à fusionner | Proposition |
|---|---|
| `dénomination sociale ou nom et prénom du professionnel`, `dénomination sociale ou nom du professionnel`, `nom du professionnel`, `dénomination sociale ou nom du responsable de traitement` | un seul libellé, réutilisé partout |
| `adresse postale complète du siège`, `adresse postale du siège`, `adresse géographique du professionnel`, `adresse postale du responsable de traitement` | un seul libellé |
| `adresse de courrier électronique de contact`, `adresse de courrier électronique du service client`, `adresse électronique du professionnel` | à trancher : une seule adresse, ou deux distinctes assumées |
| `hébergeur`, `dénomination sociale de l’hébergeur` | un seul libellé |
| `prestataire de services de paiement`, `nom du prestataire de services de paiement` | un seul libellé |
| `pays de traitement` (comptabilité) et ses quatre voisins par prestataire | garder les cinq, ils portent des valeurs différentes |

Le jeton `{{A_COMPLETER:préciser si les frais de renvoi restent à la charge du
client ou sont pris en charge, et dans quelles conditions}}` apparaît quatre
fois (CGV, page rétractation, deux courriels) et **doit impérativement rester
une seule et même valeur** : une divergence entre la page et le courriel serait
un écart opposable au marchand.

### 2.2 Famille 2 — `{{VARIABLE}}` → données de commande

Une valeur produite à l’exécution, à partir de la commande. Elle n’existe que
dans les modèles de courriels. Trente-deux jetons, dont vingt-sept sont des
valeurs simples et cinq des blocs conditionnels.

**Valeurs simples (27)** — commande : `REFERENCE_COMMANDE`, `DATE_COMMANDE`,
`PRENOM_CLIENT`, `LISTE_ARTICLES`, `TOTAL_ARTICLES`, `FRAIS_PORT`,
`TOTAL_PAYE`, `LIEN_SUIVI_COMMANDE` ; livraison : `ADRESSE_LIVRAISON`,
`MODE_LIVRAISON`, `DELAI_ANNONCE`, `DATE_EXPEDITION`, `TRANSPORTEUR`,
`NUMERO_SUIVI`, `LIEN_SUIVI_TRANSPORTEUR`, `DATE_LIVRAISON_ESTIMEE`,
`LISTE_ARTICLES_EXPEDIES` ; rétractation et retour :
`DATE_RECEPTION_DEMANDE`, `ARTICLES_RETRACTES`, `ARTICLES_A_RENVOYER`,
`DATE_LIMITE_RENVOI`, `MONTANT_REMBOURSEMENT_PREVU` ; remboursement :
`DATE_REMBOURSEMENT`, `DETAIL_REMBOURSEMENT`, `MONTANT_REMBOURSE`,
`MOYEN_PAIEMENT`, `DELAI_BANCAIRE`.

**Blocs conditionnels (5)** — ils s’affichent ou non selon la commande, et leur
contenu n’est **pas** rédigé dans les modèles :

| Bloc | Condition d’affichage | Source du contenu |
|---|---|---|
| `MENTIONS_RETRACTATION_ARTICLES` | la commande contient au moins un article sous exception | source unique des mentions de rétractation |
| `BLOC_ARTICLES_HORS_RETRACTATION` | la demande de rétractation porte sur un article sous exception | source unique des mentions de rétractation |
| `BLOC_CHAINE_DU_FROID` | la commande contient une denrée sous température dirigée | drapeau périssable du catalogue |
| `BLOC_ETIQUETTE_PREPAYEE` | le marchand fournit une étiquette de retour | choix du marchand |
| `BLOC_MOTIF_ECART` | le montant remboursé diffère du montant payé | calcul du remboursement |

Une variable non résolue doit **faire échouer l’envoi**, jamais s’afficher
telle quelle dans un courriel : un `{{TOTAL_PAYE}}` visible chez un client est
pire qu’un courriel manquant.

### 2.3 Ce qui n’est ni l’un ni l’autre

Le commentaire `<!-- TABLEAU GÉNÉRÉ — ne pas rédiger ici -->` de
`04-retractation.md` marque un emplacement de **contenu produit par le code**.
Ce n’est pas un jeton : rien n’y est substitué, un composant s’y insère.

---

## 3. Points où le texte renvoie à du généré

| Endroit | Ce qui est généré | Source |
|---|---|---|
| CGV, article 6.1, et page Livraison | zones, transporteurs, délais, barème des frais de port | barème du moteur d’expédition (tranche C3) |
| CGV, article 7, dernier paragraphe | renvoi au détail produit par produit | `regimeRetractation()` (décision D12) |
| Page Rétractation, section 5.4 | tableau complet des exceptions, référence par référence | `regimeRetractation()` sur le catalogue |
| Fiches produits | phrase de rétractation du produit | `regimeRetractation()` |
| Courriels, quatre blocs conditionnels | voir tableau 2.2 | catalogue et calcul de commande |
| Page À propos | quinze produits, vingt-trois formats, sept familles, trois zones | catalogue et barème |

**Aucune phrase de rétractation produit par produit n’a été écrite dans ces
brouillons.** Les documents décrivent le régime général (les 3°, 4° et 5° de
l’article L. 221-28) et renvoient au tableau généré. Aucune référence du
catalogue n’est nommée dans les pages légales.

**Risque résiduel à surveiller, signalé sans être tranché** : la décision D12
supprime la duplication *par produit*, elle ne supprime pas la coexistence de
deux formulations du même régime — celle des phrases produites par le code, et
celle, plus longue, de l’article 7 des CGV et de la section 5 de la page
Rétractation. Un document légal ne peut pas se contenter d’un tableau sans
énoncer la règle, donc la coexistence est probablement inévitable ; reste que le
jour où un motif change, deux endroits doivent bouger. Une garde possible : un
test qui vérifie que les trois fondements déclarés par le code
(`L221-28-3`, `L221-28-4`, `L221-28-5`) sont exactement ceux décrits dans la
page Rétractation, et qu’aucun autre n’y figure. À l’architecte d’en décider.

---

## 4. Doutes juridiques consignés — non tranchés

### 4.1 L’encadré de l’article D. 211-2

Reproduit intégralement dans les CGV, article 9, comme texte réglementaire.
Trois réserves :

1. **Vérification littérale.** Le texte doit être comparé mot à mot à la
   version en vigueur sur Légifrance au jour de la mise en ligne. Un encadré
   réglementaire mal recopié est pire qu’un encadré absent.
2. **Variantes.** Le code de la consommation prévoit des encadrés distincts
   selon la nature du bien, notamment pour les biens comportant des éléments
   numériques. Le catalogue ne comporte que des denrées, ce qui oriente vers
   l’encadré des biens simples ; la confirmation revient au juriste.
3. **La ligne sur les mises à jour.** L’encadré contient une phrase sur
   l’obligation de fournir les mises à jour nécessaires au maintien de la
   conformité. Elle n’a aucun sens pour un pot de miel. Elle a néanmoins été
   conservée, parce que le texte se reproduit tel quel et qu’un rédacteur qui
   élague un texte réglementaire l’altère. Point à soumettre au juriste.

### 4.2 La garantie de deux ans face à des denrées périssables

L’encadré annonce un délai de deux ans à compter de la délivrance pour la
garantie légale de conformité. Sur un fromage à date limite de consommation de
douze jours, l’articulation entre ce délai et la durée de vie du produit n’est
pas évidente à la simple lecture. Aucune phrase n’a été ajoutée pour l’expliquer
ou la restreindre : ce serait tomber dans le conseil, et une restriction
rédigée par le marchand sur une garantie légale serait au surplus fragile.

### 4.3 La plateforme européenne de règlement en ligne des litiges

Les modèles de CGV en circulation portent encore, presque tous, un renvoi à la
plateforme européenne de règlement en ligne des litiges et son adresse. Cette
plateforme a cessé son activité. La mention n’a donc **pas** été reprise dans
l’article 10, qui s’en tient au médiateur de la consommation national
(articles L. 611-1, L. 612-1, L. 616-1 et R. 616-1). Si le juriste estime
qu’une mention subsiste sous une autre forme, elle s’ajoute à cet article.

### 4.4 La numérotation de la loi pour la confiance dans l’économie numérique

Les mentions légales citent l’article 6 de la loi n° 2004-575 du 21 juin 2004
et l’article 19 de la même loi. Cette loi a été remaniée depuis, et la
numérotation interne des paragraphes portant les obligations d’identification a
pu bouger. La référence à l’article est fiable, le renvoi à un alinéa précis ne
l’est pas : c’est pourquoi aucun alinéa n’est cité. À vérifier au jour de la
mise en ligne.

### 4.5 L’archivage des contrats

L’article 14 des CGV cite l’article L. 213-1 du code de la consommation « au-delà
d’un certain montant », sans donner ni seuil ni durée. Les deux sont fixés par
voie réglementaire et le montant des paniers du catalogue se situe des deux
côtés du seuil selon la commande. Le jeton
`durée de conservation des contrats et modalités d’accès du client à son contrat
archivé` attend la réponse du marchand.

### 4.6 Le stockage local et l’article 82 de la loi Informatique et Libertés

La page Données personnelles qualifie le contenu du `localStorage` d’opération
strictement nécessaire à la fourniture d’un service expressément demandé par
l’utilisateur, ce qui est la catégorie exemptée de consentement. La
qualification paraît solide — sans panier stocké, il n’y a ni panier ni suivi —
mais elle relève d’une appréciation, et l’absence de bandeau de consentement en
dépend entièrement. Point à confirmer.

### 4.7 Les mentions alimentaires obligatoires en vente à distance

Ce point ne concerne pas mes textes mais les fiches produits, et il conditionne
la crédibilité de l’ensemble : la réglementation européenne sur l’information
des consommateurs sur les denrées alimentaires impose que les mentions
obligatoires, à l’exception des dates de durabilité, soient disponibles **avant
la conclusion de l’achat** (règlement (UE) n° 1169/2011, article 14). Les fiches
portent aujourd’hui la composition, les allergènes, le format et le mode de
conservation. La dénomination légale de vente, la quantité nette, la
déclaration nutritionnelle et l’identité de l’exploitant responsable méritent un
inventaire avant l’ouverture d’une boutique réelle. Sur une démonstration
fictive, la question se pose autrement — mais elle se pose.

### 4.8 La taxe sur la valeur ajoutée et les zones d’expédition

La décision D4 laisse la TVA à l’expert-comptable, ce que le jeton de l’article
3 respecte. Un point mérite d’être versé au dossier : les prix sont affichés en
toutes taxes comprises et identiques pour les trois zones d’expédition, alors
que les régimes fiscaux applicables outre-mer diffèrent de ceux de la métropole
et peuvent s’accompagner de taxes locales. Ce n’est pas une question de
rédaction, c’est une question de paramétrage commercial. Signalée, non tranchée.

### 4.9 Le libellé exact du bouton de commande

L’article 4 des CGV annonce un bouton portant la mention « Commander avec
obligation de paiement ». Le code de la consommation, à l’article L. 221-14,
énonce la formule « commande avec obligation de paiement » et admet une formule
équivalente dénuée d’ambiguïté. Le libellé retenu doit être identique dans les
CGV et dans l’interface — c’est un point de contrôle pour C7, et le choix entre
les deux formulations revient à l’architecte.

### 4.10 Le délai de signalement d’une avarie

L’article 6.3 des CGV invite le client à signaler toute avarie « dans les
meilleurs délais », sans fixer de délai chiffré. Un délai chiffré aurait été un
choix de politique commerciale, et l’écrire à la place du marchand aurait été un
conseil déguisé. À compléter par lui s’il le souhaite.

### 4.11 Le directeur de la publication

La rubrique existe dans les mentions légales avec ses trois emplacements. Selon
la qualification exacte du site, l’obligation de désigner un directeur de la
publication peut ne pas s’imposer telle quelle à une boutique purement
marchande. La rubrique a été conservée, parce qu’elle ne nuit pas et que le
cadrage la demandait explicitement.

---

## 5. Points de cadrage qui m’ont paru contradictoires ou à arbitrer

### 5.1 « Aucune donnée serveur » et la route de paiement

Le cadrage annonce la décision D2 comme « aucune donnée serveur ». Or les
décisions D3 et D10 décrivent une route serveur qui ouvre la session de paiement
et un webhook optionnel. J’ai donc écrit la page Données personnelles au plus
près du fait : rien n’est **conservé** côté serveur, une route existe, et ce
qu’elle transmet au prestataire — contenu du panier et montant — est décrit au
point 1.4. **Ce point doit être vérifié contre l’implémentation réelle en C7** :
si l’adresse de livraison est transmise au prestataire pour ouvrir la session,
ou si le prestataire collecte lui-même une adresse, la phrase doit changer. Une
page « données personnelles » plus optimiste que le code serait exactement le
défaut que cette démonstration prétend éviter.

### 5.2 Les pages citées n’existent pas encore

Les documents renvoient à `/livraison`, `/cgv`, `/retractation`,
`/formulaire-retractation`, `/donnees-personnelles`, `/mentions-legales` et
`/a-propos`. Aucune n’existe au 2026-08-06 : la boutique s’arrête à C2. Les
liens sont écrits pour C7, et le test « aucun lien mort » annoncé pour C8 les
attrapera tous tant que les routes ne sont pas créées. C’est voulu, mais mieux
vaut que ce soit dit avant de voir la garde rougir.

### 5.3 L’aveu de fiction, étendu au-delà de ce qui était demandé

Le cadrage demandait l’encadré de fiction dans les seules mentions légales.
Je l’ai posé en tête des cinq documents légaux, dans une formulation courte et
uniforme. Motif : une page de CGV se lit seule, souvent atteinte directement
depuis un moteur de recherche ; l’avertissement porté uniquement sur une autre
page ne l’atteindrait pas. Si l’architecte préfère un bandeau global unique,
les cinq encadrés se retirent d’un coup.

### 5.4 Trois colonnes en Markdown

La page À propos est demandée en trois colonnes. Le Markdown n’en produit pas :
elle est écrite en trois sections successives, dont les titres exacts et
l’ordre sont fixés dans ses notes d’intégration, avec la consigne de mise en
page (trois colonnes égales sur grand écran, empilées sur mobile).

### 5.5 Typographie

Ces brouillons emploient les apostrophes typographiques et **des espaces
ordinaires**, conformément à la consigne et à la décision D11 : la typographie
fine est posée par le code. Attention en conséquence : ces textes doivent passer
par la même fonction de typographie que le catalogue, sans quoi les pages
légales seront les seules du site à afficher des espaces sécables devant les
deux-points et dans les montants.

### 5.6 Le style de citation des articles

J’ai adopté la forme « article L. 221-18 » — lettre, point, espace — qui est
celle des phrases de `src/lib/retractation.ts`, et non la forme « L221-18 » du
cadrage. Un seul style doit régner sur le site ; celui du code étant déjà écrit
et déjà contrôlé par une garde, c’est lui que j’ai suivi.

### 5.7 La garde « aucune donnée inventée » et les nombres du texte réglementaire

Signalement pratique pour C7 : l’encadré de l’article D. 211-2 contient
« 300 000 euros » et « 10 % », et les documents citent des lois par leur numéro
(« n° 78-17 du 6 janvier 1978 », « n° 2004-575 du 21 juin 2004 », « (UE)
2016/679 », « n° 1169/2011 »). Une garde qui cherche des numéros de téléphone,
des SIREN ou des IBAN par expression régulière risque de s’y accrocher. Il
faudra soit une liste d’exceptions explicite, soit un contrôle qui ignore les
blocs marqués comme texte réglementaire — la seconde voie est plus sûre, parce
qu’elle ne se périme pas à chaque nouvelle citation.

---

## 6. Ce qui n’a volontairement pas été écrit

- **Aucune donnée d’entreprise ou personnelle**, pas même à titre d’exemple :
  ni SIREN, ni adresse, ni téléphone, ni courriel, ni IBAN, ni nom de personne,
  ni nom de médiateur, ni nom de transporteur, ni nom de prestataire de
  paiement. Les 85 libellés de la famille 1 sont la mesure exacte de ce qui
  manque, et c’est délibéré.
- **Aucun conseil** : pas de « vous devriez », pas de durée de conservation
  suggérée, pas de délai de réclamation inventé, pas de choix de médiateur.
- **Aucune paraphrase présentée comme une citation** : les deux seuls textes
  reproduits littéralement sont l’encadré de l’article D. 211-2 et le modèle de
  formulaire annexé à l’article R. 221-1, tous deux signalés comme tels et
  encadrés d’un avertissement. Partout ailleurs, l’effet de la règle est décrit
  en français clair et le numéro d’article sert de référence.
- **Aucune phrase de rétractation produit par produit** (décision D12).
- **Aucun emoji.**
