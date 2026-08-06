# Dépôts miniatures de la garde des marques réelles

Ces dossiers sont les pièces à conviction de
`scripts/verifier-marques-reelles.mjs`. Chacun est un dépôt réduit à l'os,
porteur d'UN SEUL genre de défaut, que la garde doit signaler quand on la lance
avec `--base <ce dossier>`.

Ils contiennent délibérément de VRAIES marques et de VRAIES appellations
protégées — Bonne Maman, Panzani, Roquefort, IGP, Label Rouge. C'est le seul
endroit du dépôt où elles ont le droit d'être écrites, et c'est aussi la raison
pour laquelle `tests/` est hors du périmètre parcouru par défaut : une garde qui
se déclencherait sur son propre banc d'essai serait inutilisable.

| Dossier | Défaut attendu |
|---|---|
| `marque-dans-une-fiche/` | une marque réelle dans le texte d'une fiche produit |
| `appellation-dans-un-brouillon/` | une appellation protégée et deux signes officiels dans un brouillon |
| `marque-dans-un-nom-de-fichier/` | une marque réelle dans le NOM d'un fichier, pas dans son texte |

Le cas « ça passe » n'a pas de dossier : c'est le dépôt lui-même, lancé sans
`--base`. C'est le seul cas de figure qui vaille la peine d'être vérifié en
vrai plutôt que sur une imitation — la garde existe pour dire que CE dépôt-ci
n'emprunte le nom de personne.

## Le contrôle des exemptions ne s'applique pas ici

La garde tient une liste d'exemptions accordées à des CITATIONS précises du
dépôt réel — aujourd'hui une seule, « Fauchon » dans la décision du choix du
nom, où le mot est cité comme mesure de densité de marques déposées. Elle
échoue si une exemption ne sert plus, pour qu'une liste d'exceptions ne
s'allonge pas en silence.

Ce contrôle-là est neutralisé sur un dépôt miniature : les exemptions désignent
des fichiers qui n'y sont pas, et les réclamer ferait échouer chaque pièce à
conviction pour une raison qui n'est pas la sienne.

## Pourquoi ce dossier n'a pas besoin d'être exclu de `tsconfig.json`

Contrairement aux fixtures de la garde d'honnêteté, celles-ci ne contiennent
aucun fichier TypeScript : la garde des marques lit du texte, pas du code, et
un `.txt` ou un `.md` suffit à porter le défaut. L'exclusion existante de
`tests/fixtures` les couvre de toute façon.
