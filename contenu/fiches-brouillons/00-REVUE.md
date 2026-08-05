# Revue des fiches produits — brouillons pour la tranche C2

- **Date** : 2026-08-06
- **Statut** : brouillons rédactionnels, en attente de reprise en catalogue TypeScript
- **Portée** : 15 fiches, `01-huile-olive.md` à `15-coffret-compose.md`

Note de périmètre : la commande parlait de « 14 fiches produits », mais le
catalogue imposé compte 15 références et la nomenclature de fichiers demandée
va de 01 à 15. J’ai suivi le catalogue et la nomenclature : 15 fiches ont été
écrites. Si l’écart cachait une intention (fusionner les deux coffrets ?
retirer une référence ?), c’est un arbitrage produit qui revient à
l’architecte, pas au rédacteur.

Les prix, formats, poids expédiés et régimes de conservation sont ceux du
cadrage, repris sans modification. Ce qui a été ajouté relève du rédactionnel
(nom de lieu fictif, allergènes, ingrédients, texte) et des clés listées en
section 5.

---

## 1. Tableau récapitulatif

| # | Produit | Famille | Formats et prix TTC | Poids expédiés | Conservation | Vitrine | Illustration |
|---|---|---|---|---|---|---|---|
| 01 | Huile d’olive de première pression | huiles-et-vinaigres | 25 cl 12,90 € / 50 cl 22,50 € / 75 cl 31,00 € | 520 / 950 / 1 340 g | stable, DDM 18 mois | **oui** | bouteille · olive |
| 02 | Huile de noix de moulin | huiles-et-vinaigres | 25 cl 16,50 € / 50 cl 28,00 € | 520 / 950 g | stable, DDM 12 mois | non | bouteille · ocre |
| 03 | Vinaigre de cidre vieilli en fût | huiles-et-vinaigres | 50 cl 9,80 € | 940 g | stable, DDM 24 mois | non | bouteille · encre |
| 04 | Terrine de campagne au poivre noir | conserves-salees | 180 g 9,60 € / 350 g 16,80 € | 340 / 600 g | stable, DDM 36 mois | non | bocal · terre-cuite |
| 05 | Rillettes de canard aux échalotes | conserves-salees | 180 g 11,20 € | 340 g | stable, DDM 36 mois | **oui** | bocal · ocre |
| 06 | Confit d’oignons au vin doux | conserves-salees | 110 g 6,40 € / 220 g 10,90 € | 250 / 430 g | stable, DDM 24 mois | non | bocal · encre |
| 07 | Miel de châtaignier | miels-et-confitures | 250 g 8,90 € / 500 g 15,50 € | 420 / 780 g | stable, DDM 24 mois | non | pot · ocre |
| 08 | Miel de bruyère blanche | miels-et-confitures | 250 g 11,40 € | 420 g | stable, DDM 24 mois | **oui** | pot · creme |
| 09 | Confiture d’abricots de plein vent | miels-et-confitures | 230 g 6,80 € / 370 g 9,90 € | 400 / 600 g | stable, DDM 24 mois | non | pot · terre-cuite |
| 10 | Lentilles blondes du plateau | epicerie-seche | 500 g 5,60 € | 540 g | stable, DDM 24 mois | non | sachet · creme |
| 11 | Infusion du soir, sept plantes | infusions | 60 g 8,20 € | 110 g | scellé hygiène — L221-28 5° | non | sachet · olive |
| 12 | Beurre de baratte demi-sel | frais | 250 g 7,40 € | 380 g | périssable, DLC 21 j, froid | non | pot · encre |
| 13 | Fromage fermier de brebis | frais | 250 g 11,90 € | 400 g | périssable, DLC 12 j, froid | **oui** | sachet · terre-cuite |
| 14 | Coffret « La table du dimanche » | coffrets | 4 pièces 46,00 € | 1 850 g | stable, DDM 24 mois | **oui** | coffret · terre-cuite |
| 15 | Coffret « Composez le vôtre » | coffrets | 3 pièces 34,00 € / 5 pièces 54,00 € | 1 400 / 2 200 g | stable, DDM dérivée — L221-28 3° | non | coffret · olive |

