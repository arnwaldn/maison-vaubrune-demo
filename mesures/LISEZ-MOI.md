# Les mesures publiées

Ce dossier porte les relevés Lighthouse du projet. Ils sont **versionnés
volontairement** : ce ne sont pas des artefacts de construction, ce sont les
pièces qui rendent vraie la promesse « quatre notes ≥ 90, mesurées et datées »
de l'offre « Boutique en ligne ».

## Le relevé de référence

`lighthouse-AAAA-MM-JJ.json` est le relevé **de la tranche**, écrit par
`scripts/mesurer-notes.mjs`. Il porte, pour chacune des trois URL mesurées, les
quatre notes et quatre mesures d'expérience, plus le profil et les seuils qui
ont servi de barrière. C'est le seul fichier de ce dossier qu'il faut lire pour
savoir où en est le site.

`lighthouse-en-ligne-AAAA-MM-JJ.json` est son jumeau **mesuré sur le
déploiement réel** (tranche C9, depuis le 2026-08-06). Même profil, mêmes trois
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
port libre, lance Lighthouse sur les trois URL, compare chaque note à son
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

## Ce qui est mesuré, et pourquoi ces trois-là

| URL | Ce qu'elle représente |
|---|---|
| `/` | le socle : mise en page, polices, en-tête et pied de page |
| `/boutique/huile-olive-premiere-pression` | la page la plus lourde de la vitrine, et il y en a quinze |
| `/panier` | la page publique la plus chargée en JavaScript |

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
| Rapidité | 92 |
| Accessibilité | 100 |
| Bonnes pratiques | 100 |
| Référencement | 96 |

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

## Pourquoi ce dossier n'est pas dans `.gitignore`

Parce qu'une note publiée sans son relevé est un chiffre, et qu'un chiffre sans
sa pièce ne vaut rien. `.gitignore` porte d'ailleurs la note qui le dit.
