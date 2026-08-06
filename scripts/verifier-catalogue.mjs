/**
 * Garde du catalogue — `npm run verifier-catalogue`
 *
 * ---------------------------------------------------------------------------
 * Ce que cette garde est, et pourquoi elle existe
 * ---------------------------------------------------------------------------
 *
 * Le catalogue est un fichier TypeScript écrit à la main. Le compilateur en
 * vérifie la FORME (les champs sont là, les types collent) mais rien de son
 * SENS : il laisserait passer deux produits avec le même SKU, un coffret
 * personnalisable dont la liste blanche ruine la marge, ou une apostrophe
 * droite au milieu d'une fiche. Ce script vérifie le sens.
 *
 * Il est de l'outillage : `zod` et `tsx` sont des dépendances de
 * DÉVELOPPEMENT et ne sont importés par aucun fichier de `src/`. Le site livré
 * ne les embarque pas, le budget JavaScript n'en sait rien.
 *
 * Choix de l'exécution : `tsx`. Le script est un `.mjs` qui importe le
 * catalogue TypeScript tel quel — même fichier que celui des pages, alias
 * `@/` compris, aucune copie ni aucune étape de compilation intermédiaire.
 * L'alternative (compiler `src/` vers un dossier temporaire avant de lire le
 * résultat) demandait une configuration de compilation séparée et un
 * nettoyage : plus de pièces mobiles pour le même service.
 *
 * ---------------------------------------------------------------------------
 * L'invariant du coffret « Composez le vôtre », et l'écart avec la commande
 * ---------------------------------------------------------------------------
 *
 * La revue des fiches proposait ceci : « un test doit échouer si 3 × (prix
 * maximal des pièces éligibles) > 3400 centimes, de même à cinq contre 5400 ».
 * Appliquée telle quelle au catalogue arrêté, cette formule échoue : la pièce
 * la plus chère de la liste blanche est l'huile d'olive 25 cl à 12,90 €, et
 * 3 × 1290 = 3870 dépasse le forfait de 3400. Elle échouerait aussi à cinq
 * (6450 contre 5400).
 *
 * La formule surestime le pire panier, parce qu'un client ne peut pas prendre
 * trois fois la même pièce la plus chère : le pire panier réel est la somme
 * des trois pièces éligibles les plus chères, soit 35,50 € — ce que la revue
 * elle-même a chiffré et assumé (« le pire cas actuel est absorbable »,
 * −1,50 € à trois pièces, −2,20 € à cinq).
 *
 * La garde vérifie donc le pire panier RÉEL, avec pour plafond l'écart déjà
 * assumé. C'est plus fin et strictement plus protecteur : ajouter l'huile de
 * noix 50 cl (28,00 €) à la liste porterait le pire panier à 52,60 € et
 * ferait échouer la garde, exactement comme le voulait la revue. Écrire une
 * règle qui échoue sur des données justes aurait eu l'effet inverse de celui
 * recherché : on l'aurait désactivée au bout de deux jours.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { CATALOGUE, PRODUITS_MIS_EN_AVANT } from '@/donnees/catalogue';
import { COMMANDES_AMORCE } from '@/donnees/commandes-amorce';
import { formaterEuros } from '@/lib/argent';
import { projeterCatalogue } from '@/lib/panier/catalogue-panier';
import { calculerTotaux } from '@/lib/panier/totaux';
import { PHRASES_RETRACTATION, regimeRetractation } from '@/lib/retractation';
import { typographier } from '@/lib/typographie';
import {
  FAMILLES,
  FORMES_ILLUSTRATION,
  TEINTES_ILLUSTRATION,
  exigeChaineDuFroid,
} from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Attendus du catalogue arrêté                                                */
/* -------------------------------------------------------------------------- */

const NOMBRE_PRODUITS = 15;

/**
 * Vingt-trois formats vendables, et non vingt-deux.
 *
 * Le décompte : vingt variantes pour les treize produits hors coffrets
 * (fiches 01 à 13), une pour le coffret « La table du dimanche », deux pour le
 * coffret « Composez le vôtre ». La commande de la tranche annonçait
 * vingt-deux, à la suite de la revue des fiches qui parlait de « 22 couples
 * format/prix » : c'est un décompte à corriger, pas des données à changer.
 */
