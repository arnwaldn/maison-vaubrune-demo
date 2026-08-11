/* L'ÉTAT MASQUÉ DES RÉVÉLATIONS, LU AU STYLE CALCULÉ, ZONE PAR ZONE (C18).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'HÉRITÉ I2 DE C17, ET CE QU'IL FAUT MESURER POUR LE TRANCHER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le round de revue de C17 a signalé que les règles de `[data-revelation]`
 * vivent dans `@layer base`. L'interdit n° 21 de D37 dit la conséquence : dans
 * le modèle des couches CSS, c'est la COUCHE qui décide avant la spécificité,
 * donc n'importe quelle règle d'une couche supérieure — un utilitaire Tailwind,
 * mais aussi une règle de `@layer components` — bat l'état masqué sur les
 * propriétés qu'elle porte, en silence.
 *
 * La revue posait la question au futur (« un utilitaire posé un jour »). Ce
 * script la pose au présent, sur les TROIS zones révélées, et il lit ce que le
 * navigateur calcule plutôt que ce que la feuille déclare.
 *
 * CE QU'ON REGARDE : `transition-property`, `-duration` et `-delay` de l'élément
 * masqué. Un bloc dont la liste de transitions ne contient ni `opacity` ni
 * `transform` ne se révèle pas — il APPARAÎT, d'un coup, et sa cascade n'existe
 * pas. À l'œil, sur une page qu'on fait défiler, la différence entre « ça fond »
 * et « ça surgit » ne se remarque que si on la cherche ; dans
 * `getComputedStyle`, elle est un fait.
 *
 * Emploi :  node preuves/c18/couche-revelation.mjs [--sortie <fichier.txt>]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 3996;

/** Une zone = une page, un sélecteur de bloc révélé, et ce qu'il est. */
const ZONES = [
  ['/', 'div[data-revelation]', 'accueil — encart de fiction'],
  ['/', 'li[data-revelation]', 'accueil — ligne de famille (cascade)'],
  ['/boutique', '.carte-produit[data-revelation]', 'rayon — vignette (cascade)'],
  [
    '/boutique/huile-olive-premiere-pression',
    'section[data-revelation]',
    'fiche — bloc de prose',
  ],
];

/**
 * LE TEMPS D'IMMOBILISATION, ET IL A ÉTÉ PAYÉ À L'ÉCRITURE.
 *
 * La première rédaction lisait le style dès que `html.mouvement` était posée, et
 * elle a rendu « opacité 1 » sur trois zones sur quatre — un résultat que la
 * lecture de la feuille rendait absurde. Un diagnostic a montré des opacités de
 * 0,0016, 0,0066, 0,019, 0,046… : les blocs étaient en train de se MASQUER.
 * Poser la classe fait passer un bloc de l'état par défaut (visible) à l'état
 * masqué, et cette bascule est elle-même une transition de 620 ms, retardée
 * jusqu'à 420 ms par la cascade.
 *
 * C'est mot pour mot le piège que C17 a consigné pour ses successeurs — « toute
 * mesure sur un site animé doit d'abord attendre l'immobilité, sans quoi elle
 * mesure le hasard de l'ordonnanceur ». Il aura fallu le retomber dedans pour
 * l'écrire ici. 620 + 420 + une marge : une seconde et demie.
 */
const IMMOBILISATION = 1500;

const argument = (nom, defaut) => {
  const rang = process.argv.indexOf(nom);

  return rang === -1 ? defaut : process.argv[rang + 1];
};

