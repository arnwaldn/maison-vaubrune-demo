/* LA GÉOMÉTRIE DU HÉROS, À CINQ LARGEURS DE FENÊTRE (tranche C18).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CET OUTIL EXISTE — un retour client, et une cause à trouver
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le 10/08, sur la prévisualisation de branche, Arnaud a vu le monument
 * « Maison Vaubrune » passer SOUS la carte du héros en grande fenêtre : le
 * « e » final était tronqué par le bord gauche de l'image. Ni les captures de
 * C15, ni celles de C17, ni les deux profils de campagne (1280 et 390) ne
 * pouvaient le voir — le défaut n'apparaît qu'AU-DESSUS de 1 472 px, c'est-à-
 * dire à la largeur exacte où le conteneur de page cesse de grandir.
 *
 * Ce script ne juge pas à l'œil : il relève, pour chaque largeur, la boîte du
 * monument, la boîte de la carte image, leur intersection horizontale, et le
 * rapport « largeur du mot le plus long / corps du monument ». Ce rapport est
 * la constante que le correctif emploie — mesurée, jamais estimée.
 *
 * Emploi :  node preuves/c18/geometrie-heros.mjs [--sortie <fichier.txt>]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 3994;
const LARGEURS = [1280, 1440, 1600, 1900, 2560];

const argument = (nom, defaut) => {
  const rang = process.argv.indexOf(nom);

  return rang === -1 ? defaut : process.argv[rang + 1];
};

const sortie = argument('--sortie', 'preuves/c18/geometrie-heros.txt');

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

dire('GÉOMÉTRIE DU HÉROS — monument contre carte image');
dire('Retour client du 10/08 : le monument passe sous la carte en grande fenêtre.');
dire('');
dire(
  'largeur  colonne   corps   mot le+long  ratio   débord   recouvre   pied   verdict',
);
dire('─'.repeat(86));

let pire = 0;
let pirePied = 0;

for (const largeur of LARGEURS) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await contexte.newPage();

  await page.goto(`http://localhost:${String(PORT)}/`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const releve = await page.evaluate(() => {
    const monument = document.querySelector('h1');
    const carte = document.querySelector('[data-signature="macro"]');

    if (monument === null || carte === null) {
      return null;
    }

    const boiteMonument = monument.getBoundingClientRect();
    const boiteCarte = carte.getBoundingClientRect();
    const style = getComputedStyle(monument);
    const corps = Number.parseFloat(style.fontSize);

    /* LA LARGEUR RÉELLE DU MOT LE PLUS LONG, mesurée par une plage de
       sélection : c'est la seule façon d'obtenir l'encombrement d'un mot avec
       sa police finale, son axe optique et son interlettrage négatif. Une
       estimation « 0,5 em par caractère » aurait donné un nombre plausible et
       faux — le correctif s'appuie dessus, il doit être mesuré. */
    const noeud = monument.firstChild;
    let motLePlusLarge = 0;
    let motLePlusLong = '';

    if (noeud !== null && noeud.nodeType === Node.TEXT_NODE) {
      const texte = noeud.textContent ?? '';
      let debut = 0;

      for (const mot of texte.split(' ')) {
        const plage = document.createRange();

        plage.setStart(noeud, debut);
        plage.setEnd(noeud, debut + mot.length);

        const largeurMot = plage.getBoundingClientRect().width;

        if (largeurMot > motLePlusLarge) {
          motLePlusLarge = largeurMot;
          motLePlusLong = mot;
        }

        debut += mot.length + 1;
      }
    }

    /* LE PIED DE PAGE PORTE LE MÊME JETON, sur toute la largeur de la page et
       en capitales : il fallait vérifier qu'il ne souffre pas de la même cause
       plutôt que le supposer indemne. Chaque mot y est un bloc à lui seul, donc
       un débord se lit à `scrollWidth` contre `clientWidth`. */
    const signature = document.querySelector('[data-chrome-pied] p');
    const debordPied =
      signature === null ? 0 : signature.scrollWidth - signature.clientWidth;

    return {
      debordPied,
      corpsPied:
        signature === null ? 0 : Number.parseFloat(getComputedStyle(signature).fontSize),
      colonne: monument.parentElement?.getBoundingClientRect().width ?? 0,
      corps,
      mot: motLePlusLong,
      largeurMot: motLePlusLarge,
      monumentGauche: boiteMonument.left,
      monumentDroite: boiteMonument.left + motLePlusLarge,
      carteGauche: boiteCarte.left,
      carteDroite: boiteCarte.right,
      carteHaut: boiteCarte.top,
      carteBas: boiteCarte.bottom,
      monumentHaut: boiteMonument.top,
      monumentBas: boiteMonument.bottom,
      /* Le débord du texte hors de sa propre boîte : `scrollWidth` d'un bloc
         inclut le contenu qui déborde à droite. */
      boite: monument.clientWidth,
      contenu: monument.scrollWidth,
    };
  });

  await contexte.close();

  if (releve === null) {
    dire(`${String(largeur).padEnd(9)}INTROUVABLE`);
    continue;
  }

  const debord = Math.max(0, releve.largeurMot - releve.boite);
  /* Le recouvrement ne compte que si les deux boîtes se croisent AUSSI en
     hauteur : deux blocs qui se chevauchent en abscisse mais pas en ordonnée
     ne se recouvrent pas. */
  const seCroiseVerticalement =
    releve.monumentHaut < releve.carteBas && releve.monumentBas > releve.carteHaut;
  const recouvre = seCroiseVerticalement
    ? Math.max(0, releve.monumentDroite - releve.carteGauche)
    : 0;
  const ratio = releve.largeurMot / releve.corps;

  pire = Math.max(pire, recouvre);
  pirePied = Math.max(pirePied, releve.debordPied);

  dire(
    `${String(largeur).padEnd(9)}${releve.colonne.toFixed(0).padStart(7)}` +
      `${releve.corps.toFixed(1).padStart(8)}` +
      `${`${releve.mot} ${releve.largeurMot.toFixed(0)}`.padStart(13)}` +
      `${ratio.toFixed(3).padStart(8)}` +
      `${debord.toFixed(0).padStart(9)}` +
      `${recouvre.toFixed(0).padStart(11)}` +
      `${releve.debordPied.toFixed(0).padStart(7)}   ` +
      `${recouvre > 0 ? 'RECOUVREMENT' : debord > 0 ? 'débord seul' : 'ok'}`,
  );
}

dire('');
dire(
  pire > 0
    ? `VERDICT : ÉCHEC — le monument recouvre la carte de ${pire.toFixed(0)} px au pire.`
    : 'VERDICT : le monument ne touche la carte à aucune des largeurs relevées.',
);
dire(
  pirePied > 0
    ? `PIED DE PAGE : ÉCHEC — la signature déborde de ${pirePied.toFixed(0)} px.`
    : 'PIED DE PAGE : la signature du même jeton ne déborde nulle part (pleine largeur).',
);

writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');

await navigateur.close();
serveur.kill();

process.exit(pire > 0 ? 1 : 0);