const NOMBRE_SKU = 23;

const RESUME_MAXIMUM = 140;

/** Slugs des cinq mises en avant, tels que la revue des fiches les a arrêtés. */
const MISES_EN_AVANT_ATTENDUES = [
  'huile-olive-premiere-pression',
  'rillettes-canard-echalotes',
  'miel-bruyere-blanche',
  'fromage-fermier-brebis',
  'coffret-table-du-dimanche',
];

const SLUG_COFFRET_COMPOSE = 'coffret-composez-le-votre';
const SLUG_COFFRET_FIXE = 'coffret-table-du-dimanche';

/** Écart maximal toléré entre le pire panier et le forfait, par nombre de pièces. */
const ECART_MAXIMAL_PAR_PIECES = new Map([
  [3, 150],
  [5, 220],
]);

/** Régime de rétractation attendu, produit par produit. */
const FONDEMENT_ATTENDU = new Map([
  ['coffret-composez-le-votre', 'L221-28-3'],
  ['beurre-baratte-demi-sel', 'L221-28-4'],
  ['fromage-fermier-brebis', 'L221-28-4'],
  ['infusion-du-soir-sept-plantes', 'L221-28-5'],
]);

/* -------------------------------------------------------------------------- */
/* Schéma de forme                                                             */
/* -------------------------------------------------------------------------- */

const SKU = z.string().regex(/^MV-[A-Z]{2}-[A-Z]{3}-\d+(CL|G|P)$/);

const varianteSchema = z.strictObject({
  sku: SKU,
  format: z.string().min(2),
  prixCentimes: z.number().int().positive(),
  poidsGrammes: z.number().int().positive(),
  stock: z.number().int().min(8).max(60),
});

const conservationSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('stable'),
    ddmMois: z.number().int().positive(),
    note: z.string().min(10).optional(),
  }),
  z.strictObject({
    type: z.literal('perissable'),
    dlcJours: z.number().int().positive(),
    chaineDuFroid: z.literal(true),
  }),
  z.strictObject({ type: z.literal('scelle-hygiene') }),
]);

const produitSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nom: z.string().min(3),
  famille: z.enum(FAMILLES),
  resume: z.string().min(20).max(RESUME_MAXIMUM),
  description: z.array(z.string().min(40)).min(1),
  origine: z.string().min(3),
  ingredients: z.array(z.string().min(3)).min(1),
  allergenes: z.array(z.string().min(3)).min(1),
  conservation: conservationSchema,
  conseilConservation: z.array(z.string().min(40)).min(1),
  personnalisable: z.boolean(),
  variantes: z.array(varianteSchema).min(1),
  miseEnAvant: z.boolean(),
  illustration: z.strictObject({
    forme: z.enum(FORMES_ILLUSTRATION),
    teinte: z.enum(TEINTES_ILLUSTRATION),
  }),
  composition: z
    .array(z.strictObject({ sku: SKU, nom: z.string().min(5), prixCentimes: z.number().int().positive() }))
    .min(2)
    .optional(),
  piecesEligibles: z.array(SKU).min(3).optional(),
  /* Ajouté en C6. ABSENT du catalogue versionné — les quinze références sont en
     vente, et un champ posé quinze fois à `true` n'apprendrait rien. Il n'existe
     que lorsque la surcouche marchand l'a posé. Le schéma l'accepte pour que le
     jour où une référence sera réellement retirée de la vente dans le fichier,
     la garde ne le refuse pas comme un champ inconnu. */
  disponible: z.boolean().optional(),
});

/* -------------------------------------------------------------------------- */
/* Harnais                                                                     */
/* -------------------------------------------------------------------------- */

const controles = [];

