import { typographier } from '@/lib/typographie';
import type { PieceCoffret, Produit, Variante } from '@/lib/types';

/**
 * LE CATALOGUE. Quinze références, vingt-trois formats vendables.
 *
 * ---------------------------------------------------------------------------
 * Doctrine de ce fichier — à lire avant d'y toucher
 * ---------------------------------------------------------------------------
 *
 * 1. SOURCE UNIQUE. Décision D2 : ni base de données, ni service externe. Ce
 *    fichier versionné EST le catalogue. Une boutique livrée le remplacerait
 *    par un dépôt (voir `src/lib/catalogue.ts`) ; la démonstration, elle,
 *    superpose au besoin une surcouche en mémoire, sans jamais réécrire ceci.
 *
 * 2. LES PRIX SONT SAISIS, JAMAIS CALCULÉS. Les deux coffrets le prouvent : le
 *    coffret « La table du dimanche » vaut 46,00 € quand ses quatre pièces
 *    valent 40,10 € achetées séparément, et le coffret « Composez le vôtre »
 *    est au forfait quelle que soit la combinaison. Un catalogue qui déduirait
 *    le prix d'un coffret de ses pièces afficherait un prix faux dans les deux
 *    cas. La composition sert à l'affichage et aux champs dérivés, jamais au
 *    prix.
 *
 * 3. `prixCentimes` EST UN ENTIER RECOPIÉ. Il vient du frontmatter des fiches
 *    (`contenu/fiches-brouillons/`), où le rédacteur l'a écrit à la main pour
 *    cette raison précise : en JavaScript, `12.90 * 100` vaut
 *    1289,9999999999998, et un `Math.round` en aval masquerait le problème
 *    sans le supprimer. Aucune multiplication n'intervient ici, ni ailleurs.
 *
 * 4. LA PROSE EST CELLE DU RÉDACTEUR. Les textes sont repris des quinze
 *    fiches sans réécriture. Trois retraits, et trois seulement : les phrases
 *    qui énoncent le régime de rétractation ont été ôtées des fiches 11, 12,
 *    13 et 15, parce qu'elles sont désormais produites par
 *    `src/lib/retractation.ts` — source unique, pour qu'une correction de
 *    mention légale n'ait jamais à être faite quinze fois.
 *
 * 5. AUCUN CARACTÈRE INVISIBLE. Les textes s'écrivent ici avec des espaces
 *    ordinaires ; les insécables sont posées par `typographier()`, dont les
 *    règles ont été calées sur les quinze fiches et redonnent leur prose au
 *    caractère près. Les apostrophes typographiques (U+2019), elles, restent
 *    en littéral : on les voit.
 *
 * 6. LES STOCKS SONT INVENTÉS, et c'est le seul champ qui le soit. Valeurs
 *    plausibles pour une petite maison — de 8 à 60 unités, resserrées sur les
 *    produits frais qui se fabriquent à la semaine. Aucun mouvement de stock
 *    n'existe derrière : la démonstration ne prétend pas gérer un entrepôt.
 *
 * 7. TARE DU VINAIGRE, ANOMALIE ASSUMÉE. Le vinaigre en 50 cl part à 940 g
 *    quand les huiles au même volume partent à 950 g : 435 g de tare contre
 *    492 g. La revue des fiches a posé la question ; la réponse retenue est
 *    qu'il s'agit d'une SECONDE RÉFÉRENCE DE BOUTEILLE, plus légère, et non
 *    d'un poids à réaligner. Le moteur de frais de port (tranche C3) travaille
 *    donc sur deux gabarits de bouteille, ce qui est banal chez un embouteilleur.
 *
 * 8. LE PRIX AU KILO N'EST PAS AFFICHÉ. Le confit d'oignons en 110 g ressort à
 *    58,18 €/kg, au-dessus de la terrine 180 g : c'est structurel, un petit
 *    bocal pèse presque autant vide que plein. L'anomalie n'existerait que si
 *    la boutique affichait un prix à l'unité de mesure. Elle ne l'affiche pas.
 */

/* -------------------------------------------------------------------------- */
/* Pose des insécables                                                         */
/* -------------------------------------------------------------------------- */

function typographierVariante(variante: Variante): Variante {
  return { ...variante, format: typographier(variante.format) };
}

function typographierPiece(piece: PieceCoffret): PieceCoffret {
  return { ...piece, nom: typographier(piece.nom) };
}

function typographierProduit(produit: Produit): Produit {
  const [premiere, ...suivantes] = produit.variantes;
  const variantes: readonly [Variante, ...Variante[]] = [
    typographierVariante(premiere),
    ...suivantes.map(typographierVariante),
  ];

  const conservation =
    produit.conservation.type === 'stable' && produit.conservation.note !== undefined
      ? { ...produit.conservation, note: typographier(produit.conservation.note) }
      : produit.conservation;

  const rendu: Produit = {
    ...produit,
    nom: typographier(produit.nom),
    resume: typographier(produit.resume),
    description: produit.description.map((texte) => typographier(texte)),
    origine: typographier(produit.origine),
    ingredients: produit.ingredients.map((texte) => typographier(texte)),
    allergenes: produit.allergenes.map((texte) => typographier(texte)),
    conseilConservation: produit.conseilConservation.map((texte) => typographier(texte)),
    conservation,
    variantes,
  };

  return produit.composition === undefined
    ? rendu
    : { ...rendu, composition: produit.composition.map(typographierPiece) };
}

