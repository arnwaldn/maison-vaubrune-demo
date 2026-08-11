import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * TRENTE SECONDES, comme les autres gardes : chaque cas LANCE UN PROCESSUS.
 * Le raisonnement complet est en tête de `garde-images.spec.ts`.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * LA GARDE DU PLANCHER TYPOGRAPHIQUE, ÉPROUVÉE SUR PIÈCES.
 *
 * ---------------------------------------------------------------------------
 * Ce que ces cas défendent, et contre quoi
 * ---------------------------------------------------------------------------
 *
 * La garde existe parce qu'un `grep` s'est trompé. Le contrôle de sortie de C13
 * cherchait `font-titre` voisin d'une petite taille, et il ne pouvait pas voir
 * les titres qui n'écrivent PAS `font-titre` — ceux qui héritent la didone de
 * la règle `h1, h2, h3, h4` de `@layer base`. Trois titres du site rendaient la
 * Bodoni à 12 px sans qu'aucune ligne du dépôt ne contienne `font-titre` à côté
 * d'eux.
 *
 * Le premier cas ci-dessous est donc le plus important du fichier : il fixe
 * exactement ce chemin. S'il venait à passer au vert sans que la garde ait été
 * corrigée, c'est que l'angle mort serait revenu.
 *
 * ---------------------------------------------------------------------------
 * Des dépôts miniatures, construits par le test
 * ---------------------------------------------------------------------------
 *
 * Comme pour les gardes d'images et de marques (C11), les pièces à conviction
 * sont écrites dans un dossier temporaire plutôt que versionnées : un composant
 * délibérément fautif qui dort dans `tests/fixtures/` finit toujours par être
 * recopié par quelqu'un qui le prend pour un exemple. Ici la faute et la raison
 * de sa présence sont sur le même écran.
 *
 * Ce qui compte n'est pas ce que la garde affiche, c'est le CODE DE SORTIE
 * qu'elle rend : c'est lui, et lui seul, qui arrête `npm run controle`.
 */

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const GARDE = fileURLToPath(new URL('../../scripts/verifier-typographie.mjs', import.meta.url));

interface Verdict {
  readonly code: number;
  readonly sortie: string;
}

const dossiers: string[] = [];

afterEach(() => {
  for (const dossier of dossiers.splice(0)) {
    rmSync(dossier, { recursive: true, force: true });
  }
});

