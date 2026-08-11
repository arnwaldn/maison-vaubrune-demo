'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { abandonnerAttente } from '@/lib/commandes/depot-local';
import { usePanier } from '@/lib/panier/contexte-panier';
import { nombreArticles } from '@/lib/panier/reducteur';
import { stockageLocal } from '@/lib/stockage-navigateur';

/**
 * LE RETOUR D'UN PAIEMENT ABANDONNÉ.
 *
 * Un seul geste au montage : ABANDONNER la commande en attente. Ce qui a été
 * écrit avant la redirection — les lignes, les coordonnées, la référence
 * fabriquée par le serveur — n'a plus lieu d'être, et le laisser traîner
 * exposerait le tunnel suivant à promouvoir une commande qui n'a pas été
 * payée.
 *
 * CE QU'ON NE TOUCHE PAS : LE PANIER. C'est toute la promesse de cet écran. Un
 * visiteur qui renonce au paiement veut retrouver sa sélection exactement où
 * il l'a laissée — c'est d'ailleurs le geste le plus banal du commerce en
 * ligne, celui qui consiste à aller vérifier un prix ailleurs. Le nombre
 * d'articles est affiché ci-dessous, non pas comme une décoration, mais comme
 * une PREUVE lisible que rien n'a été perdu.
 */

export function IlotAnnulation() {
  const { etat, pretALEmploi } = usePanier();
  const [attenteReglee, setAttenteReglee] = useState(false);

  useEffect(() => {
    const stockage = stockageLocal();

    if (stockage !== null) {
      abandonnerAttente(stockage);
    }

    setAttenteReglee(true);
  }, []);

  const articles = nombreArticles(etat);

  return (
    <div className="mt-10 min-h-96 max-w-lisible pb-4">
      <h2 className="text-titre text-encre">Votre panier est intact</h2>

      <p className="mt-4 text-sm leading-relaxed text-encre">
        {pretALEmploi && attenteReglee && articles > 0 ? (
          <>
            Il contient toujours{' '}
            <strong>
              {articles} article{articles > 1 ? 's' : ''}
            </strong>
            , aux mêmes quantités et vers la même destination. Rien n’a été retiré,
            rien n’a été payé.
          </>
        ) : (
          <>
            Rien n’a été retiré de votre panier, et rien n’a été payé&nbsp;: le
            paiement a été interrompu avant tout engagement.
          </>
        )}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-encre-douce">
        La commande qui avait été préparée pour le paiement a été abandonnée. Vous
        pouvez reprendre votre panier, changer une quantité ou une destination, et
        repasser commande quand vous le voulez&nbsp;: une nouvelle référence sera
        fabriquée à ce moment-là.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/panier"
          className="rounded-sm border border-olive bg-olive px-4 py-2.5 text-sm font-semibold text-creme no-underline hover:border-encre hover:bg-encre"
        >
          Revenir au panier
        </Link>
        <Link
          href="/boutique"
          className="rounded-sm border border-filet bg-creme px-4 py-2.5 text-sm font-semibold text-encre no-underline hover:border-terre hover:text-terre"
        >
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