**Cinq mises en avant** : 01, 05, 08, 13, 14. Elles couvrent cinq familles
distinctes, les trois étages de prix du catalogue (5,60 € à 46,00 €), les deux
régimes de conservation, et incluent un coffret (14) et un produit frais (13)
comme demandé.

Le coffret 15 n’est volontairement pas en vitrine : deux coffrets sur cinq
emplacements déséquilibreraient l’accueil, et sa personnalisation demande une
page à elle. Il s’atteint depuis la famille `coffrets` et depuis la fiche 14.

---

## 2. Cohérence des prix au poids

### 2.1 Prix à l’unité de mesure

| # | Produit | Format | Prix | Prix au litre / au kilo |
|---|---|---|---|---|
| 01 | Huile d’olive | 25 cl | 12,90 € | 51,60 €/L |
| 01 | Huile d’olive | 50 cl | 22,50 € | 45,00 €/L |
| 01 | Huile d’olive | 75 cl | 31,00 € | 41,33 €/L |
| 02 | Huile de noix | 25 cl | 16,50 € | 66,00 €/L |
| 02 | Huile de noix | 50 cl | 28,00 € | 56,00 €/L |
| 03 | Vinaigre de cidre | 50 cl | 9,80 € | 19,60 €/L |
| 04 | Terrine | 180 g | 9,60 € | 53,33 €/kg |
| 04 | Terrine | 350 g | 16,80 € | 48,00 €/kg |
| 05 | Rillettes de canard | 180 g | 11,20 € | 62,22 €/kg |
| 06 | Confit d’oignons | 110 g | 6,40 € | 58,18 €/kg |
| 06 | Confit d’oignons | 220 g | 10,90 € | 49,55 €/kg |
| 07 | Miel de châtaignier | 250 g | 8,90 € | 35,60 €/kg |
| 07 | Miel de châtaignier | 500 g | 15,50 € | 31,00 €/kg |
| 08 | Miel de bruyère | 250 g | 11,40 € | 45,60 €/kg |
| 09 | Confiture d’abricots | 230 g | 6,80 € | 29,57 €/kg |
| 09 | Confiture d’abricots | 370 g | 9,90 € | 26,76 €/kg |
| 10 | Lentilles blondes | 500 g | 5,60 € | 11,20 €/kg |
| 11 | Infusion du soir | 60 g | 8,20 € | 136,67 €/kg |
| 12 | Beurre de baratte | 250 g | 7,40 € | 29,60 €/kg |
| 13 | Fromage de brebis | 250 g | 11,90 € | 47,60 €/kg |

### 2.2 Dégressivité par format

Les six produits multi-formats sont tous dégressifs, sans exception :

- Huile d’olive : 51,60 → 45,00 → 41,33 €/L
- Huile de noix : 66,00 → 56,00 €/L
- Terrine : 53,33 → 48,00 €/kg
- Confit d’oignons : 58,18 → 49,55 €/kg
- Miel de châtaignier : 35,60 → 31,00 €/kg
- Confiture d’abricots : 29,57 → 26,76 €/kg

Aucun format ne pénalise le client qui achète plus grand. C’est vérifiable par
un test d’une ligne, et il vaut mieux l’écrire maintenant que le découvrir sur
une future référence.

### 2.3 Écarts entre produits voisins

- **Noix contre olive** : +28 % au litre à format égal (66,00 contre 51,60 €/L
  en 25 cl). Justifié dans la fiche 02 par le rendement du cerneau et le tri
  manuel. La DDM suit la même logique — 12 mois contre 18, parce que la noix
  rancit plus vite — et la fiche le dit explicitement.
- **Bruyère contre châtaignier** : +28 % au kilo (45,60 contre 35,60 €/kg). La
  fiche 08 attribue l’écart à une floraison de trois semaines et à un rendement
  irrégulier, sans le maquiller en argument de rareté.
- **Canard contre porc** : rillettes 62,22 €/kg contre terrine 53,33 €/kg, à
  bocal identique. Cohérent avec les matières.
