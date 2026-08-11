import { formaterEuros } from '@/lib/argent';
import type { Totaux } from '@/lib/panier/totaux';

/**
 * LE DÉCOMPTE : sous-total, port, total.
 *
 * Composant d'AFFICHAGE PUR — aucun état, aucun `usePanier()`, aucune
 * addition. Il reçoit le résultat de `calculerTotaux()` et le met en forme.
 * C'est ce qui permet à la page `/panier` et à la page `/commande` d'afficher
 * exactement le même bloc, calculé une seule fois de la même manière : le
 * récapitulatif avant paiement ne peut pas diverger du panier, il est le même
 * objet passé au même composant.
 *
 * Les frais de port ne sont pas résumés à un montant : le DÉTAIL rendu par le
 * moteur est affiché ligne à ligne — tranche de poids, puis emballage
 * isotherme le cas échéant. Un client qui voit « 12,90 € » sans savoir d'où ils
 * sortent soupçonne un supplément caché ; un client qui lit « 6,90 € de colis
 * jusqu'à 3 kg » et « 6,00 € d'emballage isotherme » comprend qu'il paie du
 * froid, et pourquoi.
 *
 * Quand l'expédition est IMPOSSIBLE, il n'y a ni frais, ni total : la phrase du
 * moteur prend toute la place. Afficher un total « hors port » à côté d'un
 * refus laisserait croire qu'un arrangement reste possible.
 */

export function RecapitulatifTotaux({ totaux }: { readonly totaux: Totaux }) {
  const { expedition } = totaux;

  return (
    <section
      aria-labelledby="titre-recapitulatif"
      className="rounded-sm border border-filet bg-papier p-5 sm:p-6"
    >
      <h2
        id="titre-recapitulatif"
        className="sous-titre text-encre"
      >
        Récapitulatif
      </h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-encre-douce">
            Sous-total ({totaux.nbArticles} article{totaux.nbArticles > 1 ? 's' : ''})
          </dt>
          <dd className="text-right">
            <span
              key={totaux.sousTotalCentimes}
              data-chiffre=""
              className="font-mono text-encre tabular-nums"
            >
              {formaterEuros(totaux.sousTotalCentimes)}
            </span>
          </dd>
        </div>

        {expedition.statut === 'calcule' ? (
          expedition.detail.map((ligne) => (
            <div
              key={ligne.libelle}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="max-w-lisible text-encre-douce">{ligne.libelle}</dt>
              <dd className="text-right">
                <span
                  key={ligne.montantCentimes}
                  data-chiffre=""
                  className="font-mono text-encre tabular-nums"
                >
                  {formaterEuros(ligne.montantCentimes)}
                </span>
              </dd>
            </div>
          ))
        ) : (
          <div>
            <dt className="font-semibold text-terre">Expédition impossible</dt>
            <dd className="mt-2 max-w-lisible leading-relaxed text-encre">
              {expedition.message}
            </dd>
          </div>
        )}
      </dl>

      {expedition.statut === 'calcule' ? (
        <>
          <ResteAvantFranco expedition={expedition} />

          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-filet pt-4">
            <p className="sous-titre text-encre">Total</p>
            {/* LE TOTAL EST LE CHIFFRE QUI BOUGE LE PLUS, donc celui qui fond.
                Ce qui tient sa place est `tabular-nums` et rien d'autre : dans
                un `justify-between`, le libellé est collé à gauche et le montant
                à droite quelle que soit sa largeur — une largeur minimale posée
                ici n'aurait rien à retenir, et la mesure l'a confirmé avant
                qu'elle ne soit retirée (`preuves/c16/largeur-montants.mjs`). */}
            <p className="text-right">
              <span
                key={totaux.totalCentimes}
                data-chiffre=""
                className="font-mono text-xl text-encre tabular-nums"
              >
                {totaux.totalCentimes === null ? null : formaterEuros(totaux.totalCentimes)}
              </span>
            </p>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-encre-douce">
            Prix toutes taxes comprises, frais de port inclus.
          </p>
        </>
      ) : null}
    </section>
  );
}

/**
 * « Encore X € pour que le port vous soit offert. »
 *
 * Trois conditions, et il faut les trois : la zone doit avoir un franco
 * (`resteAvantFrancoCentimes` vaut `null` en outre-mer, où il n'y en a pas), le
 * franco ne doit pas être déjà acquis, et le reste doit être strictement
 * positif. Sans la première, on promettrait une offre qui n'existe pas sur
 * cette zone ; sans les deux autres, on afficherait « encore 0,00 € », ce qui
 * ne veut rien dire.
 *
 * Le montant vient du moteur, jamais d'une soustraction faite ici : c'est lui
 * qui connaît le seuil de la zone.
 */
function ResteAvantFranco({
  expedition,
}: {
  readonly expedition: Extract<Totaux['expedition'], { statut: 'calcule' }>;
}) {
  const reste = expedition.resteAvantFrancoCentimes;

  if (expedition.francoApplique || reste === null || reste <= 0) {
    return null;
  }

  return (
    <p className="mt-4 rounded-sm border border-olive/30 bg-creme px-4 py-3 text-sm leading-relaxed text-olive">
      Encore{' '}
      <span className="font-mono tabular-nums">{formaterEuros(reste)}</span> pour que
      le port vous soit offert.
    </p>
  );
}
