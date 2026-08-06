import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { ouvrir } from './aides';

/**
 * AUCUN LIEN MORT — le filet que `typedRoutes` ne fournit pas.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce test est OBLIGATOIRE, et depuis quand on le sait
 * ---------------------------------------------------------------------------
 *
 * Le projet active `typedRoutes` (Next 15.5) et il serait naturel de croire
 * que le compilateur refuse un `<Link href="/page-qui-n-existe-pas">`. Il ne
 * le fait pas : vérifié deux fois sur cette installation en janvier, puis
 * consigné dans `next.config.ts` et dans les points d'attention du projet.
 * `typedRoutes` engendre des types de PARAMÈTRES d'URL ; il ne restreint pas
 * l'attribut `href` d'un lien. Un lien vers une route inexistante passe
 * `tsc --noEmit` comme `next build`, et ne se découvre qu'au clic.
 *
 * D'où cette campagne, annoncée depuis la tranche C1 et livrée ici. Elle ne
 * suppose rien du compilateur : elle CLIQUE — enfin, elle demande — et lit le
 * code de réponse.
 *
 * ---------------------------------------------------------------------------
 * La méthode : un parcours en largeur depuis l'accueil
 * ---------------------------------------------------------------------------
 *
 * On part de `/`, on relève tous les `href` commençant par `/`, on visite ce
 * qu'on n'a pas encore vu, et on recommence. Chaque page atteinte est HYDRATÉE
 * avant d'être lue : les liens de l'espace marchand vers le détail d'une
 * commande n'existent qu'après que l'îlot a relu le stockage, et une collecte
 * faite trop tôt les manquerait tous.
 *
 * Ce parcours ne prétend pas atteindre TOUTES les pages du site, et c'est une
 * propriété et non une limite : il atteint exactement celles vers lesquelles
 * un visiteur peut cliquer. Les écrans du tunnel de paiement qui n'existent
 * qu'avec un panier rempli en sont donc absents — ils sont parcourus par
 * `parcours.spec.ts`, qui les traverse pour de bon.
 *
 * ---------------------------------------------------------------------------
 * « 200, ou 308 puis 200 »
 * ---------------------------------------------------------------------------
 *
 * Les redirections ne sont PAS suivies automatiquement : une adresse qui
 * répond 308 est une adresse qu'un moteur de recherche et un lecteur de flux
 * traiteront différemment d'un 200, et la confondre avec un 200 masquerait un
 * lien vers `/boutique/` là où le site publie `/boutique`. La redirection est
 * donc constatée, suivie d'un pas, et sa cible doit répondre 200.
 */