- **Vinaigre** : 19,60 €/L, moins de la moitié de l’huile d’olive la moins
  chère au litre. Cohérent pour un condiment acide.
- **Bornes du catalogue** : lentilles 11,20 €/kg au plancher, infusion
  136,67 €/kg au plafond. L’infusion n’est chère qu’au kilo : 60 g font une
  trentaine de tasses, soit 0,27 € la tasse — c’est ce repère-là qu’il faut
  donner au client, pas le prix au kilo.

### 2.4 Une anomalie assumée, et une à trancher

**Anomalie assumée** — le confit d’oignons en 110 g ressort à 58,18 €/kg,
au-dessus de la terrine 180 g (53,33 €/kg) et bien au-dessus de la terrine
350 g (48,00 €/kg). C’est structurel : le bocal de 110 g pèse 140 g à vide, il
y a plus d’emballage que de contenu. Le prix par portion, lui, reste modeste.
Rien à corriger dans les prix ; l’anomalie n’existe que si le site affiche un
prix au kilo (voir section 4).

**À trancher** — les tares d’emballage sont cohérentes partout sauf sur un
point. Les deux huiles partagent la même bouteille (291 g à vide en 25 cl,
492 g en 50 cl), les deux conserves 180 g le même bocal (160 g), le miel 250 g
et la confiture 230 g le même pot (170 g). Mais le vinaigre en 50 cl ressort à
435 g de tare, soit 57 g de moins que les huiles au même volume. Soit c’est une
seconde référence de bouteille — c’est plausible et il suffit de le savoir —
soit c’est un poids à réaligner. Le moteur de frais de port travaille sur ces
poids : autant que la question soit posée avant qu’il les utilise.

### 2.5 Les coffrets par rapport à la somme de leurs pièces

**Coffret 14, « La table du dimanche »** — composition arrêtée : huile d’olive
25 cl (12,90 €), terrine 180 g (9,60 €), rillettes 180 g (11,20 €), confit
d’oignons 110 g (6,40 €). Somme des pièces **40,10 €**, prix du coffret
**46,00 €**, soit **+5,90 € (+14,7 %)**. Côté poids, 1 450 g de pièces pour
1 850 g expédiés : 400 g d’écrin et de calage, ce qui est cohérent avec une
boîte rigide garnie.

L’écart se défend (boîte, calage, assemblage) mais il ne se cache pas : la
fiche 14 l’écrit noir sur blanc et invite à commander les pièces à l’unité si
l’écrin n’a pas d’intérêt. Sur une boutique qui se présente comme une
démonstration honnête, mieux vaut le dire que le laisser découvrir.

**Coffret 15, « Composez le vôtre »** — forfait de 11,33 € la pièce à trois,
10,80 € la pièce à cinq. Dégressif, donc cohérent avec le reste du catalogue.
Le forfait sur contenu variable est le vrai sujet : il est traité en
section 4, point 2.

---

## 3. Répartition des cinq formes et des cinq teintes

Quinze produits, quinze combinaisons **toutes distinctes** — pas seulement au
sein d’une même famille comme demandé, mais sur l’ensemble du catalogue. Aucune
silhouette colorée ne se retrouve deux fois, ce qui laisse à chaque produit une
vignette qui lui est propre.

|  | olive | ocre | terre-cuite | encre | creme |
|---|---|---|---|---|---|
| **bouteille** | 01 huile d’olive | 02 huile de noix | — | 03 vinaigre | — |
| **bocal** | — | 05 rillettes | 04 terrine | 06 confit | — |
| **pot** | — | 07 miel châtaignier | 09 confiture | 12 beurre | 08 miel bruyère |
| **sachet** | 11 infusion | — | 13 fromage | — | 10 lentilles |
| **coffret** | 15 composez | — | 14 table du dimanche | — | — |

**Par forme** : bouteille 3, bocal 3, pot 4, sachet 3, coffret 2.
**Par teinte** : olive 3, ocre 3, terre-cuite 4, encre 3, creme 2.

Quinze cases occupées sur vingt-cinq. Les dix cases libres sont de la marge
pour de futures références sans avoir à repeindre l’existant.

Contrôle par famille — aucune collision :

