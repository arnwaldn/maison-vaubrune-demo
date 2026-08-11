# Les mesures publiées

Ce dossier porte les relevés Lighthouse du projet, et depuis la tranche C12 les
relevés de POIDS TRANSFÉRÉ. Ils sont **versionnés volontairement** : ce ne sont
pas des artefacts de construction, ce sont les pièces qui rendent vraie la
promesse « quatre notes ≥ 90, mesurées et datées » de l'offre « Boutique en
ligne », et celles qui rendent contrôlables les plafonds de la décision D36.

## Le relevé de référence

`lighthouse-AAAA-MM-JJ.json` est le relevé **de la tranche**, écrit par
`scripts/mesurer-notes.mjs`. Il porte, pour chacune des quatre URL mesurées, les
quatre notes et quatre mesures d'expérience, plus le profil et les seuils qui
ont servi de barrière. C'est le seul fichier de ce dossier qu'il faut lire pour
savoir où en est le site.

`lighthouse-en-ligne-AAAA-MM-JJ.json` est son jumeau **mesuré sur le
déploiement réel** (tranche C9, depuis le 2026-08-06). Même profil, mêmes quatre
URL, mêmes seuils — seule l'origine change : `profil.horsLigne` y vaut `false`
et `profil.origine` nomme l'adresse mesurée. **C'est ce fichier-là qui engage
commercialement** : il porte le réseau de diffusion, la compression et les
en-têtes réellement servis. Les deux relevés vivent séparément parce que
confondre les deux reviendrait à publier la note d'un site pour celle d'un
autre — et parce que le relevé hors ligne attrape une régression le jour où on
l'introduit, sans réseau ni hébergeur.

Les autres fichiers — `lighthouse-<page>-AAAA-MM-JJ.json` — sont les rapports
Lighthouse **complets** des tranches C1 à C7, lancés à la main page par page.
Ils font plusieurs centaines de kilo-octets chacun et contiennent le détail
audit par audit. Ils sont conservés parce qu'ils sont datés et qu'un rapport
complet permet de comprendre une note ; ils ne sont plus la manière de mesurer.

## Refaire la mesure

Une seule commande, depuis la racine du projet :

```bash
npm run mesurer-notes
```

Elle construit le site si `.next/` est absent, le sert en production sur un
port libre, lance Lighthouse sur les quatre URL, compare chaque note à son
seuil, écrit `mesures/lighthouse-<date du jour>.json` et sort en erreur si une
note passe sous son seuil.

Deux options, toutes deux facultatives :

```bash
node scripts/mesurer-notes.mjs --date 2026-08-06   # nomme le fichier autrement
node scripts/mesurer-notes.mjs --port 4310         # impose le port de service
```

Et une troisième, qui change la nature du relevé :

```bash
node scripts/mesurer-notes.mjs --base https://maison-vaubrune-demo.vercel.app
```

Rien n'est construit, rien n'est servi : le script mesure le déploiement en
ligne et écrit `lighthouse-en-ligne-<date>.json`. L'adresse doit être en
`https://` — mesurée en clair, la page ne serait pas un contexte sécurisé et la
note de bonnes pratiques chuterait pour une raison qui ne regarde pas le
livrable.

La mesure demande un Chrome. Le script prend celui que Playwright a déjà
installé pour les parcours de bout en bout ; à défaut, posez `CHROME_PATH` ou
lancez `npx playwright install chromium`.

## Ce qui est mesuré, et pourquoi ces quatre-là

| URL | Ce qu'elle représente |
|---|---|
| `/` | le socle : mise en page, polices, en-tête et pied de page |
| `/boutique` | le rayon — quinze vignettes, le plus gros poste d'images du site |
| `/boutique/huile-olive-premiere-pression` | la page la plus lourde de la vitrine, et il y en a quinze |
| `/panier` | la page publique la plus chargée en JavaScript |

