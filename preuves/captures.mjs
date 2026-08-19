/**
 * LES PIÈCES DE PREUVE — sept pages, quatre formats, sur le site EN LIGNE.
 *
 * Les quatre formats sont ceux du poste : bureau 1280×800, tablette 768×1024,
 * mobile 390×844 et petit mobile 360×740. Chaque format ouvre son PROPRE
 * contexte de navigation — donc son propre stockage local —, refait le panier
 * canonique par l'interface, passe une commande pour obtenir une référence
 * réelle, puis capture les sept pages en pleine hauteur.
 *
 * ---------------------------------------------------------------------------
 * AUCUNE COMMANDE N'EST PASSÉE — et c'est ce qui rend ce jeu comparable
 * ---------------------------------------------------------------------------
 *
 * La première version de ce script passait une vraie commande par l'interface
 * pour peupler `/suivi` et `/gestion/commandes`. Conséquence mesurée à la
 * revue de C11 : 8 des 28 captures DIVERGEAIENT d'une exécution à l'autre,
 * puisque la référence (`MVB-<date du jour>-<4 signes tirés au sort>`) et les
 * horodatages changent à chaque passage. Un jeu de référence dont un tiers des
 * pièces bouge tout seul ne peut comparer aucun avant à aucun après.
 *
 * Il n'y avait pourtant rien à injecter : le jeu d'essai `commandes-amorce.ts`
 * porte SIX commandes à dates FIGÉES (décision C6), et `MVB-20260803-3E77` est
 * « préparée » avec deux horodatages — exactement la frise à deux états que ce
 * script allait chercher en payant. On capture donc l'amorce, et les 28 pièces
 * deviennent reproductibles à l'octet près.
 *
 * Le panier, lui, est toujours REMPLI par l'interface : ses trois lignes sont
 * déterministes (produits et quantités écrits ici), et le remplir prouve au
 * passage que l'ajout au panier fonctionne sur le site capturé.
 *
 * ---------------------------------------------------------------------------
 * DEUX OPTIONS, ajoutees en C11 (preparation de la refonte visuelle)
 * ---------------------------------------------------------------------------
 *
 * --sortie <nom>  le sous-dossier de preuves/ ou ecrire (defaut : captures)
 * --base <url>    le site a capturer (defaut : la production en ligne)
 *
 * Elles servent la meme chose : pouvoir constituer un JEU DE REFERENCE avant
 * une refonte, puis le rejouer apres, et comparer. Sans dossier de sortie, la
 * seconde campagne ecrase la premiere et il n'y a plus rien a comparer.
 *
 * `--base http://localhost:3000` capture la construction de production LOCALE,
 * servie par `node scripts/servir-production.mjs`. C'est ce qu'il faut pour
 * comparer deux etats d'une meme branche : le site en ligne, lui, ne bouge
 * qu'a la poussee sur main.
 *
 * Usage : node preuves/captures.mjs [--sortie <nom>] [--base <url>]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { chromium } from '@playwright/test';

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
const SORTIE = option('sortie', 'captures');
const DOSSIER = fileURLToPath(new URL('.', import.meta.url));

/**
 * La commande du jeu d'essai qu'on capture : « préparée », deux horodatages
 * figés. Elle vient de `src/donnees/commandes-amorce.ts` et ne bouge jamais.
 */
const REFERENCE_AMORCE = 'MVB-20260803-3E77';

const FORMATS = [
  { nom: '1280x800', largeur: 1280, hauteur: 800, mobile: false },
  { nom: '768x1024', largeur: 768, hauteur: 1024, mobile: false },
  { nom: '390x844', largeur: 390, hauteur: 844, mobile: true },
  { nom: '360x740', largeur: 360, hauteur: 740, mobile: true },
];

mkdirSync(join(DOSSIER, SORTIE), { recursive: true });