function controle(intitule, executer) {
  const anomalies = [];
  const observations = [];

  const exiger = (condition, message) => {
    if (!condition) {
      anomalies.push(message);
    }
  };
  const noter = (message) => observations.push(message);

  try {
    executer(exiger, noter);
  } catch (erreur) {
    anomalies.push(`contrôle interrompu : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
  }

  controles.push({ intitule, anomalies, observations });
}

/* -------------------------------------------------------------------------- */
/* Outils de lecture                                                           */
/* -------------------------------------------------------------------------- */

const INSECABLE = String.fromCodePoint(0x00a0);

/** Toute la prose du catalogue, avec son emplacement, pour les contrôles de texte. */
function prose() {
  const morceaux = [];

  for (const produit of CATALOGUE) {
    const ajouter = (champ, texte) => morceaux.push({ ou: `${produit.slug} · ${champ}`, texte });

    ajouter('nom', produit.nom);
    ajouter('resume', produit.resume);
    ajouter('origine', produit.origine);
    produit.description.forEach((t, i) => ajouter(`description[${String(i)}]`, t));
    produit.ingredients.forEach((t, i) => ajouter(`ingredients[${String(i)}]`, t));
    produit.allergenes.forEach((t, i) => ajouter(`allergenes[${String(i)}]`, t));
    produit.conseilConservation.forEach((t, i) => ajouter(`conservation[${String(i)}]`, t));
    produit.variantes.forEach((v) => ajouter(`format ${v.sku}`, v.format));
    if (produit.conservation.type === 'stable' && produit.conservation.note !== undefined) {
      ajouter('conservation.note', produit.conservation.note);
    }
    for (const piece of produit.composition ?? []) {
      ajouter(`composition ${piece.sku}`, piece.nom);
    }
  }

  PHRASES_RETRACTATION.forEach((texte, i) =>
    morceaux.push({ ou: `retractation.ts · phrase[${String(i)}]`, texte }),
  );

  return morceaux;
}

/** « 25 cl » → { quantite: 25, unite: 'cl' } ; « 4 pièces » → { quantite: 4, unite: 'pièces' }. */
function lireFormat(format) {
  const correspondance = /^(\d+) (cl|g|pièces)$/u.exec(format.replaceAll(INSECABLE, ' '));

  if (correspondance === null) {
    return undefined;
  }

  return { quantite: Number(correspondance[1]), unite: correspondance[2] };
}

const parSku = new Map();
for (const produit of CATALOGUE) {
  for (const variante of produit.variantes) {
    parSku.set(variante.sku, { produit, variante });
  }
}

/* -------------------------------------------------------------------------- */
/* Les contrôles                                                               */
/* -------------------------------------------------------------------------- */

controle('forme des quinze produits (schéma zod)', (exiger) => {
  for (const produit of CATALOGUE) {
    const resultat = produitSchema.safeParse(produit);
    exiger(
      resultat.success,
      `${produit.slug} : ${resultat.success ? '' : resultat.error.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join(' | ')}`,
    );
  }
});

controle('quinze références, slugs uniques', (exiger, noter) => {
  exiger(
    CATALOGUE.length === NOMBRE_PRODUITS,
    `${String(CATALOGUE.length)} produits au lieu de ${String(NOMBRE_PRODUITS)}`,
  );

  const slugs = CATALOGUE.map((produit) => produit.slug);
  const uniques = new Set(slugs);
  exiger(uniques.size === slugs.length, `slugs en double : ${slugs.join(', ')}`);
  noter(`${String(uniques.size)} slugs distincts`);
});

controle('vingt-trois formats, SKU uniques', (exiger, noter) => {
  const skus = CATALOGUE.flatMap((produit) => produit.variantes.map((v) => v.sku));
  const uniques = new Set(skus);

  exiger(
    skus.length === NOMBRE_SKU,
    `${String(skus.length)} formats au lieu de ${String(NOMBRE_SKU)}`,
  );
  exiger(uniques.size === skus.length, 'au moins un SKU apparaît deux fois');
  noter(`${String(uniques.size)} SKU distincts`);
});

controle('les sept familles sont servies', (exiger, noter) => {
  for (const famille of FAMILLES) {
    const compte = CATALOGUE.filter((produit) => produit.famille === famille).length;
    exiger(compte > 0, `la famille ${famille} est vide : elle produirait un rayon sans carte`);
  }
  noter(`familles : ${FAMILLES.join(', ')}`);
});

controle(`résumés de ${String(RESUME_MAXIMUM)} signes au plus`, (exiger, noter) => {
  let maximum = 0;

  for (const produit of CATALOGUE) {
    const longueur = [...produit.resume].length;
    maximum = Math.max(maximum, longueur);
    exiger(
      longueur <= RESUME_MAXIMUM,
      `${produit.slug} : résumé de ${String(longueur)} signes`,
    );
  }

  noter(`le plus long fait ${String(maximum)} signes`);
});

controle('chaque produit a au moins un format vendable', (exiger) => {
  for (const produit of CATALOGUE) {
    exiger(produit.variantes.length >= 1, `${produit.slug} : aucune variante`);
  }
});

controle('les prix sont dégressifs à mesure que le format grandit', (exiger, noter) => {
  const multiFormats = CATALOGUE.filter((produit) => produit.variantes.length > 1);

  for (const produit of multiFormats) {
    const lus = produit.variantes.map((variante) => {
      const format = lireFormat(variante.format);
      return format === undefined ? undefined : { ...format, prix: variante.prixCentimes };
    });

    if (lus.includes(undefined)) {
      exiger(false, `${produit.slug} : format illisible parmi ${produit.variantes.map((v) => v.format).join(', ')}`);
      continue;
    }

    const unites = new Set(lus.map((l) => l.unite));
    exiger(unites.size === 1, `${produit.slug} : formats exprimés dans deux unités différentes`);

    const tries = [...lus].sort((a, b) => a.quantite - b.quantite);
    for (let i = 1; i < tries.length; i += 1) {
      const precedent = tries[i - 1];
      const courant = tries[i];
      const avant = precedent.prix / precedent.quantite;
      const apres = courant.prix / courant.quantite;
      exiger(
        apres < avant,
        `${produit.slug} : le format ${String(courant.quantite)} ${courant.unite} n'est pas plus avantageux que le ${String(precedent.quantite)} ${precedent.unite}`,
      );
    }
  }

  noter(`${String(multiFormats.length)} produits multi-formats contrôlés`);
});

