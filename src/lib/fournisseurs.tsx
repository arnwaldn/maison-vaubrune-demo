'use client';

import type Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { FournisseurSurcouche } from '@/lib/contexte-surcouche';
import type { StocksParSku } from '@/lib/panier/reducteur';
import { FournisseurPanier } from '@/lib/panier/contexte-panier';

/**
 * LES DEUX FOURNISSEURS DE LA MISE EN PAGE RACINE, en une seule frontière.
 *
 * ---------------------------------------------------------------------------
 * Pourquoi ce fichier existe : une mesure, pas un goût
 * ---------------------------------------------------------------------------
 *
 * La mise en page racine pourrait imbriquer les deux fournisseurs elle-même.
 * Elle l'a fait, et le tableau de construction l'a sanctionné : chaque module
 * `'use client'` référencé depuis un composant serveur ouvre un GROUPE DE
 * MORCEAUX distinct chez l'empaqueteur. Deux références depuis la mise en page
 * — le panier et la surcouche — donnaient donc deux groupes, dont le second
 * réapparaissait sur chaque page en plus du premier : un fichier de plus à
 * télécharger sur toutes les routes du site, pour du code qui aurait tenu dans
 * le premier.
 *
 * Mesuré sur la construction de la tranche C6 : +1,3 Ko compressés sur chaque
 * page, uniquement dus au découpage. Ce fichier ramène la mise en page à UNE
 * seule frontière client ; l'empaqueteur retrouve un seul groupe, et les deux
 * contextes y voyagent ensemble.
 *
 * ---------------------------------------------------------------------------
 * `children` reste un arbre SERVEUR
 * ---------------------------------------------------------------------------
 *
 * C'est le point à ne pas perdre en chemin. `children` traverse ce composant
 * comme une propriété : React le traite comme un nœud déjà rendu côté serveur,
 * et l'accueil, le rayon et les quinze fiches ne deviennent pas clients pour
 * autant. Le patron est celui posé en C4 (voir l'en-tête de
 * `panier/contexte-panier.tsx`) ; ce fichier ne fait que l'appliquer une fois
 * au lieu de deux.
 *
 * ORDRE DES DEUX FOURNISSEURS. La surcouche enveloppe le panier. Les deux
 * ordres fonctionneraient — aucun des deux contextes ne lit l'autre — et
 * celui-ci est retenu parce qu'il range le catalogue à l'extérieur et le panier
 * à l'intérieur, ce qui est l'ordre des dépendances métier : un panier
 * référence un catalogue, jamais le contraire.
 *
 * ---------------------------------------------------------------------------
 * LE SIGNAL D'HYDRATATION (tranche C11)
 * ---------------------------------------------------------------------------
 *
 * Un effet pose `data-hydratation="prete"` sur `<html>`. C'est le premier des
 * trois signaux qu'attendent les campagnes de bout en bout, et il est ici pour
 * deux raisons qui tiennent ensemble :
 *
 * 1. CE FICHIER EST LA FRONTIÈRE CLIENTE DE LA MISE EN PAGE RACINE, donc le
 *    seul point du projet qui soit monté sur TOUTES les routes, y compris les
 *    pages légales — qui n'ont aucun îlot à elles. Un signal posé ailleurs
 *    n'existerait pas là où il est le plus nécessaire.
 * 2. AUCUN FICHIER CLIENT DE PLUS. Poser ce signal depuis un petit composant
 *    dédié référencé par le layout rouvrirait le second groupe de morceaux que
 *    ce fichier existe précisément pour refermer (voir plus haut, décision D26).
 *
 * L'effet d'un composant se déclenche APRÈS ceux de ses descendants : quand
 * celui-ci s'exécute, les deux fournisseurs ont monté leurs contextes. Il ne
 * dit pas pour autant que les îlots ont fini de lire le stockage — c'est le
 * rôle du deuxième signal, `[data-place-reservee]`, porté par les places
 * réservées elles-mêmes.
 *
 * Aucun nettoyage au démontage : la mise en page racine ne se démonte jamais,
 * et un attribut retiré puis reposé ferait clignoter le signal.
 *
 * ---------------------------------------------------------------------------
 * LA SENTINELLE DE L'EN-TÊTE (tranche C13) — le seul JavaScript de la coquille
 * ---------------------------------------------------------------------------
 *
 * Un second effet observe le repère de quatre-vingts pixels posé au sommet du
 * document par `EnTete` et pose `data-entete="scelle"` sur `<html>` quand il
 * sort de la fenêtre. Toute l'apparence est ensuite dans `globals.css` : ce
 * fichier ne connaît qu'un booléen.
 *
 * TROIS RAISONS DE L'ÉCRIRE ICI, et elles sont les mêmes que pour le signal
 * d'hydratation :
 *
 * 1. C'est la frontière cliente UNIQUE de la mise en page racine (D26). Un
 *    petit composant client dédié — un « îlot en-tête » — rouvrirait le second
 *    groupe de morceaux que ce fichier existe pour refermer, sur toutes les
 *    routes du site, pour une quinzaine de lignes.
 * 2. L'en-tête est monté sur toutes les routes ; l'observateur doit l'être
 *    aussi.
 * 3. Un `IntersectionObserver` et non un écouteur de défilement : le plan
 *    directeur l'impose, et la raison est mesurable — un écouteur `scroll`
 *    s'exécute des dizaines de fois par seconde sur le fil principal, un
 *    observateur est réveillé deux fois par franchissement.
 *
 * CE QUI SE PASSE SI RIEN NE MARCHE. Pas de JavaScript, pas d'hydratation,
 * `IntersectionObserver` absent : l'attribut n'est jamais posé, l'en-tête reste
 * dans son état de sommet — fond de coquille, aucun filet — et le site est
 * entièrement lisible et utilisable. L'état scellé est l'exception, jamais le
 * défaut : c'est la même doctrine que les révélations de D37, appliquée à un
 * organe qui n'en est pas une.
 *
 * Le nettoyage, lui, est écrit : un observateur est un abonnement, et un
 * abonnement qui survit à son composant est une fuite. Que la mise en page ne
 * se démonte jamais en pratique ne rend pas le `disconnect()` inutile — cela
 * rend seulement son absence indétectable, ce qui est pire.
 */
