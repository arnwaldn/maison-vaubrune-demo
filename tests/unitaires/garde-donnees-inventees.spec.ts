import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * TRENTE SECONDES, ET NON LES CINQ PAR DÉFAUT.
 *
 * Les cas de ce fichier ne sont pas des tests unitaires : chacun LANCE UN
 * PROCESSUS — démarrer Node, parfois compiler le catalogue TypeScript par
 * `tsx`, parcourir le dépôt, écrire un rapport. Le budget de cinq secondes de
 * Vitest est calibré pour une fonction pure ; il a tenu ici par chance tant que
 * les gardes étaient deux, et il a lâché quand C11 en a ajouté une troisième
 * avec ses treize cas — les processus se disputent alors les mêmes cœurs.
 *
 * Ce délai n'est pas un budget de performance : c'est un filet contre un
 * BLOCAGE (une garde qui attendrait une entrée, un processus qui ne rendrait
 * jamais la main). Il doit donc être assez lâche pour ne jamais se déclencher
 * à tort — un test rouge un jour sur trois, sur un code identique, est pire
 * qu'un test absent.
 */
vi.setConfig({ testTimeout: 30_000 });


/**
 * LA GARDE D'HONNÊTETÉ, ÉPROUVÉE SUR PIÈCES.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi on lance le vrai script, et pas ses fonctions
 * ---------------------------------------------------------------------------
 *
 * Une garde ne vaut que par son verdict : elle doit rendre un code de sortie
 * non nul quand le dépôt est fautif, sinon `npm run controle` continue et
 * personne ne voit rien. Tester les expressions régulières une par une
 * laisserait hors de portée la seule chose qui compte réellement — le
 * branchement entre « j'ai trouvé quelque chose » et « je fais échouer la
 * chaîne ». Ces six cas exécutent donc le script comme le fait `npm run`, et
 * lisent son code de sortie.
 *
 * Le coût est celui de six démarrages de Node, soit quelques dizaines de
 * millisecondes chacun : le script ne dépend d'AUCUN module TypeScript du
 * projet (il ne lit que du texte), il n'a donc pas besoin de `tsx` comme la
 * garde du catalogue.
 *
 * ---------------------------------------------------------------------------
 * Le cas qui passe est le VRAI dépôt
 * ---------------------------------------------------------------------------
 *
 * Les cinq cas en échec s'appuient sur des dépôts miniatures
 * (`tests/fixtures/donnees-inventees/`, voir leur LISEZ-MOI) ; le cas qui
 * passe, lui, n'a pas d'imitation : c'est le dépôt lui-même. C'est le sens de
 * la garde — dire que CE dépôt-ci n'a pas de donnée inventée — et une fixture
 * « dépôt sain » n'aurait prouvé que la bonne santé de la fixture.
 */

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = fileURLToPath(
  new URL('../../scripts/verifier-aucune-donnee-inventee.mjs', import.meta.url),
);
const FIXTURES = fileURLToPath(new URL('../fixtures/donnees-inventees/', import.meta.url));

interface Verdict {
  readonly code: number;
  readonly sortie: string;
}

/** Lance la garde sur le dépôt réel, ou sur un dépôt miniature nommé. */
function lancerLaGarde(fixture?: string): Verdict {
  const arguments_ =
    fixture === undefined ? [SCRIPT] : [SCRIPT, '--base', join(FIXTURES, fixture)];

  try {
    const sortie = execFileSync(process.execPath, arguments_, {
      cwd: RACINE,
      encoding: 'utf8',
    });
    return { code: 0, sortie };
  } catch (erreur) {
    /* `execFileSync` JETTE quand le code de sortie n'est pas nul : c'est
       précisément le cas qu'on veut observer, pas un incident. */
    const echec = erreur as { status?: number; stdout?: string };
    return { code: echec.status ?? -1, sortie: echec.stdout ?? '' };
  }
}

