'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import { CLE_PANIER, ecrire, lire } from '@/lib/panier/persistance';
import {
  ETAT_INITIAL,
  reduirePanier,
  type ActionPanier,
  type EtatPanier,
  type StocksParSku,
} from '@/lib/panier/reducteur';
import { stockageLocal } from '@/lib/stockage-navigateur';

/**
 * LE PREMIER ÎLOT CLIENT DU PROJET, et le seul monté sur toutes les pages.
 *
 * ---------------------------------------------------------------------------
 * Ce que « monté dans la mise en page » veut dire, et ne veut pas dire
 * ---------------------------------------------------------------------------
 *
 * `MiseEnPageRacine` reste un composant SERVEUR. Elle rend
 * `<FournisseurPanier>` — celui-ci porte la directive `'use client'` — et lui
 * passe `children` en propriété. React traite alors `children` comme un nœud
 * déjà rendu côté serveur : les quinze fiches, le rayon et la page d'accueil
 * ne deviennent PAS des composants clients pour autant. C'est le patron
 * standard, et c'est lui qui permet d'avoir un panier partout sans expédier
 * les pages au navigateur.
 *
 * Conséquence à assumer et à mesurer : ce fichier, le réducteur, la
 * persistance et la pastille sont téléchargés sur CHAQUE page, y compris
 * l'accueil. Ils ont donc été écrits pour être petits — aucun import de
 * catalogue, aucune bibliothèque tierce, aucun calcul de totaux ici. Le coût
 * réel est relevé au tableau de construction et consigné dans le compte rendu
 * de la tranche.
 *
 * ---------------------------------------------------------------------------
 * Les trois effets, et l'ordre dans lequel ils se déclenchent
 * ---------------------------------------------------------------------------
 *
 * 1. RESTAURATION AU MONTAGE. Le rendu serveur ne connaît pas le
 *    `localStorage` du visiteur : le premier rendu client doit donc être
 *    IDENTIQUE au HTML reçu, panier vide compris, sous peine d'erreur
 *    d'hydratation. La lecture a lieu dans un effet, c'est-à-dire après. Le
 *    drapeau `pretALEmploi` dit à l'interface où elle en est : tant qu'il est
 *    faux, aucun composant n'affiche de nombre — ils réservent la place (voir
 *    `PastillePanier`), ce qui évite le décalage de mise en page qu'un panier
 *    apparaissant après coup provoquerait.
 *
 * 2. ÉCRITURE À CHAQUE CHANGEMENT, une fois seulement le panier restauré.
 *    Écrire avant la restauration effacerait le panier du visiteur avec l'état
 *    vide du premier rendu — la manière la plus sûre de perdre une commande.
 *
 * 3. ABONNEMENT À L'ÉVÉNEMENT `storage`. Il ne se déclenche que dans les
 *    AUTRES onglets : deux onglets ouverts sur la boutique partagent donc le
 *    même panier, et celui qui n'a pas cliqué se met à jour. On relit le
 *    stockage au lieu de faire confiance à `newValue`, parce que c'est le même
 *    chemin de lecture défensive que partout ailleurs — un seul code à tester.
 */

interface ValeurPanier {
  readonly etat: EtatPanier;
  /**
   * Faux jusqu'à ce que la restauration ait eu lieu. Un composant qui affiche
   * un nombre d'articles doit attendre ce drapeau ; un composant qui affiche
   * une structure (un gabarit, une place réservée) n'a pas à l'attendre.
   */
  readonly pretALEmploi: boolean;
  readonly envoyer: Dispatch<ActionPanier>;
}

const ContextePanier = createContext<ValeurPanier | null>(null);

/* Le rattrapage de `window.localStorage` — qui lève pour de vrai en navigation
   privée — a quitté ce fichier en C5 pour `@/lib/stockage-navigateur` : la page
   de confirmation de commande en a besoin elle aussi, et deux copies d'un
   `try` divergeraient. */

export function FournisseurPanier({
  stocks,
  children,
}: {
  /** Vingt-trois paires SKU → stock, calculées côté serveur (voir `reducteur.ts`). */
  readonly stocks: StocksParSku;
  readonly children: ReactNode;
}) {
  const reducteur = useCallback(
    (etat: EtatPanier, action: ActionPanier) => reduirePanier(etat, action, stocks),
    [stocks],
  );

  const [etat, envoyer] = useReducer(reducteur, ETAT_INITIAL);
  const [pretALEmploi, setPretALEmploi] = useState(false);

  useEffect(() => {
    const stockage = stockageLocal();

    if (stockage !== null) {
      envoyer({ type: 'restaurer', etat: lire(stockage) });
    }

    setPretALEmploi(true);
  }, []);

  useEffect(() => {
    if (!pretALEmploi) {
      return;
    }

    const stockage = stockageLocal();

    if (stockage !== null) {
      ecrire(stockage, etat);
    }
  }, [etat, pretALEmploi]);

  useEffect(() => {
    const surChangementDeStockage = (evenement: StorageEvent) => {
      /* `key` vaut `null` quand un autre onglet a appelé `clear()` : il faut
         alors relire aussi, puisque notre clé vient de disparaître. */
      if (evenement.key !== null && evenement.key !== CLE_PANIER) {
        return;
      }

      const stockage = stockageLocal();

      if (stockage !== null) {
        envoyer({ type: 'restaurer', etat: lire(stockage) });
      }
    };

    window.addEventListener('storage', surChangementDeStockage);

    return () => {
      window.removeEventListener('storage', surChangementDeStockage);
    };
  }, []);

  const valeur = useMemo<ValeurPanier>(
    () => ({ etat, pretALEmploi, envoyer }),
    [etat, pretALEmploi],
  );

  return <ContextePanier.Provider value={valeur}>{children}</ContextePanier.Provider>;
}

/**
 * Le panier courant. Lève hors du fournisseur — délibérément : un composant
 * de panier oublié hors de l'arbre afficherait sinon un panier vide immuable,
 * ce qui est la panne la plus difficile à voir de toutes.
 */
export function usePanier(): ValeurPanier {
  const valeur = useContext(ContextePanier);

  if (valeur === null) {
    throw new Error(
      'usePanier() a été appelé hors de <FournisseurPanier> : vérifiez la mise en page racine.',
    );
  }

  return valeur;
}