export function Fournisseurs({
  stocks,
  children,
}: {
  /** Vingt-trois paires SKU → stock, calculées côté serveur (voir `reducteur.ts`). */
  readonly stocks: StocksParSku;
  readonly children: ReactNode;
}) {
  /* Lu ICI pour le seul contrôleur qui en a besoin — celui de la vidéo, plus
     bas. Les deux effets qui suivent gardent une liste de dépendances VIDE :
     leurs cibles (`<html>` et le repère de l'en-tête) appartiennent à la
     coquille, qui ne se démonte jamais et ne se remplace pas d'une route à
     l'autre. Seul le contenu de la page change, et seule la vidéo y vit. */
  const chemin = usePathname();

  useEffect(() => {
    document.documentElement.dataset['hydratation'] = 'prete';
  }, []);

  useEffect(() => {
    const repere = document.querySelector('[data-sentinelle-entete]');

    if (repere === null || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const racine = document.documentElement;
    const observateur = new IntersectionObserver((entrees) => {
      for (const entree of entrees) {
        if (entree.isIntersecting) {
          delete racine.dataset['entete'];
        } else {
          racine.dataset['entete'] = 'scelle';
        }
      }
    });

    observateur.observe(repere);

    return () => {
      observateur.disconnect();
      delete racine.dataset['entete'];
    };
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════
     LA VIDÉO DU HÉROS — elle ne part que si trois conditions sont réunies
     ═══════════════════════════════════════════════════════════════════════

     Troisième et dernier effet de cette frontière, et il est ici pour la
     raison qui y a déjà mis la sentinelle de l'en-tête : la décision D26
     n'admet qu'UNE frontière cliente dans la mise en page racine, et un
     second module `'use client'` ouvrirait un groupe de morceaux de plus chez
     l'empaqueteur — donc un fichier de plus sur les vingt-deux routes, pour un
     organe qui n'existe que sur l'accueil.

     TROIS CONDITIONS, ET AUCUNE N'EST DÉCORATIVE :

     1. LE MOUVEMENT N'EST PAS RÉDUIT. On sort AVANT de chercher l'élément :
        sous `reduce`, cet effet ne fait rien du tout, donc `preload="none"`
        n'est jamais levé, donc PAS UN OCTET de vidéo ne part sur le réseau.
        C'est la lettre de WCAG 2.2.2 et l'esprit de D37 : le visiteur qui
        demande moins de mouvement ne paie pas le mouvement qu'il refuse. La
        campagne le prouve au réseau, pas au style calculé.
     2. LE HÉROS EST VISIBLE. Un observateur, comme pour la sentinelle. Sur un
        écran où l'accueil s'ouvrirait plus bas — un lien vers une ancre, un
        retour de navigation avec restauration de position —, la vidéo attend.
     3. LE NAVIGATEUR VEUT BIEN. `play()` rend une promesse qui peut être
        REFUSÉE (économiseur de données, réglage d'économie d'énergie, onglet
        d'arrière-plan). Le refus n'est pas une panne : on l'attrape et on ne
        fait rien, l'affiche reste, la page est entière. Ne pas l'attraper
        laisserait une promesse rejetée remonter dans la console — et le
        parcours de recette exige zéro message.

     LE FONDU EST DÉCLENCHÉ PAR `playing`, ET PAS PAR `play()`. La différence
     est tout l'objet du raccord : `play()` rend la main avant la première
     image décodée. Fondre à cet instant ferait apparaître un rectangle vide
     par-dessus la photographie, puis la vidéo dedans. `playing` ne se déclenche
     qu'une fois que quelque chose est réellement à l'écran.

     ═══════════════════════════════════════════════════════════════════════
      REBALAYAGE SUR `usePathname` — le défaut de la recette finale, réparé
     ═══════════════════════════════════════════════════════════════════════

     LE DÉFAUT, MESURÉ SUR TROIS CHEMINS et non déduit : `/boutique` ouverte à
     froid jouait (`readyState` 4) ; la MÊME page atteinte en cliquant depuis
     l'accueil restait à `readyState` 0 — rien n'avait jamais été demandé au
     lecteur ; et l'accueil atteint en cliquant depuis `/boutique` se taisait
     de la même façon. Deux pages, un seul mécanisme : **seule jouait la vidéo
     de la page par laquelle la visite avait COMMENCÉ.**

     LA CAUSE TENAIT EN DEUX CROCHETS VIDES. Cet effet vit dans la frontière
     cliente UNIQUE de la mise en page racine (D26), c'est-à-dire dans le seul
     composant du projet qui NE SE DÉMONTE PAS d'une route à l'autre. Avec une
     liste de dépendances vide, il se montait une fois par DOCUMENT : la balise
     `<video>` qu'il avait trouvée quittait le document à la navigation, celle
     de la page suivante n'était jamais regardée, et l'observateur nettoyé au
     démontage ne l'était jamais non plus, faute de démontage.

     C'est EXACTEMENT le défaut que le contrôleur de révélations (C17, plus
     bas) résout depuis sa naissance, et par le geste qu'on applique ici : la
     dépendance sur le chemin défait l'ancien observateur et en monte un neuf
     sur les nœuds de la nouvelle page. Le raisonnement de C17 vaut mot pour
     mot — « un observateur détruit ne peut pas retenir un nœud mort ».

     TROIS CHOSES QUE LE REBALAYAGE NE CHANGE PAS, et il fallait le vérifier
     avant d'écrire la ligne :

     1. SOUS MOUVEMENT RÉDUIT, TOUJOURS PAS UN OCTET. La sortie a lieu AVANT la
        recherche de l'élément, à chaque passage : rebalayer vingt routes sous
        `reduce` n'ouvre aucune requête, et la campagne le prouve au réseau.
     2. LE CHARGEMENT À FROID NE BOUGE PAS. Au premier montage, `chemin` prend
        sa valeur initiale et l'effet fait ce qu'il faisait hier — la condition
        `load` comprise, qui est ce qui protège le plus grand affichage de
        contenu de l'accueil. Le correctif n'ajoute un tour que là où il n'y en
        avait aucun.
     3. LE NETTOYAGE EST LE MÊME, il devient seulement ATTEIGNABLE : les trois
        gestes de retour (déconnexion de l'observateur, retrait des deux
        écouteurs) étaient écrits depuis C19 et n'avaient jamais tourné. */
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const video = document.querySelector<HTMLVideoElement>('[data-video-heros]');

    if (video === null) {
      return undefined;
    }

    const marquerJouee = () => {
      video.dataset['videoHeros'] = 'joue';
    };

    video.addEventListener('playing', marquerJouee);

    /* ═══════════════════════════════════════════════════════════════════════
       QUATRIÈME CONDITION : LA PAGE A FINI DE CHARGER — et elle a coûté trois
       points de rapidité avant d'être écrite
       ═══════════════════════════════════════════════════════════════════════

       La première version lançait la vidéo dès que l'observateur voyait le
       héros, c'est-à-dire tout de suite, le héros étant en haut de page. Les
       407 Ko de la boucle partaient alors EN CONCURRENCE avec l'image du
       héros — qui est le plus grand affichage de contenu de cette page. Sur le
       réseau bridé de la mesure, le plus grand affichage est passé de 2,5 s à
       2,9 s et la note de 97 à 94.

       La consigne était pourtant explicite : « le LCP reste STRICTEMENT l'image
       d'aujourd'hui ». `preload="none"` empêche le téléchargement AUTOMATIQUE ;
       il n'empêche pas celui qu'on déclenche soi-même trop tôt. Il fallait donc
       une condition de plus, et c'est la mesure qui l'a écrite.

       `load` se déclenche quand toutes les ressources du document sont arrivées
       — l'image du héros comprise. La vidéo attend son tour, littéralement.
       `readyState` est consulté d'abord : au retour à l'accueil par navigation
       cliente, la page est déjà chargée depuis longtemps et il n'y a rien à
       attendre. */
    const lancer = () => {
      video.load();
      void video.play().catch(() => {
        /* Refus du navigateur : l'affiche reste, et c'est un état prévu. */
      });
    };

    const lancerQuandLaPageEstChargee = () => {
      if (document.readyState === 'complete') {
        lancer();
        return;
      }

      window.addEventListener('load', lancer, { once: true });
    };

    const observateur = new IntersectionObserver((entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) {
          continue;
        }

        /* Une fois lancée, il n'y a plus rien à observer : la boucle se garde
           toute seule, et ré-appeler `play()` à chaque passage dans la fenêtre
           n'ajouterait que du bruit. */
        observateur.disconnect();
        lancerQuandLaPageEstChargee();
      }
    });

    observateur.observe(video);

    return () => {
      observateur.disconnect();
      video.removeEventListener('playing', marquerJouee);
      window.removeEventListener('load', lancer);
    };
    /* `chemin` et lui seul : voir « REBALAYAGE SUR `usePathname` » ci-dessus. */
  }, [chemin]);

  /* ═══════════════════════════════════════════════════════════════════════
     LES VUES D'AMBIANCE — chargées à la PREMIÈRE approche, jamais au repos
     ═══════════════════════════════════════════════════════════════════════

     RETOUR CLIENT DU 10/08 : le fondu croisé des cartes plaît, mais il est trop
     brutal. Il l'était par construction — l'image d'ambiance n'était déclarée
     que dans la règle de survol, si bien qu'elle cessait d'exister à l'instant
     où le doigt partait : on entrait en fondu et on sortait d'un coup.

     Rendre la couche permanente rendrait le fondu symétrique ET ferait
     télécharger quinze vues de plus sur un rayon plafonné à 180 Ko. Ce délégué
     est la troisième voie : il pose `data-ambiance-chargee` sur la carte À SA
     PREMIÈRE APPROCHE, une seule fois, et la feuille déclare alors l'image en
     permanence POUR CETTE CARTE. Le retour a de quoi fondre ; une carte que
     personne n'a approchée ne demande toujours rien.

     UN SEUL ÉCOUTEUR POUR QUINZE CARTES, posé sur le document et délégué. Quinze
     écouteurs auraient coûté quinze abonnements pour un geste qui n'a lieu
     qu'une fois par carte — et il aurait fallu les poser sur une page que ce
     composant ne connaît pas.

     `pointerover` ET `focusin` : la règle de survol de la feuille répond à
     `:hover` ET à `:focus-within`, et un visiteur au clavier a droit au même
     rendu. Deux événements, la même ligne.

     SOUS SURVOL IMPOSSIBLE — écrans tactiles —, RIEN. La règle de survol vit
     déjà sous `@media (hover: hover)` ; charger l'image sur un appareil qui ne
     la montrera jamais serait un octet dépensé pour rien. La sortie a lieu
     avant tout abonnement.

     Sous mouvement réduit, le délégué travaille normalement : c'est la
     TRANSITION qui disparaît, pas l'image. Une bascule nette est admise (D37) ;
     une carte sans matière ne l'est pas.

     ═══════════════════════════════════════════════════════════════════════
      L'ATTRIBUT SE POSE AU DÉCODAGE, PLUS À L'APPROCHE (retour client, C19)
     ═══════════════════════════════════════════════════════════════════════

     RETOUR SUIVANT DU CLIENT : le fondu reste « trop rapide et peu fluide ».
     Le diagnostic in vivo (`preuves/c19/fondu-cartes-diagnostic.mjs`) nomme la
     part qui revient à ce fichier-ci : la transition partait bien, mais elle
     courait À VIDE. L'attribut était posé à l'approche, la feuille déclarait
     l'image à cet instant, et le téléchargement puis le décodage avaient lieu
     PENDANT le fondu. Relevé en local, où le réseau ne coûte rien : l'image
     devient peignable à 99 ms, quand la couche est déjà à 0,158 — le premier
     sixième du geste est perdu. Sur un vrai réseau, elle arrive à 0,95 et se
     peint d'un coup. C'est le « pop » du premier survol, et aucune durée ne le
     corrige.

     LE CORRECTIF DÉCALE LE DÉPART, IL NE PRÉCHARGE RIEN. Le délégué demande
     l'image lui-même à la première approche, attend qu'elle soit DÉCODÉE, et
     pose seulement alors `data-ambiance-chargee` — que la feuille exige
     désormais pour ouvrir le fondu. Le packshot reste net jusque-là. Le mur
     d'images de `/boutique` (180 Ko, D36) ne bouge pas d'un octet : rien n'est
     demandé au repos, et l'unique requête est celle que la feuille aurait
     faite de toute façon — elle la trouve en cache.

     LA SONDE EST UN `<picture>`, ET C'EST CE QUI ÉVITE UN OCTET PERDU.
     `--ambiance` porte un `image-set()` : deux adresses, chacune avec son type.
     Un `new Image()` sur la première téléchargerait l'AVIF même sur un moteur
     qui ne sait pas le lire. Un `<picture>` monté en mémoire applique la même
     négociation de format que la feuille — les `<source>` d'abord, l'image
     ensuite, et la source n'est choisie qu'une fois l'image DANS le picture.
     C'est donc le même fichier que le fond CSS, donc la même entrée de cache.

     DEUX ATTRIBUTS ET NON UN : `ambianceApprochee` dit « la demande est
     partie » et garde le délégué de la relancer à chaque mouvement du
     pointeur ; `ambianceChargee` dit « l'image est prête » et c'est lui seul
     que la feuille regarde. Un attribut unique aurait ouvert le fondu à
     l'instant de la demande, c'est-à-dire au défaut qu'on corrige. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) {
      return undefined;
    }

    const charger = (evenement: Event) => {
      const cible = evenement.target;

      if (!(cible instanceof Element)) {
        return;
      }

      const carte = cible.closest<HTMLElement>('.carte-produit');

      if (carte === null || carte.dataset['ambianceApprochee'] !== undefined) {
        return;
      }

      carte.dataset['ambianceApprochee'] = '';

      const pret = () => {
        carte.dataset['ambianceChargee'] = '';
      };

      /* Les cartes dont les deux vues ne partagent pas le cadre (les deux
         coffrets, C15) ne déclarent aucune ambiance : il n'y a rien à attendre,
         et rien à montrer non plus. */
      const entrees = [
        ...getComputedStyle(carte)
          .getPropertyValue('--ambiance')
          .matchAll(/url\("([^"]+)"\)(?:\s*type\("([^"]+)"\))?/g),
      ];

      if (entrees.length === 0) {
        pret();

        return;
      }

      const cadre = document.createElement('picture');

      for (const entree of entrees.slice(0, -1)) {
        const source = document.createElement('source');

        source.srcset = entree[1] ?? '';

        if (entree[2] !== undefined) {
          source.type = entree[2];
        }

        cadre.append(source);
      }

      const sonde = document.createElement('img');

      /* L'ORDRE COMPTE : l'image doit être DANS le `<picture>` avant que son
         adresse ne soit posée, sans quoi le moteur choisit le repli sans même
         regarder les sources. */
      cadre.append(sonde);
      sonde.src = entrees.at(-1)?.[1] ?? '';

      /* `decode()` promet une image PEIGNABLE, là où `load` ne promet que des
         octets reçus. Les deux issues mènent au même geste : une image qui ne
         se décode pas ne doit pas laisser la carte sans matière pour toujours. */
      void sonde.decode().then(pret, pret);
    };

    document.addEventListener('pointerover', charger, { passive: true });
    document.addEventListener('focusin', charger, { passive: true });

    return () => {
      document.removeEventListener('pointerover', charger);
      document.removeEventListener('focusin', charger);
    };
  }, []);

  return (
    <FournisseurSurcouche>
      <FournisseurPanier stocks={stocks}>
        <FournisseurMouvement>{children}</FournisseurMouvement>
      </FournisseurPanier>
    </FournisseurSurcouche>
  );
}