controle('coffret « Composez le vôtre » : le forfait tient', (exiger, noter) => {
  const coffret = CATALOGUE.find((produit) => produit.slug === SLUG_COFFRET_COMPOSE);
  exiger(coffret !== undefined, `produit ${SLUG_COFFRET_COMPOSE} introuvable`);

  if (coffret === undefined) {
    return;
  }

  const eligibles = coffret.piecesEligibles ?? [];
  exiger(eligibles.length > 0, 'la liste blanche est vide');

  const prixEligibles = [];

  for (const sku of eligibles) {
    const reference = parSku.get(sku);
    exiger(reference !== undefined, `pièce éligible inconnue : ${sku}`);

    if (reference === undefined) {
      continue;
    }

    exiger(
      !exigeChaineDuFroid(reference.produit.conservation),
      `pièce éligible périssable : ${sku} — elle imposerait l'isotherme et la restriction métropole à tout le coffret`,
    );
    exiger(
      !reference.produit.personnalisable,
      `pièce éligible elle-même personnalisable : ${sku}`,
    );
    exiger(
      reference.produit.slug !== coffret.slug,
      `le coffret se contient lui-même : ${sku}`,
    );

    prixEligibles.push(reference.variante.prixCentimes);
  }

  const decroissants = [...prixEligibles].sort((a, b) => b - a);

  for (const variante of coffret.variantes) {
    const format = lireFormat(variante.format);
    exiger(format !== undefined, `format de coffret illisible : ${variante.format}`);

    if (format === undefined) {
      continue;
    }

    const plafond = ECART_MAXIMAL_PAR_PIECES.get(format.quantite);
    exiger(
      plafond !== undefined,
      `aucun écart maximal défini pour un coffret de ${String(format.quantite)} pièces`,
    );

    if (plafond === undefined) {
      continue;
    }

    exiger(
      decroissants.length >= format.quantite,
      `moins de ${String(format.quantite)} pièces éligibles`,
    );

    const pirePanier = decroissants
      .slice(0, format.quantite)
      .reduce((total, prix) => total + prix, 0);
    const ecart = pirePanier - variante.prixCentimes;

    exiger(
      ecart <= plafond,
      `${String(format.quantite)} pièces : pire panier à ${formaterEuros(pirePanier)} pour un forfait à ${formaterEuros(variante.prixCentimes)}, soit ${formaterEuros(ecart)} d'écart — plafond assumé ${formaterEuros(plafond)}`,
    );

    noter(
      `${String(format.quantite)} pièces : pire panier ${formaterEuros(pirePanier)} contre forfait ${formaterEuros(variante.prixCentimes)} (écart ${formaterEuros(ecart)}, plafond ${formaterEuros(plafond)})`,
    );
  }
});

