import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Configuration des tests unitaires.
 *
 * Périmètre volontairement étroit. Ces tests portent sur les MODULES PURS du
 * projet — aujourd'hui le moteur de frais de port et la conversion des codes
 * postaux. Aucun composant, aucun rendu, aucun navigateur : l'environnement est
 * `node`, il n'y a donc pas de DOM à simuler, pas de jsdom à installer, et le
 * lancement se compte en centaines de millisecondes. Les parcours d'interface
 * relèveront de Playwright (tranche C8), qui teste le site réel plutôt qu'une
 * imitation du navigateur.
 *
 * Le seuil de couverture. Cent pour cent des lignes ET des branches, mais sur
 * DEUX FICHIERS seulement. Un seuil global à 100 % sur tout `src/` serait une
 * promesse intenable qu'on abaisserait au premier composant ; un seuil à 60 %
 * partout ne dirait rien de nulle part. Ici, le périmètre est celui du calcul :
 * les deux modules qui décident d'un prix affiché avant paiement. Sur ceux-là,
 * une branche non couverte est un cas de figure que personne n'a regardé — et
 * en matière de frais de port, ces cas-là s'appellent une borne de tranche, un
 * franco au centime près ou une zone qui refuse un produit frais.
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
      include: ['src/lib/expedition.ts', 'src/lib/zones.ts'],
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
