import { expect, test } from '@playwright/test';

import { FINE_INSECABLE, INSECABLE, ouvrir } from './aides';

/**
 * LA TYPOGRAPHIE DU TEXTE AFFICHÉ, mesurée sur le rendu et non sur la source.
 *
 * ---------------------------------------------------------------------------
 * Ce que cette campagne ajoute à ce qui existait déjà
 * ---------------------------------------------------------------------------
 *
 * Le projet posait déjà ses espaces insécables par règle
 * (`src/lib/typographie.ts`, décision D11) et la garde du catalogue rejouait
 * les 548 lignes des quinze fiches en exigeant l'égalité au caractère près.
 * Cela vérifie la SOURCE des données. Ce que cela ne vérifie pas, c'est le
 * RENDU : un `&nbsp;` oublié dans une page JSX, un montant composé par
 * concaténation, une phrase de composant écrite avec une espace ordinaire —
 * rien de tout cela ne passe par `typographier()`, donc rien de tout cela
 * n'était gardé.
 *
 * Cette campagne lit `document.body.innerText`, c'est-à-dire le texte tel que
 * le navigateur l'a composé, tous composants confondus. Elle reprend les
 * quatre familles de règles du site portfolio
 * (`Site web Freelance/scripts/verifier-typographie.mjs`), dont le motif était
 * un défaut de recette RÉEL et mesuré : à 360 px, « 6 982 » se coupait en deux
 * lignes et le lecteur lisait deux nombres là où il n'y en avait qu'un.
 *
 * ---------------------------------------------------------------------------
 * `innerText` plutôt que le HTML dépouillé, et ce que ça change
 * ---------------------------------------------------------------------------
 *
 * Le portfolio analyse ses fichiers `dist/*.html` en retirant les balises. Ici
 * la mesure se fait dans le navigateur, ce qui est à la fois plus simple et
 * plus juste : `innerText` ne contient ni scripts, ni styles, ni attributs, ni
 * balisage JSON-LD, il rend les entités déjà décodées, et il respecte
 * l'affichage — le texte d'un élément en `display: none` n'y figure pas, celui
 * d'un texte réservé aux lecteurs d'écran y figure, parce qu'il est lu.
 *
 * ---------------------------------------------------------------------------
 * LA CONVENTION EST U+00A0. U+202F est TOLÉRÉE EN LECTURE
 * ---------------------------------------------------------------------------
 *
 * Le projet n'écrit qu'une forme d'insécable, U+00A0, et `formaterEuros()`
 * normalise même celles que produit `Intl` — l'espace fine U+202F qu'il pose
 * devant le symbole monétaire est convertie (voir l'en-tête d'`argent.ts`). La
 * fine reste acceptée en lecture pour la même raison que sur le portfolio :
 * elle ne casse pas, et la garde ne signale que l'espace ORDINAIRE, celle qui
 * coupe.
 */

/* -------------------------------------------------------------------------- */
/* Les huit pages                                                             */
/* -------------------------------------------------------------------------- */

/**
 * DOUZE PAGES : huit choisies, quatre imposées par ce qu'on y a trouvé.
 *
 * Les HUIT premières sont celles de la campagne d'accessibilité, plus les deux
 * qui portent le plus de NOMBRES et d'UNITÉS du site : le barème d'expédition
 * (onze tranches, trois zones, des poids et des montants engendrés) et les
 * conditions générales de vente (des délais, des montants, des références
 * d'articles). Ce sont les pages où une espace ordinaire fautive avait le plus
 * de chances de se trouver.
 *
 * Les QUATRE SUIVANTES ont été ajoutées pendant la tranche, après un balayage
 * de reconnaissance des trente-six pages du site : ce sont celles qui
 * portaient réellement des fautes, et elles restent sous garde pour que la
 * correction ne se défasse pas. Le détail des vingt-huit fautes relevées est
 * dans le compte rendu de la tranche ; en deux mots, un titre de section, deux
 * libellés du tableau de bord, quinze légendes de tableau engendrées par un
 * même gabarit, et le texte des cinq modèles de courriels — lus de leurs
 * fichiers Markdown, ils ne passaient par aucune transformation.
 *
 * Les vingt-quatre pages restantes sont propres et ne sont pas gardées ici :
 * les quatorze autres fiches produit partagent le gabarit de la première, les
 * quatre autres documents légaux celui de la rétractation, et le reste ne
 * porte que de la prose déjà couverte ailleurs.
 */