| Famille | Produits | Combinaisons |
|---|---|---|
| huiles-et-vinaigres | 3 | bouteille × {olive, ocre, encre} |
| conserves-salees | 3 | bocal × {terre-cuite, ocre, encre} |
| miels-et-confitures | 3 | pot × {ocre, creme, terre-cuite} |
| epicerie-seche | 1 | sachet × creme |
| infusions | 1 | sachet × olive |
| frais | 2 | pot × encre, sachet × terre-cuite |
| coffrets | 2 | coffret × terre-cuite, coffret × olive |

Chaque famille garde une silhouette dominante — la bouteille pour les huiles,
le bocal pour les conserves, le pot pour les miels — ce qui rend la famille
lisible d’un coup d’œil dans une grille. La famille `frais` fait exception
volontairement : le beurre en pot et le fromage en sachet, parce qu’aucune
silhouette unique ne représente honnêtement les deux.

---

## 4. Trois points de vigilance pour l’intégration C2

### Point 1 — Un prix de coffret est une donnée saisie, jamais un calcul ; et la conversion en centimes ne doit pas passer par un flottant

Deux prix du catalogue ne se déduisent d’aucune addition. Le coffret 14 vaut
46,00 € quand ses pièces valent 40,10 €. Le coffret 15 est au forfait, quelle
que soit la combinaison. Si le catalogue calcule le prix d’un coffret à partir
de ses pièces, il affichera un prix faux dans les deux cas. `prixCentimes` doit
être une donnée du coffret, et la composition ne sert qu’à l’affichage et au
calcul des champs dérivés.

Sur la conversion : la décision D4 fixe les prix en centimes, ce qui est le bon
choix. Encore faut-il ne jamais les obtenir par multiplication. En JavaScript,
`12.90 * 100` vaut `1289.9999999999998`, et `Math.round` en aval masquerait le
problème sans le supprimer. J’ai donc porté **`prixCentimes` en entier, écrit à
la main, dans les quinze frontmatters**, à côté de `prixEuros` conservé pour la
relecture humaine. C2 n’a plus qu’à recopier l’entier. Un test qui vérifie
l’égalité `prixCentimes === Math.round(prixEuros * 100)` sur les 22 couples
format/prix du catalogue attrape toute divergence future en une seconde.

### Point 2 — Le coffret personnalisable a besoin d’une liste blanche verrouillée par un test, pas d’un commentaire

La liste que je propose dans `15-coffret-compose.md` compte onze références :
les produits stables en petit format, de 5,60 € (lentilles) à 12,90 € (huile
d’olive 25 cl). Les frais en sont exclus — les mêler à des conserves imposerait
l’isotherme et la restriction métropole à tout le coffret — et les grands
formats aussi, pour que le forfait tienne. Voici ce que ce forfait donne :

| Format | Prix | Pièces au pire cas client | Écart | Pièces au meilleur cas | Écart |
|---|---|---|---|---|---|
| 3 pièces | 34,00 € | 35,50 € | −1,50 € | 18,80 € | +15,20 € |
| 5 pièces | 54,00 € | 56,20 € | −2,20 € | 35,90 € | +18,10 € |

Le pire cas actuel est absorbable, et ce n’est pas là qu’est le danger. Le
danger est dans l’ajout futur d’une référence à la liste : si l’huile de noix
50 cl (28,00 €) y entrait, trois pièces vaudraient 84,00 € et seraient vendues
34,00 €. Une note dans un fichier de documentation ne l’empêchera pas.

Donc : `piecesEligibles` doit être une constante du catalogue, et un test doit
échouer si `3 × (prix maximal des pièces éligibles) > 3400` centimes, de même à
cinq contre `5400`. C’est une invariante de deux lignes qui protège un
arbitrage commercial pour toute la durée du projet.

Second volet du même point : **trois champs du coffret 15 ne sont pas
saisissables**. Les allergènes sont l’union de ceux des pièces choisies, le
poids expédié est la somme des pièces plus l’écrin, et la DDM est le minimum
des pièces. Les trois se calculent au panier, pas au catalogue. La valeur
`ddmMois: 12` que j’ai laissée dans le frontmatter est un défaut d’affichage
pour la fiche, pas la valeur qui devra figurer sur la commande — la clé porte
d’ailleurs une `note` qui le dit.