/* ========================================================================== */
/* LE SOCLE DE MOUVEMENT (tranche C17)                                        */
/* ========================================================================== */

/**
 * Les trois routes où le défilement s'adoucit, et elles seules (D37 § 4).
 *
 * Jamais le tunnel — on n'adoucit pas le défilement de quelqu'un qui vérifie un
 * montant avant de payer. Jamais les pages légales — un texte opposable se
 * parcourt, se cherche, se compare, et une inertie propre gêne les trois. Jamais
 * `/gestion`, qui est un poste de travail.
 */
function routeAdoucie(chemin: string): boolean {
  return chemin === '/' || chemin === '/boutique' || chemin.startsWith('/boutique/');
}

/**
 * LE FOURNISSEUR DE MOUVEMENT — trois effets, aucun contexte.
 *
 * ===========================================================================
 * POURQUOI IL EST ICI, ET POURQUOI IL EST UN ENFANT
 * ===========================================================================
 *
 * Ici, parce que la décision D26 n'admet qu'UNE frontière cliente dans la mise
 * en page racine : un troisième module `'use client'` référencé par le layout
 * ouvrirait un groupe de morceaux de plus, sur les vingt-deux routes, pour une
 * centaine de lignes. Imbriqué dans le fichier qui porte déjà la frontière, il
 * ne coûte que son propre poids.
 *
 * ENFANT de `Fournisseurs`, parce que l'effet d'un composant React se déclenche
 * APRÈS ceux de tous ses descendants : c'est cet ordre — et lui seul — qui
 * garantit que `data-hydratation="prete"`, posé par `Fournisseurs`, arrive
 * quand le panier, la surcouche ET le mouvement ont fini de monter. Le placer
 * en parent avancerait le signal, et la barrière des campagnes de bout en bout
 * rendrait la main trop tôt (D37, « le signal d'hydratation reste à
 * Fournisseurs »).
 *
 * Il ne fournit AUCUN contexte : rien du site n'a besoin de savoir si le
 * mouvement est actif, parce que tout ce qui bouge est décrit en CSS et
 * commandé par des ATTRIBUTS. C'est un hôte d'effets, et le nom « fournisseur »
 * lui vient de sa place dans l'arbre, pas de ce qu'il transmet.
 *
 * ===========================================================================
 * LE PREMIER EFFET POSE LA CLASSE — UNE FOIS, ET DANS UN SEUL SENS
 * ===========================================================================
 *
 * `html.mouvement` est posée après montage et SEULEMENT si le mouvement réduit
 * n'est pas demandé. La condition n'est pas un raffinement : sans elle, l'état
 * masqué des révélations s'appliquerait sous mouvement réduit, où aucun
 * observateur n'est instancié pour le retirer — et le site resterait blanc pour
 * les personnes qui ont le plus besoin qu'il ne le soit pas (D37, « le piège de
 * la classe posée inconditionnellement »).
 *
 * LE SENS INVERSE EST FERMÉ. Un visiteur qui DÉSACTIVE le mouvement réduit en
 * cours de visite ne retrouve les animations qu'au prochain chargement. Poser
 * la classe à ce moment-là remettrait l'état masqué sur TOUS les
 * `[data-revelation]` du document, y compris ceux qu'il a déjà dépassés en
 * défilant, et l'observateur ne les révélerait jamais : il ne notifie que les
 * éléments dont l'intersection CHANGE. La moitié haute de la page s'effacerait
 * sous les yeux de quelqu'un qui vient de demander PLUS d'animation.
 *
 * ===========================================================================
 * ET IL RÉVÈLE D'ABORD CE QUI EST DÉJÀ À L'ÉCRAN — l'ordre est le correctif
 * ===========================================================================
 *
 * C'est le geste le moins évident de ce fichier, et il vaut son paragraphe.
 *
 * L'état final est l'état par défaut (D37) : avant hydratation, tout est
 * visible. Poser `mouvement` fait donc BASCULER À L'INVISIBLE tout ce qui porte
 * `[data-revelation]` — y compris ce que le visiteur est en train de lire. Sur
 * un bloc situé sous la ligne de flottaison, personne ne le voit ; sur un bloc
 * à l'écran, c'est un clignotement : le contenu s'efface, puis se re-révèle une
 * image plus tard, quand l'observateur rend son premier verdict.
 *
 * La parade tient à l'ORDRE, pas à un délai : on marque `data-revele` sur tout
 * ce qui est déjà dans la fenêtre, PUIS on pose la classe. Les deux écritures
 * ont lieu dans la même tâche, donc dans le même recalcul de style : ces
 * éléments passent directement à leur état final, sans jamais rendre l'état
 * masqué. Ce qui est hors de la fenêtre, lui, se masque sans témoin et sera
 * révélé au défilement.
 *
 * Conséquence mesurable, et c'est elle qui a décidé : la ZONE VISIBLE AU
 * CHARGEMENT NE BOUGE PAS. Le plus grand affichage de contenu n'est pas
 * repoussé, l'indice de rapidité visuelle ne recule pas, et les notes publiées
 * ne paient pas le socle de mouvement.
 */
