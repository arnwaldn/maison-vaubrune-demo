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
 *
 * ---------------------------------------------------------------------------
 * LES 74 TESTS JOUENT SUR UN SITE IMMOBILE (tranche C11)
 * ---------------------------------------------------------------------------
 *
 * `contextOptions: { reducedMotion: 'reduce' }` est posé sur les deux profils.
 * Chromium annonce alors au site le réglage d'accessibilité « mouvement
 * réduit », que la doctrine d'animation (décision D37) oblige à respecter à
 * trois niveaux — dont la NON-INSTANCIATION de l'observateur de révélation et
 * l'absence totale de défilement adouci.
 *
 * Le réglage passe par `contextOptions` et non par une option `use` de premier
 * niveau : dans la version installée (1.62), `reducedMotion` n'existe que sur
 * les options de CONTEXTE de navigation, et l'écrire à côté de `viewport` ne
 * compile pas. Le constat vaut d'être noté ici — il coûte une construction
 * échouée à qui l'ignore.
 *
 * Ce n'est pas une commodité de test, c'est la séparation de deux questions
 * qu'on ne doit jamais mélanger :
 *
 * - « le site fonctionne-t-il ? » — les campagnes de ce fichier, jouées sur un
 *   site immobile, où un élément est à sa place ou n'y est pas. (Leur NOMBRE
 *   n'est pas écrit ici : il a changé à chaque tranche depuis C8, et deux
 *   phrases de ce commentaire ont annoncé « 74 tests » jusqu'à la tranche C16,
 *   c'est-à-dire dix de moins que la vérité, à cinq lignes d'une ligne
 *   corrigée. Un commentaire qui ne cite pas de compte ne peut pas mentir ; le
 *   compte du jour se lit dans la sortie de `npm run test:parcours`.) Une
 *   campagne fonctionnelle qui
 *   attend la fin d'un fondu de 620 ms avant chaque assertion mesure la
 *   patience de Playwright, pas le produit ; et elle devient instable le jour
 *   où une durée change.
 * - « le mouvement se comporte-t-il bien ? » — c'est le troisième projet
 *   ci-dessous, et il a ses propres tests.
 *
 * Le troisième profil, `mouvement`, est INERTE pour l'instant : son
 * `testMatch` désigne `tests/e2e/mouvement.spec.ts`, qui n'existe pas encore
 * et que la tranche C17 écrira. `Playwright` ne considère pas un projet sans
 * fichier comme un échec ; c'est `--forbid-only` et non le vide qui arrête une
 * campagne. Le projet est déclaré dès maintenant pour que C17 n'ait qu'à
 * écrire le fichier — et pour que la question « où teste-t-on le mouvement ? »
 * ait déjà sa réponse dans le dépôt.
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

/**
 * LE FICHIER DU MOUVEMENT — écrit UNE fois, employé TROIS fois.
 *
 * Le projet `mouvement` le ramasse (`testMatch`) ; les deux profils
 * fonctionnels l'écartent (`testIgnore`). Les trois emplois doivent désigner
 * exactement le même fichier, d'où la constante.
 *
 * Le `testIgnore` n'est pas une précaution de style, c'est un piège désamorcé.
 * Sans lui, le jour où C17 crée `tests/e2e/mouvement.spec.ts`, les deux profils
 * fonctionnels le ramassent AUSSI — et ils tournent sous `reducedMotion:
 * 'reduce'`, c'est-à-dire dans l'état où, par doctrine (D37), il ne se passe
 * strictement rien. Une campagne de mouvement jouée sur un site immobile
 * échoue à tous les coups, et elle échoue au moment le plus coûteux : dans la
 * tranche qui vient d'écrire les tests, qui croira les avoir mal écrits.
 * Poser la garde maintenant coûte deux lignes ; la poser en C17 coûte une
 * demi-journée de doute.
 */
const FICHIER_DU_MOUVEMENT = /mouvement\.spec\.ts$/;

export default defineConfig({
  testDir: './tests/e2e',

  /* Les cinq fichiers de cette campagne sont indépendants : chacun ouvre son
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
      testIgnore: FICHIER_DU_MOUVEMENT,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
    {
      name: 'mobile-390',
      testIgnore: FICHIER_DU_MOUVEMENT,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
    {
      /*
       * LE PROFIL DU MOUVEMENT — déclaré en C11, peuplé en C17.
       *
       * Seul profil SANS `reducedMotion`, donc le seul où les révélations, le
       * défilement adouci et les transitions jouent réellement. Il n'exécute
       * pour l'instant aucun fichier : `tests/e2e/mouvement.spec.ts` n'existe
       * pas, et `testMatch` ne désigne que lui — les cinq campagnes
       * existantes ne peuvent donc pas être rejouées ici par mégarde, ce qui
       * doublerait le temps de campagne sans rien vérifier de plus.
       *
       * Bureau seulement : le mouvement se règle à la largeur où il se
       * dessine, et le profil mobile est déjà couvert par les campagnes
       * fonctionnelles.
       */
      name: 'mouvement',
      testMatch: FICHIER_DU_MOUVEMENT,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        /* Écrit, et non omis. Un réglage absent se lit « on n'y a pas pensé » ;
           celui-ci est le seul du dépôt qui laisse le site bouger, et il doit
           se voir. */
        contextOptions: { reducedMotion: 'no-preference' },
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