**Le rayon est entré en C16, et ce tableau ne l'a dit qu'en C19** : trois
tranches ont annoncé « trois URL » à côté d'un relevé qui en portait quatre.
C'est la même faute que celles qu'attrapent les gardes de ce dépôt — une phrase
qui décrit l'outillage cesse d'être vraie sans que rien ne rougisse — et elle
est corrigée ici plutôt que déclarée ailleurs.

Deux adresses en sont **volontairement absentes** : `/paiement/simulation` et
`/gestion` portent `robots: noindex` et obtiendraient une note de référencement
en retrait qui dirait la consigne donnée, pas la qualité du travail (décisions
D21 et D19). Elles sont relevées à part, dans le compte rendu de tranche.

## Le profil : mobile bridé

Lighthouse propose deux profils. Celui retenu ici est le **profil par défaut** :
un mobile de milieu de gamme, réseau lent, processeur ralenti. C'est le plus
sévère des deux, et le seul qui veuille dire quelque chose pour la note de
rapidité — le profil « ordinateur » mesure sans bridage et flatte le résultat.

Les seuils, écrits dans le script et recopiés dans chaque relevé :

| Note | Seuil |
|---|---|
| Rapidité | 90 |
| Accessibilité | 100 |
| Bonnes pratiques | 100 |
| Référencement | 96 |

Le seuil de rapidité était de **92 de la tranche C1 à la C9**. Il est passé à
**90 en C11** (décision D36, `contenu/decisions/008-budgets-revises.md`) : la
marge mesurée était alors de huit points — 98 et 99 au profil mobile bridé, en
local comme en ligne —, les visuels de la refonte allaient faire dépendre la
note du réseau du visiteur bien plus que du code, et le chiffre s'alignait
enfin sur les « quatre notes ≥ 90 » que l'offre annonce. C'est le seul seuil de
ce projet qui ait jamais baissé.

**La marge s'est refermée d'une partie en C13, puis s'est rouverte en C14** —
et les deux moitiés de l'épisode valent mieux qu'une leçon de prudence.

*La perte.* Le relevé du 10/08 (`lighthouse-2026-08-10.json`) donne **96** sur
les trois pages, contre 98 avant la refonte. La cause n'était pas un accident :
C13 emploie la troisième voix du trio typographique — la monospace du registre —
dans l'en-tête et le pied de page, donc sur toutes les pages. Elle entrait par
là sur le chemin critique, qu'elle ne touchait pas tant qu'aucun élément rendu
ne l'employait : **+36,5 Ko de police**, premier affichage de 1,5 à 1,7 s, plus
grand affichage de 2,2-2,4 à 2,6 s.

*Le retour.* Le relevé du même jour suffixé `-c14` donne **98 / 97 / 96**, et
la fiche du milieu porte désormais DEUX PHOTOGRAPHIES qu'elle n'avait pas.
C14 a sous-ensemblé cette même mono et restreint son axe de graisse aux deux
valeurs employées : **36 476 → 13 176 octets**, soit 22,8 Ko rendus sur chaque
page. Les images de la fiche en ont repris 30,9 : le solde net est de huit
kilooctets, pour deux images de produit.

*Le round 1 de revue* a rendu neuf kilooctets de plus, et pour une raison qui
mérite d'être lue avec le reste : la livraison offrait les largeurs 320 et 640,
et le profil de mesure — 240 points de place, densité 1,75, donc 420 points de
besoin — prenait 640 parce qu'il n'y avait rien entre les deux. La largeur 480,
ajoutée, ramène les images de la fiche de **30,9 à 21,2 Ko** et le plus grand
affichage de 2,6 à 2,5 s. Relevé `lighthouse-2026-08-10-c14-round1.json` :
98 / 97 / 96, inchangé — le gain est dans les octets, pas dans la note, et il
vaut d'être noté pour cela même : *une note qui ne bouge pas ne prouve pas qu'il
n'y avait rien à gagner.*

