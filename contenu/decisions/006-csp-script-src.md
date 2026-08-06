# Décision 006 (D34) — `script-src 'self' 'unsafe-inline'`, et ce qui le compense

- **Date** : 2026-08-06
- **Tranche** : C9 (mise en ligne)
- **Statut** : gravé (appliqué dans `vercel.json`, vérifié en ligne sur le
  déploiement de production)
- **Objet** : l'alerte laissée ouverte par la tranche C1 dans le README,
  § « En-têtes de sécurité ». La politique de sécurité du contenu héritée du
  site portfolio portait `script-src 'self'`, qui interdit tout script en ligne.

## Le constat, mesuré

L'App Router de Next dépose l'état de la page dans des balises `<script>` sans
attribut `src`. Comptage sur la construction de production du 2026-08-06,
41 pages prérendues :

| Grandeur | Valeur |
|---|---|
| Scripts en ligne exécutables, page la plus légère (`/commande/annulee`) | 10 |
| Page d'accueil | 15 |
| Page la plus lourde (`/gestion/modeles-de-courriels`) | 41 |
| Occurrences sur l'ensemble du site | 740 |
| Empreintes **distinctes** | 445 |
| Empreintes partagées par plus d'une page | 49 |

Sous `script-src 'self'`, aucun de ces scripts ne s'exécute : le site s'affiche
et reste mort. Rien n'était cassé tant qu'on ne déployait pas ; cette tranche
déploie.

## Le choix

**`script-src 'self' 'unsafe-inline'`.**

C'est le seul des quatre chemins qui laisse le produit intact. Les trois autres
ont été écartés pour des raisons qu'il faut écrire honnêtement, parce qu'aucune
n'est « ce n'était pas possible ».

### Voie écartée 1 — les jetons à usage unique (`'nonce-…'`)

C'est la voie correcte sur le papier : un intercepteur tire un jeton par
réponse, la politique n'autorise que les scripts qui le portent, et
`'unsafe-inline'` disparaît. Elle a un prix, et ce prix est le produit lui-même.

Un jeton doit être **différent à chaque réponse**, sans quoi il ne vaut rien.
Une page mise en cache et servie deux fois avec le même jeton est une page dont
le jeton est devenu une constante publique. Poser un jeton oblige donc à rendre
**toutes les pages dynamiques** : les 41 pages prérendues cessent d'être des
fichiers servis depuis le réseau de diffusion et redeviennent des calculs à
chaque visite.

Or ce projet vend quatre notes mesurées, et ces notes sont celles du statique :
98 / 100 / 100 / 100 au profil mobile bridé. Le premier affichage de contenu
tenu à 1,5 s l'est parce que le HTML est déjà écrit quand la requête arrive.
Échanger la mesure qui est l'objet de la démonstration contre un en-tête plus
strict serait vendre la preuve pour l'emballage.

### Voie écartée 2 — les empreintes `'sha256-…'`

Elle n'oblige à rien rendre dynamique : on calcule l'empreinte de chaque script
en ligne et on l'énumère dans l'en-tête. Elle échoue sur l'arithmétique.

Les 445 empreintes distinctes réunies dans un seul en-tête font
**24 047 octets, soit 23,5 Ko**, à envoyer **sur chaque réponse des 46 routes**.
Un en-tête de 23,5 Ko sur un site dont le budget JavaScript public est de 120 Ko
n'est pas une politique de sécurité, c'est une régression de performance
délibérée — et plusieurs intermédiaires refusent les en-têtes de cette taille.

L'en-tête par page, lui, coûterait moins cher mais ne se calcule pas : `vercel.json`
pose des en-têtes **statiques**, et **396 des 445 empreintes n'apparaissent que
sur une seule page** — les charges utiles RSC diffèrent d'une page à l'autre,
puisqu'elles contiennent le contenu de la page. Il faudrait donc engendrer
46 blocs d'en-têtes à la construction, et les régénérer à chaque modification
d'un texte de fiche. Une garde de plus, qui casse au premier oubli, pour un
gain qui reste nul tant que `'unsafe-inline'` protège encore le style.

### Voie écartée 3 — l'export entièrement statique

Elle **ne retire pas les scripts en ligne** : `output: 'export'` change la façon
dont les fichiers sont écrits, pas la façon dont React s'hydrate. Les 15 scripts
en ligne de l'accueil y sont toujours. Le comptage ci-dessus a été fait sur des
pages déjà prérendues.

Et elle coûterait la route de paiement : `/api/paiement/session` est la seule
route serveur du projet, c'est elle qui recalcule le total et refuse les 422.
Un export statique la supprime, donc supprime la preuve centrale de la
démonstration (« le serveur ne fait jamais confiance au navigateur »).

## Ce que ce choix concède, exactement

`'unsafe-inline'` sur `script-src` signifie qu'un `<script>` injecté dans le
HTML rendu **s'exécuterait**. La question utile n'est donc pas « l'en-tête
est-il strict », mais **« par où un tiers pourrait-il faire écrire quelque
chose dans le HTML rendu ? »**.