/*
 * ---------------------------------------------------------------------------
 * L'IMMOBILITÉ AVANT LE DÉCLIC — ajouté en C19, et ce n'est pas un raffinement
 * ---------------------------------------------------------------------------
 *
 * Ce script date de C9 : il photographiait un site QUI NE BOUGEAIT PAS, et
 * quatre cents millisecondes suffisaient à laisser poser les polices. Depuis
 * C17 le site a un socle de mouvement, depuis C18 son titre entre à froid,
 * depuis C19 son héros porte une vidéo en boucle. Rejoué tel quel, il rendrait
 * DEUX pièces fausses, et la seconde est la plus grave :
 *
 * (1) UN GESTE SAISI EN PLEIN MILIEU. Le titre balaie sur 1 400 ms et les
 *     cartes fondent sur 620 : un déclic à 400 ms attrape un pavé à moitié
 *     découvert. C'est la leçon d'outillage de C17 (« toute mesure sur un site
 *     animé doit d'abord attendre l'immobilité, sans quoi elle mesure le hasard
 *     de l'ordonnanceur ») appliquée à l'image plutôt qu'au nombre.
 *
 * (2) DES PAGES VIDES SOUS LE PREMIER ÉCRAN. `fullPage: true` saisit au-delà de
 *     la fenêtre SANS faire défiler la page — c'est une capture par le
 *     protocole, pas un parcours. L'observateur de révélation ne se déclenche
 *     donc jamais pour ce qui est sous la ligne de flottaison, et les blocs y
 *     restent à opacité nulle. Une planche avant/après montrerait un « après »
 *     à moitié blanc, et la refonte aurait l'air d'avoir effacé le site.
 *
 * On fait donc le parcours à la main — descendre par paliers, remonter —, puis
 * on attend que chaque bloc animé soit à l'un de ses DEUX états réels (masqué
 * ou révélé), jamais entre les deux.
 *
 * LA VIDÉO EST UN CAS À PART, parce qu'une boucle n'est jamais immobile : on la
 * laisse démarrer (sans quoi on photographierait l'affiche, c'est-à-dire l'état
 * d'avant C19), puis on la FIGE sur une image choisie. C'est le seul moyen
 * d'obtenir une capture reproductible d'un élément qui, par nature, ne l'est
 * pas — et l'écart est écrit ici plutôt que subi au tirage suivant.
 */
const INSTANT_VIDEO = 2;

/** Les réserves rencontrées pendant la campagne, dites en fin de course. */
const notes = new Set();