const PAGES = [
  { chemin: '/', intitule: 'accueil' },
  { chemin: '/boutique', intitule: 'rayon' },
  { chemin: '/boutique/huile-olive-premiere-pression', intitule: 'fiche produit' },
  { chemin: '/panier', intitule: 'panier' },
  { chemin: '/gestion/commandes', intitule: 'espace marchand — commandes' },
  { chemin: '/retractation', intitule: 'droit de rétractation' },
  { chemin: '/livraison', intitule: 'livraison' },
  { chemin: '/conditions-generales-de-vente', intitule: 'conditions générales' },
  { chemin: '/donnees-personnelles', intitule: 'données personnelles' },
  { chemin: '/gestion', intitule: 'espace marchand — tableau de bord' },
  { chemin: '/gestion/catalogue', intitule: 'espace marchand — catalogue' },
  {
    chemin: '/gestion/modeles-de-courriels',
    intitule: 'espace marchand — modèles de courriels',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Les quatre familles de règles                                              */
/* -------------------------------------------------------------------------- */

/**
 * Les symboles d'unité liés au nombre qui les précède.
 *
 * MÊME LISTE FERMÉE que `src/lib/typographie.ts`, et pour la même raison : les
 * unités écrites en toutes lettres — « 4 pièces », « 18 mois » — se coupent en
 * fin de ligne sans dommage et ne sont pas liées. La négation qui suit chaque
 * symbole est ce qui évite le faux positif : dans « 500 grammes », le « g » est
 * suivi d'une lettre, ce n'est donc pas l'unité « g ».
 */
const SYMBOLES_UNITE = ['cl', 'l', 'L', 'ml', 'g', 'kg', 'mg', '%', '€', '°C'];

/** Les deux insécables admises en lecture, en classe de caractères. */
const CLASSE_INSECABLES = `${INSECABLE}${FINE_INSECABLE}`;

interface Regle {
  readonly code: string;
  readonly libelle: string;
  readonly motif: RegExp;
}

const REGLES: readonly Regle[] = [
  {
    code: 'milliers',
    libelle: 'groupe de milliers séparé par une espace ordinaire',
    motif: /\d \d{3}(?!\d)/g,
  },
  {
    code: 'unite',
    libelle: 'espace ordinaire avant une unité (€, %, g, kg, cl…)',
    motif: new RegExp(
      `\\d (?=(?:${SYMBOLES_UNITE.map(echapper).join('|')})(?![\\p{L}\\d]))`,
      'gu',
    ),
  },
  {
    code: 'ponctuation',
    /* Le `\S` de queue du portfolio est remplacé par une frontière de texte :
       `innerText` ayant déjà retiré les balises, un « : » suivi d'une fin de
       ligne ou d'une espace est bien de la ponctuation lue, et non la fin d'un
       attribut. */
    libelle: 'espace ordinaire avant une ponctuation haute (; : ? !)',
    motif: /[;:?!](?=\s|$)/g,
  },
  {
    code: 'guillemets',
    libelle: 'guillemet français sans espace insécable à l’intérieur',
    motif: new RegExp(`«[^${CLASSE_INSECABLES}]|[^${CLASSE_INSECABLES}]»`, 'g'),
  },
];

function echapper(motif: string): string {
  return motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Les quarante-cinq signes autour d'une faute, pour la reconnaître d'un œil. */
function extrait(texte: string, position: number): string {
  return texte
    .slice(Math.max(0, position - 45), position + 45)
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Les contrôles                                                              */
/* -------------------------------------------------------------------------- */

for (const { chemin, intitule } of PAGES) {
  test(`${intitule} (${chemin}) — insécables et apostrophes du texte rendu`, async ({
    page,
  }) => {
    await ouvrir(page, chemin);

    const texte = await page.locator('body').innerText();
    expect(texte.length, 'la page rend du texte').toBeGreaterThan(200);

    const fautes: string[] = [];

    for (const regle of REGLES) {
      /* Le motif de la ponctuation cherche la PONCTUATION précédée d'une
         espace ordinaire ; les trois autres cherchent l'espace elle-même. Un
         seul parcours suffit dans les deux cas, mais la règle de ponctuation
         doit d'abord vérifier que l'espace qui précède est bien ordinaire. */
      for (const trouve of texte.matchAll(regle.motif)) {
        const position = trouve.index;

        if (regle.code === 'ponctuation' && texte.charAt(position - 1) !== ' ') {
          continue;
        }

        fautes.push(`[${regle.code}] ${regle.libelle} — …${extrait(texte, position)}…`);
      }
    }

    expect(fautes, `${chemin} : espaces sécables là où le français demande une insécable`).toEqual([]);
  });

  test(`${intitule} (${chemin}) — aucune apostrophe droite`, async ({ page }) => {
    await ouvrir(page, chemin);

    const texte = await page.locator('body').innerText();
    const droites: string[] = [];

    for (const trouve of texte.matchAll(/'/g)) {
      droites.push(`…${extrait(texte, trouve.index)}…`);
    }

    /* L'apostrophe du français est U+2019, la courbe. La droite (U+0027) est un
       signe de code — celui qui délimite une chaîne en JavaScript — et sa
       présence dans un texte affiché signale toujours la même chose : une
       phrase écrite comme du code plutôt que comme du français. */
    expect(droites, `${chemin} : apostrophes droites dans le texte affiché`).toEqual([]);
  });
}
