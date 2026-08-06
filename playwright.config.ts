import { defineConfig, devices } from '@playwright/test';

/**
 * LES PARCOURS DE BOUT EN BOUT — première apparition de Playwright (tranche C8).
 *
 * ---------------------------------------------------------------------------
 * Ce qui est mesuré ici, et pourquoi ça ne pouvait pas l'être ailleurs
 * ---------------------------------------------------------------------------
 *
 * Les 458 cas de Vitest portent sur les modules PURS : le moteur de frais de
 * port, le réducteur du panier, la machine à états, la validation de la route
 * de paiement. Ils prouvent que chaque pièce calcule juste. Ils ne prouvent
 * rien de l'ASSEMBLAGE — qu'un clic sur « Ajouter au panier » atteint bien le
 * réducteur, que la pastille de l'en-tête retombe à zéro après le paiement,
 * qu'un `<Link>` mène quelque part. C'est le rôle de cette campagne, et il ne
 * se joue que dans un vrai navigateur, sur le vrai livrable.
 *
 * ---------------------------------------------------------------------------
 * LE SITE MESURÉ EST CELUI DE PRODUCTION, jamais le serveur de développement
 * ---------------------------------------------------------------------------
 *
 * `webServer` lance `scripts/servir-production.mjs`, qui sert la construction
 * de `next build` — celle-là même que Lighthouse mesure et que Vercel
 * publierait. Le serveur de développement de Next rend les pages autrement
 * (pas de préengendrement, React en mode développement, avertissements
 * supplémentaires) : une campagne verte sur `next dev` ne dirait rien du site
 * livré. La construction est RÉUTILISÉE si elle existe, parce que
 * `npm run controle` vient de la faire à l'étape précédente ; le détail de
 * cette règle est en tête du script.
 *
 * ---------------------------------------------------------------------------
 * DEUX PROFILS, ceux du poste — et pas un de plus
 * ---------------------------------------------------------------------------
 *
 * Un bureau à 1280 px de large et un mobile à 390 px. Ce sont les deux
 * largeurs auxquelles ce projet a été dessiné et relu, et ce sont les deux
 * points de bascule de sa mise en page : la grille du panier et celle de la
 * commande passent d'une colonne à deux au point d'arrêt `lg` (1024 px), le
 * reste bascule à `sm` (640 px). Un troisième profil intermédiaire coûterait
 * la moitié du temps de campagne pour vérifier une mise en page qu'aucun des
 * deux autres ne contredit.
 *
 * Les deux tournent sur CHROMIUM. Un seul navigateur est installé, et c'est
 * assumé : la démonstration n'a ni polyfill, ni API récente, ni feuille de
 * style propriétaire — elle n'a aucune raison de diverger d'un moteur à
 * l'autre, et une campagne à trois navigateurs qui ne trouve jamais rien est
 * une campagne qu'on finit par ne plus lancer. Le même Chromium sert par
 * ailleurs de navigateur de mesure à Lighthouse
 * (`scripts/mesurer-notes.mjs`), ce qui rend les deux résultats comparables.
 */

const PORT = 3000;
const ADRESSE = `http://localhost:${String(PORT)}`;

/**
 * Sommes-nous en intégration continue ?
 *
 * Lu une fois, et jamais comparé à `undefined` au fil des options : le projet
 * compile avec `exactOptionalPropertyTypes`, qui distingue « champ absent » de
 * « champ valant `undefined` ». Un `workers: undefined` posé pour dire « laisse
 * le défaut » ne compile donc pas — c'est le champ qu'il faut omettre, d'où le
 * dépliage conditionnel plus bas.
 */
const EN_INTEGRATION_CONTINUE = process.env['CI'] !== undefined;

export default defineConfig({
  testDir: './tests/e2e',

  /* Les quatre fichiers de cette campagne sont indépendants : chacun ouvre son
     propre contexte, donc son propre stockage local. Rien ne les sérialise. */
  fullyParallel: true,

  /* Un `test.only` oublié fait passer une campagne pour verte alors qu'elle
     n'a rien joué. En intégration continue, c'est une erreur. */
  forbidOnly: EN_INTEGRATION_CONTINUE,

  /* Une seule reprise en intégration continue, aucune en local. Une reprise
     masque un test instable ; zéro reprise fait échouer une campagne sur un
     hoquet de conteneur. Une seule, et l'instabilité se voit dans le rapport
     (« flaky ») au lieu d'être invisible. */
  retries: EN_INTEGRATION_CONTINUE ? 1 : 0,

  /* Deux exécutants en intégration continue : les runners publics ont deux
     cœurs, et lancer davantage de navigateurs que de cœurs allonge la
     campagne au lieu de la raccourcir. En local, le champ est ABSENT — pas
     posé à `undefined` — pour que Playwright applique son propre défaut. */
  ...(EN_INTEGRATION_CONTINUE ? { workers: 2 } : {}),

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: ADRESSE,
    /* Une trace n'est conservée qu'au second essai d'un test qui a échoué :
       assez pour comprendre un échec d'intégration continue sans reproduire,
       pas assez pour peser sur chaque campagne verte. */
    trace: 'on-first-retry',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },

  projects: [
    {
      name: 'bureau-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],

  webServer: {
    command: `node scripts/servir-production.mjs --port ${String(PORT)}`,
    url: ADRESSE,
    /*
     * JAMAIS DE RÉUTILISATION, ET C'EST UN CONSTAT DE PANNE.
     *
     * Le réflexe est de poser `reuseExistingServer: !CI` : en local, on relance
     * une campagne vingt fois de suite et redémarrer le serveur à chaque fois
     * est pénible. Le 2026-08-06, pendant l'écriture de cette tranche, ce
     * réglage a fait exactement ce qu'il fallait redouter — un `next start`
     * resté debout d'une campagne précédente a servi l'ANCIENNE construction
     * pendant qu'on relisait le résultat d'un correctif d'accessibilité déjà
     * appliqué, compilé et présent dans `.next/`. La campagne a rendu un échec
     * sur un défaut corrigé ; elle aurait tout aussi bien pu rendre un succès
     * sur un défaut présent.
     *
     * Un port occupé fait donc désormais ÉCHOUER le démarrage avec un message
     * explicite, au lieu d'être silencieusement adopté. Une garde qui mesure
     * peut-être le mauvais livrable ne mesure rien.
     */
    reuseExistingServer: false,
    /* La construction de secours (cas où `.next/` est absent) tient largement
       dans ces cinq minutes ; le service seul démarre en quelques secondes. */
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
