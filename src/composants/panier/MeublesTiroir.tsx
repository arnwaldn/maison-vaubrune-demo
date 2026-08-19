import Link from 'next/link';

import { Visuel } from '@/composants/illustrations/Visuel';
import { LigneContact } from '@/composants/panier/LigneContact';
import { CATALOGUE } from '@/donnees/catalogue';
import { BAREMES } from '@/donnees/bareme-expedition';
import { formaterEuros } from '@/lib/argent';
import { suggestionsPourProduit } from '@/lib/suggestions';
import { LIBELLE_ZONE } from '@/lib/types';

/**
 * CE QUE LE TIROIR D'AJOUT MONTRE, ET QUI NE DÉPEND PAS DE L'ACTION (C23).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POURQUOI CE COMPOSANT EST SERVEUR, ET COMMENT IL ENTRE DANS UN CLIENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le tiroir est un îlot CLIENT : il s'ouvre, il se ferme, il lit le panier. Ce
 * qu'il montre, en revanche, ne dépend ni du format choisi ni de la quantité —
 * seulement du produit de la page. C'est donc calculable À LA CONSTRUCTION.
 *
 * Un composant client peut recevoir un `ReactNode` DÉJÀ RENDU par le serveur :
 * React le sérialise comme un nœud de la charge RSC, pas comme du code. C'est
 * le seul mécanisme qui fait entrer `<Visuel>` — composant serveur — dans un
 * tiroir client sans le rendre client. Conséquences mesurées :
 *
 *   +501 octets gzip par fiche, et ZÉRO octet de premier chargement.
 *
 * L'alternative — passer des données et refaire la carte côté client — coûtait
 * moins en charge RSC (+114 o) mais 400 à 700 octets de JavaScript, et surtout
 * elle aurait fait naître une SECONDE fabrique de chemins d'image. `<Visuel>`
 * promet en tête de fichier d'être la seule ; C14 et C15 ont payé trois fois le
 * prix d'une deuxième vérité.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA RÉASSURANCE NE DIT QUE CE QUE LE SITE DIT DÉJÀ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le professionnel qui a relu la boutique proposait « retour sous 30 jours ».
 * Le site écrit QUATORZE JOURS (article L. 221-18) dans `/retractation` ET dans
 * les CGV : afficher trente le mettrait en contradiction avec ses propres pages
 * légales, ce qui est un écart OPPOSABLE au marchand et non une formule
 * commerciale. On écrit quatorze.
 *
 * Le seuil de port offert est LU dans le barème, jamais recopié — et il est
 * suivi du nom de sa zone, parce qu'il n'a pas la même valeur dans les trois.
 * Un franco affiché sans sa zone est une promesse fausse pour deux visiteurs
 * sur trois.
 *
 * Le prestataire de paiement n'est PAS nommé : les CGV le laissent en
 * emplacement à compléter, et la garde des marques réelles rend ce choix
 * vérifiable plutôt que promis.
 */

/**
 * Le prix de base le plus bas — celui du catalogue VERSIONNÉ, jamais celui de
 * la surcouche marchand.
 *
 * `prixLePlusBasAffiche()` existe et honore la surcouche, mais elle vit dans
 * `catalogue-navigateur.ts` et attend l'état d'un visiteur : ce composant est
 * SERVEUR, il n'en a pas. L'écart est celui que D33 impose déjà au balisage
 * structuré — un robot d'indexation n'a pas de stockage local, une carte
 * prérendue non plus. Écrit ici plutôt que découvert plus tard.
 */
function prixDeBase(produit: {
  readonly variantes: readonly { readonly prixCentimes: number }[];
}): number {
  return Math.min(...produit.variantes.map((variante) => variante.prixCentimes));
}

const COMBIEN_DE_SUGGESTIONS = 2;

export function MeublesTiroir({ slug }: { readonly slug: string }) {
  const suggestions = suggestionsPourProduit(CATALOGUE, slug, COMBIEN_DE_SUGGESTIONS);
  const metropole = BAREMES.metropole;

  return (
    <>
      {suggestions.length === COMBIEN_DE_SUGGESTIONS ? (
        <section aria-labelledby="tiroir-suggestions" className="tiroir-bloc">
          <h3 id="tiroir-suggestions" className="etiquette text-encre-douce">
            Vous aimerez peut-être aussi
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {suggestions.map((produit) => (
              <li key={produit.slug}>
                <Link
                  href={`/boutique/${produit.slug}`}
                  className="block no-underline"
                  data-suggestion
                >
                  {produit.visuel === undefined ? null : (
                    <Visuel
                      slug={produit.slug}
                      vue="principal"
                      donnees={produit.visuel.principal}
                      illustration={produit.illustration}
                      alternative="decorative"
                      largeurMaximale={320}
                      sizes="8rem"
                      className="block rounded-sm"
                    />
                  )}
                  <p className="mt-2 font-titre text-titre leading-tight text-encre">
                    {produit.nom}
                  </p>
                  <p className="registre mt-1 text-encre-douce">
                    dès {formaterEuros(prixDeBase(produit))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="tiroir-reassurance" className="tiroir-bloc">
        <h3 id="tiroir-reassurance" className="sr-only">
          Ce que la maison garantit
        </h3>
        <ul className="registre space-y-1.5 text-encre-douce">
          <li>Quatorze jours pour changer d’avis</li>
          {/* PAS de `.toLowerCase()` sur le libellé de zone : « France » est un
              nom propre, et le mettre en bas de casse est une faute de
              typographie française — celle que la garde `verifier-typographie`
              ne voit pas, parce qu'elle contrôle les espaces et les apostrophes,
              pas la casse des noms propres. Vue à la capture, pas au test. */}
          <li>
            Port offert dès {formaterEuros(metropole.seuilFrancoCentimes ?? 0)} en{' '}
            {LIBELLE_ZONE.metropole}
          </li>
          <li>Paiement sécurisé par prestataire agréé</li>
        </ul>
        <div className="mt-3">
          <LigneContact />
        </div>
      </section>
    </>
  );
}