async function immobiliser(page) {
  /* 1 — L'HYDRATATION. Sans elle `html.mouvement` n'est pas posée, donc rien
     n'est masqué et rien ne se révèle : on photographierait un état que le
     visiteur ne voit pas. Le marqueur date de C11 ; le site EN LIGNE (branche
     `main`) ne le porte pas encore, et son absence est DITE plutôt que
     silencieusement acceptée. */
  const hydrate = await page
    .waitForFunction(
      () => document.documentElement.dataset['hydratation'] === 'prete',
      undefined,
      { timeout: 15_000 },
    )
    .then(() => true)
    .catch(() => false);

  if (!hydrate) {
    notes.add('hydratation non signalée (site antérieur à C11 ?)');
  }

  /* 2 — LE PARCOURS, qui déclenche les révélations que `fullPage` ne
     déclencherait pas. */
  await page.evaluate(async () => {
    const pas = window.innerHeight * 0.8;

    for (let y = 0; y < document.body.scrollHeight; y += pas) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }

    window.scrollTo(0, 0);
  });

  /* 3 — L'IMMOBILITÉ. Sur une page sans bloc animé, la liste est vide et la
     condition est vraie tout de suite : le contrôle ne coûte rien là où il n'a
     rien à attendre.

     LE SÉLECTEUR DU HÉROS A CHANGÉ EN C19 (retour client) : la montée masquée
     porte son opacité ET sa translation sur le texte intérieur
     (`[data-signature="texte"]`) et non plus sur l'enveloppe. Interroger
     l'enveloppe rendrait « immobile » sur une page en plein fondu — la panne
     que ce contrôle existe pour éviter. On attend en plus `transform: none`,
     l'état d'arrivée écrit dans les images-clés : la course dure 1 400 ms
     quand le fondu en dure 140. */
  const immobile = await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('[data-revelation], [data-signature="texte"]')].every(
          (element) => {
            const style = getComputedStyle(element);
            const valeur = Number(style.opacity);

            return (
              (valeur === 0 || valeur === 1) &&
              (!element.matches('[data-signature="texte"]') || style.transform === 'none')
            );
          },
        ),
      undefined,
      { timeout: 15_000 },
    )
    .then(() => true)
    .catch(() => false);

  if (!immobile) {
    notes.add('IMMOBILITÉ NON ATTEINTE — un bloc est resté en plein fondu');
  }

  /* 4 — LA VIDÉO DU HÉROS, si la page en porte une. */
  if ((await page.locator('[data-video-heros]').count()) > 0) {
    const joue = await page
      .locator('[data-video-heros="joue"]')
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!joue) {
      notes.add('la vidéo du héros n’a pas démarré — l’affiche seule est capturée');
    } else {
      await page.locator('[data-video-heros]').evaluate(async (lecteur, instant) => {
        lecteur.pause();

        if (Number.isFinite(lecteur.duration) && lecteur.duration > instant) {
          await new Promise((resoudre) => {
            lecteur.addEventListener('seeked', resoudre, { once: true });
            lecteur.currentTime = instant;
          });
        }
      }, INSTANT_VIDEO);
    }
  }
}

async function capturer(page, nom, format) {
  /* Les polices et les illustrations doivent être posées avant le déclic. */
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await immobiliser(page);
  await page.waitForTimeout(400);

  const fichier = join(DOSSIER, SORTIE, `${nom}-${format.nom}.png`);
  await page.screenshot({ path: fichier, fullPage: true });
  console.log(`     ${nom}-${format.nom}.png`);
}

const navigateur = await chromium.launch();

console.log('');
console.log(`Pièces de preuve — ${BASE} → preuves/${SORTIE}/`);
console.log('-'.repeat(72));

