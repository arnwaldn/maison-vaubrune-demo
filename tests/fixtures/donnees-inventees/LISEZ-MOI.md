# Dépôts miniatures de la garde d'honnêteté

Ces dossiers sont les pièces à conviction de
`scripts/verifier-aucune-donnee-inventee.mjs`. Chacun est un dépôt réduit à
l'os, porteur d'UN SEUL défaut, que la garde doit signaler quand on la lance
avec `--base <ce dossier>`.

Ils contiennent délibérément des identifiants de la bonne forme — un numéro à
neuf chiffres, un numéro de téléphone, un identifiant bancaire. Ces valeurs
sont fabriquées : elles ne désignent personne, et elles n'ont pas à être
valides, puisque la garde cherche une FORME et non une immatriculation
existante.

C'est pour eux que `tests/` est hors du périmètre parcouru par défaut. Une
garde qui se déclencherait sur son propre banc d'essai serait inutilisable, et
l'exclusion est écrite en tête du script plutôt que découverte un jour au
détour d'un échec incompréhensible.

| Dossier | Défaut attendu |
|---|---|
| `siren/` | un numéro à neuf chiffres dans `src/` |
| `telephone/` | un numéro de téléphone français dans `src/` |
| `iban/` | un identifiant bancaire dans `contenu/` |
| `page-sans-emplacement/` | une page gabarit vidée de ses `<AComplete>` |
| `jeu-essai-sans-marqueur/` | le jeu d'essai privé de ses marqueurs d'irréalité |

Le cas « ça passe » n'a pas de dossier : c'est le dépôt lui-même, lancé sans
`--base`. C'est le seul cas de figure qui vaille la peine d'être vérifié en
vrai plutôt que sur une imitation.

## Pourquoi ce dossier est exclu de `tsconfig.json`

`page-sans-emplacement/` contient de vrais fichiers `page.tsx` — il le faut,
puisque la garde cherche des `page.tsx`. Ce sont des pièces à conviction, pas
du code : elles n'importent rien, ne compilent pas, et n'ont pas à compiler.
`tests/fixtures` figure donc dans la clause `exclude` de `tsconfig.json`, sinon
`npm run typecheck` échouerait sur des fichiers écrits exprès pour être
incomplets.