/**
 * Contrôle ajouté en C4 — LA CONVENTION QUE LE PANIER EXPLOITE.
 *
 * `nombreDePiecesAChoisir()` (src/lib/panier/catalogue-panier.ts) lit le
 * nombre de pièces d'un coffret personnalisable EN TÊTE DE SON FORMAT :
 * « 3 pièces » donne trois cases à cocher obligatoires, « 5 pièces » en donne
 * cinq. Le catalogue arrêté en C2 ne porte pas de champ dédié, et l'ajouter
 * aurait rouvert les quinze fiches et le schéma zod pour une seule référence.
 *
 * La convention est donc GARDÉE ICI plutôt que supposée là-bas. Un format
 * renommé « coffret de trois » ferait échouer cette garde — au lieu de laisser
 * l'interface exiger `null` pièce et le bouton d'ajout rester éteint sans que
 * personne ne comprenne pourquoi.
 */
controle('coffrets personnalisables : le format annonce son nombre de pièces', (exiger, noter) => {
  const personnalisables = CATALOGUE.filter((produit) => produit.personnalisable);

  exiger(
    personnalisables.length > 0,
    'aucun produit personnalisable : ce contrôle ne garde plus rien',
  );

  for (const produit of personnalisables) {
    for (const variante of produit.variantes) {
      const tete = /^(\d+)/.exec(variante.format);

      exiger(
        tete !== null,
        `${produit.slug} · ${variante.sku} : le format « ${variante.format} » ne commence pas par un nombre, le panier ne saura pas combien de pièces exiger`,
      );

      if (tete !== null) {
        noter(`${variante.sku} : ${tete[1]} pièces à choisir`);
      }
    }
  }
});

controle('coffret « La table du dimanche » : composition fidèle', (exiger, noter) => {
  const coffret = CATALOGUE.find((produit) => produit.slug === SLUG_COFFRET_FIXE);
  exiger(coffret !== undefined, `produit ${SLUG_COFFRET_FIXE} introuvable`);

  if (coffret === undefined) {
    return;
  }

  const composition = coffret.composition ?? [];
  exiger(composition.length === 4, `${String(composition.length)} pièces au lieu de 4`);

  let somme = 0;

  for (const piece of composition) {
    const reference = parSku.get(piece.sku);
    exiger(reference !== undefined, `pièce inconnue : ${piece.sku}`);

    if (reference === undefined) {
      continue;
    }

    exiger(
      reference.variante.prixCentimes === piece.prixCentimes,
      `${piece.sku} : prix de la pièce (${formaterEuros(piece.prixCentimes)}) différent du prix catalogue (${formaterEuros(reference.variante.prixCentimes)})`,
    );
    exiger(
      reference.produit.conservation.type === 'stable',
      `${piece.sku} : pièce non stable dans un coffret qui voyage sans contrainte de température`,
    );

    somme += piece.prixCentimes;
  }

  const prixCoffret = coffret.variantes[0].prixCentimes;
  exiger(
    prixCoffret > somme,
    `le coffret (${formaterEuros(prixCoffret)}) coûte moins que ses pièces (${formaterEuros(somme)}) : l'écart affiché serait négatif`,
  );

  noter(
    `pièces ${formaterEuros(somme)}, coffret ${formaterEuros(prixCoffret)}, écart ${formaterEuros(prixCoffret - somme)}`,
  );
});