/** Adresses hors du site, jamais suivies : ce test garde le site, pas le web. */
function estInterne(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Les fichiers servis depuis `public/`, atteints par un lien de téléchargement.
 * Ils répondent 200 comme une page, mais ne portent pas de lien à leur tour :
 * on les vérifie sans les explorer.
 */
function estFichier(chemin: string): boolean {
  return /\.[a-z0-9]{2,4}$/i.test(chemin);
}

interface Reponse {
  readonly statut: number;
  readonly parRedirection: boolean;
}

/**
 * Le code de réponse d'une adresse, avec au plus UNE redirection suivie.
 *
 * Une chaîne de plusieurs redirections serait signalée : elle coûte un
 * aller-retour au visiteur pour rien, et elle est presque toujours le signe
 * d'un lien mal écrit plutôt que d'une intention.
 */
async function interroger(requete: APIRequestContext, adresse: string): Promise<Reponse> {
  const premiere = await requete.get(adresse, { maxRedirects: 0 });

  if (premiere.status() < 300 || premiere.status() >= 400) {
    return { statut: premiere.status(), parRedirection: false };
  }

  const cible = premiere.headers()['location'] ?? '';
  const seconde = await requete.get(cible, { maxRedirects: 0 });

  return { statut: seconde.status(), parRedirection: true };
}

/** Les `href` internes d'une page, dédoublonnés, ancres comprises. */
async function liensDeLaPage(page: Page): Promise<readonly string[]> {
  const href = await page.locator('a[href]').evaluateAll((liens) =>
    liens.map((lien) => lien.getAttribute('href') ?? ''),
  );

  return [...new Set(href.filter(estInterne))];
}

/* -------------------------------------------------------------------------- */
/* Le parcours                                                                 */
/* -------------------------------------------------------------------------- */

test('aucun lien interne mort, depuis l’accueil et de proche en proche', async ({
  page,
  request,
}) => {
  const aVisiter = ['/'];
  const visitees = new Set<string>();
  /** Adresse citée → pages qui la citent, pour nommer le coupable. */
  const provenance = new Map<string, string[]>();
  const ancres = new Map<string, string[]>();

  while (aVisiter.length > 0) {
    const chemin = aVisiter.shift() ?? '';

    if (visitees.has(chemin)) {
      continue;
    }
    visitees.add(chemin);

    await ouvrir(page, chemin);

    for (const href of await liensDeLaPage(page)) {
      const [adresse, ancre] = separerAncre(href);

      if (ancre !== '') {
        const cible = adresse === '' ? chemin : adresse;
        ancres.set(`${cible}#${ancre}`, [...(ancres.get(`${cible}#${ancre}`) ?? []), chemin]);
      }

      if (adresse === '' || visitees.has(adresse)) {
        continue;
      }

      provenance.set(adresse, [...(provenance.get(adresse) ?? []), chemin]);

      if (!estFichier(adresse) && !aVisiter.includes(adresse)) {
        aVisiter.push(adresse);
      }
    }
  }

  /* Les fichiers de `public/` ne sont pas explorés mais doivent répondre. */
  const aInterroger = [...new Set([...visitees, ...provenance.keys()])].sort();
  const morts: string[] = [];

  for (const adresse of aInterroger) {
    const { statut, parRedirection } = await interroger(request, adresse);

    if (statut !== 200) {
      const cites = provenance.get(adresse) ?? ['(point de départ)'];
      morts.push(
        `${adresse} → ${String(statut)}${parRedirection ? ' (après redirection)' : ''}` +
          ` — cité par ${cites.join(', ')}`,
      );
    }
  }

  expect(morts, 'liens internes qui ne répondent pas 200').toEqual([]);

  /* Le parcours doit avoir atteint le site, pas seulement l'accueil : une
     collecte qui échouerait silencieusement rendrait ce test toujours vert. */
  expect(visitees.size).toBeGreaterThan(20);
});

/**
 * LES ANCRES : la cible doit exister DANS LE DOM de sa page.
 *
 * Un `href="/conditions-generales-de-vente#article-8"` peut parfaitement
 * répondre 200 et ne mener nulle part — le navigateur reste alors en haut de
 * la page, sans rien dire. C'est le lien mort le plus discret du web, et le
 * seul que le code de réponse ne détecte pas.
 */
test('aucune ancre interne sans cible dans le DOM', async ({ page }) => {
  const aVisiter = ['/'];
  const visitees = new Set<string>();
  const attendues = new Map<string, Set<string>>();

  while (aVisiter.length > 0) {
    const chemin = aVisiter.shift() ?? '';

    if (visitees.has(chemin)) {
      continue;
    }
    visitees.add(chemin);

    await ouvrir(page, chemin);

    for (const href of await liensDeLaPage(page)) {
      const [adresse, ancre] = separerAncre(href);
      const cible = adresse === '' ? chemin : adresse;

      if (ancre !== '') {
        attendues.set(cible, (attendues.get(cible) ?? new Set()).add(ancre));
      }

      if (adresse !== '' && !estFichier(adresse) && !visitees.has(adresse) && !aVisiter.includes(adresse)) {
        aVisiter.push(adresse);
      }
    }
  }

  const orphelines: string[] = [];

  for (const [cible, noms] of [...attendues.entries()].sort()) {
    await ouvrir(page, cible);

    const presentes = await page.evaluate(
      () => [...document.querySelectorAll('[id]')].map((element) => element.id),
    );
    const connues = new Set(presentes);

    for (const nom of [...noms].sort()) {
      /* `#contenu` est posé sur la balise `<main>` de la mise en page racine :
         il existe sur toutes les pages, et c'est le lien d'évitement qui le
         vise. Il est vérifié comme les autres, sans exception. */
      if (!connues.has(nom)) {
        orphelines.push(`${cible}#${nom}`);
      }
    }
  }

  expect(orphelines, 'ancres dont la cible n’existe pas dans la page').toEqual([]);
});

/**
 * CHAQUE PAGE PUBLIÉE DIT QU'ELLE EST UNE DÉMONSTRATION.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi cette vérification est ici plutôt que dans un script
 * ---------------------------------------------------------------------------
 *
 * La description d'une page est ce qu'un moteur de recherche affiche sous son
 * titre. C'est, pour beaucoup de visiteurs, la PREMIÈRE phrase du site qu'ils
 * liront — souvent la seule, s'ils ne cliquent pas. Une fiche produit qui y
 * vante une huile d'olive sans dire qu'elle n'existe pas laisse exactement le
 * malentendu que ce projet passe son temps à écarter.
 *
 * La liste des pages n'est pas recopiée : elle est LUE DANS LE PLAN DU SITE,
 * c'est-à-dire dans ce que le site déclare lui-même publier. Une page ajoutée
 * au plan entre donc sous garde sans qu'on ait à y penser. Les pages hors plan
 * — le tunnel de commande, l'espace marchand — sont énumérées à côté, parce
 * qu'elles sont précisément celles qui ne se déclarent nulle part.
 *
 * Un script séparé aurait dû réimplémenter la lecture du plan, le rendu des
 * métadonnées et l'analyse du HTML. Le navigateur fait déjà les trois.
 */
const PAGES_HORS_PLAN = [
  '/panier',
  '/commande',
  '/commande/confirmation',
  '/commande/annulee',
  '/paiement/simulation',
  '/gestion',
  '/gestion/commandes',
  '/gestion/catalogue',
  '/gestion/modeles-de-courriels',
  '/gestion/prise-en-main',
] as const;

test('chaque description de page porte le mot « démonstration »', async ({
  page,
  request,
}) => {
  const plan = await (await request.get('/sitemap.xml')).text();
  const declarees = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (trouve) => new URL(trouve[1] ?? '').pathname,
  );

  expect(declarees.length, 'le plan du site déclare des adresses').toBeGreaterThan(20);

  const muettes: string[] = [];

  for (const chemin of [...declarees, ...PAGES_HORS_PLAN]) {
    await page.goto(chemin);

    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';

    if (!description.toLowerCase().includes('démonstration')) {
      muettes.push(`${chemin} → « ${description} »`);
    }
  }

  expect(muettes, 'pages dont la description ne dit pas qu’il s’agit d’une démonstration').toEqual(
    [],
  );
});

/** « /page#ancre » découpé en ses deux moitiés ; l'une ou l'autre peut manquer. */
function separerAncre(href: string): readonly [string, string] {
  const rang = href.indexOf('#');

  if (rang === -1) {
    return [href, ''];
  }

  return [href.slice(0, rang), decodeURIComponent(href.slice(rang + 1))];
}