Le seuil est un plancher et non un objectif, et ces deux relevés le montrent
mieux qu'une phrase : une note qui tomberait de 98 à 91 tiendrait le seuil tout
en étant une perte de sept points. Les relevés datés ci-dessous sont là pour
qu'on lise l'écart réel plutôt que le verdict — et depuis C14 ils portent un
**suffixe de tranche** (`--suffixe c14`), parce que C12 et C13 ont mesuré le
même jour et que le second a écrasé le premier.

## Ce que « hors ligne » veut dire

Le champ `profil.horsLigne` vaut `true` dans tous les relevés, et c'est une
mise en garde, pas une case cochée.

**La mesure est prise sur la machine de développement**, sur la construction de
production servie en local par `next start`. Il n'y a donc :

- **aucune latence réseau réelle** — les octets ne traversent que la boucle
  locale, et le bridage appliqué par Lighthouse est une SIMULATION de réseau
  lent, pas un vrai réseau lent ;
- **aucun réseau de diffusion de contenu**, aucun cache d'hébergeur, aucune
  compression négociée par un serveur de production ;
- **aucune charge concurrente** : la machine ne sert qu'un visiteur, qui est
  l'outil de mesure lui-même.

Ce que ces notes disent : **la santé du livrable** — son poids, sa structure,
son accessibilité, son balisage. Ce sont des propriétés du code, et elles se
transportent.

Ce qu'elles ne disent pas : **la rapidité servie à un visiteur réel**, qui
dépend de l'hébergeur, de sa région, de son cache et de la connexion du
visiteur. La mesure qui engagera commercialement sera refaite sur le
déploiement réel, et elle portera sa propre date.

## Les relevés de poids transféré (C12)

`transfert-AAAA-MM-JJ.json` est écrit par `scripts/mesurer-transfert.mjs`
(`npm run mesurer-transfert`). Il tient les deux plafonds de NAVIGATION de la
décision D36, ceux que la colonne « First Load JS » de `next build` ne sait pas
voir parce qu'elle compte ce que l'empaqueteur rattache à une route et non ce
qu'un navigateur télécharge :

| Grandeur | Plafond |
|---|---|
| JS transféré au chargement d'une page ouverte à froid | ≤ 145 Ko |
| JS transféré après le parcours accueil → rayon → fiche → panier | ≤ 190 Ko |

La mesure lit `performance.getEntriesByType('resource').transferSize` : des
octets réseau, en-têtes compris, et **zéro pour une ressource servie par le
cache**. C'est ce qui rend le second plafond honnête — un visiteur ne vide pas
son cache en cliquant, et le parcours est donc joué dans UN SEUL contexte de
navigateur. Comme `mesurer-notes`, le script accepte `--date`, `--port` et
`--base https://…` (le relevé part alors dans `transfert-en-ligne-<date>.json`),
et il sort en erreur si un plafond est dépassé.

Il n'est **pas** dans `npm run controle` : il lui faut un Chromium, une
production servie et quatre navigations, c'est-à-dire le coût d'une campagne de
bout en bout que la chaîne enchaîne déjà. Le troisième plafond de D36 — CSS
≤ 12 Ko gzip —, lui, se mesure sur un fichier : il est tenu à chaque contrôle
par `scripts/verifier-poids-css.mjs`, juste après `build`.

## Quel instrument fait foi (tranché en C19)

Ce dépôt porte DEUX mesureurs de décalage cumulé, et ils ne disent pas la même
chose sur `/boutique` : Lighthouse relève **0,0073**, l'outil maison
`preuves/c17/diag-cls-deux-regimes.mjs` relève **0,0011**. L'écart a traversé
trois tranches, et chaque résumé citait le chiffre qui l'arrangeait.

**LA RÈGLE EST LIGHTHOUSE**, pour trois raisons dans cet ordre :

1. **C'est l'instrument que ce projet publie.** Les douze notes du README, les
   relevés datés de ce dossier, l'engagement vendu au client : tout vient de
   Lighthouse. Un engagement énoncé dans les termes d'un instrument ne peut pas
   être vérifié par un autre.