describe('garde « aucune donnée inventée »', () => {
  it('laisse passer le dépôt tel qu’il est', () => {
    const verdict = lancerLaGarde();

    expect(verdict.sortie).toContain('aucune anomalie');
    expect(verdict.code).toBe(0);
  });

  it('échoue sur un numéro à neuf chiffres posé dans src', () => {
    const verdict = lancerLaGarde('siren');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('SIREN');
    expect(verdict.sortie).toContain('marchand-rempli.txt');
  });

  it('échoue sur un numéro de téléphone français posé dans src', () => {
    const verdict = lancerLaGarde('telephone');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('Numéro de téléphone français');
    expect(verdict.sortie).toContain('service-client.txt');
  });

  it('échoue sur un identifiant bancaire posé dans contenu', () => {
    const verdict = lancerLaGarde('iban');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('IBAN français');
  });

  it('échoue sur une page gabarit vidée de ses emplacements', () => {
    const verdict = lancerLaGarde('page-sans-emplacement');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('aucun <AComplete>');
    expect(verdict.sortie).toContain('mentions-legales');

    /* Les trois autres gabarits de la fixture ont gardé le leur : la garde ne
       doit pas condamner tout le lot pour une page. Et la page « À propos »,
       dispensée, ne doit pas non plus être comptée en échec malgré ses zéro
       emplacement. */
    expect(verdict.sortie).toContain('dispense assumée');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('ne prend pas neuf chiffres d’un hachage pour un SIREN, et voit toujours le vrai', () => {
    /* LE DÉFAUT QUE C14 A RÉELLEMENT PROVOQUÉ. Le relevé de livraison des
       images porte des empreintes SHA-256 ; dix-neuf d'entre elles alignaient
       neuf chiffres entre deux lettres hexadécimales, et la garde y a vu
       dix-neuf SIREN. La correction n'est pas une exemption de fichier — la
       décision D30 l'interdit — mais une règle sur le CONTEXTE, sœur de « un
       nombre suivi d'une unité est une quantité » : neuf chiffres pris dans
       une suite hexadécimale ne sont pas un identifiant.

       Ce cas éprouve les DEUX sens dans le même dépôt : trois hachages réels
       qui doivent passer, et un SIREN entre guillemets qui doit tomber. Un
       test qui ne montrerait que le premier sens laisserait passer une
       correction qui aurait simplement désarmé le motif. */
    const verdict = lancerLaGarde('hachage');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('SIREN');
    expect(verdict.sortie).toContain('812345678');
    expect(verdict.sortie).toContain('fournisseur.txt');
    /* Aucun des trois hachages ne doit apparaître au rapport. */
    expect(verdict.sortie).not.toContain('manifeste-livre.json');
    expect(verdict.sortie).not.toContain('168732072');
    expect(verdict.sortie).not.toContain('979120184');
    expect(verdict.sortie).not.toContain('269993095');
  });

  it('voit un SIREN collé à une lettre a-f — un caractère ne fait pas un hachage', () => {
    /* LE TROU DE LA PREMIÈRE PARADE, refermé au round 1. Elle ne regardait
       qu'UN caractère de chaque côté des neuf chiffres et s'éteignait donc dès
       qu'une lettre a-f les touchait : `ref552100554` et `"552100554e"` sont
       deux façons banales d'écrire un identifiant réel, et la garde se taisait
       sur les deux.

       Le critère porte désormais sur le JETON ENTIER — au moins douze
       caractères hexadécimaux ET une lettre a-f pour qu'on parle d'empreinte.
       Les deux lignes tombent, l'empreinte de trente-deux caractères posée
       juste à côté passe : les deux sens dans le même fichier. */
    const verdict = lancerLaGarde('hachage');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('reference-fournisseur.txt');
    expect(verdict.sortie).toContain('552100554');
    /* L'empreinte voisine ne doit pas être signalée. */
    expect(verdict.sortie).not.toContain('a77420730');
  });

  it('retire son exemption au jeu d’essai qui a perdu ses marqueurs', () => {
    const verdict = lancerLaGarde('jeu-essai-sans-marqueur');

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('marqueur « rue de l’Exemple » absent');

    /* Deux échecs, et c'est la démonstration même du mécanisme : la preuve
       tombe (contrôle 3), donc l'exemption tombe, donc l'adresse du jeu d'essai
       est analysée comme n'importe quelle autre et signalée (contrôle 4). */
    expect(verdict.sortie).toContain('Adresse postale');
    expect(verdict.sortie).toContain('2 en échec');
  });
});

/* -------------------------------------------------------------------------- */
/* Contrôle 6 (C19) — les fichiers de pilotage privé ne peuvent plus entrer    */
/* -------------------------------------------------------------------------- */

/**
 * POURQUOI CES DÉPÔTS-CI SONT DE VRAIS DÉPÔTS GIT, CONSTRUITS PAR LE TEST.
 *
 * Les cinq fixtures ci-dessus sont des dossiers ordinaires : les contrôles 1
 * à 5 parcourent le disque, un dossier leur suffit. Le contrôle 6 ne parcourt
 * pas le disque — il interroge l'INDEX DE GIT, parce que la question qu'il pose
 * n'est pas « ce fichier existe-t-il ? » mais « ce fichier est-il suivi ? ».
 * L'éprouver sur un dossier sans dépôt reviendrait à ne pas l'éprouver du tout.
 *
 * Chaque cas fabrique donc un dépôt jetable dans le dossier temporaire du
 * système, y écrit sa pièce à conviction, l'ajoute à l'index (`git add`, sans
 * commit : l'index EST ce que git appelle « suivi »), lance la garde dessus et
 * lit son code de sortie.
 *
 * DEUX RAISONS DE NE PAS VERSIONNER CES FIXTURES, et la seconde est la bonne :
 * un dépôt git imbriqué dans un dépôt git est une source d'ennuis permanente ;
 * surtout, une fixture versionnée porterait dans CE dépôt-ci les chaînes mêmes
 * que la garde traque — un journal factice, un chemin de poste — et la garde
 * mordrait son propre banc d'essai à la première exécution.
 *
 * LE DERNIER CAS EST LE SENS MÊME DU CONTRÔLE : les deux fichiers interdits
 * sont SUR LE DISQUE, à leur place, et ignorés par git. La garde doit passer.
 * Sans lui, on aurait pu écrire un contrôle qui interdit au journal d'exister
 * sur le poste — ce qui serait faux, et gênant pour celui qui travaille.
 */

const dépôtsJetables: string[] = [];

function dépôtGit(fichiers: Readonly<Record<string, string>>, ignores = ''): string {
  const racine = mkdtempSync(join(tmpdir(), 'garde-pilotage-'));
  dépôtsJetables.push(racine);

  execFileSync('git', ['init', '--quiet'], { cwd: racine });

  if (ignores !== '') {
    writeFileSync(join(racine, '.gitignore'), ignores, 'utf8');
  }

  for (const [chemin, contenu] of Object.entries(fichiers)) {
    const absolu = join(racine, chemin);
    mkdirSync(dirname(absolu), { recursive: true });
    writeFileSync(absolu, contenu, 'utf8');
  }

  /* `git add -A` respecte le `.gitignore` : c'est exactement le comportement
     qu'on veut éprouver, puisque c'est celui de la vraie vie. */
  execFileSync('git', ['add', '-A'], { cwd: racine });

  return racine;
}

function lancerSurDépôt(racine: string): Verdict {
  try {
    const sortie = execFileSync(process.execPath, [SCRIPT, '--base', racine], {
      cwd: RACINE,
      encoding: 'utf8',
    });
    return { code: 0, sortie };
  } catch (erreur) {
    const echec = erreur as { status?: number; stdout?: string };
    return { code: echec.status ?? -1, sortie: echec.stdout ?? '' };
  }
}

/**
 * Les trois empreintes de pilotage, ASSEMBLÉES et non écrites en clair.
 *
 * Même raison que dans la garde elle-même : ce fichier de test est suivi par
 * git. La règle (b) du contrôle 6 saute `tests/` — la règle (a), qui porte sur
 * les chemins, non. L'assemblage coûte trois lignes et retire toute dépendance
 * à cette exemption : le banc d'essai reste propre même si quelqu'un décide un
 * jour de scanner `tests/` aussi.
 */
const ADRESSE_CONVERSATION = `https://${['gemini', 'google', 'com'].join('.')}/app/0123456789abcdef`;
const CHEMIN_POSTE = ['C:', 'Users', 'un-prenom', 'Desktop', 'projet'].join('\\');
const CHEMIN_DONNEES = ['AppData', 'Local', 'ms-playwright'].join('\\');

describe('garde « aucun fichier de pilotage privé suivi »', () => {
  afterEach(() => {
    while (dépôtsJetables.length > 0) {
      const racine = dépôtsJetables.pop();
      if (racine !== undefined) {
        rmSync(racine, { recursive: true, force: true });
      }
    }
  });

  it('échoue sur le journal de génération ajouté à l’index', () => {
    const verdict = lancerSurDépôt(
      dépôtGit({
        'travaux-images/JOURNAL-GENERATION.md': '# Journal\n\nRien de sensible ici.\n',
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('JOURNAL-GENERATION.md');
    expect(verdict.sortie).toContain('SUIVI par git');
    expect(verdict.sortie).toContain('1 en échec');
  });

  it('échoue sur le journal RENOMMÉ, par son contenu', () => {
    /* Le cas que la règle des chemins ne peut pas voir. Renommer un fichier
       est le premier réflexe de qui veut « juste le garder sous la main ». */
    const verdict = lancerSurDépôt(
      dépôtGit({
        'notes/travaux.md': `Conversation : ${ADRESSE_CONVERSATION}\n`,
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('adresse de conversation');
    expect(verdict.sortie).toContain('notes/travaux.md');
  });

  it('échoue sur un dossier de pilotage de tranche ajouté à l’index', () => {
    const verdict = lancerSurDépôt(
      dépôtGit({ '.superpowers/sdd/chantier/progress.md': 'ledger\n' }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('.superpowers/sdd/chantier/progress.md');
    expect(verdict.sortie).toContain('dossier de pilotage de tranche');
  });

  it('échoue sur un chemin de poste recopié dans un relevé de preuve', () => {
    /* LE DÉFAUT RÉEL TROUVÉ PAR CETTE GARDE À SA PREMIÈRE EXÉCUTION : sept
       relevés versionnés de C14 à C17 portaient des piles d'appel Playwright
       et un chemin de navigateur, donc le nom de session du poste, dans un
       dépôt public. Ni le nom du fichier ni son extension ne le disaient. */
    const verdict = lancerSurDépôt(
      dépôtGit({
        'preuves/c19/releve.txt': `    at ${CHEMIN_POSTE}\\tests\\e2e\\x.spec.ts:12:3\n`,
        'preuves/c19/navigateur.txt': `Navigateur : ${CHEMIN_DONNEES}\\chrome.exe\n`,
      }),
    );

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('chemin de poste Windows');
    expect(verdict.sortie).toContain('chemin de données d’application');
  });

  it('laisse passer les mêmes fichiers PRÉSENTS sur le disque mais non suivis', () => {
    /* Le second sens, et le seul qui rende la garde vivable : le journal reste
       sur le poste, à sa place, et la garde n'a rien à y redire. C'est
       l'ignorance de git qui décide, pas l'absence du fichier. */
    const verdict = lancerSurDépôt(
      dépôtGit(
        {
          'travaux-images/JOURNAL-GENERATION.md': `Conversation : ${ADRESSE_CONVERSATION}\n`,
          'travaux-images/manifeste.json': '{ "produits": [] }\n',
          'README.md': 'Un dépôt propre.\n',
        },
        'travaux-images/*\n!travaux-images/manifeste.json\n',
      ),
    );

    expect(verdict.code).toBe(0);
    expect(verdict.sortie).toContain('aucune anomalie');
    /* Et il a bien REGARDÉ : le manifeste, lui, est suivi et relu. */
    expect(verdict.sortie).toContain('fichier(s) suivi(s) par git');
  });

  it('refuse de rendre un verdict quand git ne répond pas', () => {
    /* Un dossier temporaire SANS `git init`. Le contrôle ne doit pas conclure
       « aucun fichier de pilotage » à partir d'une liste qu'il n'a pas
       obtenue : une garde qui se tait faute d'outil est une garde qui ment. */
    const horsDépôt = mkdtempSync(join(tmpdir(), 'garde-pilotage-hors-'));
    dépôtsJetables.push(horsDépôt);

    /* `git ls-files` remonte l'arborescence à la recherche d'un dépôt. Le
       dossier temporaire du système n'en contient aucun — c'est ce qui rend ce
       cas reproductible sans bricoler l'environnement. */
    const verdict = lancerSurDépôt(horsDépôt);

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('n’a donc');
    expect(verdict.sortie).toContain('rien vérifié');
  });
});