for (const format of FORMATS) {
  console.log(`  Format ${format.nom}`);

  const contexte = await navigateur.newContext({
    viewport: { width: format.largeur, height: format.hauteur },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    ...(format.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await contexte.newPage();

  /* 1 — l'accueil, avec son encart de fiction. */
  await page.goto(`${BASE}/`);
  await page.getByRole('complementary', { name: 'Démonstration — épicerie fictive' }).waitFor();
  await capturer(page, 'accueil', format);

  /* 2 — le rayon. */
  await page.goto(`${BASE}/boutique`);
  await page.getByRole('heading', { level: 1, name: 'Boutique' }).waitFor();
  await capturer(page, 'boutique', format);

  /* 3 — la fiche du fromage, qui porte la mention de rétractation 4°. */
  await page.goto(`${BASE}/boutique/fromage-fermier-brebis`);
  await page.getByRole('heading', { level: 1, name: 'Fromage fermier de brebis' }).waitFor();
  await capturer(page, 'fiche-fromage', format);

  /* Le panier canonique, monté par l'interface : 2 huiles 50 cl + 1 fromage. */
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('dialog', { name: 'Ajouté au panier' }).waitFor();
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();

  await page.goto(`${BASE}/boutique/huile-olive-premiere-pression`);
  await page.getByLabel('Format', { exact: true }).selectOption('MV-HV-OLI-50CL');
  await page.getByLabel('Quantité').fill('2');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('dialog', { name: 'Ajouté au panier' }).waitFor();
  await page.getByRole('button', { name: 'Continuer mes achats' }).click();

  /* 4 — le panier plein, sous-total 56,90 € : le franco est à 69,00 €, donc
     l'encart « Encore 12,10 € pour que le port vous soit offert » s'affiche. */
  await page.goto(`${BASE}/panier`);
  const recap = page.getByRole('region', { name: 'Récapitulatif' });
  await recap.getByText('69,80 €', { exact: true }).waitFor();
  await page.getByText(/Encore .* pour que le port vous soit offert/).waitFor();
  await capturer(page, 'panier-plein', format);

  /* 5 — l'espace marchand, liste des commandes : les SIX du jeu d'essai. */
  await page.goto(`${BASE}/gestion/commandes`);
  await page.getByRole('link', { name: REFERENCE_AMORCE }).waitFor();
  await capturer(page, 'gestion-commandes', format);

  /* 6 — le suivi client, frise à deux états. `MVB-20260803-3E77` est
     « préparée » au jeu d'essai : elle porte deux horodatages figés, donc la
     frise montre qu'elle avance sans qu'on ait rien à passer. */
  await page.goto(`${BASE}/suivi?reference=${REFERENCE_AMORCE}`);
  await page
    .locator('section[aria-labelledby="titre-resultat"] ol > li')
    .nth(1)
    .getByText('Préparée')
    .waitFor();
  await capturer(page, 'suivi', format);

  /* 7 — le droit de rétractation. */
  await page.goto(`${BASE}/retractation`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await capturer(page, 'retractation', format);

  await contexte.close();
}

await navigateur.close();

/* -------------------------------------------------------------------------- */
/* Les empreintes — la seule pièce de ce dossier qui entre dans le dépôt       */
/* -------------------------------------------------------------------------- */

/*
 * `preuves/` est hors du dépôt depuis C9 : les captures pèsent, elles se
 * refont d'une commande, et elles ne se relisent pas dans un diff. Mais un jeu
 * de référence qui n'existe que sur un poste n'est vérifiable par personne
 * d'autre — et « les 28 captures sont identiques » devient alors une parole
 * qu'il faut croire.
 *
 * Deux kilooctets d'empreintes SHA-256, eux, se versionnent sans peine et
 * rendent la référence opposable : n'importe qui rejoue le script et compare
 * les sommes. C'est le même raisonnement que les relevés datés de `mesures/`.
 */
/* Le saut de ligne par son point de code : ce fichier a déjà été réécrit une
   fois par un outil qui a pris les échappements au premier degré. */
const SAUT = String.fromCodePoint(0x0a);

const dossier = join(DOSSIER, SORTIE);
const empreintes = readdirSync(dossier)
  .filter((nom) => nom.endsWith('.png'))
  .sort()
  .map((nom) => {
    const somme = createHash('sha256').update(readFileSync(join(dossier, nom))).digest('hex');

    return `${somme}  ${nom}`;
  });

const entete = [
  `# Empreintes SHA-256 des captures de preuves/${SORTIE}/`,
  `# Site capturé : ${BASE}`,
  `# ${String(empreintes.length)} fichiers`,
  '#',
  '# Rejouer : node preuves/captures.mjs --sortie <nom> --base <url>',
  '# Comparer : sha256sum -c EMPREINTES.txt (depuis le dossier des captures)',
  '',
].join(SAUT);

writeFileSync(
  join(dossier, 'EMPREINTES.txt'),
  `${entete}${empreintes.join(SAUT)}${SAUT}`,
  'utf8',
);

console.log('-'.repeat(72));
console.log(`${String(FORMATS.length * 7)} captures écrites dans preuves/${SORTIE}/`);
console.log(`${String(empreintes.length)} empreintes dans preuves/${SORTIE}/EMPREINTES.txt`);

if (notes.size > 0) {
  console.log('');
  console.log('RÉSERVES DE LA CAMPAGNE (une capture peut ne pas montrer l’état attendu) :');

  for (const note of notes) {
    console.log(`   - ${note}`);
  }
} else {
  console.log('Aucune réserve : hydratation, immobilité et vidéo obtenues sur les sept pages.');
}

console.log('');
