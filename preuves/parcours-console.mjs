/**
 * LE PARCOURS D'ACHAT ENTIER, CONSOLE SOUS SURVEILLANCE — validation de D34.
 *
 * La campagne Playwright rejouée en ligne prouve que le site FONCTIONNE. Elle
 * ne dit rien de ce que le navigateur MURMURE pendant qu'il fonctionne — or
 * c'est exactement là que se lit une violation de politique de sécurité du
 * contenu : le navigateur bloque, écrit une ligne en console, et poursuit.
 *
 * Ce script rejoue le parcours canonique sur l'URL PUBLIQUE en écoutant trois
 * canaux à la fois :
 *   - `console`      — tous les messages, quel que soit leur niveau ;
 *   - `pageerror`    — les exceptions non rattrapées ;
 *   - `securitypolicyviolation` — l'événement que le navigateur émet DANS la
 *     page à chaque directive enfreinte. C'est le canal qui compte : il est
 *     émis même quand la console est filtrée.
 *
 * Usage : node preuves/parcours-console.mjs
 */
import { chromium } from '@playwright/test';

/* ═══════════════════════════════════════════════════════════════════════════
 *  DEUX AJOUTS DE C19, ET LES DEUX SONT DES CORRECTIONS DE MÉTHODE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (1) `--base <url>` — L'ADRESSE N'EST PLUS ÉCRITE EN DUR. Ce script est né en
 * C9 pour valider la CSP EN LIGNE, sur `main`. Depuis C11 le travail vit sur
 * une branche que `main` ne porte pas : le jouer contre l'adresse de production
 * reviendrait à mesurer la version d'hier, et le jouer contre une
 * PRÉVISUALISATION Vercel rendrait une violation qui n'appartient pas au site —
 * la plateforme injecte son widget `vercel.live` sur les previews, notre CSP le
 * bloque, et la console porte une ligne que la production n'aura jamais. Le
 * contrôle de recette se joue donc sur la PRODUCTION SERVIE EN LOCAL
 * (`node scripts/servir-production.mjs`), c'est-à-dire sur les octets exacts
 * que la fusion publiera.
 *
 * (2) LA VIDÉO DU HÉROS DOIT JOUER AVANT QU'ON QUITTE L'ACCUEIL. Elle est
 * arrivée en C19 et elle a ouvert une directive de plus (`media-src 'self'`,
 * amendement de D34). Un parcours qui traverse l'accueil sans attendre son
 * démarrage ne l'ouvre jamais : le chargement est déclenché par un observateur
 * PUIS par l'événement `load`, et la navigation suivante l'annulerait. On
 * lirait alors zéro violation sur une ressource qu'on n'a jamais demandée — le
 * pire des verts.
 */
function option(nom, defaut) {
  const rang = process.argv.indexOf(`--${nom}`);

  if (rang === -1) {
    return defaut;
  }

  const valeur = process.argv[rang + 1];

  if (valeur === undefined) {
    throw new Error(`--${nom} attend une valeur`);
  }

  return valeur;
}

const BASE = option('base', 'https://maison-vaubrune-demo.vercel.app').replace(/\/$/, '');
const TOTAL_ATTENDU = '69,80 €';

const journal = [];
const violations = [];
const erreurs = [];

/* CE QUI N'EST PAS UNE FAUTE DE CONSOLE MAIS N'A PAS EU LIEU (recette C19).
   Le parcours éprouve deux choses de nature différente : la propreté de la
   console, et le fait que les gestes du site aient réellement lieu. Les
   mélanger dans un seul compteur rendrait illisibles les deux. */
const reserves = [];

/** Pose les trois écoutes sur une page, avant toute navigation. */
async function surveiller(page) {
  page.on('console', (message) => {
    journal.push({ niveau: message.type(), texte: message.text(), url: page.url() });
  });

  page.on('pageerror', (erreur) => {
    erreurs.push({ texte: erreur.message, url: page.url() });
  });

  await page.exposeFunction('__signalerViolationCSP', (details) => {
    violations.push(details);
  });

  /* Ré-injecté à chaque document : une navigation client ne rejoue pas le
     script, mais une navigation complète, si. */
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evenement) => {
      window.__signalerViolationCSP({
        directive: evenement.violatedDirective,
        ressource: evenement.blockedURI,
        document: evenement.documentURI,
        extrait: evenement.sample,
      });
    });
  });
}

function etape(titre) {
  console.log(`  → ${titre}`);
}

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
});
const page = await contexte.newPage();
await surveiller(page);

console.log('');
console.log(`Parcours d'achat entier sur ${BASE}`);
console.log('-'.repeat(72));