2. **C'était la lecture pessimiste — et ça ne l'est plus.** Entre deux mesures
   d'un même défaut, celle qui alarme est celle qu'on garde ; au moment de
   l'arbitrage, c'était Lighthouse. Voir la mise à jour datée ci-dessous : le
   rapport s'est inversé, et la règle n'en dépendait pas.
3. **L'écart n'est pas un désaccord, c'est un point de fonctionnement.** Le
   défaut est un échange de police, et un échange de police ne décale que s'il
   arrive APRÈS le premier affichage. Sans bridage processeur, la page ne
   décale pas du tout (mesuré : **0,00000**, zéro décalage enregistré) ; sous le
   bridage réseau de l'outil maison, 0,0046 ; sous le bridage processeur de
   Lighthouse, 0,0073. Les trois sont vrais, et le plus sévère est celui qui
   décide.

**MISE À JOUR DU 11/08 (après C19-ter et la recette finale) — LES DEUX CHIFFRES
ONT BAISSÉ, ET LEUR ORDRE S'EST RETOURNÉ.** Le bandeau des sept familles repris
en RANG FLEX à la racine a fait tomber le rayon à **0,0018 à l'outil maison** et
à **0,00077 à Lighthouse** (pire des quatre tirages du 11/08 ; 0,00063 sur les
trois autres). L'outil maison est donc désormais **le plus sévère des deux**,
c'est-à-dire l'inverse exact de la raison n° 2 ci-dessus. **La règle ne bouge
pas** : elle tient à la raison n° 1, qui est la seule qui ne dépende pas d'un
état de fait. Les deux valeurs sont sous le plafond de 0,002, et le README les
publie toutes les deux plutôt que de choisir celle qui l'arrange — c'est
exactement le défaut que cet arbitrage avait été écrit pour fermer.

**L'OUTIL MAISON RESTE, ET IL EST IRREMPLAÇABLE — comme DIAGNOSTIC.** Lighthouse
donne un nombre et le nœud le plus grand ; l'outil maison donne LES SOURCES de
chaque décalage, avec leurs rectangles avant et après. C'est lui qui a nommé,
en C19, la liste des sept familles et la ligne de garde des cartes. Il ne doit
plus jamais être cité comme un résultat publié.

## Tout poids publié se mesure sur une CONSTRUCTION FRAÎCHE (règle, C19)

C18 a annoncé un poids CSS de 9,52 Ko qui ne se reproduisait pas : la mesure
avait été prise sur un `.next/` périmé, et la valeur réelle était 9,27. Personne
n'a menti et le chiffre était faux quand même.

**La règle, sans exception : `npm run build` puis la mesure, dans cet ordre, dans
la même session.** Elle vaut pour le poids CSS, pour le premier chargement, pour
le transfert et pour les notes. Un relevé pris sur une construction dont on ne
sait pas ce qu'elle contient ne mesure pas le dépôt, il mesure un souvenir.

## Ce que chaque relevé doit porter (règle, C19)

Un relevé qui ne dit pas QUAND ni SUR QUOI il a été pris ne se compare à rien.
Tout fichier écrit dans `mesures/` ou dans `preuves/` porte donc, en tête :

- la **date** de la mesure ;
- le **commit** sur lequel elle a été prise (`git rev-parse --short HEAD`) ;
- le **titre de la tranche courante**, jamais celui d'une tranche précédente —
  deux relevés de C18 portaient encore « tranche C17 » en en-tête, recopiés du
  gabarit, ce qui est la façon la plus sûre de faire comparer deux choses qui ne
  se comparent pas.

## Pourquoi ce dossier n'est pas dans `.gitignore`

Parce qu'une note publiée sans son relevé est un chiffre, et qu'un chiffre sans
sa pièce ne vaut rien. `.gitignore` porte d'ailleurs la note qui le dit.
