'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { CLE_SURCOUCHE, lireSurcouche } from '@/lib/catalogue-navigateur';
import type { SurcoucheCatalogue } from '@/lib/catalogue';
import { stockageLocal } from '@/lib/stockage-navigateur';

/**
 * LE SECOND ÎLOT MONTÉ SUR TOUTES LES PAGES, et le dernier.
 *
 * ---------------------------------------------------------------------------
 * Le même patron que le panier, aux mêmes conditions
 * ---------------------------------------------------------------------------
 *
 * `MiseEnPageRacine` reste un composant SERVEUR : elle rend
 * `<FournisseurSurcouche>` — qui porte `'use client'` — et lui passe `children`
 * en propriété. Les quinze fiches, le rayon et l'accueil ne deviennent pas
 * clients pour autant (voir l'en-tête de `panier/contexte-panier.tsx`, qui a
 * posé le patron en C4).
 *
 * Conséquence à assumer et à mesurer : ce fichier et la partie de
 * `catalogue-navigateur.ts` qu'il touche sont téléchargés sur CHAQUE page. Ils
 * ont donc été écrits pour être petits — aucun import de catalogue, aucune
 * bibliothèque tierce, aucune application de surcouche ici. Le coût réel est
 * relevé au tableau de construction ET au gzip des feuilles clientes, et
 * consigné dans le compte rendu de la tranche.
 *
 * ---------------------------------------------------------------------------
 * CE FOURNISSEUR NE SAIT QUE LIRE — et c'est une décision de poids
 * ---------------------------------------------------------------------------
 *
 * Il expose la surcouche et une fonction `relire()`. Il n'expose AUCUNE
 * fonction d'écriture. Les modifications passent par `DepotNavigateur`
 * (`catalogue-navigateur.ts`), c'est-à-dire par le contrat `DepotCatalogue`
 * posé en C2, et l'écran qui écrit appelle `relire()` ensuite.
 *
 * La raison est mesurée, pas esthétique. Ce fichier est monté dans la mise en
 * page racine : tout ce qu'il importe est téléchargé sur CHAQUE page, y compris
 * l'accueil, y compris par un visiteur qui n'ouvrira jamais l'espace de
 * gestion. Y brancher l'écriture aurait embarqué partout la fusion des patchs,
 * l'assainissement d'écriture et la sérialisation — pour un écran que la
 * plupart des visiteurs ne verront pas. La lecture, elle, sert à toutes les
 * pages de vitrine : elle a sa place ici.
 *
 * Effet de bord heureux : tout ce qui écrit passe désormais par une seule
 * porte, celle de C2, au lieu de deux chemins parallèles à tenir d'accord.
 *
 * ---------------------------------------------------------------------------
 * DEUX effets, et pourquoi pas trois comme le panier
 * ---------------------------------------------------------------------------
 *
 * 1. RESTAURATION AU MONTAGE. Le rendu serveur ne connaît pas le
 *    `localStorage` du visiteur : le premier rendu client doit donc être
 *    IDENTIQUE au HTML reçu — surcouche vide comprise — sous peine de désaccord
 *    d'hydratation. La lecture a lieu dans un effet, c'est-à-dire après, et les
 *    feuilles de vitrine basculent alors sur les valeurs surcouchées.
 *
 * 2. ABONNEMENT À L'ÉVÉNEMENT `storage`, qui ne se déclenche que dans les
 *    AUTRES onglets : un prix corrigé dans l'onglet de gestion se voit sur
 *    l'onglet de la boutique laissé ouvert à côté, sans rafraîchissement. On
 *    relit le stockage plutôt que de faire confiance à `newValue` — un seul
 *    chemin de lecture défensive à tester.
 *
 * Le panier a un TROISIÈME effet, qui réécrit le stockage à chaque changement
 * d'état. Il n'en faut pas ici, puisque ce fournisseur n'écrit rien : c'est
 * l'appelant de `relire()` qui vient d'écrire, et il sait quand.
 *
 * ---------------------------------------------------------------------------
 * `pretALEmploi` : à quoi il sert ici, et à quoi il ne sert PAS
 * ---------------------------------------------------------------------------
 *
 * Les feuilles de vitrine n'en ont pas besoin : tant que la surcouche est vide,
 * les fonctions de lecture rendent la valeur de base, c'est-à-dire exactement
 * ce que le serveur a rendu. Il n'y a donc ni place à réserver, ni gabarit à
 * tenir, ni décalage de mise en page à craindre — contrairement à la pastille
 * du panier, qui affiche un nombre absent du HTML.
 *
 * Il sert à l'ESPACE DE GESTION, où l'écran doit distinguer « aucune
 * modification » de « modifications pas encore relues » : afficher un tableau
 * de catalogue intact à quelqu'un qui vient d'en changer dix prix serait le
 * même mensonge d'un dixième de seconde que le panier vide de C4.
 */

interface ValeurSurcouche {
  readonly surcouche: SurcoucheCatalogue;
  /** Faux jusqu'à ce que la lecture du stockage ait eu lieu. Voir l'en-tête. */
  readonly pretALEmploi: boolean;
  /** Relit le stockage. À appeler après une écriture faite par le dépôt. */
  readonly relire: () => void;
}

const ContexteSurcouche = createContext<ValeurSurcouche | null>(null);

const VIDE: SurcoucheCatalogue = {};

export function FournisseurSurcouche({ children }: { readonly children: ReactNode }) {
  const [surcouche, setSurcouche] = useState<SurcoucheCatalogue>(VIDE);
  const [pretALEmploi, setPretALEmploi] = useState(false);

  const relire = useCallback(() => {
    const stockage = stockageLocal();

    setSurcouche(stockage === null ? VIDE : lireSurcouche(stockage));
  }, []);

  useEffect(() => {
    relire();
    setPretALEmploi(true);
  }, [relire]);

  useEffect(() => {
    const surChangementDeStockage = (evenement: StorageEvent) => {
      /* `key` vaut `null` quand un autre onglet a appelé `clear()` : il faut
         alors relire aussi, puisque notre clé vient de disparaître. */
      if (evenement.key === null || evenement.key === CLE_SURCOUCHE) {
        relire();
      }
    };

    window.addEventListener('storage', surChangementDeStockage);

    return () => {
      window.removeEventListener('storage', surChangementDeStockage);
    };
  }, [relire]);

  const valeur = useMemo<ValeurSurcouche>(
    () => ({ surcouche, pretALEmploi, relire }),
    [surcouche, pretALEmploi, relire],
  );

  return (
    <ContexteSurcouche.Provider value={valeur}>{children}</ContexteSurcouche.Provider>
  );
}

/**
 * La surcouche courante. Lève hors du fournisseur — délibérément, comme
 * `usePanier()` : une feuille de vitrine oubliée hors de l'arbre afficherait
 * sinon des valeurs d'origine immuables, c'est-à-dire une panne invisible.
 */
export function useSurcouche(): ValeurSurcouche {
  const valeur = useContext(ContexteSurcouche);

  if (valeur === null) {
    throw new Error(
      'useSurcouche() a été appelé hors de <FournisseurSurcouche> : vérifiez la mise en page racine.',
    );
  }

  return valeur;
}