try {
  etape('accueil, encart de fiction, pastille à zéro');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByRole('complementary', { name: 'Démonstration — épicerie fictive' }).waitFor();

  /* LA VIDÉO DU HÉROS, ET LA PREUVE QU'ELLE JOUE VRAIMENT (C19).
     Deux critères, parce que le premier seul se laisserait tromper : l'attribut
     `joue` est posé par la frontière cliente sur l'événement `playing`, et le
     temps courant qui AVANCE dit que des octets ont bien traversé `media-src`.
     C'est cette traversée que le parcours vient éprouver. */
  etape('vidéo du héros — attente de la lecture réelle');
  await page.locator('[data-video-heros="joue"]').waitFor({ timeout: 20_000 });
  const avancement = await page.locator('[data-video-heros]').evaluate(async (lecteur) => {
    const debut = lecteur.currentTime;
    await new Promise((r) => setTimeout(r, 900));

    return { debut, fin: lecteur.currentTime, source: lecteur.currentSrc };
  });
  console.log(
    `     temps courant ${avancement.debut.toFixed(2)} s → ${avancement.fin.toFixed(2)} s` +
      ` sur ${avancement.source.split('/').pop() ?? '?'}`,
  );

  if (!(avancement.fin > avancement.debut)) {
    throw new Error('la vidéo du héros porte l’attribut « joue » mais n’avance pas');
  }

  etape('rayon puis fiche de l’huile d’olive');
  await page.getByRole('link', { name: 'Boutique', exact: true }).first().click();
  await page.waitForURL((u) => u.pathname === '/boutique');

  /* LA SECONDE VIDÉO (retour client n° 14, C19-ter). Le rayon a gagné sa boucle
     « miel » sur le patron EXACT du héros de l'accueil — donc un second passage
     par `media-src 'self'`, et une seconde occasion de violer la CSP. Le
     parcours ne le voyait pas : écrit en C19, il ne connaissait qu'une vidéo.
     Une directive de sécurité éprouvée sur un seul de ses deux usages n'est
     éprouvée qu'à moitié.

     Mêmes DEUX critères qu'à l'accueil : l'attribut `joue` dit que la frontière
     cliente a reçu `playing`, le temps courant qui AVANCE dit que des octets ont
     réellement traversé.

     ═══════════════════════════════════════════════════════════════════════════
     POURQUOI CE CONTRÔLE NE JETTE PAS, LÀ OÙ CELUI DE L'ACCUEIL JETTE
     ═══════════════════════════════════════════════════════════════════════════

     Parce qu'il est ROUGE, et qu'il a raison de l'être. La recette du 11/08 l'a
     posé, il a expiré, et la cause est établie
     (`preuves/c19/video-rayon-navigation.mjs`) : la vidéo du rayon ne démarre
     QUE sur un chargement à froid. Le contrôleur vit dans la frontière cliente
     UNIQUE de la mise en page racine (D26) avec une liste de dépendances VIDE :
     il se monte une fois par document, jamais à une navigation cliente. On
     arrive ici en CLIQUANT, donc le lecteur ne reçoit aucun ordre — `readyState`
     vaut 0, la vidéo reste sur son affiche.

     Jeter ici tuerait les DIX étapes suivantes, et avec elles la seule chose que
     ce script existe pour prouver : zéro message, zéro exception, zéro violation
     de CSP sur le parcours ENTIER. Une assertion qui détruit la preuve qu'elle
     accompagne se trompe de rôle. Le constat est donc RELEVÉ, dit à voix haute,
     et rendu au verdict — qui sort en erreur avec lui. Le parcours va au bout,
     la console est jugée, et le défaut est nommé. */
  etape('vidéo du rayon — attente de la lecture réelle');
  const lecteurRayon = page.locator('[data-video-heros]');
  await lecteurRayon.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(6000);
  const avancementRayon = await lecteurRayon.evaluate(async (lecteur) => {
    const debut = lecteur.currentTime;
    await new Promise((r) => setTimeout(r, 900));

    return {
      debut,
      fin: lecteur.currentTime,
      marque: lecteur.dataset['videoHeros'] ?? '(aucune)',
      readyState: lecteur.readyState,
    };
  });

  if (avancementRayon.marque === 'joue' && avancementRayon.fin > avancementRayon.debut) {
    console.log(
      `     temps courant ${avancementRayon.debut.toFixed(2)} s → ${avancementRayon.fin.toFixed(2)} s`,
    );
  } else {
    reserves.push(
      'LA VIDÉO DU RAYON NE DÉMARRE PAS quand on arrive en cliquant : ' +
        `data-video-heros="${avancementRayon.marque}", readyState ${String(avancementRayon.readyState)}, ` +
        'temps courant immobile. Elle démarre sur un chargement à froid — ' +
        'preuve : preuves/c19/video-rayon-navigation.txt.',
    );
    console.log(
      `     RÉSERVE — marque « ${avancementRayon.marque} », readyState ` +
        `${String(avancementRayon.readyState)}, temps courant immobile`,
    );
  }

  await page.getByRole('link', { name: /^Huile d’olive de première pression/ }).click();
  await page.waitForURL((u) => u.pathname === '/boutique/huile-olive-premiere-pression');

  etape('deux huiles de 50 cl au panier');
  await page.getByLabel('Format', { exact: true }).selectOption('MV-HV-OLI-50CL');
  await page.getByLabel('Quantité').fill('2');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('dialog', { name: 'Ajouté au panier' }).waitFor();
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();

  etape('un fromage de brebis les rejoint');
  await page.getByRole('link', { name: 'Boutique', exact: true }).first().click();
  await page.waitForURL((u) => u.pathname === '/boutique');
  await page.getByRole('link', { name: /^Fromage fermier de brebis/ }).click();
  await page.waitForURL((u) => u.pathname === '/boutique/fromage-fermier-brebis');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('dialog', { name: 'Ajouté au panier' }).waitFor();
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();

  etape(`panier — vérification du total ${TOTAL_ATTENDU}`);
  await page.getByRole('link', { name: /^Panier/ }).click();
  await page.waitForURL((u) => u.pathname === '/panier');
  const recap = page.getByRole('region', { name: 'Récapitulatif' });
  await recap.getByText(TOTAL_ATTENDU, { exact: true }).waitFor();
  console.log(`     total lu à l'écran : ${TOTAL_ATTENDU} ✓`);

  etape('récapitulatif de commande et coordonnées');
  await page.getByRole('link', { name: 'Passer commande' }).click();
  await page.waitForURL((u) => u.pathname === '/commande');
  await page.getByLabel('Prénom et nom').fill('Client d’essai C9');
  await page.getByLabel('Adresse de livraison').fill('1, rue de l’Exemple');
  await page.getByLabel('Code postal').fill('69001');
  await page.getByLabel('Courriel').fill('client-essai@example.invalid');
  await page.getByRole('checkbox', { name: /conditions générales de vente/ }).check();
  await page.getByRole('button', { name: 'Commander avec obligation de paiement' }).click();

  etape('écran de paiement simulé (aucun champ de carte)');
  await page.waitForURL((u) => u.pathname === '/paiement/simulation');
  const champs = await page.locator('input').count();
  console.log(`     champs de saisie sur l'écran de paiement : ${String(champs)} (attendu 0)`);

  etape('« Payer » — référence et panier vidé');
  await page.getByRole('link', { name: 'Payer' }).click();
  await page.waitForURL((u) => u.pathname === '/commande/confirmation');
  const reference = new URL(page.url()).searchParams.get('reference') ?? '';
  console.log(`     référence rendue par le serveur : ${reference}`);
  await page.getByText('Votre panier a été vidé.').waitFor();

  etape('suivi — frise arrêtée à « Payée »');
  await page.getByRole('link', { name: 'Suivre cette commande' }).click();
  await page.waitForURL((u) => u.pathname === '/suivi');
  await page.getByRole('heading', { level: 2, name: `Commande ${reference}` }).waitFor();

  etape('espace marchand — « Marquer préparée »');
  await page.goto(`${BASE}/gestion/commandes`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: reference }).click();
  await page.waitForURL((u) => u.pathname === `/gestion/commandes/${reference}`);
  await page.getByRole('button', { name: 'Marquer préparée' }).click();
  await page.getByRole('region', { name: 'État' }).getByText('Préparée').first().waitFor();

  etape('retour au suivi — frise à deux états');
  await page.goto(`${BASE}/suivi?reference=${reference}`, { waitUntil: 'networkidle' });
  await page
    .locator('section[aria-labelledby="titre-resultat"] ol > li')
    .nth(1)
    .getByText('Préparée')
    .waitFor();

  console.log('');
  console.log('  Parcours complet : OK');
} finally {
  await page.waitForTimeout(1500);
  await navigateur.close();
}

