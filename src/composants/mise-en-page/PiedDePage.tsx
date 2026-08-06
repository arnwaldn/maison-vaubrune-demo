import { marchand } from '@/donnees/marchand';

/**
 * Pied de page.
 *
 * Les quatre documents qu'une boutique de vente à distance doit publier sont
 * listés dès maintenant, mais en texte et non en liens : ils n'existent pas
 * encore (tranche C7 — l'échéance était annoncée en C4, elle a été repoussée
 * quand le tunnel de commande a pris cette tranche-là). Un lien mort vaut
 * moins qu'un inventaire honnête, et il coûterait une page 404 aux robots
 * d'indexation.
 */
const DOCUMENTS_LEGAUX = [
  'Mentions légales',
  'Conditions générales de vente',
  'Données personnelles et cookies',
  'Droit de rétractation',
] as const;

const ANNEE_COURANTE = 2026;

export function PiedDePage() {
  return (
    <footer className="mt-8 border-t border-filet bg-papier">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8">
        <div>
          <p className="font-titre text-lg font-semibold text-encre">{marchand.nom}</p>
          <p className="mt-1 text-sm text-encre-douce">{marchand.baseline}</p>
          <p className="mt-5 max-w-lisible text-sm leading-relaxed text-encre-douce">
            Démonstration — épicerie fictive. Aucune commande n’est expédiée, aucun
            paiement n’est encaissé.
          </p>
        </div>

        <div>
          <h2 className="font-titre text-base font-semibold text-encre">
            Documents légaux
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-encre-douce">
            {DOCUMENTS_LEGAUX.map((document) => (
              <li key={document}>
                {document}{' '}
                <span className="text-xs text-ocre">(à venir)</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-encre-douce">
            Ces documents seront des gabarits&nbsp;: les emplacements que remplit le
            marchand y seront surlignés, et aucune donnée d’entreprise ne sera
            inventée pour les remplir.
          </p>
        </div>
      </div>

      <div className="border-t border-filet">
        <p className="mx-auto max-w-page px-5 py-5 text-xs text-encre-douce sm:px-8">
          © {ANNEE_COURANTE} {marchand.nom} — maison fictive, boutique de
          démonstration.
        </p>
      </div>
    </footer>
  );
}