controle('quinze vignettes toutes distinctes', (exiger, noter) => {
  const combinaisons = CATALOGUE.map(
    (produit) => `${produit.illustration.forme} · ${produit.illustration.teinte}`,
  );
  const uniques = new Set(combinaisons);

  for (const combinaison of uniques) {
    const porteurs = CATALOGUE.filter(
      (produit) => `${produit.illustration.forme} · ${produit.illustration.teinte}` === combinaison,
    );
    exiger(
      porteurs.length === 1,
      `${combinaison} : ${porteurs.map((p) => p.slug).join(' et ')} rendraient la même vignette`,
    );
  }

  noter(`${String(uniques.size)} combinaisons forme × teinte sur ${String(FORMES_ILLUSTRATION.length * TEINTES_ILLUSTRATION.length)} possibles`);
});

controle('apostrophes typographiques partout', (exiger) => {
  for (const { ou, texte } of prose()) {
    exiger(!texte.includes("'"), `${ou} : apostrophe droite (U+0027) dans « ${extrait(texte, "'")} »`);
  }
});

controle('espaces insécables posées', (exiger, noter) => {
  let controles = 0;

  for (const { ou, texte } of prose()) {
    controles += 1;
    exiger(
      typographier(texte) === texte,
      `${ou} : une espace ordinaire subsiste là où la typographie française demande une insécable`,
    );
  }

  noter(`${String(controles)} textes contrôlés`);
});

controle('aucun emoji', (exiger) => {
  for (const { ou, texte } of prose()) {
    exiger(
      !/\p{Extended_Pictographic}/u.test(texte),
      `${ou} : caractère pictographique interdit`,
    );
  }
});

controle('cinq mises en avant, celles de la revue', (exiger, noter) => {
  const slugs = PRODUITS_MIS_EN_AVANT.map((produit) => produit.slug);

  exiger(slugs.length === 5, `${String(slugs.length)} mises en avant au lieu de 5`);

  for (const attendu of MISES_EN_AVANT_ATTENDUES) {
    exiger(slugs.includes(attendu), `mise en avant manquante : ${attendu}`);
  }

  for (const slug of slugs) {
    exiger(MISES_EN_AVANT_ATTENDUES.includes(slug), `mise en avant non prévue : ${slug}`);
  }

  const familles = new Set(PRODUITS_MIS_EN_AVANT.map((produit) => produit.famille));
  exiger(familles.size === 5, `les cinq mises en avant couvrent ${String(familles.size)} familles au lieu de 5`);

  noter(slugs.join(', '));
});

controle('rétractation : le bon fondement sur le bon produit', (exiger, noter) => {
  const comptes = new Map();

  for (const produit of CATALOGUE) {
    const regime = regimeRetractation(produit);
    const attendu = FONDEMENT_ATTENDU.get(produit.slug) ?? null;

    exiger(
      regime.fondement === attendu,
      `${produit.slug} : fondement ${String(regime.fondement)} au lieu de ${String(attendu)}`,
    );
    exiger(
      regime.ouvreDroit === (attendu === null),
      `${produit.slug} : ouvreDroit incohérent avec le fondement`,
    );
    exiger(regime.phrase.length > 60, `${produit.slug} : phrase de rétractation trop courte`);

    const cle = String(regime.fondement);
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
  }

  noter(
    [...comptes.entries()]
      .map(([fondement, compte]) => `${fondement === 'null' ? 'droit ouvert' : fondement} : ${String(compte)}`)
      .join(' | '),
  );
});

/**
 * Contrôle ajouté en C6 — LE JEU D'ESSAI CONTRE LE CATALOGUE.
 *
 * Les six commandes d'amorce portent leurs trois montants ÉCRITS EN DUR : c'est
 * la sémantique de `Commande.totaux`, des montants FIGÉS au paiement. Ce
 * contrôle les recalcule avec `calculerTotaux()` — la même fonction que le
 * panier et le récapitulatif — et exige l'égalité au centime.
 *
 * Sa place est ici, dans la garde du CATALOGUE, et pas seulement dans les tests
 * unitaires (où il figure aussi). La raison : ce contrôle n'attrape pas une
 * faute de frappe dans le jeu d'essai, il attrape le jour où quelqu'un modifie
 * un PRIX DU CATALOGUE sous une commande figée. C'est un contrôle de cohérence
 * du catalogue, il doit échouer là où l'on vient de toucher au catalogue.
 */
