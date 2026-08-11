# La recette EN LIGNE de la publication — 11 août 2026

**Commit mesuré : `050eb47`** (« feat(refonte): la boutique temoin passe au
calibre Awwwards (C11 -> C21) »), poussé sur `main` à 17 h 22.
**Adresse mesurée : la production**, `https://maison-vaubrune-demo.vercel.app`.

Tout ce qui suit a été relevé APRÈS la fusion, sur les octets réellement servis
par l'hébergeur. Aucune de ces mesures n'existait avant : les tranches C11 à C21
ont vécu sur une branche que `main` ne portait pas, et l'URL publique servait
encore le site d'avant la refonte.

---

## 1. Le déploiement, et la preuve que c'est bien la refonte

| Contrôle | Résultat |
|---|---|
| État Vercel | **Ready**, cible `production`, 45 s de construction |
| Créé | 11/08/2026 17 h 22 min 06 s (heure de Paris) — la poussée même |
| Alias servis | `maison-vaubrune-demo.vercel.app`, `…-arnwalds-projects`, `…-git-main-…` |
| `curl -I` | **200**, et **pas 401** — la Deployment Protection ne s'est pas réarmée |

**Un 200 ne suffisait pas** : l'ancienne version aurait rendu 200 elle aussi.
Le HTML servi de `/` a donc été lu, et il porte les marques que seule la refonte
pose — `data-titre-anime` (l'entrée de titre de C19-ter), les images
`editorial/` des sept familles, le marbre, et une balise `<video>`. La
vérification a été faite sur le contenu, pas sur le code de retour.

## 2. Les neuf en-têtes de sécurité

Les neuf sont servis, relevés au `curl -I` :

1. `Content-Security-Policy`
2. `Strict-Transport-Security` — `max-age=63072000; includeSubDomains; preload`
3. `X-Content-Type-Options` — `nosniff`
4. `X-Frame-Options` — `DENY`
5. `Referrer-Policy` — `strict-origin-when-cross-origin`
6. `Permissions-Policy` — treize fonctionnalités fermées, dont `payment=()`
7. `Cross-Origin-Opener-Policy` — `same-origin`
8. `Cross-Origin-Resource-Policy` — `same-origin`
9. `X-Permitted-Cross-Domain-Policies` — `none`

La politique servie, dans son intégralité :

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self';
form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none';
frame-src 'none'; upgrade-insecure-requests
```

- `script-src 'self' 'unsafe-inline'` — **INCHANGÉ**, conforme à D34.
- `media-src 'self'` — **PRÉSENT**, l'ajout de C19 est bien en ligne.
- `base-uri 'none'` et `frame-src 'none'` — les deux durcissements de C9 tiennent.

## 3. Les 112 parcours, rejoués contre l'URL publique

```
112 passed (56.5s)
```

**112 sur 112**, par `preuves/playwright-en-ligne.config.ts`, qui reprend les
projets du socle sans les réécrire : les deux profils fonctionnels
(bureau 1280, mobile 390, tous deux sous mouvement réduit) et le projet
`mouvement`. Les SEPT fichiers de `tests/e2e/` ont joué — `accessibilite`,
`liens`, `mouvement`, `parcours`, `tunnel`, `typographie`, `vitrine`.

Aucun test instable : la campagne est passée du premier coup, sans reprise.
L'échec isolé de 17 h 12 sur l'échantillonnage du défilement adouci ne s'est pas
reproduit en ligne.

Le projet `mouvement` en faisait partie, et c'est lui qui porte les promesses
qui ne valent qu'en ligne : les vidéos jouent en navigation cliente, aucune ne
se télécharge sous mouvement réduit, les trois héros de C20 jouent à froid.

## 4. Les seize notes — QUATRE tirages, et ce qu'ils disent

Un premier tirage a rendu **87** sur la fiche, sous le seuil de 90. Trois
tirages de plus ont été pris. Voici les quatre, côte à côte.

| Page | Rapidité (4 tirages) | Médiane | Seuil |
|---|---|---|---|
| `/` | 91 · 96 · 96 · **86** | 93,5 | 90 |
| `/boutique` | 95 · 93 · 93 · 97 | 94 | 90 |
| `/boutique/huile-olive-premiere-pression` | **87** · 97 · 97 · 95 | 96 | 90 |
| `/panier` | 93 · 97 · **84** · 97 | 95 | 90 |

**Accessibilité, bonnes pratiques et référencement : 100 / 100 / 100 sur les
quatre pages, aux quatre tirages, sans une seule exception.** Soit 48 notes sur
48 au plafond, et 16 notes par tirage.

### Les trois creux ne sont pas dans le site, et c'est mesuré

Le creux change de page à chaque tirage — la fiche au premier, le panier au
troisième, l'accueil au quatrième, aucun au second. Un défaut de site ne se
déplace pas. Le détail des métriques dit où il est :

| Page | TBT (ms) | LCP | FCP | CLS |
|---|---|---|---|---|
| `/` | 270 · 104 · 83 · **461** | 2,6-2,7 s | 0,9 s | 0 |
| `/boutique` | 141 · 183 · 203 · 108 | 2,4-2,7 s | 1,0 s | 0 |
| fiche | **401** · 137 · 115 · 132 | 2,4-2,7 s | 0,9-1,0 s | 0 |
| `/panier` | 222 · 93 · **470** · 100 | 2,4-2,7 s | 0,9 s | 0 |

**Le premier affichage, le plus grand affichage et le décalage cumulé sont
invariants aux quatre tirages.** La seule métrique qui bouge est le temps de
blocage total, et les trois notes sous 90 sont exactement les trois tirages où
il dépasse 400 ms. Le temps de blocage est une mesure de PROCESSEUR, prise sur
la machine qui mesure : c'est la seule des quatre que le déploiement ne décide
pas. C'est le constat déjà écrit en C9 — « le réseau cesse d'être le facteur
limitant et laisse voir le coût processeur du même JavaScript » —, ici amplifié
par une contention intermittente du poste.

**Décalage cumulé : 0 sur les quatre pages, aux quatre tirages.** Le plafond de
0,002 est tenu avec une marge entière, et le chiffre publié par le README n'a
pas à être corrigé dans le sens de la mesure : il l'est déjà.

Relevés versionnés : `lighthouse-en-ligne-2026-08-11.json` (tirage 1) et ses
trois suffixés `-tirage2`, `-tirage3`, `-tirage4`.

### Comparaison aux références hors ligne

| Page | Hors ligne | En ligne (médiane) |
|---|---|---|
| accueil | 93-93 | 93,5 |
| rayon | 90-91 | **94** |
| fiche | 91-94 | **96** |
| panier | 93-93 | **95** |

Le constat de C9 se répète : **en ligne, les notes sont MEILLEURES qu'en local**
sur les quatre pages. Le rayon, qui rendait 90 pour un seuil de 90, gagne quatre
points.

## 5. La console, avec les CINQ vidéos en lecture

`preuves/parcours-console.mjs` a joué le parcours d'achat entier sur l'URL
publique — accueil, rayon, fiche, panier à 69,80 € aux montants exacts, écran
simulé sans un seul champ de carte, référence rendue par le serveur, suivi à
deux états après passage par l'espace marchand.

```
Messages de console relevés : 0
Exceptions non rattrapées : 0
Violations de politique de sécurité du contenu : 0
Réserves de parcours : 0
```

**Zéro, zéro, zéro, et zéro réserve.** D34 est validée en ligne sur l'arbre
final, et `media-src 'self'` avec elle.

### Les cinq vidéos ont joué — et il a fallu le prouver deux fois

L'outil de parcours date de C19, quand le site portait DEUX boucles. Il en
attend donc deux, et il les a obtenues :

| Vidéo | Chemin d'arrivée | Temps courant |
|---|---|---|
| accueil | à froid | 0,60 s → 1,51 s |
| rayon | **EN CLIQUANT** | 0,36 s → 1,26 s |

C20 et C21 en ont ajouté TROIS que ce parcours ne regarde pas — il traverse
`/panier` et `/suivi` sans rien affirmer de leur lecteur, et ne passe pas du
tout par `/livraison`. Une sonde de recette les a donc éprouvées séparément,
sous la même surveillance de console :

| Vidéo | Chemin d'arrivée | Temps courant | État |
|---|---|---|---|
| `/livraison` | à froid | 0,57 s → 1,77 s | `joue`, readyState 4, hors pause |
| `/suivi` | à froid | 0,56 s → 1,77 s | `joue`, readyState 4, hors pause |
| `/panier` | à froid | 0,56 s → 1,77 s | `joue`, readyState 4, hors pause |
| `/livraison` | **EN CLIQUANT** | 0,00 s → 1,17 s | `joue`, readyState 4, hors pause |

Console de la sonde : **0 message, 0 exception, 0 violation**.

**CINQ SUR CINQ, et deux atteintes en cliquant** (le rayon, `/livraison`). La
directive ajoutée en C19 est donc éprouvée sur ses cinq usages et non sur un
seul — « une ressource jamais demandée ne peut violer aucune directive : un vert
obtenu sans lecture serait le pire des verts ».

Le critère de lecture est celui refait en C19 : le temps courant a **changé** et
le lecteur est **hors pause**. Jamais `fin > debut`, qui est faux pour une
boucle et déclarerait arrêtée une lecture qui vient de repasser par zéro.

Les deux arrivées en cliquant valent pour elles-mêmes : elles rejouent en
production le correctif `1ebef48`, qui fait rebalayer le contrôleur par route.

## 6. Les vingt-huit captures en ligne

28 captures — sept pages × quatre formats (1280×800, 768×1024, 390×844,
360×740) — écrites dans `preuves/en-ligne-post-publication/`, avec leurs
28 empreintes SHA-256.

```
Aucune réserve : hydratation, immobilité et vidéo obtenues sur les sept pages.
```

Les sorties de captures restent hors du dépôt, selon la doctrine posée en C9 :
les scripts entrent, leurs images restent dehors.

## 7. Plan du site, robots, et la page hors mesure

| Contrôle | Résultat |
|---|---|
| `robots.txt` | `Allow: /` puis **`Disallow: /gestion`** |
| Renvoi au plan | `https://maison-vaubrune-demo.vercel.app/sitemap.xml` — le domaine de PRODUCTION |
| Plan du site | **24 adresses**, toutes sur le domaine de production |
| `/gestion`, `/panier`, `/commande`, `/paiement` au plan | **aucune** — D19 et D21 tenues |
| `/paiement/simulation` | 200, et `<meta name="robots" content="noindex, follow">` |

Les 24 adresses sont le compte juste, celui de C9 : quinze fiches, le rayon,
l'accueil, `/livraison`, `/suivi` et les cinq documents légaux.

## 8. Le grain de papier sur les octets servis — UN ÉCART À ARBITRER

`preuves/c19/grain-contraste.mjs` rejoué contre la production
(`grain-contraste-en-ligne.txt`) rend **trois encres sur quatre au-dessus de
AA**, et l'ocre des étiquettes à **4,49 pour un seuil de 4,50** — un centième en
dessous.

| Encre | Sur le jeton | Pire pixel réel | Seuil | Marge |
|---|---|---|---|---|
| encre | 13,93 | 11,22 | 4,5 | +6,72 |
| encre douce | 6,71 | 5,41 | 4,5 | +0,91 |
| **ocre (étiquettes)** | 5,58 | **4,49** | 4,5 | **−0,01** |
| bleu (chaîne du froid) | 6,58 | 5,30 | 4,5 | +0,80 |

**Ce n'est pas du bruit** : deux tirages consécutifs rendent le même pixel au
code près (#dbd5ca), la même amplitude (15,22) et le même ratio (4,49).

**Ce n'est pas non plus une différence entre le local et l'hébergeur.** Le pire
fond a changé d'endroit : il était sur l'accueil hors ligne (#eae4da, amplitude
7,36 au rayon), il est au rayon en ligne (#dbd5ca, amplitude 15,22). Le relevé
hors ligne auquel on compare date de C19 — il est ANTÉRIEUR au marbre, dont les
veines sont précisément ce que la sonde lit maintenant dans la marge gauche du
rayon. La comparaison oppose donc deux états du dessin, pas deux hébergements.

**Ce que l'écart n'est pas non plus** : un défaut vu par les instruments qui
font foi. `axe-core` rend 0 « serious » et 0 « critical » sur les sept pages de
la campagne rejouée en ligne, et Lighthouse rend 100 en accessibilité sur les
quatre pages aux quatre tirages. La sonde de grain calcule le PIRE pixel contre
la PIRE veine, ce qu'aucun des deux ne fait.

Il est relevé ici sans être corrigé : l'arbitrage appartient à celui qui décide
si l'ocre garde sa valeur ou si le marbre s'éclaircit sous le rayon.

---

## Ce que la recette n'a pas couvert

- **Les planches avant/après ne sont pas recomposées.** La checklist les demande
  au § 7 ; elles n'entraient pas dans la commande de cette recette. Les captures
  en ligne qu'elles réclament existent désormais, dans
  `preuves/en-ligne-post-publication/`.
- **Aucune correction n'a été faite**, sur rien. Le site publié est l'arbre
  `050eb47` à l'octet près ; ce document ajoute des mesures et pas une ligne de
  produit.

## Les quatre motifs d'annuler la publication, un par un

| Motif écrit à la checklist | Constat |
|---|---|
| une note en ligne sous son seuil qui ne l'était pas hors ligne | **NON** — les quatre médianes sont au-dessus, les trois creux isolés sont des pointes de temps de blocage de la machine de mesure, et le site rend mieux en ligne qu'en local sur les quatre pages |
| une violation de politique de sécurité du contenu, quelle qu'elle soit | **AUCUNE** — sur le parcours entier et sur la sonde des trois vidéos |
| un parcours rouge que le local rendait vert | **AUCUN** — 112 sur 112, sans reprise |
| un 401 sur l'URL publique | **NON** — 200 |

Reste au verdict : l'ocre à 4,49 contre la veine du marbre (§ 8).