function FournisseurMouvement({ children }: { readonly children: ReactNode }) {
  const chemin = usePathname();

  /* `actif` ne dit pas « le mouvement est permis » mais « les organes doivent
     tourner ». Il tombe à faux quand le visiteur demande le mouvement réduit en
     cours de visite, et il ne se relève jamais — voir le sens fermé ci-dessus. */
  const [actif, setActif] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: no-preference)');

    if (requete.matches) {
      for (const element of document.querySelectorAll('[data-revelation]')) {
        const boite = element.getBoundingClientRect();

        if (boite.top < window.innerHeight && boite.bottom > 0) {
          element.setAttribute('data-revele', '');
        }
      }

      document.documentElement.classList.add('mouvement');
      setActif(true);
    }

    const surChangement = (evenement: MediaQueryListEvent) => {
      if (!evenement.matches) {
        setActif(false);
      }
    };

    requete.addEventListener('change', surChangement);

    return () => {
      requete.removeEventListener('change', surChangement);
    };
  }, []);

  /*
   * LE CONTRÔLEUR DE RÉVÉLATION — un seul observateur, des ATTRIBUTS, et un
   * rebalayage par route.
   *
   * UN SEUL, et c'est l'anti-patron que D37 nomme : `useRevelation()` appelé
   * dans quinze composants, c'est quinze composants devenus clients, quinze
   * observateurs instanciés, et la moitié de la vitrine repassée côté navigateur
   * pour un fondu. Un attribut sur un élément rendu par le serveur ne coûte
   * rien : le composant reste serveur, seul ce contrôleur est client.
   *
   * DES ATTRIBUTS, JAMAIS UN STYLE EN LIGNE. La manière la plus naturelle
   * d'écrire un observateur est de poser `element.style.opacity = '0'` puis de
   * le relever au passage — et c'est la faute que le filet du mouvement réduit
   * (`opacity: 1 !important`) existe pour rattraper. Un style en ligne qu'aucun
   * observateur ne viendrait relever serait invisible à toute relecture de
   * feuille de style et ne se verrait que sur l'écran d'un visiteur. On écrit
   * donc un attribut, la feuille décide, et le rapport de force ne se pose pas.
   *
   * `unobserve` APRÈS PASSAGE : une révélation est un événement, pas un état.
   * Sans lui, un bloc traversé vingt fois notifierait vingt fois, et le
   * contrôleur passerait son temps à réécrire un attribut déjà écrit.
   *
   * REBALAYAGE SUR `usePathname` : une navigation cliente remplace le contenu
   * sans démonter la mise en page. Les éléments observés au chargement ont
   * quitté le document, ceux de la nouvelle page n'ont jamais été vus. La
   * dépendance sur le chemin défait l'observateur et en monte un neuf, ce qui
   * est plus sûr qu'un observateur perpétuel auquel on ajouterait des cibles :
   * un observateur détruit ne peut pas retenir un nœud mort.
   */
  useEffect(() => {
    if (!actif) {
      return undefined;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) {
            continue;
          }

          entree.target.setAttribute('data-revele', '');
          observateur.unobserve(entree.target);
        }
      },
      /* Douze pour cent de marge basse : le bloc doit être franchement entré
         dans la fenêtre, pas l'effleurer par un pixel. Au-delà, la révélation
         se déclencherait sous la ligne de flottaison et personne ne la verrait. */
      { rootMargin: '0px 0px -12% 0px' },
    );

    for (const element of document.querySelectorAll(
      '[data-revelation]:not([data-revele])',
    )) {
      observateur.observe(element);
    }

    return () => {
      observateur.disconnect();
    };
  }, [actif, chemin]);

  /*
   * LE DÉFILEMENT ADOUCI — import DYNAMIQUE, trois routes, jamais sous reduce.
   *
   * L'import est dynamique et il doit le rester : c'est ce qui tient les huit
   * kilooctets de la bibliothèque HORS du graphe d'entrée, donc hors du First
   * Load des vingt-deux routes. Un import de tête les y mettrait sur toutes,
   * y compris les dix-neuf qui n'adoucissent rien.
   *
   * Sous mouvement réduit, il n'est pas seulement inactif : il n'est PAS
   * TÉLÉCHARGÉ. La différence n'est pas théorique — un site qui charge le code
   * avant de le neutraliser a déjà payé le réseau, l'analyse syntaxique et la
   * mémoire de quelqu'un qui a demandé qu'on lui épargne tout cela.
   *
   * `html.lenis` est posée par la bibliothèque elle-même, et les règles
   * `html:not(.lenis)` écrites en C12 s'éteignent alors d'elles-mêmes : le
   * défilement natif adouci se retire sans qu'aucun script ne le défasse. Les
   * deux mécanismes cumulés se battraient — le navigateur animant un saut
   * d'ancre pendant que la bibliothèque en anime un autre.
   */
  useEffect(() => {
    if (!actif || !routeAdoucie(chemin)) {
      return undefined;
    }

    let demonte = false;
    let image = 0;
    let lenis: Lenis | null = null;

    const surClic = (evenement: MouseEvent) => {
      if (
        lenis === null ||
        evenement.defaultPrevented ||
        evenement.button !== 0 ||
        evenement.metaKey ||
        evenement.ctrlKey ||
        evenement.shiftKey ||
        evenement.altKey
      ) {
        return;
      }

      const cible = evenement.target;

      if (!(cible instanceof Element)) {
        return;
      }

      const ancre = cible.closest('a[href^="#"]');
      const adresse = ancre?.getAttribute('href') ?? '';

      if (adresse.length < 2) {
        return;
      }

      const destination = document.getElementById(decodeURIComponent(adresse.slice(1)));

      if (destination === null) {
        return;
      }

      evenement.preventDefault();

      /*
       * AUCUN DÉCALAGE, ET C'EST UNE MESURE QUI L'A DÉCIDÉ.
       *
       * La première rédaction passait `offset: -(hauteur de l'en-tête + 8)`,
       * sur la conviction — écrite noir sur blanc dans un commentaire — que
       * « Lenis ne connaît pas `scroll-padding-top`, qui est une propriété du
       * défilement du NAVIGATEUR ». La campagne a mesuré 208 px entre le bas de
       * l'en-tête et le haut de la section visée, là où le régime natif en pose
       * 108. L'écart valait exactement le décalage ajouté.
       *
       * La bibliothèque honore donc `scroll-padding-top` (6,5 rem, C13) ET le
       * `scroll-mt-24` que les sections du rayon portent depuis C7. Le décalage
       * était une TROISIÈME compensation d'un manque qui n'existait pas, et il
       * poussait la section cent pixels trop bas.
       *
       * La preuve est désormais un cas de campagne, et elle est écrite dans la
       * seule forme qui vaille ici : les deux régimes atterrissent AU MÊME
       * ENDROIT, à quelques pixels près. Le délégué change la MANIÈRE d'arriver,
       * jamais l'endroit où l'on arrive.
       */
      lenis.scrollTo(destination);

      /* L'adresse suit le geste. Sans cette ligne, le défilement adouci
         retirerait une capacité que le régime natif offre : copier l'adresse
         d'une section après y être allé. Deux régimes qui ne se comportent pas
         pareil sur un lien sont un écart, pas un raffinement. */
      window.history.pushState(null, '', adresse);
    };

    void import('lenis').then(({ default: Constructeur }) => {
      if (demonte) {
        return;
      }

      lenis = new Constructeur({
        /* La courbe du vocabulaire, exprimée en fonction : `--ease-coule`
           (0.16, 1, 0.30, 1) approchée par l'exponentielle que Lenis attend.
           Départ franc, ralentissement très long — la matière qui coule. */
        easing: (temps: number) => Math.min(1, 1.001 - Math.pow(2, -10 * temps)),
        lerp: 0.1,
      });

      const boucle = (temps: number) => {
        lenis?.raf(temps);
        image = window.requestAnimationFrame(boucle);
      };

      image = window.requestAnimationFrame(boucle);
      document.addEventListener('click', surClic);
    });

    return () => {
      demonte = true;
      window.cancelAnimationFrame(image);
      document.removeEventListener('click', surClic);

      if (lenis !== null) {
        /*
         * UN MORT QUI CONTINUE DE SIGNER — défaut de la bibliothèque, contourné
         * ici, et trouvé par la campagne de cette tranche.
         *
         * SYMPTÔME : `html.lenis` revenait quelques centaines de millisecondes
         * APRÈS l'arrivée sur `/panier`, alors que l'effet avait proprement
         * appelé `destroy()` et que la classe avait bien disparu. Le tunnel
         * gardait donc le défilement adouci — c'est-à-dire exactement ce que
         * D37 interdit — et il le gardait de façon INTERMITTENTE : avec un
         * panier vide, la page est courte, la navigation ne remet pas le
         * défilement à zéro, et le défaut ne se produisait pas.
         *
         * CAUSE, relevée à la trace d'appels (`updateClassName` ← `set
         * isScrolling` ← une minuterie de fin de défilement) : `destroy()`
         * retire les écouteurs mais NE PURGE PAS le compte à rebours anti-
         * rebond qui détecte la fin d'un défilement. Quand il expire — après la
         * destruction —, il écrit `isScrolling = false`, ce qui rejoue
         * `updateClassName()` et RETAMPONNE la racine. L'instance est morte,
         * sa signature revient.
         *
         * PARADE, en deux gestes qui ne dépendent d'aucun délai : on neutralise
         * la méthode de tamponnage SUR L'INSTANCE (une propriété propre masque
         * celle du prototype, donc toute reprise tardive écrit dans le vide),
         * puis on retire nous-mêmes les classes, avec le même critère que la
         * bibliothèque — `lenis` et tout ce qui commence par `lenis-`, plutôt
         * qu'une liste écrite à la main qu'une version future démentirait.
         *
         * Attendre « un peu plus longtemps » avant de nettoyer aurait été
         * l'autre réflexe : c'est un pari sur une durée qu'on ne contrôle pas,
         * et il aurait échoué le jour où la bibliothèque change son anti-rebond.
         */
        (lenis as unknown as { updateClassName: () => void }).updateClassName = () =>
          undefined;

        lenis.destroy();

        const racine = document.documentElement;

        for (const nom of [...racine.classList]) {
          if (nom === 'lenis' || nom.startsWith('lenis-')) {
            racine.classList.remove(nom);
          }
        }
      }

      lenis = null;
    };
  }, [actif, chemin]);

  return <>{children}</>;
}