controle('jeu d’essai : les six totaux se recalculent au centime', (exiger, noter) => {
  const projete = projeterCatalogue(CATALOGUE);
  const skus = new Set(projete.map((article) => article.sku));

  exiger(COMMANDES_AMORCE.length === 6, `${String(COMMANDES_AMORCE.length)} commandes d'amorce au lieu de 6`);

  for (const commande of COMMANDES_AMORCE) {
    for (const calculee of commande.lignes) {
      exiger(
        skus.has(calculee.article.sku),
        `${commande.reference} : SKU inconnu ${calculee.article.sku}`,
      );
    }

    const recalcule = calculerTotaux(
      commande.lignes.map((calculee) => calculee.ligne),
      projete,
      commande.zone,
    );

    if (recalcule.expedition.statut !== 'calcule') {
      exiger(false, `${commande.reference} : expédition devenue impossible (${recalcule.expedition.motif})`);
      continue;
    }

    const attendus = commande.totaux;
    const obtenus = {
      sousTotal: recalcule.sousTotalCentimes,
      port: recalcule.expedition.fraisCentimes,
      total: recalcule.totalCentimes,
    };

    for (const champ of ['sousTotal', 'port', 'total']) {
      exiger(
        obtenus[champ] === attendus[champ],
        `${commande.reference} · ${champ} : ${formaterEuros(attendus[champ])} écrit, ${formaterEuros(obtenus[champ])} recalculé — un prix du catalogue a bougé sous une commande figée`,
      );
    }

    noter(
      `${commande.reference} (${commande.etat}, ${commande.zone}) : ${formaterEuros(attendus.total)}`,
    );
  }
});

controle('les règles typographiques rejouent les quinze fiches', (exiger, noter) => {
  const dossier = fileURLToPath(new URL('../contenu/fiches-brouillons/', import.meta.url));

  if (!existsSync(dossier)) {
    noter('fiches absentes : contrôle passé');
    return;
  }

  let lignes = 0;

  for (const nom of readdirSync(dossier).filter((n) => /^(?:0[1-9]|1[0-5])-/.test(n))) {
    for (const ligne of readFileSync(dossier + nom, 'utf8').split('\n')) {
      if (ligne.trim() === '') {
        continue;
      }

      lignes += 1;
      exiger(
        typographier(ligne.replaceAll(INSECABLE, ' ')) === ligne,
        `${nom} : la règle typographique ne redonne pas « ${ligne.slice(0, 60)} »`,
      );
    }
  }

  noter(`${String(lignes)} lignes de fiches rejouées à l'identique`);
});

/* -------------------------------------------------------------------------- */
/* Rapport                                                                     */
/* -------------------------------------------------------------------------- */

function extrait(texte, aiguille) {
  const position = texte.indexOf(aiguille);
  return position === -1 ? texte.slice(0, 60) : texte.slice(Math.max(0, position - 25), position + 25);
}

const enEchec = controles.filter((c) => c.anomalies.length > 0);

console.log('');
console.log('Garde du catalogue — Maison Vaubrune');
console.log('-'.repeat(72));

for (const { intitule, anomalies, observations } of controles) {
  console.log(`${anomalies.length === 0 ? '[ OK   ]' : '[ ÉCHEC]'} ${intitule}`);

  for (const observation of observations) {
    console.log(`          ${observation}`);
  }

  for (const anomalie of anomalies) {
    console.log(`   -> ${anomalie}`);
  }
}

console.log('-'.repeat(72));

if (enEchec.length === 0) {
  console.log(`${String(controles.length)} contrôles, aucune anomalie.`);
  console.log('');
} else {
  console.log(
    `${String(controles.length)} contrôles, ${String(enEchec.length)} en échec : ${enEchec.map((c) => c.intitule).join(' ; ')}`,
  );
  console.log('');
  process.exitCode = 1;
}
