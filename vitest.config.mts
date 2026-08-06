import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Configuration des tests unitaires.
 *
 * Périmètre volontairement étroit. Ces tests portent sur les MODULES PURS du
 * projet — le moteur de frais de port, la conversion des codes postaux, et
 * depuis la tranche C4 la logique du panier. Aucun composant, aucun rendu,
 * aucun navigateur : l'environnement est `node`, il n'y a donc pas de DOM à
 * simuler, pas de jsdom à installer, et le lancement se compte en centaines de
 * millisecondes. Les parcours d'interface relèvent de Playwright depuis la
 * tranche C8 (`tests/e2e/`), qui teste le site réel plutôt qu'une imitation du
 * navigateur.
 *
 * Le seuil de couverture. Cent pour cent des lignes ET des branches, sur une
 * LISTE NOMMÉE de fichiers. Un seuil global à 100 % sur tout `src/` serait une
 * promesse intenable qu'on abaisserait au premier composant ; un seuil à 60 %
 * partout ne dirait rien de nulle part. Ici, le périmètre est celui du calcul :
 * les modules qui décident d'un prix affiché avant paiement. Sur ceux-là, une
 * branche non couverte est un cas de figure que personne n'a regardé — et en
 * matière de commerce, ces cas-là s'appellent une borne de tranche, un franco
 * au centime près, une zone qui refuse un produit frais ou un panier restauré
 * d'un stockage corrompu.
 *
 * Extension C4 — quatre fichiers rejoignent la liste (décision D16 tenue) :
 * `panier/reducteur.ts` (les invariants du panier), `panier/totaux.ts` (le
 * total affiché avant paiement), `panier/persistance.ts` (la relecture d'un
 * stockage auquel on ne doit rien croire) et `panier/catalogue-panier.ts` (la
 * projection qui décide QUEL prix et QUEL poids entrent dans le calcul — elle
 * appartient au périmètre pour cette raison, même si elle n'a pas été nommée
 * dans la commande de la tranche).
 *
 * Extension C5 — quatre fichiers rejoignent la liste, et la règle qui les y
 * fait entrer est inchangée : ils DÉCIDENT. `commandes/reference.ts` fabrique
 * l'identifiant sous lequel une commande existera ; `commandes/etats.ts` dit
 * quels changements d'état sont permis ; `commandes/depot-local.ts` relit un
 * stockage auquel on ne doit rien croire ; `paiement/validation.ts` est le seul
 * endroit du projet où un montant est ARBITRÉ CÔTÉ SERVEUR — c'est lui qui
 * refuse un total falsifié, et il a été extrait de la route pour cette seule
 * raison (une route Next ne se couvre pas, une fonction pure si).
 *
 * Extension C6 — CINQ fichiers rejoignent la liste, et la règle qui les y fait
 * entrer n'a pas changé d'un mot :
 *
 * - `catalogue-navigateur.ts` DÉCIDE de ce qu'une surcouche a le droit de
 *   modifier. Un champ qui passerait au travers du filtre — un poids
 *   d'expédition, un SKU — déplacerait un prix de port ou orphelinerait une
 *   ligne de panier. C'est le fichier le plus exposé de la tranche.
 * - `catalogue.ts` porte `appliquerSurcouche()`, la fusion elle-même, et les
 *   deux garanties qui tiennent tout : le slug et le SKU ne sont jamais
 *   réécrits. Elle attendait son implémentation depuis C2 ; elle l'a, elle
 *   entre donc au périmètre.
 * - `argent.ts` a cessé d'être un simple formateur : depuis que l'espace de
 *   gestion laisse SAISIR un prix, il convertit des euros en centimes. C'est
 *   le seul endroit du projet où un montant naît d'une chaîne de caractères,
 *   et l'en-tête du fichier explique en dix lignes pourquoi la multiplication
 *   flottante y est proscrite.
 * - `commandes/horodatage.ts` et `gestion/projection-marchand.ts` ne décident
 *   d'aucun montant, mais ils sont PURS, petits, et appelés par cinq écrans :
 *   les couvrir coûte trente lignes de test et retire deux fichiers de la zone
 *   grise. Le seuil n'a pas à être héroïque pour être tenu.
 *
 * Extension C8 — UN fichier rejoint la liste, et la règle d'admission n'a
 * toujours pas bougé : `donnees-structurees.ts` PUBLIE UN PRIX. Le balisage
 * JSON-LD des fiches déclare aux moteurs de recherche le montant du format le
 * moins cher et sa disponibilité ; un prix affiché dans un résultat de
 * recherche est un prix affiché, et il se compose de surcroît en écriture
 * anglaise (« 22.50 »), là où tout le reste du site écrit « 22,50 € ». Deux
 * écritures d'un même montant, c'est exactement le genre d'endroit où une
 * branche non couverte finit par publier un chiffre faux.
 *
 * Restent hors périmètre, et l'assument : `contexte-panier.tsx`,
 * `contexte-surcouche.tsx`, `fournisseurs.tsx`, les îlots et les feuilles de
 * `src/composants/` — du React, donc du rendu, donc Playwright — et, depuis C5,
 * `app/api/paiement/session/route.ts` (plomberie HTTP, sa décision est dans
 * `validation.ts`), `paiement/stripe.ts` et `paiement/adaptateur.ts` (leurs
 * comportements vérifiables le sont dans `tests/unitaires/paiement.spec.ts` ;
 * ce qui reste est un appel réseau qu'on ne simule pas). `donnees/` reste hors
 * périmètre en tant que données — le jeu d'essai est vérifié par un test dédié
 * qui recalcule ses six totaux, ce qui est plus fort qu'un pourcentage.
 *
 * L'alias `@/` est redéclaré ici parce que Vitest ne lit pas `tsconfig.json` :
 * il reprend la même correspondance que le compilateur et que Next.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unitaires/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/argent.ts',
        'src/lib/catalogue.ts',
        'src/lib/catalogue-navigateur.ts',
        'src/lib/donnees-structurees.ts',
        'src/lib/expedition.ts',
        'src/lib/zones.ts',
        'src/lib/gestion/projection-marchand.ts',
        'src/lib/panier/reducteur.ts',
        'src/lib/panier/totaux.ts',
        'src/lib/panier/persistance.ts',
        'src/lib/panier/catalogue-panier.ts',
        'src/lib/commandes/reference.ts',
        'src/lib/commandes/etats.ts',
        'src/lib/commandes/depot-local.ts',
        'src/lib/commandes/horodatage.ts',
        'src/lib/paiement/validation.ts',
      ],
      /* `skipFull` masquerait les fichiers à 100 % — c'est-à-dire, ici, les
         deux seuls qu'on regarde. Le rapport doit AFFICHER le plein, pas le
         sous-entendre : un tableau vide ne se relit pas, ne se colle pas dans
         un compte rendu et ne prouve rien. */
      skipFull: false,
      reporter: [['text', { skipFull: false }]],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
