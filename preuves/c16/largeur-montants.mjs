/* CE QUE LA LARGEUR RESERVEE DES MONTANTS CHANGE, MESURE PLUTOT QU'AFFIRME.
 *
 * La tranche C16 a pose `min-w-[…] text-right` sur les parents des montants du
 * recapitulatif, en affirmant que sans eux « le bloc glisse quand le nombre
 * gagne un chiffre ». Le premier test ecrit pour le prouver est reste VERT une
 * fois la largeur retiree : il mesurait l'abscisse du libelle et le bord droit
 * du montant, or ces deux points sont tenus par `justify-between`, qui colle un
 * enfant a chaque bord quoi qu'il arrive. Le test ne discriminait rien.
 *
 * Ce script mesure ce qui peut REELLEMENT bouger dans ce bloc : la place laissee
 * au libelle a gauche, et donc son nombre de lignes, et donc la hauteur du
 * recapitulatif entier. Il joue le meme geste (quantite 1 -> 5, ce qui fait
 * passer les montants a trois chiffres avant la virgule) et releve les deux
 * mondes.
 *
 * Emploi :  node preuves/c16/largeur-montants.mjs
 * Sortie :  un releve texte sur la sortie standard, a rediriger.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const PORT = 3997;
const FICHE = '/boutique/huile-olive-premiere-pression';

const serveur = spawn('node', ['scripts/servir-production.mjs', '--port', String(PORT)], {
  stdio: 'ignore',
});

await new Promise((resoudre) => setTimeout(resoudre, 9000));

const navigateur = await chromium.launch({
  executablePath: process.env['CHROME'] ?? undefined,
  channel: process.env['CHROME'] ? undefined : 'chromium',
});

/* Les deux largeurs de la campagne, parce qu'un bloc de recapitulatif tient
   dans une colonne de 22 rem sur un bureau et dans toute la fenetre sur un
   telephone : ce n'est pas la meme place, donc pas le meme risque de retour a
   la ligne. */
for (const [nom, viewport] of [
  ['bureau 1280', { width: 1280, height: 800 }],
  ['mobile 390', { width: 390, height: 844 }],
]) {
  const contexte = await navigateur.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await contexte.newPage();

  await page.goto(`http://localhost:${String(PORT)}${FICHE}`);
  await page.waitForFunction(
    () => document.documentElement.dataset['hydratation'] === 'prete',
  );
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByText('Ajouté au panier.').waitFor();

  await page.goto(`http://localhost:${String(PORT)}/panier`);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-place-reservee]').length === 0,
  );


  const releve = async () =>
    page.evaluate(() => {
      const bloc = document.querySelector('[aria-labelledby="titre-recapitulatif"]');

      if (bloc === null) {
        return null;
      }

      const libelles = [...bloc.querySelectorAll('dt')].map((dt) => ({
        texte: (dt.textContent ?? '').slice(0, 44),
        largeur: Math.round(dt.getBoundingClientRect().width),
        hauteur: Math.round(dt.getBoundingClientRect().height),
      }));

      return {
        hauteurBloc: Math.round(bloc.getBoundingClientRect().height),
        libelles,
      };
    });

  const avant = await releve();

  await page.getByLabel('Qté').fill('5');
  await page.waitForTimeout(200);

  const apres = await releve();

  console.log(`\n=== ${nom} ===`);
  console.log(`hauteur du recapitulatif : ${String(avant?.hauteurBloc)} -> ${String(apres?.hauteurBloc)}`);

  for (const [rang, libelle] of (avant?.libelles ?? []).entries()) {
    const suivant = apres?.libelles[rang];

    console.log(
      `  dt « ${libelle.texte} » : largeur ${String(libelle.largeur)} -> ` +
        `${String(suivant?.largeur)} , hauteur ${String(libelle.hauteur)} -> ` +
        `${String(suivant?.hauteur)}`,
    );
  }

  await contexte.close();
}

await navigateur.close();
serveur.kill();