/* -------------------------------------------------------------------------- */
/* Les quinze références                                                       */
/* -------------------------------------------------------------------------- */

const REFERENCES: readonly Produit[] = [
  {
    slug: 'huile-olive-premiere-pression',
    nom: 'Huile d’olive de première pression',
    famille: 'huiles-et-vinaigres',
    resume:
      'Olives cueillies à la main, pressées à froid dans les vingt-quatre heures. ' +
      'Une huile verte, poivrée en fin de bouche.',
    description: [
      'La cueillette se fait à la main, sur des arbres conduits en gobelet, quand le fruit a viré du vert au violet sans être encore mûr. Les olives partent au moulin le jour même et sont pressées à froid dans les vingt-quatre heures qui suivent. C’est ce délai court qui retient le fruité et évite le goût de fermentation des huiles pressées trop tard : une olive qui attend en cageot commence déjà à chauffer.',
      'Au nez, l’herbe coupée et l’artichaut cru. En bouche, une attaque ronde, puis un poivré net qui gratte un peu la gorge à l’avaler — c’est le signe des polyphénols, et il s’atténue au fil des mois. Elle tient la salade de tomates, les légumes rôtis et les poissons blancs, et supporte une cuisson douce sans se défaire. Sur une soupe de légumes, un filet versé hors du feu suffit à changer le plat.',
      'Le 25 cl convient pour goûter ou offrir, le 75 cl à une cuisine où l’huile sert tous les jours. La bouteille est teintée dans les trois formats : la lumière est le premier ennemi d’une huile fraîche.',
    ],
    origine: 'coteaux d’Ambrelieu (lieu fictif)',
    ingredients: ['Huile d’olive vierge extra (100 %).'],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 18 },
    conseilConservation: [
      'Gardez la bouteille debout et bouchée, à l’abri de la lumière et loin des plaques de cuisson. Une fois ouverte, consommez-la dans les six mois : l’huile ne devient pas dangereuse, elle perd son parfum.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-HV-OLI-25CL', format: '25 cl', prixCentimes: 1290, poidsGrammes: 520, stock: 42 },
      { sku: 'MV-HV-OLI-50CL', format: '50 cl', prixCentimes: 2250, poidsGrammes: 950, stock: 28 },
      { sku: 'MV-HV-OLI-75CL', format: '75 cl', prixCentimes: 3100, poidsGrammes: 1340, stock: 16 },
    ],
    miseEnAvant: true,
    illustration: { forme: 'bouteille', teinte: 'olive' },
  },

  {
    slug: 'huile-noix-moulin',
    nom: 'Huile de noix de moulin',
    famille: 'huiles-et-vinaigres',
    resume:
      'Cerneaux triés, torréfiés au feu de bois, puis pressés à la meule. Une huile ' +
      'ambrée, franche, à garder pour les fins de plat.',
    description: [
      'Les noix sont cassées puis triées à la main : un seul cerneau rance suffit à marquer toute une presse. La pâte passe ensuite dans une bassine chauffée au feu de bois, où elle est remuée en continu une vingtaine de minutes — c’est la torréfaction, et c’est elle qui fait le goût. Vient la meule de pierre, puis le pressage. Rien n’est ajouté, rien n’est raffiné ; l’huile repose deux semaines et se décante seule.',
      'Le goût est celui de l’amande grillée, avec un léger tanin qui reste en fin de bouche. Elle ne se chauffe pas : au-delà de soixante degrés elle brûle et devient amère. Réservez-la aux assaisonnements, quelques gouttes suffisent — mâche et betterave, endives, pommes de terre tièdes, une poêlée de champignons hors du feu, une cuillère dans une purée de céleri.',
      'Le format 25 cl est le plus raisonnable pour un foyer qui l’utilise de temps en temps : mieux vaut finir une petite bouteille que garder une grande trop longtemps.',
    ],
    origine: 'vallon de Vaubrune (lieu fictif)',
    ingredients: ['Huile de noix vierge (100 %).'],
    allergenes: ['fruits à coque (noix)'],
    conservation: { type: 'stable', ddmMois: 12 },
    conseilConservation: [
      'Le froid lui va bien : après ouverture, gardez la bouteille au réfrigérateur et consommez-la dans les trois mois. Une huile de noix rancit plus vite qu’une huile d’olive, c’est sa seule fragilité.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-HV-NOI-25CL', format: '25 cl', prixCentimes: 1650, poidsGrammes: 520, stock: 30 },
      { sku: 'MV-HV-NOI-50CL', format: '50 cl', prixCentimes: 2800, poidsGrammes: 950, stock: 18 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'bouteille', teinte: 'ocre' },
  },

  {
    slug: 'vinaigre-cidre-vieilli-fut',
    nom: 'Vinaigre de cidre vieilli en fût',
    famille: 'huiles-et-vinaigres',
    resume:
      'Cidre fermenté lentement, puis dix-huit mois en fût de chêne. Un vinaigre ' +
      'souple, pommé, qui ne pique pas la gorge.',
    description: [
      'Le cidre part de pommes de pressoir, âpres et petites, celles qu’on ne mange pas. Il fermente d’abord en alcool, puis passe à l’acétification lente : la mère travaille en surface, à température ambiante, pendant plusieurs semaines. Aucune acétification accélérée par insufflation d’air — c’est plus long de six semaines, et c’est ce qui laisse le fruit derrière l’acidité.',
      'Le vinaigre finit dix-huit mois en fût de chêne ayant déjà servi. Le bois arrondit l’attaque et apporte une note de vanille sèche. À 5 % d’acidité, il pique moins qu’un vinaigre de vin et se laisse utiliser franchement : vinaigrette à l’huile de noix, déglaçage d’une poêlée de porc, cuillère dans un bouillon de légumes un peu plat, ou simplement sur des lentilles tièdes.',
      'Il n’est ni pasteurisé ni filtré, ce qui explique le voile qu’on voit en le tournant vers la lumière.',
    ],
    origine: 'bocage de Quéhaut (lieu fictif)',
    ingredients: [
      'Vinaigre de cidre (100 %), acidité 5 %. Contient naturellement de la mère de vinaigre. Sans sulfites ajoutés, non pasteurisé, non filtré.',
    ],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'Un dépôt trouble peut se former au fond de la bouteille : c’est la mère, elle est sans danger et signe un vinaigre vivant. Conservez à température ambiante, bouteille fermée ; inutile de le mettre au frais.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-HV-VIN-50CL', format: '50 cl', prixCentimes: 980, poidsGrammes: 940, stock: 46 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'bouteille', teinte: 'encre' },
  },

  {
    slug: 'terrine-campagne-poivre-noir',
    nom: 'Terrine de campagne au poivre noir',
    famille: 'conserves-salees',
    resume:
      'Épaule et foie de porc hachés au gros grain, poivre concassé, cuisson lente ' +
      'au bain-marie. Une tranche qui tient.',
    description: [
      'L’épaule et le foie sont hachés à la grille de huit millimètres — du gros grain, volontairement : une terrine hachée fin devient une mousse, et ce n’est pas ce qu’on cherche ici. La viande marine une nuit au vin blanc avec l’ail, le thym et le poivre concassé au mortier, puis elle est moulée en terrine et cuite au bain-marie à quatre-vingts degrés pendant trois heures. Elle repose deux jours avant la mise en bocal et la stérilisation.',
      'Le goût est franc et un peu rustique. Le foie apporte le fondant, le poivre arrive après, en deuxième temps, et laisse une chaleur plutôt qu’une brûlure. Servez-la en tranche épaisse sur du pain de campagne grillé, avec des cornichons ou une cuillère de confit d’oignons, ou en entrée avec une salade d’herbes et un trait de vinaigre de cidre.',
      'Le bocal de 180 g fait une entrée pour deux ; le 350 g est celui d’une tablée ou d’un pique-nique. Comptez une heure au frais avant de servir : sortie du réfrigérateur, elle se tranche mal et parle peu.',
    ],
    origine: 'bocage de Quéhaut (lieu fictif)',
    ingredients: [
      'Épaule de porc (62 %), foie de porc (25 %), oignons, vin blanc, sel, poivre noir concassé (0,8 %), ail, thym, laurier.',
    ],
    allergenes: ['sulfites'],
    conservation: { type: 'stable', ddmMois: 36 },
    conseilConservation: [
      'Le bocal est stérilisé : il se garde trois ans dans un placard, sans réfrigération, tant que la capsule reste bombée vers le bas. Une fois ouvert, gardez-le au réfrigérateur et consommez-le dans les cinq jours.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-CS-TER-180G', format: '180 g', prixCentimes: 960, poidsGrammes: 340, stock: 34 },
      { sku: 'MV-CS-TER-350G', format: '350 g', prixCentimes: 1680, poidsGrammes: 600, stock: 21 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'bocal', teinte: 'terre-cuite' },
  },

  {
    slug: 'rillettes-canard-echalotes',
    nom: 'Rillettes de canard aux échalotes',
    famille: 'conserves-salees',
    resume:
      'Cuisses de canard confites six heures dans leur graisse, effilochées à la ' +
      'fourchette, échalotes fondues au dernier moment.',
    description: [
      'Les cuisses sont salées au sel sec pendant douze heures, rincées, puis confites six heures dans leur propre graisse à petit frémissement. Elles sont ensuite effilochées à la fourchette, jamais au robot : on veut des fibres reconnaissables, pas une pâte lisse. Les échalotes sont fondues à part, sans coloration, et incorporées en fin de mélange pour qu’elles gardent leur mordant.',
      'En bouche, le canard domine, avec le gras qui porte le goût sans l’écraser, et l’échalote qui vient trancher juste après. Étalez-les épaisses sur du pain grillé encore chaud, laissez le gras fondre une minute, et servez sans rien d’autre qu’un peu de poivre au moulin. Elles font aussi une farce simple pour des champignons de Paris passés au four.',
      'Le bocal de 180 g couvre un apéritif à quatre. Sortez-le vingt minutes à l’avance : les rillettes trop froides ne s’étalent pas.',
    ],
    origine: 'val d’Ombrèze (lieu fictif)',
    ingredients: [
      'Cuisse de canard (78 %), graisse de canard, échalotes (6 %), sel, poivre blanc, laurier.',
    ],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 36 },
    conseilConservation: [
      'Bocal stérilisé, trois ans en placard à température ambiante. Après ouverture, au réfrigérateur et à consommer dans les quatre jours ; lissez la surface et laissez la couche de graisse la recouvrir, elle sert de protection.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-CS-RIL-180G', format: '180 g', prixCentimes: 1120, poidsGrammes: 340, stock: 38 },
    ],
    miseEnAvant: true,
    illustration: { forme: 'bocal', teinte: 'ocre' },
  },

  {
    slug: 'confit-oignons-vin-doux',
    nom: 'Confit d’oignons au vin doux',
    famille: 'conserves-salees',
    resume:
      'Oignons émincés, réduits trois heures au vin doux et au sucre roux. Ni ' +
      'chutney ni marmelade : un condiment franc.',
    description: [
      'Les oignons sont émincés à la main, en lamelles régulières d’environ trois millimètres, puis mis à suer sans coloration. Le sucre roux vient ensuite, puis le vin doux et le vinaigre de cidre, et l’ensemble réduit trois heures à découvert en remuant souvent. On s’arrête quand la cuillère laisse une trace nette au fond de la bassine — un quart d’heure de plus et le sucre caramélise, un quart d’heure de moins et le confit rend de l’eau dans l’assiette.',
      'Le résultat reste identifiable : ce sont des oignons, pas une gelée. Le sucré est là mais borné par le vinaigre, et les baies de genièvre donnent une note résineuse en arrière-plan. C’est le compagnon des terrines et des rillettes, des viandes froides et des fromages à pâte pressée ; une cuillère sur une tartine de chèvre chaud, ou dans un sandwich au jambon, change complètement l’affaire.',
      'Le bocal de 110 g dure le temps d’un plateau de charcuterie. Le 220 g est le format de qui l’utilise en cuisine plutôt qu’à l’apéritif.',
    ],
    origine: 'plateau de Rouvraine (lieu fictif)',
    ingredients: [
      'Oignons (72 %), sucre roux, vin doux, vinaigre de cidre, sel, poivre, baies de genièvre.',
    ],
    allergenes: ['sulfites'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'Deux ans en placard, bocal fermé. Une fois ouvert, au réfrigérateur pendant trois semaines. Prélevez avec une cuillère propre et sèche : c’est l’humidité rapportée dans le pot, pas le temps, qui abîme un confit.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-CS-OIG-110G', format: '110 g', prixCentimes: 640, poidsGrammes: 250, stock: 52 },
      { sku: 'MV-CS-OIG-220G', format: '220 g', prixCentimes: 1090, poidsGrammes: 430, stock: 27 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'bocal', teinte: 'encre' },
  },

  {
    slug: 'miel-chataignier',
    nom: 'Miel de châtaignier',
    famille: 'miels-et-confitures',
    resume:
      'Miel ambré foncé, tanique, franchement amer en fin de bouche. Récolté en ' +
      'juillet, extrait à froid, jamais chauffé.',
    description: [
      'Les ruches montent au bois de châtaigniers à la mi-juin, pour une floraison qui dure une quinzaine de jours. La récolte se fait début juillet, les hausses sont désoperculées au couteau froid et passées à l’extracteur sans chauffage. Le miel est ensuite laissé à décanter huit jours en maturateur : les impuretés remontent, on les écume, et c’est tout. Rien n’est filtré à chaud, ce qui préserve les pollens et laisse au miel sa texture un peu épaisse.',
      'Le goût ne fait pas de concession : boisé, tanique, avec une amertume nette qui arrive après la douceur et reste longtemps. C’est un miel de caractère, à essayer avant d’en acheter un grand pot. Il tient tête aux fromages de brebis et aux pâtes persillées, se glisse dans une vinaigrette avec un peu de moutarde, et parfume un yaourt nature bien mieux qu’un miel neutre. En pâtisserie, il domine tout ce qu’on met avec lui — il faut le vouloir.',
      'Le pot de 250 g est le bon format pour faire connaissance ; le 500 g, celui d’un usage quotidien.',
    ],
    origine: 'vallon de Vaubrune (lieu fictif)',
    ingredients: ['Miel de châtaignier (100 %).'],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'Le miel de châtaignier cristallise lentement, parfois pas du tout : les deux états sont normaux et ne changent rien au goût. Gardez le pot fermé, à température ambiante et à l’abri de l’humidité. S’il fige, un bain-marie tiède — jamais au-delà de quarante degrés — le rend liquide.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-MC-CHA-250G', format: '250 g', prixCentimes: 890, poidsGrammes: 420, stock: 44 },
      { sku: 'MV-MC-CHA-500G', format: '500 g', prixCentimes: 1550, poidsGrammes: 780, stock: 25 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'pot', teinte: 'ocre' },
  },

  {
    slug: 'miel-bruyere-blanche',
    nom: 'Miel de bruyère blanche',
    famille: 'miels-et-confitures',
    resume:
      'Une floraison brève, au sortir de l’hiver. Miel brun-roux, au goût de ' +
      'caramel et de réglisse, qui cristallise finement.',
    description: [
      'La bruyère blanche fleurit tôt, dès la fin février sur les versants exposés, et sa floraison ne dure guère plus de trois semaines. Les ruches sont montées sur les landes juste avant, et redescendues aussitôt après : c’est une récolte courte, dépendante d’un mois de printemps où il peut aussi bien pleuvoir sans discontinuer. Certaines années, il n’y a rien. C’est ce rendement irrégulier, et lui seul, qui explique l’écart de prix avec le miel de châtaignier.',
      'La couleur est brun-roux, plus sombre qu’on ne s’y attend pour un miel de printemps. Le goût va au caramel et à la réglisse, avec un fond légèrement salin et une amertume beaucoup plus discrète que celle du châtaignier. Il cristallise finement en quelques semaines et devient onctueux plutôt que granuleux — c’est son état normal, pas un défaut.',
      'Sur du pain beurré, il n’a besoin de rien d’autre. Il accompagne aussi le fromage frais, les fruits secs et les desserts au lait ; en cuisine, une cuillère dans un jus de volaille en fin de réduction.',
    ],
    origine: 'landes de Chaubrune (lieu fictif)',
    ingredients: ['Miel de bruyère blanche (100 %).'],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'À température ambiante, pot fermé, loin de l’humidité. La cristallisation fine est attendue : ne cherchez pas à la faire disparaître, elle revient. Si vous le préférez souple, sortez le pot une heure avant de servir.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-MC-BRU-250G', format: '250 g', prixCentimes: 1140, poidsGrammes: 420, stock: 19 },
    ],
    miseEnAvant: true,
    illustration: { forme: 'pot', teinte: 'creme' },
  },

  {
    slug: 'confiture-abricots-plein-vent',
    nom: 'Confiture d’abricots de plein vent',
    famille: 'miels-et-confitures',
    resume:
      'Abricots d’arbres de plein vent, dénoyautés à la main, cuits en petites ' +
      'bassines. Peu sucrée, acidulée, morceaux entiers.',
    description: [
      'Les arbres de plein vent sont des hautes tiges, non palissées, laissées à leur port naturel : ils donnent moins qu’un verger conduit en ligne, plus tard dans la saison, et des fruits plus petits dont la chair est plus dense. Les abricots sont cueillis mûrs, dénoyautés à la main le jour même, puis macérés une nuit avec le sucre avant cuisson.',
      'La cuisson se fait en bassines de six kilos, en trois fois plutôt qu’en une : au-delà, le fond attache et le fruit se défait. Douze minutes à gros bouillons, un jus de citron pour fixer la couleur et aider la prise, et on met en pot à chaud. Il reste des morceaux entiers, parfois une demi-oreille de fruit — c’est voulu.',
      'À 60 % de fruits, elle est nettement moins sucrée qu’une confiture standard, et l’acidité de l’abricot ressort. Sur du pain grillé et beurré, dans un yaourt, ou entre deux couches de pâte sablée pour une tarte rapide. Elle fait aussi un très bon glaçage de volaille rôtie, détendue avec une cuillère de vinaigre de cidre.',
    ],
    origine: 'coteaux d’Ambrelieu (lieu fictif)',
    ingredients: [
      'Abricots (60 %), sucre de canne, jus de citron. Préparée avec 60 g de fruits pour 100 g. Teneur totale en sucres : 52 g pour 100 g.',
    ],
    allergenes: ['aucun'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'Deux ans en placard, pot fermé. Après ouverture, au réfrigérateur et à consommer dans les trois semaines : moins sucrée qu’une confiture classique, elle se conserve aussi moins longtemps une fois entamée.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-MC-ABR-230G', format: '230 g', prixCentimes: 680, poidsGrammes: 400, stock: 48 },
      { sku: 'MV-MC-ABR-370G', format: '370 g', prixCentimes: 990, poidsGrammes: 600, stock: 31 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'pot', teinte: 'terre-cuite' },
  },

  {
    slug: 'lentilles-blondes-plateau',
    nom: 'Lentilles blondes du plateau',
    famille: 'epicerie-seche',
    resume:
      'Petite lentille blonde à peau fine, cuite en vingt minutes sans trempage. ' +
      'Tient à la cuisson, goût de noisette.',
    description: [
      'C’est une petite lentille, blonde tirant sur le vert pâle, à peau fine. Semée au printemps sur un sol maigre et caillouteux, elle mûrit lentement et se récolte en août. Le tri se fait en deux passages, un mécanique et un visuel, ce qui ne dispense pas de rincer avant cuisson : il reste toujours un caillou pour cent kilos.',
      'Elle cuit en vingt minutes à l’eau frémissante non salée, sans trempage préalable — le trempage la ferait éclater. La peau fine tient malgré tout à la cuisson, ce qui permet de la servir en salade sans qu’elle se transforme en purée. Le goût est doux, avec une pointe de noisette, moins terreux qu’une lentille verte.',
      'En salade tiède avec des échalotes et un trait de vinaigre de cidre, en accompagnement d’un poisson fumé, ou en soupe épaisse avec des carottes et du laurier. Salez en fin de cuisson : le sel ajouté au départ durcit la peau et rallonge le temps de dix bonnes minutes.',
    ],
    origine: 'plateau de Rouvraine (lieu fictif)',
    ingredients: ['Lentilles blondes (100 %).'],
    allergenes: ['gluten (traces éventuelles, rotation culturale)'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'À l’abri de l’humidité, dans le sachet refermé ou transvasées en bocal. Au-delà de deux ans, les lentilles restent parfaitement saines mais mettent nettement plus longtemps à cuire : c’est la peau qui durcit avec le temps, pas la graine.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-ES-LEN-500G', format: '500 g', prixCentimes: 560, poidsGrammes: 540, stock: 60 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'sachet', teinte: 'creme' },
  },

  {
    slug: 'infusion-du-soir-sept-plantes',
    nom: 'Infusion du soir, sept plantes',
    famille: 'infusions',
    resume:
      'Tilleul, verveine, mélisse, camomille, passiflore, lavande, fleur d’oranger. ' +
      'Feuilles entières, jamais broyées en poudre.',
    description: [
      'Sept plantes, cueillies à des moments différents de l’année et mélangées à la main en fin de saison. Le tilleul et la verveine font le corps du mélange, la mélisse et la camomille l’adoucissent, la passiflore apporte l’amertume qui l’empêche d’être fade, et la lavande comme la fleur d’oranger n’interviennent qu’en petite quantité — au-delà, elles prennent toute la place.',
      'Le séchage se fait à l’ombre, sur claies, dans un local ventilé et sans chauffage. C’est plus lent qu’un séchage en étuve et cela demande de la place, mais les feuilles gardent leur couleur et leurs huiles essentielles. Rien n’est broyé : vous verrez des feuilles entières, des bractées de tilleul complètes et des fleurs reconnaissables. Une infusion réduite en poudre s’infuse plus vite et perd son parfum en quelques semaines.',
      'Comptez une cuillère à soupe bombée par tasse, de l’eau à quatre-vingt-dix degrés — pas bouillante, elle brûlerait la mélisse — et cinq minutes couvert. Couvrir n’est pas un détail : c’est ce qui empêche les arômes de partir avec la vapeur. Le sachet de 60 g représente une trentaine de tasses.',
    ],
    origine: 'landes de Chaubrune (lieu fictif)',
    ingredients: [
      'Tilleul (bractées et fleurs), verveine odorante, mélisse, camomille matricaire, passiflore, lavande, fleur d’oranger.',
    ],
    allergenes: ['aucun'],
    conservation: { type: 'scelle-hygiene' },
    conseilConservation: [
      'Le sachet est scellé sous atmosphère protectrice : tant qu’il est fermé, les plantes gardent leur parfum deux ans. Une fois ouvert, refermez-le soigneusement après chaque usage et consommez dans les six mois — c’est l’air, pas le temps, qui vide une infusion de son goût.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-IN-SOI-60G', format: '60 g', prixCentimes: 820, poidsGrammes: 110, stock: 36 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'sachet', teinte: 'olive' },
  },

  {
    slug: 'beurre-baratte-demi-sel',
    nom: 'Beurre de baratte demi-sel',
    famille: 'frais',
    resume:
      'Crème maturée vingt heures, barattée en baratte de bois, malaxée au sel sec. ' +
      'Un beurre jaune paille, au goût de noisette.',
    description: [
      'La crème est ensemencée en ferments lactiques et laissée à maturer vingt heures à douze degrés. C’est cette étape, absente des beurres doux industriels, qui développe l’acidité légère et les arômes ; elle allonge la fabrication d’une journée entière. Le barattage se fait ensuite en baratte de bois, à basse vitesse : les grains de beurre se forment lentement, on soutire le babeurre, on lave à l’eau froide, puis on malaxe en incorporant du sel sec — pas de saumure.',
      'La couleur est jaune paille, plus ou moins soutenue selon la saison : jaune franc l’été, quand les bêtes sont à l’herbe, presque blanc en fin d’hiver. Ce n’est pas un défaut de fabrication, c’est le calendrier. Le goût va à la noisette, avec le sel qui craque parfois sous la dent quand un grain n’a pas fondu.',
      'Sur du pain frais, c’est là qu’on le juge. En cuisine, il fait un beurre blanc franc et une pâte brisée courte ; pour une cuisson vive, préférez le clarifier, le petit-lait résiduel brûle vite.',
    ],
    origine: 'bocage de Quéhaut (lieu fictif)',
    ingredients: ['Crème de lait pasteurisée, sel (2 %), ferments lactiques.'],
    allergenes: ['lait'],
    conservation: { type: 'perissable', dlcJours: 21, chaineDuFroid: true },
    conseilConservation: [
      'Produit périssable : à conserver entre 0 °C et 4 °C, sans rupture de la chaîne du froid, et à consommer avant la date limite indiquée sur l’emballage — vingt et un jours après fabrication. Une fois entamé, gardez-le emballé : le beurre prend les odeurs du réfrigérateur en deux jours.',
      'Le colis part sous emballage isotherme, du lundi au mercredi uniquement, afin qu’aucun envoi ne passe le week-end en centre de tri. Ce produit n’est pas expédié hors de France métropolitaine.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-FR-BEU-250G', format: '250 g', prixCentimes: 740, poidsGrammes: 380, stock: 12 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'pot', teinte: 'encre' },
  },

  {
    slug: 'fromage-fermier-brebis',
    nom: 'Fromage fermier de brebis',
    famille: 'frais',
    resume:
      'Lait de brebis cru, caillé à la présure, affiné dix semaines en cave. Pâte ' +
      'pressée non cuite, croûte grise naturelle.',
    description: [
      'Le lait est mis en cuve dans les deux heures qui suivent la traite, sans passer par le froid : c’est ce qui permet de travailler en cru et de garder la flore du lait. Emprésurage à trente-deux degrés, découpage du caillé en grains de la taille d’un grain de blé, brassage, puis moulage et pressage lent sur quatre heures. Salage au sel sec, à la main, sur les deux faces.',
      'L’affinage dure dix semaines en cave, sur planches d’épicéa. Les meules sont retournées et frottées deux fois par semaine ; la croûte se couvre d’un feutrage gris naturel qu’on ne cherche pas à faire disparaître. Elle est comestible, un peu terreuse, et beaucoup la retirent — c’est affaire de goût.',
      'La pâte est ivoire, souple sous le doigt, avec quelques petites ouvertures. Le goût est doux au début, franchement brebis ensuite, avec une longueur légèrement piquante. Servez-la à température de la pièce, en tranches larges, avec un peu de miel de châtaignier ou de confit d’oignons. Elle fond mal et graisse à la chaleur : mieux vaut la garder pour le plateau.',
      'Vendu à la coupe, environ 250 g par pièce, sous papier double d’affinage.',
    ],
    origine: 'plateau de Sarnière (lieu fictif)',
    ingredients: [
      'Lait de brebis cru, sel, présure animale, ferments lactiques.',
      'Fabriqué à partir de lait cru. Sa consommation est déconseillée aux jeunes enfants, aux femmes enceintes et aux personnes immunodéprimées.',
    ],
    allergenes: ['lait'],
    conservation: { type: 'perissable', dlcJours: 12, chaineDuFroid: true },
    conseilConservation: [
      'Produit périssable : entre 4 °C et 8 °C, dans le bac à légumes plutôt qu’au plus froid, et à consommer avant la date limite indiquée — douze jours. Gardez-le dans son papier d’affinage, jamais sous film plastique hermétique : le fromage a besoin de respirer, il transpire et s’aigrit sinon.',
      'Le colis part sous emballage isotherme, du lundi au mercredi uniquement. Ce produit n’est pas expédié hors de France métropolitaine.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-FR-BRE-250G', format: '250 g', prixCentimes: 1190, poidsGrammes: 400, stock: 9 },
    ],
    miseEnAvant: true,
    illustration: { forme: 'sachet', teinte: 'terre-cuite' },
  },

  {
    slug: 'coffret-table-du-dimanche',
    nom: 'Coffret « La table du dimanche »',
    famille: 'coffrets',
    resume:
      'Quatre pièces pour une entrée qui se partage : deux pâtés, le condiment qui ' +
      'va avec, et l’huile de la salade qui suit.',
    description: [
      'Le coffret réunit quatre références qui se répondent dans l’assiette. La terrine de campagne au poivre noir et les rillettes de canard aux échalotes se posent sur la table en même temps, sur du pain grillé ; le confit d’oignons au vin doux est là pour trancher le gras de l’une et de l’autre ; l’huile d’olive de première pression, en 25 cl, sert la salade qui suit et remet de la fraîcheur. C’est un déjeuner de fin de matinée qui s’étire, pas un assortiment de dégustation.',
      'L’écrin est une boîte rigide en carton bois, garnie de frisure de peuplier, avec une notice qui reprend les quatre fiches et l’ordre de service. Le tout pèse 1 850 g à l’expédition et voyage sans contrainte de température : les quatre pièces sont stables.',
      'Les quatre produits coûtent 40,10 € achetés séparément. Le coffret est à 46,00 € : l’écart couvre la boîte, le calage, l’assemblage et le mot manuscrit. Nous préférons l’écrire que le laisser deviner — si vous n’avez pas besoin de l’écrin, commandez les quatre pièces à l’unité, elles sont exactement les mêmes.',
    ],
    origine: 'assemblé à Vaubrune (lieu fictif)',
    ingredients: [
      'Les quatre pièces sont vendues séparément et disposent chacune de leur fiche complète.',
      'Huile d’olive vierge extra (100 %).',
      'Terrine : épaule de porc (62 %), foie de porc (25 %), oignons, vin blanc, sel, poivre noir concassé (0,8 %), ail, thym, laurier.',
      'Rillettes : cuisse de canard (78 %), graisse de canard, échalotes (6 %), sel, poivre blanc, laurier.',
      'Confit : oignons (72 %), sucre roux, vin doux, vinaigre de cidre, sel, poivre, baies de genièvre.',
      'Allergènes présents dans le coffret : sulfites (terrine, confit d’oignons).',
    ],
    allergenes: ['sulfites'],
    conservation: { type: 'stable', ddmMois: 24 },
    conseilConservation: [
      'Coffret fermé, à température ambiante et à l’abri de la lumière. La date de durabilité minimale retenue pour l’ensemble est celle de la pièce la plus courte, soit vingt-quatre mois — chaque pièce porte par ailleurs sa propre date. Une fois les bocaux ouverts, suivez les indications de chaque fiche : cinq jours au réfrigérateur pour la terrine, quatre pour les rillettes, trois semaines pour le confit.',
    ],
    personnalisable: false,
    variantes: [
      { sku: 'MV-CO-DIM-4P', format: '4 pièces', prixCentimes: 4600, poidsGrammes: 1850, stock: 14 },
    ],
    miseEnAvant: true,
    illustration: { forme: 'coffret', teinte: 'terre-cuite' },
    composition: [
      {
        sku: 'MV-HV-OLI-25CL',
        nom: 'Huile d’olive de première pression, 25 cl',
        prixCentimes: 1290,
      },
      {
        sku: 'MV-CS-TER-180G',
        nom: 'Terrine de campagne au poivre noir, 180 g',
        prixCentimes: 960,
      },
      {
        sku: 'MV-CS-RIL-180G',
        nom: 'Rillettes de canard aux échalotes, 180 g',
        prixCentimes: 1120,
      },
      {
        sku: 'MV-CS-OIG-110G',
        nom: 'Confit d’oignons au vin doux, 110 g',
        prixCentimes: 640,
      },
    ],
  },

  {
    slug: 'coffret-composez-le-votre',
    nom: 'Coffret « Composez le vôtre »',
    famille: 'coffrets',
    resume:
      'Trois ou cinq pièces à choisir parmi les conserves, miels, huiles et ' +
      'lentilles. Nous assemblons, calons et expédions le tout.',
    description: [
      'Vous choisissez les pièces, nous faisons le reste. Onze références sont proposées au choix : l’huile d’olive en 25 cl, le vinaigre de cidre, la terrine, les rillettes, le confit d’oignons dans ses deux formats, les deux miels, la confiture d’abricots, les lentilles blondes et l’infusion du soir. Le prix est forfaitaire — 34,00 € pour trois pièces, 54,00 € pour cinq — quelle que soit la combinaison retenue.',
      'Les produits frais n’y figurent pas, et c’est délibéré : le beurre et le fromage voyagent sous emballage isotherme, en début de semaine, et vers la métropole seulement. Les mêler à des conserves obligerait à imposer ces contraintes à tout le coffret. Les grands formats en sont également absents, pour que la boîte reste transportable et le forfait tenable.',
      'L’écrin est le même que celui de « La table du dimanche » : carton bois rigide, frisure de peuplier, notice reprenant les fiches des pièces choisies. Le coffret de trois pèse environ 1 400 g à l’expédition, celui de cinq environ 2 200 g.',
      'Parce que vous en déterminez le contenu, ce coffret est un bien nettement personnalisé. Les mêmes pièces commandées à l’unité, elles, restent rétractables dans les conditions habituelles — c’est une différence qui mérite d’être lue avant de valider.',
    ],
    origine: 'assemblé à Vaubrune (lieu fictif)',
    ingredients: [
      'Variables selon les pièces retenues. Chaque pièce dispose de sa fiche complète, avec sa liste d’ingrédients et ses allergènes ; la liste consolidée du coffret est affichée au récapitulatif de commande, avant paiement.',
      'Allergènes possibles selon la composition : sulfites (terrine, confit d’oignons), fruits à coque (aucune pièce éligible n’en contient à ce jour), gluten en traces éventuelles (lentilles blondes).',
    ],
    // Le frontmatter de la fiche 15 porte « selon les pièces choisies (union à
    // calculer) ». La parenthèse est une consigne d'intégration, pas une
    // information de client : elle est retirée de la valeur affichée, et
    // l'union est expliquée en toutes lettres sur la fiche.
    allergenes: ['selon les pièces choisies'],
    conservation: {
      type: 'stable',
      ddmMois: 12,
      note: 'dérivée — DDM la plus courte parmi les pièces choisies',
    },
    conseilConservation: [
      'Coffret fermé, à température ambiante et à l’abri de la lumière. La date de durabilité minimale du coffret est celle de la pièce la plus courte parmi celles que vous avez choisies : elle est calculée à la commande et imprimée sur le bon de livraison. Chaque pièce porte en outre sa propre date. Une fois les contenants ouverts, suivez les indications de leurs fiches respectives.',
    ],
    personnalisable: true,
    variantes: [
      { sku: 'MV-CO-LIB-3P', format: '3 pièces', prixCentimes: 3400, poidsGrammes: 1400, stock: 22 },
      { sku: 'MV-CO-LIB-5P', format: '5 pièces', prixCentimes: 5400, poidsGrammes: 2200, stock: 15 },
    ],
    miseEnAvant: false,
    illustration: { forme: 'coffret', teinte: 'olive' },
    /**
     * Liste blanche verrouillée. Onze SKU, tous stables et non personnalisés,
     * tous en petit format. Ajouter une référence ici est un arbitrage
     * COMMERCIAL, pas une correction de détail : le forfait est le même quelle
     * que soit la combinaison, donc c'est la pièce la plus chère de cette
     * liste qui décide de la marge du pire panier. La garde
     * `verifier-catalogue.mjs` refuse toute liste dont le pire panier
     * dépasserait l'écart déjà chiffré et assumé par la revue des fiches
     * (1,50 € à trois pièces, 2,20 € à cinq).
     */
    piecesEligibles: [
      'MV-HV-OLI-25CL',
      'MV-HV-VIN-50CL',
      'MV-CS-TER-180G',
      'MV-CS-RIL-180G',
      'MV-CS-OIG-110G',
      'MV-CS-OIG-220G',
      'MV-MC-CHA-250G',
      'MV-MC-BRU-250G',
      'MV-MC-ABR-230G',
      'MV-ES-LEN-500G',
      'MV-IN-SOI-60G',
    ],
  },
];

/** Le catalogue, insécables posées. */
export const CATALOGUE: readonly Produit[] = REFERENCES.map(typographierProduit);

/**
 * Les cinq mises en avant, DÉRIVÉES du catalogue et non recopiées : une
 * seconde liste de slugs se serait désynchronisée au premier changement.
 *
 * Le choix des cinq est celui de la revue des fiches : huile d'olive,
 * rillettes, miel de bruyère, fromage de brebis, coffret « La table du
 * dimanche ». Cinq familles distinctes, les deux régimes de conservation, du
 * moins cher au plus cher du catalogue, un coffret et un produit frais.
 */
export const PRODUITS_MIS_EN_AVANT: readonly Produit[] = CATALOGUE.filter(
  (produit) => produit.miseEnAvant,
);
