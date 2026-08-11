# Décision 007 (D35) — Des visuels ENGENDRÉS, et ce que D6 gardait vraiment

- **Date** : 2026-08-06
- **Tranche** : C11 (préparation de la refonte visuelle)
- **Statut** : gravé (l'obligation posée ici est mise en œuvre en C14 pour les
  images elles-mêmes, en C15 et C19 pour les déclarations d'origine)
- **Objet** : la décision D6 (« illustrations : SVG paramétrés maison, aucune
  photographie de banque d'images ») tenait tant que la vitrine était faite de
  silhouettes. La refonte « calibre Awwwards » demande des visuels produit qui
  ressemblent à ceux d'une épicerie fine. Faut-il annuler D6 ?

## Le choix

**D6 est AMENDÉE, pas annulée.**

Les visuels produit de la refonte seront **engendrés** — une série cohérente,
produite pour cette maison fictive et pour elle seule, versionnée dans
`public/produits/`. Aucune photographie de banque d'images, aucune image
trouvée, aucune image d'un producteur qui existe.

## Pourquoi ce n'est pas un renoncement

Il faut relire D6 pour ce qu'elle protégeait, et non pour la lettre de sa
solution. Elle protégeait deux choses :

1. **Ne pas emprunter le crédit visuel d'autrui.** Une photographie de banque
   d'images est le travail d'un photographe, souvent le produit d'un
   producteur réel — le poser sur une fiche fictive fait porter à ce travail
   une promesse qu'il n'a pas faite.
2. **Ne pas maquiller une démonstration.** Une vitrine trop belle pour ce
   qu'elle est ment sur l'objet de la démonstration : ce qui est vendu ici,
   c'est une boutique qui fonctionne, pas un catalogue de photographies.

Une série engendrée pour cette marque satisfait la première intégralement : il
n'y a personne à qui l'emprunter. Elle satisfait la seconde à une condition, et
cette condition est l'objet de la seconde moitié de cette décision : **le site
doit dire d'où viennent ses images.**

L'alternative — garder les silhouettes seules — n'a pas été écartée par
confort. Une épicerie fine dont les fiches ne montrent pas le produit ne
ressemble à aucune épicerie fine, et la démonstration porte précisément sur
« à quoi ressemble une boutique livrée ». Le rendu deviendrait la limite la
plus visible du travail, pour une raison qui n'est plus la bonne.

## Ce qui est INTERDIT sur ces images

La liste est fermée, et chaque entrée a son motif :

| Interdit | Motif |
|---|---|
| Toute personne, tout visage, toute main | Un visage engendré est le visage de personne, et il n'a rien signé. Une main qui présente un produit fait exister un geste et une caution qui n'ont pas eu lieu. |
| Toute marque réelle, tout nom de maison existante | La promesse des mentions légales, déjà tenue sur le texte par `scripts/verifier-marques-reelles.mjs` (décision D32). |
| Tout signe officiel de qualité | La liste exacte est celle de `MENTIONS_OFFICIELLES` dans cette même garde, à quoi s'ajoutent les logotypes de l'agriculture biologique, européen comme national. Ce sont des certifications délivrées par des organismes ; les faire apparaître sur une étiquette engendrée est une allégation fausse, et le fait que le produit n'existe pas n'est pas une excuse. |
| Toute marque sanitaire (l'ovale d'agrément) | Même raison : c'est un numéro d'agrément d'établissement, délivré par l'administration. |
| Tout code-barres | Un code-barres lisible désigne un article dans un référentiel mondial — donc un article qui n'est pas celui-ci. |

Ces interdits portent sur ce que l'image MONTRE. Une garde textuelle ne sait
pas les lire : c'est une relecture humaine, à la livraison des images (C14), et
elle est consignée dans le compte rendu de la tranche.

## Ce que la garde, elle, sait lire

Deux contrôles automatiques accompagnent la décision et existent dès cette
tranche (C11), avant la première image :

- **`scripts/verifier-images.mjs`** — un dossier par slug du catalogue, un
  vocabulaire fermé de noms de fichiers, un plafond de poids par format,
  correspondance stricte avec le manifeste de livraison.
- **Le contrôle des métadonnées binaires**, ajouté à la garde des marques.
  C'est le contrôle le moins évident et le plus utile : les sorties des
  moteurs d'images embarquent couramment **le texte du prompt** dans les
  métadonnées du fichier. Une image visuellement irréprochable peut donc
  transporter, en clair et invisible à l'œil, une phrase citant une maison
  réelle — c'est-à-dire exactement ce que la garde des marques empêche depuis
  C8, contournée par un canal qu'elle ne regardait pas. Tout marqueur de
  métadonnées fait échouer la construction ; les binaires livrés sont nus.

## Les silhouettes SVG sont CONSERVÉES, et requalifiées

Elles ne disparaissent pas : elles changent d'emploi. De vitrine principale,
elles deviennent la **structure de repli**, dans quatre situations :

1. **Quand un produit n'a pas de champ `visuel`.** Le catalogue doit rester
   servable sans image — un produit ajouté en C14+ sans son jeu d'images
   s'affiche, il ne casse pas.
2. **À l'impression** (`@media print`), où une photographie coûte de l'encre
   pour un rendu médiocre et où la silhouette porte mieux l'information.
3. **Dans l'espace `/gestion`**, qui est un outil et non une vitrine : les
   quinze lignes d'un tableau de catalogue se lisent mieux avec une vignette
   qui tient en deux couleurs.
4. **Dans les états vides**, où il n'y a précisément rien à photographier.

Les quinze combinaisons `forme × teinte` restent donc toutes distinctes, et la
garde du catalogue continue de l'exiger (contrôle « quinze vignettes toutes
distinctes », premier régime).

## L'obligation de transparence

Elle est la contrepartie de l'amendement, et elle est **contraignante** :
l'origine engendrée des visuels sera **déclarée**, en français et sans détour,
à trois endroits :

- **`/a-propos-de-cette-demonstration`** — la page qui dit déjà ce que cette
  boutique n'est pas ; c'est sa place naturelle (mise en œuvre en C15) ;
- **les mentions légales**, au même titre que la fiction de la maison ;
- **le `README.md`**, pour le lecteur qui arrive par le dépôt et non par le
  site (mise en œuvre en C19).

Une démonstration qui montre des images engendrées sans le dire ferait
exactement ce que D6 refusait : maquiller. La différence entre « engendré et
déclaré » et « engendré et tu » est toute la décision.

## Portée

Cette décision vaut pour les **visuels produit**. Elle ne rouvre ni la porte
aux photographies de banque d'images (toujours exclues), ni celle aux images
de personnes (interdites ci-dessus), ni celle aux scripts tiers ou aux
ressources distantes — `img-src 'self' data:` reste inchangé (décision D34),
et les images sont donc servies depuis le domaine, comme les polices.