**Par nulle part.** Aucun contenu saisi par un tiers n'est jamais rendu par ce
site :

- **aucun commentaire, aucun avis client** — hors périmètre, décision gravée, et
  le balisage JSON-LD refuse même le `aggregateRating` (D33) ;
- **aucune recherche plein texte**, donc aucun terme de requête réaffiché ;
- **aucun compte, aucun profil**, donc aucun nom d'utilisateur ;
- **aucun script tiers** : ni régie, ni mesure d'audience, ni bouton social, ni
  police distante — les deux polices sont servies depuis le domaine
  (`next/font/local`) ;
- **aucune donnée d'un autre visiteur** : ce que le visiteur saisit vit dans
  **son** navigateur (`localStorage`, décision D2) et ne voyage jamais vers un
  autre. Il ne peut, au pire, s'injecter que chez lui — ce qu'il obtiendrait de
  toute façon avec la console de son navigateur ;
- **le seul `dangerouslySetInnerHTML` du projet** est le balisage JSON-LD
  (`src/composants/mise-en-page/DonneesStructurees.tsx`), engendré depuis le
  catalogue versionné, avec le chevron ouvrant échappé en `<` pour
  qu'aucune chaîne ne puisse refermer la balise.

**La surface d'injection est nulle en amont de la politique.** `'unsafe-inline'`
n'ouvre donc une porte que sur une pièce où il n'y a rien.

## Les compensations, qui sont réelles

Les huit autres directives et les huit autres en-têtes ne bougent pas d'un
caractère :

| Directive / en-tête | Valeur | Ce qu'elle interdit |
|---|---|---|
| `default-src` | `'self'` | tout chargement hors du domaine |
| `connect-src` | `'self'` | **l'exfiltration** : un script injecté ne peut appeler aucun serveur tiers |
| `object-src` | `'none'` | greffons, Flash, PDF embarqués |
| `frame-src` | `'none'` | tout cadre embarqué |
| `frame-ancestors` | `'none'` | le détournement de clic par mise en cadre |
| `base-uri` | `'none'` | la réécriture des adresses relatives par une balise `<base>` injectée |
| `form-action` | `'self'` | l'envoi d'un formulaire vers un serveur tiers |
| `img-src` | `'self' data:` | les balises-espions distantes |
| `upgrade-insecure-requests` | — | toute requête en clair |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | la rétrogradation en HTTP |
| `X-Content-Type-Options` | `nosniff` | la ré-interprétation d'un type de contenu |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | la fuite d'adresse complète |
| `X-Frame-Options` | `DENY` | idem `frame-ancestors`, pour les vieux navigateurs |
| `Permissions-Policy` | `payment=()` et douze autres | l'accès aux API du navigateur (décision D8) |
| `Cross-Origin-Opener-Policy` | `same-origin` | le partage de contexte de navigation |
| `Cross-Origin-Resource-Policy` | `same-origin` | l'inclusion des ressources par un autre site |
| `X-Permitted-Cross-Domain-Policies` | `none` | les politiques inter-domaines héritées |

`connect-src 'self'` mérite d'être lu deux fois : c'est lui qui vide de son
intérêt le scénario que `'unsafe-inline'` rend théoriquement possible. Un script
qui s'exécute mais ne peut envoyer son butin nulle part n'a pas de butin.

Deux directives ont été **renforcées** au passage, puisqu'on ouvrait le
fichier : `frame-src 'none'` a été ajouté (aucun cadre dans le projet, vérifié),
et `base-uri` reste à `'none'` — plus strict que le `'self'` qui aurait suffi.

> **L'en-tête cesse d'être une preuve de plus, les huit autres le restent.**

## Comment revenir en arrière, le jour où c'est utile

Le jour où ce socle sert de base à une boutique livrée qui, elle, rendra du
contenu saisi par des tiers — avis, questions, recherche —, la voie 1 redevient
la bonne, et son prix devient acceptable parce que ces pages-là seront
dynamiques de toute façon. La marche à suivre tient en trois gestes :
`middleware.ts` qui tire un jeton et le pose sur la requête, la lecture de ce
jeton dans la mise en page racine, et `script-src 'self' 'nonce-…'
'strict-dynamic'` — l'en-tête sortant alors de `vercel.json` pour être posé par
l'intercepteur. Les mesures seront à refaire, et elles baisseront.

## Vérification

La validation de cette décision n'est pas une relecture, c'est une **console de
navigateur vide** sur le déploiement de production : le parcours d'achat entier
(fiche → panier → commande → simulation → confirmation → suivi → gestion) a été
rejoué sur l'URL publique, sans **aucune** violation de politique de sécurité du
contenu. Le relevé est dans le compte rendu de la tranche C9 et les en-têtes
servis sont cités dans le README.