/** Un dépôt miniature d'un seul composant, et le verdict de la garde dessus. */
function juger(contenu: string): Verdict {
  const dossier = mkdtempSync(join(tmpdir(), 'garde-typo-'));
  dossiers.push(dossier);

  const source = join(dossier, 'src');
  mkdirSync(source, { recursive: true });
  writeFileSync(join(source, 'Composant.tsx'), contenu, 'utf8');

  try {
    const sortie = execFileSync(process.execPath, [GARDE, '--racine', join(dossier, 'src')], {
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

describe('la garde du plancher typographique', () => {
  it('REFUSE un titre qui hérite la didone de @layer base sous 20 px', () => {
    /* LE CAS QUI A ÉCHAPPÉ À C12 ET À C13 : aucune mention de `font-titre`
       nulle part, et pourtant la Bodoni sort à 12 px. */
    const verdict = juger(`
      export function Composant() {
        return <h3 className="text-xs font-semibold tracking-[0.18em] uppercase">Encadré</h3>;
      }
    `);

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('didone HÉRITÉE');
    expect(verdict.sortie).toContain('12 px');
  });

  it('ACCEPTE le même titre une fois passé au registre', () => {
    const verdict = juger(`
      export function Composant() {
        return <h3 className="etiquette text-encre">Encadré</h3>;
      }
    `);

    expect(verdict.code).toBe(0);
    expect(verdict.sortie).toContain('aucune didone sous 20 px');
  });

  it('REFUSE une didone ÉCRITE sous 20 px sur un élément qui n’est pas un titre', () => {
    const verdict = juger(`
      export function Composant() {
        return <span className="font-titre text-base">Nom du produit</span>;
      }
    `);

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('didone écrite');
  });

  it('ACCEPTE un titre qui pose explicitement une autre famille', () => {
    const verdict = juger(`
      export function Composant() {
        return <h2 className="font-texte text-xs">Petit sous-titre de texte</h2>;
      }
    `);

    expect(verdict.code).toBe(0);
  });

  it('RÉSOUT les constantes partagées — les deux qui portaient trente titres en C12', () => {
    /* Une classe rangée dans une constante est invisible à un contrôle qui lit
       la ligne de la balise. C'est exactement ce qui avait fait manquer le
       compte au recensement de C12. */
    const verdict = juger(`
      const CLASSE_SOUS_TITRE = 'mt-8 font-titre text-base text-encre';

      export function Composant() {
        return <h3 className={CLASSE_SOUS_TITRE}>Article premier</h3>;
      }
    `);

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('16 px');
  });

  it('EXEMPTE un titre réservé aux lecteurs d’écran', () => {
    /* Il n'est pas rendu : il n'a pas de police. */
    const verdict = juger(`
      export function Composant() {
        return <h2 className="sr-only">Description</h2>;
      }
    `);

    expect(verdict.code).toBe(0);
    expect(verdict.sortie).toContain('1 exempté(s)');
  });

  it('REFUSE un titre sans aucune classe de taille (héritage supposé à 16 px)', () => {
    const verdict = juger(`
      export function Composant() {
        return <h4 className="mt-4 text-encre">Rubrique</h4>;
      }
    `);

    expect(verdict.code).toBe(1);
    expect(verdict.sortie).toContain('taille héritée');
  });

  it('ACCEPTE un titre porté par un degré de l’échelle', () => {
    const verdict = juger(`
      export function Composant() {
        return <h1 className="text-affiche text-encre">Boutique</h1>;
      }
    `);

    expect(verdict.code).toBe(0);
  });

  it('retient la PLUS PETITE taille quand plusieurs écrans sont écrits', () => {
    /* Mobile d'abord : la classe sans préfixe est celle du plus petit écran,
       donc celle qui décide. */
    const bon = juger(`
      export function Composant() {
        return <h1 className="font-titre text-3xl sm:text-4xl">Référence</h1>;
      }
    `);
    const mauvais = juger(`
      export function Composant() {
        return <h1 className="font-titre text-lg sm:text-3xl">Référence</h1>;
      }
    `);

    expect(bon.code).toBe(0);
    expect(mauvais.code).toBe(1);
    expect(mauvais.sortie).toContain('18 px');
  });

  it('lit les tailles arbitraires, en rem comme en pixels', () => {
    const bon = juger(`
      export function Composant() {
        return <h2 className="font-titre text-[1.25rem]">Titre</h2>;
      }
    `);
    const mauvais = juger(`
      export function Composant() {
        return <h2 className="font-titre text-[18px]">Titre</h2>;
      }
    `);

    expect(bon.code).toBe(0);
    expect(mauvais.code).toBe(1);
    expect(mauvais.sortie).toContain('18 px');
  });

  it('TERNAIRE : une branche non didone exempte l’autre — le seul relâchement, tenu par un contrôle', () => {
    /* LE CAS QUE LE COMMENTAIRE DE `soupeDeClasses` ANNONÇAIT SANS QU'AUCUN
       CONTRÔLE NE LE TIENNE (deferred de la vérification éclair de C13).
       Une garantie s'écrit en contrôle, pas en commentaire : tant qu'elle
       n'est qu'une phrase, rien n'empêche une réécriture d'aplatir le
       ramassage des deux branches sans que personne le voie.

       Le relâchement, dit exactement : la garde ne cherche pas à ÉVALUER
       l'expression d'un `className` — elle ramasse tout ce qu'elle contient,
       littéraux et constantes connues. Une branche qui pose `font-texte`
       déclare donc une famille non didone pour l'élément entier, et l'autre
       branche cesse d'être examinée. C'est un trou, il est assumé, et il est
       étroit : il faut qu'une branche pose EXPLICITEMENT une autre famille.

       Le second dépôt le montre — deux branches également didones, aucune
       exemption, la garde tombe. */
    const relache = juger(`
      export function Composant({ compact }: { readonly compact: boolean }) {
        return (
          <h3 className={compact ? 'font-texte text-xs' : 'font-titre text-base'}>Rubrique</h3>
        );
      }
    `);
    const tenu = juger(`
      export function Composant({ compact }: { readonly compact: boolean }) {
        return (
          <h3 className={compact ? 'font-titre text-sm' : 'font-titre text-base'}>Rubrique</h3>
        );
      }
    `);

    expect(relache.code).toBe(0);
    expect(tenu.code).toBe(1);
    expect(tenu.sortie).toContain('didone écrite');
  });

  it('rend VERT sur le dépôt réel — le plancher de D37 est tenu', () => {
    /* Le cas de non-régression : celui qui échouera le jour où une tranche
       ultérieure reposera une didone sous le plancher. */
    const sortie = execFileSync(process.execPath, [GARDE], { cwd: RACINE, encoding: 'utf8' });

    expect(sortie).toContain('aucune didone sous 20 px');
  });
});
