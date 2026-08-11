/* LE BANDEAU DES SEPT FAMILLES — CE QU'IL FAIT ET CE QU'IL COÛTE (C18).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ CET OUTIL NE TROUVE PLUS SON SUJET DEPUIS C19 : le bandeau a été RETIRÉ  │
 * │ de l'accueil sur décision du client (« ne sert pas grand-chose », la     │
 * │ rangée des familles assurant déjà la navigation). Le fichier reste,      │
 * │ inchangé, parce qu'il est la pièce d'une mesure DATÉE — le relevé        │
 * │ `bandeau-familles.txt` et le coût de l'italique s'y rapportent, et       │
 * │ réécrire une preuve après coup reviendrait à réécrire le journal.        │
 * │ Il ne se rejoue pas en l'état ; il se lit.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  TROIS QUESTIONS, ET AUCUNE NE SE LIT DANS UN FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. LE GESTE A-T-IL LIEU ? La piste doit se déplacer QUAND ON DÉFILE, et se
 *    tenir tranquille sinon. Un bandeau qui bougerait tout seul serait
 *    l'interdit n° 5 de D37 ; un bandeau qui ne bougerait jamais serait une
 *    règle écrite pour rien — les deux se ressemblent beaucoup dans une feuille
 *    de style et pas du tout dans `getComputedStyle`.
 *
 * 2. COMBIEN COÛTE L'ITALIQUE ? Bodoni Moda italique est un second fichier de
 *    police que rien n'employait avant ce bandeau. On relève ce qui part
 *    réellement sur le réseau, sur la page dont la note est publiée.
 *
 * 3. SOUS MOUVEMENT RÉDUIT, RIEN NE BOUGE. La contre-épreuve, sans laquelle la
 *    première réponse ne vaut rien.
 *
 * Emploi :  node preuves/c18/bandeau-familles.mjs [--sortie <fichier.txt>]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 3998;

const argument = (nom, defaut) => {
  const rang = process.argv.indexOf(nom);

  return rang === -1 ? defaut : process.argv[rang + 1];
};

const sortie = argument('--sortie', 'preuves/c18/bandeau-familles.txt');

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

dire('LE BANDEAU DES SEPT FAMILLES — geste, coût, et contre-épreuve');
dire('');

let fautes = 0;

for (const reduit of [false, true]) {
  const contexte = await navigateur.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: reduit ? 'reduce' : 'no-preference',
  });
  const page = await contexte.newPage();

  /* LE RÉSEAU EST ÉCOUTÉ AVANT LA NAVIGATION, sans quoi on relèverait ce qui
     reste après coup et non ce qui est parti. */
  const polices = [];

  page.on('response', (reponse) => {
    const url = reponse.url();

    if (url.includes('.woff2')) {
      polices.push({ url, taille: Number(reponse.headers()['content-length'] ?? 0) });
    }
  });

  await page.goto(`http://localhost:${String(PORT)}/`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.waitForFunction(() => document.fonts.status === 'loaded');

  const supporte = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'));

  /* LA PISTE, AU REPOS PUIS APRÈS UNE DESCENTE. Par paliers : le défilement
     adouci de l'accueil reprend un saut unique et ramène la fenêtre vers sa
     propre cible (leçon payée par l'outil de la couche des révélations). */
  const transformationAuRepos = await page.evaluate(
    () => getComputedStyle(document.querySelector('.bandeau-familles-piste')).transform,
  );

  await page.evaluate(async () => {
    const pas = window.innerHeight * 0.5;

    for (let y = 0; y < document.body.scrollHeight; y += pas) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
  });
  await page.waitForTimeout(800);

  const releve = await page.evaluate(() => {
    const piste = document.querySelector('.bandeau-familles-piste');
    const cadre = document.querySelector('.bandeau-familles');

    return {
      transformation: getComputedStyle(piste).transform,
      famille: getComputedStyle(piste).fontFamily,
      style: getComputedStyle(piste).fontStyle,
      largeurPiste: piste.getBoundingClientRect().width,
      largeurCadre: cadre.clientWidth,
      /* CE QUI COMPTE EST LE DÉBORDEMENT DU DOCUMENT, PAS CELUI DU CADRE.
         La première rédaction lisait `scrollWidth − clientWidth` sur le cadre et
         rendait 2 240 px : c'est le comportement normal d'`overflow: clip`, qui
         recadre sans ouvrir de conteneur de défilement — la piste DOIT déborder
         de son cadre, c'est toute son idée. Le défaut qu'on redoute est ailleurs
         et il est plus grave : une barre de défilement horizontale sur la page. */
      debordement:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mots: piste.textContent.trim().length,
    };
  });

  await contexte.close();

  const italique = polices.filter((p) => p.url.includes('-s.woff2'));
  const octetsItalique = italique.reduce((somme, p) => somme + p.taille, 0);
  const aBouge = transformationAuRepos !== releve.transformation;

  dire(`RÉGIME : ${reduit ? 'mouvement réduit' : 'mouvement'}`);
  dire(`   animation-timeline: view() supportée   ${supporte ? 'oui' : 'non'}`);
  dire(`   piste : ${releve.largeurPiste.toFixed(0)} px dans un cadre de ${releve.largeurCadre} px`);
  dire(`   débordement horizontal du DOCUMENT     ${releve.debordement} px`);
  dire(`   police calculée                        ${releve.famille}`);
  dire(`   style calculé                          ${releve.style}`);
  dire(`   transformation au repos                ${transformationAuRepos}`);
  dire(`   transformation après défilement        ${releve.transformation}`);
  dire(`   fichiers de police téléchargés         ${String(polices.length)}`);
  dire(
    `   dont l'italique (non préchargée)       ${
      italique.length === 0 ? 'aucun' : `${String(octetsItalique)} octets`
    }`,
  );

  /* CE QU'ON EXIGE, RÉGIME PAR RÉGIME. */
  const attendu = reduit ? !aBouge : aBouge;

  if (!attendu) {
    fautes += 1;
  }

  if (releve.debordement !== 0) {
    fautes += 1;
  }

  dire(
    `   → ${
      attendu
        ? reduit
          ? 'CONFORME : rien ne bouge sous mouvement réduit.'
          : 'CONFORME : la piste se déplace avec le défilement.'
        : 'ÉCHEC.'
    }`,
  );
  dire('');
}

dire(
  fautes === 0
    ? 'VERDICT : le bandeau bouge quand on défile, se tait sous mouvement réduit,'
    : `VERDICT : ÉCHEC — ${String(fautes)} anomalie(s).`,
);

if (fautes === 0) {
  dire("et n'ouvre aucun débordement horizontal.");
}

writeFileSync(sortie, `${lignes.join('\n')}\n`, 'utf8');

await navigateur.close();
serveur.kill();

process.exit(fautes === 0 ? 0 : 1);