/* -------------------------------------------------------------------------- */
/* Le verdict                                                                  */
/* -------------------------------------------------------------------------- */

console.log('-'.repeat(72));
console.log(`Messages de console relevés : ${String(journal.length)}`);
for (const ligne of journal) {
  console.log(`   [${ligne.niveau}] ${ligne.texte}`);
  console.log(`        sur ${ligne.url}`);
}

console.log(`Exceptions non rattrapées : ${String(erreurs.length)}`);
for (const ligne of erreurs) {
  console.log(`   ${ligne.texte}  (${ligne.url})`);
}

console.log(`Violations de politique de sécurité du contenu : ${String(violations.length)}`);
for (const violation of violations) {
  console.log(`   ${violation.directive} → ${violation.ressource}`);
  console.log(`        page ${violation.document}  extrait « ${violation.extrait} »`);
}

const propre = journal.length === 0 && erreurs.length === 0 && violations.length === 0;
console.log('-'.repeat(72));
console.log(
  propre
    ? 'CONSOLE PROPRE — aucun message, aucune exception, AUCUNE violation CSP. D34 validée.'
    : 'Des éléments ont été relevés ci-dessus.',
);

/* LES RÉSERVES DE PARCOURS — ce qui n'est ni un message de console ni une
   violation, mais qui n'a pas eu lieu comme il aurait dû. Elles sont dites
   SÉPARÉMENT du verdict de console, pour qu'aucune des deux lectures ne
   masque l'autre : une console parfaitement propre sur un site où quelque
   chose ne démarre pas reste une console parfaitement propre, et le dire
   autrement serait mentir dans les deux sens. */
console.log(`Réserves de parcours : ${String(reserves.length)}`);
for (const reserve of reserves) {
  console.log(`   ${reserve}`);
}

console.log('');
process.exitCode =
  violations.length === 0 && erreurs.length === 0 && reserves.length === 0 ? 0 : 1;