/**
 * LE FONDU D'ARRIVÉE DE ROUTE — zéro état, zéro minuterie, zéro octet de logique.
 *
 * ===========================================================================
 * LA MÉCANIQUE : une clef React, et `@starting-style` fait le reste
 * ===========================================================================
 *
 * Le contenu de la page est rendu dans un `<div>` dont la CLEF est le chemin.
 * Quand le chemin change, React ne met pas l'ancien nœud à jour : il en monte un
 * NEUF. Un élément qui vient d'être inséré reçoit son `@starting-style`, la
 * transition part, et le contenu se pose. C'est exactement le patron de la
 * pastille de C13 et du montant de C16 — aucun état, aucune minuterie, rien à
 * nettoyer.
 *
 * ===========================================================================
 * ET IL NE JOUE PAS AU PREMIER CHARGEMENT, ce qui n'est pas un défaut
 * ===========================================================================
 *
 * La règle vit sous `html.mouvement`, qui n'est posée qu'après hydratation. Au
 * premier rendu, cet élément calcule donc son style SANS la classe : aucune
 * transition ne le concerne, aucun `@starting-style` ne s'applique, et la page
 * s'affiche complète et immobile. Ajouter la classe ensuite ne rejoue rien —
 * `@starting-style` ne concerne que la PREMIÈRE mise en style d'un élément, pas
 * une modification d'ancêtre.
 *
 * C'est le comportement voulu, et il est doublement voulu :
 *
 * 1. UN FONDU AU PREMIER CHARGEMENT SERAIT UN PRÉCHARGEUR (interdit n° 7 de
 *    D37) : il fabriquerait une attente là où le HTML est déjà prêt.
 * 2. Il coûterait la note de rapidité. L'indice de rapidité visuelle mesure la
 *    PROGRESSION de l'affichage ; une page qui monte de zéro à un sur près
 *    d'une seconde le fait reculer sur la seule mesure que ce projet publie.
 *
 * Le fondu joue donc là où il a un sens — quand on passe d'un écran à l'autre à
 * l'intérieur du site — et nulle part ailleurs.
 *
 * ===========================================================================
 * LA DURÉE : 900 ms, contre les 260 du plan directeur
 * ===========================================================================
 *
 * Même arbitrage qu'en C16 pour le fondu du montant : le vocabulaire de D37 est
 * FERMÉ sur cinq durées et dit « pas une valeur de plus ». 260 n'en fait pas
 * partie, il faut donc choisir un jeton — et ici le choix ne demande aucune
 * interprétation : le tableau de D37 nomme littéralement l'emploi de
 * `--ms-signature` (900 ms), « révélation d'un bloc de tête, TRANSITION DE
 * PAGE ». La doctrine a déjà tranché ; il n'y avait qu'à lire la bonne ligne.
 *
 * Et le nombre trompe, parce qu'il se lit sans sa courbe. `--ease-coule` vaut
 * cubic-bezier(0.16, 1, 0.30, 1) : au tiers du temps, la progression dépasse
 * déjà quatre-vingts pour cent. Neuf cents millisecondes de cette courbe se
 * voient comme un fondu de trois cents suivi d'une longue immobilisation —
 * c'est-à-dire, à quelques dizaines de millisecondes près, ce que le plan
 * demandait, et exactement ce que « la matière lente » décrit.
 */
export function TransitionPage({ children }: { readonly children: ReactNode }) {
  const chemin = usePathname();

  return (
    <div key={chemin} data-transition-page>
      {children}
    </div>
  );
}
