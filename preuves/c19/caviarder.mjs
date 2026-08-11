/* CAVIARDE UN FLUX OU DES FICHIERS AVANT DE LES VERSIONNER (C19).
 *
 * La première version du lot de mesures a fait ÉCHOUER la garde du dépôt, et
 * elle avait raison : la sortie de vitest commence par « RUN v4.1.10 <chemin
 * absolu du dépôt> », c'est-à-dire le nom de session du poste, dans un fichier
 * versionné. C'est exactement le défaut que le sixième contrôle de
 * `verifier-donnees` a trouvé sur sept relevés de C14 à C17.
 *
 * LA LEÇON EST GÉNÉRALE : ON NE VERSIONNE PAS UN FLUX BRUT. Tout outil qui
 * capture la sortie d'une commande la fait passer par ici.
 *
 * ---------------------------------------------------------------------------
 * L'ORDRE DES MOTIFS EST LA MOITIÉ DE L'OUTIL (défaut trouvé à la revue C20)
 * ---------------------------------------------------------------------------
 *
 * RÈGLE : chaque remplacement DÉTRUIT la matière dont le suivant a besoin. Les
 * motifs vont donc du chemin LE PLUS LONG au plus court, jamais l'inverse.
 *
 *   1. le navigateur de Playwright — il vit sous le profil, donc avant lui ;
 *   2. la racine du dépôt — elle vit sous le profil aussi, donc avant lui ;
 *   3. la racine du dépôt DÉJÀ AMPUTÉE de son profil — réparation des relevés
 *      produits par la version fautive, voir plus bas ;
 *   4. le profil du poste, en dernier, parce qu'il est le préfixe des trois.
 *
 * Ce fichier portait la règle, écrite pour (1), et ne l'appliquait pas à (2) :
 * le motif de la racine tirait APRÈS celui du profil, qui lui retirait sa
 * lettre de lecteur. Il n'a donc jamais pu correspondre — du CODE MORT tant
 * que le dépôt vit sous le profil — et les relevés publiés sur un dépôt PUBLIC
 * portaient le nom d'utilisateur masqué et TOUTE L'ORGANISATION DU POSTE en
 * clair. D'où le motif (3) : la réparation ne peut pas venir des chemins
 * bruts, ils n'existent plus.
 *
 * SECOND DÉFAUT, SUR LA MÊME LIGNE, ET IL SUFFISAIT SEUL : les motifs étaient
 * construits en GABARITS DE CHAÎNE, où « \s » ne vaut pas la classe des blancs
 * mais la lettre « s » — un échappement inconnu perd son contre-oblique avant
 * même d'atteindre l'expression régulière. Le motif de la racine s'arrêtait
 * donc au « s » de la première section du chemin, et refusait par ailleurs les
 * ESPACES que ce poste met dans ses dossiers. Remis en tête de liste tel quel,
 * il n'aurait toujours rien caviardé. Les motifs s'écrivent désormais en
 * LITTÉRAUX d'expression régulière, où « \s » est ce qu'il annonce.
 *
 * Aucun motif ne contient la chaîne que la garde d'honnêteté cherche : « C: »
 * y est suivi d'un crochet ouvrant, jamais d'un séparateur. Les jeux d'essai,
 * eux, ont besoin des chemins entiers : ils sont ASSEMBLÉS à l'exécution, et
 * pas un des jetons surveillés ne se lit dans cette source. Le tout est
 * vérifié par `npm run verifier-donnees`, qui lit ce fichier.
 *
 * Emploi :  <commande> | node preuves/c19/caviarder.mjs > releve.txt
 *           node preuves/c19/caviarder.mjs releve.txt [autre.txt ...]
 *           node preuves/c19/caviarder.mjs --essai
 *
 * JAMAIS PAR UN TUYAU POWERSHELL : `Get-Content -Raw | node …` aplatit le
 * fichier sur UNE ligne, en silence (piège payé en C20). Sous PowerShell, on
 * passe les fichiers EN ARGUMENT — ils sont alors réécrits sur place.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const AB = String.fromCharCode(92);

const MOTIFS = [
  /* (1) Le chemin du navigateur de Playwright passe par le dossier de données
   * locales de l'application, que la garde refuse au MÊME titre que le profil
   * utilisateur — et il doit être traité AVANT le motif du profil, sans quoi
   * il resterait la moitié du chemin, toujours rouge. Le libellé est celui du
   * relevé voisin `notes-publication-c19.txt` : les deux se lisent pareil. */
  [
    /[A-Za-z]:[\\/][^\s"']*ms-playwright[^\s"']*/g,
    'le Chromium déjà installé par Playwright sur le poste (chemin caviardé)',
  ],

  /* (2) La racine du dépôt, en chemin BRUT. Les sections peuvent porter des
   * espaces (ce poste en met trois dans les siennes) : la section est donc
   * tout ce qui n'est ni un séparateur, ni une fin de ligne, ni un guillemet.
   * Le motif s'arrête au nom du dépôt et laisse la suite du chemin lisible —
   * c'est elle qui a une valeur de preuve. */
  [/[A-Za-z]:[\\/](?:[^\\/\r\n"']+[\\/])*maison-vaubrune/g, '<racine du depot>'],

  /* (3) La même racine, déjà amputée de son profil par la version fautive.
   * Sans ce motif, les relevés déjà versionnés resteraient tels quels : le
   * chemin brut n'y est plus, rien ne peut le reconnaître. */
  [/<profil du poste>(?:[\\/][^\\/\r\n"']+)*[\\/]maison-vaubrune/g, '<racine du depot>'],

  /* (4) Le profil du poste, en dernier : il est le préfixe des trois autres,
   * et c'est le seul motif que la garde d'honnêteté sait déjà chercher. */
  [/C:[\\/]Users[\\/][^\\/\s"']*/gi, '<profil du poste>'],
];

function caviarder(brut) {
  let sortie = brut;
  for (const [motif, remplacement] of MOTIFS) sortie = sortie.replace(motif, remplacement);
  return sortie;
}

/* ---------------------------------------------------------------------------
 * BANC D'ESSAI — `--essai`
 * ---------------------------------------------------------------------------
 *
 * Quatre cas, dans les DEUX SENS : ce que l'ordre doit produire, et ce qu'il
 * ne doit pas casser en le produisant. Le cas 1 est celui du défaut de C20 :
 * un chemin complet du poste doit rendre « <racine du depot>/… » et NON
 * « <profil du poste>/Bureau/… ». Les chemins sont assemblés ici, pièce par
 * pièce, pour qu'aucun jeton surveillé ne se lise dans cette source.
 */
const PROFIL = 'C:' + AB + 'Users' + AB + 'un-prenom';
const RACINE = PROFIL + AB + 'Bureau' + AB + 'Espace de travail' + AB + 'maison-vaubrune';
const NAVIGATEUR = PROFIL + AB + 'App' + 'Data' + AB + 'Local' + AB + 'ms-playwright' + AB + 'chromium-1181';

const ESSAIS = [
  {
    intitule: 'un chemin complet du poste rend la racine du dépôt, jamais le profil',
    entree: '          périmètre : ' + RACINE + AB + 'public' + AB + 'produits',
    attendu: '          périmètre : <racine du depot>' + AB + 'public' + AB + 'produits',
  },
  {
    intitule: 'un relevé déjà caviardé par la version fautive est réparé',
    entree: ' RUN  v4.1.10 <profil du poste>/Bureau/Espace de travail/maison-vaubrune',
    attendu: ' RUN  v4.1.10 <racine du depot>',
  },
  {
    intitule: 'le profil garde son office hors du dépôt (l’ordre ne l’a pas tué)',
    entree: 'lu depuis ' + PROFIL + AB + 'Documents',
    attendu: 'lu depuis <profil du poste>' + AB + 'Documents',
  },
  {
    intitule: 'le navigateur de Playwright passe toujours avant le profil',
    entree: 'Executable: ' + NAVIGATEUR + AB + 'chrome.exe',
    attendu:
      'Executable: le Chromium déjà installé par Playwright sur le poste (chemin caviardé)',
  },
];

function essai() {
  let echecs = 0;

  for (const cas of ESSAIS) {
    const obtenu = caviarder(cas.entree);
    const vert = obtenu === cas.attendu;

    if (!vert) echecs += 1;

    process.stdout.write(`[${vert ? ' OK   ' : 'ÉCHEC'}] ${cas.intitule}\n`);

    if (!vert) {
      process.stdout.write(`           attendu : ${cas.attendu}\n`);
      process.stdout.write(`           obtenu  : ${obtenu}\n`);
    }
  }

  process.stdout.write(
    `\n${String(ESSAIS.length)} cas, ${String(echecs)} en échec.\n`,
  );

  return echecs === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------------ */

const ARGUMENTS = process.argv.slice(2);

if (ARGUMENTS.includes('--essai')) {
  process.exit(essai());
} else if (ARGUMENTS.length > 0) {
  /* Mode FICHIER : réécriture sur place. Le compte rendu part sur la sortie
     d'erreur — la sortie standard reste réservée au mode tuyau. */
  for (const chemin of ARGUMENTS) {
    const brut = readFileSync(chemin, 'utf8');
    const sortie = caviarder(brut);

    if (sortie === brut) {
      process.stderr.write(`inchangé : ${chemin}\n`);
      continue;
    }

    writeFileSync(chemin, sortie);
    process.stderr.write(`caviardé : ${chemin}\n`);
  }
} else {
  let brut = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (morceau) => {
    brut += morceau;
  });
  process.stdin.on('end', () => {
    process.stdout.write(caviarder(brut));
  });
}