### Point 3 — Trois régimes de conservation, trois exceptions de rétractation différentes, dont une que le cadrage n’a pas nommée

Le catalogue transmis cite l’article L221-28 pour deux produits : le 3° pour le
coffret personnalisable, le 5° pour l’infusion une fois descellée. Il ne dit
rien du beurre ni du fromage. Or ces deux-là relèvent du **4°** — biens
susceptibles de se détériorer ou de se périmer rapidement. Sans ce troisième
cas, la page rétractation annoncera quatorze jours sur deux denrées périssables
expédiées sous isotherme. C’est exactement le genre d’erreur qu’une
démonstration vendue comme conforme ne peut pas se permettre, et c’est le
premier détail qu’un prospect attentif ira vérifier.

J’ai donc ajouté `exceptionRetractation: L221-28-4` aux fiches 12 et 13, et
écrit la mention en clair dans leur conseil de conservation. À valider par
l’architecte, mais l’omission me paraît être un oubli de cadrage plutôt qu’une
intention.

Conséquence de typage, dans la foulée : `conservation` n’est pas un champ
texte. Ce sont trois formes disjointes — `{ type: 'stable', ddmMois }`,
`{ type: 'perissable', dlcJours, chaineDuFroid }`, `{ type: 'scelle-hygiene' }`
— qui appellent une union discriminée en TypeScript strict, pour que le
compilateur interdise de lire `dlcJours` sur une conserve stérilisée. Des jours
et des mois dans le même champ numérique finiraient par se confondre.

Enfin, la décision D9 (refus d’expédition hors métropole) doit se brancher sur
le drapeau périssable, **jamais sur la famille `frais`**. Le jour où un coffret
contiendra du beurre, sa famille sera `coffrets` et une règle écrite sur la
famille passera à côté sans rien signaler.

---

## 5. Clés ajoutées au gabarit — à valider par l’architecte

Le gabarit demandé a été respecté. Six clés ont été ajoutées parce que
l’information existait et qu’elle se serait perdue ; elles sont toutes
optionnelles et peuvent être retirées sans toucher au texte.

| Clé | Fiches | Pourquoi |
|---|---|---|
| `prixCentimes` | les 15 | Évite la multiplication flottante à la reprise (point 1) |
| `exceptionRetractation` | 11, 12, 13, 15 | Rend explicite le motif L221-28 applicable (point 3) |
| `chaineDuFroid` | 12, 13 | Support du refus d’expédition D9, indépendant de la famille |
| `composition` | 14 | Les quatre SKU du coffret fixe, avec leur prix unitaire |
| `piecesEligibles` | 15 | Les onze SKU de la liste blanche (point 2) |
| `conservation.note` | 15 | Signale que la DDM affichée est dérivée, pas saisie |

## 6. Contrôles passés sur les quinze fiches

- Les quinze résumés font entre 111 et 125 signes, sous la limite de 140.
- Aucune apostrophe droite : le U+2019 est employé partout, y compris dans le
  frontmatter YAML.
- Espaces insécables U+00A0 devant les unités, les symboles et la ponctuation
  double, et en séparateur de milliers.
- Aucun emoji.
- Aucune marque réelle, aucune appellation protégée, aucun producteur nommé,
  aucune récompense revendiquée, aucune donnée personnelle.
- Les six lieux d’origine sont inventés et portent tous la mention
  « (lieu fictif) » : coteaux d’Ambrelieu, vallon de Vaubrune, bocage de
  Quéhaut, val d’Ombrèze, plateau de Rouvraine, landes de Chaubrune, plateau de
  Sarnière — plus « assemblé à Vaubrune » pour les deux coffrets. Ils sont
  répartis de façon cohérente : les fruits et les olives sur les coteaux, les
  bêtes et le cidre dans le bocage, les brebis et les lentilles sur les
  plateaux, les plantes et les ruches sur les landes.
- Les quinze frontmatters se lisent sans erreur par un analyseur YAML.