const sortie = argument('--sortie', 'preuves/c18/couche-revelation.txt');

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((r) => setTimeout(r, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

const lignes = [];
const dire = (texte) => {
  lignes.push(texte);
  process.stdout.write(`${texte}\n`);
};

dire("L'ÉTAT MASQUÉ DES RÉVÉLATIONS — style calculé, sous html.mouvement");
dire('Un bloc SOUS LA FLOTTAISON de chaque zone : celui que le contrôleur n’a');
dire('pas encore révélé, donc celui qui porte l’état masqué.');
dire('');

let fautes = 0;

for (const [chemin, selecteur, intitule] of ZONES) {
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const page = await contexte.newPage();

  await page.goto(`http://localhost:${String(PORT)}${chemin}`, { waitUntil: 'load' });
  await page.waitForFunction(() =>
    document.documentElement.classList.contains('mouvement'),
  );
  await page.waitForTimeout(IMMOBILISATION);

  /* LE BLOC EST RÉVÉLÉ POUR DE VRAI avant qu'on lise sa liste de transitions :
     depuis C18 la transition vit sur l'état RÉVÉLÉ, l'état masqué n'en portant
     aucune (le masquage est une préparation interne, pas un geste). On relève
     donc l'état masqué, puis on descend, puis on relit. */
  const releve = await page.evaluate((cible) => {
    /* LE DERNIER, ET C'EST TOUT L'INTÉRÊT : le contrôleur a déjà révélé ce qui
       était dans la fenêtre au chargement. Le dernier de la liste est sous la
       flottaison, donc encore masqué — c'est lui qui porte l'état qu'on veut
       lire. */
    const blocs = [...document.querySelectorAll(cible)].filter(
      (noeud) => !noeud.hasAttribute('data-revele'),
    );
    const bloc = blocs.at(-1);

    if (bloc === undefined) {
      return null;
    }

    const style = getComputedStyle(bloc);

    return {
      opacite: style.opacity,
      transformation: style.transform,
      rang: bloc.getAttribute('data-revelation-retard') ?? '—',
    };
  }, selecteur);

  /* LA DESCENTE. C'est le contrôleur qui pose `data-revele`, jamais ce script :
     poser l'attribut soi-même mesurerait une feuille de style sur un site
     imaginaire. */
  /* PAS À PAS, ET C'EST LE DÉFILEMENT ADOUCI QUI L'EXIGE. Un `scrollTo` unique
     vers le bas de la page est repris par Lenis, qui pilote le défilement des
     trois routes concernées et ramène la fenêtre vers sa propre cible : le
     premier jet de ce script relevait « opacité 0, jamais révélé » sur les
     quatre zones, parce que la page n'avait tout simplement pas bougé. Une
     descente par paliers, comme celle du diagnostic de décalage cumulé de C17,
     laisse la bibliothèque suivre. */
  await page.evaluate(async () => {
    const pas = window.innerHeight * 0.75;

    for (let y = 0; y < document.body.scrollHeight; y += pas) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 400));
    }
  });
  await page.waitForTimeout(IMMOBILISATION);

  const apresRevelation = await page.evaluate((cible) => {
    const bloc = [...document.querySelectorAll(cible)].at(-1);

    if (bloc === undefined) {
      return null;
    }

    const style = getComputedStyle(bloc);

    return {
      revele: bloc.hasAttribute('data-revele'),
      opacite: style.opacity,
      proprietes: style.transitionProperty,
      duree: style.transitionDuration,
      retard: style.transitionDelay,
    };
  }, selecteur);

  await contexte.close();

  if (releve === null) {
    dire(`${intitule}\n   AUCUN BLOC MASQUÉ TROUVÉ (${selecteur})\n`);
    fautes += 1;
    continue;
  }

  const proprietes = apresRevelation?.proprietes ?? '';
  const transiteOpacite = proprietes.includes('opacity');
  const transiteTransform = proprietes.includes('transform') || proprietes.includes('all');
  const conforme =
    releve.opacite === '0' &&
    releve.transformation !== 'none' &&
    apresRevelation?.revele === true &&
    apresRevelation.opacite === '1' &&
    transiteOpacite &&
    transiteTransform;

  if (!conforme) {
    fautes += 1;
  }

  dire(intitule);
  dire(`   MASQUÉ    opacité             ${releve.opacite}`);
  dire(`             transformation      ${releve.transformation}`);
  dire(`             (rang annoncé : ${releve.rang})`);
  dire(`   RÉVÉLÉ    opacité             ${apresRevelation?.opacite ?? '—'}`);
  dire(`             transition-property ${proprietes}`);
  dire(`             transition-duration ${apresRevelation?.duree ?? '—'}`);
  dire(`             transition-delay    ${apresRevelation?.retard ?? '—'}`);
  dire(
    `   → ${
      conforme
        ? 'CONFORME : masqué d’un coup, révélé en fondu, D37 respecté.'
        : 'ÉCHEC : le bloc ne se révèle pas comme il devrait — il surgira.'
    }`,
  );
  dire('');
}

dire(
  fautes === 0
    ? 'VERDICT : les quatre blocs se révèlent, aucun ne surgit.'
    : `VERDICT : ÉCHEC — ${String(fautes)} bloc(s) sur ${String(ZONES.length)}.`,
);

writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');

await navigateur.close();
serveur.kill();

process.exit(fautes === 0 ? 0 : 1);
